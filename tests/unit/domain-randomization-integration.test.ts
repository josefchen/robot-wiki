import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { compoundPartDigest, compoundPlanDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';

const transfer = readFileSync('content/rl-sim2real/sim2real-transfer.mdx', 'utf8');
const why = readFileSync('content/rl-sim2real/why-rl-locomotion.mdx', 'utf8');
const ledger = readFileSync('audit/rl-sim2real.md', 'utf8');
type Plan = ReturnType<typeof parseCompoundPlans>[number];
const plans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')) as Plan[];
const ids = new Set(CITATIONS.map(c => c.id));
const targets = [
  ['why-rl-locomotion', 5, ['o-identity', 'o-abstract', 'o-platform', 'o-policy', 'o-evaluation', 'o-solver']],
  ['why-rl-locomotion', 8, ['o-identity', 'o-platform', 'o-physical-calibration', 'o-curriculum', 'o-boundaries']],
  ['sim2real-transfer', 5, ['t-identity', 't-framing', 't-approximation', 't-randomizations', 't-initialization', 't-selection', 't-evaluation', 't-scratch', 't-robot']],
  ['sim2real-transfer', 6, ['p-identity', 'p-transfer', 'p-task', 'p-parameters', 'p-calibration', 'p-evaluation']],
  ['sim2real-transfer', 9, ['p-objective', 'p-ablations', 'p-adaptation']],
] as const;
const selected = (slug: string, ordinal: number) => {
  const p = plans.find(p => p.id === `domain-randomization-${slug}-${ordinal}`);
  expect(p).toBeDefined();
  return structuredClone(p!);
};
const row = (p: Plan) => parseLedger('audit/rl-sim2real.md', ledger, ids, {
  compoundPlans: plans.map(q => q.id === p.id ? p : q),
}).find(s => s.slug === p.articleSlug)!.claimRecords[p.rowOrdinal - 1];

describe('Domain randomization source integration', () => {
  it('keeps Tobin and Peng document identities distinct and registry URLs unchanged', () => {
    expect(CITATIONS.find(c => c.id === 'tobin-2017')?.url).toBe('https://arxiv.org/abs/1703.06907');
    expect(CITATIONS.find(c => c.id === 'peng-2018')?.url).toBe('https://arxiv.org/abs/1710.06537');
    expect(transfer).not.toContain('The idea dates to two 2017 results.');
    expect(transfer).not.toContain('(mass, inertia, friction)');
  });
  it('retains Tobin accuracy, evaluation and pretraining qualifications', () => {
    for (const s of ['around 1.5 cm', '480 webcam images', 'eight geometric objects', 'ImageNet initialization', 'random initialization']) expect(transfer).toContain(s);
    expect(transfer).not.toContain('detector trained only on non-realistic simulated images');
  });
  it('retains Peng physical evaluation and limited calibration', () => {
    for (const s of ['seven-DoF Fetch', '200', '7 cm', '30 cm by 30 cm', 'limited calibration']) expect(transfer).toContain(s);
  });
  it('preserves all nineteen ordered OpenAI byline entries', () => {
    expect(CITATIONS.find(c => c.id === 'openai-rubiks-cube-2019')?.authors).toEqual([
      'OpenAI', 'Ilge Akkaya', 'Marcin Andrychowicz', 'Maciek Chociej', 'Mateusz Litwin',
      'Bob McGrew', 'Arthur Petron', 'Alex Paino', 'Matthias Plappert', 'Glenn Powell',
      'Raphael Ribas', 'Jonas Schneider', 'Nikolas Tezak', 'Jerry Tworek', 'Peter Welinder',
      'Lilian Weng', 'Qiming Yuan', 'Wojciech Zaremba', 'Lei Zhang',
    ]);
  });
  it('distinguishes fixed-sequence sensing results from universal puzzle solving', () => {
    for (const s of ['43 subgoals', 'two of ten', 'zero of ten', 'Giiker', 'solved cube', 'separate solver']) expect(why).toContain(s);
  });
  it('distinguishes physical calibration and automatic curriculum ranges', () => {
    for (const s of ['manually tuned motor-torque limits', 'recorded physical joint trajectories', 'not all hand-tuned']) expect(why).toContain(s);
    expect(why).not.toContain('locomotion gets for free');
  });
  it('removes literature-wide cost and absence claims from prose and feedback', () => {
    expect(transfer).not.toMatch(/optimal for none|papers almost never quantify|every DR paper reports/);
    expect(transfer).toContain('maximize expected return');
    expect(transfer).toContain('authored assumptions');
    expect(transfer).toContain('not Peng paper results');
    const prediction = transfer.split('<PredictThenReveal')[1].split('</PredictThenReveal>')[0];
    expect(prediction).not.toContain("cite: 'peng-2018'");
  });
  it('preserves RMA inference and does not complete held original 23', () => {
    expect(transfer).toContain('These are inference processes, not online gradient updates.');
    expect(transfer).toContain("label: 'A separately trained adaptation module'");
    expect(transfer).toContain('answer="latent-adaptation"');
    const held = parseLedger('audit/rl-sim2real.md', ledger, ids, { compoundPlans: plans })
      .find(s => s.slug === 'sim2real-transfer')!.claimRecords[22];
    expect(held.evidenceFailures.length).toBeGreaterThan(0);
  });
  for (const [slug, ordinal, parts] of targets) {
    it(`${slug} original ${ordinal} binds the full current conjunction`, () => {
      const p = selected(slug, ordinal);
      expect(p.parts.map(x => x.id)).toEqual(parts);
      expect(p.evidence.length).toBe(parts.length);
      expect(row(p).evidenceFailures).toEqual([]);
      expect(row(p).outcome).toBe('passing');
      expect(p.planReview?.reviewedBy).toBe('agent:d43f66d4-36fb-4868-9083-3813fa407df4/integrator');
      expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
      for (const a of p.adjudications) expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
    });
    it(`${slug} original ${ordinal} rejects each missing required source pair`, () => {
      for (const part of parts) {
        const p = selected(slug, ordinal);
        p.evidence = p.evidence.filter(e => e.partId !== part);
        expect(row(p).evidenceFailures.length, part).toBeGreaterThan(0);
      }
    });
    it(`${slug} original ${ordinal} rejects stale and malformed full-current bindings`, () => {
      const mutations: Array<(p: Plan) => void> = [
        p => { p.parts.pop(); },
        p => { p.evidence[0].citationId = ''; },
        p => { p.evidence[0].sourceUrl = ''; },
        p => { p.evidence[0].supportingPassage = ''; },
        p => { p.evidence[0].supportingPassage += ' invented'; },
        p => { p.originalCellsDigest = '0'.repeat(64); },
        p => { p.planReview = null; },
        p => { p.adjudications[0].outcome = 'unresolved'; },
      ];
      for (const mutate of mutations) {
        const p = selected(slug, ordinal);
        mutate(p);
        expect(row(p).evidenceFailures.length).toBeGreaterThan(0);
      }
    });
  }
});
