import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, originalClaimDigest,
  parseCompoundPlans, parseLedger, type CompoundPlan,
} from '../../lib/audit-ledger';

const read = (path: string) => readFileSync(path, 'utf8');
const parallel = () => read('content/rl-sim2real/parallel-sim-rl.mdx');
const transfer = () => read('content/rl-sim2real/sim2real-transfer.mdx');
const catalog = () => parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json')));
const selected = [
  ['parallel-sim-rl', 7, 1], ['parallel-sim-rl', 11, 1],
  ['parallel-sim-rl', 12, 2], ['parallel-sim-rl', 13, 3],
  ['parallel-sim-rl', 14, 2], ['parallel-sim-rl', 15, 1],
  ['parallel-sim-rl', 17, 1], ['sim2real-transfer', 20, 1],
] as const;
const reviewer = 'agent:14bec1ba/integrator';
function planFor(slug: string, ordinal: number) {
  const p = catalog().find(p => p.id === `source-newton-engine-20260908-${slug}-${ordinal}`);
  expect(p, 'The original needs an actually reviewed whole plan').toBeDefined();
  return structuredClone(p!);
}
function rowFor(plan: CompoundPlan) {
  return parseLedger('audit/rl-sim2real.md', read('audit/rl-sim2real.md'),
    new Set(CITATIONS.map(c => c.id)), {
      compoundPlans: catalog().map(p => p.id === plan.id ? plan : p),
    }).find(s => s.slug === plan.articleSlug)!.claimRecords[plan.rowOrdinal - 1];
}
function rejected(plan: CompoundPlan) {
  try { return rowFor(plan).evidenceFailures.length > 0; } catch { return true; }
}

