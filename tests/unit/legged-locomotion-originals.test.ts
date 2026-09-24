import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import matter from 'gray-matter';
import { parseLedger, parseCompoundPlans, originalClaimDigest } from '../../lib/audit-ledger.ts';
import { moduleFrontmatterSchema } from '../../data/schemas/module.ts';
import { CITATIONS } from '../../data/citations.ts';
import { GAITS, GAIT_ORDER, DEFAULT_GAIT } from '../../lib/gait.ts';
import { loadLocalBasisContext } from '../../lib/audit-local-basis';
import { publishedModules } from '../../data/modules';
import { currentAuditContext, finalSevenBefore, finalSevenPriorPlans } from '../helpers/residual-integration';
import { committedJson, committedText } from '../helpers/editorial-current-context';

/**
 * Pins the 2026-09-16i legged-locomotion originals integration: the one
 * dispatched rl-sim2real/legged-locomotion row (original 8, the duty-factor
 * disclaimer sentence) retains its binding but is held, with withdrawn
 * review/adjudications and uncredited historical material for BOTH conjuncts of
 * its local-AND (repo-authored gait constants + the retained Park 2017
 * classical-instance material reused read-only from the applied row-7 plan),
 * from the committed ledger and catalog exactly as check-audit-coverage
 * reads them. The held row 17 (authored-toy schema family) stays incomplete,
 * and every other row keeps its pre-existing evidence state. Rows 1 and 6
 * completed in this tree's 20260917a paywall pass (Choi abstract via the
 * publicly printed render); row 18 had completed earlier in the same-day
 * frontmatter-sweep integration.
 */
const ROOT = join(import.meta.dirname, '../..');
const PLAN_ID = 'legged-locomotion-8-duty-factor-disclaimer-20260916i';
const PARK_URL = 'https://journals.sagepub.com/doi/10.1177/0278364917694244';
const heldCommit = '5c48b2eb362be0a7e0fad87855740a208a258647';
const heldLedger = committedText(heldCommit, 'audit/rl-sim2real.md');
const heldPlans = parseCompoundPlans(committedJson<unknown>(heldCommit, 'audit/compound-evidence.json'));
const typed = JSON.parse(readFileSync(join(ROOT, 'audit/local-basis.json'), 'utf8')).plans as Array<{
  id: string; originalId: string; currentTupleDigest: string; parts: unknown[];
}>;
const currentTyped = (ordinal: number) => typed.find(p =>
  p.originalId === `audit/rl-sim2real.md:legged-locomotion:${ordinal}`)!;
const heldRow8 = () => parseLedger('audit/rl-sim2real.md', heldLedger,
  new Set(CITATIONS.map(({ id }) => id)), { compoundPlans: heldPlans })
  .find(s => s.slug === 'legged-locomotion')!.claimRecords[7];
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

