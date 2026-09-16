import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  compoundPartDigest,
  compoundPlanDigest,
  originalClaimDigest,
  parseCompoundPlans,
} from '../../lib/audit-ledger';
import { CITATIONS } from '../../data/citations';

/**
 * Red-first proof for the surgical originals integration (frozen packet
 * convergence-source-p-surgical-20260916f, rows 1,2,3,4,6,7,8 selected; held
 * row 5 Maestro K221410 excluded per dispatch). Every applied-state assertion
 * here failed before application and must pass after it. The regression
 * guards (held Maestro row, protected neighbor sections, prior plan order)
 * passed before and must stay green.
 *
 * Row 1 corrects the article span 'da Vinci procedures grew roughly 17
 * percent worldwide that year' to 'roughly 18 percent worldwide in 2025' (the
 * release prints ~17% for Q4 only and 18% for full-year 2025). Row 6 corrects
 * the risk-tolerance clause to the editorial's printed position. Row 7 is the
 * dispatched local-AND row: the 21.5 percent figure is the one-decimal
 * rounding of this integrator's own derivation 0.95^30 = 0.21463876394293727,
 * never a fetch; the anchor citation carries only the sourced clause.
 */
const article = readFileSync('content/adjacent/surgical.mdx', 'utf8');
const ledger = readFileSync('audit/adjacent.md', 'utf8');
const citationsRegistry = readFileSync('data/citations.ts', 'utf8');

type Part = { id: string; text: string; requiredCitationIds: string[] };
type EvidenceItem = { partId: string; citationId: string; sourceUrl: string; supportingPassage: string };
type PlanRecord = {
  id: string;
  ledgerPath: string;
  articleSlug: string;
  rowOrdinal: number;
  originalCellsDigest: string;
  kind: 'explicit-parts' | 'frontmatter-p1';
  parts: Part[];
  planReview: { reviewedBy: string; rationale: string; planDigest: string };
  evidence: EvidenceItem[];
  adjudications: Array<{
    partId: string;
    outcome: 'supported' | 'unresolved' | 'contradicted';
    reviewedBy: string;
    rationale: string;
    evidenceDigest: string;
  }>;
};
const plans = parseCompoundPlans(
  JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')),
) as unknown as PlanRecord[];
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
) as { entries: DeltaRecord[] };

/** Dispatched row order; row 5 (Maestro K221410) is held and excluded. */
const SURGICAL_PLAN_IDS = [
  'surgical-1-isrg-q4-20260916',
  'surgical-2-dv5-clearance-20260916',
  'surgical-3-force-feedback-20260916',
  'surgical-4-cmr-denovo-20260916',
  'surgical-6-yang-framework-20260916',
  'surgical-7-compounding-20260916',
  'surgical-8-star-20260916',
];

const surgicalPlans = plans.filter(
  (plan) => plan.ledgerPath === 'audit/adjacent.md' && plan.articleSlug === 'surgical',
);

