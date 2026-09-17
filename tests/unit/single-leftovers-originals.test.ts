import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-17a single-leftovers 4-row integration: the four applied
 * rows (frontier reliability-gap:6 editorial Stat correction bound to its
 * editorial-basis compound plan; frontier generalization:17 and bear-case:12
 * scalar Goldberg evidence completions; classical scene-representation:1
 * 24-identity sweep bound to its compound plan) must parse complete from the
 * committed ledger and catalog exactly as check-audit-coverage reads them.
 * The packet's fifth record (rl-sim2real reward-design-mpc:16) was EXCLUDED
 * by that dispatch (frontmatter-p1 coupling with complete row 23); the
 * 2026-09-17b re-preparation (convergence-source-ak-rdm16-reprep-20260917b)
 * later applied it under the NO-NEW-FRONTMATTER-ID constraint: the inline
 * cite reuses the already-declared mujoco-ilqr-2026, no di-carlo-2018 is
 * introduced anywhere, and row 23 stays complete.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = '547e1cd7688de34652ea2ea1a8920236bd0dbf40d813a098bbb998405ef6850c';
const R6_PLAN = 'reliability-gap-r6-editorial-solvedbar-20260917a';
const SR_PLAN = 'scene-representation-1-identity-sweep-20260917a';
const SWEEP_URL = 'https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/';

const registryIds = new Set(CITATIONS.map(({ id }) => id));
const loadPlans = () =>
  parseCompoundPlans(
    JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
  );
/** Frontmatter citations of one article, as check-audit-coverage derives them. */
const declaredCitations = (domain: string, slug: string) => {
  const lines = readFileSync(join(ROOT, 'content', domain, `${slug}.mdx`), 'utf8').split('\n');
  const start = lines.findIndex((line) => /^citations:/.test(line));
  expect(start, `${slug} frontmatter citations block`).toBeGreaterThan(-1);
  const ids: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const match = /^  - (\S+)$/.exec(line);
    if (!match) break;
    ids.push(match[1]);
  }
  return ids;
};
const sectionsOf = (ledgerPath: string) => {
  const compoundPlans = loadPlans();
  // frontmatter-p1 plans (e.g. reward-design-mpc:23) need the canonical
  // frontmatter context or they structurally fail; supply it exactly as
  // scripts/check-audit-coverage.ts does.
  const domain = ledgerPath === 'audit/rl-sim2real.md' ? 'rl-sim2real'
    : ledgerPath === 'audit/classical.md' ? 'classical' : 'frontier';
  const articleCitations: Record<string, readonly string[]> = {};
  for (const plan of compoundPlans) {
    if (plan.ledgerPath === ledgerPath && plan.kind === 'frontmatter-p1') {
      articleCitations[plan.articleSlug] = declaredCitations(domain, plan.articleSlug);
    }
  }
  return parseLedger(ledgerPath, readFileSync(join(ROOT, ledgerPath), 'utf8'), registryIds, {
    compoundPlans,
    articleCitations,
  });
};

