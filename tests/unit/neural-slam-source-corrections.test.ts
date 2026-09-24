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
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map((citation) => citation.id));
const records = (catalog = plans) =>
  parseLedger('audit/classical.md', ledger, ids, { compoundPlans: catalog })
    .find((section) => section.slug === 'scene-representation')!.claimRecords;

describe('source-scoped neural SLAM prose', () => {
  it('separates the iMAP dense map from retained optimization state and online timing', () => {
    const block = source.split('\n\n').find((text) => text.startsWith('iMAP learns'));
    expect(block).toBeDefined();
    for (const text of [
      'without prior training data',
      "not the system's only stored data",
      'RGB-D keyframes and poses are retained for replay',
      'tracking at 10 Hz and mapping at 2 Hz',
      'fine map detail takes minutes',
      'room-scale mapping',
      'rendering uses camera intrinsics',
      '<Cite id="imap-2021" />',
    ]) expect(block).toContain(text);
    expect(source).not.toContain('Learned components entered at the map, not at the optimiser.');
    expect(source).not.toContain('The back end stayed recognisably the same shape.');
  });

  it('keeps NICE-SLAM priors, multiple decoders, local/global state and bounded runtime scope', () => {
    const block = source.split('\n\n').find((text) => text.startsWith('NICE-SLAM uses'));
    expect(block).toBeDefined();
    for (const text of [
      'three fixed, pretrained geometry decoders',
      'a colour decoder optimised online',
      'Synthetic Indoor Scene Dataset',
      'static-scene mapping formulation',
      'a global keyframe list is retained',
      'does not perform loop closure',
      '47 ms tracking and 130 ms mapping',
      '200 tracking pixels and 1,000 mapping pixels',
      'RTX 3090/Intel i7-10700K',
      'not a latency guarantee for the apartment',
      '<Cite id="nice-slam-2022" />',
    ]) expect(block).toContain(text);
  });

  it('preserves the two paper identities and ordered bylines', () => {
    expect(CITATIONS.find((citation) => citation.id === 'imap-2021')).toMatchObject({
      title: 'iMAP: Implicit Mapping and Positioning in Real-Time',
      authors: ['Edgar Sucar', 'Shikun Liu', 'Joseph Ortiz', 'Andrew J. Davison'],
      year: 2021,
      arxiv: '2103.12352',
      url: 'https://arxiv.org/abs/2103.12352',
    });
    expect(CITATIONS.find((citation) => citation.id === 'nice-slam-2022')).toMatchObject({
      title: 'NICE-SLAM: Neural Implicit Scalable Encoding for SLAM',
      authors: [
        'Zihan Zhu', 'Songyou Peng', 'Viktor Larsson', 'Weiwei Xu',
        'Hujun Bao', 'Zhaopeng Cui', 'Martin R. Oswald', 'Marc Pollefeys',
      ],
      year: 2022,
      arxiv: '2112.12130',
      url: 'https://arxiv.org/abs/2112.12130',
    });
    expect(source).toContain('lastReviewed: "2026-08-22"');
  });

  for (const [ordinal, citationId, version] of [
    [38, 'imap-2021', '2103.12352v2'],
    [39, 'nice-slam-2022', '2112.12130v2'],
  ] as const) {
    it(`binds original ${ordinal} to seven reviewed AND parts and explicit history`, () => {
      const row = records()[ordinal - 1];
      expect(row.evidenceFailures).toEqual([]);
      expect(row.note).toContain('Original four-cell tuple (JSON):');
      const plan = plans.find((candidate) => candidate.id === row.compound?.planId)!;
      expect(plan.parts).toHaveLength(7);
      expect(plan.evidence).toHaveLength(7);
      expect(plan.adjudications).toHaveLength(7);
      expect(plan.planReview?.reviewedBy).toContain('source-auditor');
      for (const evidence of plan.evidence) {
        expect(evidence.citationId).toBe(citationId);
        expect(evidence.sourceUrl).toBe(`https://arxiv.org/pdf/${version}`);
      }
    });

    it(`rejects fourteen missing, stale or unresolved evidence mutations for original ${ordinal}`, () => {
      const row = records()[ordinal - 1];
      const plan = plans.find((candidate) => candidate.id === row.compound?.planId);
      expect(plan).toBeDefined();
      const assertRejected = (changed: CompoundPlan) => {
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
        assertRejected(changed);
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
        assertRejected(changed);
      }
    });
  }

  it('preserves earlier repairs and the separately qualified TSDF correction', () => {
    const current = records();
    for (const ordinal of [12, 13, 14, 15, 16, 17, 18, 20, 21, 24, 25, 26, 27, 31, 33, 40, 41, 42, 43, 44, 45, 49]) {
      expect(current[ordinal - 1].evidenceFailures, `original ${ordinal}`).toEqual([]);
    }
    // Later scene-representation packets completed the formerly excluded
    // 18/24/26/27/31/33/45/49, and the 20260917a identity sweep bound original 1
    // (scene-representation-1-identity-sweep-20260917a). Original 10 now has
    // its separate source-qualified TSDF correction.
    expect(current[0].evidenceFailures, 'original 1 (identity sweep)').toEqual([]);
    expect(current[0].compound?.planId).toBe('scene-representation-1-identity-sweep-20260917a');
    expect(current[9].evidenceFailures).toEqual([]);
    expect(current[9].verdict).toBe('C');
    expect(current[9].compound?.planId).toBe('classical-scene-representation-10-kinectfusion-correction-20260922');
    expect(source).toContain('<Cite id="layered-costmaps-2014" />.');
    expect(source).not.toContain('<span className="block">Source: <Cite id="layered-costmaps-2014" /></span>');
    for (const ordinal of [18, 24, 26, 27, 31, 33, 45, 49]) {
      const p = plans.find(p => p.articleSlug === 'scene-representation' && p.rowOrdinal === ordinal)!;
      expect(p.parts.length, `later source-backed original ${ordinal}`).toBeGreaterThan(0);
      expect(p.evidence.length).toBeGreaterThan(0);
      expect(current[ordinal - 1].evidenceFailures, `later complete original ${ordinal}`).toEqual([]);
    }
  });

  it('keeps the earlier costmap and front-end source repairs in the article', () => {
    const block = source.split('\n\n').find((text) =>
      text.includes('proposed and implemented layered costmaps in the ROS Navigation stack'));
    expect(block).toBeDefined();
    expect(block).toContain('remains configurable <Cite id="layered-costmaps-2014" />.');
    expect(block).toContain('Navigation2 uses a layered costmap <Cite id="nav2-2020" />.');
    expect(block).not.toMatch(/Source:|<br\b|className="block"/);
    expect(source).toContain('In Section II, Cadena and colleagues separate a sensor-dependent front end');
  });
});
