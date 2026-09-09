import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { compoundPartDigest, compoundPlanDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';

const text = (path: string) => readFileSync(path, 'utf8');
const article = (slug: string) => text(`content/rl-sim2real/${slug}.mdx`);
const members = [
  ['sim2real-transfer', 15, 5],
  ['sim2real-transfer', 16, 4],
  ['sim2real-transfer', 17, 3],
  ['legged-locomotion', 9, 3],
  ['legged-locomotion', 10, 3],
  ['humanoid-wbc', 3, 4],
] as const;
const catalog = () => parseCompoundPlans(JSON.parse(text('audit/compound-evidence.json')));
function selected(slug: string, ordinal: number) {
  const plan = catalog().find(p => p.id === `humanoid-motion-${slug}-${ordinal}-20260908`);
  expect(plan, 'Every selected original needs its entire reviewed AND plan').toBeDefined();
  return structuredClone(plan!);
}
function failures(plan: ReturnType<typeof selected>) {
  return parseLedger('audit/rl-sim2real.md', text('audit/rl-sim2real.md'),
    new Set(CITATIONS.map(c => c.id)), {
      compoundPlans: catalog().map(p => p.id === plan.id ? plan : p),
      articleCitations: Object.fromEntries(['sim2real-transfer', 'legged-locomotion', 'humanoid-wbc']
        .map(slug => [slug, matter(article(slug)).data.citations])),
    }).find(s => s.slug === plan.articleSlug)!.claimRecords[plan.rowOrdinal - 1].evidenceFailures;
}

describe('H2O and ASAP source-backed corrections', () => {
  it('distinguishes PPO residual training, frozen simulation and deployed policy', () => {
    const body = article('sim2real-transfer');
    for (const phrase of ['phase-conditioned tracking policies', 'second PPO policy',
      'not supplied as a measured residual-action label', 'model is then frozen',
      'delta model stays in simulation', 'four ankle DoFs']) expect(body).toContain(phrase);
    expect(body).not.toContain('The cleanest modern formulation');
  });
  it('separates open-loop replay, closed-loop simulation and two hardware comparisons', () => {
    const body = article('sim2real-transfer');
    for (const phrase of ['43 motion sequences', '106 mm', "SysID's 105 mm",
      '61.2 to 50.2 mm', '159 to 112 mm', 'Vanilla', 'open-loop', 'closed-loop',
      'IsaacGym-to-Genesis test']) expect(body).toContain(phrase);
    expect(body).not.toContain('reducing tracking error against SysID, DR, and delta-dynamics baselines');
  });
  it('retains OOD evidence without a near-distribution theorem or unseen-skill guarantee', () => {
    const body = article('sim2real-transfer');
    for (const phrase of ['held-out "Silencer"', 'arbitrary unseen-skill coverage',
      'motor overheating and damage', 'motion-capture dependence', 'full 23-DoF']) expect(body).toContain(phrase);
    expect(body).not.toContain('Delta-action correction is valid only near');
    expect(body).not.toContain('fine-tuned policy cannot stray far');
  });
  it('keeps H2O privileged filtering distinct from its deployed policy and sensing', () => {
    for (const slug of ['legged-locomotion', 'humanoid-wbc']) {
      for (const phrase of ['robot-side motion capture', 'linear velocity', 'PD controller',
        '19', 'domain randomization']) expect(article(slug)).toContain(phrase);
    }
    expect(article('humanoid-wbc')).toContain('"similar to PHC"');
    expect(article('humanoid-wbc')).toContain('follows PULSE');
    expect(article('legged-locomotion')).toContain('not the complete sensing setup');
    expect(article('humanoid-wbc')).not.toContain('physical feasibility that raw kinematic retargeting destroys');
  });
  it('keeps G1 demonstrations distinct from quantitative hardware trials', () => {
    const body = article('legged-locomotion');
    for (const phrase of ['G1 with fixed wrists', 'ankle delta-action model',
      'without the residual model', 'Ronaldo-', 'Kobe-inspired',
      'not a success-rate study of every illustrated skill']) expect(body).toContain(phrase);
  });
  it('uses the observed body spelling and preserves the metadata disagreement and URL', () => {
    const citation = CITATIONS.find(c => c.id === 'asap-2025')!;
    expect(citation.authors).toHaveLength(18);
    expect(citation.authors[8]).toBe('Nikhil Sobanbabu');
    expect(text('data/citations.ts')).toContain('arXiv abs metadata spells Sobanbab');
    expect(citation.url).toBe('https://arxiv.org/abs/2502.01143');
    expect(text('audit/citations.md')).toContain(`| asap-2025 | ${citation.url} |`);
  });
  describe.each(members)('%s original %i', (slug, ordinal, parts) => {
    it('binds all parts and source pairs to a current semantic review', () => {
      const p = selected(slug, ordinal);
      expect(p.parts).toHaveLength(parts);
      expect(p.evidence).toHaveLength(parts);
      expect(p.planReview!.reviewedBy).toBe('agent:daf8738d-c462-4afa-82ce-9ab57455ccb8/integrator');
      expect(p.planReview!.planDigest).toBe(compoundPlanDigest(p));
      for (const a of p.adjudications) expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      expect(failures(p)).toEqual([]);
    });
    it('rejects every omitted part and paired source item', () => {
      for (const key of ['parts', 'evidence'] as const) {
        for (let i = 0; i < selected(slug, ordinal)[key].length; i++) {
          const p = selected(slug, ordinal);
          p[key].splice(i, 1);
          expect(failures(p).length).toBeGreaterThan(0);
        }
      }
    });
    it('rejects stale row, altered passage and missing adjudication', () => {
      const stale = selected(slug, ordinal);
      stale.originalCellsDigest = '0'.repeat(64);
      expect(failures(stale).length).toBeGreaterThan(0);
      const altered = selected(slug, ordinal);
      altered.evidence[0].supportingPassage += ' unsupported addition';
      expect(failures(altered).length).toBeGreaterThan(0);
      const missing = selected(slug, ordinal);
      missing.adjudications.pop();
      expect(failures(missing).length).toBeGreaterThan(0);
    });
  });
});
