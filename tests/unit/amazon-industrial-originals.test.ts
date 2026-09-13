import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { compoundPartDigest, compoundPlanDigest, parseLedger, type CompoundPlan } from '../../lib/audit-ledger';

const ordinals = [15, 16, 17, 18, 49];
const plans: CompoundPlan[] = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
const ledger = readFileSync('audit/data-hardware.md', 'utf8');
const article = readFileSync('content/data-hardware/industrial-deployment.mdx', 'utf8');
const selected = ordinals.map(n => plans.find(p => p.ledgerPath === 'audit/data-hardware.md' && p.articleSlug === 'industrial-deployment' && p.rowOrdinal === n));
const parse = (catalog = plans) => parseLedger('audit/data-hardware.md', ledger, new Set(CITATIONS.map(c => c.id)), { compoundPlans: catalog }).find(s => s.slug === 'industrial-deployment')!;
const urls: Record<string, string> = {
  'amazon-sequoia-digit-2023': 'https://www.aboutamazon.com/news/operations/amazon-introduces-new-robotics-solutions',
  'amazon-robot-fleet-2026': 'https://www.aboutamazon.com/news/operations/amazon-robotics-robots-fulfillment-center',
  'amazon-vulcan-2026': 'https://www.aboutamazon.com/news/operations/amazon-vulcan-robot-pick-stow-touch',
};

