import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { moduleFrontmatterSchema } from '../../data/schemas/module.ts';
import { CITATIONS } from '../../data/citations.ts';
import { GAITS, GAIT_ORDER, DEFAULT_GAIT } from '../../lib/gait.ts';

/**
 * Pins the 2026-09-16i legged-locomotion originals integration: the one
 * dispatched rl-sim2real/legged-locomotion row (original 8, the duty-factor
 * disclaimer sentence) must bind to its compound plan and parse complete
 * (no evidence failures) with supported adjudications for BOTH conjuncts of
 * its local-AND (repo-authored gait constants + the retained Park 2017
 * classical-instance material reused read-only from the applied row-7 plan),
 * from the committed ledger and catalog exactly as check-audit-coverage
 * reads them. The held rows 1 and 6 (paywalled Choi Science Robotics), 17
 * (authored-toy schema family) and 18 (stale frontmatter-P1 claim cell) stay
 * incomplete, and every other row keeps its pre-existing evidence state.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = 'd80e6e2cf65a50321968b408ec66ece06d165a492331d2ae9cdd763c76871f37';
const PLAN_ID = 'legged-locomotion-8-duty-factor-disclaimer-20260916i';
const PARK_URL = 'https://journals.sagepub.com/doi/10.1177/0278364917694244';
const EXPECTED_20260916I: Readonly<Record<number, string>> = {
  8: PLAN_ID,
};
const PRE_EXISTING_PLANS: Readonly<Record<number, string>> = {
  2: 'learned-locomotion-legged-locomotion-2-20260908',
  3: 'learned-locomotion-legged-locomotion-3-20260908',
  4: 'learned-locomotion-legged-locomotion-4-20260908',
  5: 'rudin-protocol-writer-legged-locomotion-5-20260909',
  7: 'locomotion-park7-20260915-legged-locomotion-7',
  9: 'humanoid-motion-legged-locomotion-9-20260908',
  10: 'humanoid-motion-legged-locomotion-10-20260908',
  11: 'reward-evaluation-mpc-legged-locomotion-11',
  12: 'boston-control-20260908-legged-locomotion-12',
  13: 'boston-control-20260908-legged-locomotion-13',
  14: 'boston-control-20260908-legged-locomotion-14',
  15: 'boston-control-20260908-legged-locomotion-15',
  16: 'boston-control-20260908-legged-locomotion-16',
};

const loadSection = () => {
  const markdown = readFileSync(join(ROOT, 'audit/rl-sim2real.md'), 'utf8');
  const compoundPlans = parseCompoundPlans(
    JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
  );
  const registryIds = new Set(CITATIONS.map(({ id }) => id));
  // canonical frontmatter for this ledger's frontmatter-p1 plans, exactly
  // as check-audit-coverage supplies it: without it the P1 row's required
  // set cannot reconcile and the derived summary legitimately differs
  const articleCitations: Record<string, readonly string[]> = {};
  for (const plan of compoundPlans.filter((entry) =>
    entry.ledgerPath === 'audit/rl-sim2real.md' && entry.kind === 'frontmatter-p1')) {
    const file = join(ROOT, 'content', 'rl-sim2real', `${plan.articleSlug}.mdx`);
    const frontmatter = moduleFrontmatterSchema.parse(matter(readFileSync(file, 'utf8')).data);
    articleCitations[plan.articleSlug] = frontmatter.citations;
  }
  const sections = parseLedger('audit/rl-sim2real.md', markdown, registryIds, {
    compoundPlans,
    articleCitations,
  });
  return { sections, compoundPlans, registryIds, markdown };
};

describe('legged-locomotion originals integration (2026-09-16i row-8 correction)', () => {
  it('binds the applied row to complete compound evidence', () => {
    const { sections, compoundPlans } = loadSection();
    const article = sections.find((section) => section.slug === 'legged-locomotion');
    expect(article).toBeDefined();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916I)) {
      const record = article!.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
      expect(record.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
      expect(record.evidenceFailures).toEqual([]);
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.adjudications.map((a) => a.outcome)).toEqual(
        plan.parts.map(() => 'supported'),
      );
      // compound rows must not mix scalar evidence cells with paired items
      for (const item of plan.evidence) {
        expect(item.citationId).not.toBe('');
        expect(item.sourceUrl).toMatch(/^https?:\/\//);
        expect(item.supportingPassage.length).toBeGreaterThan(20);
      }
    }
    // the regenerated accounting summary parses clean alongside the change
    expect(sections.every((section) => section.summaryFailures.length === 0)).toBe(true);
  });

  it('keeps every undispatched row in its pre-existing evidence state', () => {
    const { sections } = loadSection();
    const article = sections.find((section) => section.slug === 'legged-locomotion')!;
    // rows 2-5, 7, 9-16: pre-existing compound plans, untouched and complete
    for (const [ordinal, planId] of Object.entries(PRE_EXISTING_PLANS)) {
      const record = article.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.evidenceFailures).toEqual([]);
    }
    // rows 1, 6, 17, 18 stay honestly HELD per the dispatch:
    // 1 and 6 need the paywalled Choi Science Robotics primary (x2);
    // 17 is the authored-toy schema family (compoundPlanSchema
    // requiredCitationIds min(1) on an internal interactive row);
    // 18's frontmatter-P1 claim cell is stale (lists 12 ids; article
    // frontmatter now carries 13), so the prepared batch cannot bind.
    for (const ordinal of [1, 6, 17, 18]) {
      const record = article.claimRecords[ordinal - 1];
      expect(record.compound?.planId ?? '').toBe('');
      expect(record.evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('corrects the verdict with the retained Park instance and the local AND recorded', () => {
    const { sections, compoundPlans } = loadSection();
    const article = sections.find((section) => section.slug === 'legged-locomotion')!;
    const r8 = article.claimRecords[7];
    expect(r8.claim).toBe('"The duty factors shown here are canonical nominal values; real controllers, classical and learned alike, modulate duty factor continuously with speed"');
    expect(r8.verdict).toContain('corrected');
    // source cell: registered citation id + URL, the preparer's live 403
    // re-probe timestamp, retention from the applied row-7 plan, local AND
    expect(r8.sourceChecked).toContain('park-2017-bounding');
    expect(r8.sourceChecked).toContain(PARK_URL);
    expect(r8.sourceChecked).toContain('403 at 2026-09-16T14:29:07Z');
    expect(r8.sourceChecked).toContain('locomotion-park7-20260915-legged-locomotion-7');
    expect(r8.sourceChecked).toContain('local AND: lib/gait.ts authored constants');
    // note: authored constants, ONE classical instance, learned side kept
    // as the article's framing rather than a Park attribution
    expect(r8.note).toContain('authored fixed duty factors walk 0.75 / trot 0.50 / bound 0.45 / pronk 0.35');
    expect(r8.note).toContain("Sec. 4.3 'Duty cycle modulation via vertical impulse scaling'");
    expect(r8.note).toContain('speed-dependent stride length below 3 m/s');
    expect(r8.note).toContain('not a claim about all classical or learned controllers');
    expect(r8.note).toContain("the article's induction over the air-time reward discussion");
    const plan = compoundPlans.find((p) => p.id === PLAN_ID)!;
    expect(plan.parts.map((part) => part.id)).toEqual([
      'l8-classical-instance', 'l8-authored-values-local-AND',
    ]);
    for (const part of plan.parts) {
      expect(part.requiredCitationIds).toEqual(['park-2017-bounding']);
    }
    expect(plan.evidence.find((e) => e.partId === 'l8-classical-instance')!
      .supportingPassage).toContain("Sec. 4.3 is literally titled 'Duty cycle modulation via vertical impulse scaling'");
    expect(plan.evidence.find((e) => e.partId === 'l8-classical-instance')!
      .supportingPassage).toContain('Park §7 uses speed-dependent stride length below 3 m/s');
    const localAnd = plan.evidence.find((e) => e.partId === 'l8-authored-values-local-AND')!;
    expect(localAnd.supportingPassage).toContain('lib/gait.ts GAITS (walk 0.75 / trot 0.5 / bound 0.45 / pronk 0.35)');
    expect(localAnd.supportingPassage).toContain('components/interactive/gait-diagram.tsx');
    expect(localAnd.supportingPassage).toContain('line 35');
    expect(localAnd.supportingPassage).toContain('line 64');
    expect(localAnd.supportingPassage).toContain('<Cite id="park-2017-bounding" />');
    expect(plan.adjudications.map((a) => a.partId)).toEqual([
      'l8-classical-instance', 'l8-authored-values-local-AND',
    ]);
  });

  it('pins the local-AND facts at the repo surface the row scopes', () => {
    // the "canonical nominal values" of the audited sentence are these
    // authored lib/gait.ts constants, not paper measurements
    expect(GAITS.walk.dutyFactor).toBe(0.75);
    expect(GAITS.walk.offsets).toEqual({ lh: 0, lf: 0.25, rh: 0.5, rf: 0.75 });
    expect(GAITS.trot.dutyFactor).toBe(0.5);
    expect(GAITS.trot.offsets).toEqual({ lf: 0, rh: 0, rf: 0.5, lh: 0.5 });
    expect(GAITS.bound.dutyFactor).toBe(0.45);
    expect(GAITS.bound.offsets).toEqual({ lf: 0, rf: 0, lh: 0.5, rh: 0.5 });
    expect(GAITS.pronk.dutyFactor).toBe(0.35);
    expect(GAITS.pronk.offsets).toEqual({ lf: 0, rf: 0, lh: 0, rh: 0 });
    expect(GAIT_ORDER).toEqual(['walk', 'trot', 'bound', 'pronk']);
    expect(DEFAULT_GAIT).toBe('walk');
    // the diagram renders exactly these duty factors in its readout
    const diagram = readFileSync(
      join(ROOT, 'components/interactive/gait-diagram.tsx'), 'utf8');
    expect(diagram).toContain('data-testid="duty-readout"');
    expect(diagram).toContain('formatDuty(gait.dutyFactor)');
    // the article mounts the diagram and carries the audited disclaimer
    // sentence with the registered Park citation on the span
    const mdx = readFileSync(
      join(ROOT, 'content/rl-sim2real/legged-locomotion.mdx'), 'utf8');
    expect(mdx).toContain('<GaitDiagram className="my-6" />');
    expect(mdx).toContain('The duty factors shown here are canonical nominal values; real controllers, classical and learned alike, modulate duty factor continuously with speed <Cite id="park-2017-bounding" />');
  });

  it('reuses the registered citation with no new registrations', () => {
    expect(CITATIONS.filter((c) => c.id === 'park-2017-bounding')).toHaveLength(1);
    const park = CITATIONS.find((c) => c.id === 'park-2017-bounding')!;
    expect(park.url).toBe(PARK_URL);
    expect(park.title).toBe('High-Speed Bounding with the MIT Cheetah 2: Control Design and Experiments');
    expect(park.authors).toEqual(['Hae-Won Park', 'Patrick M. Wensing', 'Sangbae Kim']);
    expect(park.year).toBe(2017);
  });

  it('records integrator plan review on the 20260916i plan', () => {
    const { compoundPlans } = loadSection();
    const plan = compoundPlans.find((p) => p.id === PLAN_ID)!;
    expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
    expect(plan.planReview?.rationale).toContain(PACKET_SHA);
  });
});
