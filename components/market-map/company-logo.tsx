'use client';

/* eslint-disable @next/next/no-img-element -- static export serves plain images */

import { useState } from 'react';
import { getCompanyLogo } from '@/data/logos';
import type { Company } from '@/data/schemas/company.ts';
import { LOGO_MARK_CLASS, LOGO_TILE_CLASS } from '@/components/ui/logo-tile';
import { companyShortName } from '@/lib/market-map';
import {
  MARK_PLACEMENT,
  markGeometry,
  withheldMark,
  type MarkPreset,
} from '@/lib/market-map-marks';
import { cx } from '@/lib/utils';

type CompanyLogoProps = {
  company: Company;
  /** tile: the map; sheet: the detail view. */
  preset?: MarkPreset;
  /**
   * What stands in when no mark can be shown (none registered, withheld,
   * or the file failed to load): the company's name set as text, or
   * nothing, for places that already print the name beside the mark.
   */
  fallback?: 'text' | 'none';
  className?: string;
};

/**
 * A company's official mark on the shared logo tile (components/ui/logo-tile.ts),
 * the same plate, padding and monochrome threshold the credits page uses.
 * The image carries the alt text "<Company> logo" from the registry name.
 *
 * Placement comes from lib/market-map-marks.ts: the tile is sized to the
 * mark's artwork (not its file box, so a padded file no longer draws small)
 * and every mark gets about the same area within a legible height range.
 * A withheld mark (a registered file that shows another company's artwork)
 * is never drawn: the name stands in as text, or nothing where the name is
 * already beside it. So does a file that fails to load. Failure is keyed to
 * the image path so a reused instance retries when the company changes.
 */
export function CompanyLogo({
  company,
  preset = 'tile',
  fallback = 'text',
  className,
}: CompanyLogoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const withheld = withheldMark(company.logo);
  const image = company.logo && !withheld ? getCompanyLogo(company.logo) : undefined;

  if (image && failedSrc !== image.file) {
    const { tile, image: art } = markGeometry(image, MARK_PLACEMENT[company.logo!], preset);
    // Sized in pixels, but never wider than its line: on a narrow phone
    // tile the plate scales down whole, the image placed in percentages of
    // it, so the artwork box stays exactly on the plate.
    const percent = (part: number, whole: number) => `${((part / whole) * 100).toFixed(3)}%`;
    return (
      <span
        data-company-logo={company.id}
        data-logo-state="image"
        data-logo-tile=""
        data-brand-surface-id="surface:flat"
        className={cx(LOGO_TILE_CLASS, 'relative', className)}
        style={{
          width: `min(100%, ${tile.width}px)`,
          aspectRatio: `${tile.width} / ${tile.height}`,
        }}
      >
        <img
          src={image.file}
          alt={`${company.name} logo`}
          width={image.width}
          height={image.height}
          loading={preset === 'sheet' ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailedSrc(image.file)}
          className={cx(LOGO_MARK_CLASS, 'pointer-events-none absolute')}
          style={{
            left: percent(art.left, tile.width),
            top: percent(art.top, tile.height),
            width: percent(art.width, tile.width),
            height: percent(art.height, tile.height),
            maxWidth: 'none',
            maxHeight: 'none',
          }}
        />
      </span>
    );
  }

  const reason = withheld ? 'withheld' : company.logo ? 'failed' : 'missing';
  if (fallback === 'none') {
    return (
      <span
        data-company-logo={company.id}
        data-logo-state="none"
        data-logo-reason={reason}
        aria-hidden="true"
        className="hidden"
      />
    );
  }
  // Our own text, so it keeps the page's surface rather than the plate,
  // and it stays out of the accessibility tree: the name is announced by
  // the control or heading the mark belongs to.
  return (
    <span
      data-company-logo={company.id}
      data-logo-state="text"
      data-logo-reason={reason}
      aria-hidden="true"
      className={cx(
        'inline-block max-w-full truncate font-display text-[13px] leading-5 font-semibold tracking-[-0.01em] text-text',
        className,
      )}
    >
      {companyShortName(company.name)}
    </span>
  );
}
