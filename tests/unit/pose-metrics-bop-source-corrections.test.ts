import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { CROSSREF_AUTHOR_EXCEPTIONS } from '../../data/crossref-author-exceptions';
import {
  compoundPartDigest,
  compoundPlanDigest,
  parseCompoundPlans,
  parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';

const source = readFileSync('content/classical/perception.mdx', 'utf8');
const ledger = readFileSync('audit/classical.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map((citation) => citation.id));
const rows = (catalog = plans, text = ledger) =>
  parseLedger('audit/classical.md', text, ids, { compoundPlans: catalog })
    .find((section) => section.slug === 'perception')!.claimRecords;
const selected = [[51, 5, 5], [52, 3, 3], [53, 7, 7], [54, 7, 7]] as const;
const hs = 'http://www.stefan-hinterstoisser.com/papers/hinterstoisser2012accv.pdf';
const bop = 'https://arxiv.org/html/2403.09799v1';
const expectedParts: Record<number, string[]> = {
  51: ['linemod-context', 'model-poses', 'average-corresponding', 'inclusive-diameter', 'table-setting'],
  52: ['nearest-neighbour', 'ambiguous-view-context', 'named-objects'],
  53: ['aggregate', 'seen-protocol', 'datasets', 'retrospective', 'vidal-setting', 'gpose-setting', 'year-and-unit'],
  54: ['unseen-onboarding', 'same-evaluation', 'comparable', 'genflow-setting', 'cosypose-setting', 'unseen-aggregation-time', 'seen-aggregation-time'],
};
const has = (text: string) => source.includes(text);
const fingerprint = (plan: CompoundPlan) => createHash('sha256')
  .update(JSON.stringify(plan.evidence.map(({ partId, citationId, sourceUrl, supportingPassage }) =>
    [partId, citationId, sourceUrl, supportingPassage]))).digest('hex');
// Filled from the verified retained manuscript/v1 passage bindings, not rendered output.
const retainedEvidenceDigests: Record<number, string> = {
  "51": "c6cde3e7b8fa270ca305cac0d80add00e5065e5ad3c89a4b99173beae67631c9",
  "52": "46ea599d30012e1e85647aa682510ef45dcb815d362320a5da3a2dc06d3454b4",
  "53": "50054d031769230732a199886dce2ca9184a3baaf12100b6c3a8f1542f32f13c",
  "54": "1dc1ce68131cafa4750d223e3a4e0f17c8bdfc807332301aafafb2a3ae0c530e"
};

describe('source-scoped pose metrics and BOP corrections', () => {
  it('preserves unsquared directed means and the inclusive Table 1 setting', () => {
    for (const text of [
      String.raw`\operatorname{avg}_{x \in \mathcal M}`,
      String.raw`\left\lVert (Rx+T)-(\widetilde R x+\widetilde T) \right\rVert`,
      String.raw`\operatorname{avg}_{x_1 \in \mathcal M}`,
      String.raw`\min_{x_2 \in \mathcal M}`,
      String.raw`\left\lVert (Rx_1+T)-(\widetilde R x_2+\widetilde T) \right\rVert`,
      String.raw`$m \leq k_m d$`, 'Equality counts as correct.', 'Table 1 uses $k_m=0.1$',
      'subset of views', '“cup”, “bowl”, “box” and “glue”',
    ]) expect(has(text), text).toBe(true);
    const block = source.slice(source.indexOf('To read a pose-estimation result'), source.indexOf('The BOP Challenge'));
    expect(block.split('\n$$\n').length - 1).toBe(4);
    expect(block.includes(String.raw`\right\rVert^2`)).toBe(false);
    expect(block.includes('no camera could distinguish')).toBe(false);
    expect(has('lastReviewed: "2026-08-22"')).toBe(true);
  });

  it('composes the source-scoped glossary without calling BOP an ADD-S leaderboard', () => {
    const term = GLOSSARY.find((entry) => entry.id === 'add-s-metric')!;
    expect(term.citations).toEqual(['hinterstoisser-2012']);
    for (const text of ['ground-truth-transformed', 'nearest estimated-pose-transformed', 'inclusive', 'Table 1 uses 0.1']) {
      expect(term.definition.includes(text), text).toBe(true);
    }
    expect(/standard accuracy|BOP challenge|physically indistinguishable/.test(term.definition)).toBe(false);
  });

  it('distinguishes strict BOP correctness and equal dataset recall averaging from detection AP', () => {
    for (const text of [
      '$e < \\theta_e$', '0 to 100', 'equally', 'seven core datasets',
      'VSD', 'MSSD', 'MSPD', 'multiple correctness thresholds',
      'object-first averaging', 'not ADD-S distance',
      'LM-O, T-LESS, ITODD, HB, YCB-V, TUD-L and IC-BIN',
    ]) expect(has(text), text).toBe(true);
  });

  it('keeps exact historical benchmark entries, setup and timing limits', () => {
    for (const text of [
      '56.9 to 85.6', 'relative improvement of more than 50 percent',
      'Vidal-Sensors18', '2019', 'Figure 1', '2017',
      'GenFlow-MultiHypo16', '67.4', 'CosyPose-ECCV20-SYNT+REAL-ICP',
      '69.8', 'comparable, not identical', '34.58 and 13.74 seconds',
      '5 minutes per object on one GPU', 'different training and onboarding conditions',
      'not a matched-hardware speed ratio or a robot control frequency',
      'heavy object occlusion',
    ]) expect(has(text), text).toBe(true);
    expect(has('Three years erased')).toBe(false);
    expect(has('50 percentage points')).toBe(false);
  });

  it('keeps the DOI, separates event/publication years and removes only the obsolete exception', () => {
    expect(CITATIONS.find((citation) => citation.id === 'hinterstoisser-2012')).toMatchObject({
      year: 2013, venue: 'Computer Vision – ACCV 2012 (LNCS, published 2013)',
      url: 'https://doi.org/10.1007/978-3-642-37331-2_42',
      authors: ['Stefan Hinterstoisser', 'Vincent Lepetit', 'Slobodan Ilic', 'Stefan Holzer', 'Gary Bradski', 'Kurt Konolige', 'Nassir Navab'],
    });
    expect(CROSSREF_AUTHOR_EXCEPTIONS.some((entry) => entry.id === 'hinterstoisser-2012')).toBe(false);
    expect(CITATIONS.find((citation) => citation.id === 'bop-challenge-2023')).toMatchObject({
      year: 2024, venue: 'arXiv preprint', arxiv: '2403.09799', url: bop,
      authors: ['Tomas Hodan', 'Martin Sundermeyer', 'Yann Labbé', 'Van Nguyen Nguyen', 'Gu Wang', 'Eric Brachmann', 'Bertram Drost', 'Vincent Lepetit', 'Carsten Rother', 'Jiri Matas'],
    });
  });

  for (const [ordinal, partCount, itemCount] of selected) {
    it(`binds original perception:${ordinal} to all reviewed parts and exact retained passages`, () => {
      const row = rows()[ordinal - 1];
      expect(row.evidenceFailures.length).toBe(0);
      expect(row.outcome).toBe('passing');
      expect(row.verdict).toBe('C');
      expect(row.note.includes('Original four-cell tuple (JSON):')).toBe(true);
      const plan = plans.find((candidate) => candidate.id === row.compound?.planId)!;
      expect(plan.parts).toHaveLength(partCount);
      expect(plan.parts.map((part) => part.id)).toEqual(expectedParts[ordinal]);
      expect(plan.evidence).toHaveLength(itemCount);
      expect(plan.adjudications).toHaveLength(partCount);
      expect(plan.planReview?.reviewedBy).toContain('source-auditor');
      expect(fingerprint(plan)).toBe(retainedEvidenceDigests[ordinal]);
      for (const item of plan.evidence) {
        expect(item.citationId).toBe(ordinal < 53 ? 'hinterstoisser-2012' : 'bop-challenge-2023');
        expect(item.sourceUrl).toBe(ordinal < 53 ? hs : bop);
      }
    });

    it(`rejects missing AND, stale tuple, source-pair and review mutations for perception:${ordinal}`, () => {
      const row = rows()[ordinal - 1];
      const plan = plans.find((candidate) => candidate.id === row.compound?.planId);
      expect(Boolean(plan)).toBe(true);
      if (!plan) return;
      const rejected = (changed: CompoundPlan) => {
        const catalog = plans.map((candidate) => candidate.id === changed.id ? changed : candidate);
        expect(rows(catalog)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      };
      for (const part of plan.parts) {
        const changed = structuredClone(plan);
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
        (value) => { value.evidence[0].sourceUrl = 'https://example.invalid/wrong'; },
        (value) => { value.evidence[0].citationId = 'orb-slam-2015'; },
        (value) => { value.evidence[0].supportingPassage = ''; },
        (value) => { value.evidence[0].partId = 'absent'; },
        (value) => { value.adjudications[0].outcome = 'unresolved'; },
        (value) => { value.parts[0].text += ' unsupported extension'; },
      ];
      for (const mutate of mutations) {
        const changed = structuredClone(plan);
        mutate(changed);
        rejected(changed);
      }
      const forged = structuredClone(plan);
      forged.evidence[0].sourceUrl = 'https://example.invalid/wrong';
      forged.planReview!.planDigest = compoundPlanDigest(forged);
      forged.adjudications = forged.adjudications.map((item) => ({
        ...item, evidenceDigest: compoundPartDigest(forged, item.partId),
      }));
      // Structure alone cannot establish source truth after a forged re-sign.
      expect(fingerprint(forged)).not.toBe(retainedEvidenceDigests[ordinal]);
    });
  }
});
