/**
 * Planar grasp wrench-space model for the grasp-planning module.
 *
 * The grasped object is a unit square (half side 1) centered at the origin,
 * gripped by frictional point contacts that slide along its perimeter. Each
 * contact obeys the Coulomb friction model with coefficient mu: the contact
 * force must stay inside a cone of half-angle arctan(mu) around the inward
 * surface normal. In the plane, a cone is a wedge, so its boundary is the
 * two edge rays f = n +/- mu * t at unit normal force. Mapping those rays
 * through the grasp map (appending the moment tau = r x f about the
 * object's center) gives the primitive contact wrenches, and the grasp
 * wrench space is their convex hull in the 3D wrench space (fx, fy, tau).
 * Torque is expressed per unit of the object's half side, so force and
 * moment share one scale.
 *
 * Force closure holds exactly when the origin (zero net wrench) lies
 * strictly inside that hull (Nguyen 1988; Murray, Li, and Sastry ch. 5).
 * The grasp quality epsilon is the Ferrari-Canny metric: the radius of the
 * largest wrench ball centered at the origin that still fits inside the
 * hull, equal to the minimum distance from the origin to a hull facet.
 *
 * Everything here is deterministic pure computation: no randomness, no
 * clocks, no floating-point iteration, so SSR markup and hydration agree
 * byte for byte and tests can assert exact closed-form values.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Half side length of the square object. */
export const SQUARE_HALF = 1;
/** Perimeter of the unit square: four sides of length 2. */
const PERIMETER = 8;

export const MIN_CONTACTS = 2;
export const MAX_CONTACTS = 6;

/** Top, right, and bottom edge midpoints: a force-closure tripod. */
export const DEFAULT_CONTACTS = [0.125, 0.875, 0.625];
/** Contact controls preserve exact eighth-perimeter landmarks. */
export const CONTACT_POSITION_MIN = 0;
export const CONTACT_POSITION_MAX = 0.995;
export const CONTACT_POSITION_STEP = 0.005;
export const DEFAULT_MU = 0.7;

/**
 * Signed-distance tolerance for the strict-interior test. Coordinates here
 * are O(1) with exact dyadic inputs in most configurations, so 1e-7 is far
 * above float noise and far below any honest wrench magnitude.
 */
const STRICT_TOL = 1e-7;
/** A point counts as lying on a facet plane within this distance. */
const PLANAR_TOL = 1e-7;
/** Triples whose cross product is shorter than this are collinear. */
const COLLINEAR_TOL = 1e-12;

export interface ContactGeometry {
  /** Perimeter parameter in [0, 1), counterclockwise from the top-right corner. */
  s: number;
  /** Edge index: 0 top, 1 left, 2 bottom, 3 right. */
  edge: number;
  /** Contact point on the object boundary. */
  point: Vec2;
  /** Unit inward-pointing surface normal. */
  normal: Vec2;
  /** Unit tangent: the normal rotated 90 degrees counterclockwise. */
  tangent: Vec2;
}

/** Vertices of the unit square, counterclockwise from (1, 1). */
const VERTICES: Vec2[] = [
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
];

/** Locate a contact on the square's perimeter from its parameter s. */
export function contactGeometry(sRaw: number): ContactGeometry {
  const s = (((sRaw % 1) + 1) % 1) || 0;
  const d = s * PERIMETER;
  const edge = Math.min(3, Math.floor(d / 2));
  const t = d / 2 - edge;
  const a = VERTICES[edge];
  const b = VERTICES[(edge + 1) % 4];
  const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  // Inward normal: from the edge midpoint toward the centroid at (0, 0).
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const len = Math.hypot(mid.x, mid.y);
  const normal = { x: -mid.x / len, y: -mid.y / len };
  const tangent = { x: -normal.y, y: normal.x };
  return { s, edge, point, normal, tangent };
}

/**
 * The two primitive wrenches of one frictional contact: the cone edges
 * f = n +/- mu * t at unit normal force, lifted to (fx, fy, tau) with
 * tau = p.x * f.y - p.y * f.x.
 */
export function primitiveWrenches(
  geom: ContactGeometry,
  mu: number,
): [Vec3, Vec3] {
  const make = (sign: 1 | -1): Vec3 => {
    const fx = geom.normal.x + sign * mu * geom.tangent.x;
    const fy = geom.normal.y + sign * mu * geom.tangent.y;
    return { x: fx, y: fy, z: geom.point.x * fy - geom.point.y * fx };
  };
  return [make(1), make(-1)];
}

export interface HullFacet {
  /** Unit outward normal of the facet plane. */
  normal: Vec3;
  /** Plane offset: normal . x + offset = 0 on the plane. Negative when the origin is strictly inside the hull. */
  offset: number;
  /** Indices of the input points lying on the facet plane (3 or more when facets merge). */
  points: number[];
}

export interface ConvexHull3 {
  facets: HullFacet[];
  /** False when every input point is coplanar (no volume to contain the origin). */
  fullDim: boolean;
}

