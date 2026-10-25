/**
 * Mutation proof for scripts/check-article-sources.ts (VAL-OPUS-152): on a
 * copy of content/, a fixture article cut to 29 distinct cited sources must
 * make the check exit non-zero naming its route and count; the clean copy
 * must exit zero. content/ itself is never written.
 *
 *   node scripts/plant-article-sources.ts
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CITATIONS } from '../data/citations.ts';
import { publishedModules } from '../data/modules.ts';
import { MIN_DISTINCT_SOURCES, countArticleSources, sourceKey } from '../lib/article-sources.ts';

const TARGET = { domain: 'manipulation', slug: 'action-chunking' };
const byId = new Map(CITATIONS.map((citation) => [citation.id, citation]));

function check(contentDir: string) {
  return spawnSync(process.execPath, ['scripts/check-article-sources.ts', '--content-dir', contentDir], { encoding: 'utf8' });
}

/** Drops every inline <Cite> of the fewest sources that bring the article to 29. */
function cutTo(source: string, have: string[], keep: number): string {
  const drop = new Set(have.slice(keep));
  const ids = new Set(
    [...source.matchAll(/<Cite\b[^>]*?\bid\s*=\s*(["'])([^"']+)\1[^>]*\/>/g)]
      .map((match) => match[2])
      .filter((id) => drop.has(sourceKey(byId.get(id)!))),
  );
  return source.replace(/\s*<Cite\b[^>]*?\bid\s*=\s*(["'])([^"']+)\1[^>]*\/>/g, (whole, _q, id: string) => (ids.has(id) ? '' : whole));
}

const dir = mkdtempSync(join(tmpdir(), 'article-sources-'));
const failures: string[] = [];
try {
  const copy = join(dir, 'content');
  cpSync('content', copy, { recursive: true });
  const clean = check(copy);
  console.log(`clean copy: exit ${clean.status}`);
  if (clean.status !== 0) failures.push(`clean copy exited ${clean.status}:\n${clean.stderr}`);

  const [row] = countArticleSources(copy, [TARGET], (id) => byId.get(id));
  const file = join(copy, TARGET.domain, `${TARGET.slug}.mdx`);
  writeFileSync(file, cutTo(readFileSync(file, 'utf8'), row.sources, MIN_DISTINCT_SOURCES - 1));
  const [planted] = countArticleSources(copy, [TARGET], (id) => byId.get(id));
  if (planted.sources.length !== MIN_DISTINCT_SOURCES - 1) {
    failures.push(`the fixture holds ${planted.sources.length} distinct sources, not ${MIN_DISTINCT_SOURCES - 1}`);
  }
  const run = check(copy);
  const named = run.stderr.includes(`${row.route}: ${MIN_DISTINCT_SOURCES - 1} distinct sources`);
  console.log(`${row.route} cut to ${planted.sources.length}: exit ${run.status}${named ? ', names the route and count' : ''}`);
  if (run.status === 0 || !named) failures.push(`${row.route}: the cut fixture passed or was not named\n${run.stderr}`);
  if (!publishedModules().some((m) => m.domain === TARGET.domain && m.slug === TARGET.slug)) {
    failures.push(`${row.route} is not a published article`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
if (failures.length) {
  console.error(`plant-article-sources: FAILED\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('plant-article-sources: OK (an article cut to 29 distinct sources fails with route and count, clean copy passes)');
