import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTACTS,
  DEFAULT_MU,
  analyzeGrasp,
  contactGeometry,
  convexHull3,
  primitiveWrenches,
} from '@/lib/grasp';

/**
 * Unit tests for the planar grasp wrench-space model (lib/grasp.ts).
 *
 * The reference object is the unit square (half side 1) centered at the
 * origin, so the geometry is exact: contacts at edge midpoints have
 * axis-aligned inward normals, and several configurations have closed-form
 * force-closure answers from Nguyen's antipodal theorem (the line through
 * two contacts must lie strictly inside both friction cones).
 */

const TOL = 1e-6;

describe('contactGeometry', () => {
  it('places s=0.125 at the top edge midpoint with a downward inward normal', () => {
    const g = contactGeometry(0.125);
    expect(g.edge).toBe(0);
    expect(g.point.x).toBeCloseTo(0, 9);
    expect(g.point.y).toBeCloseTo(1, 9);
    expect(g.normal.x).toBeCloseTo(0, 9);
    expect(g.normal.y).toBeCloseTo(-1, 9);
  });

  it('walks the perimeter counterclockwise: left, bottom, right midpoints', () => {
    const left = contactGeometry(0.375);
    expect(left.edge).toBe(1);
    expect(left.point.x).toBeCloseTo(-1, 9);
    expect(left.point.y).toBeCloseTo(0, 9);
    expect(left.normal.x).toBeCloseTo(1, 9);
    expect(left.normal.y).toBeCloseTo(0, 9);

    const bottom = contactGeometry(0.625);
    expect(bottom.edge).toBe(2);
    expect(bottom.point.x).toBeCloseTo(0, 9);
    expect(bottom.point.y).toBeCloseTo(-1, 9);
    expect(bottom.normal.x).toBeCloseTo(0, 9);
    expect(bottom.normal.y).toBeCloseTo(1, 9);

    const right = contactGeometry(0.875);
    expect(right.edge).toBe(3);
    expect(right.point.x).toBeCloseTo(1, 9);
    expect(right.point.y).toBeCloseTo(0, 9);
    expect(right.normal.x).toBeCloseTo(-1, 9);
    expect(right.normal.y).toBeCloseTo(0, 9);
  });

  it('returns a unit tangent perpendicular to the normal', () => {
    for (const s of [0.0, 0.125, 0.3, 0.5, 0.7, 0.99]) {
      const g = contactGeometry(s);
      const len = Math.hypot(g.tangent.x, g.tangent.y);
      expect(len).toBeCloseTo(1, 9);
      // Tangent dot normal = 0.
      expect(g.tangent.x * g.normal.x + g.tangent.y * g.normal.y).toBeCloseTo(
        0,
        9,
      );
    }
  });

  it('wraps s into [0, 1)', () => {
    const a = contactGeometry(0.125);
    const b = contactGeometry(1.125);
    expect(b.point.x).toBeCloseTo(a.point.x, 9);
    expect(b.point.y).toBeCloseTo(a.point.y, 9);
    expect(b.edge).toBe(a.edge);
  });
});

describe('primitiveWrenches', () => {
  it('builds the two cone-edge wrenches at unit normal force', () => {
    // Top midpoint, mu = 0.5: forces (+-0.5, -1), torque r x f.
    const [wPlus, wMinus] = primitiveWrenches(contactGeometry(0.125), 0.5);
    expect(wPlus.x).toBeCloseTo(0.5, 9);
    expect(wPlus.y).toBeCloseTo(-1, 9);
    // tau = p.x * f.y - p.y * f.x = 0 * (-1) - 1 * 0.5 = -0.5.
    expect(wPlus.z).toBeCloseTo(-0.5, 9);
    expect(wMinus.x).toBeCloseTo(-0.5, 9);
    expect(wMinus.y).toBeCloseTo(-1, 9);
    expect(wMinus.z).toBeCloseTo(0.5, 9);
  });
});

