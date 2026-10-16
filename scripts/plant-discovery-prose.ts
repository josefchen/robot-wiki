/**
 * Mutation proof for the Discovery prose budget check: plants one sentence
 * into a copy of a hub, /glossary/ and /about/ from the built export, and
 * requires the check to exit non-zero on every plant, naming the planted
 * page's budget, and to pass on the unplanted copy.
 *
 *   node scripts/plant-discovery-prose.ts [--root out]
 *
 * Only the Discovery pages are copied, into a temporary folder; the export
 * itself is never written.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { DISCOVERY_ROUTES } from '../lib/discovery-prose.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--root');
const root = at >= 0 && args[at + 1] ? args[at + 1] : 'out';
const SENTENCE = 'A planted sentence that adds words the budget does not allow.';

const PLANTS = [
  { route: '/manipulation/', target: 'main p.page-lead' },
  { route: '/glossary/', target: 'main [data-glossary-definition] p' },
  { route: '/about/', target: 'main section[aria-labelledby="reading-heading"] p' },
] as const;

const copy = mkdtempSync(join(tmpdir(), 'discovery-plant-'));
try {
  for (const route of DISCOVERY_ROUTES) {
    mkdirSync(join(copy, route), { recursive: true });
    copyFileSync(join(root, route, 'index.html'), join(copy, route, 'index.html'));
  }
  const run = () =>
    spawnSync(process.execPath, ['scripts/measure-discovery-prose.ts', '--check', '--root', copy], {
      encoding: 'utf8',
    });
  const clean = run();
  const rows = PLANTS.map(({ route, target }) => {
    const path = join(copy, route, 'index.html');
    const original = readFileSync(path, 'utf8');
    const dom = new JSDOM(original);
    const paragraph = dom.window.document.querySelector(target);
    if (!paragraph) throw new Error(`discovery plant: ${route} has no ${target}`);
    paragraph.append(` ${SENTENCE}`);
    writeFileSync(path, dom.serialize());
    const result = run();
    writeFileSync(path, original);
    const reported = result.stderr.split('\n').find((line) => line.includes(`${route} budget:`)) ?? null;
    return { route, exit: result.status, reported };
  });

  for (const { route, exit, reported } of rows) {
    console.log(`  ${exit} ${route} (one planted sentence): ${reported ?? 'NOT REPORTED'}`);
  }
  console.log(`  ${clean.status} clean copy: ${(clean.stdout || clean.stderr).trim().split('\n').at(-1)}`);
  const missed = rows.filter((row) => row.exit !== 1 || !row.reported);
  if (missed.length || clean.status !== 0) {
    console.error(`discovery plant: ${missed.length} plant(s) passed, clean copy exit ${clean.status}`);
    process.exitCode = 1;
  }
} finally {
  rmSync(copy, { recursive: true, force: true });
}
