import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { compoundPartDigest, compoundPlanDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';
import { committedJson, committedText } from '../helpers/editorial-current-context';

const article = readFileSync('content/rl-sim2real/sim2real-transfer.mdx', 'utf8');
const ledger = readFileSync('audit/rl-sim2real.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
type Plan = typeof plans[number];
const ids = new Set(CITATIONS.map(c => c.id));
const record = (ordinal: number, replacement?: Plan) => parseLedger('audit/rl-sim2real.md', ledger, ids, {
  compoundPlans: plans.map(p => p.id === replacement?.id ? replacement : p),
}).find(s => s.slug === 'sim2real-transfer')!.claimRecords[ordinal - 1];
const selected = (ordinal: number) => {
  const p = plans.find(p => p.id === `sim2real-splat-consumer-${ordinal}-20260908`);
  expect(p).toBeDefined();
  return structuredClone(p!);
};

describe('Splat transfer bounded integration', () => {
  it('couples the scoped SplatSim Stat with its citation and evaluation denominator', () => {
    expect(article).toContain('data-testid="splatsim-transfer-stat"');
    expect(article).toContain('label="SplatSim zero-shot (UR5)" value="86.25%" note="vs 97.5% real-data; 4 tasks, 40 trials/task"');
    expect(article.split('data-testid="splatsim-transfer-stat"')[1].split('</div>')[0]).toContain('<Cite id="splatsim-2024" />');
    for (const s of ['PyBullet supplies the physics', '40 trials per task', 'training augmentations', 'Robotiq 2F-85', 'two RealSense D455', 'manual robot segmentation', 'CAD-derived link bounds', 'ICP alignment']) expect(article).toContain(s);
    expect(article).not.toContain('replaces the simulator\'s mesh renderer');
  });
  it('retains the conflicting SplatSim observation descriptions without reconciling them', () => {
    for (const s of ['Figure 2 lists RGB observations plus end-effector position and orientation', 'Section IV-A says', 'solely on RGB at test time', 'Those descriptions disagree']) expect(article).toContain(s);
    expect(record(18).note).toContain('85%');
    expect(record(18).note).toContain('95%');
  });
  it('keeps document identity separate from inspected edition and historical mistakes', () => {
    expect(CITATIONS.find(c => c.id === 'splatsim-2024')?.url).toBe('https://arxiv.org/abs/2409.10161');
    expect(CITATIONS.find(c => c.id === 'robogsim-2024')?.year).toBe(2024);
    expect(record(4).sourceChecked).toContain('2409.10161');
    expect(record(4).sourceChecked).not.toContain('2409.09961');
    expect(record(4).note).toContain('SplatSim paper, arXiv 2409.09961 abstract');
    expect(record(4).note).toContain('Immediate-before tuple (history, not proof)');
    expect(article).toContain('August 2025 v2');
  });
  it('retains the RoboGSim closed loop, denominator and non-equivalence limits', () => {
    for (const s of ['Gaussian Reconstructor', 'Digital Twins Builder', 'Scene Composer', 'Interactive Engine', 'MDH parameters', 'mesh assets', 'measured layout alignment', 'inverse kinematics', 'collisions', 'resulting state drives the next rendering', 'ten trials with up to three grasp attempts per trial', '90% placement', '30% in RoboGSim', 'not a demonstrated safety guarantee', 'trajectory replay separately']) expect(article).toContain(s);
    expect(article).not.toContain('RoboGSim packages the same loop');
    expect(record(19).note).toContain('Table 1 and Section 4.3');
  });
  it('preserves four mobile citation wrappers, held interpretations and review date', () => {
    // Later audit work added mobile tooltip-shift wrappers: five before the
    // Real-to-sim section, nine total.
    const atSplat = committedText('2ed812e20ee3dbe663c75f157ac3e5f066b37ea2', 'content/rl-sim2real/sim2real-transfer.mdx');
    expect(atSplat.split('## Real-to-sim:')[0].match(/<span className="max-sm:/g)).toHaveLength(4);
    expect(atSplat.match(/<span className="max-sm:/g)).toHaveLength(6);
    expect(article.split('## Real-to-sim:')[0].match(/<span className="max-sm:/g)).toHaveLength(5);
    expect(article.match(/<span className="max-sm:/g)).toHaveLength(9);
    expect(article).toContain('lastReviewed: "2026-08-17"');
    expect(article).toContain('Real-to-sim twins freeze the scene they captured.');
    expect(article).toContain('Confusing the two is the most common misreading');
    // Original 21 was held when this pin was written but a later packet
    // completed it; 23 and 24 remain held.
    expect(record(21).evidenceFailures).toEqual([]);
    for (const ordinal of [23, 24]) expect(record(ordinal).evidenceFailures.length).toBeGreaterThan(0);
    const oldLedger = committedText('2ed812e20ee3dbe663c75f157ac3e5f066b37ea2', 'audit/rl-sim2real.md');
    const oldPlans = committedJson<typeof plans>('2ed812e20ee3dbe663c75f157ac3e5f066b37ea2', 'audit/compound-evidence.json');
    const held = parseLedger('audit/rl-sim2real.md', oldLedger, ids, { compoundPlans: oldPlans })
      .find(s => s.slug === 'sim2real-transfer')!.claimRecords;
    for (const ordinal of [21, 23, 24]) expect(held[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    expect(record(21).evidenceFailures).toEqual([]);
    const typed = JSON.parse(readFileSync('audit/local-basis.json', 'utf8')).plans as Array<{ id: string; originalId: string }>;
    for (const ordinal of [23, 24]) {
      expect(typed.some(p => p.originalId === `audit/rl-sim2real.md:sim2real-transfer:${ordinal}`)).toBe(true);
      expect(record(ordinal).verdict).toBe('C');
      expect(record(ordinal).evidenceFailures.length).toBeGreaterThan(0); // no typed context
    }
    expect(plans.some(p => p.id === 'sim2real-splat-consumer-21-20260908')).toBe(false);
  });
  for (const [ordinal, count] of [[4, 4], [18, 10], [19, 11]]) {
    it(`original ${ordinal} binds every current required part and genuine review`, () => {
      const p = selected(ordinal);
      expect(p.parts).toHaveLength(count);
      expect(p.evidence).toHaveLength(count);
      expect(p.adjudications).toHaveLength(count);
      expect(record(ordinal).evidenceFailures).toEqual([]);
      expect(record(ordinal).outcome).toBe('passing');
      expect(p.planReview?.reviewedBy).toBe('agent:1460e88e/integrator');
      expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
      for (const a of p.adjudications) {
        expect(a.outcome).toBe('supported');
        expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      }
    });
    it(`original ${ordinal} fails closed for each missing required evidence pair`, () => {
      for (const part of selected(ordinal).parts) {
        const p = selected(ordinal);
        p.evidence = p.evidence.filter(e => e.partId !== part.id);
        expect(record(ordinal, p).evidenceFailures.length, part.id).toBeGreaterThan(0);
      }
    });
    it(`original ${ordinal} rejects absent reviews, stale bindings and invented passages`, () => {
      const mutations: Array<(p: Plan) => void> = [
        p => { p.planReview = null; p.adjudications = []; },
        p => { p.originalCellsDigest = '0'.repeat(64); },
        p => { p.parts.pop(); },
        p => { p.evidence[0].supportingPassage += ' invented'; },
        p => { p.evidence[0].citationId = ''; },
        p => { p.evidence[0].sourceUrl = ''; },
        p => { p.evidence[0].supportingPassage = ''; },
        p => { p.adjudications[0].outcome = 'unresolved'; },
      ];
      for (const mutate of mutations) {
        const p = selected(ordinal); mutate(p);
        expect(record(ordinal, p).evidenceFailures.length).toBeGreaterThan(0);
      }
    });
  }
});
