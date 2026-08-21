import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import { IMAGES } from '@/data/images';
import { LOGO_IMAGES } from '@/data/logo-images';
import { companyLogoIds, getCompanyLogo } from '@/data/logos';

/**
 * The market-map client reads data/logos.ts, not data/images.ts. These
 * checks keep the slim lookup honest against the full registry and keep
 * every company.logo pointed at a real mark.
 */

const repoRoot = join(import.meta.dirname, '../..');

describe('market-map logo lookup', () => {
  it('stays in lockstep with logo-images.ts and IMAGES', () => {
    const slimIds = companyLogoIds().sort();
    const logoIds = LOGO_IMAGES.map((image) => image.id).sort();
    const imageLogoIds = IMAGES.filter((image) =>
      image.file.startsWith('/images/logos/'),
    )
      .map((image) => image.id)
      .sort();
    expect(slimIds).toEqual(logoIds);
    expect(slimIds).toEqual(imageLogoIds);

    for (const image of LOGO_IMAGES) {
      expect(getCompanyLogo(image.id)).toEqual({
        file: image.file,
        width: image.width,
        height: image.height,
      });
    }
  });

  it('covers every company.logo and nothing else', () => {
    const used = [
      ...new Set(
        COMPANIES.map((company) => company.logo).filter(
          (id): id is string => id !== null,
        ),
      ),
    ].sort();
    expect(companyLogoIds().sort()).toEqual(used);
  });

  it('registers an official mark for every company, including previously skipped rows', () => {
    const ids = new Set(companyLogoIds());
    expect(ids.has('boston-dynamics-logo')).toBe(true);
    expect(ids.has('applied-intuition-logo')).toBe(true);
    expect(ids.has('symbotic-logo')).toBe(true);
    const boston = COMPANIES.find((company) => company.id === 'boston-dynamics');
    const applied = COMPANIES.find(
      (company) => company.id === 'applied-intuition',
    );
    const symbotic = COMPANIES.find((company) => company.id === 'symbotic');
    expect(boston?.logo).toBe('boston-dynamics-logo');
    expect(applied?.logo).toBe('applied-intuition-logo');
    expect(symbotic?.logo).toBe('symbotic-logo');
    expect(COMPANIES.every((company) => company.logo !== null)).toBe(true);
    expect(companyLogoIds()).toHaveLength(111);
  });

  it('keeps CompanyLogo off the full image registry', () => {
    const source = readFileSync(
      join(repoRoot, 'components/market-map/company-logo.tsx'),
      'utf8',
    );
    expect(source).toMatch(/from '@\/data\/logos'/);
    expect(source).not.toMatch(/from '@\/data\/images'/);
  });
});