describe('surgical originals: ledger rows and compound plans', () => {
  it('keeps all 768 prior plans first and appends exactly the 7 surgical plans', () => {
    expect(plans).toHaveLength(775);
    expect(plans.slice(0, 768).every((plan) => !plan.id.startsWith('surgical-'))).toBe(true);
    expect(surgicalPlans.map((plan) => plan.id)).toEqual(SURGICAL_PLAN_IDS);
    expect(surgicalPlans.map((plan) => plan.rowOrdinal)).toEqual([1, 2, 3, 4, 6, 7, 8]);
  });

  it('binds every applied ledger row to its exact plan; keeps held row 5 a 3-cell original row', () => {
    const section = ledger.split('## surgical.mdx')[1].split('## space.mdx')[0];
    const rows = section
      .split('\n')
      .filter((line) => line.startsWith('| '))
      .filter((line) => !line.includes('Claim |') && !line.includes(' --- |'));
    expect(rows).toHaveLength(8);
    const appliedOrdinals = [1, 2, 3, 4, 6, 7, 8];
    for (const [index, row] of rows.entries()) {
      const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
      if (appliedOrdinals.includes(index + 1)) {
        expect(cells[2]).toBe('V');
        expect(cells[4]).toBe('');
        expect(cells[5]).toBe('');
        expect(cells[6]).toBe('');
        expect(cells[7]).toBe(SURGICAL_PLAN_IDS[appliedOrdinals.indexOf(index + 1)]);
        expect(cells[1].length).toBeGreaterThan(0);
        expect(cells[3].length).toBeGreaterThan(0);
      } else {
        // Held Maestro row: original 3-column shape, no evidence plan binding.
        expect(index + 1).toBe(5);
        expect(cells).toHaveLength(3);
        expect(cells[0]).toContain('Maestro');
        expect(cells[1]).toContain('K221410');
      }
    }
  });

  it('recomputes every original-cells digest from the applied ledger row cells', () => {
    const section = ledger.split('## surgical.mdx')[1].split('## space.mdx')[0];
    const rows = section
      .split('\n')
      .filter((line) => line.startsWith('| '))
      .filter((line) => !line.includes('Claim |') && !line.includes(' --- |'));
    const appliedRows = [0, 1, 2, 3, 5, 6, 7].map((index) =>
      rows[index].split('|').slice(1, -1).map((cell) => cell.trim()),
    );
    for (const [index, plan] of surgicalPlans.entries()) {
      const cells = appliedRows[index];
      expect(
        originalClaimDigest({
          claim: cells[0],
          sourceChecked: cells[1],
          verdict: cells[2],
          note: cells[3],
        }),
      ).toBe(plan.originalCellsDigest);
    }
  });

  it('carries valid packet-review digests on every surgical plan and adjudication', () => {
    for (const plan of surgicalPlans) {
      expect(plan.planReview.planDigest).toBe(compoundPlanDigest(plan));
      expect(plan.planReview.reviewedBy).toContain('surgical-integrator-20260916');
      for (const review of plan.adjudications) {
        expect(review.outcome).toBe('supported');
        expect(review.evidenceDigest).toBe(compoundPartDigest(plan, review.partId));
      }
      const partIds = new Set(plan.parts.map((part) => part.id));
      for (const item of plan.evidence) expect(partIds.has(item.partId)).toBe(true);
      expect(plan.adjudications).toHaveLength(plan.parts.length);
    }
  });

  it('registers every evidence citation id and cites uncredentialed https urls', () => {
    const registeredIds = new Set(CITATIONS.map((citation) => citation.id));
    for (const plan of surgicalPlans) {
      for (const item of plan.evidence) {
        expect(citationsRegistry).toContain(`'${item.citationId}'`);
        expect(item.sourceUrl).toMatch(/^https:\/\//);
        expect(item.supportingPassage.length).toBeGreaterThan(40);
      }
    }
    for (const id of [
      'intuitive-q4-2025',
      'davinci5-clearance-2024',
      'cmr-versius-authorization-2024',
      'yang-autonomy-2017',
      'star-suturing-2016',
    ]) {
      expect(registeredIds.has(id)).toBe(true);
    }
  });
});

describe('surgical originals: packet-critical literals survive verbatim', () => {
  it('applies the two dispatched article-span corrections and no others', () => {
    expect(article).toContain('da Vinci procedures grew roughly 18 percent worldwide in 2025');
    expect(article).not.toContain('roughly 17 percent worldwide that year');
    expect(article).toContain(
      'risk tolerance to autonomous robots is expected to change as autonomous machines such as self-driving cars become commonplace',
    );
    expect(article).not.toContain('is the binding constraint on higher levels');
    // Row 7: the article's 21.5 percent stays; it is the correct one-decimal
    // rounding of the locally derived 21.4639 percent.
    expect(article).toContain('compounds to 21.5 percent over 30 steps');
    // Row 8: the conservative rendering stays; the tighten was optional only.
    expect(article).toContain('matched or exceeded both expert surgeons');
    expect(article).toContain('<Cite id="yang-autonomy-2017" />');
  });

  it('locks the packet-critical literals in the surgical plans', () => {
    const passages = surgicalPlans
      .flatMap((plan) => plan.evidence.map((item) => item.supportingPassage))
      .join('\n');
    expect(passages).toContain('installed base to 11,106 systems');
    expect(passages).toContain('compared to 18% in 2025');
    expect(passages).toContain('Da Vinci procedures grew approximately 17%');
    expect(passages).toContain('more than 150 enhancements');
    expect(passages).toContain('10,000 times the computing power of da Vinci Xi');
    expect(passages).toContain('no other surgical technology in any modality offers');
    expect(passages).toContain('up to 43 percent less force exerted on tissue');
    expect(passages).toContain('soft tissue general surgical Robotic Assisted Surgical Device');
    expect(passages).toContain(
      'only approximately 2.5% were robotic assisted',
    );
    expect(passages).toContain('motion scaling also fits this category');
    expect(passages).toContain('practicing medicine');
    expect(passages).toContain('0.21463876394293727');
    expect(passages).toContain('superior to surgery performed by expert surgeons and RAS techniques');
  });

  it('keeps the ledger claim cells the packet adjudicated', () => {
    expect(ledger).toContain('procedures grew ~18% worldwide in 2025 (17% was the Q4 figure)');
    expect(ledger).toContain('0.95^30 = 0.2146 (21.4639%)');
    expect(ledger).toContain('risk tolerance to autonomous robots expected to change');
  });
});

describe('surgical originals: approved deltas', () => {
  const surgicalDeltas = deltas.entries.filter((delta) => delta.id.startsWith('sg-r'));
  const PRE_HASH = 'f0daa44d11ccdfb1690809295c3e52b7246af89f4dbc10ec743d4e08061189c1';
  const FINAL_HASH = 'c36132a65355c0f46e5b530b4626389c0127babfb418d976d982b8a2dfb942eb';

  it('appends exactly 7 entries, same-same except the one combined prose move', () => {
    expect(deltas.entries).toHaveLength(852);
    expect(surgicalDeltas.map((delta) => delta.id).sort()).toEqual(
      ['1', '2', '3', '4', '6', '7', '8'].map((row) => `sg-r${row}-20260916-1`).sort(),
    );
    for (const delta of surgicalDeltas) {
      expect(delta.memberId).toBe('article:adjacent/surgical');
      expect(delta.manifest).toBe('prose');
      expect(delta.disposition).toBe('permanent');
      expect(delta.ownerApproval).toContain('54c68925abb21f4ee7f0679e8e0df3c0ad1bda59e6b3ead6dd3ab342b37bf660');
    }
    const moving = surgicalDeltas.filter((delta) => delta.oldHash !== delta.newHash);
    expect(moving).toHaveLength(1);
    expect(moving[0].id).toBe('sg-r6-20260916-1');
    expect(moving[0].oldHash).toBe(PRE_HASH);
    expect(moving[0].newHash).toBe(FINAL_HASH);
    for (const delta of surgicalDeltas.filter((d) => d.id !== 'sg-r6-20260916-1')) {
      expect(delta.oldHash).toBe(PRE_HASH);
      expect(delta.newHash).toBe(PRE_HASH);
    }
  });
});

describe('surgical originals: protected neighbors', () => {
  it('keeps the held autonomous-vehicles row honestly held', () => {
    expect(ledger).toContain('HELD 2026-09-15 (integrator, record 2 of 19)');
  });

  it('keeps the prior plan order stable in the append-only compound file', () => {
    const raw = readFileSync('audit/compound-evidence.json', 'utf8');
    expect(raw.trimEnd().endsWith(']')).toBe(true);
    const priorLast = raw.indexOf('"id": "generative-video-22-starchild-agora-20260916e"');
    const firstSurgical = raw.indexOf('"id": "surgical-1-isrg-q4-20260916"');
    expect(priorLast).toBeGreaterThan(-1);
    expect(firstSurgical).toBeGreaterThan(priorLast);
  });

  it('keeps every space plan bound and reviewed', () => {
    const space = plans.filter((plan) => plan.articleSlug === 'space');
    expect(space).toHaveLength(10);
    for (const plan of space) {
      expect(plan.planReview.planDigest).toBe(compoundPlanDigest(plan));
    }
  });
});
