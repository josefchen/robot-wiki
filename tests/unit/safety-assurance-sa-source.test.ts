/**
 * Red-first coverage for the 2026-09-15 safety-and-assurance integration
 * (frozen packet convergence-source-a-safety-assurance-20260915, zero
 * retrieval) and its 2026-09-16 remainder continuation (frozen packet
 * convergence-source-e-safety-remainder-20260916, zero retrieval): every
 * applied original row must bind an exact compound-evidence plan whose
 * paired evidence items name registered citation ids, complete
 * uncredentialed HTTP(S) URLs and substantive passages, and whose
 * original-cell digests match the live ledger rows. The 2026-09-16
 * dispatch applied the rows the 20260915 lane held or left unattempted
 * (SA5-9, SA25, SA26, SA32, SA33, SA36, SA38-40), so no row of this
 * section remains unbound, and SA40's corrected note counts 29 ids.
 * SA5/6 keep those bindings but their authored-mapping conjunctions are held;
 * literal source facts and the recorded inconsistency remain intact.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { parseCompoundPlans, originalClaimDigest, parseLedger } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';
import { currentAuditContext, finalSevenBefore, finalSevenPriorPlans } from '../helpers/residual-integration';
import { committedJson, committedText } from '../helpers/editorial-current-context';

const root = join(__dirname, '..', '..');
const ledger = readFileSync(join(root, 'audit/frontier.md'), 'utf8');
const plans = parseCompoundPlans(
  JSON.parse(readFileSync(join(root, 'audit/compound-evidence.json'), 'utf8')),
);
const registryIds = new Set(CITATIONS.map(({ id }) => id));
const priorLedger = finalSevenBefore('audit/frontier.md');
const priorPlans = finalSevenPriorPlans();
const migrated = new Set([
  'safety-remainder-20260916-safety-and-assurance-5',
  'safety-remainder-20260916-safety-and-assurance-6',
]);
const planFor = (id: string) => (migrated.has(id) ? priorPlans : plans).find(p => p.id === id);
const heldCommit = '5c48b2eb362be0a7e0fad87855740a208a258647';
const heldLedger = committedText(heldCommit, 'audit/frontier.md');
const heldPlans = parseCompoundPlans(committedJson<unknown>(heldCommit, 'audit/compound-evidence.json'));
const typedPlans = (JSON.parse(readFileSync(join(root, 'audit/local-basis.json'), 'utf8')) as {
  plans: Array<{ id: string; originalId: string; currentTupleDigest: string;
  originalBinding: { originalTupleDigest: string; originalCells: {
    claim: string; sourceChecked: string; verdict: string; note: string } }; parts: unknown[];
  evidence: Array<{ citationId: string; sourceUrl: string; supportingPassage: string }> }> }).plans;
const completedTyped = committedJson<{ plans: typeof typedPlans }>(
  'ba934e6c9eec542407d04c41d58032e81895e88c', 'audit/local-basis.json',
).plans;
const currentTyped = (ordinal: number) => typedPlans.find(p =>
  p.originalId === `audit/frontier.md:safety-and-assurance:${ordinal}`)!;

const APPLIED: ReadonlyArray<{
  readonly ordinal: number;
  readonly planId: string;
  readonly citations: readonly string[];
}> = [
  { ordinal: 3, planId: 'safety-assurance-20260915-safety-and-assurance-3', citations: ['iso-ts-15066'] },
  { ordinal: 10, planId: 'safety-assurance-20260915-safety-and-assurance-10', citations: ['iso-12100'] },
  { ordinal: 11, planId: 'safety-assurance-20260915-safety-and-assurance-11', citations: ['iso-12100', 'osha-otm-robots'] },
  { ordinal: 12, planId: 'safety-assurance-20260915-safety-and-assurance-12', citations: ['iso-10218-1-2025', 'iso-10218-2-2025'] },
  { ordinal: 13, planId: 'safety-assurance-20260915-safety-and-assurance-13', citations: ['iso-10218-1-2025', 'iso-10218-2-2025'] },
  { ordinal: 14, planId: 'safety-assurance-20260915-safety-and-assurance-14', citations: ['iec-61508-1-2010'] },
  { ordinal: 15, planId: 'safety-assurance-20260915-safety-and-assurance-15', citations: ['iso-13849-1-2023'] },
  { ordinal: 16, planId: 'safety-assurance-20260915-safety-and-assurance-16', citations: ['iso-13850-2015', 'iec-60204-1-2016'] },
  { ordinal: 17, planId: 'safety-assurance-20260915-safety-and-assurance-17', citations: ['iso-13850-2015', 'iso-12100'] },
  { ordinal: 19, planId: 'safety-assurance-20260915-safety-and-assurance-19', citations: ['iso-3691-4-2023'] },
  { ordinal: 20, planId: 'safety-assurance-20260915-safety-and-assurance-20', citations: ['a3-robot-safety-standards'] },
  { ordinal: 21, planId: 'safety-assurance-20260915-safety-and-assurance-21', citations: ['iso-cd-25785-1'] },
  { ordinal: 22, planId: 'safety-assurance-20260915-safety-and-assurance-22', citations: ['iso-cd-25785-1'] },
  { ordinal: 24, planId: 'safety-assurance-20260915-safety-and-assurance-24', citations: ['kalra-paddock-2016'] },
  { ordinal: 27, planId: 'safety-assurance-20260915-safety-and-assurance-27', citations: ['ul-4600-2023'] },
  { ordinal: 28, planId: 'safety-assurance-20260915-safety-and-assurance-28', citations: ['gsn-standard-v3'] },
  { ordinal: 29, planId: 'safety-assurance-20260915-safety-and-assurance-29', citations: ['gsn-standard-v3'] },
  { ordinal: 30, planId: 'safety-assurance-20260915-safety-and-assurance-30', citations: ['koopman-safe-enough-2026'] },
  { ordinal: 31, planId: 'safety-assurance-20260915-safety-and-assurance-31', citations: ['rss-2017'] },
  { ordinal: 34, planId: 'safety-assurance-20260915-safety-and-assurance-34', citations: ['knowno-2023'] },
  { ordinal: 35, planId: 'safety-assurance-20260915-safety-and-assurance-35', citations: ['sinha-anomaly-2024'] },
  { ordinal: 37, planId: 'safety-assurance-20260915-safety-and-assurance-37', citations: ['asimov-agentic-2026'] },
];

const APPLIED_20260916: ReadonlyArray<{
  readonly ordinal: number;
  readonly planId: string;
  readonly citations: readonly string[];
}> = [
  { ordinal: 5, planId: 'safety-remainder-20260916-safety-and-assurance-5', citations: ['marvel-norcross-2017'] },
  { ordinal: 6, planId: 'safety-remainder-20260916-safety-and-assurance-6', citations: ['marvel-norcross-2017'] },
  { ordinal: 7, planId: 'safety-remainder-20260916-safety-and-assurance-7', citations: ['haddadin-2009'] },
  { ordinal: 8, planId: 'safety-remainder-20260916-safety-and-assurance-8', citations: ['han-force-pain-2024'] },
  { ordinal: 9, planId: 'safety-remainder-20260916-safety-and-assurance-9', citations: ['han-force-pain-2024'] },
  { ordinal: 25, planId: 'safety-remainder-20260916-safety-and-assurance-25', citations: ['ames-cbf-2019'] },
  { ordinal: 26, planId: 'safety-remainder-20260916-safety-and-assurance-26', citations: ['wabersich-safety-filters-2023'] },
  { ordinal: 32, planId: 'safety-remainder-20260916-safety-and-assurance-32', citations: ['koopman-safe-enough-2026', 'rss-2017'] },
  { ordinal: 33, planId: 'safety-remainder-20260916-safety-and-assurance-33', citations: ['angelopoulos-conformal-2021', 'vovk-conformal-2022'] },
  { ordinal: 36, planId: 'safety-remainder-20260916-safety-and-assurance-36', citations: ['farid-failure-2022'] },
  { ordinal: 38, planId: 'safety-remainder-20260916-safety-and-assurance-38', citations: ['gemini-robotics-er2-2026'] },
  { ordinal: 39, planId: 'safety-remainder-20260916-safety-and-assurance-39', citations: ['koopman-safe-enough-2026', 'rss-2017'] },
  { ordinal: 40, planId: 'safety-remainder-20260916-safety-and-assurance-40', citations: ['kalra-paddock-2016'] },
];

const ALL_APPLIED = [...APPLIED, ...APPLIED_20260916];
const CURRENT_COMPOUND = ALL_APPLIED.filter(({ ordinal }) => ordinal !== 5 && ordinal !== 6);

function rowLine(ordinal: number, source = ledger): string {
  const prefix = `| SA${ordinal} |`;
  const matches = source.split('\n').filter((line) => line.startsWith(prefix));
  expect(matches, `row SA${ordinal} must appear exactly once`).toHaveLength(1);
  return matches[0];
}

function cellsOf(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

describe('safety-and-assurance 2026-09-15 integration', () => {
  it('binds every applied original to its exact compound-evidence plan', () => {
    for (const { ordinal, planId } of ALL_APPLIED) {
      expect(cellsOf(rowLine(ordinal, heldLedger)).at(-1), `SA${ordinal} historical binding`).toBe(planId);
      expect(heldPlans.find(p => p.id === planId)?.rowOrdinal).toBe(ordinal);
    }
    for (const { ordinal, planId } of CURRENT_COMPOUND) {
      const cells = cellsOf(rowLine(ordinal));
      expect(cells[cells.length - 1], `SA${ordinal} evidence-plan cell`).toBe(planId);
      const plan = planFor(planId);
      expect(plan, planId).toBeDefined();
      expect(plan!.ledgerPath).toBe('audit/frontier.md');
      expect(plan!.articleSlug).toBe('safety-and-assurance');
      expect(plan!.rowOrdinal).toBe(ordinal);
    }
    for (const ordinal of [5, 6]) {
      expect(cellsOf(rowLine(ordinal)).at(-1)).toBe(currentTyped(ordinal).id);
      expect(currentTyped(ordinal).parts).toHaveLength(5);
      expect(currentTyped(ordinal)).toEqual(completedTyped.find(p => p.originalId ===
        `audit/frontier.md:safety-and-assurance:${ordinal}`));
    }
  });

  it('keeps every applied plan digest aligned with the live row cells', () => {
    for (const { ordinal, planId } of ALL_APPLIED) {
      const historical = cellsOf(rowLine(ordinal, heldLedger));
      expect(originalClaimDigest({
        claim: historical[1], sourceChecked: historical[2], verdict: historical[3], note: historical[4],
      })).toBe(heldPlans.find(p => p.id === planId)!.originalCellsDigest);
    }
    for (const { ordinal, planId } of CURRENT_COMPOUND) {
      const plan = plans.find((candidate) => candidate.id === planId);
      expect(plan, planId).toBeDefined();
      const cells = cellsOf(rowLine(ordinal));
      // Header: # / Claim / Source checked / Verdict / Note / Citation ID / URL / passage / Evidence plan
      expect(
        originalClaimDigest({
          claim: cells[1], sourceChecked: cells[2], verdict: cells[3], note: cells[4],
        }),
        `SA${ordinal} live cells must digest to the plan's originalCellsDigest`,
      ).toBe(plan!.originalCellsDigest);
    }
    for (const ordinal of [5, 6]) {
      const cells = cellsOf(rowLine(ordinal));
      expect(originalClaimDigest({ claim: cells[1], sourceChecked: cells[2], verdict: cells[3], note: cells[4] }))
        .toBe(currentTyped(ordinal).currentTupleDigest);
    }
  });

  it('requires registered citations, complete URLs and substantive passages on every evidence item', () => {
    for (const { planId, citations } of ALL_APPLIED) {
      const plan = planFor(planId);
      expect(plan, planId).toBeDefined();
      expect(
        [...new Set(plan!.parts.flatMap((part) => part.requiredCitationIds))].sort(),
        `${planId} required citations (20260916 plans may require one citation from several parts)`,
      ).toEqual([...new Set(citations)].sort());
      for (const item of plan!.evidence) {
        expect(registryIds.has(item.citationId), `${planId}/${item.partId} citation registered`).toBe(true);
        expect(item.sourceUrl).toMatch(/^https?:\/\/\S+$/);
        expect(item.sourceUrl).not.toMatch(/[@\s]/);
        expect(item.supportingPassage.trim().length, `${planId}/${item.partId} passage substantive`).toBeGreaterThan(40);
      }
      if (migrated.has(planId)) {
        expect(plan!.planReview).toBeNull();
        expect(plan!.adjudications).toEqual([]);
        continue;
      }
      expect(plan!.adjudications).toHaveLength(plan!.parts.length);
      for (const review of plan!.adjudications) {
        expect(review.outcome, `${planId}/${review.partId} supported`).toBe('supported');
      }
    }
    for (const ordinal of [5, 6]) {
      const evidence = currentTyped(ordinal).evidence;
      expect(evidence).toHaveLength(1);
      expect(evidence[0].citationId).toBe('marvel-norcross-2017');
      expect(evidence[0].sourceUrl).toMatch(/^https?:\/\/\S+$/);
      expect(evidence[0].supportingPassage.length).toBeGreaterThan(40);
    }
  });

  it('binds every row the 20260915 lane held to its 2026-09-16 plan', () => {
    // The 2026-09-16 dispatch applied all eight rows this suite previously
    // pinned as held; each now carries exactly its new plan binding and the
    // compound shape (empty scalar cells, evidence in the plan items).
    for (const { ordinal, planId } of APPLIED_20260916) {
      expect(cellsOf(rowLine(ordinal, heldLedger)).at(-1)).toBe(planId);
    }
    for (const { ordinal, planId } of APPLIED_20260916.filter(p => p.ordinal !== 5 && p.ordinal !== 6)) {
      const cells = cellsOf(rowLine(ordinal));
      expect(cells[cells.length - 1], `SA${ordinal} evidence-plan cell`).toBe(planId);
      expect(cells[5] ?? '', `SA${ordinal} scalar citation cell stays empty in compound shape`).toBe('');
      expect(cells[6] ?? '', `SA${ordinal} scalar URL cell stays empty in compound shape`).toBe('');
      expect(cells[7] ?? '', `SA${ordinal} scalar passage cell stays empty in compound shape`).toBe('');
    }
    expect(plans.some((plan) => plan.articleSlug === 'safety-and-assurance' && !CURRENT_COMPOUND.some(({ planId }) => planId === plan.id))).toBe(false);
    for (const ordinal of [5, 6]) expect(cellsOf(rowLine(ordinal)).at(-1)).toBe(currentTyped(ordinal).id);
  });

  it('carries the SA40 corrected note counting 29 frontmatter citation ids', () => {
    const cells = cellsOf(rowLine(40));
    expect(cells[4]).toContain('29 frontmatter citation ids');
    expect(cells[4]).not.toContain('28 frontmatter citation ids');
    expect(cells[cells.length - 1]).toBe('safety-remainder-20260916-safety-and-assurance-40');
  });
  it.each([
    {
        "originalId": "audit/frontier.md:safety-and-assurance:5",
        "ordinal": 5,
        "planId": "safety-remainder-20260916-safety-and-assurance-5",
        "oldTuple": "55b4336db6d3c9828d07b4d3b3d1a324a520f90be0232779e90fb3ce61b6fd87",
        "withdrawnReviewDigest": "46dd278c6d35e614d3c86e92e8265edea3a0c8c3c9e92a3e4d61eb0b6e2bce52"
    },
    {
        "originalId": "audit/frontier.md:safety-and-assurance:6",
        "ordinal": 6,
        "planId": "safety-remainder-20260916-safety-and-assurance-6",
        "oldTuple": "a0b6b670f57a2b1afb510811fdea1200e585ce19c66784b0ec5358302aa15ba6",
        "withdrawnReviewDigest": "895f6e01d8b13d82b2161e9267ccb8b7383a1ad2a044f7721fc6245a1d84a995"
    }
])('preserves the former hold $originalId without losing its tuple or withdrawn review history', ({ originalId, ordinal, planId, oldTuple, withdrawnReviewDigest }) => {
    const markdown = priorLedger, compoundPlans = priorPlans;
    const article = parseLedger('audit/frontier.md', markdown, registryIds, { compoundPlans })
      .find(s => s.slug === 'safety-and-assurance')!;
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
    // The typed closure has a separate source snapshot after the named hold;
    // the withdrawn pre-hold plan and its four cells remain independently pinned above.
    expect(originalClaimDigest(currentTyped(ordinal).originalBinding.originalCells))
      .toBe(currentTyped(ordinal).originalBinding.originalTupleDigest);
    expect(cellsOf(rowLine(ordinal)).at(-1)).toBe(currentTyped(ordinal).id);
  });

  it('retains the lower-bound correction and both velocity contexts without operand credit', () => {
    const article = readFileSync(join(root, 'content/frontier/safety-and-assurance.mdx'), 'utf8');
    const rows = parseLedger('audit/frontier.md', priorLedger, registryIds, { compoundPlans: priorPlans })
      .find(s => s.slug === 'safety-and-assurance')!.claimRecords;
    expect(article).toContain('an intrusion margin of at least 850 mm');
    expect(rows[4].note).toContain('applicability');
    expect(rows[5].verdict).toBe('S');
    expect(rows[5].note).toContain('1600 mm/s');
    expect(rows[5].note).toContain('2000 mm/s');
    expect(heldLedger).toContain('may be measured directly');
    expect(rows[5].note).toContain('Source-internal inconsistency stands recorded');
    const current = parseLedger('audit/frontier.md', ledger, registryIds, currentAuditContext())
      .find(s => s.slug === 'safety-and-assurance')!.claimRecords;
    expect(current[5].note).toContain('Inconsistency remains recorded');
    expect(current[5].note).toContain('selected teaching inputs rather than a certified');
  });

  it('requires complete typed successors without crediting the old source-only mapping', () => {
    const context = currentAuditContext();
    const rows = parseLedger('audit/frontier.md', ledger, registryIds, context)
      .find(s => s.slug === 'safety-and-assurance')!.claimRecords;
    for (const ordinal of [5, 6]) {
      expect(rows[ordinal - 1].localBasis?.planId).toBe(`final-seven-frontier-safety-and-assurance-${ordinal}-20260923`);
      expect(rows[ordinal - 1].outcome).toBe(ordinal === 6 ? 'recorded-inconsistency' : 'passing');
      expect(rows[ordinal - 1].evidenceFailures).toEqual([]);
    }
    expect(plans.filter(p => migrated.has(p.id))).toEqual([]);
    const article = readFileSync(join(root, 'content/frontier/safety-and-assurance.mdx'), 'utf8');
    expect(article).toContain('1200 mm for a single-height beam');
    expect(article).toContain('2000 mm/s may be more prudent');
    expect(article).toContain('A 100 Hz update period is 0.01 s');
  });

  it('still rejects missing source evidence from a complete unchanged safety peer', () => {
    const parse = (catalog = plans) => parseLedger('audit/frontier.md', ledger, registryIds,
      { compoundPlans: catalog }).find(s => s.slug === 'safety-and-assurance')!.claimRecords[2];
    // Original3 is an unchanged complete starting point, not an already-held
    // SA5/6 fixture that would make this evidence-removal assertion vacuous.
    expect(parse().evidenceFailures).toEqual([]);
    const changed = structuredClone(plans);
    const peer = changed.find(p => p.id === APPLIED[0].planId)!;
    expect(peer.evidence.length).toBeGreaterThan(0);
    peer.evidence = peer.evidence.slice(1);
    expect(parse(changed).compound?.structuralFailures.length).toBeGreaterThan(0);
  });
});
