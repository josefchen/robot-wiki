import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, originalClaimDigest,
  parseCompoundPlans, parseLedger,
} from '../../lib/audit-ledger';

const text = readFileSync('content/frontier/dexterity.mdx', 'utf8');
const ledger = readFileSync('audit/frontier.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const planId = 'dexterity-figure15-source-20260914';
const figureURL = 'https://www.figure.ai/news/introducing-figure-03';
const helixURL = 'https://www.figure.ai/news/helix-02';
const records = (catalog = plans) => parseLedger('audit/frontier.md', ledger, ids, {
  compoundPlans: catalog,
}).find(s => s.slug === 'dexterity')!.claimRecords;
const plan = () => {
  const selected = plans.filter(p => p.id === planId);
  expect(selected).toHaveLength(1);
  return selected[0];
};

describe('Figure15 retained-source correction', () => {
  test('completes exactly native original15 with a reviewed C, not its historical V', () => {
    expect(records()).toHaveLength(30);
    expect(records()[14].verdict).toBe('C');
    expect(records()[14].evidenceFailures).toEqual([]);
    expect(plan().rowOrdinal).toBe(15);
    expect(plan().originalCellsDigest).toBe(originalClaimDigest(records()[14]));
  });

  test('retains four mandatory parts and five part-source pairs, not two flat items', () => {
    const p = plan();
    expect(p.parts.map(part => [part.id, part.requiredCitationIds])).toEqual([
      ['d15-tactile-sensitivity', ['figure-03-2025', 'helix-02-2026']],
      ['d15-palm-cameras', ['figure-03-2025']],
      ['d15-touch-inputs', ['helix-02-2026']],
      ['d15-first-scope', ['helix-02-2026']],
    ]);
    expect(p.evidence.map(e => [e.partId, e.citationId])).toEqual([
      ['d15-tactile-sensitivity', 'figure-03-2025'],
      ['d15-tactile-sensitivity', 'helix-02-2026'],
      ['d15-palm-cameras', 'figure-03-2025'],
      ['d15-touch-inputs', 'helix-02-2026'],
      ['d15-first-scope', 'helix-02-2026'],
    ]);
  });

  test('binds vendor quotations without making the two same-issuer sources identical', () => {
    const evidence = plan().evidence;
    const f03 = evidence.find(e => e.partId === 'd15-tactile-sensitivity' && e.citationId === 'figure-03-2025')!;
    const h02 = evidence.find(e => e.partId === 'd15-tactile-sensitivity' && e.citationId === 'helix-02-2026')!;
    expect(f03.sourceUrl).toBe(figureURL);
    expect(f03.supportingPassage).toContain('Each fingertip sensor can detect forces as small as three grams of pressure');
    expect(f03.supportingPassage).toContain('the weight of a paperclip resting on your finger');
    expect(h02.sourceUrl).toBe(helixURL);
    expect(h02.supportingPassage).toContain('embedded in each fingertip detect forces as small as three grams');
    expect(h02.supportingPassage).toContain('sensitive enough to feel a paperclip');
    expect(h02.supportingPassage).not.toContain('three grams of pressure');
  });

  test('binds hardware, System1 inputs and the complete combined-modality first-time context', () => {
    const evidence = plan().evidence;
    const palm = evidence.find(e => e.partId === 'd15-palm-cameras')!;
    const inputs = evidence.find(e => e.partId === 'd15-touch-inputs')!;
    const first = evidence.find(e => e.partId === 'd15-first-scope')!;
    expect(palm.supportingPassage).toContain('Each hand now integrates an embedded palm camera');
    expect(inputs.supportingPassage).toContain('Head cameras, palm cameras, fingertip tactile sensors, and full‑body proprioception.');
    expect(first.supportingPassage).toContain('The palm cameras and tactile sensors are new hardware capabilities');
    expect(first.supportingPassage).toContain("This is the first time we've demonstrated neural network policies that depend on these modalities.");
  });

  test('keeps publication dates distinct from the two original retrieval times and current review', () => {
    const p = plan();
    expect(p.evidence.find(e => e.partId === 'd15-palm-cameras')!.supportingPassage).toContain('October 09, 2025');
    expect(p.evidence.find(e => e.partId === 'd15-touch-inputs')!.supportingPassage).toContain('January 27, 2026');
    expect(records()[14].sourceChecked).toContain('2026-09-13T03:39:56.393Z');
    expect(records()[14].sourceChecked).toContain('2026-09-07T16:07:28.926Z');
    expect(records()[14].sourceChecked).toContain('review2026-09-14 is not retrieval');
    expect(text).toContain('lastReviewed: "2026-08-18"');
  });

  test('has a genuine whole-plan review and all four digest-bound supported adjudications', () => {
    const p = plan();
    expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
    expect(p.adjudications).toHaveLength(4);
    for (const a of p.adjudications) {
      expect(a.outcome).toBe('supported');
      expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      expect(a.rationale.length).toBeGreaterThan(100);
    }
    expect(p.adjudications[0].rationale).toContain('not independent measurement');
  });

  test('replaces only the authorized source-scoped prose without validating ambiguous units', () => {
    expect(text).toContain("Figure's October 2025 announcement describes a palm camera in each Figure 03 hand");
    expect(text).toContain('can detect "three grams of pressure", comparing the sensitivity to a paperclip\'s weight <Cite id="figure-03-2025" />');
    expect(text).toContain('full-body proprioception as System 1 inputs.');
    expect(text).toContain('Figure describes this as "the first time we\'ve demonstrated neural network policies that depend on these modalities" <Cite id="helix-02-2026" />.');
    expect(text).not.toContain('Figure 03 ships fingertip tactile sensors');
    expect(text).not.toContain('the first Figure has shown that consumes touch directly');
    // Unassigned comparison and superlative are deliberately not certified by this correction.
    expect(text).toContain('a 3-gram fingertip threshold, the only maker in this table');
  });

  test('preserves the old error and administrative hold as non-counted history', () => {
    expect(ledger).toContain('Original15 is HELD:');
    expect(ledger).toContain('Non-counted exact original/current row history:');
    expect(records()[14].note).toContain('quality-library resolution exclusion');
    expect(records()[14].claim).toContain('not calibrated force-resolution measurements');
    expect(records()[14].note).not.toContain('SOURCE-ONLY CONDITIONAL PROPOSAL');
  });

  test.each(['review', 'adjudication', 'pair', 'source', 'url', 'stale', 'passage'] as const)(
    'native gate refuses missing or stale %s', mutation => {
      const p = plan();
      const mutated = structuredClone(plans);
      const q = mutated.find(candidate => candidate.id === p.id)!;
      if (mutation === 'review') q.planReview = null;
      if (mutation === 'adjudication') q.adjudications = q.adjudications.slice(1);
      if (mutation === 'pair') q.evidence = q.evidence.filter((_, i) => i !== 1);
      if (mutation === 'source') q.evidence[1].citationId = 'figure-03-2025';
      if (mutation === 'url') q.evidence[1].sourceUrl = 'https://example.org/wrong';
      if (mutation === 'stale') q.originalCellsDigest = '0'.repeat(64);
      if (mutation === 'passage') q.evidence[1].supportingPassage += ' invented';
      expect(records(mutated)[14].evidenceFailures.length).toBeGreaterThan(0);
    },
  );

  test('requires Helix sensitivity coverage even after the remaining digests are rebound', () => {
    plan();
    const mutated = structuredClone(plans);
    const q = mutated.find(candidate => candidate.id === planId)!;
    q.evidence = q.evidence.filter(e => !(e.partId === 'd15-tactile-sensitivity' && e.citationId === 'helix-02-2026'));
    q.planReview!.planDigest = compoundPlanDigest(q);
    for (const a of q.adjudications) a.evidenceDigest = compoundPartDigest(q, a.partId);
    expect(records(mutated)[14].evidenceFailures.length).toBeGreaterThan(0);
  });
});
