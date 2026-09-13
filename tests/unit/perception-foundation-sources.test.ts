// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  compoundPartDigest, compoundPlanDigest, parseCompoundPlans, parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';

const article = readFileSync('content/classical/perception.mdx', 'utf8');
const ledger = readFileSync('audit/classical.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const selected = [11, 37, 38, 39, 40, 41] as const;
const counts = { 11: 3, 37: 4, 38: 5, 39: 6, 40: 10, 41: 12 };
const expected = {
  11: ['segment-anything-2023', '2304.02643'],
  37: ['grounding-dino-2024', '2303.05499'],
  38: ['grounding-dino-2024', '2303.05499'],
  39: ['dinov2-2023', '2304.07193'],
  40: ['segment-anything-2023', '2304.02643'],
  41: ['sam2-2024', '2408.00714'],
} as const;
const section = (catalog: CompoundPlan[]) =>
  parseLedger('audit/classical.md', ledger, ids, { compoundPlans: catalog })
    .find(s => s.slug === 'perception')!;
const getPlan = (ordinal: number) => {
  const plan = plans.find(p => p.ledgerPath === 'audit/classical.md' &&
    p.articleSlug === 'perception' && p.rowOrdinal === ordinal);
  expect(plan, `native reviewed plan for original ${ordinal}`).toBeDefined();
  return structuredClone(plan!);
};
const changed = (plan: CompoundPlan) => plans.map(p => p.id === plan.id ? plan : p);
// Supplemental document binding: the native schema checks URL structure and
// pair coverage, not whether an otherwise valid URL is the intended paper.
const strictSource = (plan: CompoundPlan, ordinal: typeof selected[number]) => {
  const [cid, document] = expected[ordinal];
  for (const item of plan.evidence) {
    expect(item.citationId).toBe(cid);
    expect([`https://arxiv.org/html/${document}`, `https://arxiv.org/abs/${document}`])
      .toContain(item.sourceUrl);
    expect(item.supportingPassage.split(/\s+/).length).toBeGreaterThan(20);
  }
};

describe('perception foundation corrections', () => {
  it('qualifies Grounding DINO fusion, REC and the COCO result', () => {
    expect(article).toContain('language-guided query selection');
    expect(article).toContain('weak referring-expression performance without REC training data');
    expect(article).toContain('52.5 AP on COCO 2017 validation');
    expect(article).toContain('Swin-L');
    expect(article).toContain('O365');
    expect(article).toContain('not that its object categories were absent from pretraining');
  });
  it('distinguishes frozen DINOv2 encoders from trained predictors', () => {
    expect(article).toContain('while training task-specific predictors');
    expect(article).toContain('linear or DPT depth heads');
    expect(article).not.toContain('objects at deployment were not in any label set');
  });
  it('makes the SAM Stat a dataset population, not training consumption', () => {
    expect(article).toContain('note="SAM; SA-1B: 1.1 billion masks on 11 million images"');
    expect(article).not.toContain('trained on over a billion masks');
    expect(article).toContain('training recipe samples and filters masks');
  });
  it('preserves SAM ambiguity, evaluation, text training and timing boundaries', () => {
    for (const text of ['multiple candidate masks', '16 of those 23 datasets',
      'most confident mask', 'separately trained, CLIP-conditioned', 'precomputed image embedding',
      'heavy image encoder']) expect(article).toContain(text);
  });
  it('keeps SAM 2.1 interactions and throughput in their own protocols', () => {
    for (const text of ['SAM 2.1', 'nine densely annotated video datasets',
      'SAM+XMem++', 'SAM+Cutie', '130.1 versus 21.7', 'image batches of 10',
      'PyTorch 2.3.1', 'CUDA 12.1', 'bfloat16', '61.4', '61.9',
      'Appendix F.1.4', 'OVIS']) expect(article).toContain(text);
    expect(article).not.toContain('running six times faster than SAM on images');
  });
  it('couples the glossary, evidenced editions and unchanged canonical URLs/date', () => {
    const term = GLOSSARY.find(t => t.id === 'promptable-segmentation')!;
    expect(term.definition).toContain('multiple candidate masks');
    expect(term.definition).toContain('separate ViTDet detector');
    expect(term.definition).not.toContain('without retraining');
    expect(term.citations).toEqual(['segment-anything-2023', 'sam2-2024']);
    expect(CITATIONS.find(c => c.id === 'segment-anything-2023')?.venue).toBe('arXiv 2023');
    expect(CITATIONS.find(c => c.id === 'grounding-dino-2024')?.venue).toBe('arXiv 2024');
    for (const [cid, doc] of Object.values(expected)) {
      expect(CITATIONS.find(c => c.id === cid)?.url).toBe(`https://arxiv.org/abs/${doc}`);
    }
    expect(article).toContain('lastReviewed: "2026-08-22"');
  });
});

for (const ordinal of selected) {
  describe(`perception original ${ordinal} native AND controls`, () => {
    it('has every reviewed part and exact intended-source pair', () => {
      const plan = getPlan(ordinal);
      expect(plan.parts).toHaveLength(counts[ordinal]);
      expect(plan.evidence).toHaveLength(counts[ordinal]);
      expect(plan.adjudications).toHaveLength(counts[ordinal]);
      strictSource(plan, ordinal);
      expect(section(plans).claimRecords[ordinal - 1].evidenceFailures).toEqual([]);
    });
    for (const mutation of ['missing', 'partial', 'stale', 'wrong-citation', 'blank-passage', 'unreviewed'] as const) {
      it(`rejects ${mutation} native evidence`, () => {
        const plan = getPlan(ordinal);
        if (mutation === 'missing') plan.evidence = [];
        if (mutation === 'partial') plan.evidence.pop();
        if (mutation === 'stale') plan.evidence[0].supportingPassage += ' stale alteration';
        if (mutation === 'wrong-citation') plan.evidence[0].citationId = 'dinov2-2023';
        if (mutation === 'wrong-citation' && ordinal === 39) plan.evidence[0].citationId = 'sam2-2024';
        if (mutation === 'blank-passage') plan.evidence[0].supportingPassage = '';
        if (mutation === 'unreviewed') { plan.planReview = null; plan.adjudications = []; }
        expect(section(changed(plan)).claimRecords[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      });
    }
    it('rejects wrong-document URLs even after rehashing structurally valid reviews', () => {
      const plan = getPlan(ordinal);
      plan.evidence[0].sourceUrl = 'https://arxiv.org/html/0000.00000';
      plan.planReview!.planDigest = compoundPlanDigest(plan);
      plan.adjudications = plan.adjudications.map(a => ({
        ...a, evidenceDigest: compoundPartDigest(plan, a.partId),
      }));
      expect(() => strictSource(plan, ordinal)).toThrow();
    });
  });
}
