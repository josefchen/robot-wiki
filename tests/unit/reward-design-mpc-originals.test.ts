import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadLocalBasisContext } from '../../lib/audit-local-basis';
import { publishedModules } from '../../data/modules';
import { parseLedger, parseCompoundPlans, originalClaimDigest } from '../../lib/audit-ledger';

const ROOT = join(__dirname, '..', '..');
const ARTICLE = join(ROOT, 'content', 'rl-sim2real', 'reward-design-mpc.mdx');
const CITATIONS = join(ROOT, 'data', 'citations.ts');
const LEDGER = join(ROOT, 'audit', 'rl-sim2real.md');
const PLANS = join(ROOT, 'audit', 'compound-evidence.json');
const DELTAS = join(ROOT, 'contract', 'brand-v2-approved-deltas.json');

const COMPLETE_ORDINALS = [1, 14, 16, 19, 20, 21, 22, 23];

const PLAN_BINDINGS: Record<number, string> = {
  1: 'reward-design-mpc-original-1-20260916',
  4: 'reward-design-mpc-original-4-20260916',
  5: 'reward-design-mpc-original-5-20260916',
  11: 'reward-design-mpc-original-11-20260916',
  14: 'reward-design-mpc-original-14-20260916',
  19: 'reward-design-mpc-original-19-20260916',
  21: 'reward-design-mpc-original-21-20260916',
  22: 'reward-design-mpc-original-22-20260916',
  23: 'reward-design-mpc-original-23-20260916',
};

function registryIds(): Set<string> {
  const src = readFileSync(CITATIONS, 'utf8');
  return new Set([...src.matchAll(/id: '([^']+)'/g)].map((m) => m[1]));
}

function frontmatterCitations(): Record<string, readonly string[]> {
  const article = readFileSync(ARTICLE, 'utf8');
  const fm = article.split('---')[1];
  const list = fm.split('citations:')[1].split('seeAlso:')[0];
  return {
    'reward-design-mpc': [...list.matchAll(/- ([\w-]+)/g)].map((m) => m[1]),
  };
}

const BEFORE_LOCAL = '2aaf0588f0b577fa5a8ea94f9139d0292d9ab433';
function historicalFile(path: string): string {
  return execFileSync('git', ['show', `${BEFORE_LOCAL}:${path}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function sectionRows(historical = false) {
  const parsed = parseLedger(
    'audit/rl-sim2real.md',
    historical ? historicalFile('audit/rl-sim2real.md') : readFileSync(LEDGER, 'utf8'),
    registryIds(),
    {
      compoundPlans: JSON.parse(historical ? historicalFile('audit/compound-evidence.json') : readFileSync(PLANS, 'utf8')),
      ...(!historical ? { localBasis: loadLocalBasisContext(ROOT, publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`)) } : {}),
      articleCitations: frontmatterCitations(),
    },
  );
  const section = parsed.find((s) => s.slug === 'reward-design-mpc');
  expect(section).toBeDefined();
  return section!.claimRecords;
}

