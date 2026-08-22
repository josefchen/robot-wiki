/**
 * The scene-representation ladder for the classical/scene-representation
 * module. Pure data and geometry; no rendering.
 *
 * The instrument asks one question of five representations over one fixed
 * synthetic scene: what does the robot actually have in memory, and what
 * can it answer from it. Three capabilities are graded per representation
 * (is this cell free, give me a surface normal for contact, render this
 * from a viewpoint I never visited), and a memory footprint is computed
 * from the same physical scene at four working resolutions.
 *
 * Two invariants the module's assertions depend on, so keep them:
 *
 * 1. Capability grades are a property of the REPRESENTATION alone. The
 *    resolution slider changes how much memory the map costs and how
 *    finely it is drawn, and it never changes what the map can answer: a
 *    point cloud at 6 mm spacing still carries no free-space label, and a
 *    finer occupancy grid still has no surface normal to hand a contact
 *    solver. Wiring resolution into capability would be a physics error
 *    as well as a test failure.
 *
 * 2. Footprint is strictly increasing as the voxel or sample spacing
 *    shrinks, for every representation, because every model here is
 *    proportional to a negative power of the spacing.
 *
 * The footprint models are declared approximations of published storage
 * layouts, not measurements of any particular implementation, and the
 * component says so on screen. Volumetric representations pay for the
 * whole volume; surface representations pay for the observed area only,
 * which is the reason a signed-distance field is cheaper than the
 * occupancy grid it looks like it should cost the same as.
 */

export type RepresentationId =
  | 'point-cloud'
  | 'occupancy-grid'
  | 'tsdf'
  | 'mesh'
  | 'gaussian-splat';

export type CapabilityId = 'free-space' | 'contact-normal' | 'novel-view';

/** Grade of one capability. "partial" means it needs work the raw store does not do. */
export type CapabilityState = 'yes' | 'partial' | 'no';

export const CAPABILITIES: ReadonlyArray<{
  id: CapabilityId;
  /** Reader-facing question the capability answers. */
  label: string;
}> = [
  { id: 'free-space', label: 'Is this cell free' },
  { id: 'contact-normal', label: 'Surface normal for contact' },
  { id: 'novel-view', label: 'Render a novel view' },
];

export const CAPABILITY_STATE_TEXT: Record<CapabilityState, string> = {
  yes: 'yes',
  partial: 'only after work',
  no: 'no',
};

export interface Capability {
  state: CapabilityState;
  /** One clause naming why, for the on-screen indicator. */
  note: string;
}

/** Bytes per stored element, and what an element is. */
export interface FootprintModel {
  /**
   * 'volume' bills the whole scene volume at spacing^3; 'surface' bills
   * the observed surface area at spacing^2.
   */
  kind: 'volume' | 'surface';
  /** Bytes per cell or per surface element. */
  bytesPerElement: number;
  /**
   * Elements per cell (volumetric) or per surface cell (surface), so a
   * narrow-band field and a triangle soup can both be expressed against
   * the same spacing.
   */
  elementsPerCell: number;
  /** What one element is, for the on-screen readout. */
  elementName: string;
}

export interface Representation {
  id: RepresentationId;
  /** Button label and readout text. */
  short: string;
  /** Full name used in prose-adjacent readouts. */
  name: string;
  /** Indefinite article for `name`, so the readouts read as English. */
  article: 'a' | 'an';
  /** What the store literally holds. */
  stores: string;
  /** What it does with the region the sensor never saw. */
  unobserved: string;
  capabilities: Record<CapabilityId, Capability>;
  footprint: FootprintModel;
}

/** Scene volume actually mapped, cubic metres: a 3.0 x 3.0 x 2.0 m cell. */
export const SCENE_VOLUME_M3 = 18;

/** Observed surface area in that cell, square metres. */
export const SCENE_SURFACE_M2 = 14;

/**
 * Working resolutions, centimetres of voxel edge or sample spacing,
 * coarsest first. The slider indexes this array, so a higher slider value
 * is a finer map and a larger footprint.
 */
export const RESOLUTION_CM: readonly number[] = [30, 20, 15, 10];

export const DEFAULT_RESOLUTION_INDEX = 1;
export const DEFAULT_REPRESENTATION: RepresentationId = 'occupancy-grid';

