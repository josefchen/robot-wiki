/**
 * Build gate for VAL-OPUS-152: every published article cites at least 30
 * distinct sources inline. Entries sharing an arXiv id, a DOI or a
 * normalised URL count once. No exemption list.
 *
 *   node scripts/check-article-sources.ts [--content-dir <path>] [--report]
 */
import { join } from 'node:path';
import { CITATIONS } from '../data/citations.ts';
import { publishedModules } from '../data/modules.ts';
import { MIN_DISTINCT_SOURCES, countArticleSources } from '../lib/article-sources.ts';

const at = process.argv.indexOf('--content-dir');
const contentDir = at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : join(process.cwd(), 'content');
const report = process.argv.includes('--report');

const byId = new Map(CITATIONS.map((citation) => [citation.id, citation]));
const rows = countArticleSources(contentDir, publishedModules(), (id) => byId.get(id));
const site = new Set(rows.flatMap((row) => row.sources));

if (report) {
  for (const row of [...rows].sort((a, b) => a.sources.length - b.sources.length)) {
    console.log(`  ${row.route}: ${row.sources.length} distinct sources (${row.cited.length} cited ids)`);
  }
}
const short = rows.filter((row) => row.sources.length < MIN_DISTINCT_SOURCES || row.unknown.length > 0);
if (short.length > 0) {
  console.error(`article-sources: ${short.length} article(s) under ${MIN_DISTINCT_SOURCES} distinct cited sources:`);
  for (const row of short) {
    const unknown = row.unknown.length ? `; not in the registry: ${row.unknown.join(', ')}` : '';
    console.error(`  ${row.route}: ${row.sources.length} distinct sources${unknown}`);
  }
  process.exit(1);
}
const fewest = Math.min(...rows.map((row) => row.sources.length));
console.log(
  `article-sources: OK (${rows.length} articles, each with at least ${MIN_DISTINCT_SOURCES} distinct cited sources; fewest ${fewest}; ${site.size} distinct site-wide)`,
);
