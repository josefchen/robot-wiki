import matter from 'gray-matter';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS, getCitation } from '@/data/citations';
import { GLOSSARY } from '@/data/glossary';
import { publishedModules } from '@/data/modules';
import { DEVELOPMENTS, DEVELOPMENTS_FROM } from '@/data/now';
import { citedSourceIds, homeCounts } from '@/lib/home-counts';
import { readableDate } from '@/lib/home-updates';
import { moduleSource } from '@/lib/module-source';

describe('home counts', () => {
  const counts = homeCounts();

  it('counts published articles and glossary terms from their registries', () => {
    expect(counts.articles).toBe(publishedModules().length);
    expect(counts.glossaryTerms).toBe(GLOSSARY.length);
  });

  it('counts the developments of Robotics now and takes their first day from the same data', () => {
    expect(counts.developments).toBe(DEVELOPMENTS.length);
    expect(counts.developments).toBeGreaterThan(0);
    expect(counts.developmentsSince).toBe(readableDate(DEVELOPMENTS_FROM));
    expect(counts.developmentsSince).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
    // No development is dated before the day the count is said to start on.
    for (const row of DEVELOPMENTS) expect(row.date >= DEVELOPMENTS_FROM, row.id).toBe(true);
  });

  it('counts each cited source once, and only registered sources', () => {
    const ids = citedSourceIds();
    expect(counts.sources).toBe(ids.size);
    expect(ids.size).toBeLessThanOrEqual(CITATIONS.length);
    for (const id of ids) expect(getCitation(id), id).toBeDefined();
  });

  it('includes every source a published article lists', () => {
    const ids = citedSourceIds();
    for (const { domain, slug } of publishedModules()) {
      const cited = matter(moduleSource(domain, slug)).data.citations ?? [];
      for (const id of cited) {
        if (getCitation(id)) expect(ids.has(id), `${domain}/${slug} cites ${id}`).toBe(true);
      }
    }
  });

  it('ignores an id with no citation record', () => {
    const fake = (domain: string, slug: string) =>
      moduleSource(domain, slug).replace(/^citations:\s*$/m, 'citations:\n  - no-such-source-id');
    expect(citedSourceIds(fake).has('no-such-source-id')).toBe(false);
  });

  it('is computed when home renders, with no count typed into its source', () => {
    const home = readFileSync('app/page.tsx', 'utf8');
    expect(home).toContain('homeCounts()');
    for (const value of Object.values(counts)) {
      expect(home).not.toMatch(new RegExp(`\\b${value}\\b`));
    }
  });
});
