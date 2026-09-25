import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger';
import { CITATIONS } from '../../data/citations';
import { getTerm } from '../../data/glossary';
import plansRaw from '../../audit/compound-evidence.json';

const article = readFileSync('content/manipulation/hierarchical.mdx', 'utf8');
const ledger = readFileSync('audit/manipulation.md', 'utf8');
const ids = new Set(CITATIONS.map(c => c.id));
const selected = plansRaw.filter(p => p.ledgerPath === 'audit/manipulation.md' && p.articleSlug === 'hierarchical' && [1, 2].includes(p.rowOrdinal));
function records(plans = plansRaw) {
  return parseLedger('audit/manipulation.md', ledger, ids, { compoundPlans: parseCompoundPlans(plans) })
    .find(s => s.slug === 'hierarchical')!.claimRecords.slice(0, 2);
}
function refused(mutated: typeof plansRaw) {
  try { return records(mutated).some(r => r.evidenceFailures.length > 0); }
  catch { return true; }
}
describe('SayCan and Code as Policies exact source conjunctions', () => {
  it('binds two originals with all sixteen parts and seventeen URL items', () => {
    expect(selected.map(p => [p.rowOrdinal, p.parts.length, p.evidence.length])).toEqual([[1, 7, 7], [2, 9, 10]]);
    expect(records().map(r => r.evidenceFailures)).toEqual([[], []]);
  });
  it('distinguishes selected skills, calibrated values and mixed implementations', () => {
    expect(article).toContain('appends the selected skill description');
    expect(article).toContain('skill selection runs through those value functions, with no separately trained model per skill');
    expect(article).toContain('require empirical calibration');
    expect(article).toContain('not confirmation that it succeeded');
    expect(article).not.toContain('The affordance half is the contribution that survived');
    expect(article).not.toContain('recovery from a failed skill means another expensive pass');
  });
  it('keeps Python/API recursion and the measured-versus-demonstrated boundary', () => {
    expect(article).toContain('recursively expands functions missing from the execution scope');
    expect(article).toContain('many real-world failures to inaccurate detections');
    expect(article).toContain('the real-robot systems are demonstrations');
    expect(article).not.toContain('spatial estimates were the weakest link');
    expect(article).toContain('<Term id="vision-language-model">VLM</Term>');
  });
  it('corrects both entire SayCan glossary definitions', () => {
    expect(getTerm('hierarchical-policy')!.definition).toContain('hand-designed navigation and placement');
    expect(getTerm('affordance')!.definition).toContain('require empirical calibration');
    expect(getTerm('affordance')!.definition).toContain('not confirmation of successful execution');
    expect(getTerm('affordance')!.citations).toEqual(['saycan-2022']);
  });
  it('requires both distinct publication metadata URL items', () => {
    expect(selected.find(p => p.rowOrdinal === 2)?.evidence.filter(e => e.partId === 'c9').map(e => e.sourceUrl))
      .toEqual(['https://arxiv.org/abs/2209.07753', 'https://doi.org/10.1109/ICRA48891.2023.10160591']);
  });
  it.each(Array.from({ length: 17 }, (_, i) => i))('refuses omitted required evidence item %i', index => {
    expect(selected).toHaveLength(2);
    const changed = structuredClone(plansRaw);
    const p = changed.find(p => p.id === selected[index < 7 ? 0 : 1].id)!;
    p.evidence.splice(index < 7 ? index : index - 7, 1);
    expect(refused(changed)).toBe(true);
  });
  it.each(['wrong-url', 'duplicate-item', 'stale-review', 'missing-adjudication'])('refuses %s', mutation => {
    expect(selected).toHaveLength(2);
    const changed = structuredClone(plansRaw);
    const p = changed.find(p => p.id === selected[1].id)!;
    if (mutation === 'wrong-url') p.evidence[0].sourceUrl = 'https://example.org/unrelated';
    if (mutation === 'duplicate-item') p.evidence.push(structuredClone(p.evidence[0]));
    if (mutation === 'stale-review') p.planReview!.planDigest = '0'.repeat(64);
    if (mutation === 'missing-adjudication') p.adjudications.pop();
    expect(refused(changed)).toBe(true);
  });
});
