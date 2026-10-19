'use client';

import { useEffect, useState } from 'react';
import { getCompanyLogo } from '@/data/logos';
import type { Company } from '@/data/schemas/company.ts';
import { LogoMark } from '@/components/ui/logo-mark';
import { companyShortName } from '@/lib/market-map';
import {
  MARK_PLACEMENT,
  markGeometry,
  markInk,
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
 * A company's official mark, drawn plate-less in the one secondary ink
 * (components/ui/logo-mark.tsx), the same treatment the credits page uses.
 * It is named "<Company> logo" from the registry name.
 *
 * Placement comes from lib/market-map-marks.ts: the mark is sized to its
 * artwork (not its file box, so a padded file no longer draws small) and
 * every mark gets about the same visual weight within a legible height
 * range. A withheld mark (a registered file that shows another company's
 * artwork) is never drawn: the name stands in as text, or nothing where the
 * name is already beside it. So does a file that fails to load: the mask
 * would paint nothing, so a probe reports the failure. Failure is keyed to
 * the file path so a reused instance retries when the company changes.
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
  const file = image?.file ?? null;

  useEffect(() => {
    if (!file) return;
    let live = true;
    const probe = new Image();
    probe.onerror = () => {
      if (live) setFailedSrc(file);
    };
    probe.src = file;
    return () => {
      live = false;
      probe.onerror = null;
    };
  }, [file]);

  if (image && failedSrc !== image.file) {
    return (
      <LogoMark
        file={image.file}
        label={`${company.name} logo`}
        geometry={markGeometry(image, MARK_PLACEMENT[company.logo!], preset)}
        ink={markInk(company.logo)}
        className={className}
        data={{ 'data-company-logo': company.id, 'data-logo-state': 'image' }}
      />
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
  // Our own text, in the page's ink, and it stays out of the accessibility
  // tree: the name is announced by the control or heading the mark belongs to.
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
