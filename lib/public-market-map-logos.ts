/**
 * Which company marks the public companies map can draw: the one rule
 * lib/public-market-map.ts and the content validator both read, so every
 * mark the map can draw is credited on /credits and nothing else is.
 *
 * A listed company's mark is the one the name lookup finds
 * (data/company-logos.ts), registered in the slim lookup (data/logos.ts)
 * and not withheld (lib/market-map-marks.ts). Every listed company is drawn,
 * in a tile or in the row under the map, so every such mark can be drawn at
 * some width.
 *
 * Relative imports, so plain node (scripts/validate-content.ts) loads it.
 */
import { logoIdFor } from '../data/company-logos.ts';
import { getCompanyLogo } from '../data/logos.ts';
import { PUBLIC_COMPANIES, type PublicCompany } from '../data/public-companies.ts';
import { withheldMark } from './market-map-marks.ts';

/** The mark the map draws for a company name, or null when none is registered or it is withheld. */
export function publicMapLogoId(name: string): string | null {
  const logo = logoIdFor(name);
  if (!logo || withheldMark(logo) || !getCompanyLogo(logo)) return null;
  return logo;
}

/** Every mark the map can draw, sorted, each once. */
export function publicMapLogoIds(companies: readonly PublicCompany[] = PUBLIC_COMPANIES): string[] {
  const ids = companies.map((company) => publicMapLogoId(company.name)).filter((id): id is string => id !== null);
  return [...new Set(ids)].sort();
}
