import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { GLOSSARY } from '@/data/glossary';
import { parseCompoundPlans, parseLedger } from '@/lib/audit-ledger';

const article = readFileSync('content/classical/perception.mdx', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(citation => citation.id));
const perception = parseLedger('audit/classical.md', readFileSync('audit/classical.md', 'utf8'), ids,
  { compoundPlans: plans }).find(section => section.slug === 'perception')!;
const selected = [10, 55];

describe('source-backed visual-servo origin pair', () => {
  it('binds both exact originals without completing held calibration or absence records', () => {
    for (const ordinal of selected) {
      const record = perception.claimRecords[ordinal - 1];
      expect(record.evidenceFailures, `original ${ordinal}`).toEqual([]);
      expect(record.compound?.planId).toBe(`perception-calibration-servo-origins-${ordinal}-20260913`);
    }
    // 2026-09-16 perception pass completed 9 and 17: the Tsai-Lenz IEEE
    // Xplore abstract page was fetched through the registered DOI and each
    // row was adjudicated against the abstract's own printed words (row 9
    // corrected to a camera-to-gripper solve, row 17 verified protocol
    // mechanics). The full text remains paywalled and unclaimed.
    for (const [ordinal, planId] of [
      [9, 'perception-9-tsai-solve-20260916g'],
      [17, 'perception-17-tsai-protocol-20260916g'],
    ] as const) {
      const record = perception.claimRecords[ordinal - 1];
      expect(record.evidenceFailures, `original ${ordinal}`).toEqual([]);
      expect(record.compound?.planId).toBe(planId);
    }
  });

  it('records seven reviewed parts and eight required source pairs, not two plan versions', () => {
    const pair = plans.filter(plan => plan.articleSlug === 'perception' && selected.includes(plan.rowOrdinal));
    expect(pair).toHaveLength(2);
    expect(pair.flatMap(plan => plan.parts)).toHaveLength(7);
    expect(pair.flatMap(plan => plan.parts.flatMap(part => part.requiredCitationIds))).toHaveLength(8);
    expect(pair.flatMap(plan => plan.evidence)).toHaveLength(8);
    for (const plan of pair) {
      expect(plan.planReview).not.toBeNull();
      expect(plan.adjudications).toHaveLength(plan.parts.length);
      expect(plan.adjudications.every(part => part.outcome === 'supported')).toBe(true);
    }
  });

  it('attributes a 1992 formulation without inventing visual-servo or task-function priority', () => {
    expect(article).toContain('label="visual-servo formulation" value="1992"');
    expect(article).toContain('Espiau, Chaumette and Rives’s 1992 paper applies a task-function framework');
    expect(article).not.toContain('drove the error to zero directly');
    expect(article).toContain('lastReviewed: "2026-08-22"');
  });

  it('distinguishes task error, camera-frame spatial velocity, and conditional regulation', () => {
    for (const text of ['need not be the raw feature difference',
      'relative to the scene, expressed in the camera frame',
      'neglecting target motion can leave a tracking error',
      'six-component spatial velocity, not a vector of joint rates',
      '$\\dot{s} = L_s v_c$', 'local asymptotic stability', 'full rank', 'positivity condition']) {
      expect(article).toContain(text);
    }
    expect(perception.claimRecords[54].sourceChecked).toContain('Equation (2)');
    expect(perception.claimRecords[54].sourceChecked).not.toContain('eq. 1');
  });

  it('keeps the glossary camera model bounded and preserves the prior tutorial caveats', () => {
    const term = GLOSSARY.find(term => term.id === 'visual-servoing')!;
    expect(term.definition).toContain('applied a task-function framework');
    expect(term.definition).toContain('relative to the scene, expressed in the camera frame');
    expect(term.definition).not.toContain('the field still uses');
    for (const text of ['local stability conditions', 'poor estimates can cause instability',
      'singularities or local minima', 'PBVS pose errors can also affect final accuracy']) {
      expect(term.definition).toContain(text);
    }
    expect(term.citations).toEqual(['espiau-1992', 'chaumette-hutchinson-2006']);
  });

  it('preserves registered source identity rather than replacing DOI URLs with evidence URLs', () => {
    const citation = CITATIONS.find(citation => citation.id === 'espiau-1992')!;
    expect(citation.title).toBe('A new approach to visual servoing in robotics');
    expect(citation.authors).toEqual(['B. Espiau', 'F. Chaumette', 'P. Rives']);
    expect(citation.year).toBe(1992);
    expect(citation.url).toBe('https://doi.org/10.1109/70.143350');
    expect(CITATIONS.find(citation => citation.id === 'chaumette-hutchinson-2006')?.url)
      .toBe('https://doi.org/10.1109/MRA.2006.250573');
  });
});
