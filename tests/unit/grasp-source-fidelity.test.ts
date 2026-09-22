import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, parseCompoundPlans, parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';

const article = readFileSync('content/classical/grasp-planning.mdx', 'utf8');
const ledger = readFileSync('audit/classical.md', 'utf8')
  .match(/^### grasp-planning\.mdx\n[\s\S]*?(?=^### )/m)?.[0];
if (!ledger) throw new Error('Missing native grasp-planning ledger section');
const registry = readFileSync('data/citations.ts', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const records = (catalog = plans) => parseLedger('audit/classical.md', ledger, ids, { compoundPlans: catalog.filter(p => p.articleSlug === 'grasp-planning') })
  .find(s => s.slug === 'grasp-planning')!.claimRecords;

describe('grasp source fidelity', () => {
  it('bounds the Roa–Suárez review instead of promising a broad benchmark', () => {
    for (const text of ['contact locations and hand configuration', 'simple examples',
      'origin used to compute torques', 'metric that scales torques relative to forces',
      'shared total-force limit from independent per-finger limits', 'Most of their analysis is quasi-static'])
      expect(article).toContain(text);
    expect(article).not.toContain('benchmarks the main candidates');
    expect(registry).toContain('with no generally best criterion');
  });
  it('keeps synthetic training units and the expected-epsilon binary target explicit', () => {
    for (const text of ['Dex-Net 2.0 training datapoints', 'not robot trials',
      '1,500 3D object models', 'over 6.7 million aligned grasp images',
      'expected epsilon quality above 0.002', 'no modeled collision with the object or table',
      'rather than regressing the raw epsilon score', 'not be treated as a threshold for the lab above'])
      expect(article).toContain(text);
  });
  it('separates prediction, constrained planning and physical execution', () => {
    for (const text of ['grasp-aligned depth crop', 'gripper depth relative to the camera',
      'reachable and does not collide with the table', 'isolated rigid objects',
      'single-view depth image', 'ABB YuMi', 'Carmine 1.08',
      'lifting, transporting, and shaking']) expect(article).toContain(text);
  });
  it('binds 93 percent to the fine-tuned model and its eight-object evaluation', () => {
    expect(article).toContain('93% success for GQ-L-Adv over 80 trials, ten per object');
    expect(article).toContain('fine-tuned on synthetic examples of those adversarial objects');
    expect(article).not.toMatch(/(?:74|75)\s*(?:\/|of|out of)\s*80/);
    expect(registry).toContain('GQ-L-Adv, 93% success in 80 trials');
  });
  it('distinguishes household success and rounded precision without hiding failures', () => {
    for (const text of ['100 trials on 40 novel household objects', '94% success overall and 99% precision',
      '68 successes among 69 grasps classified as robust', 'estimated robustness exceeds 50%',
      'Missing depth on thin parts and object collisions']) expect(article).toContain(text);
    expect(article).not.toContain('99% success');
    expect(registry).toContain('94% overall success and 99% precision (68/69 robust classifications)');
  });
  it('preserves held originals, citation URLs, article date and unassigned conclusion', () => {
    // Rows 10 and 12 were completed by the 2026-09-16 grasp-planning originals
    // integration (frozen packet convergence-source-j-grasp-planning-20260916c);
    // Row 3 (Cutkosky body) was held without a lawful public mirror when this
    // pin was written; the 20260917a book-retry packet bound it to
    // grasp-planning-3-cutkosky-1989-20260917a.
    expect(records()[2].evidenceFailures).toEqual([]);
    expect(records()[2].compound?.planId).toBe('grasp-planning-3-cutkosky-1989-20260917a');
    for (const ordinal of [10, 12]) expect(records()[ordinal - 1].evidenceFailures.length).toBe(0);
    expect(article).toContain('lastReviewed: "2026-08-17"');
    expect(article).toContain('That pattern generalizes. Modern learned manipulation');
    expect(CITATIONS.find(c => c.id === 'roa-suarez-2015')?.url).toBe('https://doi.org/10.1007/s10514-014-9402-3');
    expect(CITATIONS.find(c => c.id === 'dexnet-2-2017')?.url).toBe('https://arxiv.org/abs/1703.09312');
  });
  for (const [ordinal, count, citation] of [[11, 6, 'roa-suarez-2015'], [13, 8, 'dexnet-2-2017']] as const) {
    it(`original ${ordinal} requires every reviewed part`, () => {
      const row = records()[ordinal - 1];
      expect(row.evidenceFailures).toEqual([]);
      expect(row.verdict).toBe('C');
      const plan = plans.find(p => p.id === row.compound?.planId)!;
      expect(plan.parts).toHaveLength(count);
      expect(plan.evidence).toHaveLength(count);
      expect(plan.adjudications).toHaveLength(count);
      expect(plan.parts.every(p => p.requiredCitationIds.join() === citation)).toBe(true);
      expect(plan.planReview?.reviewedBy).toContain('source-auditor');
    });
    it(`original ${ordinal} rejects AND deletion, wrong sources, duplicates and stale review`, () => {
      const plan = plans.find(p => p.id === records()[ordinal - 1].compound?.planId);
      expect(plan).toBeDefined();
      const rejected = (p: CompoundPlan) =>
        expect(records(plans.map(x => x.id === p.id ? p : x))[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      for (const part of plan!.parts) {
        const p = structuredClone(plan!);
        p.evidence = p.evidence.filter(e => e.partId !== part.id);
        p.planReview!.planDigest = compoundPlanDigest(p);
        p.adjudications = p.adjudications.map(a => ({ ...a, evidenceDigest: compoundPartDigest(p, a.partId) }));
        rejected(p);
      }
      const mutations: Array<(p: CompoundPlan) => void> = [
        p => { p.planReview = null; }, p => { p.adjudications = []; },
        p => { p.originalCellsDigest = '0'.repeat(64); },
        p => { p.evidence[0].sourceUrl = 'https://example.invalid/wrong'; },
        p => { p.evidence[0].citationId = 'cutkosky-1989'; },
        p => { p.evidence[0].supportingPassage = ''; },
        p => { p.evidence.push(p.evidence[0]); },
        p => { p.adjudications[0].outcome = 'unresolved'; },
      ];
      for (const mutate of mutations) { const p = structuredClone(plan!); mutate(p); rejected(p); }
    });
  }
});
