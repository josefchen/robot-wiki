import { readFileSync, readdirSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { compoundPartDigest, compoundPlanDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';
import { RUDIN_MARKERS } from '../../lib/parallel-sim';

const text = (path: string) => readFileSync(path, 'utf8');
const ledgerPath = 'audit/rl-sim2real.md';
const planIds = ['parallel-sim-rl-2', 'legged-locomotion-5', 'reward-design-mpc-2']
  .map(id => `rudin-protocol-writer-${id}-20260909`);
const registry = new Set(CITATIONS.map(c => c.id));
const selected = (id: string) => {
  const plan = parseCompoundPlans(JSON.parse(text('audit/compound-evidence.json'))).find(p => p.id === id);
  expect(plan, 'the whole corrected original needs its own reviewed native plan').toBeDefined();
  return structuredClone(plan!);
};
const failures = (plan: ReturnType<typeof selected>) => {
  const plans = parseCompoundPlans(JSON.parse(text('audit/compound-evidence.json')))
    .map(p => p.id === plan.id ? plan : p);
  const section = parseLedger(ledgerPath, text(ledgerPath), registry, { compoundPlans: plans, articleCitations: Object.fromEntries(readdirSync('content/rl-sim2real').filter(f => f.endsWith('.mdx')).map(f => [f.slice(0, -4), matter(text('content/rl-sim2real/' + f)).data.citations])) })
    .find(s => s.slug === plan.articleSlug)!;
  return section.claimRecords[plan.rowOrdinal - 1].evidenceFailures;
};

describe('Rudin protocol and code integration', () => {
  it.each(['parallel-sim-rl', 'legged-locomotion'])('separates the flat headline from the documented policy in %s', slug => {
    const article = text(`content/rl-sim2real/${slug}.mdx`);
    for (const phrase of ['Separately', '98,304 RL transitions', '24 steps per robot', '1,500 policy updates', 'i9-11900k', 'RTX A6000', 'random level']) expect(article).toContain(phrase);
    expect(article).not.toMatch(/most (subsequent legged-RL|legged-robot groups)/);
    expect(article).toContain('  - legged-gym-repo-2021');
  });
  it('labels time bounds without changing teaching coordinates', () => {
    expect(RUDIN_MARKERS.map(m => [m.envs, m.minutes])).toEqual([[4096, 4], [4096, 20]]);
    expect(RUDIN_MARKERS[0].label).toContain('illustrative');
    expect(RUDIN_MARKERS[1].label).toContain('< 20');
    for (const path of ['components/interactive/training-time-chart.tsx', 'lib/chart-descriptions.ts'])
      expect(text(path)).toContain('not a source-established flat-run environment count');
  });
  it('distinguishes paper, base config, functions and local teaching terms', () => {
    const article = text('content/rl-sim2real/reward-design-mpc.mdx');
    for (const phrase of ['nine reward terms', 'fifteen entries', 'nine are nonzero', '_prepare_reward_function', '_reward_stumble', 'not a universal or production reward recipe', 'teaching choices']) expect(article).toContain(phrase);
    expect(article).not.toContain('every locomotion team');
    expect(article).toContain('This mechanism does not establish that reward retuning is stable.');
    expect(text('components/interactive/reward-shaping.tsx')).toContain('not a source configuration');
    expect(text('lib/reward-shaping.ts')).not.toContain('destroy a real actuator');
    expect(text('components/interactive/reward-shaping.tsx')).toContain('No policy is trained here.');
  });
  it('couples exact code identity and the shared curriculum qualification', () => {
    const code = CITATIONS.find(c => c.id === 'legged-gym-repo-2021')!;
    expect(code.title).toBe('Isaac Gym Environments for Legged Robots');
    expect(code.authors).toEqual(['Nikita Rudin']);
    // The landing URL was fetched; the pinned files were reconstructed from
    // the commit API, not fetched at their blob URLs. Keep those facts distinct.
    expect(code.url).toBe('https://github.com/leggedrobotics/legged_gym');
    expect(text('audit/citations.md')).toContain(`| legged-gym-repo-2021 | ${code.url} |`);
    const identity = selected(planIds[2]).evidence.find(e => e.partId === 'code-identity')!;
    expect(identity.sourceUrl).toBe('https://api.github.com/repos/leggedrobotics/legged_gym/commits/ae614c029977157123225f538ecdd3f873e54bd4?per_page=100');
    expect(identity.supportingPassage).toContain('Isaac Gym Environments for Legged Robots');
    expect(identity.supportingPassage).toContain('**Maintainer**: Nikita Rudin');
    expect(GLOSSARY.find(g => g.id === 'curriculum-learning')!.definition).toContain('separate flat-terrain headline');
  });
  it('allows the exact long revision token to wrap without changing its value', () => {
    for (const [slug, ids] of [
      ['parallel-sim-rl', ['legged-gym-repo-2021']],
      ['legged-locomotion', ['rudin-2021', 'legged-gym-repo-2021']],
      ['reward-design-mpc', ['rudin-2021']],
    ] as const) {
      const article = text(`content/rl-sim2real/${slug}.mdx`);
      for (const id of ids) expect(article).toContain(
        `<span className="max-sm:[&_[role=tooltip]]:-left-32"><Cite id="${id}" /></span>`,
      );
    }
    expect(text('content/rl-sim2real/reward-design-mpc.mdx')).toContain(
      '<code className="[overflow-wrap:anywhere]">ae614c029977157123225f538ecdd3f873e54bd4</code>',
    );
  });
  describe.each(planIds)('%s conjunction and stale-review guards', id => {
    it('binds six required parts and seven paired items to actual writer review', () => {
      const p = selected(id);
      expect(p.parts).toHaveLength(6);
      expect(p.evidence).toHaveLength(7);
      expect(p.planReview!.reviewedBy).toBe('agent:1b3af60d-fb3e-480f-a39e-d86c84a6adf8/integrator');
      expect(p.planReview!.planDigest).toBe(compoundPlanDigest(p));
      for (const a of p.adjudications) expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      expect(failures(p)).toEqual([]);
    });
    it('rejects each individually omitted evidence item', () => {
      for (let i = 0; i < 7; i++) {
        const p = selected(id);
        p.evidence.splice(i, 1);
        expect(failures(p).length).toBeGreaterThan(0);
      }
    });
    it('rejects passage mutation and stale current tuple', () => {
      const p = selected(id);
      p.evidence[0].supportingPassage += ' fabricated claim';
      expect(failures(p).length).toBeGreaterThan(0);
      const q = selected(id);
      q.originalCellsDigest = '0'.repeat(64);
      expect(failures(q).length).toBeGreaterThan(0);
    });
    it('rejects removing each required part without renewed whole-claim review', () => {
      for (let i = 0; i < 6; i++) {
        const p = selected(id);
        p.parts.splice(i, 1);
        expect(failures(p).length).toBeGreaterThan(0);
      }
    });
  });
});
