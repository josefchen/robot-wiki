/**
 * The keypoint lift behind KeypointString (manipulation/hierarchical): how a
 * point a vision-language model picks in a camera image becomes a 3D target
 * an arm can reach.
 *
 * A pixel fixes only a line: every point on the ray from the camera's centre
 * through that pixel lands on it. A depth reading picks one point on the
 * line, the pinhole back-projection X = C + d·u, where C is the camera's
 * centre, u the unit ray through the pixel and d the depth. MOKA and
 * RoboPoint lift their chosen points this way, with calibrated depth
 * (moka-2024, robopoint-2024). Read too short, and the target hangs in the
 * air on the same line.
 *
 * The scene is illustrative: a camera on a post, its image as a framed grid
 * (a perspective frame after Dürer), and a toolbox whose carry handle the
 * model points at. Units are the drawing's world units; no camera intrinsics
 * or distances are claimed.
 */

export type Vec = readonly [number, number, number];

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
const length = (a: Vec) => Math.hypot(a[0], a[1], a[2]);

/** The base's top: the table the toolbox stands on. */
export const TABLE = 18;
/** The camera's centre (its lens), and the image plane: the frame stands at this x, facing the camera. */
export const EYE: Vec = [-86, -10, TABLE + 74];
export const IMAGE_X = -34;

/** A box in the scene, by its two corners. */
export type Box = { min: Vec; max: Vec };
/** The toolbox, and its carry handle's bar on two posts. */
export const TOOLBOX: Box = { min: [8, -16, TABLE], max: [64, 20, TABLE + 30] };
export const HANDLE_BAR: Box = { min: [34, -14, TABLE + 40], max: [38, 18, TABLE + 44] };
export const HANDLE_POSTS: Box[] = [
  { min: [34.4, -13.6, TABLE + 30], max: [37.6, -10.4, TABLE + 40] },
  { min: [34.4, 14.4, TABLE + 30], max: [37.6, 17.6, TABLE + 40] },
];
/** The point the model picks: the middle of the handle's top. */
export const PICKED: Vec = [36, 2, TABLE + 44];

/** The unit ray from the camera's centre toward the picked point. */
export const RAY: Vec = mul(sub(PICKED, EYE), 1 / length(sub(PICKED, EYE)));

/** Where a ray from the eye first meets a box (the slab method), or Infinity. */
export function hitBox(box: Box, from: Vec = EYE, ray: Vec = RAY): number {
  let near = -Infinity;
  let far = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    const d = ray[axis]!;
    const lo = box.min[axis]!;
    const hi = box.max[axis]!;
    const o = from[axis]!;
    if (Math.abs(d) < 1e-12) {
      if (o < lo || o > hi) return Infinity;
      continue;
    }
    const t0 = (lo - o) / d;
    const t1 = (hi - o) / d;
    near = Math.max(near, Math.min(t0, t1));
    far = Math.min(far, Math.max(t0, t1));
  }
  return near <= far && near >= 0 ? near : Infinity;
}

/** The depth camera's reading along the ray: the distance to the first surface it meets. */
export const READING = Math.min(hitBox(HANDLE_BAR), ...HANDLE_POSTS.map((post) => hitBox(post)), hitBox(TOOLBOX));

/** The point a depth `d` lifts the pixel to: X = C + d·u. */
export const liftTo = (depth: number): Vec => add(EYE, mul(RAY, depth));

/** Where a point's line from the eye crosses the image: the pixel it shows up at. */
export function pixelOf(point: Vec): { y: number; z: number } {
  const ray = sub(point, EYE);
  const t = (IMAGE_X - EYE[0]) / ray[0];
  return { y: EYE[1] + ray[1] * t, z: EYE[2] + ray[2] * t };
}

/** The picked pixel, and the depth at which the line passes through it. */
export const PIXEL = pixelOf(PICKED);
export const PIXEL_DEPTH = (IMAGE_X - EYE[0]) / RAY[0];

/** The reader sets the depth as a share of the reading: from the image itself to the reading. */
export const SHARE_MIN = Math.round((PIXEL_DEPTH / READING) * 100) / 100;
export const STILL_SHARE = 1;

/** How the lifted point stands, for a share of the reading. */
export function placeOf(share: number): 'image' | 'short' | 'on' {
  if (share >= 1 - 1e-9) return 'on';
  if (share <= SHARE_MIN + 1e-9) return 'image';
  return 'short';
}

/**
 * How far short of the reading a share is, in whole percent. A point short of the reading is never shown as
 * 0% short, nor as 100% of the reading: mid-run the bead passes shares a hair below the reading.
 */
export function percentShort(share: number): number {
  return Math.min(99, Math.max(1, Math.round((1 - share) * 100)));
}

/** The readout, in words: short enough for one line on a phone. */
export function readoutFor(share: number): string {
  const place = placeOf(share);
  if (place === 'on') return 'Depth read · target on the handle';
  if (place === 'image') return 'No depth · just a point in the image';
  return `Depth ${percentShort(share)}% short · target in the air`;
}