describe('reward-design-mpc originals integration (packet bc05468c, 2026-09-16)', () => {
  it('row 19 endpoint drops the unsourced "pushes" claim and superlative', () => {
    const article = readFileSync(ARTICLE, 'utf8');
    expect(article).toContain('sim-trained controllers handle terrain, unknown payloads, and hardware variation');
    expect(article).toContain('beyond the reach of prior published work in legged locomotion (in the papers\' own words)');
    expect(article).not.toContain('pushes, and hardware variation that hand-designed stacks never achieved');
  });

  it('row 21 endpoint drops the contact-implicit import and the 2025-2026 span', () => {
    const article = readFileSync(ARTICLE, 'utf8');
    expect(article).toContain("Newton's hydroelastic contact modeling is inspired by Drake's contact model");
    expect(article).toContain('<Cite id="newton-manipulation-blog-2026" />');
    expect(article).not.toContain('spent 2025 and 2026 importing model-based contact research');
    expect(article).not.toContain('hydroelastic pressure fields and contact-implicit optimization');
  });

  it('adds newton-manipulation-blog-2026 to the frontmatter P1 population', () => {
    const article = readFileSync(ARTICLE, 'utf8');
    const fm = article.split('---')[1];
    expect(fm).toContain('- newton-manipulation-blog-2026');
  });

  it('the eight unaffected selected rows remain complete', () => {
    const rows = sectionRows();
    const ordered = rows.slice().sort((a, b) => a.line - b.line);
    for (const ordinal of COMPLETE_ORDINALS) {
      const row = ordered[ordinal - 1];
      expect(row, `row ${ordinal} present`).toBeDefined();
      expect(row.evidenceFailures, `row ${ordinal} evidence failures`).toEqual([]);
      expect(row.compound?.structuralFailures ?? [], `row ${ordinal} structural`).toEqual([]);
      expect(row.compound?.adjudicationFailures ?? [], `row ${ordinal} adjudication`).toEqual([]);
      expect(['passing', 'recorded-inconsistency']).toContain(row.outcome);
    }
  });

  it('preserves the historical nine exact compound bindings and row 20 scalar evidence', () => {
    const ordered = sectionRows(true).slice().sort((a, b) => a.line - b.line);
    for (const [ordinal, planId] of Object.entries(PLAN_BINDINGS)) {
      const row = ordered[Number(ordinal) - 1];
      expect(row.compound?.planId, `row ${ordinal} plan binding`).toBe(planId);
    }
    const row20 = ordered[19];
    expect(row20.compound).toBeUndefined();
    expect(row20.citationId).toBe('gemini-robotics-2-2026');
    expect(row20.sourceUrl).toBe(
      'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
    );
    expect(row20.supportingPassage).toContain('three different embodiments, using the same model checkpoint');
  });

  it('row 23 P1 batch covers the full post-correction frontmatter set', () => {
    const ordered = sectionRows().slice().sort((a, b) => a.line - b.line);
    const claim = ordered[22].claim;
    expect(claim).toMatch(/^Frontmatter citations resolve to the intended documents \(/);
    for (const id of [
      'rudin-2021', 'legged-gym-repo-2021', 'isaac-lab-2025', 'openai-rubiks-cube-2019',
      'eureka-2024', 'rda-2026', 'rewards-constraints-2024', 'gain-adaptation-2025',
      'stagewise-cmorl-2024', 'mujoco-ilqr-2026', 'lee-2020', 'miki-2022',
      'bd-spot-rl-2024', 'bd-atlas-lbm-2025', 'gemini-robotics-2-2026',
      'state-of-simulation-2026', 'newton-manipulation-blog-2026',
    ]) {
      expect(claim).toContain(id);
    }
  });

  it('adds eleven approved-delta entries for the applied rows', () => {
    const deltas = JSON.parse(readFileSync(DELTAS, 'utf8') as unknown as string);
    const ids = new Set(deltas.entries.map((e: { id: string }) => e.id));
    // The ten 2026-09-16 packet rows carry the rdm-rN-20260916-1 family.
    for (const ordinal of [1, 4, 5, 11, 14, 19, 20, 21, 22, 23]) {
      expect(ids.has(`rdm-r${ordinal}-20260916-1`), `delta rdm-r${ordinal}`).toBe(true);
    }
    // 2026-09-17b rdm16 re-preparation (packet convergence-source-ak-rdm16-reprep-20260917b).
    expect(ids.has('rdm16-r16-20260917-1')).toBe(true);
  });

  it('row 16 applies the 2026-09-17b rdm16 rewording under the frontmatter constraint', () => {
    const article = readFileSync(ARTICLE, 'utf8');
    expect(article).toContain('The classical stack for legged control is a hierarchy: a footstep and contact planner');
    expect(article).toContain('"model hierarchies commonly seen in traditional model-based MPC"');
    expect(article).toContain('"reduced-order models and hierarchical control approaches"');
    expect(article).toContain('<Cite id="mujoco-ilqr-2026" />');
    expect(article).not.toContain('three layers at three rates');
    expect(article).not.toContain('half-second to one-second horizon');
    expect(article).not.toContain('20 to 100 Hz');
    expect(article).not.toContain('500 to 1000 Hz');
  });

  it('row 16 completes as scalar mujoco-ilqr-2026 evidence with the frontmatter unchanged', () => {
    const ordered = sectionRows().slice().sort((a, b) => a.line - b.line);
    const row16 = ordered[15];
    expect(row16.claim).toContain('model hierarchies commonly seen in traditional model-based MPC');
    expect(row16.claim).toContain('full-order MPC was assumed too slow to run online');
    expect(row16.verdict.replace(/\*/g, '')).toBe('C');
    expect(row16.citationId).toBe('mujoco-ilqr-2026');
    expect(row16.sourceUrl).toBe('https://arxiv.org/html/2503.04613');
    expect(row16.supportingPassage).toContain('without the model hierarchies commonly seen in traditional model-based MPC');
    expect(row16.supportingPassage).toContain('reduced-order models and hierarchical control approaches');
    expect(row16.evidenceFailures).toEqual([]);
    expect(row16.compound).toBeUndefined();
    // HARD CONSTRAINT: the frontmatter citation set is unchanged (the 17 frozen ids).
    const ids = frontmatterCitations()['reward-design-mpc'];
    expect(ids).toHaveLength(17);
    expect(ids).toContain('mujoco-ilqr-2026');
    expect(ids).not.toContain('di-carlo-2018');
    // Row 23's frozen frontmatter-p1 plan must remain complete.
    const row23 = ordered[22];
    expect(row23.evidenceFailures).toEqual([]);
  });

  it('preserves historical evidence fields, including uncredited local-history items', () => {
    const plans = JSON.parse(historicalFile('audit/compound-evidence.json')) as Array<{
      id: string;
      evidence: Array<{ citationId: string; sourceUrl: string; supportingPassage: string }>;
    }>;
    const ids = registryIds();
    for (const planId of Object.values(PLAN_BINDINGS)) {
      const plan = plans.find((p) => p.id === planId);
      expect(plan, planId).toBeDefined();
      for (const item of plan!.evidence) {
        expect(ids.has(item.citationId), `${planId}:${item.citationId}`).toBe(true);
        expect(item.sourceUrl).toMatch(/^https?:\/\//);
        expect(item.supportingPassage.length).toBeGreaterThan(80);
      }
    }
  });
  it.each([
    {
        "originalId": "audit/rl-sim2real.md:reward-design-mpc:4",
        "ordinal": 4,
        "planId": "reward-design-mpc-original-4-20260916",
        "oldTuple": "4dc019817ebed19709a17b36b9d1f51ea8e10383a3f184d1d753ac7a04423807",
        "withdrawnReviewDigest": "068cde5e2d92e66d1374e3e1e84e6241935ad266a047505fd3d80af120a9ee1e"
    },
    {
        "originalId": "audit/rl-sim2real.md:reward-design-mpc:5",
        "ordinal": 5,
        "planId": "reward-design-mpc-original-5-20260916",
        "oldTuple": "3c8db752a64be1f2d3a7ee547338a104494cb3756600d0c3ae5b245f1bddf842",
        "withdrawnReviewDigest": "a92d42798b6ede5fdf91e84e64f16312625cd949bc9dce83fe8db94d7b9cc0a8"
    },
    {
        "originalId": "audit/rl-sim2real.md:reward-design-mpc:11",
        "ordinal": 11,
        "planId": "reward-design-mpc-original-11-20260916",
        "oldTuple": "da15c80d90a840bd40ff65f0eea90065fb9ef6d3f3bb55bd106da9254d90bef2",
        "withdrawnReviewDigest": "d0c00e345e5d5b43f948a306702d0eeb7def4f088fb8ce3a01fa8594a4072775"
    }
])('preserves the historical hold for $originalId and its withdrawn review history', ({ originalId, ordinal, planId, oldTuple, withdrawnReviewDigest }) => {
    const article = { claimRecords: sectionRows(true) };
    const markdown = readFileSync(LEDGER, 'utf8');
    const compoundPlans = parseCompoundPlans(JSON.parse(historicalFile('audit/compound-evidence.json')));
    const record = article.claimRecords[ordinal - 1];
    const plan = compoundPlans.find(p => p.id === planId)!;
    expect(record.compound?.planId).toBe(planId);
    expect(record.compound?.structuralFailures).toEqual([]);
    expect(plan.planReview).toBeNull();
    expect(plan.adjudications).toEqual([]);
    expect(record.evidenceFailures).toEqual([
      'compound plan review is missing or stale; changed/reduced plans need source-auditor review',
      'compound source adjudication coverage must equal every part without duplicates or extras',
    ]);
    expect(record.note).toContain('HELD: restored named authored-evidence hold');
    expect(plan.originalCellsDigest).toBe(originalClaimDigest(record));
    expect(plan.originalCellsDigest).not.toBe(oldTuple);
    // This archive is withdrawn history, never a fixture granting product credit.
    const marker = `<!-- named-hold-archive:start ${originalId} -->\n` + '```json\n';
    expect(markdown.split(marker)).toHaveLength(2);
    const archived = JSON.parse(markdown.split(marker)[1].split('\n```\n<!-- named-hold-archive:end -->')[0]);
    expect(archived.originalId).toBe(originalId);
    expect(archived.planId).toBe(planId);
    expect(originalClaimDigest(archived.originalCells)).toBe(oldTuple);
    expect(record.claim).toBe(archived.originalCells.claim);
    expect(record.sourceChecked).toBe(archived.originalCells.sourceChecked);
    expect(record.verdict).toBe(archived.originalCells.verdict);
    expect(record.note).toContain(archived.originalCells.note);
    expect(createHash('sha256').update(JSON.stringify([
      archived.planReview, archived.adjudications,
    ])).digest('hex')).toBe(withdrawnReviewDigest);
    expect(archived.planReview).not.toBeNull();
    expect(archived.adjudications).toHaveLength(plan.parts.length);
  });

  it('preserves genuine authored-example disclosures without claiming paper proof', () => {
    const article = readFileSync(ARTICLE, 'utf8');
    const reward = readFileSync(join(ROOT, 'lib/reward-shaping.ts'), 'utf8');
    const controls = readFileSync(join(ROOT, 'components/interactive/reward-shaping.tsx'), 'utf8');
    const replay = readFileSync(join(ROOT, 'components/interactive/eureka-loop.tsx'), 'utf8');
    expect(article).toContain('Twelve weighted terms sit on the illustrative behavior preview below');
    expect(controls).toContain('TERMS.map');
    expect(reward.replace(/\n\s*\*\s?/g, ' ')).toContain('illustrative failure attractors (freeze, prance, chatter)');
    expect(replay).toContain('Scripted replay of the Eureka loop');
    expect(replay).toContain('not a recording of a real Eureka run');
  });
});
