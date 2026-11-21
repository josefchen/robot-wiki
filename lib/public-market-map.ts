/**
 * The public companies market map's data and text, computed on the server
 * (app/market-map/public/page.tsx) and handed to the client component
 * (components/public-companies/public-market-map.tsx) as plain props. The
 * layout and the width-dependent sentences are in
 * lib/public-market-map-layout.ts, which the client imports.
 *
 * One tile per company the module sizes (lib/public-companies.ts isSized),
 * its area in proportion to market value in US dollars at the page's rates
 * (lib/public-companies-page.ts PAGE_RATES, from data/fx-rates.ts). The
 * companies the module does not size are listed under the map at their
 * full value, not to scale.
 *
 * Tested in tests/unit/public-market-map.test.ts.
 */
import {
  FX_RATES_DATE,
  FX_RATES_SOURCE_URL,
  TWD_RATE_DATE,
  TWD_RATE_SOURCE_URL,
} from '@/data/fx-rates.ts';
import { getCompanyLogo } from '@/data/logos.ts';
import { PUBLIC_COMPANIES, type PublicCompany, type PublicSegment } from '@/data/public-companies.ts';
import { formatLongDate } from '@/lib/dates.ts';
import { companyShortName } from '@/lib/market-map.ts';
import { MARK_PLACEMENT, markGeometry } from '@/lib/market-map-marks.ts';
import { publicMapLogoId } from '@/lib/public-market-map-logos.ts';
import {
  PUBLIC_SEGMENT_LABELS,
  isSized,
  marketValueSourceLine,
  toUsd,
  type EurReferenceRates,
} from '@/lib/public-companies.ts';
import { PAGE_RATES, formatMoney } from '@/lib/public-companies-page.ts';
import {
  count,
  sumUsd,
  type MapCompany,
  type MapMark,
  type MapSegmentTotal,
  type MethodPart,
  type PublicMarketMapData,
  type PublicMarketMapText,
} from '@/lib/public-market-map-layout.ts';

export * from '@/lib/public-market-map-layout.ts';

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

/**
 * Marks with white artwork on a transparent ground: drawn on white, that
 * part vanishes, so they sit on an ink ground and keep their own colours.
 * Measured on 15 November 2026 over all 95 marks this figure can draw, each
 * file drawn 400 px on its long side: the share of its artwork that is
 * near white (luminance over 0.8) and joined to the transparent ground
 * through white. These 22 measure 0.59 or more (Symbotic, white lettering
 * beside a green emblem, 0.60) and none has artwork darker than luminance
 * 0.05, so the whole mark shows on ink. Every other mark measures 0.004 or
 * less: its white, if any, is enclosed by colour (Globus Medical's globe,
 * Rainbow Robotics' letters in a red square), so it shows whole on white.
 * tests/unit/public-market-map.test.ts measures the raster files again.
 */
export const LIGHT_MARKS: ReadonlySet<string> = new Set([
  'amicro-logo',
  'clobot-logo',
  'draganfly-logo',
  'exail-logo',
  'exyn-logo',
  'hesai-logo',
  'johnson-and-johnson-logo',
  'knightscope-logo',
  'laifual-logo',
  'microbot-medical-logo',
  'microport-medbot-logo',
  'neuromeka-logo',
  'parrot-logo',
  'seer-robotics-logo',
  'swarmer-logo',
  'symbotic-logo',
  'teradyne-logo',
  'ubtech-logo',
  'uisee-logo',
  'unusual-machines-logo',
  'xpeng-logo',
  'xtend-logo',
]);

function byValue(a: MapCompany, b: MapCompany): number {
  return b.usd - a.usd || a.name.localeCompare(b.name);
}

/** The company's mark at both sizes the figure draws, or null when none is registered or it is withheld. */
export function mapMark(name: string): MapMark | null {
  const logo = publicMapLogoId(name);
  const asset = logo ? getCompanyLogo(logo) : undefined;
  if (!logo || !asset) return null;
  const placement = MARK_PLACEMENT[logo];
  return {
    logo,
    file: asset.file,
    ground: LIGHT_MARKS.has(logo) ? 'ink' : 'white',
    geometry: { tile: markGeometry(asset, placement, 'tile'), detail: markGeometry(asset, placement, 'sheet') },
  };
}

