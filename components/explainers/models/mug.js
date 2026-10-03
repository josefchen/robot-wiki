// A plain coffee mug: a lathe body (foot, wall, rounded rim, inner wall, inner floor) and a torus handle.
// Sizes in metres: 8 cm across, 9.5 cm tall, 4 mm wall. Used by the "Four ways to see a mug" explainer.
import { THREE } from '../kit.js';

export const MUG = { radius: 0.04, height: 0.0955, wall: 0.004 };

// Profile (radius, height), traced up the outside and back down the inside, so the lathe's
// faces and normals point out of the ceramic everywhere.
// The straight walls are split into five bands so the skin's triangles stay small and even.
const band = (r, y0, y1, n = 5) => Array.from({ length: n - 1 }, (_, i) => [r, y0 + ((y1 - y0) * (i + 1)) / n]);
const PROFILE = [
  [0, 0], [0.032, 0], [0.0365, 0.0015], [0.0393, 0.0055], [0.04, 0.011], ...band(0.04, 0.011, 0.088), [0.04, 0.088], [0.0398, 0.0925],
  [0.0388, 0.0948], [0.0372, 0.0955], [0.0358, 0.0948], [0.036, 0.092], ...band(0.036, 0.092, 0.014), [0.036, 0.014], [0.0352, 0.0105],
  [0.033, 0.0085], [0.029, 0.008], [0, 0.008],
];

export function mugGeometries({ segments = 36, handleTube = 10, handleSegments = 24 } = {}) {
  const body = new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  const arc = (200 * Math.PI) / 180;
  const handle = new THREE.TorusGeometry(0.026, 0.0062, handleTube, handleSegments, arc);
  handle.rotateZ(-arc / 2);
  handle.scale(1, 1.15, 1);
  handle.translate(0.0405, 0.05, 0);
  return { body, handle };
}

// Area-weighted random points on a set of indexed geometries, with interpolated normals.
// rnd: a function returning uniform numbers in [0, 1).
export function surfaceSampler(geos) {
  const tris = [];
  for (const g of geos) {
    const pos = g.attributes.position, nor = g.attributes.normal, idx = g.index;
    const n = idx ? idx.count : pos.count;
    for (let t = 0; t < n; t += 3) {
      const ia = idx ? idx.getX(t) : t, ib = idx ? idx.getX(t + 1) : t + 1, ic = idx ? idx.getX(t + 2) : t + 2;
      const a = new THREE.Vector3().fromBufferAttribute(pos, ia), b = new THREE.Vector3().fromBufferAttribute(pos, ib), c = new THREE.Vector3().fromBufferAttribute(pos, ic);
      const area = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
      if (area < 1e-12) continue;
      tris.push({ a, b, c, na: new THREE.Vector3().fromBufferAttribute(nor, ia), nb: new THREE.Vector3().fromBufferAttribute(nor, ib), nc: new THREE.Vector3().fromBufferAttribute(nor, ic), area });
    }
  }
  const cum = new Float64Array(tris.length);
  let total = 0;
  tris.forEach((t, i) => { total += t.area; cum[i] = total; });
  return {
    area: total,
    sample(rnd, p, nrm) {
      const x = rnd() * total;
      let lo = 0, hi = cum.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < x) lo = mid + 1; else hi = mid; }
      const t = tris[lo];
      let u = rnd(), v = rnd();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const w = 1 - u - v;
      p.set(t.a.x * w + t.b.x * u + t.c.x * v, t.a.y * w + t.b.y * u + t.c.y * v, t.a.z * w + t.b.z * u + t.c.z * v);
      nrm.set(t.na.x * w + t.nb.x * u + t.nc.x * v, t.na.y * w + t.nb.y * u + t.nc.y * v, t.na.z * w + t.nb.z * u + t.nc.z * v).normalize();
    },
  };
}
