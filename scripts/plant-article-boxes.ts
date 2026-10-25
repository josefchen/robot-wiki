/**
 * Mutation proof for scripts/check-article-boxes.ts (VAL-OPUS-151): on a copy
 * of content/, a <Callout> planted in one article and an <Aside> planted in
 * another must each make the check exit non-zero naming the file and line;
 * the clean copy must exit zero. content/ itself is never written.
 *
 *   node scripts/plant-article-boxes.ts
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PLANTS = [
  { file: 'manipulation/bc-foundations.mdx', box: '<Callout variant="warn" title="Planted">Vendor-reported.</Callout>' },
  { file: 'frontier/bear-case.mdx', box: '<Aside>Planted side note.</Aside>' },
];

function check(contentDir: string) {
  return spawnSync(process.execPath, ['scripts/check-article-boxes.ts', '--content-dir', contentDir], { encoding: 'utf8' });
}

const dir = mkdtempSync(join(tmpdir(), 'article-boxes-'));
const failures: string[] = [];
try {
  const copy = join(dir, 'content');
  cpSync('content', copy, { recursive: true });
  const clean = check(copy);
  console.log(`clean copy: exit ${clean.status}`);
  if (clean.status !== 0) failures.push(`clean copy exited ${clean.status}:\n${clean.stderr}`);
  for (const plant of PLANTS) {
    const target = join(copy, plant.file);
    const original = readFileSync(target, 'utf8');
    const lines = original.split('\n');
    const close = lines.indexOf('---', 1);
    // Two lines after the front matter: a blank line, then the box.
    const line = close + 3;
    lines.splice(close + 1, 0, '', plant.box);
    writeFileSync(target, lines.join('\n'));
    const run = check(copy);
    writeFileSync(target, original);
    const located = run.stderr.includes(`${plant.file}:${line}:`);
    console.log(`${plant.file}: exit ${run.status}${located ? `, names ${plant.file}:${line}` : ''}`);
    if (run.status === 0 || !located) failures.push(`${plant.file}: the planted box passed or was not located\n${run.stderr}`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
if (failures.length) {
  console.error(`plant-article-boxes: FAILED\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`plant-article-boxes: OK (${PLANTS.length} planted boxes fail with file and line, clean copy passes)`);
