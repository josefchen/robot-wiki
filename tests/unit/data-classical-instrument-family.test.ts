import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publishedModules } from '@/data/modules';

/**
 * The data/hardware and classical interactives are explanatory
 * instruments and must mount the shared instrument family from
 * components/ui/instrument.tsx rather than hand-rolled presentation
 * chrome. The population is derived from the module registry: every
 * interactive a data-hardware or classical article imports from
 * components/interactive is in scope, so a newly published article in
 * either domain joins the sweep without editing this file.
 */

const INSTRUMENT_DOMAINS = new Set(['data-hardware', 'classical']);
const ROOT = process.cwd();

/** Interactive sources imported by the two domains' published articles. */
function domainInteractiveSources(): string[] {
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
  return [...sources].sort();
}

describe('data/classical instruments use the shared instrument family', () => {
  it('derives a non-empty interactive population for the two domains', () => {
    const sources = domainInteractiveSources();
    expect(sources.length).toBeGreaterThan(0);
  });

  it('mounts the shared instrument frame in every derived interactive', () => {
    const sources = domainInteractiveSources();
    const unmigrated: string[] = [];
    for (const name of sources) {
      const text = readFileSync(
        join(ROOT, 'components', 'interactive', `${name}.tsx`),
        'utf8',
      );
      const importsFamily = /import\s+\{[^}]*InstrumentFrame[^}]*\}\s+from\s+['"]@\/components\/ui(?:\/instrument)?['"]/.test(
        text,
      );
      const mountsFrame = /<InstrumentFrame\b/.test(text);
      if (!importsFamily || !mountsFrame) unmigrated.push(name);
    }
    expect(
      unmigrated,
      'interactives missing the shared instrument frame',
    ).toEqual([]);
  });
});
