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

const source = readFileSync('content/classical/scene-representation.mdx', 'utf8');
const ledger = readFileSync('audit/classical.md', 'utf8');
const comments = readFileSync('data/citations.ts', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')))
  .filter((plan) => plan.ledgerPath === 'audit/classical.md');
const ids = new Set(CITATIONS.map((citation) => citation.id));
const records = (catalog = plans) =>
  parseLedger('audit/classical.md', ledger, ids, { compoundPlans: catalog })
    .find((section) => section.slug === 'scene-representation')!.claimRecords;

describe('retained visual place and SLAM backend corrections', () => {
  it('scopes Lowry to visual maps, permits motion information and separates aliasing', () => {
    expect(source).toContain('For visual navigation,');
    expect(source).toContain('motion information can also inform this belief');
    expect(source).toContain('Viewpoint, illumination and seasonal changes');
    expect(source).toContain('different places can look alike (perceptual aliasing)');
    expect(source).not.toContain('deciding from sensor data alone');
    expect(source).toContain('<Cite id="lowry-2016-place-recognition" />');
  });

  it('distinguishes joint nonlinear MAP from sparse linearised solves and matrix roles', () => {
    for (const text of [
      'maximum a posteriori (MAP)',
      'Gaussian process and measurement models',
      'known data associations',
      'nonlinear least-squares',
      'successive sparse linearised systems',
      'QR of the measurement Jacobian',
      'Cholesky of the information matrix',
      'variable ordering controls fill-in',
    ]) expect(source).toContain(text);
    expect(comments).not.toContain('factor the information matrix once');
  });

  it('retains iSAM2 ancestors, subtree reattachment, threshold approximation and batch-cost limits', () => {
    for (const text of [
      'incremental reordering and relinearisation',
      'affected cliques and their ancestors',
      'reattaches unaffected subtrees',
      'Thresholded state updates trade some accuracy for speed',
      'large loop closures can cost as much as a batch solve',
    ]) expect(source).toContain(text);
    expect(source).not.toContain('a new measurement updates only the affected part');
    expect(comments).not.toContain('incremental updates stay local as the graph grows');
  });

  it('preserves complete ordered bylines, audited DOI URLs, dates and edition uncertainty', () => {
    const expected = [
      ['lowry-2016-place-recognition', 2016, '10.1109/TRO.2015.2496823',
        ['Stephanie Lowry', 'Niko Sünderhauf', 'Paul Newman', 'John J. Leonard', 'David Cox', 'Peter Corke', 'Michael J. Milford']],
      ['dellaert-kaess-2006', 2006, '10.1177/0278364906072768', ['Frank Dellaert', 'Michael Kaess']],
      ['kaess-2012', 2012, '10.1177/0278364911430419',
        ['Michael Kaess', 'Hordur Johannsson', 'Richard Roberts', 'Viorela Ila', 'John J. Leonard', 'Frank Dellaert']],
    ] as const;
    for (const [id, year, doi, authors] of expected) {
      expect(CITATIONS.find((citation) => citation.id === id)).toMatchObject({
        year, url: `https://doi.org/${doi}`, authors: [...authors],
      });
    }
    expect(comments).toContain('1181-1203 versus author-page 1181-1204 remains unestablished');
    expect(comments).toContain('April 6, 2011 draft');
    expect(comments).toContain('not Version-of-Record certification');
    expect(source).toContain('lastReviewed: "2026-08-22"');
  });

  for (const [ordinal, citationId, evidenceCount] of [
    [32, 'lowry-2016-place-recognition', 3],
    [34, 'dellaert-kaess-2006', 4],
    [35, 'kaess-2012', 4],
  ] as const) {
    it(`binds original ${ordinal} to all three reviewed AND parts`, () => {
      const row = records()[ordinal - 1];
      expect(row.evidenceFailures).toEqual([]);
      expect(row.verdict).toBe('corrected');
      expect(row.note).toContain('Original four-cell tuple (JSON):');
      const plan = plans.find((candidate) => candidate.id === row.compound?.planId)!;
      expect(plan.parts).toHaveLength(3);
      expect(plan.evidence).toHaveLength(evidenceCount);
      expect(plan.adjudications).toHaveLength(3);
      expect(plan.planReview?.reviewedBy).toContain('source-auditor');
      for (const evidence of plan.evidence) expect(evidence.citationId).toBe(citationId);
    });

    it(`rejects ten incomplete, stale or unresolved mutations for original ${ordinal}`, () => {
      const row = records()[ordinal - 1];
      const plan = plans.find((candidate) => candidate.id === row.compound?.planId);
      expect(plan).toBeDefined();
      const rejected = (changed: CompoundPlan) => {
        const catalog = plans.map((candidate) => candidate.id === changed.id ? changed : candidate);
        expect(records(catalog)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      };
      for (const part of plan!.parts) {
        const changed = structuredClone(plan!);
        changed.evidence = changed.evidence.filter((item) => item.partId !== part.id);
        changed.planReview!.planDigest = compoundPlanDigest(changed);
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
        (value) => { value.adjudications[0].outcome = 'unresolved'; },
      ];
      for (const mutate of mutations) {
        const changed = structuredClone(plan!);
        mutate(changed);
        rejected(changed);
      }
    });
  }

  it('preserves preceding source corrections and keeps unassigned originals incomplete', () => {
    const current = records();
    for (const ordinal of [12, 13, 14, 15, 16, 17, 20, 21, 25, 26, 27, 31, 33, 38, 39, 40, 41, 42, 43, 44]) {
      expect(current[ordinal - 1].evidenceFailures, `original ${ordinal}`).toEqual([]);
    }
    // The scene-representation-20260916d packet completed the formerly held
    // originals 18, 24, 45 and 49; each now binds its own compound plan.
    for (const [ordinal, planId] of [
      [18, 'scene-representation-18-mast3r-head-20260916d'],
      [24, 'scene-representation-24-occworld-20260916d'],
      [45, 'scene-representation-45-occluder-demo-20260916d'],
      [49, 'scene-representation-49-disagreement-20260916d'],
    ] as const) {
      const record = current[ordinal - 1];
      expect(record.evidenceFailures, `original ${ordinal}`).toEqual([]);
      expect(record.compound?.planId, `original ${ordinal}`).toBe(planId);
    }
    expect(source).toContain('In Section II, Cadena and colleagues separate a sensor-dependent front end');
    expect(source).toContain('The MLP is the dense scene map, not the system\'s only stored data');
    expect(source).toContain('does not perform loop closure');
  });
});
