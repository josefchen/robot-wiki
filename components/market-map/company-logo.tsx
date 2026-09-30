'use client';

/* eslint-disable @next/next/no-img-element -- static export serves plain images */

import { useState } from 'react';
import { getCompanyLogo } from '@/data/logos';
import type { Company } from '@/data/schemas/company.ts';
import { LOGO_MARK_CLASS, LOGO_TILE_CLASS } from '@/components/ui/logo-tile';
import { companyInitials } from '@/lib/market-map';
import { cx } from '@/lib/utils';

type CompanyLogoProps = {
  company: Company;
  size?: 'sm' | 'md';
  className?: string;
};

/**
 * Company mark, or two-letter initials when the registry has no logo
 * (or the file fails to load). The image is decorative: the company
 * name sits next to it on every surface that uses this mark.
 *
 * Every mark sits on the shared logo tile (components/ui/logo-tile.ts), the
 * same tile the credits page uses. Applied to all of them rather than to
 * the ones that happen to be pale, so it reads as the frame the marks live
 * in. The initials fallback keeps the page's own surface instead: it
 * renders our text rather than someone's artwork, and that text is legible
 * at full contrast without a plate.
 *
 * Failure is keyed to the image path so a reused instance (BubbleDetail)
 * retries when the selected company or logo changes.
 */
export function CompanyLogo({
  company,
  size = 'md',
  className,
}: CompanyLogoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const image = company.logo ? getCompanyLogo(company.logo) : undefined;
  const showImage = Boolean(image) && failedSrc !== image?.file;
  // Wordmark-shaped rather than square: most marks are wordmarks up to 12
  // times wider than tall, and a square tile drew them 2 to 7 px high. The
  // fixed width keeps the company names beside it in one column.
  const box =
    size === 'sm'
      ? 'h-6 w-16 text-[10px]'
      : 'h-9 w-24 text-[11px]';

  if (showImage && image) {
    return (
      <span
        data-company-logo={company.id}
        data-logo-state="image"
        data-logo-tile=""
        data-brand-surface-id="surface:flat"
        className={cx(LOGO_TILE_CLASS, box, className)}
      >
        <img
          src={image.file}
          alt=""
          width={image.width}
          height={image.height}
          onError={() => setFailedSrc(image.file)}
          className={LOGO_MARK_CLASS}
        />
      </span>
    );
  }

  return (
    <span
      data-company-logo={company.id}
      data-logo-state="initials"
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-xs bg-surface-2 font-mono font-medium text-text-dim',
        box,
        className,
      )}
    >
      {companyInitials(company.name)}
    </span>
  );
}
