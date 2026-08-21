'use client';

/* eslint-disable @next/next/no-img-element -- static export serves plain images */

import { useState } from 'react';
import { getCompanyLogo } from '@/data/logos';
import type { Company } from '@/data/schemas/company.ts';
import { companyInitials } from '@/lib/market-map';
import { cx } from '@/lib/utils';

type CompanyLogoProps = {
  company: Company;
  size?: 'sm' | 'md';
  className?: string;
};

/**
 * Licensed company mark, or two-letter initials when the registry has
 * no logo (or the file fails to load). The image is decorative: the
 * company name sits next to it on every surface that uses this mark.
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
  const box =
    size === 'sm'
      ? 'h-6 w-6 text-[10px]'
      : 'h-9 w-9 text-[11px]';

  if (showImage && image) {
    return (
      <span
        data-company-logo={company.id}
        data-logo-state="image"
        className={cx(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xs bg-surface-2',
          box,
          className,
        )}
      >
        <img
          src={image.file}
          alt=""
          width={image.width}
          height={image.height}
          onError={() => setFailedSrc(image.file)}
          className="max-h-full max-w-full object-contain"
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
