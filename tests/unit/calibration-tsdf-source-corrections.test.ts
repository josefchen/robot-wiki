import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest,
  compoundPlanDigest,
  parseCompoundPlans,
  parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';

const perception = readFileSync('content/classical/perception.mdx', 'utf8');
const scene = readFileSync('content/classical/scene-representation.mdx', 'utf8');
const ledger = readFileSync('audit/classical.md', 'utf8');
const comments = readFileSync('data/citations.ts', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map((citation) => citation.id));
const records = (slug: string, catalog = plans, text = ledger) =>
  parseLedger('audit/classical.md', text, ids, { compoundPlans: catalog })
    .find((section) => section.slug === slug)!.claimRecords;
const selected = [
  ['perception', 8, 2, 2],
  ['perception', 13, 2, 2],
  ['scene-representation', 7, 2, 3],
  ['scene-representation', 8, 4, 5],
  ['scene-representation', 9, 2, 2],
] as const;
const zhang = ['zhang-2000-calibration', 'https://doi.org/10.1109/34.888718'];
const curless = ['curless-levoy-1996', 'https://graphics.stanford.edu/papers/volrange/volrange.pdf'];
const kinect = ['kinectfusion-2011', 'https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/ismar2011.pdf'];
const authorPage = ['kinectfusion-2011', 'https://www.microsoft.com/en-us/research/publication/kinectfusion-real-time-dense-surface-mapping-tracking/'];
const expectedPairs: Record<string, string[][]> = {
  'perception:8': [['journal-date', ...zhang], ['planar-unknown-motion', ...zhang]],
  'perception:13': [['radial-model', ...zhang], ['closed-form-refinement', ...zhang]],
  'scene-representation:7': [
    ['kinect-sign', ...kinect], ['kinect-sign', ...authorPage], ['curless-state-convention', ...curless],
  ],
  'scene-representation:8': [
    ['kinect-input', ...kinect], ['tracking-algorithm', ...kinect],
    ['gpu-frame-rate', ...kinect], ['gpu-frame-rate', ...authorPage], ['planar-limit', ...kinect],
  ],
  'scene-representation:9': [['curless-truncation', ...curless], ['kinect-projective-truncation', ...kinect]],
};
const pairedSources = (plan: CompoundPlan) =>
  plan.evidence.map(({ partId, citationId, sourceUrl }) => [partId, citationId, sourceUrl]);

