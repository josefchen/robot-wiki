import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CITATIONS } from '../../data/citations';
import { committedSource } from '../helpers/continuation-integration';
import { originalClaimDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';

const article = readFileSync('content/data-hardware/industrial-deployment.mdx', 'utf8');
const catalog = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const ledger = readFileSync('audit/data-hardware.md', 'utf8');
const section = parseLedger('audit/data-hardware.md', ledger, ids, { compoundPlans: catalog })
  .find(s => s.slug === 'industrial-deployment')!;
const authors = ['Jeremy Levine', 'Talia Goldberg', 'Janelle Teng Wade', 'Alexandra Sukin',
  'Bhavik Nagda', 'Jason Scheller', 'Christine Deakers'];

describe('Industrial engineering originals 30 and atomic 34/45', () => {
  it('labels the investor forecast and preserves all requirements and countercontext', () => {
    expect(article.includes('In its April 16, 2026 investor outlook, Bessemer predicts')).toBe(true);
    for (const text of ['domain-specific data collection', 'target-environment fine-tuning',
      'hardware integration and operational infrastructure', 'expensive data collection',
      'not yet general enough to work out of the box']) expect(article.includes(text), text).toBe(true);
    expect(article.includes('near-term value accrues to full-stack integrated players')).toBe(false);
    expect(CITATIONS.find(c => c.id === 'bessemer-robotics-2026')?.authors).toEqual(authors);
  });

  it('retains engineering plus learning, useful work, data, improvement and adjacent skills', () => {
    for (const text of ['combining model-based engineering with model-free learning',
      'perform useful work, collect real-world data', 'improve performance and learn adjacent skills',
      'not a claim that engineering removes the need for learning',
      'model-free AI eventually to enable fully general-purpose robots']) expect(article.includes(text), text).toBe(true);
    expect(article.includes('across that 100,000-year gap')).toBe(false);
    expect(committedSource('0cbdda1', 'content/data-hardware/industrial-deployment.mdx')
      .includes('lastReviewed: "2026-08-22"')).toBe(true);
    expect(article.includes('lastReviewed: "2026-09-24"')).toBe(true);
  });

  it('keeps Goldberg identity without manufacturing a metadata correction', () => {
    expect(CITATIONS.find(c => c.id === 'goldberg-data-gap-2025')).toEqual({
      id: 'goldberg-data-gap-2025',
      title: 'Good old-fashioned engineering can close the 100,000-year "data gap" in robotics',
      authors: ['Ken Goldberg'], year: 2025, venue: 'Science Robotics',
      url: 'https://doi.org/10.1126/scirobotics.aea7390', type: 'paper',
    });
  });

  it('keeps the measured mobile Bessemer tooltip inside the article viewport', () => {
    expect(article.includes('<span className="max-sm:[&_[role=tooltip]]:-translate-x-8"><Cite id="bessemer-robotics-2026" /></span>')).toBe(true);
  });

  it('rejects a malformed empty mandatory citation obligation', () => {
    const plan = structuredClone(catalog.find(p => p.id === 'industrial-engineering-position-30-20260913')!);
    plan.parts[0].requiredCitationIds = [];
    expect(() => parseCompoundPlans([plan])).toThrow();
  });

  for (const [ordinal, partCount] of [[30, 4], [34, 3], [45, 3]]) {
    it(`binds original ${ordinal} with all ${partCount} reviewed AND parts`, () => {
      const plan = catalog.find(p => p.id === `industrial-engineering-position-${ordinal}-20260913`)!;
      expect(plan).toBeDefined();
      expect(plan.parts).toHaveLength(partCount);
      expect(plan.evidence).toHaveLength(partCount);
      expect(plan.adjudications).toHaveLength(partCount);
      expect(plan.originalCellsDigest).toBe(originalClaimDigest(section.claimRecords[ordinal - 1]));
      expect(section.claimRecords[ordinal - 1].evidenceFailures).toEqual([]);
    });
    it(`rejects stale, missing and unreviewed native evidence for original ${ordinal}`, () => {
      const original = catalog.find(p => p.id === `industrial-engineering-position-${ordinal}-20260913`)!;
      for (const mutation of ['missing-evidence', 'missing-adjudication', 'stale-tuple', 'unreviewed']) {
        const plan = structuredClone(original);
        if (mutation === 'missing-evidence') plan.evidence.pop();
        if (mutation === 'missing-adjudication') plan.adjudications.pop();
        if (mutation === 'stale-tuple') plan.originalCellsDigest = '0'.repeat(64);
        if (mutation === 'unreviewed') plan.planReview = null;
        const changed = catalog.map(p => p.id === plan.id ? plan : p);
        const record = parseLedger('audit/data-hardware.md', ledger, ids, { compoundPlans: changed })
          .find(s => s.slug === 'industrial-deployment')!.claimRecords[ordinal - 1];
        expect(record.evidenceFailures.length > 0, mutation).toBe(true);
      }
    });
  }
});
