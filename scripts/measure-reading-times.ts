/**
 * Build-time reading-time measurement.
 *
 * Server Components cannot render their own tree to markup (Next bans
 * react-dom/server in the component graph), so the exact rendered word
 * count of an article is not available while its page renders. This step
 * closes the loop: it reads each article's prerendered `.prose` region out
 * of the static export in out/, counts the visible words at the documented
 * WORDS_PER_MINUTE rate (lib/reading-time.ts), and writes the results to
 * data/reading-times.json. The build runs twice: the first pass produces
 * the export to measure, the second pass renders every header from the
 * measured file, so the shipped HTML and its RSC flight payload both carry
 * the exact rendered count (VAL-WIKI-015).
 *
 * Fails loudly (non-zero exit) if any published article cannot be measured:
 * a missing page, a missing .prose region, or an empty region all mean the
 * derivation broke, and shipping a fallback estimate as if it were measured
 * would violate the reading-time contract.
 */
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { publishedModules } from '../data/modules.ts';
import { countVisibleWords, readingTimeMinutes } from '../lib/reading-time.ts';

const root = join(import.meta.dirname, '..');
const outDir = join(root, 'out');

function fail(message: string): never {
  console.error(`measure:reading-times: FAILED — ${message}`);
  process.exit(1);
}

const articles = publishedModules();
if (articles.length === 0) fail('no published modules found');

const record: Record<string, { words: number; minutes: number }> = {};

for (const m of articles) {
  const htmlPath = join(outDir, m.domain, m.slug, 'index.html');
  let html: string;
  try {
    html = readFileSync(htmlPath, 'utf8');
  } catch {
    fail(`missing prerendered page for ${m.domain}/${m.slug} at ${htmlPath}`);
  }

  const doc = new JSDOM(html).window.document;
  const prose = doc.querySelector('article .prose');
  if (!prose) fail(`no <article .prose> region found in ${htmlPath}`);

  const words = countVisibleWords(prose.innerHTML);
  if (words === 0) fail(`rendered .prose is empty in ${htmlPath}`);
  const minutes = readingTimeMinutes(words);

  record[`${m.domain}/${m.slug}`] = { words, minutes };
  console.log(
    `measure:reading-times: ${m.domain}/${m.slug} → ${minutes} min (${words} words)`,
  );
}

const outPath = join(root, 'data', 'reading-times.json');
writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
console.log(
  `measure:reading-times: OK (${articles.length} articles → ${outPath})`,
);
