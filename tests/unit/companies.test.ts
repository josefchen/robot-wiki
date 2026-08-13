import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { COMPANIES } from '@/data/companies';
import { companySchema } from '@/data/schemas/company';

/**
 * Market-map data contract (VAL-MKT-014, plus the integrity gates
 * VAL-MKT-011/012/013 need at the dataset layer): the shipped
 * `data/companies.ts` is a mechanical conversion of
 * research/04-market-map-companies.json. Count, segment distribution,
 * sources, confidence, and null-not-zero funding must match the research
 * snapshot. Unknown figures stay null; nothing is invented.
 */

const RESEARCH_PATH = join(
  process.cwd(),
  'research',
  '04-market-map-companies.json',
);

const EXPECTED_SEGMENT_COUNTS = {
  'foundation-models': 12,
  humanoids: 35,
  'industrial-logistics': 15,
  'vertical-applications': 32,
  'simulation-tooling': 10,
  'components-hardware': 8,
} as const;

function loadResearch(): unknown[] {
  return JSON.parse(readFileSync(RESEARCH_PATH, 'utf8')) as unknown[];
}

describe('COMPANIES data', () => {
  it('validates every row against the company schema', () => {
    const parsed = z.array(companySchema).safeParse(COMPANIES);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      console.error(parsed.error.issues.slice(0, 12));
    }
  });

  it('contains exactly 112 companies', () => {
    expect(COMPANIES).toHaveLength(112);
  });

  it('matches the research source count and segment distribution', () => {
    const research = loadResearch();
    expect(research).toHaveLength(112);
    expect(COMPANIES).toHaveLength(research.length);

    const counts = Object.fromEntries(
      Object.keys(EXPECTED_SEGMENT_COUNTS).map((segment) => [
        segment,
        COMPANIES.filter((c) => c.segment === segment).length,
      ]),
    );
    expect(counts).toEqual(EXPECTED_SEGMENT_COUNTS);

    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(112);
  });

  it('gives every row at least one https source URL and a confidence level', () => {
    for (const company of COMPANIES) {
      expect(
        company.sources.length,
        `${company.id} has no sources`,
      ).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(company.confidence);
      for (const source of company.sources) {
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.title.length).toBeGreaterThan(0);
        expect(source.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('keeps unknown funding as null and never uses 0 as a sentinel', () => {
    for (const company of COMPANIES) {
      expect(
        company.totalRaisedUsd,
        `${company.id} totalRaisedUsd must not be 0`,
      ).not.toBe(0);
      if (company.totalRaisedUsd !== null) {
        expect(company.totalRaisedUsd).toBeGreaterThan(0);
      }
      if (company.latestRound) {
        expect(
          company.latestRound.amountUsd,
          `${company.id} latestRound.amountUsd must not be 0`,
        ).not.toBe(0);
        expect(
          company.latestRound.valuationUsd,
          `${company.id} latestRound.valuationUsd must not be 0`,
        ).not.toBe(0);
      }
    }
  });

  it('has unique kebab-case ids', () => {
    const ids = COMPANIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it('carries aka through from the research source', () => {
    const withAka = COMPANIES.filter((c) => c.aka.length > 0);
    expect(withAka.length).toBe(26);
    const pi = COMPANIES.find((c) => c.id === 'physical-intelligence');
    expect(pi?.aka).toEqual(['Pi', 'π']);
  });

  it('matches the research JSON row-for-row without invented fields', () => {
    const research = loadResearch() as Array<Record<string, unknown>>;
    expect(COMPANIES.map((c) => c.id)).toEqual(research.map((c) => c.id));
    for (let i = 0; i < COMPANIES.length; i += 1) {
      expect(COMPANIES[i], `row ${research[i]?.id}`).toEqual(research[i]);
    }
  });

  it('spot-checks Figure, Skild, and Unitree against verified source facts', () => {
    const figure = COMPANIES.find((c) => c.id === 'figure-ai');
    expect(figure, 'missing figure-ai').toBeDefined();
    expect(figure?.name).toBe('Figure AI');
    expect(figure?.latestRound?.type).toBe('Series C');
    expect(figure?.latestRound?.amountUsd).toBe(1_000_000_000);
    expect(figure?.latestRound?.valuationUsd).toBe(39_000_000_000);
    expect(figure?.latestRound?.date).toBe('2025-09-16');
    expect(figure?.sources.some((s) => s.url.includes('figure.ai/news/series-c'))).toBe(
      true,
    );

    const skild = COMPANIES.find((c) => c.id === 'skild-ai');
    expect(skild, 'missing skild-ai').toBeDefined();
    expect(skild?.latestRound?.type).toBe('Series C');
    expect(skild?.latestRound?.amountUsd).toBe(1_400_000_000);
    expect(skild?.latestRound?.valuationUsd).toBe(14_000_000_000);
    expect(skild?.latestRound?.date).toBe('2026-01-14');
    // TechCrunch quotes the CEO saying the company has raised "more than
    // $2 billion to date" — a lower bound, not a precise total. The
    // research row correctly leaves totalRaisedUsd null rather than
    // inventing 2e9 or summing the disclosed rounds.
    expect(skild?.totalRaisedUsd).toBeNull();
    expect(
      skild?.sources.some((s) =>
        s.url.includes('techcrunch.com/2026/01/14/robotic-software-maker-skild-ai'),
      ),
    ).toBe(true);

    const unitree = COMPANIES.find((c) => c.id === 'unitree-robotics');
    expect(unitree, 'missing unitree-robotics').toBeDefined();
    expect(unitree?.status).toBe('public');
    expect(unitree?.latestRound?.type).toBe('IPO');
    // Snapshot figure from research/04 (as of 2026-08-06). Later live
    // writeups disagree on the raise ($610M filing vs $618M approval vs
    // ~$900M priced); the shipped number stays the snapshot value rather
    // than being averaged or silently replaced.
    expect(unitree?.latestRound?.amountUsd).toBe(618_000_000);
    expect(unitree?.latestRound?.date).toBe('2026-08-10');
  });

  it('keeps Covariant and Genesis AI unknown funding fields null', () => {
    const covariant = COMPANIES.find((c) => c.id === 'covariant');
    expect(covariant?.status).toBe('acquired');
    expect(covariant?.totalRaisedUsd).toBeNull();
    expect(covariant?.latestRound?.amountUsd).toBeNull();
    expect(covariant?.latestRound?.valuationUsd).toBeNull();

    const genesis = COMPANIES.find((c) => c.id === 'genesis-ai');
    expect(genesis?.latestRound?.amountUsd).toBe(105_000_000);
    expect(genesis?.latestRound?.valuationUsd).toBeNull();
  });
});
