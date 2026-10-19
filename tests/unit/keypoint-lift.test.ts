import { describe, expect, it } from 'vitest';
import {
  EYE,
  HANDLE_BAR,
  IMAGE_X,
  PICKED,
  PIXEL,
  PIXEL_DEPTH,
  RAY,
  READING,
  SHARE_MIN,
  hitBox,
  liftTo,
  pixelOf,
  placeOf,
  readoutFor,
} from '@/lib/keypoint-lift';

const near = (a: readonly number[], b: readonly number[], digits = 9) => a.forEach((value, k) => expect(value).toBeCloseTo(b[k]!, digits));

describe('the keypoint lift', () => {
  it('back-projects along one line: every depth shows up at the same pixel', () => {
    expect(Math.hypot(...RAY)).toBeCloseTo(1, 12);
    for (let depth = PIXEL_DEPTH; depth <= READING * 1.2; depth += 3) {
      const point = liftTo(depth);
      const pixel = pixelOf(point);
      expect(pixel.y).toBeCloseTo(PIXEL.y, 9);
      expect(pixel.z).toBeCloseTo(PIXEL.z, 9);
      // X = C + d·u: the lifted point is the depth away from the camera's centre.
      expect(Math.hypot(point[0] - EYE[0], point[1] - EYE[1], point[2] - EYE[2])).toBeCloseTo(depth, 9);
    }
    // At the image's own depth the lifted point is the pixel, in the frame's plane.
    near(liftTo(PIXEL_DEPTH), [IMAGE_X, PIXEL.y, PIXEL.z]);
  });

  it("reads the depth where the line first meets a surface: the top of the handle's bar", () => {
    expect(READING).toBeCloseTo(hitBox(HANDLE_BAR), 12);
    near(liftTo(READING), PICKED);
    expect(PICKED[2]).toBe(HANDLE_BAR.max[2]);
    expect(PICKED[0]).toBeGreaterThan(HANDLE_BAR.min[0]);
    expect(PICKED[0]).toBeLessThan(HANDLE_BAR.max[0]);
    // Short of the reading, the target is in the air above the bar's top, on the same line.
    for (const share of [0.5, 0.75, 0.95]) expect(liftTo(share * READING)[2]).toBeGreaterThan(HANDLE_BAR.max[2]);
  });

  it('places and reads out the target in words', () => {
    expect(SHARE_MIN).toBeCloseTo(PIXEL_DEPTH / READING, 2);
    expect(placeOf(1)).toBe('on');
    expect(placeOf(SHARE_MIN)).toBe('image');
    expect(placeOf(0.7)).toBe('short');
    expect(readoutFor(1)).toBe('Depth read · target on the handle');
    expect(readoutFor(0.7)).toBe('Depth 30% short · target in the air');
    // A bead a hair short of the reading, as mid-run, still reads as short, never as 0% short.
    expect(readoutFor(0.996)).toBe('Depth 1% short · target in the air');
    expect(readoutFor(SHARE_MIN)).toBe('No depth · just a point in the image');
    // One line on a phone: no readout runs past 40 characters.
    for (let share = SHARE_MIN; share <= 1; share += 0.01) expect(readoutFor(share).length).toBeLessThanOrEqual(40);
  });
});
