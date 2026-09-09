import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { compoundPartDigest, compoundPlanDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';

const text = (path: string) => readFileSync(path, 'utf8');
const members = [
  ['sim2real-transfer', 10, 5, 6],
  ['sim2real-transfer', 14, 4, 5],
  ['legged-locomotion', 2, 4, 5],
  ['legged-locomotion', 3, 5, 6],
  ['legged-locomotion', 4, 6, 7],
] as const;
const catalog = () => parseCompoundPlans(JSON.parse(text('audit/compound-evidence.json')));
const planId = (slug: string, ordinal: number) => `learned-locomotion-${slug}-${ordinal}-20260908`;
function selected(slug: string, ordinal: number) {
  const plan = catalog().find(p => p.id === planId(slug, ordinal));
  expect(plan, 'Each original requires its complete reviewed AND plan').toBeDefined();
  return structuredClone(plan!);
}
function failures(plan: ReturnType<typeof selected>) {
  const section = parseLedger('audit/rl-sim2real.md', text('audit/rl-sim2real.md'),
    new Set(CITATIONS.map(c => c.id)), {
      compoundPlans: catalog().map(p => p.id === plan.id ? plan : p),
      articleCitations: Object.fromEntries(['sim2real-transfer', 'legged-locomotion'].map(slug =>
        [slug, matter(text(`content/rl-sim2real/${slug}.mdx`)).data.citations])),
    }).find(s => s.slug === plan.articleSlug)!;
  return section.claimRecords[plan.rowOrdinal - 1].evidenceFailures;
}

describe('learned locomotion source corrections', () => {
  it('couples the two Hwangbo endpoints without a universal error ranking', () => {
    for (const slug of ['sim2real-transfer', 'legged-locomotion']) {
      const article = text(`content/rl-sim2real/${slug}.mdx`);
      expect(article).toContain('joint-position errors and velocities');
      expect(article).toContain('could not take a single step without falling');
      expect(article).not.toContain('dominant sim-to-real error source');
      expect(article).not.toContain('dominant source of sim-to-real error');
    }
    expect(text('content/rl-sim2real/sim2real-transfer.mdx')).toContain('0.01 and 0.02 seconds earlier');
    const legged = text('content/rl-sim2real/legged-locomotion.mdx');
    expect(legged).toContain('separately trained recovery policy');
    expect(legged).toContain('nine tested configurations');
    expect(legged).toContain('relaxing joint-velocity constraints');
  });
  it('couples Lee teacher, history and deployment qualifications', () => {
    for (const slug of ['sim2real-transfer', 'legged-locomotion']) {
      const article = text(`content/rl-sim2real/${slug}.mdx`);
      for (const phrase of ['actions and latent features', 'two seconds', 'command and current state',
        'ANYmal-B and ANYmal-C', 'environment-specific tuning']) expect(article).toContain(phrase);
      expect(article).not.toContain('perceived no terrain at all');
    }
    expect(text('content/rl-sim2real/legged-locomotion.mdx')).toContain('commanded off a cliff');
  });
  it('keeps Miki perception, deployment and detailed hike scope together', () => {
    const article = text('content/rl-sim2real/legged-locomotion.mdx');
    for (const phrase of ['GRU-based recurrent belief encoder', '20 Hz', '50 Hz',
      'Robosense Bpearl', 'Intel RealSense D435', '78 minutes', "planner's 76 minutes",
      'reattach a shoe and swap batteries', 'occluded cliffs or stepping stones']) expect(article).toContain(phrase);
    expect(article).toContain('<Stat label="Alpine hike" value="78 min"');
    expect(article).not.toContain('value="1 h" note="Miki');
  });
  it('preserves audited URLs while correcting literal metadata titles', () => {
    for (const [id, arxiv, title] of [
      ['hwangbo-2019', '1901.08652', 'Learning agile and dynamic motor skills for legged robots'],
      ['miki-2022', '2201.08117', 'Learning robust perceptive locomotion for quadrupedal robots in the wild'],
    ]) {
      const citation = CITATIONS.find(c => c.id === id)!;
      expect(citation.title).toBe(title);
      expect(citation.url).toBe(`https://arxiv.org/abs/${arxiv}`);
      expect(text('audit/citations.md')).toContain(`| ${id} | ${citation.url} |`);
    }
  });
  describe.each(members)('%s original %i', (slug, ordinal, parts, items) => {
    it('binds every required part and item to actual current review', () => {
      const p = selected(slug, ordinal);
      expect(p.parts).toHaveLength(parts);
      expect(p.evidence).toHaveLength(items);
      expect(p.planReview!.reviewedBy).toBe('agent:36dfbf8e-81df-46ca-a4e9-59126b61ee32/integrator');
      expect(p.planReview!.planDigest).toBe(compoundPlanDigest(p));
      for (const a of p.adjudications) expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      expect(failures(p)).toEqual([]);
    });
    it('rejects each omitted part or source item rather than granting partial credit', () => {
      for (const key of ['parts', 'evidence'] as const) {
        for (let i = 0; i < selected(slug, ordinal)[key].length; i++) {
          const p = selected(slug, ordinal);
          p[key].splice(i, 1);
          expect(failures(p).length).toBeGreaterThan(0);
        }
      }
    });
    it('rejects stale tuple, passage and adjudication bindings', () => {
      const stale = selected(slug, ordinal);
      stale.originalCellsDigest = '0'.repeat(64);
      expect(failures(stale).length).toBeGreaterThan(0);
      const changed = selected(slug, ordinal);
      changed.evidence[0].supportingPassage += ' invented continuation';
      expect(failures(changed).length).toBeGreaterThan(0);
      const omitted = selected(slug, ordinal);
      omitted.adjudications.splice(0, 1);
      expect(failures(omitted).length).toBeGreaterThan(0);
    });
  });
});
