import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  compoundPartDigest,
  compoundPlanDigest,
  parseCompoundPlans,
} from '../../lib/audit-ledger';
import { CITATIONS } from '../../data/citations';

/**
 * Red-first proof for the space originals integration (frozen packet
 * convergence-source-m-space-20260916e, rows 1-10, all selected). Every
 * applied-state assertion here failed before application and must pass after
 * it. The regression guards (protected neighbor sections, held av row,
 * prior plan stability) passed before and must stay green.
 *
 * Row 2 is the dispatched source correction: the article said Ingenuity flew
 * "in an atmosphere about one percent the density of Earth's", but the cited
 * JPL release prints "only 1% the pressure at the surface compared to our
 * planet". The span is corrected to surface pressure, the setting the source
 * states; every other row is an evidence completion with no article change.
 */
const article = readFileSync('content/adjacent/space.mdx', 'utf8');
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

/** Packet row order is the ledger's space order; ids come from the packet's native plans. */
const SPACE_PLAN_IDS = [
  'space-1-autonav-aegis-20260916',
  'space-2-ingenuity-20260916',
  'space-3-moxie-20260916',
  'space-4-prime1-20260916',
  'space-5-etsvii-20260916',
  'space-6-orbital-express-20260916',
  'space-7-canadarm-dextre-20260916',
  'space-8-mev1-20260916',
  'space-9-adrasj-20260916',
  'space-10-osam1-20260916',
];

const spacePlans = plans.filter((plan) => plan.ledgerPath === 'audit/adjacent.md' && plan.articleSlug === 'space');

