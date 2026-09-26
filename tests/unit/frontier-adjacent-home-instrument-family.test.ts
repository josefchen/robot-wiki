import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publishedModules } from '@/data/modules';

/**
 * The frontier, adjacent and home-mounted interactives are explanatory
 * instruments and must mount the shared instrument family from
 * components/ui/instrument.tsx rather than hand-rolled presentation
 * chrome. The population is derived, not typed: every interactive a
 * frontier or adjacent article imports from components/interactive is in
 * scope, plus every interactive the home route itself mounts, so a newly
 * published article in either domain or a new home mount joins the sweep
 * without editing this file.
 */

const INSTRUMENT_DOMAINS = new Set(['frontier', 'adjacent']);
const ROOT = process.cwd();

/** Interactive sources imported by the two domains' published articles. */
function domainInteractiveSources(): Set<string> {
  const sources = new Set<string>();
  for (const entry of publishedModules()) {
    if (!INSTRUMENT_DOMAINS.has(entry.domain)) continue;
    const mdxPath = join(
      ROOT,
      'content',
      entry.domain,
      `${entry.slug}.mdx`,
    );
    const mdx = readFileSync(mdxPath, 'utf8');
    for (const match of mdx.matchAll(
      /from\s+['"]@\/components\/interactive\/([a-z0-9-]+)['"]/g,
    )) {
      sources.add(match[1]);
    }
  }
  return sources;
}

/** Interactive sources the home route itself mounts. */
function homeInteractiveSources(): Set<string> {
  const sources = new Set<string>();
  const home = readFileSync(join(ROOT, 'app', 'page.tsx'), 'utf8');
  for (const match of home.matchAll(
    /from\s+['"]@\/components\/interactive\/([a-z0-9-]+)['"]/g,
  )) {
    sources.add(match[1]);
  }
  return sources;
}

function unmigrated(sources: Iterable<string>): string[] {
  const missing: string[] = [];
  for (const name of sources) {
    const text = readFileSync(
      join(ROOT, 'components', 'interactive', `${name}.tsx`),
      'utf8',
    );
    const importsFamily = /import\s+\{[^}]*InstrumentFrame[^}]*\}\s+from\s+['"]@\/components\/ui(?:\/instrument)?['"]/.test(
      text,
    );
    const mountsFrame = /<InstrumentFrame\b/.test(text);
    if (!importsFamily || !mountsFrame) missing.push(name);
  }
  return missing.sort();
}

describe('frontier/adjacent/home instruments use the shared instrument family', () => {
  it('derives a non-empty interactive population for the two domains and the home route', () => {
    expect(domainInteractiveSources().size).toBeGreaterThan(0);
    expect(homeInteractiveSources().size).toBeGreaterThan(0);
  });

  it('mounts the shared instrument frame in every domain-derived interactive', () => {
    expect(
      unmigrated(domainInteractiveSources()),
      'interactives missing the shared instrument frame',
    ).toEqual([]);
  });

  it('mounts the shared instrument frame in every home-mounted interactive', () => {
    expect(
      unmigrated(homeInteractiveSources()),
      'home mounts missing the shared instrument frame',
    ).toEqual([]);
  });
});
