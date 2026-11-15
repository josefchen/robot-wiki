import matter from 'gray-matter';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS, getCitation } from '@/data/citations';
import { GLOSSARY } from '@/data/glossary';
import { publishedModules } from '@/data/modules';
import { DEVELOPMENTS, DEVELOPMENTS_FROM } from '@/data/now';
import { ROUNDS_AS_OF } from '@/data/rounds';
import { citedSourceIds, homeCounts, readableSpan } from '@/lib/home-counts';
import { readableDate } from '@/lib/home-updates';
import { moduleSource } from '@/lib/module-source';
import { closedRoundsInWindow, dateSpan, windowStart } from '@/lib/rounds';
import { headlineFacts, headlineText } from '@/lib/rounds-page';

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

  it('counts the closed rounds as the recent rounds page does, over the same window', () => {
    const facts = headlineFacts();
    expect(counts.closedRounds).toBe(closedRoundsInWindow().length);
    expect(counts.closedRounds).toBe(facts.closed);
    expect(counts.closedRounds).toBeGreaterThan(0);
    // The rounds page prints the same count in its own headline.
    expect(headlineText(facts).reported).toContain(`of the ${counts.closedRounds} closed rounds`);
    expect(counts.roundsWindow).toBe(readableSpan(windowStart(), ROUNDS_AS_OF));
    expect(counts.roundsWindow.endsWith(` to ${readableDate(ROUNDS_AS_OF)}`)).toBe(true);
    expect(windowStart() < ROUNDS_AS_OF).toBe(true);
    // No counted round can be dated before the first day the line names, or
    // begin after the last.
    for (const round of closedRoundsInWindow()) {
      const { first } = dateSpan(round);
      expect(first >= windowStart() && first <= ROUNDS_AS_OF, round.key).toBe(true);
    }
  });

  it('writes two days as a span, the year once unless the days fall in different years', () => {
    expect(readableSpan('2026-07-17', '2026-11-14')).toBe('17 Jul to 14 Nov 2026');
    expect(readableSpan('2026-09-17', '2027-01-14')).toBe('17 Sep 2026 to 14 Jan 2027');
    expect(() => readableSpan('2026-07', '2026-11-14')).toThrow();
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
