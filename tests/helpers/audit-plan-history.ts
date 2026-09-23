import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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
  const robomindId = 'datasets-10-robomind-20260916c';
  const hoursCheckpoint: CompoundPlan[] = JSON.parse(execFileSync('git', [
    'show', 'f2cae9e5983a2e4f686adec4f37c3b26e4b67e74:audit/compound-evidence.json',
  ], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
  const hours = hoursCheckpoint.find(p => p.id === robomindId)!;
  const history = JSON.parse(read('audit/data-hardware.md').toString()
    .split('## RoboMIND hours correction: preserved prior complete state (2026-09-23)')[1]
    .split('```json\n')[1].split('\n```')[0]);
  const survivors = prior.filter(p => !migratedIds.has(p.id)).map(plan => {
    if (plan.id !== robomindId || JSON.stringify(plan) === JSON.stringify(hours)) return plan;
    expect(plan).toEqual(history.compoundPlan);
    expect(current.find(p => p.id === robomindId)).toEqual(hours);
    return hours;
  });
  expect(current.filter(p => priorIds.has(p.id))).toEqual(survivors);
}

export function planPacket<T extends { id: string }>(plans: T[], ids: readonly string[]): T[] {
  const selected = plans.filter(p => ids.includes(p.id));
  expect(selected.map(p => p.id)).toEqual(ids);
  const start = plans.findIndex(p => p.id === ids[0]);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(plans.slice(start, start + ids.length)).toEqual(selected);
  return selected;
}
