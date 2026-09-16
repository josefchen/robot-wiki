import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const ARTICLE = join(ROOT, 'content', 'frontier', 'reliability-gap.mdx');
const LEDGER = join(ROOT, 'audit', 'frontier.md');
const PLANS = join(ROOT, 'audit', 'compound-evidence.json');
const DELTAS = join(ROOT, 'contract', 'brand-v2-approved-deltas.json');

const PLAN_IDS = [
  'reliability-gap-r1-compounding-arithmetic-20260915',
  'reliability-gap-r2-failure-rounding-20260915',
  'reliability-gap-r3-inverse-bar-20260915',
  'reliability-gap-r4-pistar06-recap-20260915',
  'reliability-gap-r5-pi07-coaching-20260915',
  'reliability-gap-r7-asimov-triple-20260915',
  'reliability-gap-r8-er2-safest-20260915',
  'reliability-gap-r9-deployment-record-20260915',
  'reliability-gap-r10-unitree-g1-price-20260915',
  'reliability-gap-r11-unitree-profit-20260915',
  'reliability-gap-r12-figure-8hr-20260915',
  'reliability-gap-r13-figure-goldman-20260915',
  'reliability-gap-r14-lisa-yan-20260915',
  'reliability-gap-r15-bessemer-quotes-20260915',
];

describe('reliability-gap originals integration (packet 6be17fb6, 2026-09-15)', () => {
  it('compounding arithmetic holds at the article\'s stated rounding', () => {
    expect(Math.round(Math.pow(0.95, 30) * 100)).toBe(21);
    expect(Math.round(Math.pow(0.99, 30) * 100)).toBe(74);
    expect(Math.round(Math.pow(0.999, 30) * 100)).toBe(97);
    expect(Math.pow(0.999, 30)).toBeCloseTo(0.9704309672, 9);
    expect(1 - Math.pow(0.999, 30)).toBeCloseTo(0.0295690327, 9);
    expect(1 / (1 - Math.pow(0.999, 30))).toBeCloseTo(33.819, 2);
    expect(Math.pow(0.99, 1 / 50) * 100).toBeCloseTo(99.9799, 3);
  });

  it('R4 article span carries the source\'s throughput scope, not the flat 2x', () => {
    const article = readFileSync(ARTICLE, 'utf8');
    expect(article).toContain(
      'with more than 2x throughput on some of the hardest tasks',
    );
    expect(article).not.toContain('with a 2x throughput improvement');
  });

  it('R5 coaching span cites the fetched blog (pi07-blog-2026)', () => {
    const article = readFileSync(ARTICLE, 'utf8');
    expect(article).toContain('<Cite id="pi07-blog-2026" />');
    expect(article).not.toContain('pi07-2026\n');
    expect(article).toMatch(/-\s+pi07-blog-2026\n/);
  });

  it('all 14 evidence plans are registered and referenced by the ledger', () => {
    const ledger = readFileSync(LEDGER, 'utf8');
    const plans = JSON.parse(readFileSync(PLANS, 'utf8')) as Array<{ id: string; ledgerPath: string; articleSlug: string }>;
    expect(plans.filter((p) => p.ledgerPath === 'audit/frontier.md' && p.articleSlug === 'reliability-gap')).toHaveLength(14);
    for (const id of PLAN_IDS) {
      expect(plans.some((p) => p.id === id)).toBe(true);
      expect(ledger.includes(id)).toBe(true);
    }
    // The merged ledger keeps appending later packets; this packet's block
    // keeps its append slot at 606..619, so pin the slot, not a moving total.
    expect(plans.slice(606, 620).map((p) => p.id)).toEqual(PLAN_IDS);
  });

  it('held row 6 stays byte-untouched in the old five-cell form', () => {
    const ledger = readFileSync(LEDGER, 'utf8');
    expect(ledger).toContain(
      '| R6 | ">1,000h documented MTBF; no system publishes one" | negative claim (editorial) | V | the article\'s own solved-bar definition; flagged as framing, not a sourced fact; no contradicting deployment record found in technology.org sweep |  |  |  |  |',
    );
  });

  it('approved deltas carry the 14 new approval entries', () => {
    const deltas = JSON.parse(readFileSync(DELTAS, 'utf8')) as { entries: Array<{ id: string }> };
    // Append-only ledger: pin the packet's slot at 677..690, not the total.
    expect(
      deltas.entries.slice(677, 691).map((e) => e.id),
    ).toEqual(
      [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((row) => `rg-r${row}-20260915-1`),
    );
    const mine = deltas.entries.filter((e) => /^rg-r\d+-20260915-1$/.test(e.id));
    expect(mine).toHaveLength(14);
  });
});
