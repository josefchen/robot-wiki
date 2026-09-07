import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { compoundPartDigest, parseCompoundPlans, parseLedger } from '@/lib/audit-ledger';

const text = (path: string) => readFileSync(path, 'utf8');
const targets = [
  ['classical', 'perception', 14],
  ['classical', 'scene-representation', 2],
  ['classical', 'scene-representation', 23],
  ['classical', 'scene-representation', 42],
  ['classical', 'scene-representation', 43],
  ['classical', 'scene-representation', 44],
  ['data-hardware', 'industrial-deployment', 29],
] as const;

describe('retained cross-article source scope', () => {
  it('replaces Zhang adoption history with the comparison the journal abstract makes', () => {
    const article = text('content/classical/perception.mdx');
    expect(article.replace(/<Cite[^>]*\/>/g, '').replace(/\s+/g, ' ')).toContain('Zhang compares this setup with classical techniques that use expensive equipment such as two or three orthogonal planes');
    expect(article).not.toContain('displaced the fixtures');
    expect(article).not.toContain('why calibration on a real robot');
  });
  it('defines the PointNet input without a universal sensor-ray origin', () => {
    const article = text('content/classical/scene-representation.mdx');
    expect(article).toContain('an unordered set of 3D points');
    expect(article).not.toContain('one 3D sample per returned ray');
  });
  it('limits camera failure to the reported RealSense experiment', () => {
    const article = text('content/classical/scene-representation.mdx');
    expect(article).toContain('In their RealSense comparison, the camera failed to compute depth for most transparent objects in the tested scenes');
    expect(article).not.toContain('a depth camera cannot see at all');
  });
  it('names Navigation2 rather than claiming a field-wide costmap standard', () => {
    const article = text('content/classical/scene-representation.mdx');
    expect(article).toContain('Navigation2 uses a layered costmap');
    expect(article).not.toContain('layered form now standard');
  });
  it('preserves Navigation2 planner/controller roles without an unsupported timing rule', () => {
    const article = text('content/classical/scene-representation.mdx');
    expect(article).toContain('the global planner computes a shortest route to a goal, while the controller uses local information to compute a local path and control signals');
    expect(article).not.toContain('searches the whole known map');
    expect(article).not.toContain('replanning locally at control rate');
  });
  it('identifies Navigation2 as the chosen example rather than external authority', () => {
    const article = text('content/classical/scene-representation.mdx');
    expect(article).toContain('Navigation2, built on ROS 2, is the implementation used as the example here');
    expect(article).not.toContain('ROS 2 navigation stack is the reference implementation');
  });
  it('attributes payback estimates to the vendor and removes inferred buyer rejection', () => {
    const article = text('content/data-hardware/industrial-deployment.mdx');
    expect(article).toContain("EVST's guide estimates 12 to 24 months for multi-shift palletising cells");
    expect(article).toContain('single-shift or lower-throughput operations typically stretch closer to 24 to 36 months');
    expect(article).not.toContain('paybacks past that horizon rejected');
  });
  it('binds all seven current corrections to the same original ordinal population', () => {
    const plans = parseCompoundPlans(JSON.parse(text('audit/compound-evidence.json')));
    for (const [domain, slug, ordinal] of targets) {
      const section = parseLedger(`audit/${domain}.md`, text(`audit/${domain}.md`), new Set(CITATIONS.map(c => c.id)), { compoundPlans: plans }).find(s => s.slug === slug)!;
      const row = section.claimRecords[ordinal - 1];
      expect(row.verdict).toMatch(/^C\b/);
      expect(row.evidenceFailures).toEqual([]);
      expect(row.compound?.planId).toBe(`retained-cross-${slug}-${ordinal}-20260907`);
    }
  });
  it('keeps each whole correction incomplete when one required source part is omitted', () => {
    const plans = parseCompoundPlans(JSON.parse(text('audit/compound-evidence.json')));
    for (const [domain, slug, ordinal] of targets) {
      const changed = structuredClone(plans);
      const plan = changed.find(p => p.id === `retained-cross-${slug}-${ordinal}-20260907`)!;
      expect(plan).toBeDefined();
      plan.evidence = [];
      for (const review of plan.adjudications) review.evidenceDigest = compoundPartDigest(plan, review.partId);
      const section = parseLedger(`audit/${domain}.md`, text(`audit/${domain}.md`), new Set(CITATIONS.map(c => c.id)), { compoundPlans: changed }).find(s => s.slug === slug)!;
      expect(section.claimRecords[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    }
  });
});
