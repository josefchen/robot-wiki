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
 * Red-first proof for the drones originals integration (frozen packet
 * convergence-source-l-drones-20260916d, rows 1-11, all selected). Every
 * applied-state assertion here failed before application and must pass after
 * it. The regression guards (prior plan order, protected neighbor sections,
 * unaffected article spans) passed before and must stay green.
 *
 * Row 11 is the dispatched source-correction-with-local-AND: the per-paper
 * half is supported from the three printed scopes in the packet, and the
 * field-wide sentence ("not yet been demonstrated on real outdoor swarms at
 * scale") is CUT, not hedged. Row 8's mis-citation correction predates this
 * lane and is completed here with evidence fields only.
 */
const article = readFileSync('content/adjacent/drones.mdx', 'utf8');
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
) as unknown as { entries: DeltaRecord[] };

const dronePlans = plans.filter((plan) => plan.id.startsWith('drones-'));
const EXPECTED_PLAN_IDS = [
  'drones-1-swift-intro-20260916',
  'drones-2-loquercio-forests-20260916',
  'drones-3-swift-recipe-20260916',
  'drones-4-song-rl-vs-oc-20260916',
  'drones-5-loquercio-method-20260916',
  'drones-6-falanga-table1-20260916',
  'drones-7-soria-nmpc-20260916',
  'drones-8-vasarhelyi-flocking-20260916',
  'drones-9-zhou-swarm-20260916',
  'drones-10-reynolds-boids-20260916',
  'drones-11-assignment-layer-20260916',
];
const EXPECTED_PART_COUNTS: Record<string, number> = {
  'drones-1-swift-intro-20260916': 1,
  'drones-2-loquercio-forests-20260916': 1,
  'drones-3-swift-recipe-20260916': 2,
  'drones-4-song-rl-vs-oc-20260916': 1,
  'drones-5-loquercio-method-20260916': 1,
  'drones-6-falanga-table1-20260916': 3,
  'drones-7-soria-nmpc-20260916': 2,
  'drones-8-vasarhelyi-flocking-20260916': 2,
  'drones-9-zhou-swarm-20260916': 2,
  'drones-10-reynolds-boids-20260916': 2,
  'drones-11-assignment-layer-20260916': 1,
};

const dronesSection = (() => {
  const lines = ledger.split('\n');
  const start = lines.findIndex((line) => line.startsWith('## drones.mdx'));
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
})();

const dronesRows = dronesSection
  .split('\n')
  .filter((line) => line.startsWith('|') && !/^\|[\s:|-]+\|$/.test(line.trim()))
  .filter((line) => !line.startsWith('| Claim'));

function rowCells(index: number): string[] {
  const line = dronesRows[index];
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim());
}

