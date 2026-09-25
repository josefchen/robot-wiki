import { readFileSync } from 'node:fs';
import { showAt } from '../unit/helpers/continuation-merge-ledger';
import { resolve } from 'node:path';
import { expect } from 'vitest';
import { sha256 } from '../../lib/brand-v2-baseline';
import type { CompoundPlan } from '../../lib/audit-ledger';
import type { LocalPlan } from '../../lib/audit-local-basis';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path));
const migrations = [
  ['reward-design-mpc-original-4-20260916', 'reward-local-r4-20260923'],
  ['reward-design-mpc-original-5-20260916', 'reward-local-r5-20260923'],
  ['reward-design-mpc-original-11-20260916', 'reward-local-r11-20260923'],
  ['parallel-sim-rl-18-training-time-chart-20260916k', 'parallel-local-p18-20260923'],
  ['performance-worldmodels-taxonomy-4-20260908', 'crossdomain-taxonomy4-20260923'],
  ['safety-remainder-20260916-safety-and-assurance-5', 'final-seven-frontier-safety-and-assurance-5-20260923'],
  ['safety-remainder-20260916-safety-and-assurance-6', 'final-seven-frontier-safety-and-assurance-6-20260923'],
  ['legged-locomotion-8-duty-factor-disclaimer-20260916i', 'final-seven-rl-sim2real-legged-locomotion-8-20260923'],
  ['data-bottleneck-3-scale-correction-draft-20260922', 'final-seven-data-hardware-data-bottleneck-3-20260923'],
  ['data-bottleneck-5-scale-correction-draft-20260922', 'final-seven-data-hardware-data-bottleneck-5-20260923'],
] as const;

