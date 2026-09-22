import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { compoundPartDigest, compoundPlanDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';

const text = (path: string) => readFileSync(path, 'utf8');
const legged = () => text('content/rl-sim2real/legged-locomotion.mdx');
const reward = () => text('content/rl-sim2real/reward-design-mpc.mdx');
const spotUrl = 'https://bostondynamics.com/blog/starting-on-the-right-foot-with-reinforcement-learning/';
const lbmUrl = 'https://bostondynamics.com/blog/large-behavior-models-atlas-find-new-footing/';
const members = [
  ['legged-locomotion', 12, 1],
  ['legged-locomotion', 13, 4],
  ['legged-locomotion', 14, 3],
  ['legged-locomotion', 15, 3],
  ['legged-locomotion', 16, 5],
  ['reward-design-mpc', 18, 2],
] as const;
const catalog = () => parseCompoundPlans(JSON.parse(text('audit/compound-evidence.json')));
function selected(slug: string, ordinal: number) {
  const plan = catalog().find(p => p.id === `boston-control-20260908-${slug}-${ordinal}`);
  expect(plan, 'The selected original requires its complete current-reviewed plan').toBeDefined();
  return structuredClone(plan!);
}
function sections(plans = catalog()) {
  return parseLedger('audit/rl-sim2real.md', text('audit/rl-sim2real.md'),
    new Set(CITATIONS.map(c => c.id)), {
      compoundPlans: plans,
      articleCitations: Object.fromEntries(['legged-locomotion', 'reward-design-mpc'].map(slug =>
        [slug, matter(text(`content/rl-sim2real/${slug}.mdx`)).data.citations])),
    });
}
function failures(plan: ReturnType<typeof selected>, slug = plan.articleSlug, ordinal = plan.rowOrdinal) {
  return sections(catalog().map(p => p.id === plan.id ? plan : p))
    .find(s => s.slug === slug)!.claimRecords[ordinal - 1].evidenceFailures;
}

describe('Boston Dynamics control source corrections', () => {
  it('states the earlier Spot architecture without an every-step timing gloss', () => {
    for (const phrase of ['less than a millisecond', 'dozens of predictive horizons',
      'distinct step-trajectory references', 'highest-valued controller output']) expect(legged()).toContain(phrase);
    expect(legged()).not.toContain('cleanest industrial verdict');
    expect(legged()).not.toContain('scored every step');
  });
  it('separates the production policy from the over-70-cm research architecture', () => {
    for (const phrase of ['retaining the existing model-based locomotion controller',
      'multiple MPC instances in parallel', 'does not supply a numerical fall-rate reduction',
      'separately describes research', 'not stated as a capability of the shipped production policy']) {
      expect(legged()).toContain(phrase);
    }
    expect(legged()).not.toContain('no more parallel MPC instances');
  });
  it('keeps fleet units, staged testing and the training-or-evaluation alternative', () => {
    for (const phrase of ['first benchmarks policies in simulation', 'cumulative runtime of over 2,000 hours a week',
      'fleet total, not a per-robot runtime', 'reproducible in a physics simulation',
      'either the training or evaluation set']) expect(legged()).toContain(phrase);
  });
  it('keeps the RAI date, approximate per-maneuver runs and zero-shot limits', () => {
    for (const phrase of ['On March 19, 2025', 'each maneuver created from data from about 150 million simulator runs',
      'does not define their duration', 'not evidence of calibration-free deployment']) expect(legged()).toContain(phrase);
    expect(legged()).not.toContain('new electric Atlas');
    expect(legged()).not.toContain('each maneuver distilled');
  });
  it('distinguishes Atlas action rate, chunked inference, demonstrations and interface', () => {
    for (const phrase of ['450M-parameter diffusion transformer', '30 Hz', '48 actions (1.6 seconds)',
      '24 actions (0.8 seconds at 1x speed)', 'not a network inference on every control tick',
      'teleoperated demonstrations from hardware and simulation', 'same robot control interface',
      'reported research policies deployed on hardware']) expect(legged()).toContain(phrase);
    expect(legged()).not.toContain('Neither step threw out');
    expect(legged()).not.toContain('accurate framing for 2026');
  });
  it('keeps reward18 as an ordered two-document conjunction, excluding reward19 and mixed Stats', () => {
    for (const phrase of ['its 2024 Spot account', 'Its August 2025 Atlas/TRI report',
      'different robots and policy generations']) expect(reward()).toContain(phrase);
    const p = selected('reward-design-mpc', 18);
    expect(p.evidence.map(e => e.sourceUrl)).toEqual([spotUrl, lbmUrl]);
    expect(p.evidence[0].supportingPassage).toContain('removing the need to run multiple MPC instances in parallel');
    expect(p.evidence[1].supportingPassage).toContain('same control interface to the robot as the teleoperation system');
    // Row 19 was held incomplete when this pin was written; the
    // reward-design-mpc originals packet has since bound it to
    // reward-design-mpc-original-19-20260916, so the honest current
    // assertion is that its record carries no evidence failures while
    // reward18 stays its own separate two-document conjunction.
    expect(sections().find(s => s.slug === 'reward-design-mpc')!.claimRecords[18].evidenceFailures).toEqual([]);
    // Legged-locomotion original 1 (Stats) was held when this pin was written;
    // the 20260917a packet bound it to legged-locomotion-1-stats-78min-20260917a.
    const leggedStats = sections().find(s => s.slug === 'legged-locomotion')!.claimRecords[0];
    expect(leggedStats.evidenceFailures).toEqual([]);
    expect(leggedStats.compound?.planId).toBe('legged-locomotion-1-stats-78min-20260917a');
    expect(legged()).toContain('<Stat label="Alpine hike" value="78 min"');
    expect(legged()).toContain('reattach a shoe and swap batteries');
  });
  it('preserves audited URLs, four explicit LBM authors and unresolved bibliographic qualifiers', () => {
    expect(CITATIONS.find(c => c.id === 'bd-spot-rl-2024')!.url).toBe(spotUrl);
    const lbm = CITATIONS.find(c => c.id === 'bd-atlas-lbm-2025')!;
    expect(lbm.url).toBe(lbmUrl);
    expect(lbm.authors).toEqual(['Eric Cousineau', 'Scott Kuindersma', 'Lucas Manuelli', 'Pat Marion']);
    for (const phrase of ['JSON-LD mrodin', 'Spot personal byline', 'RAI corporate-name expansion']) {
      expect(text('audit/rl-sim2real.md')).toContain(phrase);
    }
    expect(matter(legged()).data.lastReviewed).toBe('2026-08-17');
    expect(matter(reward()).data.lastReviewed).toBe('2026-08-17');
  });
  describe.each(members)('%s original %i', (slug, ordinal, parts) => {
    it('binds all parts and literal evidence to the current integrator review', () => {
      const p = selected(slug, ordinal);
      expect(p.parts).toHaveLength(parts);
      expect(p.evidence).toHaveLength(parts);
      expect(p.planReview!.reviewedBy).toBe('agent:0d32fee8-d20f-40b2-82e2-9afa72eda5ae/integrator');
      expect(p.planReview!.planDigest).toBe(compoundPlanDigest(p));
      for (const a of p.adjudications) expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      expect(failures(p)).toEqual([]);
    });
    it('rejects every omitted AND part or source item without partial credit', () => {
      for (const key of ['parts', 'evidence'] as const) {
        for (let i = 0; i < parts; i++) {
          const p = selected(slug, ordinal);
          p[key].splice(i, 1);
          if (key === 'parts' && parts === 1) {
            expect(() => failures(p)).toThrow(/compound evidence format.*too_small/s);
          } else {
            expect(failures(p).length).toBeGreaterThan(0);
          }
        }
      }
    });
    it('rejects stale tuples, wrong ordinals, changed source URLs and forged passage continuations', () => {
      const stale = selected(slug, ordinal);
      stale.originalCellsDigest = '0'.repeat(64);
      expect(failures(stale).length).toBeGreaterThan(0);
      const wrongOrdinal = selected(slug, ordinal);
      wrongOrdinal.rowOrdinal += 1;
      const collides = catalog().some(
        (p) =>
          p.id !== wrongOrdinal.id &&
          p.ledgerPath === wrongOrdinal.ledgerPath &&
          p.articleSlug === slug &&
          p.rowOrdinal === wrongOrdinal.rowOrdinal,
      );
      if (collides) {
        expect(() => failures(wrongOrdinal, slug, ordinal)).toThrow(/duplicate compound row target/);
      } else {
        expect(failures(wrongOrdinal, slug, ordinal).length).toBeGreaterThan(0);
      }
      const wrongSource = selected(slug, ordinal);
      wrongSource.evidence[0].sourceUrl = 'https://example.com/not-the-source';
      expect(failures(wrongSource).length).toBeGreaterThan(0);
      const forged = selected(slug, ordinal);
      forged.evidence[0].supportingPassage += ' invented continuation';
      expect(failures(forged).length).toBeGreaterThan(0);
    });
  });
});