export function publicMarketMapData(
  rates: EurReferenceRates = PAGE_RATES,
  companies: readonly PublicCompany[] = PUBLIC_COMPANIES,
): PublicMarketMapData {
  const rows = companies.map((company): MapCompany => {
    const usd = toUsd(company.marketCap, company.currency, rates);
    return {
      id: company.id,
      name: company.name,
      shortName: companyShortName(company.name),
      segment: company.segment,
      exposure: company.exposure,
      usd,
      valueText: formatMoney(usd, 'USD'),
      mark: mapMark(company.name),
    };
  });
  const sizedIds = new Set(companies.filter(isSized).map((company) => company.id));
  const sized = rows.filter((row) => sizedIds.has(row.id)).sort(byValue);
  const outOfScale = rows.filter((row) => !sizedIds.has(row.id)).sort(byValue);
  const totals = new Map<PublicSegment, MapSegmentTotal>();
  for (const row of sized) {
    const total = totals.get(row.segment) ?? {
      segment: row.segment,
      label: PUBLIC_SEGMENT_LABELS[row.segment],
      usd: 0,
      totalText: '',
      companies: 0,
    };
    total.usd += row.usd;
    total.companies += 1;
    totals.set(row.segment, total);
  }
  const segments = [...totals.values()]
    .map((total) => ({ ...total, totalText: formatMoney(total.usd, 'USD') }))
    .sort((a, b) => b.usd - a.usd || a.label.localeCompare(b.label));
  return { sized, outOfScale, segments };
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

export function largestPurePlay(data: PublicMarketMapData): MapCompany | null {
  return data.sized.find((row) => row.exposure === 'pure play') ?? null;
}

/** The figure's headline: the largest segment and the largest pure play. */
export function mapHeadline(data: PublicMarketMapData): string {
  const segment = data.segments[0];
  if (!segment) return 'No companies to size by market value.';
  const pure = largestPurePlay(data);
  const parts = [`Largest segment: ${segment.label}, ${segment.totalText}.`];
  if (pure) parts.push(`Largest pure play: ${pure.name}, ${pure.valueText}.`);
  return parts.join(' ');
}

/** The caption sentence: what the tiles, the colours and the outlined row mean. */
export function mapCaption(data: PublicMarketMapData): string {
  if (data.sized.length === 0) {
    return data.outOfScale.length
      ? 'Robotics is a minor part of every company in this group. Their market values appear in the listed companies table.'
      : 'No listed companies are available for this edition.';
  }
  const sized = count(data.sized.length, 'company', 'companies');
  const key = `Tile area shows market value in US dollars for ${sized}. Blue marks pure plays, grey major robotics businesses.`;
  if (!data.outOfScale.length) return key;
  return `${key} ${count(data.outOfScale.length, 'outlined company is', 'outlined companies are')} unscaled.`;
}

/** The chart's text description; lib/chart-descriptions.ts holds the same text. */
export function mapDescription(data: PublicMarketMapData): string {
  const segment = data.segments[0];
  if (!segment) return mapCaption(data);
  const pure = largestPurePlay(data);
  return (
    `${count(data.sized.length, 'listed robotics company', 'listed robotics companies')} in ` +
    `${data.segments.length} segments, sized by market value in US dollars, ${formatMoney(sumUsd(data.sized), 'USD')} ` +
    `together. ${segment.label} is the largest segment at ${segment.totalText}` +
    (pure ? `, and ${pure.name} the largest pure play at ${pure.valueText}` : '') +
    `. The ${count(data.outOfScale.length, 'company', 'companies')} where robots are a minor part are listed under the map ` +
    'at full value, not to scale.'
  );
}

/** The conversion sentence, with both rate sources linked and dated from data/fx-rates.ts. */
export function conversionParts(): MethodPart[] {
  return [
    'Each market value is converted from its listing currency to US dollars at the ',
    { text: 'European Central Bank’s euro reference rates', href: FX_RATES_SOURCE_URL },
    ` of ${formatLongDate(FX_RATES_DATE)}; Taiwan dollars, which the ECB does not publish, at the `,
    { text: 'Federal Reserve’s H.10 rate', href: TWD_RATE_SOURCE_URL },
    ` of ${formatLongDate(TWD_RATE_DATE)}.`,
  ];
}

/** The fold paragraph before the label sentence: what a tile's area means. */
export function sharesParagraph(data: PublicMarketMapData): string {
  if (!data.segments.length) return '';
  return (
    `Each tile’s area is its share of the ${formatMoney(sumUsd(data.sized), 'USD')} the ` +
    `${data.sized.length} sized companies are worth, and a segment’s total is the sum of its tiles. ` +
    'Segments are ordered by total, largest top left.'
  );
}

/** The fold paragraph after the label sentence: the row under the map. */
export function outOfScaleParagraph(data: PublicMarketMapData): string {
  if (!data.outOfScale.length) return '';
  return (
    `The ${data.outOfScale.length} companies where robots are a minor part are listed but not sized, because most ` +
    'of their value is other businesses.'
  );
}

export function sourceLine(): string {
  return `${marketValueSourceLine()} Each company’s quote page is linked in the table below.`;
}

/** Every sentence the figure prints that does not depend on its width, for the client component. */
export function publicMarketMapText(data: PublicMarketMapData): PublicMarketMapText {
  return {
    headline: mapHeadline(data),
    caption: mapCaption(data),
    description: mapDescription(data),
    conversion: conversionParts(),
    shares: sharesParagraph(data),
    outOfScale: outOfScaleParagraph(data),
    source: sourceLine(),
  };
}