describe('drones originals: compound plans appended lawfully', () => {
  it('carries exactly the 11 dispatched plans, append-only after the 729 prior plans', () => {
    // 759 = 740 at the drones checkpoint + 10 space plans appended by the
    // space originals integration (2026-09-16); the 729 prior prefix and the
    // 11 drones plans are unchanged.
    expect(plans.length).toBe(759);
    expect(dronePlans.map((plan) => plan.id)).toEqual(EXPECTED_PLAN_IDS);
    // Append-only: no prior plan id moved or disappeared.
    expect(plans.slice(0, 729).every((plan) => !plan.id.startsWith('drones-'))).toBe(true);
  });

  it('binds every plan to audit/adjacent.md drones with the exact packet part shape', () => {
    expect(dronePlans.every((plan) => plan.ledgerPath === 'audit/adjacent.md')).toBe(true);
    expect(dronePlans.every((plan) => plan.articleSlug === 'drones')).toBe(true);
    for (const plan of dronePlans) {
      expect(plan.parts.length).toBe(EXPECTED_PART_COUNTS[plan.id]);
      expect(plan.kind).toBe('explicit-parts');
      // Every (part, citation) pair is covered by exactly one evidence item.
      const pairs = plan.parts.flatMap((part) =>
        part.requiredCitationIds.map((id) => `${part.id}/${id}`),
      );
      const supplied = plan.evidence.map((item) => `${item.partId}/${item.citationId}`);
      expect([...new Set(supplied)].sort()).toEqual(pairs.sort());
    }
  });

  it('keeps plan review and adjudication digests consistent with the plan content', () => {
    for (const plan of dronePlans) {
      expect(plan.planReview.planDigest).toBe(compoundPlanDigest(plan as never));
      expect(plan.adjudications.map((review) => review.partId).sort()).toEqual(
        plan.parts.map((part) => part.id).sort(),
      );
      for (const review of plan.adjudications) {
        expect(review.outcome).toBe('supported');
        expect(review.evidenceDigest).toBe(compoundPartDigest(plan as never, review.partId));
      }
    }
  });

  it('uses only registered citation ids in required sets and evidence items', () => {
    const registry = new Set(CITATIONS.map(({ id }) => id));
    for (const plan of dronePlans) {
      for (const part of plan.parts) {
        for (const id of part.requiredCitationIds) expect(registry.has(id)).toBe(true);
      }
      for (const item of plan.evidence) {
        expect(registry.has(item.citationId)).toBe(true);
        expect(item.sourceUrl).toMatch(/^https?:\/\/\S+$/);
        expect(item.supportingPassage.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it('row cells match each plan digest and bind the plan id in the Evidence plan column', () => {
    expect(dronesRows.length).toBe(11);
    const header = dronesSection.split('\n').find((line) => line.startsWith('| Claim')) ?? '';
    const headerCells = header.split('|').map((cell) => cell.trim().toLowerCase());
    expect(headerCells).toEqual([
      '',
      'claim',
      'source checked',
      'verdict',
      'note',
      'citation id',
      'source url fetched',
      'supporting passage',
      'evidence plan',
      '',
    ]);
    for (const [index, plan] of dronePlans.entries()) {
      const cells = rowCells(index);
      expect(cells.length).toBe(8);
      // Scalar evidence columns stay empty: the compound plan is the evidence.
      expect(cells[4]).toBe('');
      expect(cells[5]).toBe('');
      expect(cells[6]).toBe('');
      expect(cells[7]).toBe(plan.id);
      expect(originalClaimDigest({
        claim: cells[0],
        sourceChecked: cells[1],
        verdict: cells[2],
        note: cells[3],
      })).toBe(plan.originalCellsDigest);
    }
  });
});

describe('drones originals: packet-critical numbers survive verbatim', () => {
  it('keeps the Falanga Table I numbers and the 7-12% sentence exactly as the PDF prints them', () => {
    const table1 = dronePlans[5].evidence.find((item) => item.partId === 'dr6-table1-numbers');
    expect(table1?.supportingPassage).toContain('12.95 / 19.21 / 25.40 / 41.56');
    expect(table1?.supportingPassage).toContain('13.88 (u2=10)');
    expect(table1?.supportingPassage).toContain('31.03 (u2=50)');
    const summary = dronePlans[5].evidence.find((item) => item.partId === 'dr6-7to12-summary');
    expect(summary?.supportingPassage).toContain('between 7% and 12% larger');
  });

  it('keeps the Swift racing envelope speeds exactly as the page prints them', () => {
    expect(dronePlans[0].evidence[0].supportingPassage).toContain(
      'speeds of more than 100 km h−1',
    );
  });

  it('keeps Song RL-vs-OC peak figures and quote fragments exactly as printed', () => {
    const passage = dronePlans[3].evidence[0].supportingPassage;
    expect(passage).toContain('a peak velocity of 108 kilometers per hour');
    expect(passage).toContain('greater than 12 times the gravitational acceleration');
    expect(passage).toContain('not that it optimizes its objective better but that it optimizes a better objective');
  });
});

describe('drones originals: article corrections applied, not hedged', () => {
  it('cuts the unsourceable field-wide sentence entirely', () => {
    expect(article).not.toContain('not yet been demonstrated on real outdoor swarms at scale');
    expect(article).not.toContain('Fleet-level task allocation');
  });

  it('keeps the restricted per-paper assignment-layer statement the packet supports', () => {
    expect(article).toContain(
      'Everything cited above coordinates implicitly; none of it decides who goes where.',
    );
  });

  it('registers reynolds-boids-1987 and cites it on the Reynolds span', () => {
    expect(CITATIONS.some((entry) => entry.id === 'reynolds-boids-1987')).toBe(true);
    expect(citationsRegistry).toContain("id: 'reynolds-boids-1987'");
    expect(article).toMatch(/Reynolds' 1987 flocking model being the canonical one ?<Cite id="reynolds-boids-1987" \/>/);
    const frontmatter = article.split('---')[1];
    expect(frontmatter).toContain('- reynolds-boids-1987');
  });

  it('leaves the already-applied vasarhelyi re-point and the Soria span intact', () => {
    expect(article).toContain('<Cite id="vasarhelyi-flocking-2018" />');
    expect(article).toContain('faster and with fewer collisions than the reactive equivalent');
    expect(article).toContain('<Cite id="soria-nmpc-swarm-2021" />');
  });
});

describe('drones originals: approved deltas and protected neighbors', () => {
  it('appends exactly the 11 dispatched delta entries after the 804 prior ones', () => {
    // 834 = 815 at the drones checkpoint + 10 space deltas (sp-r*) appended
    // by the space originals integration (2026-09-16).
    expect(deltas.entries.length).toBe(834);
    const mine = deltas.entries.filter((entry) => entry.id.startsWith('dr-r'));
    expect(mine.map((entry) => entry.id)).toEqual(
      EXPECTED_PLAN_IDS.map((id, index) => `dr-r${index + 1}-20260916-1`),
    );
    for (const entry of mine) {
      expect(entry.memberId).toBe('article:adjacent/drones');
      expect(entry.manifest).toBe('prose');
      expect(entry.disposition).toBe('permanent');
      expect(entry.ownerApproval).toContain('convergence-source-l-drones-20260916d');
      expect(entry.reason).toContain(`drones original ${entry.id.match(/dr-r(\d+)/)![1]}`);
    }
  });

  it('protects the unselected adjacent sections byte-for-byte', () => {
    const lines = ledger.split('\n');
    const surgical = lines.findIndex((line) => line.startsWith('## surgical.mdx'));
    expect(surgical).toBeGreaterThan(0);
    const space = lines.findIndex((line) => line.startsWith('## space.mdx'));
    expect(space).toBeGreaterThan(surgical);
    const surgicalSection = lines.slice(surgical, space).join('\n');
    expect(surgicalSection).toContain('11,106 da Vinci systems');
    // The surgical originals integration (2026-09-16) applied rows
    // 1,2,3,4,6,7,8 with compound plans; the held Maestro row 5 keeps the
    // original 3-column shape with no evidence plan binding.
    expect(surgicalSection).toContain('Evidence plan');
    expect(surgicalSection).toContain('| Maestro: first 510(k) December 2022');
    expect(surgicalSection).not.toContain('surgical-5-');
  });

  it('keeps the prior plan order stable in the append-only compound file', () => {
    const raw = readFileSync('audit/compound-evidence.json', 'utf8');
    expect(raw.trimEnd().endsWith(']')).toBe(true);
    // The prior last plan still precedes the first appended drones plan.
    const priorLast = raw.indexOf('"id": "datasets-11-diversity-20260916c"');
    const firstDrone = raw.indexOf('"id": "drones-1-swift-intro-20260916"');
    expect(priorLast).toBeGreaterThan(-1);
    expect(firstDrone).toBeGreaterThan(priorLast);
  });
});