describe('source-scoped calibration and TSDF corrections', () => {
  it('uses the Zhang journal abstract without borrowing unseen report details', () => {
    expect(perception).toContain('value="2000" note="planar target; motion need not be known"');
    expect(perception).toContain('models radial lens distortion');
    expect(perception).toContain('closed-form solution followed by nonlinear refinement under a maximum-likelihood criterion');
    expect(perception).not.toContain('recovers them along with each view\'s pose');
    expect(perception).not.toContain('intrinsics from a planar target at unknown orientations');
    expect(perception).toContain('lastReviewed: "2026-08-22"');
  });

  it('names both sign constructions and keeps projective truncation source-specific', () => {
    for (const text of [
      'KinectFusion describes positive values toward visible free space and negative values on the non-visible side',
      'empty space with negative $D_{min}$ and unseen space with positive $D_{max}$, both at zero weight',
      'KinectFusion uses a projective TSDF',
      'non-visible points farther than $\\mu$ from the surface are not measured',
    ]) expect(scene).toContain(text);
    expect(scene).not.toContain('For robotics the truncated variant is the one that matters');
  });

  it('bounds KinectFusion timing to its sensor and GPU setup with planar-scene failure', () => {
    for (const text of [
      '11-bit, 640×480 depth frames at 30 Hz',
      'coarse-to-fine ICP tracks the live depth frame against the fused global model',
      'commodity-GPU implementation tracks and maps at the sensor frame rate',
      'large planar scene filling most of the field of view can cause tracking drift or failure',
    ]) expect(scene).toContain(text);
    expect(scene).not.toContain('which is what moved the representation from offline reconstruction onto live robots');
    expect(comments).not.toContain('Curless-Levoy volumetric method onto a live robot');
  });

  it('preserves primary ordered bylines, publication dates and audited citation URLs', () => {
    const expected = [
      ['zhang-2000-calibration', 2000, '10.1109/34.888718', ['Z. Zhang']],
      ['curless-levoy-1996', 1996, '10.1145/237170.237269', ['Brian Curless', 'Marc Levoy']],
      ['kinectfusion-2011', 2011, '10.1109/ISMAR.2011.6092378', [
        'Richard A. Newcombe', 'Shahram Izadi', 'Otmar Hilliges', 'David Molyneaux',
        'David Kim', 'Andrew J. Davison', 'Pushmeet Kohli', 'Jamie Shotton',
        'Steve Hodges', 'Andrew Fitzgibbon',
      ]],
    ] as const;
    for (const [id, year, doi, authors] of expected) {
      expect(CITATIONS.find((citation) => citation.id === id)).toMatchObject({
        year, url: `https://doi.org/${doi}`, authors: [...authors],
      });
    }
    expect(scene).toContain('lastReviewed: "2026-08-22"');
  });

  for (const [slug, ordinal, parts, evidence] of selected) {
    it(`binds ${slug}:${ordinal} to its complete reviewed AND plan and original history`, () => {
      const row = records(slug)[ordinal - 1];
      expect(row.evidenceFailures).toEqual([]);
      expect(row.verdict).toBe('corrected');
      expect(row.note).toContain('Original four-cell tuple (JSON):');
      const plan = plans.find((candidate) => candidate.id === row.compound?.planId)!;
      expect(plan.parts).toHaveLength(parts);
      expect(plan.evidence).toHaveLength(evidence);
      expect(plan.adjudications).toHaveLength(parts);
      expect(plan.planReview?.reviewedBy).toContain('source-auditor');
      expect(pairedSources(plan)).toEqual(expectedPairs[`${slug}:${ordinal}`]);
    });

    it(`rejects missing source, wrong pair, stale tuple and review mutations for ${slug}:${ordinal}`, () => {
      const row = records(slug)[ordinal - 1];
      const plan = plans.find((candidate) => candidate.id === row.compound?.planId);
      expect(plan).toBeDefined();
      const rejected = (changed: CompoundPlan) => {
        const catalog = plans.map((candidate) => candidate.id === changed.id ? changed : candidate);
        expect(records(slug, catalog)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      };
      // Re-sign missing-pair mutations so the pair/AND oracle, not just a stale
      // review hash, has to reject the incomplete evidence.
      for (const part of plan!.parts) {
        const changed = structuredClone(plan!);
        changed.evidence = changed.evidence.filter((item) => item.partId !== part.id);
        changed.adjudications = changed.adjudications.map((item) => ({
          ...item, evidenceDigest: compoundPartDigest(changed, item.partId),
        }));
        rejected(changed);
      }
      const mutations: Array<(value: CompoundPlan) => void> = [
        (value) => { value.planReview = null; },
        (value) => { value.adjudications = []; },
        (value) => { value.originalCellsDigest = '0'.repeat(64); },
        (value) => { value.evidence[0].sourceUrl = 'https://example.invalid/wrong-document'; },
        (value) => { value.evidence[0].citationId = 'orb-slam-2015'; },
        (value) => { value.evidence[0].supportingPassage = ''; },
        (value) => { value.evidence[0].partId = 'absent-part'; },
        (value) => { value.adjudications[0].outcome = 'unresolved'; },
        (value) => { value.parts[0].text += ' unsupported extension'; },
      ];
      for (const mutate of mutations) {
        const changed = structuredClone(plan!);
        mutate(changed);
        rejected(changed);
      }
      const changed = structuredClone(plan!);
      changed.evidence[0].sourceUrl = 'https://example.invalid/wrong-document';
      changed.planReview!.planDigest = compoundPlanDigest(changed);
      changed.adjudications = changed.adjudications.map((item) => ({
        ...item, evidenceDigest: compoundPartDigest(changed, item.partId),
      }));
      // The native parser checks structure, not source truth. A forged reviewer
      // can re-sign a syntactically valid URL. The exact retained-source binding
      // above must independently reject that URL; do not pretend the native
      // structural gate is a document oracle or weaken it to make this test pass.
      const catalog = plans.map((candidate) => candidate.id === changed.id ? changed : candidate);
      expect(records(slug, catalog)[ordinal - 1].evidenceFailures).toEqual([]);
      expect(pairedSources(changed)).not.toEqual(expectedPairs[`${slug}:${ordinal}`]);
    });
  }

  it('preserves later scene repairs and does not credit excluded originals', () => {
    const current = records('scene-representation');
    for (const ordinal of [4, 5, 25, 26, 27, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45]) {
      expect(current[ordinal - 1].evidenceFailures, `prior original ${ordinal}`).toEqual([]);
    }
    // Later scene-representation packets completed the formerly excluded
    // 26/27/31/33/45, and the 20260917a identity sweep bound original 1
    // (scene-representation-1-identity-sweep-20260917a); only original 10 remains incomplete.
    expect(current[0].evidenceFailures, 'original 1 (identity sweep)').toEqual([]);
    expect(current[0].compound?.planId).toBe('scene-representation-1-identity-sweep-20260917a');
    for (const ordinal of [10]) {
      expect(current[ordinal - 1].evidenceFailures.length, `excluded original ${ordinal}`).toBeGreaterThan(0);
    }
    expect(scene).toContain('does not perform loop closure');
    expect(scene).toContain('storage size, construction cost and usefulness for the task');
    expect(scene).toContain('motion information can also inform this belief');
  });
});
