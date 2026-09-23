import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { buildManifest, type JsonValue } from '../../../lib/brand-v2-baseline.ts';
import { type LocalArtifact, type LocalMember } from '../../../lib/audit-local-basis.ts';

export const DIRECTORY = 'audit/evidence/economics-local-20260923';
export const ARTICLE = 'content/data-hardware/industrial-deployment.mdx';
export const COMPONENT = 'components/interactive/deployment-economics.tsx';
export const UNIT = 'tests/unit/economics-local-evidence.test.ts';
export const BROWSER = 'tests/e2e/economics-local-evidence.spec.ts';
export const ROUTE = '/data-hardware/industrial-deployment/';
export const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
export function artifact(path: string): LocalArtifact {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: sha(bytes) };
}
export function member(path: string, excerpt?: string): LocalMember {
  const bytes = readFileSync(path);
  const selected = excerpt === undefined ? bytes : Buffer.from(excerpt);
  const offset = excerpt === undefined ? 0 : bytes.indexOf(selected);
  if (offset < 0) throw Error(`Absent member ${path}`);
  const id = path === ARTICLE ? `article:${path.slice(8, -4)}` : path === COMPONENT ? `source:${path}` : `file:${path}`;
  const result: LocalMember = { file: artifact(path), id, offset, length: selected.length, sha256: sha(selected) };
  if (path === ARTICLE || path === COMPONENT) {
    const kind = path === ARTICLE ? 'prose' : 'interactive-sources-mounts';
    const value: JsonValue = path === ARTICLE ? { path, body: matter(bytes.toString()).content.trim() } : { path, source: bytes.toString() };
    result.baseline = { kind, hash: buildManifest(kind, [{ id, value }]).members[0].hash };
  }
  return result;
}
export function save(name: string, value: unknown): LocalArtifact {
  const path = `${DIRECTORY}/${name}`;
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  return artifact(path);
}
export function dependencies(browser = false) {
  return [ARTICLE, COMPONENT, 'lib/deployment-economics.ts', 'lib/audit-local-basis.ts',
    `${DIRECTORY}/support.ts`, browser ? BROWSER : UNIT,
    ...(browser ? ['tests/e2e/slider.ts', 'playwright.config.ts', 'package-lock.json', 'lib/utils.ts'] : []),
  ].map(path => member(path));
}
// Independent constants and oracle; imports no production economic calculation.
export const defaults = { robotCost: 80000, integrationMultiple: 2.5, cycleTimeSeconds: 6,
  uptimePercent: 95, successRatePercent: 99.9, jamClearSeconds: 15, wageUsdPerHour: 25 };
export const ranges = {
  robotCost: { min: 20000, max: 250000, step: 5000 },
  integrationMultiple: { min: 1, max: 5, step: 0.1 },
  cycleTimeSeconds: { min: 2, max: 20, step: 0.5 },
  uptimePercent: { min: 80, max: 100, step: 0.5 },
  successRatePercent: { min: 90, max: 99.9, step: 0.1 },
  jamClearSeconds: { min: 5, max: 300, step: 5 },
  wageUsdPerHour: { min: 10, max: 80, step: 1 },
};
export const cases = [
  { id: 'i52-parameters', recipe: { id: 'economics', mode: 'parameters', inputs: {} } },
  ...[20000, 80000, 250000].map(robotCost => ({ id: `i52-${robotCost}`,
    recipe: { id: 'economics' as const, mode: 'derive' as const, inputs: { ...defaults, robotCost } } })),
] as const;
export function oracle(input: typeof defaults) {
  const sanitized = Object.fromEntries(Object.entries(input).map(([k, v]) => {
    const r = ranges[k as keyof typeof ranges];
    return [k, Number.isFinite(v) ? Math.min(r.max, Math.max(r.min, v)) : r.min];
  })) as typeof defaults;
  const x = sanitized;
  // Normalize a complete elapsed hour, rather than multiplying a production result.
  const fractionLostPerPick = (100 - x.successRatePercent) / 100;
  const cycleWithJams = x.cycleTimeSeconds + fractionLostPerPick * x.jamClearSeconds;
  const monthlyPicks = 730 * 36 * x.uptimePercent / cycleWithJams;
  const monthlyLaborValue = monthlyPicks * x.cycleTimeSeconds * x.wageUsdPerHour / 3600;
  const totalCellCost = x.robotCost * x.integrationMultiple;
  const netPicksPerHour = monthlyPicks / 730;
  const jamClearing = netPicksPerHour * fractionLostPerPick * x.jamClearSeconds;
  const productive = netPicksPerHour * x.cycleTimeSeconds;
  const downtime = 36 * (100 - x.uptimePercent);
  const costPerPickUsd = totalCellCost / (monthlyPicks * 60);
  const paybackMonths = totalCellCost / monthlyLaborValue;
  const shares = [productive, jamClearing, downtime].map(v => `${(v / 36).toFixed(1)}%`);
  return { sanitized, totalCellCost, jamRatePercent: 100 - x.successRatePercent,
    effectiveSecondsPerPick: cycleWithJams, netPicksPerHour, monthlyPicks, monthlyLaborValue,
    costPerPickUsd, paybackMonths, timeBreakdown: { productive, jamClearing, downtime },
    paysBack: paybackMonths <= 24, display: [costPerPickUsd.toFixed(3), `${paybackMonths.toFixed(1)} months`], shares,
    summary: `Cell cost $${totalCellCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}; ${netPicksPerHour.toFixed(0)} modeled picks per elapsed hour and ${monthlyPicks.toLocaleString('en-US', { maximumFractionDigits: 0 })} per 730-hour month; jam rate ${(100 - x.successRatePercent).toFixed(2)}%.`,
  };
}
