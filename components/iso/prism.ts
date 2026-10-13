/**
 * Solids on any axis, for parts the kit's floor prisms cannot draw: a bar
 * that turns in a vertical plane, a wheel on its axle, a pin standing out of
 * an upright board.
 *
 * `prismAlong` extrudes a convex polygon (any plane, any orientation) along a
 * vector and returns the kit's SolidPaths, shaded by the kit's own rules: the
 * visible cap is the light face (the kit's `top`), the visible sides fall into
 * the four shade buckets by how they face the kit's light, creases run where
 * two visible faces meet, and the outline is the silhouette. A round part
 * (`discAlong`) keeps its facet tones but draws no creases between facets, so
 * its side reads as one curved surface.
 *
 * World coordinates are the kit's: x and y on the floor, z up.
 */
import { cameraOf, iso, pathOf, SHADES, type Flat, type Point3, type Projection, type SolidPaths } from './iso-kit.ts';

const sub = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Point3, k: number): Point3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Point3, b: Point3): Point3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Point3): Point3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};

/** The unit direction toward the viewer: depthOf(p) is dot(p, viewOf(P)). */
export function viewOf(projection: Projection): Point3 {
  const { sinA, cosA, sinE, cosE } = cameraOf(projection);
  return [cosA * cosE, sinA * cosE, sinE];
}

function hull(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && turn(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Flat[] = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index]!;
    while (upper.length >= 2 && turn(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export interface PrismOptions {
  /** A round part: no creases between neighbouring side facets. */
  round?: boolean;
  /** A highlight line inset this far inside the visible cap's rim, where it meets visible sides. */
  bevel?: number;
}

/**
 * A convex prism: the planar convex polygon `ring` swept along `along`.
 * Faces that look away from the viewer are not drawn; the fill is the hull of
 * every corner, so the solid hides what is behind it.
 */
export function prismAlong(ring: Point3[], along: Point3, projection: Projection, options: PrismOptions = {}): SolidPaths {
  const count = ring.length;
  const far = ring.map((point) => add(point, along));
  const V = viewOf(projection);
  const { sinA, cosA } = cameraOf(projection);
  const centre = scale(ring.reduce((sum, point) => add(sum, point), [0, 0, 0] as Point3), 1 / count);
  const middle = add(centre, scale(along, 0.5));
  const axis = unit(along);
  const at = (point: Point3) => iso(point, projection);

  // Side faces: outward normal from each edge and the sweep direction.
  const sides = ring.map((point, index) => {
    const next = ring[(index + 1) % count]!;
    let normal = unit(cross(sub(next, point), axis));
    const mid = scale(add(add(point, next), add(far[index]!, far[(index + 1) % count]!)), 0.25);
    if (dot(normal, sub(mid, middle)) < 0) normal = scale(normal, -1);
    return { normal, visible: dot(normal, V) > 1e-9 };
  });
  // The cap at `ring` looks back along -axis, the cap at `far` along +axis.
  const nearCapVisible = dot(axis, V) < -1e-9;
  const farCapVisible = dot(axis, V) > 1e-9;
  const cap = farCapVisible ? far : nearCapVisible ? ring : null;

  const corners = [...ring, ...far].map(at);
  const silhouette = pathOf(hull(corners), true);
  const shades: string[][] = Array.from({ length: SHADES }, () => []);
  const crease: string[] = [];
  const light: Point3 = unit([-sinA, cosA, 0.9]);
  for (let index = 0; index < count; index++) {
    const side = sides[index]!;
    if (!side.visible) continue;
    const next = (index + 1) % count;
    const lit = (dot(side.normal, light) + 1) / 2;
    const shade = Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)));
    shades[shade]!.push(pathOf([at(ring[index]!), at(ring[next]!), at(far[next]!), at(far[index]!)], true));
    // A crease along the sweep where this side meets a visible neighbour (flat parts only).
    if (!options.round && sides[next]!.visible) crease.push(pathOf([at(ring[next]!), at(far[next]!)]));
    // A crease round the visible cap where a visible side meets it.
    if (cap) crease.push(pathOf([at(cap[index]!), at(cap[next]!)]));
  }
  let bevel: string | undefined;
  if (cap && options.bevel && options.bevel > 0) {
    const capCentre = scale(cap.reduce((sum, point) => add(sum, point), [0, 0, 0] as Point3), 1 / count);
    const inset = cap.map((point) => {
      const toward = sub(capCentre, point);
      const length = Math.hypot(toward[0], toward[1], toward[2]) || 1;
      return add(point, scale(toward, Math.min(options.bevel! / length, 0.45)));
    });
    const runs: number[][] = [];
    let run: number[] = [];
    for (let index = 0; index < count; index++) {
      if (sides[index]!.visible) run.push(index);
      else if (run.length) {
        runs.push(run);
        run = [];
      }
    }
    if (run.length) runs.push(run);
    if (runs.length > 1 && sides[0]!.visible && sides[count - 1]!.visible) runs[0] = [...runs.pop()!, ...runs[0]!];
    bevel = runs
      .map((indices) => {
        const points = [cap[indices[0]!]!, ...indices.slice(1).map((index) => inset[index]!), cap[(indices[indices.length - 1]! + 1) % count]!];
        return pathOf(points.map(at));
      })
      .join('');
  }
  return {
    fill: silhouette,
    outline: silhouette,
    crease: crease.join(''),
    top: cap ? pathOf(cap.map(at), true) : '',
    shades: shades.map((paths) => paths.join('')),
    bevel,
  };
}