describe('convexHull3', () => {
  it('finds the four facets of a tetrahedron', () => {
    const hull = convexHull3([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ]);
    expect(hull.fullDim).toBe(true);
    expect(hull.facets).toHaveLength(4);
    // Every facet keeps all points on its inward side (offset <= 0 at the
    // points, and the origin-side test is the caller's job).
    for (const facet of hull.facets) {
      expect(facet.points.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('reports coplanar point sets as degenerate', () => {
    const hull = convexHull3([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 },
    ]);
    expect(hull.fullDim).toBe(false);
    // Coplanar inputs collapse to one deduplicated plane (both orientations
    // of the same supporting plane merge), never a closed volume.
    expect(hull.facets).toHaveLength(1);
  });
});

describe('analyzeGrasp', () => {
  it('the default three-contact grasp is force closure with positive epsilon', () => {
    const a = analyzeGrasp(DEFAULT_CONTACTS, DEFAULT_MU);
    expect(a.forceClosure).toBe(true);
    expect(a.epsilon).toBeGreaterThan(0);
    expect(a.primitives).toHaveLength(6);
  });

  it('reproduces the closed-form antipodal epsilon: mu / sqrt(2 + mu^2)', () => {
    // Top and bottom edge midpoints are antipodal: the line through them is
    // the common normal, strictly inside any nonzero friction cone. The hull
    // of the four primitive wrenches then has every facet at distance
    // mu / sqrt(2 + mu^2) from the origin (derived by hand from the wrench
    // coordinates). At mu = 0.5 that is exactly 1/3.
    const a = analyzeGrasp([0.125, 0.625], 0.5);
    expect(a.forceClosure).toBe(true);
    expect(a.epsilon).toBeCloseTo(1 / 3, 6);
  });

  it('breaks closure when the bottom contact is removed from the default grasp', () => {
    // Top + right midpoints: the line through the contacts sits at 45
    // degrees to each inward normal, and arctan(0.7) = 35 degrees, so
    // Nguyen's antipodal condition fails.
    const a = analyzeGrasp([0.125, 0.875], DEFAULT_MU);
    expect(a.forceClosure).toBe(false);
    expect(a.epsilon).toBe(0);
  });

  it('keeps the antipodal residual pair closed at any positive friction', () => {
    // Dropping the right-edge contact leaves top + bottom: the connecting
    // line is the shared normal, inside both cones for any mu > 0.
    const a = analyzeGrasp([0.125, 0.625], 0.1);
    expect(a.forceClosure).toBe(true);
    expect(a.epsilon).toBeGreaterThan(0);
  });

  it('treats the mu = 1 boundary honestly: 45 degrees is not strictly inside', () => {
    const a = analyzeGrasp([0.125, 0.875], 1.0);
    expect(a.forceClosure).toBe(false);
    expect(a.epsilon).toBe(0);
  });

  it('shrinks the wrench hull monotonically as friction drops', () => {
    const hi = analyzeGrasp(DEFAULT_CONTACTS, 0.9);
    const mid = analyzeGrasp(DEFAULT_CONTACTS, 0.5);
    const lo = analyzeGrasp(DEFAULT_CONTACTS, 0.2);
    expect(hi.epsilon).toBeGreaterThan(mid.epsilon);
    expect(mid.epsilon).toBeGreaterThan(lo.epsilon);
    expect(lo.epsilon).toBeGreaterThan(0);
  });

  it('grows the hull when a fourth contact is added on the left edge', () => {
    const three = analyzeGrasp(DEFAULT_CONTACTS, DEFAULT_MU);
    const four = analyzeGrasp([...DEFAULT_CONTACTS, 0.375], DEFAULT_MU);
    expect(four.forceClosure).toBe(true);
    expect(four.epsilon).toBeGreaterThan(three.epsilon);
    expect(four.primitives).toHaveLength(8);
  });

  it('reports two contacts on the same edge as degenerate, not closure', () => {
    // Both contacts on the top edge: all primitive wrenches share fy = -1,
    // so the wrench set is coplanar and cannot positively span R^3.
    const a = analyzeGrasp([0.1, 0.2], DEFAULT_MU);
    expect(a.forceClosure).toBe(false);
    expect(a.epsilon).toBe(0);
  });

  it('is deterministic: identical inputs give bit-identical output', () => {
    const a = analyzeGrasp(DEFAULT_CONTACTS, DEFAULT_MU);
    const b = analyzeGrasp(DEFAULT_CONTACTS, DEFAULT_MU);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('keeps every facet strictly clear of the origin exactly when closure holds', () => {
    // Independent cross-check of the epsilon semantics: for a force-closure
    // grasp, epsilon equals the minimum signed distance from the origin to
    // a facet plane; for a broken grasp, some facet plane touches or
    // crosses the origin.
    const closed = analyzeGrasp(DEFAULT_CONTACTS, DEFAULT_MU);
    let minDist = Number.POSITIVE_INFINITY;
    for (const facet of closed.hull.facets) {
      const n = Math.hypot(facet.normal.x, facet.normal.y, facet.normal.z);
      const d = -facet.offset / n; // signed origin distance, outward normal
      minDist = Math.min(minDist, d);
    }
    expect(minDist).toBeCloseTo(closed.epsilon, 6);

    const open = analyzeGrasp([0.125, 0.875], DEFAULT_MU);
    expect(open.epsilon).toBe(0);
    expect(open.hull.facets.length).toBeGreaterThan(0);
    let touches = false;
    for (const facet of open.hull.facets) {
      const n = Math.hypot(facet.normal.x, facet.normal.y, facet.normal.z);
      if (Math.abs(facet.offset / n) < TOL) touches = true;
    }
    expect(touches).toBe(true);
  });
});
