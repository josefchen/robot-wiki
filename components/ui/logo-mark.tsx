/**
 * How every company mark is drawn, on the market map and on the credits
 * page alike: plate-less, as a single-ink silhouette.
 *
 * The marks are third-party artwork that runs from white wordmarks to
 * multicolour badges. Drawn as files, a white mark vanishes on the paper and
 * every colour fights the page's one accent; the old answer, a mid-grey
 * plate under a black-and-white threshold, turned the map into a hundred
 * grey chips (owner review of 19 October 2026: "the market map has weird
 * background and borders"). Here the file is never painted. Its alpha
 * channel is the mask of one element filled with the secondary ink token
 * (`--color-text-dim`, the tile's quiet line), so a white mark and a dark
 * mark read the same, nothing sits behind either, and no colour is
 * invented. A mark whose alpha alone would be a blob (an opaque background,
 * a badge read by its internal contrast) is fixed in its source file, never
 * here: lib/market-map-marks.ts records the fill of every mask and the
 * tests refuse a solid one.
 *
 * No filter, no plate, no border: the element has no background of its own;
 * only the ink inside the mask paints.
 *
 * On /credits, which credits the file itself, the ink layer is the
 * registered <img> of that file (its registry alt, intrinsic width and
 * height, fetched and decoded like any credited image). It is drawn the
 * same way: its ink fill shows through the mask of its own file, and its
 * own pixels are set outside its box, so they never paint.
 */
/* eslint-disable @next/next/no-img-element -- static export serves plain images */
import type { CSSProperties } from 'react';
import type { MarkGeometry, MarkInk } from '@/lib/market-map-marks';
import { cx } from '@/lib/utils';

/** The one ink every company mark takes: the secondary ink token. */
export const LOGO_INK_CLASS = 'bg-text-dim';

/** Where the mask file sits in the element: the whole file stretched to the box, or a crop. */
export type MaskCrop = { size: string; position: string };

const FULL_FILE: MaskCrop = { size: '100% 100%', position: '0 0' };

/**
 * The crop that fills an element sized to the artwork box with that box of
 * the file: the mask is scaled up by file / box and positioned so the
 * box's left and top margins fall outside. Percent positions are resolved
 * against (element - mask), so the crop holds at any rendered width.
 */
export function artworkCrop({ box, image }: MarkGeometry): MaskCrop {
  const scaleX = image.width / box.width;
  const scaleY = image.height / box.height;
  const at = (offset: number, scale: number) =>
    scale > 1.0001 ? (((-offset / (scale - 1)) * 100).toFixed(3) + '%') : '0%';
  return {
    size: `${(scaleX * 100).toFixed(3)}% ${(scaleY * 100).toFixed(3)}%`,
    position: `${at(image.left / box.width, scaleX)} ${at(image.top / box.height, scaleY)}`,
  };
}

/**
 * The CSS mask that draws a mark file as ink, stretched to its box. Most
 * marks use their alpha. A mark recorded in LUMINANCE_MASKS
 * (lib/market-map-marks.ts) uses its colours instead: `light` inks the
 * light parts (luminance x alpha); `dark` inks the dark parts and cuts the
 * white ones out (the file's alpha less its luminance mask).
 */
export function logoMaskStyle(
  file: string,
  ink: MarkInk = 'alpha',
  crop: MaskCrop = FULL_FILE,
): CSSProperties {
  const image = `url("${file}")`;
  // The prefixed longhands come first so the standard ones win where both
  // are understood; older WebKit reads only the prefixed alpha mask.
  const fill = {
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskSize: crop.size,
    WebkitMaskPosition: crop.position,
    maskRepeat: 'no-repeat',
    maskSize: crop.size,
    maskPosition: crop.position,
  } as const;
  if (ink === 'dark') {
    return {
      WebkitMaskImage: `${image}, ${image}`,
      WebkitMaskComposite: 'source-out',
      maskImage: `${image}, ${image}`,
      maskMode: 'alpha, luminance',
      maskComposite: 'subtract',
      ...fill,
    };
  }
  return {
    WebkitMaskImage: image,
    maskImage: image,
    maskMode: ink === 'light' ? 'luminance' : 'alpha',
    ...fill,
  };
}

const percent = (part: number, whole: number) => `${((part / whole) * 100).toFixed(3)}%`;

type LogoMarkProps = {
  /** The registered mark file, under /images/logos/. */
  file: string;
  /** The accessible name: "<Company> logo". */
  label: string;
  /** Where the artwork box sits (lib/market-map-marks.ts markGeometry). */
  geometry: MarkGeometry;
  /** How the file becomes the mask (lib/market-map-marks.ts markInk). */
  ink?: MarkInk;
  className?: string;
  /** Data attributes for the outer element (data-company-logo and the like). */
  data?: Record<`data-${string}`, string>;
  /**
   * The registered image the mark draws, on /credits: the ink layer is then
   * that <img>, named by its alt and declaring its intrinsic size, instead
   * of an unnamed layer under a named box.
   */
  registered?: { width: number; height: number };
};

/**
 * One mark: an element sized to the mark's artwork box (never wider than
 * its line; on a narrow tile it scales down whole), holding the ink layer
 * placed so the artwork box fills it. Only fully transparent margin falls
 * outside and is clipped, so no artwork is cut.
 */
export function LogoMark({ file, label, geometry, ink = 'alpha', className, data, registered }: LogoMarkProps) {
  const { box, image } = geometry;
  const outer = {
    ...data,
    'data-logo-mark': '',
    'data-logo-src': file,
    'data-logo-ink-mode': ink,
    className: cx('relative inline-block shrink-0 overflow-hidden align-middle', className),
    style: {
      width: `min(100%, ${box.width}px)`,
      aspectRatio: `${box.width} / ${box.height}`,
    },
  };
  if (!registered) {
    return (
      <span {...outer} role="img" aria-label={label}>
        <span
          aria-hidden="true"
          data-logo-ink=""
          className={cx('pointer-events-none absolute', LOGO_INK_CLASS)}
          style={{
            left: percent(image.left, box.width),
            top: percent(image.top, box.height),
            width: percent(image.width, box.width),
            height: percent(image.height, box.height),
            ...logoMaskStyle(file, ink),
          }}
        />
      </span>
    );
  }
  // The registered file as the ink layer, named by its alt (the box around
  // it is not named again). It fills the artwork box and the mask crops the
  // file to it, so the element never reaches past the box; object-position
  // sets the file's own pixels outside the element, which clips them, so
  // only the ink paints.
  return (
    <span {...outer}>
      <img
        src={file}
        alt={label}
        width={registered.width}
        height={registered.height}
        loading="lazy"
        decoding="async"
        data-logo-ink=""
        className={cx(
          'pointer-events-none absolute inset-0 h-full w-full max-w-none object-none',
          LOGO_INK_CLASS,
        )}
        style={{
          objectPosition: '-100000px -100000px',
          ...logoMaskStyle(file, ink, artworkCrop(geometry)),
        }}
      />
    </span>
  );
}