describe('five Amazon industrial originals', () => {
  it('requires five exact originals and nineteen complete AND parts and pairs', () => {
    expect(selected.every(Boolean)).toBe(true);
    expect(selected.map(p => p?.parts.length)).toEqual([3, 6, 3, 5, 2]);
    expect(selected.reduce((n, p) => n + p!.evidence.length, 0)).toBe(19);
    expect(selected.reduce((n, p) => n + p!.parts.reduce((s, part) => s + part.requiredCitationIds.length, 0), 0)).toBe(19);
    for (const n of ordinals) expect(parse().claimRecords[n - 1].evidenceFailures).toEqual([]);
  });

  it('binds genuine integration reviews and adjudications to current plan digests', () => {
    expect(selected.every(Boolean)).toBe(true);
    for (const p of selected) {
      expect(p!.planReview?.reviewedBy).toContain('integrator');
      expect(p!.planReview?.planDigest).toBe(compoundPlanDigest(p!));
      expect(p!.adjudications).toHaveLength(p!.parts.length);
      for (const a of p!.adjudications) expect(a.evidenceDigest).toBe(compoundPartDigest(p!, a.partId));
    }
  });

  it('fails on each missing pair, stale tuple, missing review, changed passage or missing adjudication', () => {
    expect(selected.every(Boolean)).toBe(true);
    for (const p of selected) for (let i = 0; i < p!.evidence.length + 4; i++) {
      const catalog = structuredClone(plans), q = catalog.find(q => q.id === p!.id)!;
      if (i < p!.evidence.length) q.evidence.splice(i, 1);
      else if (i === p!.evidence.length) q.originalCellsDigest = '0'.repeat(64);
      else if (i === p!.evidence.length + 1) q.planReview = null;
      else if (i === p!.evidence.length + 2) q.evidence[0].supportingPassage += ' changed';
      else q.adjudications.pop();
      expect(parse(catalog).claimRecords[p!.rowOrdinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('keeps exact citation IDs and original supplied URLs in every evidence item', () => {
    expect(selected.every(Boolean)).toBe(true);
    for (const p of selected) for (const e of p!.evidence) {
      expect(e.sourceUrl).toBe(urls[e.citationId]);
      expect(e.sourceUrl).toBe(CITATIONS.find(c => c.id === e.citationId)?.url);
    }
  });

  it('distinguishes historical working robots, operating Sequoia and planned Digit tests', () => {
    expect(article).toContain('October 18, 2023');
    expect(article).toContain('over 750,000 robots working collaboratively with employees');
    expect(article).toContain('Sequoia was operating at one Houston fulfillment center');
    expect(article).toContain('testing Digit for tote recycling was planned');
  });

  it('does not turn cumulative deployments or a lab pilot into active fleet stock', () => {
    expect(article).toContain('more than one million robots deployed across its operations network since 2012');
    expect(article).toContain('not a simultaneous active-fleet count');
    expect(article).toContain('Proteus as a lab pilot awaiting deployment');
    expect(article).not.toContain('a fleet spanning');
    expect(article).not.toContain('latest robot count is the honest baseline');
  });

  it('keeps inventory identification/storage speed distinct from reduced order-processing time', () => {
    expect(article).toContain('identify and store received inventory up to 75 percent faster than its then-current process');
    expect(article).toContain('reduce the time to process an order through a fulfillment center by up to 25 percent');
    expect(article).not.toContain('process orders up to 25 percent faster');
    expect(1 / (1 - 0.25)).not.toBe(1.25);
  });

  it('scopes Vulcan coverage, contact sensing, operating sites and human handoff', () => {
    for (const text of ['force-feedback picking and stowing', 'approximately 75 percent of the types of items',
      'speeds comparable to front-line employees', 'Spokane and Hamburg', 'handoff to employees',
      'further European and US deployment as planned', 'not pick success or independently validated reliability']) expect(article).toContain(text);
  });

  it('corrects bylines and separates publication years from June 2026 updates without changing titles', () => {
    const expected = [
      ['amazon-sequoia-digit-2023', 'Scott Dresser', 2023, 'published 2023-10-18'],
      ['amazon-robot-fleet-2026', 'Tyler Greenawalt', 2024, 'published 2024-10-09; updated 2026-06-04'],
      ['amazon-vulcan-2026', 'Alex Davies', 2025, 'published 2025-05-07; updated 2026-06-04'],
    ] as const;
    for (const [id, author, year, venue] of expected) {
      const c = CITATIONS.find(c => c.id === id)!;
      expect(c.authors).toEqual([author]); expect(c.year).toBe(year); expect(c.venue).toContain(venue);
    }
    expect(CITATIONS.find(c => c.id === 'amazon-robot-fleet-2026')?.title).toBe('Amazon robotics: Meet the robots inside fulfillment centers');
  });

  it('preserves the fleet title/H1 distinction and source-edition provenance', () => {
    expect(selected.every(Boolean)).toBe(true);
    const p = selected[4]!;
    expect(p.evidence[0].supportingPassage).toContain('Title: Amazon robotics: Meet the robots inside fulfillment centers');
    expect(p.evidence[0].supportingPassage).toContain('# Amazon uses robots that sort, lift, and carry packages');
    expect(parse().claimRecords[48].note).toContain('not raw-origin');
  });

  it('positions only the two proven overflowing Amazon tooltips on mobile', () => {
    expect(article).toContain('planned <span className="max-sm:[&_[role=tooltip]]:-translate-x-24"><Cite id="amazon-sequoia-digit-2023" /></span>');
    expect(article).toContain('deployment <span className="max-sm:[&_[role=tooltip]]:-translate-x-4"><Cite id="amazon-robot-fleet-2026" /></span>');
    expect(article).toContain('by up to 25 percent <Cite id="amazon-sequoia-digit-2023" />');
  });

  it('preserves prior peers, held originals, the exact citation union and review date', () => {
    for (const n of [1, 2, 3, 4, 13, 14, 19, 20, 21, 27, 28, 39, 40, 50]) expect(parse().claimRecords[n - 1].evidenceFailures).toEqual([]);
    for (const n of [8, 52]) expect(parse().claimRecords[n - 1].evidenceFailures.length).toBeGreaterThan(0);
    expect(article).toContain('lastReviewed: "2026-08-22"');
    expect(article.split('citations:\n')[1].split('seeAlso:')[0].match(/^  - /gm)).toHaveLength(21);
  });
});