describe('single-leftovers 4-row integration (2026-09-17a)', () => {
  it('applies the reliability-gap:6 editorial correction with its editorial-basis plan', () => {
    const reliability = sectionsOf('audit/frontier.md').find((s) => s.slug === 'reliability-gap')!;
    const r6 = reliability.claimRecords[5];
    expect(r6.claim).toContain('this wiki\u2019s proposal');
    expect(r6.claim).toContain('none of the deployed systems surveyed publishes one');
    expect(r6.verdict.replace(/\*/g, '')).toBe('C');
    expect(r6.citationId).toBe('');
    expect(r6.sourceUrl).toBe('');
    expect(r6.compound?.planId).toBe(R6_PLAN);
    expect(r6.compound?.structuralFailures ?? ['missing']).toEqual([]);
    expect(r6.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
    expect(r6.evidenceFailures).toEqual([]);
    expect(r6.note).toContain('this wiki\u2019s own proposed yardstick');
    expect(r6.note).toContain('deployed systems we surveyed');

    const plan = loadPlans().find((p) => p.id === R6_PLAN)!;
    expect(plan.kind).toBe('explicit-parts');
    expect(plan.parts).toHaveLength(2);
    expect(plan.parts.map((part) => part.requiredCitationIds[0])).toEqual([
      'technology-org-deployed-2026',
      'technology-org-deployed-2026',
    ]);
    for (const item of plan.evidence) {
      expect(item.citationId).toBe('technology-org-deployed-2026');
      expect(item.sourceUrl).toBe(SWEEP_URL);
      expect(item.supportingPassage).toContain('Tesla has passed 50,000 cumulative Optimus units');
    }
    expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
    expect(plan.planReview?.rationale).toContain(PACKET_SHA);
  });

  it('rewords the solved-bar Stat in the article exactly as prepared', () => {
    const article = readFileSync(join(ROOT, 'content/frontier/reliability-gap.mdx'), 'utf8');
    expect(article).toContain(
      '<Stat label="solved bar (this wiki\u2019s)" value=">1,000h" note="our proposed yardstick: documented MTBF; none of the deployed systems we surveyed publishes one" />',
    );
    expect(article).not.toContain('note="documented MTBF; no system publishes one"');
  });

  it('completes generalization:17 as scalar Goldberg evidence without a plan binding', () => {
    const generalization = sectionsOf('audit/frontier.md').find((s) => s.slug === 'generalization')!;
    const g17 = generalization.claimRecords[16];
    expect(g17.citationId).toBe('goldberg-data-gap-2025');
    expect(g17.sourceUrl).toBe('https://api.crossref.org/works/10.1126/scirobotics.aea7390');
    expect(g17.sourceChecked).toContain('news.berkeley.edu/2025/08/27/are-we-truly-on-the-verge-of-the-humanoid-robot-revolution/');
    expect(g17.sourceChecked).toContain('techxplore.com mirror (pdf and html variants) answered GET 403');
    expect(g17.supportingPassage).toContain('Good old-fashioned engineering can close the 100,000-year');
    expect(g17.supportingPassage).toContain('They say that data is all we need');
    expect(g17.verdict.replace(/\*/g, '')).toBe('V');
    expect(g17.compound).toBeUndefined();
    expect(g17.evidenceFailures).toEqual([]);
  });

  it('completes bear-case:12 as scalar Goldberg evidence without a plan binding', () => {
    const bear = sectionsOf('audit/frontier.md').find((s) => s.slug === 'bear-case')!;
    const b12 = bear.claimRecords[11];
    expect(b12.citationId).toBe('goldberg-data-gap-2025');
    expect(b12.sourceUrl).toBe('https://api.crossref.org/works/10.1126/scirobotics.aea7390');
    expect(b12.note).toContain('this wiki\u2019s own ranking');
    expect(b12.verdict.replace(/\*/g, '')).toBe('V');
    expect(b12.compound).toBeUndefined();
    expect(b12.evidenceFailures).toEqual([]);
  });

  it('binds the scene-representation:1 sweep to its 24-identity plan', () => {
    const scene = sectionsOf('audit/classical.md').find((s) => s.slug === 'scene-representation')!;
    const sr1 = scene.claimRecords[0];
    expect(sr1.claim).toContain('Bibliographic fidelity of all 24 cited registry entries');
    expect(sr1.claim).not.toContain('all 23 cited registry entries');
    expect(sr1.sourceChecked).toContain('Fresh 24-identity sweep');
    expect(sr1.citationId).toBe('');
    expect(sr1.compound?.planId).toBe(SR_PLAN);
    expect(sr1.compound?.structuralFailures ?? ['missing']).toEqual([]);
    expect(sr1.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
    expect(sr1.evidenceFailures).toEqual([]);

    const plan = loadPlans().find((p) => p.id === SR_PLAN)!;
    expect(plan.kind).toBe('explicit-parts');
    expect(plan.parts).toHaveLength(24);
    expect(new Set(plan.parts.map((part) => part.requiredCitationIds[0])).size).toBe(24);
    expect(plan.evidence).toHaveLength(24);
    expect(plan.adjudications.every((review) => review.outcome === 'supported')).toBe(true);
    const declared = declaredCitations('classical', 'scene-representation');
    expect(declared).toHaveLength(24);
    expect([...new Set(plan.parts.map((part) => part.requiredCitationIds[0]))].sort())
      .toEqual([...new Set(declared)].sort());
    for (const item of plan.evidence) {
      const registered = CITATIONS.find(({ id }) => id === item.citationId)!;
      expect(item.sourceUrl).toBe(registered.url);
      expect(item.supportingPassage).toContain(item.citationId);
    }
    expect(sr1.note).toContain('All 24 verify with disclosed channels');
    expect(sr1.sourceChecked).toContain('24/24 verified, disclosures per part');
    expect(sr1.note).toContain('Albert0');
    // The sibling held row (10) stays unbound and incomplete.
    const sr10 = scene.claimRecords[9];
    expect(sr10.compound?.planId ?? '').toBe('');
    expect(sr10.evidenceFailures.length).toBeGreaterThan(0);
  });

  it('records the 2026-09-17b rdm16 re-preparation now applied to reward-design-mpc:16', () => {
    // The re-prepared packet (convergence-source-ak-rdm16-reprep-20260917b) reworded
    // the row-16 span under the NO-NEW-FRONTMATTER-ID constraint: the inline cite
    // reuses the already-declared mujoco-ilqr-2026, so this lane's 2026-09-17a
    // exclusion is superseded and the row is complete.
    const reward = sectionsOf('audit/rl-sim2real.md').find((s) => s.slug === 'reward-design-mpc')!;
    const row16 = reward.claimRecords[15];
    expect(row16.claim).toContain('model hierarchies commonly seen in traditional model-based MPC');
    expect(row16.verdict.replace(/\*/g, '')).toBe('C');
    expect(row16.citationId).toBe('mujoco-ilqr-2026');
    expect(row16.evidenceFailures).toEqual([]);
    expect(row16.compound).toBeUndefined();
    const article = readFileSync(join(ROOT, 'content/rl-sim2real/reward-design-mpc.mdx'), 'utf8');
    expect(article).not.toContain('<Cite id="di-carlo-2018"');
    expect(article).not.toMatch(/^\s*- di-carlo-2018$/m);
    expect(article).not.toContain('half-second to one-second horizon');
    // Row 23's frozen frontmatter-p1 plan must remain complete (17 ids).
    const row23 = reward.claimRecords[22];
    expect(row23.evidenceFailures).toEqual([]);
  });

  it('reuses the registered citations read-only with no new registration', () => {
    for (const id of ['technology-org-deployed-2026', 'goldberg-data-gap-2025', 'di-carlo-2018']) {
      expect(CITATIONS.filter(({ id: cid }) => cid === id)).toHaveLength(1);
    }
    const sweep = CITATIONS.find(({ id }) => id === 'technology-org-deployed-2026')!;
    expect(sweep.url).toBe(SWEEP_URL);
    const goldberg = CITATIONS.find(({ id }) => id === 'goldberg-data-gap-2025')!;
    expect(goldberg.url).toBe('https://doi.org/10.1126/scirobotics.aea7390');
  });
});
