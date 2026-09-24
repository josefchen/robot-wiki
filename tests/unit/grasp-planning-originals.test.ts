import { describe, expect, it } from 'vitest';
import { planPacket } from '../helpers/audit-plan-history';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { committedJson } from '../helpers/editorial-current-context';

/**
 * Red-first proof for the grasp-planning originals integration
 * (frozen packet convergence-source-j-grasp-planning-20260916c, rows 5, 7,
 * 8, 10, 12). Every applied-state assertion here failed before application
 * and must pass after it. The regression guards (article span stability,
 * held-row invariance, prior-registry order) passed before and must stay
 * green.
 */
const article = readFileSync('content/classical/grasp-planning.mdx', 'utf8');
const ledger = readFileSync('audit/classical.md', 'utf8');
type Part = { id: string; text: string; requiredCitationIds: string[] };
type EvidenceItem = { partId: string; citationId: string; sourceUrl: string; supportingPassage: string };
type PlanRecord = {
  id: string;
  ledgerPath: string;
  articleSlug: string;
  rowOrdinal: number;
  originalCellsDigest: string;
  kind: string;
  parts: Part[];
  planReview: { reviewedBy: string; rationale: string; planDigest: string };
  evidence: EvidenceItem[];
  adjudications: Array<{
    partId: string;
    outcome: string;
    reviewedBy: string;
    rationale: string;
    evidenceDigest: string;
  }>;
};
const plans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')) as unknown as PlanRecord[];
type DeltaRecord = {
  id: string;
  manifest: string;
  memberId: string;
  oldHash: string;
  newHash: string;
  reason: string;
  ownerApproval: string;
  responsibleMilestone: string;
  affectedAssertions: string[];
  disposition: string;
};
const deltas = JSON.parse(
  readFileSync('contract/brand-v2-approved-deltas.json', 'utf8'),
) as unknown as { entries: DeltaRecord[] };