// Test-only history accounting, never active plans or production evidence.
export function preservedLegacySurvivors(
  prior: CompoundPlan[], current: CompoundPlan[],
  typed: LocalPlan[] = JSON.parse(read('audit/local-basis.json').toString()).plans,
  readArchive: (path: string) => Buffer = read,
): void {
  const reward = readArchive('audit/evidence/reward-local-20260923/legacy-plans.json');
  const parallel = readArchive('audit/evidence/parallel-local-20260923/legacy-plan-original.json');
  expect(sha256(reward)).toBe('961745b3686a518be091a619d101f406e63ddf1ee2ca076f358635c55a06375f');
  expect(sha256(parallel)).toBe('e4a42725a49573c0f63aa61f4380d1b482dfc1379769d2401611a67aa64588ae');
  const taxonomy = readArchive('audit/evidence/crossdomain-closure-20260923/superseded-plans.json');
  const final = readArchive('audit/evidence/final-seven-closure-20260923/superseded-compound-plans.json');
  expect(sha256(taxonomy)).toBe('141956da513664714f6d0599240a94e49ba3a07eff8baf2d60a0292895679568');
  expect(sha256(final)).toBe('886765a0a256fb6e2805bd88a8ac71bf7eb7a9c463b2d0f36cf959a98ec5aa89');
  const archived: CompoundPlan[] = [...JSON.parse(reward.toString()), JSON.parse(parallel.toString()),
    ...JSON.parse(taxonomy.toString()), ...JSON.parse(final.toString())];
  expect(archived.map(p => p.id)).toEqual(migrations.map(([id]) => id));
  for (const [id, successor] of migrations) {
    const old = archived.find(p => p.id === id)!;
    expect(current.filter(p => p.id === id), id).toEqual([]);
    const replacements = typed.filter(p => p.id === successor);
    expect(replacements, successor).toHaveLength(1);
    const originalId = `${old.ledgerPath}:${old.articleSlug}:${old.rowOrdinal}`;
    expect(replacements[0].originalId).toBe(originalId);
    expect(typed.filter(p => p.originalId === originalId)).toHaveLength(1);
    for (const previous of prior.filter(p => p.id === id)) expect(previous).toEqual(old);
  }
  const migratedIds = new Set<string>(migrations.map(([id]) => id));
  const priorIds = new Set(prior.map(p => p.id));
  expect(priorIds.size).toBe(prior.length);
  expect(new Set(current.map(p => p.id)).size).toBe(current.length);
  const controlArchive = readArchive('audit/evidence/control-citation-closeout-20260924/prior-plans.json');
  const krogerArchive = readArchive('audit/evidence/citation-closeout-20260924/before-kroger-plans.json');
  expect(sha256(controlArchive)).toBe('69e53e0baa44bb2a4a3e714a27223ca7d62962575ed07c10afdb398eb76da1e4');
  expect(sha256(krogerArchive)).toBe('8db5abfc5d52675df6fb4a441f647c673768151bc63a460dd0c8f0fbf28fc7b5');
  const controlSuperseded: CompoundPlan[] = JSON.parse(controlArchive.toString());
  const oldKroger: CompoundPlan[] = JSON.parse(krogerArchive.toString());
  const withdrawnControlIds = new Set([
    'control-1-astrom-20260916f',
    'control-2-astrom-20260916f',
    'control-3-astrom-20260916f',
  ]);
  const krogerIds = new Set(oldKroger.map(p => p.id));
  const c7Id = 'control-c7-lqr-riccati-20260915';
  expect(controlSuperseded.map(p => p.id)).toEqual([...withdrawnControlIds, c7Id]);
  expect(oldKroger.map(p => p.id)).toEqual([
    'industrial-kroger-closures-20260917a',
    'industrial-kroger-compensation-20260917a',
  ]);
  for (const id of withdrawnControlIds) {
    const archivedPlan = controlSuperseded.find(p => p.id === id)!;
    expect(current.filter(p => p.id === id), id).toEqual([]);
    for (const previous of prior.filter(p => p.id === id)) expect(previous).toEqual(archivedPlan);
  }
  const robomindId = 'datasets-10-robomind-20260916c';
  const hoursCheckpoint: CompoundPlan[] = JSON.parse(showAt(
    'f2cae9e5983a2e4f686adec4f37c3b26e4b67e74', 'audit/compound-evidence.json'));
  const hours = hoursCheckpoint.find(p => p.id === robomindId)!;
  const history = JSON.parse(read('audit/data-hardware.md').toString()
    .split('## RoboMIND hours correction: preserved prior complete state (2026-09-23)')[1]
    .split('```json\n')[1].split('\n```')[0]);
  const survivors = prior.filter(p => !migratedIds.has(p.id) && !withdrawnControlIds.has(p.id)).map(plan => {
    const now = current.find(p => p.id === plan.id);
    if (plan.id === c7Id || krogerIds.has(plan.id)) {
      if (JSON.stringify(plan) === JSON.stringify(now)) return plan;
      const archivedPlan = plan.id === c7Id
        ? controlSuperseded.find(p => p.id === plan.id)
        : oldKroger.find(p => p.id === plan.id);
      expect(plan).toEqual(archivedPlan);
      expect(now, plan.id).toBeDefined();
      return now!;
    }
    if (plan.id !== robomindId || JSON.stringify(plan) === JSON.stringify(hours)) return plan;
    expect(plan).toEqual(history.compoundPlan);
    expect(current.find(p => p.id === robomindId)).toEqual(hours);
    return hours;
  });
  // The 2026-09-24 Technology.org withdrawal superseded twelve compound plans;
  // they are preserved verbatim in the withdrawal evidence and must not appear
  // in the current catalog. Their successors are pinned by the withdrawal's
  // own unit tests against the same twelve row targets.
  const withdrawalArchive = readArchive(
    'audit/evidence/technology-withdrawal-20260924/prior-plans.json');
  const withdrawn = (JSON.parse(withdrawalArchive.toString()) as { plans: CompoundPlan[] }).plans;
  const withdrawnIds = new Set(withdrawn.map(p => p.id));
  expect(withdrawnIds.size).toBe(12);
  for (const old of withdrawn) {
    expect(current.filter(p => p.id === old.id), old.id).toEqual([]);
  }
  expect(current.filter(p => priorIds.has(p.id)))
    .toEqual(survivors.filter(p => !withdrawnIds.has(p.id)));
}

export function planPacket<T extends { id: string }>(plans: T[], ids: readonly string[]): T[] {
  const selected = plans.filter(p => ids.includes(p.id));
  expect(selected.map(p => p.id)).toEqual(ids);
  const start = plans.findIndex(p => p.id === ids[0]);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(plans.slice(start, start + ids.length)).toEqual(selected);
  return selected;
}