describe('space originals: ledger rows and compound plans', () => {
  it('keeps all 749 prior plans first and appends exactly the 10 space plans', () => {
    expect(plans).toHaveLength(759);
    expect(plans.slice(0, 749).every((plan) => !plan.id.startsWith('space-'))).toBe(true);
    expect(spacePlans.map((plan) => plan.id)).toEqual(SPACE_PLAN_IDS);
    expect(spacePlans.map((plan) => plan.rowOrdinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('binds every ledger space row to its exact plan with complete evidence columns', () => {
    const section = ledger.split('## space.mdx')[1].split('## Verification')[0];
    const rows = section
      .split('\n')
      .filter((line) => line.startsWith('| '))
      .filter((line) => !line.includes('Claim |') && !line.includes(' --- |'));
    expect(rows).toHaveLength(10);
    for (const [index, row] of rows.entries()) {
      const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
      expect(cells[2]).toBe('V');
      expect(cells[7]).toBe(SPACE_PLAN_IDS[index]);
      expect(cells[1].length).toBeGreaterThan(0);
      expect(cells[3].length).toBeGreaterThan(0);
    }
  });

  it('carries valid packet-review digests on every space plan and adjudication', () => {
    for (const plan of spacePlans) {
      expect(plan.planReview.planDigest).toBe(compoundPlanDigest(plan));
      expect(plan.planReview.reviewedBy).toContain('space-integrator-20260916');
      for (const review of plan.adjudications) {
        expect(review.outcome).toBe('supported');
        expect(review.evidenceDigest).toBe(compoundPartDigest(plan, review.partId));
      }
      const partIds = new Set(plan.parts.map((part) => part.id));
      for (const item of plan.evidence) expect(partIds.has(item.partId)).toBe(true);
    }
  });

  it('registers every evidence citation id and cites uncredentialed https urls', () => {
    for (const plan of spacePlans) {
      for (const item of plan.evidence) {
        expect(citationsRegistry).toContain(`'${item.citationId}'`);
        expect(item.sourceUrl).toMatch(/^https:\/\//);
        expect(item.supportingPassage.length).toBeGreaterThan(40);
      }
    }
    const registeredIds = new Set(CITATIONS.map((citation) => citation.id));
    for (const id of [
      'ingenuity-mission-end-2024',
      'ingenuity-first-flight-2021',
      'moxie-completion-2023',
      'prime-1-lunar-2025',
      'ets-vii-ard-2001',
      'ets-vii-robot-2001',
      'orbital-express-2008',
      'canadarm2-csa-2024',
      'dextre-csa-2024',
      'mev1-servicing-2025',
      'adras-j-15m-2024',
      'osam1-discontinued-2024',
      'perseverance-autonomy-2023',
      'aegis-curiosity-2017',
    ]) {
      expect(registeredIds.has(id)).toBe(true);
    }
  });
});

describe('space originals: packet-critical numbers survive verbatim', () => {
  it('keeps the Ingenuity correction to the setting the source prints', () => {
    expect(article).toContain(
      "in an atmosphere with about one percent of Earth's surface pressure",
    );
    expect(article).not.toContain("the density of Earth's");
    expect(article).toContain('<Cite id="ingenuity-first-flight-2021" />');
    expect(article).toContain('<Cite id="ingenuity-mission-end-2024" />');
  });

  it('locks the packet-critical literals in the space plans', () => {
    const passages = spacePlans.flatMap((plan) => plan.evidence.map((item) => item.supportingPassage)).join('\n');
    expect(passages).toContain('122 grams');
    expect(passages).toContain('12 grams of oxygen an hour');
    expect(passages).toContain('98% purity or better');
    expect(passages).toContain('16th and final time');
    expect(passages).toContain('17.7-kilometer');
    expect(passages).toContain('699.9 meters');
    expect(passages).toContain('347.7 meters');
    expect(passages).toContain('performed 72 flights');
    expect(passages).toContain('approximately 15 meters');
    expect(passages).toContain('17-metre-long robotic arm');
    expect(passages).toContain('only 1% the pressure at the surface');
  });

  it('keeps the ledger claim cells the packet adjudicated', () => {
    expect(ledger).toContain('surface pressure; qualified for 5 flights over 30 days');
    expect(ledger).toContain('16 runs, 122 g oxygen total');
    expect(ledger).toContain('88% of 17.7 km');
    expect(ledger).toContain('~15 m closest approach');
  });
});

describe('space originals: approved deltas', () => {
  const spaceDeltas = deltas.entries.filter((delta) => delta.id.startsWith('sp-r'));
  const PRE_HASH = 'f61d63c0de6a60214eb0a47e3b945794279d22250cf429389b39815af9160118';

  it('appends exactly 10 entries, same-same except the one article correction', () => {
    expect(deltas.entries).toHaveLength(834);
    expect(spaceDeltas.map((delta) => delta.id).sort()).toEqual(
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((row) => `sp-r${row}-20260916-1`).sort(),
    );
    for (const delta of spaceDeltas) {
      expect(delta.memberId).toBe('article:adjacent/space');
      expect(delta.manifest).toBe('prose');
      expect(delta.disposition).toBe('permanent');
    }
    const moving = spaceDeltas.filter((delta) => delta.oldHash !== delta.newHash);
    expect(moving).toHaveLength(1);
    expect(moving[0].id).toBe('sp-r2-20260916-1');
    expect(moving[0].oldHash).toBe(PRE_HASH);
    for (const delta of spaceDeltas.filter((d) => d.id !== 'sp-r2-20260916-1')) {
      expect(delta.oldHash).toBe(PRE_HASH);
      expect(delta.newHash).toBe(PRE_HASH);
    }
  });
});

describe('space originals: protected neighbors', () => {
  it('keeps the surgical section a 3-column original table', () => {
    const section = ledger.split('## surgical.mdx')[1].split('## space.mdx')[0];
    expect(section).toContain('| Claim | Source checked | Verdict |');
  });

  it('keeps the held autonomous-vehicles row honestly held', () => {
    expect(ledger).toContain('HELD 2026-09-15 (integrator, record 2 of 19)');
  });

  it('keeps every drones plan bound and reviewed', () => {
    const drones = plans.filter((plan) => plan.articleSlug === 'drones');
    expect(drones).toHaveLength(11);
    for (const plan of drones) {
      expect(plan.planReview.planDigest).toBe(compoundPlanDigest(plan));
    }
  });
});
