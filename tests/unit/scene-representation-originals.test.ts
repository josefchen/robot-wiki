import { describe, expect, it } from 'vitest';
import { planPacket } from '../helpers/audit-plan-history';
import { readFileSync } from 'node:fs';
import {
  compoundPartDigest,
  compoundPlanDigest,
  originalClaimDigest,
  parseCompoundPlans,
} from '../../lib/audit-ledger';
import { CITATIONS } from '../../data/citations';

/**
 * Red-first proof for the scene-representation originals integration
 * (frozen packet convergence-source-k-scene-representation-20260916d, rows
 * 3, 18, 19, 24, 45, 46, 47, 48, 49 selected; rows 1 and 10 held by the
 * parent dispatch and untouched at that checkpoint). Every applied-state assertion here failed
 * before application and must pass after it. The regression guards (prior
 * plan order, protected held rows 1/10, neighbor sections) passed before and
 * must stay green. Later authorized repairs bind row 1 (September 17) and
 * correct row 10 (September 22); their current bindings are guarded below.
 *
 * Six of the nine records are internal/local-AND rows: their compound parts
 * are anchored to registered citations per the established internal-row
 * convention (state-estimation-17, reward-design-mpc r4), with REPO TEXT
 * evidence passages read-only at application HEAD; no fetch applies to those
 * conjuncts and none is claimed.
 */
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

const ROW_ORDINALS = [3, 18, 19, 24, 45, 46, 47, 48, 49] as const;
const EXPECTED_PLAN_IDS = [
  'scene-representation-3-point-cloud-silence-20260916d',
  'scene-representation-18-mast3r-head-20260916d',
  'scene-representation-24-occworld-20260916d',
  'scene-representation-49-disagreement-20260916d',
  'scene-representation-19-taxonomy-crossref-20260916d',
  'scene-representation-45-occluder-demo-20260916d',
  'scene-representation-46-slider-20260916d',
  'scene-representation-47-capability-table-20260916d',
  'scene-representation-48-absence-semantics-20260916d',
];
const EXPECTED_PART_COUNTS: Record<string, number> = {
  'scene-representation-3-point-cloud-silence-20260916d': 2,
  'scene-representation-18-mast3r-head-20260916d': 1,
  'scene-representation-19-taxonomy-crossref-20260916d': 1,
  'scene-representation-24-occworld-20260916d': 2,
  'scene-representation-45-occluder-demo-20260916d': 2,
  'scene-representation-46-slider-20260916d': 1,
  'scene-representation-47-capability-table-20260916d': 1,
  'scene-representation-48-absence-semantics-20260916d': 1,
  'scene-representation-49-disagreement-20260916d': 3,
};

const sceneSection = (() => {
  const lines = ledger.split('\n');
  const start = lines.findIndex((line) => line.startsWith('### scene-representation.mdx'));
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
})();

const sceneRows = sceneSection
  .split('\n')
  .filter((line) => line.startsWith('|') && !/^\|[\s:|-]+\|$/.test(line.trim()))
  .filter((line) => !line.startsWith('| Claim'));

function rowCells(index: number): string[] {
  const line = sceneRows[index];
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim());
}

