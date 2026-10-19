/**
 * A plate standing on edge in the x-z plane, for the kit's isometric camera: the shape the kit's floor
 * prisms cannot draw when its edge is a curve (a template, a batten, a cam).
 */
import { cameraOf, iso, pathOf, SHADES, type Flat, type Point3, type Projection, type SolidPaths } from '../iso-kit.ts';
import { viewOf } from '../prism.ts';

const dot3 = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * A plate from y0 (back) to y1 (front) between a bottom and a top profile over the same xs: the front face, the
 * strips of its top edge that face the viewer (in the top's tone, as one machined edge) and its right end,
 * the faces shaded by facing as the kit shades its prisms (strips that face away hide behind the front face and
 * are left out).
 */
export function edgePlate(xs: number[], top: (x: number) => number, bottom: (x: number) => number, y0: number, y1: number, P: Projection): SolidPaths {
  const at = (point: Point3) => iso(point, P);
  const V = viewOf(P);
  const { sinA, cosA } = cameraOf(P);
  const light: Point3 = (() => {
    const l: Point3 = [-sinA, cosA, 0.9];
    const n = Math.hypot(...l);
    return [l[0] / n, l[1] / n, l[2] / n];
  })();
  const bucket = (normal: Point3) => Math.min(SHADES - 1, Math.max(0, Math.floor(((dot3(normal, light) + 1) / 2) * SHADES)));
  const frontTop = xs.map((x) => at([x, y1, top(x)]));
  const frontBottom = xs.map((x) => at([x, y1, bottom(x)]));
  const backTop = xs.map((x) => at([x, y0, top(x)]));
  const last = xs[xs.length - 1]!;
  const frontFace = pathOf([...frontTop, ...[...frontBottom].reverse()], true);
  const shades: string[][] = Array.from({ length: SHADES }, () => []);
  shades[bucket([0, 1, 0])]!.push(frontFace);
  const tops: string[] = [];
  const fill: string[] = [frontFace];
  const outline: string[] = [];
  let run: Flat[] = [];
  const runs: Flat[][] = [];
  for (let k = 0; k < xs.length - 1; k++) {
    const dx = xs[k + 1]! - xs[k]!;
    const dz = top(xs[k + 1]!) - top(xs[k]!);
    const length = Math.hypot(dx, dz) || 1;
    const normal: Point3 = [-dz / length, 0, dx / length];
    const quad = pathOf([frontTop[k]!, frontTop[k + 1]!, backTop[k + 1]!, backTop[k]!], true);
    if (dot3(normal, V) > 1e-9) {
      // The edge is one machined strip: drawn in the top's tone all along, so no tone steps where its slope turns.
      fill.push(quad);
      tops.push(quad);
      if (!run.length) run.push(backTop[k]!);
      run.push(backTop[k + 1]!);
    } else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  for (const r of runs) outline.push(pathOf(r));
  const end = [at([last, y1, top(last)]), at([last, y0, top(last)]), at([last, y0, bottom(last)]), at([last, y1, bottom(last)])];
  fill.push(pathOf(end, true));
  shades[bucket([1, 0, 0])]!.push(pathOf(end, true));
  outline.push(pathOf(end));
  outline.push(pathOf(frontBottom));
  outline.push(pathOf([frontBottom[0]!, frontTop[0]!, backTop[0]!]));
  return {
    fill: fill.join(''),
    outline: outline.join(''),
    crease: pathOf(frontTop) + pathOf([end[0]!, end[3]!]),
    top: tops.join(''),
    shades: shades.map((paths) => paths.join('')),
  };
}