/** Two unit vectors at right angles to `axis` (and to each other). */
export function basisOf(axis: Point3): [Point3, Point3] {
  const a = unit(axis);
  const helper: Point3 = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = unit(cross(a, helper));
  const v = cross(a, u);
  return [u, v];
}

/** A circle of `radius` round `centre`, in the plane at right angles to `axis`. */
export function circleAround(centre: Point3, axis: Point3, radius: number, steps = 28): Point3[] {
  const [u, v] = basisOf(axis);
  return Array.from({ length: steps }, (_, step) => {
    const angle = (step / steps) * Math.PI * 2;
    return add(centre, add(scale(u, radius * Math.cos(angle)), scale(v, radius * Math.sin(angle))));
  });
}

/** A round part on any axis: a disc, a wheel, a pin, a boss. `from` is the centre of one face; it runs `length` along `axis`. */
export function discAlong(from: Point3, axis: Point3, radius: number, length: number, projection: Projection, steps = 28, bevel = 0): SolidPaths {
  const a = unit(axis);
  return prismAlong(circleAround(from, a, radius, steps), scale(a, length), projection, { round: true, bevel });
}

/** A straight bar of rectangular section from `a` to `b`: `width` across in the direction `side`, `depth` across the other way. */
export function barBetween(a: Point3, b: Point3, side: Point3, width: number, depth: number, projection: Projection, bevel = 0): SolidPaths {
  const along = sub(b, a);
  const axis = unit(along);
  const s = unit(sub(side, scale(axis, dot(side, axis))));
  const t = cross(axis, s);
  const w = scale(s, width / 2);
  const d = scale(t, depth / 2);
  const ring: Point3[] = [add(add(a, w), d), add(sub(a, w), d), sub(sub(a, w), d), sub(add(a, w), d)];
  return prismAlong(ring, along, projection, { bevel });
}

/**
 * A flat plate lying in the plane spanned by `u` and `v` (unit vectors), outlined by the convex
 * `outline` in (u, v) coordinates about `origin`, and `thickness` thick along u × v.
 */
export function plateIn(origin: Point3, u: Point3, v: Point3, outline: Array<[number, number]>, thickness: number, projection: Projection, bevel = 0): SolidPaths {
  const ring = outline.map(([a, b]) => add(origin, add(scale(u, a), scale(v, b))));
  return prismAlong(ring, scale(unit(cross(u, v)), thickness), projection, { bevel });
}

/** A rounded rectangle (or stadium) outline in plane coordinates, for `plateIn`. */
export function roundedOutline(x0: number, y0: number, x1: number, y1: number, r: number, steps = 6): Array<[number, number]> {
  const radius = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
  const corners: Array<[number, number, number]> = [
    [x1 - radius, y0 + radius, -Math.PI / 2],
    [x1 - radius, y1 - radius, 0],
    [x0 + radius, y1 - radius, Math.PI / 2],
    [x0 + radius, y0 + radius, Math.PI],
  ];
  const out: Array<[number, number]> = [];
  for (const [cx, cy, start] of corners) {
    for (let step = 0; step <= steps; step++) {
      const angle = start + (step / steps) * (Math.PI / 2);
      out.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  }
  return out;
}
