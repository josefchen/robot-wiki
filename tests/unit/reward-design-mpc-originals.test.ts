import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger } from '../../lib/audit-ledger';

const ROOT = join(__dirname, '..', '..');
const ARTICLE = join(ROOT, 'content', 'rl-sim2real', 'reward-design-mpc.mdx');
const CITATIONS = join(ROOT, 'data', 'citations.ts');
const LEDGER = join(ROOT, 'audit', 'rl-sim2real.md');
const PLANS = join(ROOT, 'audit', 'compound-evidence.json');
const DELTAS = join(ROOT, 'contract', 'brand-v2-approved-deltas.json');

const ROW_ORDINALS = [1, 4, 5, 11, 14, 16, 19, 20, 21, 22, 23];

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

function sectionRows() {
  const parsed = parseLedger(
    'audit/rl-sim2real.md',
    readFileSync(LEDGER, 'utf8'),
    registryIds(),
    {
      compoundPlans: JSON.parse(readFileSync(PLANS, 'utf8') as unknown as string),
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

  it('all eleven selected rows carry complete evidence with no failures', () => {
    const rows = sectionRows();
    const ordered = rows.slice().sort((a, b) => a.line - b.line);
    for (const ordinal of ROW_ORDINALS) {
      const row = ordered[ordinal - 1];
      expect(row, `row ${ordinal} present`).toBeDefined();
      expect(row.evidenceFailures, `row ${ordinal} evidence failures`).toEqual([]);
      expect(row.compound?.structuralFailures ?? [], `row ${ordinal} structural`).toEqual([]);
      expect(row.compound?.adjudicationFailures ?? [], `row ${ordinal} adjudication`).toEqual([]);
      expect(['passing', 'recorded-inconsistency']).toContain(row.outcome);
    }
  });

  it('nine rows bind their exact compound plan; row 20 completes scalar evidence', () => {
    const ordered = sectionRows().slice().sort((a, b) => a.line - b.line);
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

  it('every new plan evidence item cites a registered id with a substantive passage', () => {
    const plans = JSON.parse(readFileSync(PLANS, 'utf8') as unknown as string) as Array<{
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
});
