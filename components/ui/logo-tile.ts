/**
 * The one tile every company mark sits on, on the market map and on the
 * credits page alike: the mark thresholded to black and white on the
 * mid-neutral plate (--color-logo-plate, #7D7A73).
 *
 * The marks are third-party artwork that runs from white wordmarks to
 * mid-tone brand colours, and no single plate clears 3:1 against all of
 * them in their own colours. Thresholded, every pixel lands on black
 * (4.8:1 against the plate) or white (4.4:1), so a white wordmark and a
 * dark one stay legible side by side. The filter order matters: grayscale
 * first, then brightness(0.625), which moves the split from 50% to 80%
 * grey, then the contrast step that splits it. At 50% a white mark on a
 * mid-tone field and a mid-grey mark on white both came out as one blank
 * white block; at 80% each keeps its mark, and every white wordmark stays
 * white. The asset files themselves are never edited.
 */
export const LOGO_TILE_CLASS =
  'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xs bg-logo-plate p-[3px]';

export const LOGO_MARK_CLASS =
  'max-h-full max-w-full object-contain [filter:grayscale(1)_brightness(0.625)_contrast(100)]';
