import { readFileSync } from 'node:fs';
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
] as const;

// Test-only history accounting, never active plans or production evidence.
export function preservedLegacySurvivors(
  prior: CompoundPlan[], current: CompoundPlan[],
  typed: LocalPlan[] = JSON.parse(read('audit/local-basis.json').toString()).plans,
  readArchive: (path: string) => Buffer = read,
): void {
  const reward = readArchive('audit/evidence/reward-local-20260923/legacy-plans.json');
  const parallel = readArchive('audit/evidence/parallel-local-20260923/legacy-plan-original.json');
  expect(sha256(reward)).toBe('b5d20a803d872b14c92e1bd44ce2d14885fe36d48c74a649b277f2286973814a');
  expect(sha256(parallel)).toBe('e4a42725a49573c0f63aa61f4380d1b482dfc1379769d2401611a67aa64588ae');
  const archived: CompoundPlan[] = [...JSON.parse(reward.toString()), JSON.parse(parallel.toString())];
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
  expect(current.filter(p => priorIds.has(p.id))).toEqual(prior.filter(p => !migratedIds.has(p.id)));
}

export function planPacket<T extends { id: string }>(plans: T[], ids: readonly string[]): T[] {
  const selected = plans.filter(p => ids.includes(p.id));
  expect(selected.map(p => p.id)).toEqual(ids);
  const start = plans.findIndex(p => p.id === ids[0]);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(plans.slice(start, start + ids.length)).toEqual(selected);
  return selected;
}
