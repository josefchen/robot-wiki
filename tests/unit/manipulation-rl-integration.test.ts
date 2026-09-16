import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import matter from 'gray-matter';
import { CITATIONS } from '@/data/citations';
import { METHODS } from '@/data/methods';
import { LATENCY_REFERENCES } from '@/lib/control-loop';
import { parseLedger, type CompoundPlan } from '@/lib/audit-ledger';

const read = (path: string) => readFileSync(path, 'utf8');
const selectedIds = [
  "audit/manipulation.md:comparison-matrix:6",
  "audit/manipulation.md:comparison-matrix:11",
  "audit/manipulation.md:comparison-matrix:12",
  "audit/manipulation.md:knowledge-insulation:8",
  "audit/manipulation.md:knowledge-insulation:9",
  "audit/manipulation.md:pi-line:1",
  "audit/manipulation.md:pi-line:2",
  "audit/manipulation.md:pi-line:3",
  "audit/manipulation.md:pi-line:4",
  "audit/manipulation.md:pi-line:5",
  "audit/manipulation.md:pi-line:6",
  "audit/manipulation.md:pi-line:7",
  "audit/manipulation.md:pi-line:8",
  "audit/manipulation.md:pi-line:11",
  "audit/manipulation.md:pi-line:12",
  "audit/manipulation.md:pi-line:15",
  "audit/manipulation.md:pi-line:18",
  "audit/manipulation.md:pi-line:19",
  "audit/manipulation.md:pi-line:20",
  "audit/manipulation.md:pi-line:21",
  "audit/manipulation.md:pi-line:23",
  "audit/manipulation.md:realtime-execution:1",
  "audit/manipulation.md:realtime-execution:2",
  "audit/manipulation.md:realtime-execution:9",
  "audit/manipulation.md:realtime-execution:10",
  "audit/manipulation.md:realtime-execution:11",
  "audit/manipulation.md:realtime-execution:12",
  "audit/manipulation.md:realtime-execution:13",
  "audit/manipulation.md:realtime-execution:14",
  "audit/rl-sim2real.md:rl-for-robotics:9",
  "audit/rl-sim2real.md:rl-for-robotics:12",
  "audit/rl-sim2real.md:rl-for-robotics:13",
  "audit/rl-sim2real.md:rl-for-robotics:14",
  "audit/rl-sim2real.md:rl-for-robotics:39",
  "audit/rl-sim2real.md:rl-for-robotics:40"
] as const;
const plans = JSON.parse(read('audit/compound-evidence.json')) as CompoundPlan[];
const citationIds = new Set(CITATIONS.map((c) => c.id));
const articles = ['comparison-matrix', 'knowledge-insulation', 'pi-line', 'realtime-execution'];
const articleCitations = Object.fromEntries([
  ...articles.map((slug) => [slug, matter(read(`content/manipulation/${slug}.mdx`)).data.citations]),
  ['rl-for-robotics', matter(read('content/rl-sim2real/rl-for-robotics.mdx')).data.citations],
]);
function row(id: string, compoundPlans = plans) {
  const [path, slug, ordinal] = id.split(':');
  // Plans only bind rows in their own ledger, so scope the context before
  // parsing — re-validating the whole catalog per call makes this test
  // exceed its timeout as the merged catalog grows.
  const scoped = compoundPlans.filter((p) => p.ledgerPath === path);
  return parseLedger(path, read(path), citationIds, { compoundPlans: scoped, articleCitations })
    .find((s) => s.slug === slug)!.claimRecords[Number(ordinal) - 1];
}

describe('manipulation and RL retained-source integration', () => {
  it.each(selectedIds)('keeps the whole original record complete: %s', (id) => {
    expect(row(id).evidenceFailures).toEqual([]);
  });
  it('fails closed when any selected whole-record source item is omitted', () => {
    for (const id of selectedIds) {
      const current = row(id);
      expect(current.compound, id).toBeDefined();
      const mutated = structuredClone(plans);
      const plan = mutated.find((p) => p.id === current.compound!.planId)!;
      expect(plan.evidence.length, id).toBeGreaterThan(0);
      plan.evidence.pop();
      expect(row(id, mutated).evidenceFailures.length, id).toBeGreaterThan(0);
    }
  });
  it('separates policy checkpoints from encoders and avoids an unprinted pi06 total', () => {
    const methods = Object.fromEntries(METHODS.map((m) => [m.id, m]));
    expect(methods.octo.backbone).toContain('t5-base');
    expect(methods.octo.backbone).not.toContain('trained from scratch');
    expect(methods.pi05.backbone).toContain('2B');
    expect(methods.pi06.backbone).not.toContain('~5B');
  });
  it('preserves exact latency means and labels training delay instead of measured tolerance', () => {
    const refs = Object.fromEntries(LATENCY_REFERENCES.map((r) => [r.id, r]));
    expect(refs['rtc-mobile'].ms).toBe(138.98);
    expect(refs['rtc-static'].ms).toBe(108.76);
    expect(refs['pi07-tolerance'].ms).toBe(12 * 1000 / 50);
    expect(refs['pi07-tolerance'].label).toMatch(/training/i);
    expect(read('content/manipulation/realtime-execution.mdx')).not.toContain('newer observations dominating');
    expect(read('content/manipulation/realtime-execution.mdx')).not.toContain('maximum tolerated inference latency');
  });
  it('retains the control-mode dropout exception and distinguishes high-level coaching', () => {
    const pi = read('content/manipulation/pi-line.mdx');
    expect(pi).toMatch(/control mode[^.]*not dropped|not apply dropout[^.]*control mode|control-mode[^.]*not dropped/i);
    expect(pi).toContain('high-level policy');
    expect(pi).not.toContain('for 3.3B total');
    expect(pi).not.toContain('committed the whole 50-step chunk');
  });
  it('keeps derived RL timing bounds, trial populations and the cut universal honest', () => {
    const rl = read('content/rl-sim2real/rl-for-robotics.mdx');
    expect(98_304 * 1500).toBe(147_456_000);
    expect(98_304 * 1500 / 1200).toBe(122_880);
    expect(160_000 / (2 * 3600)).toBeCloseTo(22.22, 2);
    expect(rl).toContain('122,880');
    expect(rl).toContain('nearly all tasks');
    expect(rl).toContain('six hours');
    expect(rl).toContain('100 evaluation trials');
    expect(rl).not.toContain('every from-scratch hardware result below learns');
    expect(rl).not.toContain('strongest real-robot RL results');
    expect(row('audit/rl-sim2real.md:rl-for-robotics:14').verdict).toMatch(/^cut/i);
  });
  it('uses the exact current seven/six citation sets without a fake review-date bump', () => {
    expect(articleCitations['knowledge-insulation']).toHaveLength(7);
    expect(articleCitations['realtime-execution']).toHaveLength(6);
    expect(articleCitations['comparison-matrix']).toHaveLength(21);
    expect(articleCitations['pi-line']).toHaveLength(13);
    expect(articleCitations['rl-for-robotics']).toHaveLength(27);
    for (const slug of articles) expect(matter(read(`content/manipulation/${slug}.mdx`)).data.lastReviewed).toBe('2026-08-17');
  });
});
