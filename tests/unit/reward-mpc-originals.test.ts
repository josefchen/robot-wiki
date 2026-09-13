import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { compoundPartDigest, compoundPlanDigest, originalClaimDigest, parseCompoundPlans, parseLedger, type CompoundPlan } from '@/lib/audit-ledger';

const ledger = readFileSync('audit/rl-sim2real.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const read = (slug: string) => readFileSync(`content/rl-sim2real/${slug}.mdx`, 'utf8');
const selected = [
  { slug: 'legged-locomotion', ordinal: 11, parts: 5, pairs: 5, items: 5 },
  { slug: 'reward-design-mpc', ordinal: 12, parts: 7, pairs: 8, items: 9 },
  { slug: 'reward-design-mpc', ordinal: 17, parts: 8, pairs: 8, items: 9 },
];
const row = (slug: string, ordinal: number, catalog = plans, text = ledger) =>
  parseLedger('audit/rl-sim2real.md', text, ids, { compoundPlans: catalog })
    .find(s => s.slug === slug)!.claimRecords[ordinal - 1];

describe('three independently whole reward and MPC originals', () => {
  for (const s of selected) {
    const id = `reward-evaluation-mpc-${s.slug}-${s.ordinal}`;
    it(`${s.slug}:${s.ordinal} binds every required part and distinct source pair`, () => {
      const p = plans.find(p => p.id === id);
      expect(p).toBeDefined();
      expect(row(s.slug, s.ordinal).evidenceFailures).toEqual([]);
      expect(p!.parts).toHaveLength(s.parts);
      expect(p!.parts.flatMap(p => p.requiredCitationIds)).toHaveLength(s.pairs);
      expect(p!.evidence).toHaveLength(s.items);
      expect(p!.originalCellsDigest).toBe(originalClaimDigest(row(s.slug, s.ordinal)));
      expect(p!.planReview?.planDigest).toBe(compoundPlanDigest(p!));
      for (const part of p!.parts) {
        const review = p!.adjudications.find(a => a.partId === part.id);
        expect(review?.outcome).toBe('supported');
        expect(review?.evidenceDigest).toBe(compoundPartDigest(p!, part.id));
      }
    });
    it(`${s.slug}:${s.ordinal} rejects missing parts, stale cells and unreviewed sources`, () => {
      const p = plans.find(p => p.id === id);
      expect(p).toBeDefined();
      const mutations: Array<[string, (p: CompoundPlan) => void]> = [
        ['missing required pair', q => { q.evidence = q.evidence.filter(e => e.partId !== q.parts[0].id); }],
        ['deleted mandatory part', q => { q.parts = q.parts.slice(1); }],
        ['stale current cells', q => { q.originalCellsDigest = '0'.repeat(64); }],
        ['wrong source', q => { q.evidence[0].citationId = 'rudin-2021'; }],
        ['wrong URL after review', q => { q.evidence[0].sourceUrl = 'https://arxiv.org/abs/2109.11978'; }],
        ['wrong passage hash', q => { q.adjudications[0].evidenceDigest = '0'.repeat(64); }],
        ['missing plan review', q => { q.planReview = null; }],
        ['unresolved part', q => { q.adjudications[0].outcome = 'unresolved'; }],
      ];
      for (const [name, mutate] of mutations) {
        const q = structuredClone(p!);
        mutate(q);
        expect(row(s.slug, s.ordinal, plans.map(x => x.id === id ? q : x)).evidenceFailures.length, name).toBeGreaterThan(0);
      }
      expect(row(s.slug, s.ordinal, plans.filter(x => x.id !== id)).evidenceFailures.length).toBeGreaterThan(0);
    });
  }
  it('scopes Jeon to its fixed PPO experiment and non-invariant practical discount', () => {
    const text = read('legged-locomotion');
    for (const phrase of ['compared reward formulations, not RL algorithms', 'ten leg joints controlled',
      'Ten runs per nominal case', '0.1 to 10 times', "PPO's discount of 0.99",
      'sacrifices policy invariance', 'not proof that algorithm choice is irrelevant']) {
      expect(text.includes(phrase), phrase).toBe(true);
    }
    expect(text.includes('the training recipe is the commodity')).toBe(false);
  });
  it('separates RDA success, visual alignment and the original Eureka human-feedback extension', () => {
    const text = read('reward-design-mpc');
    for (const phrase of ['same GPT-5 backbone', 'SAC with SimbaV2', '0.70 versus',
      '0.47', 'success at 0.42', 'GPT-4.1 ratings of five rollout videos',
      'each queried four times', 'human-written reward reflection',
      'not the discovery of a previously unacknowledged limitation']) {
      expect(text.includes(phrase), phrase).toBe(true);
    }
    expect(text.includes('which is an admission')).toBe(false);
  });
  it('keeps the MPC computational, sensing, intervention and venue limits explicit', () => {
    const text = read('reward-design-mpc');
    for (const phrase of ['to appear at ICRA 2026', 'analytical norm derivatives', 'approximate cost Hessians',
      '50 Hz and 300 Hz', '100-Hz OptiTrack', '500-Hz joint measurements',
      'ten active joint actuators', '12th-generation i7', 'gantry-assisted recovery',
      'not establish calibration-free operation']) {
      expect(text.includes(phrase), phrase).toBe(true);
    }
    expect(text.includes('presented at ICRA 2026')).toBe(false);
    expect(text.includes('a quiet rebuke')).toBe(false);
  });
  it('preserves source disagreements and original history without whole-article freshness', () => {
    expect(ledger.includes('reward-mpc-original-history-20260912')).toBe(true);
    for (const term of ['2048', '2000', 'iteration-label', 'compute-unit', 'anonymous-review']) {
      expect(ledger.includes(term), term).toBe(true);
    }
    for (const slug of ['legged-locomotion', 'reward-design-mpc']) {
      expect(read(slug)).toContain('lastReviewed: "2026-08-17"');
    }
  });
});