const cross3 = (u: Vec3, v: Vec3): Vec3 => ({
  x: u.y * v.z - u.z * v.y,
  y: u.z * v.x - u.x * v.z,
  z: u.x * v.y - u.y * v.x,
});

const sub3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

const dot3 = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * Convex hull of a small 3D point set by exhaustive facet enumeration:
 * every triple whose plane keeps all points on one side is a facet. Coplanar
 * neighbors merge naturally because every point on a facet plane is listed
 * and duplicate planes are deduplicated. With at most 13 input points (six
 * contacts, two cone edges each, plus the origin) this is a few hundred
 * plane tests, cheap enough to re-run on every slider tick and simple
 * enough to audit line by line.
 */
export function convexHull3(points: Vec3[]): ConvexHull3 {
  const n = points.length;
  const byKey = new Map<string, HullFacet>();

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      for (let k = j + 1; k < n; k += 1) {
        const a = points[i];
        let normal = cross3(sub3(points[j], a), sub3(points[k], a));
        const normLen = Math.hypot(normal.x, normal.y, normal.z);
        if (normLen < COLLINEAR_TOL) continue;
        let offset = -dot3(normal, a);

        let allBelow = true;
        let allAbove = true;
        for (let l = 0; l < n; l += 1) {
          const v = dot3(normal, points[l]) + offset;
          if (v > PLANAR_TOL) allBelow = false;
          if (v < -PLANAR_TOL) allAbove = false;
        }
        if (!allBelow && !allAbove) continue;
        // Orient the normal outward: hull points sit on the negative side.
        if (allAbove && !allBelow) {
          normal = { x: -normal.x, y: -normal.y, z: -normal.z };
          offset = -offset;
        }

        const inv = 1 / normLen;
        normal = { x: normal.x * inv, y: normal.y * inv, z: normal.z * inv };
        offset *= inv;
        // Dedup key with a canonical sign so the two orientations of a
        // coplanar set merge into one entry; the stored facet keeps its
        // outward orientation regardless.
        const lead =
          Math.abs(normal.x) > 1e-9
            ? normal.x
            : Math.abs(normal.y) > 1e-9
              ? normal.y
              : normal.z;
        const flip = lead < 0 ? -1 : 1;
        const key = [
          normal.x * flip,
          normal.y * flip,
          normal.z * flip,
          offset * flip,
        ]
          .map((v) => v.toFixed(6))
          .join(',');
        if (byKey.has(key)) continue;

        const onPlane: number[] = [];
        for (let l = 0; l < n; l += 1) {
          if (Math.abs(dot3(normal, points[l]) + offset) <= PLANAR_TOL) {
            onPlane.push(l);
          }
        }
        byKey.set(key, { normal, offset, points: onPlane });
      }
    }
  }

  const facets = [...byKey.values()];
  // A nondegenerate 3D hull has at least four facets (a tetrahedron);
  // coplanar inputs collapse to a single deduplicated plane.
  return { facets, fullDim: facets.length >= 4 };
}

export interface GraspAnalysis {
  positions: number[];
  mu: number;
  forceClosure: boolean;
  /** Ferrari-Canny epsilon: min origin-to-facet distance, 0 when open. */
  epsilon: number;
  /** Two cone-edge wrenches per contact, in contact order. */
  primitives: Vec3[];
  /** Origin followed by the primitives: the hull's input points. */
  hullPoints: Vec3[];
  hull: ConvexHull3;
}

/**
 * Analyze a planar grasp: build the primitive wrench hull and test whether
 * the origin lies strictly inside it, reporting the inscribed-ball radius.
 */
export function analyzeGrasp(positions: number[], mu: number): GraspAnalysis {
  const primitives = positions.flatMap((s) =>
    primitiveWrenches(contactGeometry(s), mu),
  );
  const hullPoints: Vec3[] = [{ x: 0, y: 0, z: 0 }, ...primitives];
  const hull = convexHull3(hullPoints);

  let epsilon = 0;
  if (hull.fullDim) {
    let minDist = Number.POSITIVE_INFINITY;
    for (const facet of hull.facets) {
      // Unit outward normals: -offset is the origin's distance inward.
      minDist = Math.min(minDist, -facet.offset);
    }
    if (minDist > STRICT_TOL) epsilon = minDist;
  }

  return {
    positions: [...positions],
    mu,
    forceClosure: epsilon > 0,
    epsilon,
    primitives,
    hullPoints,
    hull,
  };
}

/**
 * Where "add a contact" drops the new contact: the perimeter point farthest
 * from every existing contact (max-min angular distance, ties broken toward
 * the smaller s). Deterministic, so the component and its tests agree.
 */
export function suggestContactPosition(existing: number[]): number {
  let bestS = 0;
  let bestScore = -1;
  for (let step = 0; step < 100; step += 1) {
    const s = step / 100;
    let score = Number.POSITIVE_INFINITY;
    for (const e of existing) {
      const d = Math.abs(s - (((e % 1) + 1) % 1));
      score = Math.min(score, Math.min(d, 1 - d));
    }
    if (score > bestScore + 1e-12) {
      bestScore = score;
      bestS = s;
    }
  }
  return Number(bestS.toFixed(2));
}
