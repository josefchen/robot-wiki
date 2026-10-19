import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import { companySchema } from '@/data/schemas/company';
import { companyIdSetIssues, companyPopulationIssues } from '@/lib/company-population';

/**
 * The market map's company population, checked as a set derived from the
 * registry rather than as a remembered count (VAL-MKT-001, VAL-MKT-012,
 * VAL-MKT-014). validate:content runs companyPopulationIssues against the
 * research file data/companies.ts is generated from, and the static-export
 * spec runs companyIdSetIssues against the tiles the page ships. Every
 * failure each gate claims to catch is planted here.
 */
const MANIFEST = JSON.parse(
  readFileSync(join(process.cwd(), 'research', '04-market-map-companies.json'), 'utf8'),
) as Array<{ id: string; segment: string }>;

const REGISTRY_IDS = COMPANIES.map(({ id }) => id);
const RENDERED = { expected: 'the company registry', observed: 'the rendered map' };

describe('company population against the source manifest', () => {
  it('derives a non-empty registry that matches the manifest member for member', () => {
    expect(REGISTRY_IDS.length).toBeGreaterThan(0);
    expect(MANIFEST.map(({ id }) => id)).toEqual(REGISTRY_IDS);
    expect(companyPopulationIssues(COMPANIES, MANIFEST)).toEqual([]);
  });

  it('fails, naming the company and its segment, when one member is omitted', () => {
    const omitted = COMPANIES[Math.floor(COMPANIES.length / 2)];
    const rest = COMPANIES.filter(({ id }) => id !== omitted.id);
    const issues = companyPopulationIssues(rest, MANIFEST);
    expect(issues).toContain(
      `${omitted.id}: in the source manifest but missing from the company registry`,
    );
    expect(issues.some((issue) => issue.startsWith(`segment ${omitted.segment}:`))).toBe(true);
  });

  it('fails on an empty population instead of passing vacuously', () => {
    expect(companyPopulationIssues([], MANIFEST)).toContain('the company registry is empty');
    expect(companyPopulationIssues([], [])).toEqual([
      'the source manifest is empty',
      'the company registry is empty',
    ]);
  });

  it('fails on a member the manifest does not list, a repeated member, and a moved segment', () => {
    const first = COMPANIES[0];
    expect(
      companyPopulationIssues([...COMPANIES, { ...first, id: 'planted-company' }], MANIFEST),
    ).toContain('planted-company: in the company registry but not in the source manifest');
    expect(companyPopulationIssues([...COMPANIES, first], MANIFEST)).toContain(
      `${first.id}: listed more than once in the company registry`,
    );
    const moved = COMPANIES.map((company) =>
      company.id === first.id
        ? { ...company, segment: first.segment === 'humanoids' ? 'foundation-models' : 'humanoids' }
        : company,
    );
    const issues = companyPopulationIssues(moved, MANIFEST);
    expect(issues.length).toBe(2);
    expect(issues.every((issue) => issue.startsWith('segment '))).toBe(true);
  });
});

describe('rendered company ids against the registry', () => {
  it('accepts exactly the registry population in any order', () => {
    expect(companyIdSetIssues(REGISTRY_IDS, [...REGISTRY_IDS].reverse(), RENDERED)).toEqual([]);
  });

  it('refuses an omitted tile, an extra tile, a repeated tile and an empty render', () => {
    const [first, ...rest] = REGISTRY_IDS;
    expect(companyIdSetIssues(REGISTRY_IDS, rest, RENDERED)).toEqual([
      `${first}: in the company registry but missing from the rendered map`,
    ]);
    expect(companyIdSetIssues(REGISTRY_IDS, [...REGISTRY_IDS, 'ghost'], RENDERED)).toEqual([
      'ghost: in the rendered map but not in the company registry',
    ]);
    expect(companyIdSetIssues(REGISTRY_IDS, [...REGISTRY_IDS, first], RENDERED)).toEqual([
      `${first}: listed more than once in the rendered map`,
    ]);
    const empty = companyIdSetIssues(REGISTRY_IDS, [], RENDERED);
    expect(empty[0]).toBe('the rendered map is empty');
    expect(empty).toHaveLength(1 + REGISTRY_IDS.length);
  });
});

describe('company sources at build time', () => {
  const row = COMPANIES[0];
  const source = row.sources[0];

  it('accepts every shipped row', () => {
    expect(companySchema.array().safeParse(COMPANIES).success).toBe(true);
  });

  it('refuses an empty source list, a malformed URL and a plain-http URL', () => {
    expect(companySchema.safeParse({ ...row, sources: [] }).success).toBe(false);
    expect(
      companySchema.safeParse({ ...row, sources: [{ ...source, url: 'not a url' }] }).success,
    ).toBe(false);
    expect(
      companySchema.safeParse({
        ...row,
        sources: [{ ...source, url: source.url.replace(/^https:/, 'http:') }],
      }).success,
    ).toBe(false);
  });
});
