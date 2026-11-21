import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MARKET_SECTION, SITE_SECTIONS } from '@/lib/site-sections';

/**
 * A section lists only pages that exist: every route resolves to a page
 * file under app/, so the header on a data page never links to a 404.
 */

const APP = join(process.cwd(), 'app');
const PAGE_FILES = ['page.tsx', 'page.ts', 'page.mdx'];

/**
 * The page file a static route is served from, or null. Route groups
 * (`(content)`) are folders that add no path segment, so each level also
 * looks inside them.
 */
function pageFileFor(route: string, directory = APP): string | null {
  const segments = route.split('/').filter(Boolean);
  const groups = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\(.+\)$/.test(entry.name))
    .map((entry) => join(directory, entry.name));
  if (segments.length === 0) {
    for (const file of PAGE_FILES) {
      if (existsSync(join(directory, file))) return join(directory, file);
    }
  } else {
    const next = join(directory, segments[0]);
    if (existsSync(next)) {
      const found = pageFileFor(segments.slice(1).join('/'), next);
      if (found) return found;
    }
  }
  for (const group of groups) {
    const found = pageFileFor(route, group);
    if (found) return found;
  }
  return null;
}

describe('site sections', () => {
  it('resolves a route to its page file, and a missing route to nothing', () => {
    expect(pageFileFor('/market-map/')).toBe(join(APP, 'market-map', 'page.tsx'));
    expect(pageFileFor('/glossary/')).toBe(join(APP, 'glossary', 'page.tsx'));
    expect(pageFileFor('/market-map/no-such-page/')).toBeNull();
    expect(pageFileFor('/no-such-page/')).toBeNull();
  });

  it('lists only routes that have a page file under app/', () => {
    for (const section of SITE_SECTIONS) {
      expect(section.pages.length).toBeGreaterThan(0);
      for (const page of section.pages) {
        expect(pageFileFor(page.route), `${section.label}: ${page.route} has no page`).not.toBeNull();
      }
    }
  });

  it('writes each route once, with both slashes, under a label of its own', () => {
    const routes = SITE_SECTIONS.flatMap((section) => section.pages.map((page) => page.route));
    expect(new Set(routes).size).toBe(routes.length);
    for (const route of routes) {
      expect(route).toMatch(/^\/(?:[a-z0-9-]+\/)+$/);
    }
    for (const section of SITE_SECTIONS) {
      expect(section.label.trim()).toBe(section.label);
      expect(section.label).not.toBe('');
      const labels = section.pages.map((page) => page.label);
      expect(new Set(labels).size).toBe(labels.length);
      for (const label of labels) expect(label.trim()).not.toBe('');
    }
    expect(new Set(SITE_SECTIONS.map((section) => section.label)).size).toBe(SITE_SECTIONS.length);
  });

  it('opens the Market section on the market map, then the public companies and the recent rounds', () => {
    expect(SITE_SECTIONS).toContain(MARKET_SECTION);
    expect(MARKET_SECTION.label).toBe('Market');
    expect(MARKET_SECTION.pages).toEqual([
      { label: 'Market map', route: '/market-map/' },
      { label: 'Public companies', route: '/market-map/public/' },
      { label: 'Recent rounds', route: '/market-map/rounds/' },
    ]);
  });
});