describe('scene-representation originals: compound plans appended lawfully', () => {
  it('carries exactly the 9 dispatched plans, append-only after the 740 prior plans', () => {
    // The same exact packet remains contiguous after archived migrations.
    expect(planPacket(plans, EXPECTED_PLAN_IDS).map((plan) => plan.id).sort()).toEqual(
      [...EXPECTED_PLAN_IDS].sort(),
    );
    const mine = plans.filter((plan) => EXPECTED_PLAN_IDS.includes(plan.id));
    expect(mine.map((plan) => plan.id).sort()).toEqual([...EXPECTED_PLAN_IDS].sort());
    // Append-only: no prior plan id moved or disappeared. Two older
    // neural-slam plans (20260908) legitimately share the prefix.
    expect(plans.slice(0, plans.findIndex(p => p.id === EXPECTED_PLAN_IDS[0])).every((plan) => !EXPECTED_PLAN_IDS.includes(plan.id))).toBe(true);
  });

  it('binds every plan to audit/classical.md scene-representation with the exact packet part shape', () => {
    const mine = plans.filter((plan) => EXPECTED_PLAN_IDS.includes(plan.id));
    expect(mine.every((plan) => plan.ledgerPath === 'audit/classical.md')).toBe(true);
    expect(mine.every((plan) => plan.articleSlug === 'scene-representation')).toBe(true);
    expect(mine.map((plan) => plan.rowOrdinal).sort((a, b) => a - b)).toEqual([...ROW_ORDINALS]);
    for (const plan of mine) {
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
    const mine = plans.filter((plan) => EXPECTED_PLAN_IDS.includes(plan.id));
    for (const plan of mine) {
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
    const mine = plans.filter((plan) => EXPECTED_PLAN_IDS.includes(plan.id));
    for (const plan of mine) {
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
    expect(sceneRows.length).toBe(49);
    const mine = plans.filter((plan) => EXPECTED_PLAN_IDS.includes(plan.id));
    for (const plan of mine) {
      const cells = rowCells(plan.rowOrdinal - 1);
      expect(cells.length).toBe(8);
      // Scalar evidence columns stay empty: the compound plan is the evidence.
      expect(cells[3]).toBe('');
      expect(cells[4]).toBe('');
      expect(cells[5]).toBe('');
      expect(cells[7]).toBe(plan.id);
      expect(originalClaimDigest({
        claim: cells[0],
        sourceChecked: cells[1],
        verdict: cells[2],
        note: cells[6],
      })).toBe(plan.originalCellsDigest);
    }
  });
});

describe('scene-representation originals: packet-critical passages survive verbatim', () => {
  const mine = plans.filter((plan) => EXPECTED_PLAN_IDS.includes(plan.id));
  const byId = (id: string) => mine.find((plan) => plan.id === id)!;

  it('keeps the PointNet irregular-format and permutation-invariance sentences exactly as fetched', () => {
    const passage = byId('scene-representation-3-point-cloud-silence-20260916d').evidence[0].supportingPassage;
    expect(passage).toContain('Due to its irregular format, most researchers transform such data to regular 3D voxel grids or collections of images');
    expect(passage).toContain('directly consumes point clouds and well respects the permutation invariance of points in the input');
  });

  it('keeps the MASt3R head sentence verbatim', () => {
    const passage = byId('scene-representation-18-mast3r-head-20260916d').evidence[0].supportingPassage;
    expect(passage).toContain('augment the DUSt3R network with a new head that outputs dense local features, trained with an additional matching loss');
  });

  it('keeps the OccWorld abstract sentences verbatim and the pixels-contrast caveat explicit', () => {
    const passage = byId('scene-representation-24-occworld-20260916d').evidence[0].supportingPassage;
    expect(passage).toContain('learning a world model, OccWorld, in the 3D Occupancy space to simultaneously predict the movement of the ego car and the evolution of the surrounding scenes');
    expect(passage).toContain('produces competitive planning results without using instance and map supervision');
    const caveat = byId('scene-representation-24-occworld-20260916d').parts.find((part) => part.id === 'sr24-pixels-contrast-caveat');
    expect(caveat?.text).toContain('rather than how pixels do');
  });

  it('keeps the Dex-NeRF disagreement basis verbatim on both sides', () => {
    const plan = byId('scene-representation-49-disagreement-20260916d');
    const counter = plan.evidence.find((item) => item.partId === 'sr49-counterposition')?.supportingPassage;
    expect(counter).toContain("We leverage NeRF's view-independent learned density, place lights to increase specular reflections, and perform a transparency-aware depth-rendering that we feed into the Dex-Net grasp planner");
    const realsense = plan.evidence.find((item) => item.partId === 'sr49-realsense-body')?.supportingPassage;
    expect(realsense).toContain('the RealSense is unable to compute the depth of most transparent objects');
  });

  it('keeps the capability-ladder claims anchored to the printed repo table', () => {
    const table = byId('scene-representation-47-capability-table-20260916d').evidence[0].supportingPassage;
    expect(table).toContain("point-cloud: free-space 'no', contact-normal 'partial', novel-view 'no'");
    expect(table).toContain("gaussian-splat: free-space 'no', contact-normal 'no', novel-view 'yes'");
  });
});

describe('scene-representation originals: approved deltas and protected neighbors', () => {
  it('appends exactly the 9 dispatched delta entries after the 815 prior ones', () => {
    // The merged delta ledger keeps appending later packets; this packet's
    // entries keep their append slot at 1116..1124 (id order differs from
    // ordinal order), so pin the slot, not a moving total.
    expect(deltas.entries.slice(1116, 1125).map((entry) => entry.id).sort()).toEqual(
      [...ROW_ORDINALS].map((ordinal) => `sr-r${ordinal}-20260916-1`).sort(),
    );
    const mine = deltas.entries.filter((entry) => entry.id.startsWith('sr-r'));
    expect(mine.map((entry) => entry.id).sort()).toEqual(
      [...ROW_ORDINALS].map((ordinal) => `sr-r${ordinal}-20260916-1`).sort(),
    );
    for (const entry of mine) {
      expect(entry.memberId).toBe('article:classical/scene-representation');
      expect(entry.manifest).toBe('prose');
      expect(entry.disposition).toBe('permanent');
      expect(entry.ownerApproval).toContain('convergence-source-k-scene-representation-20260916d');
      expect(entry.reason).toContain(`scene-representation original ${entry.id.match(/sr-r(\d+)/)![1]}`);
      // No article change in this lane: the prose member hash is unchanged.
      expect(entry.oldHash).toBe(entry.newHash);
    }
  });

  it('protects the authorized row-10 correction and applied row-1 sweep binding', () => {
    // 2026-09-17a single-leftovers: row 1's claim cell now counts the real 24
    // frontmatter ids and binds the 24-identity compound plan; the three
    // scalar evidence cells stay empty (compound rows reject scalar fields).
    expect(rowCells(0)[2]).toBe('V');
    expect(rowCells(0)[3] ?? '').toBe('');
    expect(rowCells(0)[7] ?? '').toBe('scene-representation-1-identity-sweep-20260917a');
    expect(rowCells(0)[0]).toContain('Bibliographic fidelity of all 24 cited registry entries');
    expect(rowCells(9)[2]).toBe('C');
    expect(rowCells(9)[3] ?? '').toBe('');
    expect(rowCells(9)[7] ?? '').toBe('classical-scene-representation-10-kinectfusion-correction-20260922');
    expect(rowCells(9)[0]).toContain('KinectFusion uses a projective TSDF rather than a true discrete SDF');
    expect(rowCells(9)[6]).toContain('Stored distance is the collision margin');
  });

  it('keeps prior complete rows and sections intact (no re-serialization)', () => {
    // Row 6 (Curless-Levoy scalar evidence) stays exactly as committed.
    expect(rowCells(5)[3]).toBe('curless-levoy-1996');
    expect(rowCells(5)[7] ?? '').toBe('');
    const lines = ledger.split('\n');
    const slam = lines.findIndex((line) => line.startsWith('### state-estimation.mdx'));
    expect(slam).toBeGreaterThan(0);
    const priorLast = JSON.stringify(plans[plans.findIndex(p => p.id === EXPECTED_PLAN_IDS[0]) - 1].id);
    expect(priorLast).toContain('drones-11-assignment-layer-20260916');
  });

  it('keeps the prior plan order stable in the append-only compound file', () => {
    const raw = readFileSync('audit/compound-evidence.json', 'utf8');
    expect(raw.trimEnd().endsWith(']')).toBe(true);
    const priorLast = raw.indexOf('"id": "drones-11-assignment-layer-20260916"');
    const firstMine = raw.indexOf('"id": "scene-representation-3-point-cloud-silence-20260916d"');
    expect(priorLast).toBeGreaterThan(-1);
    expect(firstMine).toBeGreaterThan(priorLast);
  });
});
