import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { METHODS } from '@/data/methods';
import { parseLedger, type CompoundPlan } from '@/lib/audit-ledger';

const read = (path: string) => readFileSync(path, 'utf8');
const selected = [
  ...[2, 3, 4, 5, 6, 7].map(n => `audit/manipulation.md:knowledge-insulation:${n}`),
  ...[9, 10, 13, 14].map(n => `audit/manipulation.md:pi-line:${n}`),
  'audit/manipulation.md:comparison-matrix:10',
  ...[5, 7, 9, 10].map(n => `audit/world-models.md:latent-dynamics:${n}`),
  ...[8, 9].map(n => `audit/world-models.md:taxonomy:${n}`),
];
const plans = JSON.parse(read('audit/compound-evidence.json')) as CompoundPlan[];
const citationIds = new Set(CITATIONS.map(c => c.id));
function row(id: string, compoundPlans = plans) {
  const [path, slug, ordinal] = id.split(':');
  // Plans only bind rows in their own ledger, so scope the context before
  // parsing — re-validating the whole catalog per call makes this test
  // exceed its timeout as the merged catalog grows.
  const scoped = compoundPlans.filter(p => p.ledgerPath === path);
  return parseLedger(path, read(path), citationIds, { compoundPlans: scoped })
    .find(section => section.slug === slug)!.claimRecords[Number(ordinal) - 1];
}

describe('insulation FAST and Dreamer fixed original records', () => {
  it.each(selected)('completes the entire source-bound record %s', id => {
    expect(row(id).evidenceFailures).toEqual([]);
  });
  it.each(selected)('rejects omission of every individual required source item for %s', id => {
      const current = row(id);
      expect(current.compound, id).toBeDefined();
      const plan = plans.find(p => p.id === current.compound!.planId)!;
      expect(plan.evidence.length).toBeGreaterThan(0);
      for (let i = 0; i < plan.evidence.length; i++) {
        const changed = plans.map(p => {
          if (p.id !== plan.id) return p;
          const clone = structuredClone(p);
          clone.evidence.splice(i, 1);
          return clone;
        });
        expect(row(id, changed).evidenceFailures.length, `${id}/${i}`).toBeGreaterThan(0);
      }
  });
  it('keeps the exact DROID prediction, execution choices and control setting', () => {
    const fast = METHODS.find(m => m.id === 'pi0-fast')!;
    expect(fast.actionHorizon.planned).toBe(15);
    expect(fast.actionHorizon.executed).toEqual({ choices: [8, 15] });
    expect(fast.controlFrequencyHz).toBe(15);
    expect(fast.controlFrequencyNote).toContain('750 ms');
    expect(fast.weightsNote).toContain('pi0_fast_droid');
    expect(fast.sources).toEqual(['pi0-fast-2025', 'openpi-repo-2024']);
  });
  it('separates training units, hardware latency and specialist task completion', () => {
    const pi = read('content/manipulation/pi-line.mdx');
    expect(pi).toContain('one million one-second action chunks');
    expect(pi).toContain('five times fewer GPU hours');
    expect(pi).toContain('750 ms');
    expect(pi).toContain('task wall-clock time');
    expect(pi).not.toContain('1M real robot trajectories');
    expect(pi).not.toContain('roughly 2x slower to complete tasks');
  });
  it('keeps stopped keys and values, attention leakage and the language co-training exception', () => {
    const ki = read('content/manipulation/knowledge-insulation.mdx');
    expect(ki).toContain('two-stage');
    expect(ki).toContain('keys and values');
    expect(ki).toContain('does not attend to FAST action tokens');
    expect(ki).toContain('without stop-gradient');
    expect(ki).not.toContain('misrepresents every frontier model');
    const note = CITATIONS.find(c => c.id === 'knowledge-insulation-2025')!;
    expect(note.title).toBe('VLAs that Train Fast, Run Fast, and Generalize Better');
    expect(note.authors).toHaveLength(11);
    expect(note.type).toBe('blog');
  });
  it('represents source disagreements without inventing a reconciliation', () => {
    const latent = read('content/world-models/latent-dynamics.mdx');
    expect(latent).toContain('H = 15');
    expect(latent).toContain('same document');
    expect(latent).toContain('T = 16');
    expect(latent).toContain('symlog squared loss');
    expect(latent).toContain('two-hot');
    expect(latent).not.toContain('entire source of the sample efficiency');
    for (const id of ['audit/world-models.md:latent-dynamics:9', 'audit/world-models.md:latent-dynamics:10', 'audit/world-models.md:taxonomy:9']) {
      expect(row(id).verdict).toBe('S');
      expect(row(id).evidenceFailures).toEqual([]);
    }
  });
  it('retains the replay-critic exception and qualified MineRL priority', () => {
    const taxonomy = read('content/world-models/taxonomy.mdx');
    expect(taxonomy).toContain('critic also receives a loss on replay-buffer trajectories');
    expect(taxonomy).toContain('to their knowledge');
    expect(taxonomy).toContain('abstract crafting actions');
    expect(taxonomy).toContain('accelerated block breaking');
    expect(taxonomy).toContain('sparse intermediate rewards');
  });
  it('preserves incomplete P1 and held rows without a fake review-date bump', () => {
    // Later packets completed these records. Comparison original 1 now
    // carries the setup-qualified RT-2/OpenVLA correction, not local proof.
    const comparison = row('audit/manipulation.md:comparison-matrix:1');
    expect(comparison.evidenceFailures).toEqual([]);
    expect(comparison.verdict).toBe('C');
    expect(comparison.compound?.planId).toBeDefined();
    for (const id of ['audit/manipulation.md:knowledge-insulation:10', 'audit/world-models.md:latent-dynamics:17']) {
      expect(row(id).evidenceFailures).toEqual([]);
    }
    expect(row('audit/world-models.md:latent-dynamics:6').evidenceFailures).toEqual([]);
    for (const path of ['manipulation/knowledge-insulation', 'manipulation/pi-line', 'manipulation/comparison-matrix', 'world-models/latent-dynamics', 'world-models/taxonomy']) {
      expect(matter(read(`content/${path}.mdx`)).data.lastReviewed).toBe('2026-08-17');
    }
  });
});