export const REPRESENTATIONS: readonly Representation[] = [
  {
    id: 'point-cloud',
    short: 'Point cloud',
    name: 'point cloud',
    article: 'a',
    stores: 'One 3D sample per returned ray, with no ordering and no connectivity.',
    unobserved:
      'Nothing at all, which reads exactly like free space: an empty region and an unseen region are the same absence of points.',
    capabilities: {
      'free-space': {
        state: 'no',
        note: 'a missing point can mean empty or unobserved, and the store does not distinguish them',
      },
      'contact-normal': {
        state: 'partial',
        note: 'a normal has to be fitted from a local neighbourhood, and the fit is noisy on thin geometry',
      },
      'novel-view': {
        state: 'no',
        note: 'samples splat into gaps from any viewpoint the sensor did not occupy',
      },
    },
    footprint: {
      kind: 'surface',
      bytesPerElement: 16,
      elementsPerCell: 1,
      elementName: 'points',
    },
  },
  {
    id: 'occupancy-grid',
    short: 'Occupancy grid',
    name: 'occupancy grid',
    article: 'an',
    stores:
      'One occupancy probability per voxel, held as log-odds and updated by every ray that passes through.',
    unobserved:
      'An explicit unknown label, held apart from free and from occupied, which is the property the planner needs.',
    capabilities: {
      'free-space': {
        state: 'yes',
        note: 'free, occupied and unknown are three distinct cell states',
      },
      'contact-normal': {
        state: 'no',
        note: 'the surface sits somewhere inside an occupied voxel and the grid never says where',
      },
      'novel-view': {
        state: 'no',
        note: 'no appearance is stored, only occupancy',
      },
    },
    footprint: {
      kind: 'volume',
      bytesPerElement: 1,
      elementsPerCell: 1,
      elementName: 'voxels',
    },
  },
  {
    id: 'tsdf',
    short: 'Signed-distance field',
    name: 'truncated signed-distance field',
    article: 'a',
    stores:
      'Signed distance to the nearest surface plus a fusion weight, kept in a narrow band around the surface.',
    unobserved:
      'Voxels with zero weight, which is an honest unknown, though it is easy to read a zero-weight voxel as a zero distance if the weight is ignored.',
    capabilities: {
      'free-space': {
        state: 'yes',
        note: 'the sign says which side of the surface a query point is on',
      },
      'contact-normal': {
        state: 'yes',
        note: 'the gradient of the field is the surface normal, which is what a collision query wants',
      },
      'novel-view': {
        state: 'partial',
        note: 'geometry renders, but only with whatever colour was fused alongside it',
      },
    },
    footprint: {
      kind: 'surface',
      bytesPerElement: 8,
      elementsPerCell: 3,
      elementName: 'band voxels',
    },
  },
  {
    id: 'mesh',
    short: 'Mesh',
    name: 'triangle mesh',
    article: 'a',
    stores: 'Vertices and the triangles connecting them, with per-face normals.',
    unobserved:
      'A hole, unless somebody closes it, and hole filling invents geometry that was never measured.',
    capabilities: {
      'free-space': {
        state: 'partial',
        note: 'inside and outside are only defined once the mesh is watertight, which a scanned mesh is not',
      },
      'contact-normal': {
        state: 'yes',
        note: 'every face carries a normal by construction',
      },
      'novel-view': {
        state: 'partial',
        note: 'renders from any pose, at whatever fidelity the texture and the triangle budget allow',
      },
    },
    footprint: {
      kind: 'surface',
      bytesPerElement: 24,
      elementsPerCell: 2,
      elementName: 'triangles',
    },
  },
  {
    id: 'gaussian-splat',
    short: 'Gaussian splat',
    name: '3D Gaussian splat',
    article: 'a',
    stores:
      'Anisotropic Gaussians carrying position, covariance, opacity and view-dependent colour.',
    unobserved:
      'Whatever the optimisation found convenient, rendered with the same confidence as measured geometry. The store has no unknown state to report.',
    capabilities: {
      'free-space': {
        state: 'no',
        note: 'opacity is a rendering weight, not an occupancy probability, and no cell is ever labelled unknown',
      },
      'contact-normal': {
        state: 'no',
        note: 'a Gaussian has no surface, so a normal exists only after a separate surface is extracted from the field',
      },
      'novel-view': {
        state: 'yes',
        note: 'this is the objective the representation was optimised for',
      },
    },
    footprint: {
      kind: 'surface',
      bytesPerElement: 236,
      elementsPerCell: 1,
      elementName: 'Gaussians',
    },
  },
];

export function representationById(id: RepresentationId): Representation {
  const found = REPRESENTATIONS.find((r) => r.id === id);
  if (!found) throw new Error(`unknown scene representation: ${id}`);
  return found;
}

export function capabilityLabel(id: CapabilityId): string {
  const found = CAPABILITIES.find((c) => c.id === id);
  if (!found) throw new Error(`unknown capability: ${id}`);
  return found.label;
}

export function resolutionCm(index: number): number {
  const value = RESOLUTION_CM[index];
  if (value === undefined) throw new Error(`resolution index out of range: ${index}`);
  return value;
}

export interface Footprint {
  /** Number of stored elements at this resolution. */
  elements: number;
  /** Total bytes those elements occupy. */
  bytes: number;
  elementName: string;
}