describe('Newton engine source-scoped corrections', () => {
  it('cuts only the unsupported current Brax positioning', () => {
    expect(parallel()).not.toContain('Brax remains the JAX-native differentiable option');
    expect(parallel()).toContain('Brax, from Google in 2021');
    expect(parallel()).toContain('<Cite id="brax-2021" />');
  });
  it('attributes the backend split and solver-dependent differentiability', () => {
    for (const phrase of ["NVIDIA's 2026 overview", 'standalone OVRTX renderer',
      "Newton's renderer", 'Linux Foundation project', 'differentiation support differs between solvers']) {
      expect(parallel()).toContain(phrase);
    }
    expect(parallel()).not.toContain('governed under the Linux Foundation');
  });
  it('keeps the solver inventory and example-specific SDF band', () => {
    for (const phrase of ['SemiImplicit, XPBD, and Kamino', 'limited joint support',
      'Style3D for cloth', 'narrow_band_range=(-0.01, 0.01)',
      'example configuration, not a stated engine-wide requirement']) expect(parallel()).toContain(phrase);
    expect(parallel()).not.toContain('the accuracy reference');
    expect(parallel()).not.toContain('that standard articulation solvers cannot represent');
  });
  it('distinguishes vendor workflows, future Samsung use and simulation', () => {
    for (const phrase of ['NVIDIA says Skild AI', 'Samsung "will use Newton"',
      'simulated RB-Y1', 'water-hose connector', "NVIDIA's accounts"]) expect(parallel()).toContain(phrase);
  });
  it('keeps the two task ratios, comparator, hardware and missing protocol together', () => {
    for (const phrase of ['value="252x / 475x"', 'locomotion / manipulation',
      'MuJoCo 3.5 (MJWarp)', 'speedups over MJX of 252x for locomotion and 475x for manipulation',
      'RTX PRO 6000 Blackwell Series', 'benchmark task variants, environment counts, numeric precision',
      'policy-training-time or control-frequency']) expect(parallel()).toContain(phrase);
    expect(parallel()).not.toContain('no independent replication as of mid-2026');
  });
  it('attributes the Drake opinion and avoids productization claims', () => {
    expect(parallel()).toContain('Johnny Nuñez Cano and his NVIDIA coauthors call Drake');
    expect(parallel()).toContain("overview authors' positioning, not a comparative benchmark");
    expect(transfer()).toContain('ray-tracing backend supports both triangle meshes and Gaussian splats');
    expect(transfer()).not.toContain('which is this idea productized');
  });
  it('preserves complete visible bylines, audited URLs and unfinished dates', () => {
    const state = CITATIONS.find(c => c.id === 'state-of-simulation-2026')!;
    expect(state.authors).toEqual(['Johnny Nuñez Cano', 'Mitesh Patel', 'Asier Arranz',
      'lior ben horin', 'Raymond Lo', 'Rishabh Chadha']);
    expect(state.url).toBe('https://huggingface.co/blog/nvidia/state-of-simulation-for-physical-ai');
    const newton = CITATIONS.find(c => c.id === 'newton-manipulation-blog-2026')!;
    expect(newton.authors).toEqual(['Philipp Reist', 'Miguel Zamora Mora', 'JC Chang',
      'Rishabh Chadha', 'Mohammad Mohajerani']);
    expect(newton.url).toBe('https://developer.nvidia.com/blog/newton-adds-contact-rich-manipulation-and-locomotion-capabilities-for-industrial-robotics');
    for (const body of [parallel(), transfer()]) expect(body).toContain('lastReviewed: "2026-08-17"');
    for (const phrase of ['legged-gym-repo-2021', 'Most of those parameters can change at runtime']) {
      expect(parallel()).toContain(phrase);
    }
    for (const phrase of ['86.25%', 'Those descriptions disagree', 'Only the fine-tuned tracking policy is deployed',
      'Robots of the same generation used the same controller']) expect(transfer()).toContain(phrase);
    // Row 21 was unbound when this pin was written; the reward-design-mpc
    // originals packet has since bound it to its own reviewed plan.
    expect(catalog().some(
      p => p.id === 'reward-design-mpc-original-21-20260916'
        && p.articleSlug === 'reward-design-mpc' && p.rowOrdinal === 21,
    )).toBe(true);
    const laterReward21 = catalog().find(p => p.articleSlug === 'reward-design-mpc' && p.rowOrdinal === 21)!;
    expect(laterReward21.id).toBe('reward-design-mpc-original-21-20260916');
    expect(laterReward21.evidence).toHaveLength(3);
  });
  describe.each(selected)('%s original %i', (slug, ordinal, parts) => {
    it('binds every required part and actual final-current review', () => {
      const p = planFor(slug, ordinal), row = rowFor(p);
      expect(p.parts).toHaveLength(parts);
      expect(p.evidence).toHaveLength(parts);
      expect(p.adjudications).toHaveLength(parts);
      expect(p.originalCellsDigest).toBe(originalClaimDigest(row));
      expect(p.planReview!.reviewedBy).toBe(reviewer);
      expect(p.planReview!.planDigest).toBe(compoundPlanDigest(p));
      for (const a of p.adjudications) {
        expect(a.reviewedBy).toBe(reviewer);
        expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      }
      expect(row.evidenceFailures).toEqual([]);
      expect(row.verdict).toBe(ordinal === 7 ? 'cut' : 'corrected');
      if (ordinal === 13) expect(new Set(p.evidence.map(e => e.citationId)).size).toBe(2);
    });
    it('rejects each omitted AND part, source item and adjudication', () => {
      for (const key of ['parts', 'evidence', 'adjudications'] as const) {
        for (let i = 0; i < parts; i++) {
          const p = planFor(slug, ordinal); p[key].splice(i, 1);
          expect(rejected(p)).toBe(true);
        }
      }
    });
    it('rejects every absent required citation and unresolved part', () => {
      for (let i = 0; i < parts; i++) {
        const missing = planFor(slug, ordinal); missing.parts[i].requiredCitationIds = [];
        expect(rejected(missing)).toBe(true);
        const held = planFor(slug, ordinal); held.adjudications[i].outcome = 'unresolved';
        expect(rejected(held)).toBe(true);
      }
    });
    it('rejects stale, altered, duplicate and extra evidence controls', () => {
      const mutations: Array<(p: CompoundPlan) => void> = [
        p => { p.originalCellsDigest = '0'.repeat(64); },
        p => { p.planReview = null; },
        p => { p.evidence[0].supportingPassage += ' unsupported addition'; },
        p => { p.evidence[0].citationId = 'rudin-2021'; },
        p => { p.evidence[0].sourceUrl = ''; },
        p => { p.evidence.push(structuredClone(p.evidence[0])); },
        p => { p.evidence.push({ ...p.evidence[0], partId: 'extra-part' }); },
        p => { p.adjudications.push(structuredClone(p.adjudications[0])); },
      ];
      for (const mutate of mutations) {
        const p = planFor(slug, ordinal); mutate(p); expect(rejected(p)).toBe(true);
      }
    });
  });
  it('rejects unknown schema keys, duplicate IDs and duplicate original targets', () => {
    const p = planFor('parallel-sim-rl', 13);
    expect(() => parseCompoundPlans([{ ...p, inventedApproval: true }])).toThrow();
    expect(() => parseCompoundPlans([p, p])).toThrow();
    expect(() => parseCompoundPlans([p, { ...p, id: 'different-id-same-original' }])).toThrow();
  });
});
