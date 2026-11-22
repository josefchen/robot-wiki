import type { Company } from '@/data/schemas/company.ts';
import { tileFact, type TileFact } from '@/lib/market-map';

const moneyUnits = [
  { scale: 1_000_000_000, suffix: 'B' },
  { scale: 1_000_000, suffix: 'M' },
  { scale: 1_000, suffix: 'k' },
];

/** Use a short unit only when it preserves the recorded dollar figure. */
export function formatReportedUsd(value: number): string {
  const unit = moneyUnits.find(({ scale }) => value >= scale);
  if (unit && value % (unit.scale / 1_000) === 0) {
    return `$${value / unit.scale}${unit.suffix}`;
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 20 })}`;
}

export function marketTileFact(company: Company): TileFact {
  const fact = tileFact(company);
  const round = company.latestRound;
  if (fact.kind !== 'round' || round?.amountUsd == null) return fact;

  const reported = formatReportedUsd(round.amountUsd);
  return {
    kind: 'round',
    // The narrow badge can abbreviate a long figure. Its accessible label keeps the full amount.
    text: reported.length <= 8 ? reported : `≈${fact.text}`,
    label: `latest round ${reported}${round.type ? `, ${round.type}` : ''}`,
  };
}
