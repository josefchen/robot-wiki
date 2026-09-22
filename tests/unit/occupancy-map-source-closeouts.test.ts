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
const catalog = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map((citation) => citation.id));
const records = (plans = catalog) => parseLedger('audit/classical.md', ledger, ids, { compoundPlans: plans })
  .find((section) => section.slug === 'scene-representation')!.claimRecords;
const selected = [
  [4, 'moravec-elfes-1985', ['projection', 'beam', 'updates']],
  [5, 'moravec-elfes-1985', ['no-information', 'values']],
  [36, 'cadena-2016', ['sparse', 'dense-tasks', 'dense-slam', 'cost-scope', 'storage-exceptions']],
  [37, 'cadena-2016', ['conditional-aliasing', 'vision-failure', 'active-range-exception']],
] as const;
const urls: Record<string, string> = {
  'moravec-elfes-1985': 'https://www.ri.cmu.edu/pub_files/pub4/moravec_hans_1985_1/moravec_hans_1985_1.pdf',
  'cadena-2016': 'https://arxiv.org/pdf/1606.05830v4',
};

describe('paper-scoped occupancy and map tradeoffs', () => {
  it('keeps sonar projection, uncertain reflector and overlapping observations together', () => {
    for (const text of ['two-dimensional horizontal', 'different sensors and robot positions',
      'probably empty beam interior', 'reflecting point somewhere near the measured range',
      'Overlapping readings refined these constraints']) expect(source).toContain(text);
    expect(source).not.toContain('volume that reflected it');
  });

  it('scopes zero, negative and positive confidence to the paper, not every navigation stack', () => {
    expect(source).toContain('In their sonar map, a cell with no information is unknown');
    expect(source).toContain('Zero represents unknown occupancy');
    expect(source).toContain('negative and positive cell values represent probably empty and probably occupied');
    expect(source).not.toContain('Every later navigation stack inherits');
  });

  it('retains task-dependent sparse and dense roles without impossible or universal cost rankings', () => {
    for (const text of ['discriminative features', 'dense geometric models better suited to obstacle avoidance',
      'dense models also appear in visual SLAM', 'storage size, construction cost and usefulness for the task',
      'octrees and voxel hashing']) expect(source).toContain(text);
    expect(source).not.toContain('cannot be used for collision checking');
    expect(source).not.toContain('does the reverse at much greater cost');
  });

  it('retains conditional room aliasing and specific illumination and active-range limitations', () => {
    for (const text of ['sensor-environment pair', 'two rooms may look identical to a 2D laser scanner',
      'bag-of-words methods discussed in the review', 'active range cameras',
      'range and external-light limitations']) expect(source).toContain(text);
    expect(source).not.toContain('geometrically featureless corridors');
    expect(source).not.toContain('cheap and information-dense');
  });

  it('preserves the corrected Cadena edition, ordered authors and audited registry URLs', () => {
    expect(CITATIONS.find((citation) => citation.id === 'cadena-2016')).toMatchObject({
      title: 'Past, Present, and Future of Simultaneous Localization And Mapping: Towards the Robust-Perception Age',
      authors: ['Cesar Cadena', 'Luca Carlone', 'Henry Carrillo', 'Yasir Latif',
        'Davide Scaramuzza', 'José Neira', 'Ian Reid', 'John J. Leonard'],
      year: 2016, venue: 'IEEE Transactions on Robotics', url: 'https://arxiv.org/abs/1606.05830',
    });
    expect(CITATIONS.find((citation) => citation.id === 'moravec-elfes-1985')).toMatchObject({
      authors: ['Hans P. Moravec', 'Alberto Elfes'], year: 1985,
      url: 'https://doi.org/10.1109/ROBOT.1985.1087316',
    });
    expect(source).toContain('lastReviewed: "2026-08-22"');
  });

  for (const [ordinal, citationId, parts] of selected) {
    it(`binds original ${ordinal} to its complete reviewed conjunction`, () => {
      const row = records()[ordinal - 1];
      expect(row.evidenceFailures).toEqual([]);
      expect(row.verdict).toBe('corrected');
      expect(row.note).toContain('Original four-cell tuple (JSON):');
      const plan = catalog.find((candidate) => candidate.id === row.compound?.planId)!;
      expect(plan.parts.map((part) => part.id)).toEqual(parts);
      expect(plan.evidence).toHaveLength(parts.length);
      expect(plan.adjudications).toHaveLength(parts.length);
      expect(plan.planReview?.reviewedBy).toContain('source-auditor');
      for (const evidence of plan.evidence) {
        expect(evidence.citationId).toBe(citationId);
        expect(evidence.sourceUrl).toBe(urls[citationId]);
        expect(evidence.supportingPassage.length).toBeGreaterThan(100);
      }
    });

    it(`rejects missing, extra, duplicate, stale, wrong-source and unreviewed evidence for ${ordinal}`, () => {
      const plan = catalog.find((candidate) => candidate.rowOrdinal === ordinal
        && candidate.articleSlug === 'scene-representation' && candidate.ledgerPath === 'audit/classical.md');
      expect(plan).toBeDefined();
      const rejected = (changed: CompoundPlan) => {
        const plans = catalog.map((candidate) => candidate.id === changed.id ? changed : candidate);
        expect(records(plans)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      };
      // Re-seal remaining evidence: missing a conjunct still cannot pass.
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
        (value) => { value.evidence.push({ ...value.evidence[0] }); },
        (value) => { value.evidence.push({ ...value.evidence[0], partId: 'unregistered-extra' }); },
        (value) => { value.parts[0].text += ' unsupported universal claim'; },
      ];
      for (const mutate of mutations) {
        const changed = structuredClone(plan!); mutate(changed); rejected(changed);
      }
      expect(records(catalog.filter((candidate) => candidate.id !== plan!.id))[ordinal - 1].evidenceFailures.length)
        .toBeGreaterThan(0);
    });
  }

  it('preserves completed peers and all four excluded ORB holds', () => {
    const current = records();
    for (const ordinal of [12, 13, 14, 15, 16, 17, 20, 21, 25, 26, 27, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 44]) {
      expect(current[ordinal - 1].evidenceFailures, `prior original ${ordinal}`).toEqual([]);
    }
    // Later scene-representation packets completed the formerly held ORB
    // originals 26/27/31/33, and the 20260917a identity sweep bound original 1
    // (scene-representation-1-identity-sweep-20260917a); only original 10 remains incomplete.
    expect(current[0].evidenceFailures, 'original 1 (identity sweep)').toEqual([]);
    expect(current[0].compound?.planId).toBe('scene-representation-1-identity-sweep-20260917a');
    for (const ordinal of [10]) {
      expect(current[ordinal - 1].evidenceFailures.length, `held original ${ordinal}`).toBeGreaterThan(0);
    }
  });
});
