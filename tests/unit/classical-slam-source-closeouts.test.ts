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
import {
  parseCitationLedgerRows,
  reconcileCitationCoverage,
} from '../../lib/audit-citation-coverage';

const article = readFileSync('content/classical/scene-representation.mdx', 'utf8');
const ledger = readFileSync('audit/classical.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map((citation) => citation.id));
const records = (catalog = plans) =>
  parseLedger('audit/classical.md', ledger, ids, { compoundPlans: catalog })
    .find((section) => section.slug === 'scene-representation')!.claimRecords;

describe('classical SLAM source corrections', () => {
  it('keeps sensor-dependent abstraction, association and back-end feedback together', () => {
    const block = article.split('\n\n').find((text) => text.startsWith('In Section II, Cadena'));
    expect(block).toBeDefined();
    for (const text of [
      'sensor-dependent front end',
      'abstracts measurements into models suitable for estimation',
      'associates observations with state variables',
      'back end that performs inference',
      'feed information back to support loop-closure detection and validation',
      '<Cite id="cadena-2016" />.',
    ]) expect(block).toContain(text);
    expect(block).not.toMatch(/Source:|<br\b|className="block"/);
    expect(article).not.toContain('Nearly every design argument in SLAM');
    expect(article).toContain('lastReviewed: "2026-08-22"');
  });

  it('uses the retained Cadena title and eight-author body without changing the audited URL', () => {
    expect(CITATIONS.find((citation) => citation.id === 'cadena-2016')).toMatchObject({
      title: 'Past, Present, and Future of Simultaneous Localization And Mapping: Towards the Robust-Perception Age',
      authors: [
        'Cesar Cadena', 'Luca Carlone', 'Henry Carrillo', 'Yasir Latif',
        'Davide Scaramuzza', 'José Neira', 'Ian Reid', 'John J. Leonard',
      ],
      year: 2016,
      venue: 'IEEE Transactions on Robotics',
      arxiv: '1606.05830',
      url: 'https://arxiv.org/abs/1606.05830',
    });
    const coverage = reconcileCitationCoverage({
      registry: CITATIONS,
      rows: parseCitationLedgerRows(readFileSync('audit/citations.md', 'utf8')),
    });
    expect(coverage.failures.filter((failure) => failure.message.includes('cadena-2016'))).toEqual([]);
  });

  it('binds original 25 to both reviewed obligations and rejects missing or stale evidence', () => {
    const row = records()[24];
    expect(row.evidenceFailures).toEqual([]);
    expect(row.note).toContain('Original four-cell tuple (JSON):');
    const plan = plans.find((candidate) => candidate.id === row.compound?.planId)!;
    expect(plan.parts.map((part) => part.id)).toEqual(['decomposition', 'association-feedback']);
    expect(plan.planReview?.reviewedBy).toContain('source-auditor');
    const mutations: Array<(value: CompoundPlan) => void> = [
      (value) => { value.planReview = null; },
      (value) => { value.adjudications = []; },
      (value) => { value.originalCellsDigest = '0'.repeat(64); },
      (value) => { value.evidence[0].sourceUrl = 'https://example.invalid/wrong-document'; },
      (value) => { value.evidence[0].citationId = 'orb-slam-2015'; },
      (value) => { value.evidence[0].supportingPassage = ''; },
    ];
    for (const part of plan.parts) {
      const changed = structuredClone(plan);
      changed.evidence = changed.evidence.filter((item) => item.partId !== part.id);
      changed.planReview!.planDigest = compoundPlanDigest(changed);
      changed.adjudications = changed.adjudications.map((item) => ({
        ...item, evidenceDigest: compoundPartDigest(changed, item.partId),
      }));
      expect(records(plans.map((candidate) => candidate.id === changed.id ? changed : candidate))
        [24].evidenceFailures.length, part.id).toBeGreaterThan(0);
    }
    for (const mutate of mutations) {
      const changed = structuredClone(plan);
      mutate(changed);
      expect(records(plans.map((candidate) => candidate.id === changed.id ? changed : candidate))
        [24].evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('retains all earlier scene source completions without claiming whole P1 or local proof', () => {
    for (const ordinal of [12, 13, 14, 15, 16, 17, 18, 20, 21, 24, 40, 41, 42, 43, 44, 45, 49]) {
      expect(records()[ordinal - 1].evidenceFailures, `original ${ordinal}`).toEqual([]);
    }
    // Later scene-representation packets completed the formerly excluded
    // 18/24/45/49, and the 20260917a identity sweep bound original 1
    // (scene-representation-1-identity-sweep-20260917a). The later TSDF
    // correction binds original 10 to its own source-qualified plan.
    expect(records()[0].evidenceFailures, 'original 1 (identity sweep)').toEqual([]);
    expect(records()[0].compound?.planId).toBe('scene-representation-1-identity-sweep-20260917a');
    expect(records()[9].evidenceFailures).toEqual([]);
    expect(records()[9].verdict).toBe('C');
    expect(records()[9].compound?.planId).toBe('classical-scene-representation-10-kinectfusion-correction-20260922');
    for (const ordinal of [18, 24, 45, 49]) {
      const p = plans.find(p => p.articleSlug === 'scene-representation' && p.rowOrdinal === ordinal)!;
      expect(p.evidence.length, `later reviewed original ${ordinal}`).toBeGreaterThan(0);
      expect(p.adjudications).toHaveLength(p.parts.length);
      expect(records()[ordinal - 1].evidenceFailures, `later completed original ${ordinal}`).toEqual([]);
    }
  });
});
