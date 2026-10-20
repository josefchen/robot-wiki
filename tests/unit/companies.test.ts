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
  humanoids: 34,
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

  it('contains exactly 111 companies', () => {
    // 111 since the 2026-08-18 market-map audit removed the duplicate
    // galaxea-ai-robot row (same company as galaxea-ai).
    expect(COMPANIES).toHaveLength(111);
  });

  it('matches the research source count and segment distribution', () => {
    const research = loadResearch();
    expect(research).toHaveLength(111);
    expect(COMPANIES).toHaveLength(research.length);

    const counts = Object.fromEntries(
      Object.keys(EXPECTED_SEGMENT_COUNTS).map((segment) => [
        segment,
        COMPANIES.filter((c) => c.segment === segment).length,
      ]),
    );
    expect(counts).toEqual(EXPECTED_SEGMENT_COUNTS);

    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(111);
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
    // 26 -> 27 on 2026-08-18: the batch-3 re-verification confirmed
    // SwitchBot's HK listing under the registered name "OneRobotics
    // (Shenzhen) Co." (Caixin, fetched), so the brand-name record now
    // carries its listed entity as an aka.
    // 27 -> 32 on 2026-10-20: the field audit added the names fetched bodies
    // give Sanctuary AI, Neura Robotics, Humanoid, Spirit AI and EngineAI
    // (a legal, former or registered Chinese name each).
    expect(withAka.length).toBe(32);
    const pi = COMPANIES.find((c) => c.id === 'physical-intelligence');
    // ['Pi', 'π'] -> ['π'] on 2026-10-19: the field audit
    // (audit/market-map-ledger.json) found its sources use "Pi" only for the
    // Pi0 model and the Pi API, never as a name for the company.
    expect(pi?.aka).toEqual(['π']);
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
    // $1B -> null on 2026-10-19: Figure's own post says the round "exceeded
    // more than $1 billion", a floor, so the amount is not disclosed and the
    // floor moves to a visible caveat on the card.
    expect(figure?.latestRound?.amountUsd).toBeNull();
    expect(figure?.absent['round.amountUsd']?.state).toBe('not-disclosed');
    expect(figure?.latestRound?.caveat?.text).toMatch(/exceeded \$1B/);
    expect(figure?.latestRound?.valuationUsd).toBe(39_000_000_000);
    expect(figure?.latestRound?.date).toBe('2025-09-16');
    expect(figure?.sources.some((s) => s.url.includes('figure.ai/news/series-c'))).toBe(
      true,
    );

    const skild = COMPANIES.find((c) => c.id === 'skild-ai');
    expect(skild, 'missing skild-ai').toBeDefined();
    expect(skild?.latestRound?.type).toBe('Series C');
    expect(skild?.latestRound?.amountUsd).toBe(1_400_000_000);
    // $14B -> null on 2026-10-19: TechCrunch, citing Bloomberg, says the
    // round values Skild "at more than $14 billion", a floor, so the
    // valuation is not disclosed and the floor is a visible caveat.
    expect(skild?.latestRound?.valuationUsd).toBeNull();
    expect(skild?.latestRound?.caveat?.text).toMatch(/more than \$14 billion/);
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
    // Priced 2026-08-06 at 150.8 yuan/share: 6.1B yuan raise at ~61B yuan
    // valuation (Reuters via CNBC, fetched 2026-08-18; USD at the article's
    // own 6.7488 rate, matching its printed $9.04B valuation). The old
    // $618M/2026-08-10 snapshot was the pre-pricing approval figure carried
    // by a since-dead Caixin URL.
    expect(unitree?.latestRound?.amountUsd).toBe(904_000_000);
    expect(unitree?.latestRound?.date).toBe('2026-08-06');
    expect(unitree?.latestRound?.valuationUsd).toBe(9_040_000_000);
    // VAL-MKT-009 (2026-09-24 qualification): the 5,500-unit 2025
    // shipment, 30,000+ cumulative quadruped and ~33% share literals were
    // press-repeated prospectus figures (Rest of World prints them citing
    // its 363-page prospectus copy), not inspected company-body evidence.
    // They are withdrawn; the deployments field discloses the exact scope
    // of non-verification, and confidence no longer reads high over a
    // card whose volume metrics are unverified.
    expect(unitree?.description).not.toMatch(
      /5,500|30,000|33%|profitable since 2025/,
    );
    expect(unitree?.deployments.join(' ')).not.toMatch(
      /5,500|30,000\+|~33%/,
    );
    expect(
      unitree?.deployments.some((deployment) =>
        /not verified from an inspected Unitree company body/.test(deployment),
      ),
    ).toBe(true);
    expect(unitree?.confidence).toBe('medium');
  });

  it('carries website and logo through from the research source', () => {
    const withLogo = COMPANIES.filter((company) => company.logo !== null);
    const withSite = COMPANIES.filter((company) => company.website !== null);
    expect(withLogo.length).toBe(111);
    // 110 -> 108 on 2026-10-19: ari.bot and tars.bot are a domain for sale
    // and a parked lander, never the companies' sites, so both websites are
    // null; two more records moved to the domains their companies use
    // (audit/market-map.md, "Market-map marks and company status, sourced").
    expect(withSite.length).toBe(108);
    const site = (id: string) => COMPANIES.find((company) => company.id === id)?.website;
    expect(site('assured-robot-intelligence')).toBeNull();
    expect(site('tars-robotics')).toBeNull();
    expect(site('k-scale-labs')).toBeNull();
    expect(site('foundry-robotics')).toBe('https://foundryrobotics.ai');
    expect(site('wonik-robotics')).toBe('https://wonikrobotics.com');
    expect(COMPANIES.some((company) => /ari\.bot|tars\.bot|foundryrobotics\.com/.test(company.website ?? ''))).toBe(false);
    const nvidia = COMPANIES.find((company) => company.id === 'nvidia-robotics');
    expect(nvidia?.website).toBe('https://www.nvidia.com');
    expect(nvidia?.logo).toBe('nvidia-logo');
    const skild = COMPANIES.find((company) => company.id === 'skild-ai');
    expect(skild?.website).toBe('https://www.skild.ai');
    expect(skild?.logo).toBe('skild-ai-logo');
    const boston = COMPANIES.find((company) => company.id === 'boston-dynamics');
    const applied = COMPANIES.find(
      (company) => company.id === 'applied-intuition',
    );
    expect(boston?.logo).toBe('boston-dynamics-logo');
    expect(applied?.logo).toBe('applied-intuition-logo');
    const kscale = COMPANIES.find((company) => company.id === 'k-scale-labs');
    expect(kscale?.website).toBeNull();
    expect(kscale?.logo).toBe('k-scale-labs-logo');
  });

  it('keeps Covariant and Genesis AI unknown funding fields null', () => {
    const covariant = COMPANIES.find((c) => c.id === 'covariant');
    // 'acquired' -> 'private' on 2026-10-19: Amazon hired the founders and
    // licensed the models without buying the company, which TechCrunch says
    // continues under its own CEO; Amazon invested nothing, so the deal has
    // no lead investor (n/a).
    expect(covariant?.status).toBe('private');
    expect(covariant?.latestRound?.type).toBe('Hiring and licensing deal');
    expect(covariant?.latestRound?.leadInvestors).toEqual([]);
    expect(covariant?.absent['round.leadInvestors']?.state).toBe('not-applicable');
    expect(covariant?.totalRaisedUsd).toBeNull();
    expect(covariant?.latestRound?.amountUsd).toBeNull();
    expect(covariant?.latestRound?.valuationUsd).toBeNull();

    const genesis = COMPANIES.find((c) => c.id === 'genesis-ai');
    expect(genesis?.latestRound?.amountUsd).toBe(105_000_000);
    expect(genesis?.latestRound?.valuationUsd).toBeNull();
  });
});