const graspSection = (() => {
  const lines = ledger.split('\n');
  const start = lines.findIndex((line) => line.startsWith('### grasp-planning.mdx'));
  const end = lines.findIndex((line, index) => index > start && line.startsWith('### '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
})();

/** Row ordinal N is the Nth data row of the article's table. */
function row(n: number): string[] {
  const lines = graspSection.split('\n').filter((line) => line.startsWith('|'));
  const dataRows = lines.filter((line) => !/^\|\s*---/.test(line) && !line.startsWith('| Claim'));
  expect(dataRows.length).toBeGreaterThanOrEqual(n);
  const cells = dataRows[n - 1].trim().slice(1, -1).split(/(?<!\\)\|/);
  // unescape escaped pipes exactly as lib/audit-ledger.ts cells() does, so
  // digests recomputed here match the parser's four-cell tuple digests
  return cells.map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

const registeredIds = new Set(
  [...readFileSync('data/citations.ts', 'utf8').matchAll(/id: '([a-z0-9-]+)'/g)].map((m) => m[1]),
);

const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

const planDigestOf = (plan: PlanRecord) =>
  digest([plan.id, plan.ledgerPath, plan.articleSlug, plan.rowOrdinal,
    plan.originalCellsDigest, plan.kind, plan.parts]);

const partDigestOf = (plan: PlanRecord, partId: string) =>
  digest([planDigestOf(plan), partId,
    plan.evidence
      .filter((item) => item.partId === partId)
      .map(({ citationId, sourceUrl, supportingPassage }) => [citationId, sourceUrl, supportingPassage])]);

const SAGE = 'https://journals.sagepub.com/doi/10.1177/027836499000900102';
const SPRINGER_MSS = 'https://link.springer.com/article/10.1007/BF01840373';
const SPRINGER_ROA = 'https://link.springer.com/article/10.1007/s10514-014-9402-3';
const PINNED_PROSE_HASH = '156f690191b0e7fb9e4619c870c8ec1501b1d6be800312d91aa4e0c5fc8b56b6';
const CURRENT_PROSE_HASH = '1c15d22439324446fc28291802042d344796476f9b4db4d3829692b4ad074cb5';

const newPlanIds = [
  'grasp-planning-5-gws-evidence-20260916',
  'grasp-planning-7-form-closure-evidence-20260916',
  'grasp-planning-8-frictional-counts-20260916',
  'grasp-planning-10-epsilon-evidence-20260916',
  'grasp-planning-12-internal-local-and-20260916',
];
const selectedPlans = newPlanIds.map((id) => plans.find((plan) => plan.id === id)!);
const newDeltaIds = [
  'gp-r5-20260916-1',
  'gp-r7-20260916-1',
  'gp-r8-20260916-1',
  'gp-r10-20260916-1',
  'gp-r12-20260916-1',
];
// 20260917a paywall pass: rows 2, 4, 6, 9 bound to the retained MLS
// authors'-PDF capture (Wayback id_, byte-stable across CDX 200 captures).
const paywallPlanIds = [
  'grasp-planning-2-mls-softfinger-20260917a',
  'grasp-planning-4-mls-wrench-20260917a',
  'grasp-planning-6-mls-force-closure-20260917a',
  'grasp-planning-9-mls-nguyen-antipodal-20260917a',
];

describe('grasp-planning originals: ledger rows complete', () => {
  it('binds each applied row to its exact compound plan (rows 5, 7, 8, 10, 12)', () => {
    expect(row(5)[7]).toBe('grasp-planning-5-gws-evidence-20260916');
    expect(row(7)[7]).toBe('grasp-planning-7-form-closure-evidence-20260916');
    expect(row(8)[7]).toBe('grasp-planning-8-frictional-counts-20260916');
    expect(row(10)[7]).toBe('grasp-planning-10-epsilon-evidence-20260916');
    expect(row(12)[7]).toBe('grasp-planning-12-internal-local-and-20260916');
  });

  it('keeps every applied row free of scalar evidence cells (compound convention)', () => {
    for (const n of [5, 7, 8, 10, 12]) {
      expect(row(n)[3]).toBe('');
      expect(row(n)[4]).toBe('');
      expect(row(n)[5]).toBe('');
    }
  });

  it('completes row 5 on the OA review with the honest unit-force caveat (verdict V)', () => {
    expect(row(5)[2]).toBe('V');
    expect(row(5)[1]).toContain(SPRINGER_ROA);
    expect(row(5)[1]).toContain('roa-suarez-2015');
    expect(row(5)[6]).toContain('convex hull of the primitive wrenches');
    expect(row(5)[6]).toContain("'at unit normal force' is printed by no fetched page");
    expect(row(5)[1]).toContain('murray-li-sastry-1994 and bicchi-kumar-2000 NOT re-fetched');
  });

  it('completes row 7 evidence on the two verbatim abstracts, keeping the C verdict', () => {
    expect(row(7)[2]).toBe(
      'C (lower bound re-attributed to Reuleaux/Somoff via MNP; sufficiency numbers corrected to MNP\'s actual results; MSS re-scoped to its real contribution; bicchi-1995 removed)',
    );
    expect(row(7)[1]).toContain(SAGE);
    expect(row(7)[1]).toContain(SPRINGER_MSS);
    expect(row(7)[1]).toContain('FetchUrl 200 by 2026-09-16T04:07Z');
    expect(row(7)[1]).toContain('murray-li-sastry-1994 Table 5.3 NOT re-fetched');
    expect(row(7)[6]).toContain('Reuleaux (1875) / Somoff (1897) / Lakshminarayana (1978) lower bounds');
    expect(row(7)[6]).toContain('at least four wrenches planar, at least seven spatial');
    expect(row(7)[6]).toContain('Abstracts prove only what they print');
  });

  it('completes row 8 on the MNP abstract verbatim sentence (verdict V)', () => {
    expect(row(8)[2]).toBe('V');
    expect(row(8)[1]).toContain(SAGE);
    expect(row(8)[6]).toContain(
      'three fingers are necessary and sufficient in two dimensions, and four fingers in three dimensions',
    );
    expect(row(8)[1]).toContain('murray-li-sastry-1994 Table 5.3 NOT re-fetched');
  });

  it('completes row 10 on the review epsilon definition with the honest normalization caveat (verdict V)', () => {
    expect(row(10)[2]).toBe('V');
    expect(row(10)[1]).toContain(SPRINGER_ROA);
    expect(row(10)[6]).toContain('the distance from the origin of the wrench space to the closest facet of P');
    expect(row(10)[6]).toContain("'per unit normal force' tail");
    expect(row(10)[1]).toContain('ferrari-canny-1992 IEEE body paywalled and not fetched');
  });

  it('completes row 12 on the internal basis with the integrator-run local proof (verdict V)', () => {
    expect(row(12)[2]).toBe('V');
    expect(row(12)[1]).toContain('lib/grasp.ts');
    expect(row(12)[1]).toContain('components/interactive/grasp-wrench-lab.tsx');
    expect(row(12)[1]).toContain('tests/e2e/grasp-planning.spec.ts');
    expect(row(12)[1]).toContain('internal, read-only 2026-09-16, with integrator-run local proof');
    expect(row(12)[6]).toContain('epsilon 0.44360697536713445 at mu 0.7 for the default tripod');
    expect(row(12)[6]).toContain('45 deg > arctan(0.7) = 34.992 deg');
    expect(row(12)[6]).toContain('No external source is claimed for this internal behavior');
  });

  it('keeps the source cells the 20260916 lane recorded for the two book-retry rows (1, 3)', () => {
    // Rows 1 and 3 were authentically held at the 20260916 close; the
    // 20260917a convergence-aq lane completed both (see the 20260917a
    // describe below). What must survive is the source attribution the
    // earlier lane recorded, not the incomplete shape.
    expect(row(1)[1]).toBe('murray-li-sastry-1994 ch. 5; prattichizzo-trinkle-2016');
    expect(row(3)[1]).toBe('cutkosky-1989 (title + canonical content)');
    for (const n of [1, 3]) {
      expect(row(n)).toHaveLength(8);
      expect(row(n)[6].length).toBeGreaterThan(60);
    }
  });

  it('completes the four paywall rows on the retained MLS capture (2, 4, 6, 9)', () => {
    const byRow: Readonly<Record<number, string>> = {
      2: 'grasp-planning-2-mls-softfinger-20260917a',
      4: 'grasp-planning-4-mls-wrench-20260917a',
      6: 'grasp-planning-6-mls-force-closure-20260917a',
      9: 'grasp-planning-9-mls-nguyen-antipodal-20260917a',
    };
    for (const [n, planId] of Object.entries(byRow)) {
      expect(row(Number(n))[7]).toBe(planId);
      expect(row(Number(n))[3]).toBe('');
      expect(row(Number(n))[4]).toBe('');
      expect(row(Number(n))[5]).toBe('');
      // every paywall row names the byte-stable Wayback id_ capture
      expect(row(Number(n))[1]).toContain(
        'http://web.archive.org/web/20140610230413id_/http://www.cds.caltech.edu/~murray/books/MLS/pdf/mls94-complete.pdf',
      );
      expect(row(Number(n))[1]).toContain('sha256 c85b9e1b9465789812edb750254fc88faff2b1557763e7cf1aa1e85307fc4a02');
    }
    // scope disclosures stay in the notes
    expect(row(6)[6]).toContain('SCOPE DISCLOSURE');
    expect(row(6)[6]).toContain('frictionless point contacts');
    expect(row(9)[2]).toContain('C (');
    expect(row(9)[6]).toContain('Theorem 5.6');
    expect(row(9)[6]).toContain('[82] V.-D. Nguyen');
  });
});

describe('grasp-planning originals: compound plans', () => {
  it('appends exactly five new plans and preserves the prior 713 in order', () => {
    // Preserve the exact packet and its surviving predecessor by identity.
    expect(plans[plans.findIndex(p => p.id === newPlanIds[0]) - 1].id).toBe('state-estimation-17-20260916');
    expect(planPacket(plans, newPlanIds).map((plan) => plan.id)).toEqual(newPlanIds);
    const historical = committedJson<typeof plans>(
      '5d8be27dc774564820d72f6891b51662445ceeed', 'audit/compound-evidence.json',
    );
    expect(historical).toHaveLength(718);
    expect(historical[712].id).toBe('state-estimation-17-20260916');
    expect(historical.slice(713, 718).map((plan) => plan.id)).toEqual(newPlanIds);
    expect(selectedPlans).toEqual(historical.slice(713, 718));
  });

  it('binds every plan to the classical grasp-planning ledger with fresh digests', () => {
    for (const plan of selectedPlans) {
      expect(plan.ledgerPath).toBe('audit/classical.md');
      expect(plan.articleSlug).toBe('grasp-planning');
      expect(plan.kind).toBe('explicit-parts');
      expect(plan.originalCellsDigest).toBe(
        digest([row(plan.rowOrdinal)[0], row(plan.rowOrdinal)[1], row(plan.rowOrdinal)[2], row(plan.rowOrdinal)[6]]),
      );
      expect(plan.planReview.planDigest).toBe(planDigestOf(plan));
      expect(plan.planReview.reviewedBy).toContain('grasp-planning-integrator-20260916');
    }
  });

  it('covers every required (part, citation) pair exactly with registered ids and real passages', () => {
    for (const plan of selectedPlans) {
      const required = plan.parts.flatMap((part) =>
        part.requiredCitationIds.map((id) => JSON.stringify([part.id, id])));
      const supplied = plan.evidence.map((item) => JSON.stringify([item.partId, item.citationId]));
      expect([...new Set(supplied)].sort()).toEqual([...new Set(required)].sort());
      expect(supplied.length).toBe(new Set(supplied).size);
      for (const item of plan.evidence) {
        expect(registeredIds.has(item.citationId)).toBe(true);
        expect(item.sourceUrl).toMatch(/^https:\/\//);
        expect(item.supportingPassage.length).toBeGreaterThan(40);
      }
    }
  });

  it('adjudicates every part supported with fresh evidence digests', () => {
    for (const plan of selectedPlans) {
      expect(plan.adjudications.map((review) => review.partId).sort())
        .toEqual(plan.parts.map((part) => part.id).sort());
      for (const review of plan.adjudications) {
        expect(review.outcome).toBe('supported');
        expect(review.evidenceDigest).toBe(partDigestOf(plan, review.partId));
        expect(review.reviewedBy).toContain('grasp-planning-integrator-20260916');
      }
    }
  });

  it('anchors the internal row 12 plan per the internal-row convention (repo text, no fetch)', () => {
    const plan = plans.find((entry) => entry.id === 'grasp-planning-12-internal-local-and-20260916');
    expect(plan).toBeDefined();
    const anchors = new Set(plan!.evidence.map((item) => item.citationId));
    for (const id of anchors) expect(registeredIds.has(id)).toBe(true);
    expect(anchors).toEqual(new Set(['murray-li-sastry-1994', 'nguyen-1988', 'ferrari-canny-1992']));
    for (const item of plan!.evidence) {
      expect(item.supportingPassage).toContain('REPO TEXT (read-only, no HTTP fetch applies to the internal conjunct)');
    }
  });

  it('carries the verbatim needle-checked passages in the external plans', () => {
    const gp7 = plans.find((entry) => entry.id === 'grasp-planning-7-form-closure-evidence-20260916')!;
    expect(gp7.evidence.some((item) => item.citationId === 'markenscoff-1990'
      && item.supportingPassage.includes('pointed out by Reuleaux (1875) and Somoff (1897)'))).toBe(true);
    expect(gp7.evidence.some((item) => item.citationId === 'markenscoff-1990'
      && item.supportingPassage.includes('12 fingers if and only if the object does not have a rotational symmetry'))).toBe(true);
    expect(gp7.evidence.some((item) => item.citationId === 'mishra-1987'
      && item.supportingPassage.includes('The algorithms run in time linear in the number of faces/sides'))).toBe(true);
    const gp8 = plans.find((entry) => entry.id === 'grasp-planning-8-frictional-counts-20260916')!;
    expect(gp8.evidence[0].supportingPassage).toContain(
      'three fingers are necessary and sufficient in two dimensions, and four fingers in three dimensions',
    );
    const gp10 = plans.find((entry) => entry.id === 'grasp-planning-10-epsilon-evidence-20260916')!;
    expect(gp10.evidence.some((item) => item.supportingPassage.includes(
      'the distance from the origin of the wrench space to the closest facet of P'))).toBe(true);
    expect(gp10.evidence.some((item) => item.supportingPassage.includes(
      'the sum of modules of the forces applied by n fingers is limited'))).toBe(true);
    const gp5 = plans.find((entry) => entry.id === 'grasp-planning-5-gws-evidence-20260916')!;
    expect(gp5.evidence[0].supportingPassage).toContain('Grasp Wrench Space GWS');
  });

  it('appends the four 20260917a paywall plans after the whole prior catalog', () => {
    expect(planPacket(plans, paywallPlanIds).map((plan) => plan.id)).toEqual(paywallPlanIds);
    for (const plan of planPacket(plans, paywallPlanIds)) {
      expect(plan.ledgerPath).toBe('audit/classical.md');
      expect(plan.articleSlug).toBe('grasp-planning');
      expect(plan.kind).toBe('explicit-parts');
      expect(plan.originalCellsDigest).toBe(
        digest([row(plan.rowOrdinal)[0], row(plan.rowOrdinal)[1], row(plan.rowOrdinal)[2], row(plan.rowOrdinal)[6]]),
      );
      expect(plan.planReview.planDigest).toBe(planDigestOf(plan));
      expect(plan.planReview.reviewedBy).toContain('paywall integrator efa5d1e4-a1b6-4874-b933-8492ceab17fa');
      expect(plan.planReview.rationale).toContain('6f279b9314e546c2800e1f54295c00fc6d3ca174186241d586f367e8a0f844f0');
      for (const review of plan.adjudications) {
        expect(review.outcome).toBe('supported');
        expect(review.evidenceDigest).toBe(partDigestOf(plan, review.partId));
      }
      for (const item of plan.evidence) {
        expect(item.citationId).toBe('murray-li-sastry-1994');
        expect(item.sourceUrl).toBe(
          'http://web.archive.org/web/20140610230413id_/http://www.cds.caltech.edu/~murray/books/MLS/pdf/mls94-complete.pdf',
        );
      }
    }
  });

  it('locks the needle-verified MLS passages in the paywall plans', () => {
    const gp2 = plans.find((entry) => entry.id === 'grasp-planning-2-mls-softfinger-20260917a')!;
    expect(gp2.evidence[0].supportingPassage).toContain(
      'A more realistic contact model is the soft-finger contact',
    );
    expect(gp2.evidence[0].supportingPassage).toContain('coefficient of torsional friction');
    const gp4 = plans.find((entry) => entry.id === 'grasp-planning-4-mls-wrench-20260917a')!;
    expect(gp4.evidence.find((item) => item.partId === 'gp4-wrench-adjoint-stack')!
      .supportingPassage).toContain('the torque generated by applying a force fb at a distance −pbc');
    expect(gp4.evidence.find((item) => item.partId === 'gp4-planar-wrench-3vector')!
      .supportingPassage).toContain('A wrench in SE(2) is represented by a linear component f ∈ R2');
    const gp6 = plans.find((entry) => entry.id === 'grasp-planning-6-mls-force-closure-20260917a')!;
    expect(gp6.evidence[0].supportingPassage).toContain(
      'The convex hull of {Gi } contains a neighborhood of the origin',
    );
    expect(gp6.evidence[0].supportingPassage).toContain('fN ∈ int(F C)');
    const gp9 = plans.find((entry) => entry.id === 'grasp-planning-9-mls-nguyen-antipodal-20260917a')!;
    expect(gp9.evidence[0].supportingPassage).toContain(
      'A planar grasp with two point contacts with friction is force-closure if and only if the line connecting the contact point lies inside both friction cones.',
    );
    expect(gp9.evidence[0].supportingPassage).toContain('[82] V.-D. Nguyen');
  });
});

describe('grasp-planning originals: approved deltas', () => {
  it('appends exactly five new entries and preserves the prior 788 in order', () => {
    // The merged delta ledger keeps appending later packets; pin this
    // packet's append slot (785..789) rather than a moving total.
    expect(deltas.entries[784].id).toBe('se-r17-20260916-1');
    expect(deltas.entries.slice(785, 790).map((entry) => entry.id)).toEqual(newDeltaIds);
    const historical = committedJson<typeof deltas>(
      '8e6a835f6e358b7082025b2ef8e402a65718d275', 'contract/brand-v2-approved-deltas.json',
    );
    expect(historical.entries).toHaveLength(996);
    expect(historical.entries[787].id).toBe('se-r17-20260916-1');
    expect(historical.entries.slice(788, 793).map((entry) => entry.id)).toEqual(newDeltaIds);
    expect(deltas.entries.filter((entry) => newDeltaIds.includes(entry.id)))
      .toEqual(historical.entries.slice(788, 793));
  });

  it('records every entry against the grasp-planning prose member with pinned-baseline oldHash', () => {
    for (const entry of deltas.entries.slice(785, 790)) {
      expect(entry.manifest).toBe('prose');
      expect(entry.memberId).toBe('article:classical/grasp-planning');
      expect(entry.oldHash).toBe(PINNED_PROSE_HASH);
      expect(entry.newHash).toBe(CURRENT_PROSE_HASH);
      expect(entry.responsibleMilestone).toBe('brand-v2-editorial');
      expect(entry.disposition).toBe('permanent');
      expect(entry.affectedAssertions).toContain('VAL-AUDIT-005');
      expect(entry.affectedAssertions).toContain('VAL-AUDIT-009');
      expect(entry.ownerApproval).toContain('convergence-source-j-grasp-planning-20260916c');
      expect(entry.reason).toContain('zero retrieval');
    }
  });

  it('records the 20260917a paywall re-scope from the same pinned baseline hash', () => {
    const entry = deltas.entries.find((e) => e.id === 'paywall0917a-grasp-prose')!;
    expect(entry.manifest).toBe('prose');
    expect(entry.memberId).toBe('article:classical/grasp-planning');
    expect(entry.oldHash).toBe(PINNED_PROSE_HASH);
    expect(entry.newHash).not.toBe(CURRENT_PROSE_HASH);
    expect(entry.newHash.length).toBe(64);
    expect(entry.ownerApproval).toContain('convergence-al-books-authorsites-20260917a');
    expect(entry.reason).toContain('strictly inside both friction cones');
  });
});

describe('grasp-planning originals: regression guards (green before and after)', () => {
  it('keeps the other audited spans byte-identical and applies only the paywall re-scope', () => {
    expect(article).toContain('the wrenches along the cone edges at unit normal force');
    expect(article).toContain('Reuleaux stated it in 1875 and Somoff in 1897');
    expect(article).toContain('three contacts are necessary and sufficient in the plane and four in space');
    expect(article).toContain('per unit of normal force at the contacts');
    expect(article).toContain('The default tripod of top, right, and bottom contacts is force closure at $\\mu = 0.7$');
    // 20260917a paywall re-scope: the theorem statement as printed, without
    // the "strictly" the paywalled Nguyen body never showed under a fetch
    expect(article).toContain('lies inside both friction cones <Cite id="nguyen-1988" />');
    expect(article).not.toContain('lies strictly inside both friction cones');
  });

  it('keeps every bound citation id registered and in the frontmatter', () => {
    for (const id of [
      'murray-li-sastry-1994',
      'nguyen-1988',
      'mishra-1987',
      'markenscoff-1990',
      'cutkosky-1989',
      'ferrari-canny-1992',
      'bicchi-kumar-2000',
      'prattichizzo-trinkle-2016',
      'roa-suarez-2015',
    ]) {
      expect(registeredIds.has(id)).toBe(true);
      expect(article).toContain(`  - ${id}\n`);
    }
  });
});
describe('grasp-planning originals: 20260917a book-retry rows 1 and 3', () => {
  const PLAN_1 = 'grasp-planning-1-cone-polyhedral-20260917a';
  const PLAN_3 = 'grasp-planning-3-cutkosky-1989-20260917a';

  it('binds rows 1 and 3 to their exact plans', () => {
    expect(row(1)[7]).toBe(PLAN_1);
    expect(row(3)[7]).toBe(PLAN_3);
    for (const planId of [PLAN_1, PLAN_3]) {
      const plan = plans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toContain('convergence-aq integrator');
      expect(plan.planReview?.rationale).toContain(
        'ca1245a0c832c4f103779536c07cac10316eaf369c06351090ecb334cfb66da6',
      );
    }
  });

  it('pins row 1: cone bound and half-angle from MLS94, polyhedral approximation from the Springer chapter', () => {
    const plan = plans.find((p) => p.id === PLAN_1)!;
    expect(plan.kind).toBe('explicit-parts');
    expect(plan.parts).toHaveLength(2);
    expect(plan.adjudications.map((a) => a.outcome)).toEqual(['supported', 'supported']);
    const mls = plan.evidence.find((e) => e.partId === 'cone-bound-and-half-angle')!;
    expect(mls.citationId).toBe('murray-li-sastry-1994');
    expect(mls.supportingPassage).toContain('cone centered about the surface normal');
    expect(mls.supportingPassage).toContain('α = tan−1 µ');
    const springer = plan.evidence.find((e) => e.partId === 'polyhedral-approximation')!;
    expect(springer.citationId).toBe('prattichizzo-trinkle-2016');
    expect(springer.supportingPassage).toContain('approximated as the non-negative span of a finite number');
    expect(springer.supportingPassage).toContain('an inscribed regular polyhedral cone');
    expect(springer.supportingPassage).toContain('Fig. 38.11 Quadratic cone approximated as a polyhedral cone with seven generators');
    // row 1's three conjuncts are now complete (the prior 2/3 partial named the cone and half-angle)
    expect(row(1)[0]).toBe('Coulomb friction cone norm(f^t) <= mu f^n; half-angle arctan mu; polyhedral approximation');
  });

  it('pins row 3: Cutkosky 1989 via the BDML-hosted exact paper with the Napier nuance', () => {
    const plan = plans.find((p) => p.id === PLAN_3)!;
    expect(plan.kind).toBe('explicit-parts');
    expect(plan.parts).toHaveLength(3);
    expect(plan.adjudications.map((a) => a.outcome)).toEqual(
      plan.parts.map(() => 'supported'),
    );
    const identity = plan.evidence.find((e) => e.partId === 'identity-exact-paper')!;
    expect(identity.citationId).toBe('cutkosky-1989');
    expect(identity.supportingPassage).toContain('IEEE TRANSACTIONS ON ROBOTICS AND AUTOMATION, VOL. 5, NO. 3. JUNE 1989');
    expect(identity.supportingPassage).toContain('On Grasp Choice, Gra');
    const napier = plan.evidence.find((e) => e.partId === 'power-vs-precision')!;
    expect(napier.supportingPassage).toContain('Napier [20] suggests a scheme in which grasps are divided into power grasps and precision grasps');
    const tree = plan.evidence.find((e) => e.partId === 'hierarchical-tree')!;
    expect(tree.supportingPassage).toContain('two basic categories suggested by Napier [20]');
    // the note discloses that the power/precision dichotomy is Napier's, cited inside Cutkosky
    expect(row(3)[6]).toContain('Napier');
  });
});