/**
 * Storage cost of one representation at one voxel or sample spacing.
 *
 * Volumetric models bill SCENE_VOLUME_M3 at spacing cubed; surface models
 * bill SCENE_SURFACE_M2 at spacing squared. Both are strictly decreasing
 * in spacing, so both are strictly increasing in the slider.
 */
export function footprint(id: RepresentationId, cellCm: number): Footprint {
  if (!(cellCm > 0)) throw new Error(`cell size must be positive: ${cellCm}`);
  const model = representationById(id).footprint;
  const cellM = cellCm / 100;
  const cells =
    model.kind === 'volume'
      ? SCENE_VOLUME_M3 / cellM ** 3
      : SCENE_SURFACE_M2 / cellM ** 2;
  const elements = Math.round(cells * model.elementsPerCell);
  return {
    elements,
    bytes: elements * model.bytesPerElement,
    elementName: model.elementName,
  };
}

/** Human-readable byte count, two significant figures past the unit. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** Compact element count: 1,650 rather than 1650.0. */
export function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

/* ------------------------------------------------------------------ */
/* The fixed synthetic scene, in plan view                             */
/* ------------------------------------------------------------------ */

/**
 * Plan-view geometry, centimetres, x to the right and y away from the
 * viewer. The sensor sits at the bottom edge looking up the y axis, which
 * is what makes the occluder cast a region nothing ever measured.
 *
 * Three features earn their place: a thin object (a 2 cm post) that falls
 * between samples on a coarse grid, a transparent object whose depth
 * returns land behind where the surface really is, and an occluder with a
 * genuinely unobserved region behind it.
 */
export const SCENE_WIDTH_CM = 300;
export const SCENE_DEPTH_CM = 200;

export const SENSOR = { x: 150, y: 196 } as const;

export interface SceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const BACK_WALL: SceneRect = { x: 20, y: 14, width: 260, height: 8 };
export const OCCLUDER: SceneRect = { x: 86, y: 88, width: 44, height: 20 };
export const THIN_POST: SceneRect = { x: 199, y: 96, width: 2, height: 2 };
export const TRANSPARENT_BOTTLE: SceneRect = {
  x: 228,
  y: 62,
  width: 24,
  height: 24,
};

/**
 * How far behind a transparent surface its depth returns land, in
 * centimetres. Illustrative, not a datasheet figure: no depth-sensor
 * datasheet publishes an accuracy for a transparent surface at all, which
 * is the point the perception module makes about the same failure.
 */
export const TRANSPARENT_DEPTH_BIAS_CM = 16;

export interface Point {
  x: number;
  y: number;
}

/**
 * The region the sensor cannot see, as a plan-view polygon: the shadow the
 * occluder casts away from the sensor, clipped at the back wall.
 *
 * Pure geometry so the drawn shadow and the "unknown" cells of the
 * occupancy panel are derived from the same source rather than eyeballed
 * into agreement.
 */
export function occlusionShadow(
  sensor: Point = SENSOR,
  box: SceneRect = OCCLUDER,
  clipY: number = BACK_WALL.y + BACK_WALL.height,
): Point[] {
  const near: Point[] = [
    { x: box.x, y: box.y + box.height },
    { x: box.x + box.width, y: box.y + box.height },
  ];
  const project = (corner: Point): Point => {
    const dy = corner.y - sensor.y;
    if (dy >= 0) throw new Error('occluder must sit in front of the sensor');
    const t = (clipY - sensor.y) / dy;
    return { x: sensor.x + (corner.x - sensor.x) * t, y: clipY };
  };
  // Walk near-left, near-right, far-right, far-left so the polygon is simple.
  return [near[0]!, near[1]!, project(near[1]!), project(near[0]!)];
}

/** True when a plan-view point falls inside a convex polygon. */
export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const straddles = a.y > point.y !== b.y > point.y;
    if (!straddles) continue;
    const cross = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (point.x < cross) inside = !inside;
  }
  return inside;
}

export type CellState = 'free' | 'occupied' | 'unknown';

export interface GridCell {
  x: number;
  y: number;
  size: number;
  state: CellState;
}

function rectContains(rect: SceneRect, cx: number, cy: number): boolean {
  return (
    cx >= rect.x &&
    cx <= rect.x + rect.width &&
    cy >= rect.y &&
    cy <= rect.y + rect.height
  );
}

/**
 * The occupancy grid at one cell size, classified from the scene geometry.
 *
 * A cell is occupied when its centre falls inside a solid, unknown when it
 * falls in the occluder's shadow, and free otherwise. The transparent
 * bottle is deliberately NOT occupied at its true position: its returns
 * land TRANSPARENT_DEPTH_BIAS_CM further away, so the grid marks the wrong
 * cells occupied and leaves the real surface free. That is the failure the
 * reader is meant to see, not a modelling slip.
 */
