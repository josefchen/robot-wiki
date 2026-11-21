import { getCompanyLogo } from '../data/logos.ts';
import { markGeometry, MARK_PLACEMENT } from './market-map-marks.ts';
import { IPO_WATCH } from '../data/public-companies.ts';
import { amountUsd, closedRoundsInWindow } from './rounds.ts';
import { publicMapLogoId } from './public-market-map-logos.ts';

// Some wide wordmarks legible on the map shrink below eight pixels in a table.
function tableLogoId(name: string): string | null {
  const id = publicMapLogoId(name);
  const asset = id ? getCompanyLogo(id) : undefined;
  if (!id || !asset) return null;
  const { box } = markGeometry(asset, MARK_PLACEMENT[id], 'table');
  return box.width >= 8 && box.height >= 8 ? id : null;
}

// Use marks in the new-listing register and for the 40 largest closed rounds
// with disclosed amounts. Repeated appearances in the Europe register stay text.
const ranked = closedRoundsInWindow()
  .flatMap((round) => {
    const dollars = amountUsd(round);
    return dollars === null ? [] : [{ round, dollars }];
  })
  .sort((a, b) => b.dollars - a.dollars || a.round.key.localeCompare(b.round.key))
  .slice(0, 40);

const roundMarks = new Map(
  ranked.map(({ round }) => [round.key, tableLogoId(round.company)]),
);

/** Eligible rounds are identified by their financing, not just the issuer's name. */
export function fundingTableLogoId(key: string): string | null {
  return roundMarks.get(key) ?? null;
}

/** Every mark the funding table can actually display, once. */
export function fundingTableLogoIds(): string[] {
  return [...new Set([...roundMarks.values()].filter((id): id is string => id !== null))].sort();
}

/** A sale shown as context in the IPO table retains its company name alone. */
export function ipoTableLogoId(row: { name: string; status: string }): string | null {
  return row.status === 'not an IPO' ? null : tableLogoId(row.name);
}

export function ipoTableLogoIds(): string[] {
  const ids = IPO_WATCH.map(ipoTableLogoId).filter((id): id is string => id !== null);
  return [...new Set(ids)].sort();
}

export function marketTableLogoIds(): string[] {
  return [...new Set([...fundingTableLogoIds(), ...ipoTableLogoIds()])].sort();
}