const loadSection = (historical = false) => {
  const markdown = historical ? finalSevenBefore('audit/rl-sim2real.md')
    : readFileSync(join(ROOT, 'audit/rl-sim2real.md'), 'utf8');
  const compoundPlans = historical ? finalSevenPriorPlans() : parseCompoundPlans(
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
  const localBasis = loadLocalBasisContext(ROOT, publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`));
  if (historical) {
    // Do not combine archived compound bindings with their typed replacements.
    // Only final-seven plans postdate this pinned ledger.
    localBasis.catalog.plans = localBasis.catalog.plans.filter(p => !p.id.startsWith('final-seven-'));
    localBasis.catalog.proofs = localBasis.catalog.proofs.filter(p => !p.planId.startsWith('final-seven-'));
  }
  const sections = parseLedger('audit/rl-sim2real.md', markdown, registryIds, {
    compoundPlans,
    articleCitations,
    localBasis,
  });
  return { sections, compoundPlans, registryIds, markdown };
};

describe('legged-locomotion originals integration (2026-09-16i row-8 correction)', () => {
  it('preserves the historical held row binding, partial evidence and truthful summary', () => {
    const { sections, compoundPlans } = loadSection(true);
    const article = sections.find((section) => section.slug === 'legged-locomotion');
    expect(article).toBeDefined();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916I)) {
      const record = article!.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
      expect(record.evidenceFailures.length).toBeGreaterThan(0);
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview).toBeNull();
      expect(plan.adjudications).toEqual([]);
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
    // row 18 completed by the 20260917a frontmatter-sweep integration before
    // this pass (stale pin repaired: it is no longer held)
    const r18 = article.claimRecords[17];
    expect(r18.compound?.planId ?? '').toBe('legged-locomotion-18-frontmatter-sweep-20260917a');
    expect(r18.evidenceFailures).toEqual([]);
    // Preserve the formerly held row separately from the later typed closure.
    const r17 = loadSection(true).sections.find(s => s.slug === 'legged-locomotion')!.claimRecords[16];
    expect(r17.compound?.planId ?? '').toBe('');
    expect(r17.evidenceFailures.length).toBeGreaterThan(0);
    expect(article.claimRecords[16].localBasis?.planId).toBe('final-seven-rl-sim2real-legged-locomotion-17-20260923');
    expect(article.claimRecords[16].evidenceFailures).toEqual([]);
  });

  it('requires complete current typed evidence for both later closures', () => {
    const context = currentAuditContext();
    const current = parseLedger('audit/rl-sim2real.md', readFileSync(join(ROOT, 'audit/rl-sim2real.md'), 'utf8'),
      new Set(CITATIONS.map(c => c.id)), context).find(s => s.slug === 'legged-locomotion')!;
    for (const ordinal of [8, 17]) {
      const record = current.claimRecords[ordinal - 1];
      expect(record.localBasis?.planId).toBe(`final-seven-rl-sim2real-legged-locomotion-${ordinal}-20260923`);
      expect(record.evidenceFailures).toEqual([]);
      expect(record.outcome).toBe('passing');
    }
    expect(context.compoundPlans.some(p => p.id === PLAN_ID)).toBe(false);
  });

  it('binds the two 20260917a paywall rows (1 and 6) to complete compound evidence', () => {
    const { sections, compoundPlans } = loadSection();
    const article = sections.find((section) => section.slug === 'legged-locomotion')!;
    const expected: Readonly<Record<number, string>> = {
      1: 'legged-locomotion-1-stats-78min-20260917a',
      6: 'legged-locomotion-6-choi-abstract-20260917a',
    };
    for (const [ordinal, planId] of Object.entries(expected)) {
      const record = article.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
      expect(record.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
      expect(record.evidenceFailures).toEqual([]);
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toContain('paywall integrator efa5d1e4-a1b6-4874-b933-8492ceab17fa');
      expect(plan.planReview?.rationale).toContain('af50da65fc93392238e2c9c7cf2d170dfa0955e283cf7fb9dcff60eacc7d187d');
      for (const review of plan.adjudications) expect(review.outcome).toBe('supported');
    }
    // the stats claim cell now carries the applied 78-min stat, not the stale 1 h
    const r1 = article.claimRecords[0];
    expect(r1.claim).toContain('"78 min" Etzel hike (2.2 km, 120 m; planner 76 min)');
    expect(r1.claim).not.toContain('"1 h"');
    // row 6 discloses the abstract-equivalent scope of the training-loop clause
    const r6 = article.claimRecords[5];
    expect(r6.note).toContain('ABSTRACT SCOPE');
    expect(r6.note).toContain("'inside the training loop' is the abstract-equivalent of 'for reinforcement learning'");
  });

  it('locks the needle-verified passages behind the paywall rows', () => {
    const { compoundPlans } = loadSection();
    const r1 = compoundPlans.find((p) => p.id === 'legged-locomotion-1-stats-78min-20260917a')!;
    const rudin = r1.evidence.find((e) => e.partId === 'leg1-rudin-minutes-workstation-gpu')!;
    expect(rudin.citationId).toBe('rudin-2021');
    expect(rudin.sourceUrl).toBe('https://arxiv.org/abs/2109.11978');
    expect(rudin.supportingPassage).toContain(
      'training policies for flat terrain in under four minutes, and in twenty minutes for uneven terrain',
    );
    expect(rudin.supportingPassage).toContain('massive parallelism on a single workstation GPU');
    const miki = r1.evidence.find((e) => e.partId === 'leg1-miki-78min-etzel-hike')!;
    expect(miki.sourceUrl).toBe('https://ar5iv.labs.arxiv.org/html/2201.08117');
    expect(miki.supportingPassage).toContain('The hiking route was 2.2 km long, with an elevation gain of 120 m.');
    expect(miki.supportingPassage).toContain(
      'finished the entire path in 78 minutes – virtually the same duration suggested by a hiking planner (76 minutes)',
    );
    const choiStat = r1.evidence.find((e) => e.partId === 'leg1-choi-3.03-sand-running')!;
    expect(choiStat.citationId).toBe('choi-2023');
    expect(choiStat.sourceUrl).toBe('https://www.science.org/doi/10.1126/scirobotics.ade2256');
    expect(choiStat.supportingPassage).toContain('run on soft beach sand at 3.03 meters per second');
    const r6 = compoundPlans.find((p) => p.id === 'legged-locomotion-6-choi-abstract-20260917a')!;
    for (const item of r6.evidence) {
      expect(item.citationId).toBe('choi-2023');
      expect(item.sourceUrl).toBe('https://www.science.org/doi/10.1126/scirobotics.ade2256');
    }
    expect(r6.evidence.find((e) => e.partId === 'leg6-choi-cheap-granular-model')!
      .supportingPassage).toContain('computationally efficient granular media model for reinforcement learning');
  });

  it('preserves the corrected verdict and uncredited Park/local-AND history', () => {
    const { sections } = loadSection();
    const article = sections.find((section) => section.slug === 'legged-locomotion')!;
    const r8 = heldRow8();
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
    const plan = heldPlans.find((p) => p.id === PLAN_ID)!;
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
    expect(plan.adjudications).toEqual([]);
    const now = article.claimRecords[7];
    expect(now.verdict).toBe('Cut');
    expect(now.claim).toContain('universal speed-dependent duty-factor attribution was cut');
    expect(currentTyped(8).id).toBe('final-seven-rl-sim2real-legged-locomotion-8-20260923');
    expect(currentTyped(8).currentTupleDigest).toBe(originalClaimDigest(now));
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
    expect(finalSevenBefore('content/rl-sim2real/legged-locomotion.mdx')).toContain('The duty factors shown here are canonical nominal values; real controllers, classical and learned alike, modulate duty factor continuously with speed <Cite id="park-2017-bounding" />');
    expect(mdx).not.toContain('classical and learned alike, modulate duty factor continuously with speed');
    expect(mdx).toContain('authored illustrative duty factors: walk 0.75, trot 0.50, bound 0.45, and pronk 0.35');
    expect(committedText(heldCommit, 'content/rl-sim2real/legged-locomotion.mdx'))
      .toContain('The duty factors shown here are canonical nominal values; real controllers, classical and learned alike, modulate duty factor continuously with speed <Cite id="park-2017-bounding" />');
    expect(mdx).not.toContain('canonical nominal values; real controllers');
    expect(currentTyped(8).currentTupleDigest).toBe(originalClaimDigest(
      loadSection().sections.find(s => s.slug === 'legged-locomotion')!.claimRecords[7],
    ));
  });

  it('reuses the registered citation with no new registrations', () => {
    expect(CITATIONS.filter((c) => c.id === 'park-2017-bounding')).toHaveLength(1);
    const park = CITATIONS.find((c) => c.id === 'park-2017-bounding')!;
    expect(park.url).toBe(PARK_URL);
    expect(park.title).toBe('High-Speed Bounding with the MIT Cheetah 2: Control Design and Experiments');
    expect(park.authors).toEqual(['Hae-Won Park', 'Patrick M. Wensing', 'Sangbae Kim']);
    expect(park.year).toBe(2017);
  });


  it.each([
    {
        "originalId": "audit/rl-sim2real.md:legged-locomotion:8",
        "ordinal": 8,
        "planId": "legged-locomotion-8-duty-factor-disclaimer-20260916i",
        "oldTuple": "100f787b1aa8c18b7b9e21c822c4868c3a9888b38737b3d235ef6bcb3bf9025f",
        "withdrawnReviewDigest": "f4946f4ac52e6887639272648c1e729d6fc174f217c6d74bf1cda6784c534644"
    }
])('preserves the former hold $originalId without losing its tuple or withdrawn review history', ({ originalId, ordinal, planId, oldTuple, withdrawnReviewDigest }) => {
    const { sections, compoundPlans, markdown } = loadSection(true);
    const article = sections.find(s => s.slug === 'legged-locomotion')!;
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
    const current = loadSection().sections.find(s => s.slug === 'legged-locomotion')!.claimRecords[ordinal - 1];
    expect(currentTyped(ordinal).currentTupleDigest).toBe(originalClaimDigest(current));
    expect(current.verdict).toBe('Cut');
  });

});