export function occupancyCells(cellCm: number): GridCell[] {
  if (!(cellCm > 0)) throw new Error(`cell size must be positive: ${cellCm}`);
  const shadow = occlusionShadow();
  const cells: GridCell[] = [];
  for (let y = 0; y + cellCm <= SCENE_DEPTH_CM + 0.001; y += cellCm) {
    for (let x = 0; x + cellCm <= SCENE_WIDTH_CM + 0.001; x += cellCm) {
      const cx = x + cellCm / 2;
      const cy = y + cellCm / 2;
      const solid =
        rectContains(BACK_WALL, cx, cy) ||
        rectContains(OCCLUDER, cx, cy) ||
        rectContains(THIN_POST, cx, cy) ||
        rectContains(
          {
            ...TRANSPARENT_BOTTLE,
            y: TRANSPARENT_BOTTLE.y - TRANSPARENT_DEPTH_BIAS_CM,
          },
          cx,
          cy,
        );
      const state: CellState = solid
        ? 'occupied'
        : pointInPolygon({ x: cx, y: cy }, shadow)
          ? 'unknown'
          : 'free';
      cells.push({ x, y, size: cellCm, state });
    }
  }
  return cells;
}

export type SurfaceKind = 'wall' | 'occluder' | 'thin' | 'transparent';

export interface SurfaceSample {
  x: number;
  y: number;
  kind: SurfaceKind;
}

/**
 * Samples along the surfaces the sensor can actually see, at one spacing.
 *
 * Used by every surface-based panel (point cloud, signed-distance field,
 * mesh, splat) so they draw the same measured geometry and differ only in
 * how they store it. Two deliberate artefacts survive into the samples:
 * the thin post drops out entirely once the spacing exceeds its width, and
 * the transparent bottle's samples sit TRANSPARENT_DEPTH_BIAS_CM behind
 * the surface that produced them.
 */
export function surfaceSamples(spacingCm: number): SurfaceSample[] {
  if (!(spacingCm > 0)) throw new Error(`spacing must be positive: ${spacingCm}`);
  const shadow = occlusionShadow();
  const out: SurfaceSample[] = [];

  const wallY = BACK_WALL.y + BACK_WALL.height;
  for (let x = BACK_WALL.x; x <= BACK_WALL.x + BACK_WALL.width; x += spacingCm) {
    if (pointInPolygon({ x, y: wallY }, shadow)) continue;
    out.push({ x, y: wallY, kind: 'wall' });
  }

  const front = OCCLUDER.y + OCCLUDER.height;
  for (let x = OCCLUDER.x; x <= OCCLUDER.x + OCCLUDER.width; x += spacingCm) {
    out.push({ x, y: front, kind: 'occluder' });
  }

  // A 2 cm post is only sampled when the spacing can resolve it.
  if (spacingCm <= THIN_POST.width) {
    for (
      let x = THIN_POST.x;
      x <= THIN_POST.x + THIN_POST.width;
      x += spacingCm
    ) {
      out.push({ x, y: THIN_POST.y + THIN_POST.height, kind: 'thin' });
    }
  } else {
    out.push({
      x: THIN_POST.x + THIN_POST.width / 2,
      y: THIN_POST.y + THIN_POST.height,
      kind: 'thin',
    });
  }

  const cx = TRANSPARENT_BOTTLE.x + TRANSPARENT_BOTTLE.width / 2;
  const cy = TRANSPARENT_BOTTLE.y + TRANSPARENT_BOTTLE.height / 2;
  const radius = TRANSPARENT_BOTTLE.width / 2;
  const steps = Math.max(4, Math.round((Math.PI * radius) / spacingCm));
  for (let i = 0; i <= steps; i += 1) {
    const angle = Math.PI * (i / steps);
    out.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle) - TRANSPARENT_DEPTH_BIAS_CM,
      kind: 'transparent',
    });
  }

  return out;
}

/**
 * Where a Gaussian splat renders geometry it never measured: samples
 * scattered through the occlusion shadow.
 *
 * Deterministic by construction (a fixed low-discrepancy walk, no RNG), so
 * the panel renders identically on the server and in the browser and a
 * screenshot taken twice is byte-identical.
 */
export function hallucinatedSplats(spacingCm: number): Point[] {
  const shadow = occlusionShadow();
  const xs = shadow.map((p) => p.x);
  const ys = shadow.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const step = Math.max(spacingCm, 4);
  const out: Point[] = [];
  let row = 0;
  for (let y = minY + step / 2; y < maxY; y += step) {
    row += 1;
    // Half-step stagger so the fill reads as a cloud rather than a grid.
    const offset = row % 2 === 0 ? step / 2 : 0;
    for (let x = minX + offset; x < maxX; x += step) {
      if (pointInPolygon({ x, y }, shadow)) out.push({ x, y });
    }
  }
  return out;
}
