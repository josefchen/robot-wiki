import { describe, expect, it } from 'vitest';
import { FIT_STAGE_PX, fitStagePx } from '@/components/model-viewer/model-scene';
import { HOME_VIEW, homeBand } from '@/components/three/robot-scene';

/**
 * The maker-model viewer fits each stage shape at one share of the stage,
 * whatever its size, so one still per shape lines up with the loaded model
 * at every width. Stage sizes measured on /robots-in-3d/: square from 278 to
 * 557 px (360 to 639 px windows), 16:10 from 329 to 569 px tall.
 */
describe('the model viewer’s fit', () => {
  const SQUARE_PX = [278, 308, 330, 348, 518, 557];
  const WIDE_PX = [328.75, 366.25, 408.75, 548.75, 568.75];
  // The hint line's box ends 31.5 px down (8 px offset, one 13 px line at 1.5, 2 px padding twice).
  const HINT_PX = 31.5;

  it('takes its band from the stage’s shape, never its size', () => {
    expect(fitStagePx(1)).toBe(FIT_STAGE_PX.square);
    expect(fitStagePx(16 / 10)).toBe(FIT_STAGE_PX.wide);
    expect(fitStagePx).toHaveLength(1);
  });

  it('keeps the model clear of the hint line on every stage it fits', () => {
    for (const [aspect, heights] of [[1, SQUARE_PX], [16 / 10, WIDE_PX]] as const) {
      const band = homeBand(fitStagePx(aspect));
      for (const px of heights) {
        expect(((1 - band.top) / 2) * px, `${aspect} at ${px} px`).toBeGreaterThan(HINT_PX + 12);
        expect(band.bottom, `${aspect} at ${px} px`).toBeGreaterThanOrEqual(-1 + 2 * HOME_VIEW.floorRoom - 1e-9);
      }
    }
  });

  it('keeps the 16:10 stage on the centred band', () => {
    expect(homeBand(fitStagePx(16 / 10))).toEqual({ top: HOME_VIEW.heightFill, bottom: -HOME_VIEW.heightFill });
  });
});
