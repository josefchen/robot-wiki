/**
 * Post-build search indexes: Pagefind (prose) + MiniSearch (structured).
 *
 * Runs the Pagefind CLI over the static export in out/, then builds the
 * MiniSearch index over methods/companies/datasets, writes it to
 * public/search-index.json (and the just-built out/ copy), and fails the
 * build if the structured index's count or IDs drift from the shipped
 * data files. Wired as the `postbuild` npm script so `npm run build`
 * always produces a searchable export.
 *
 * Index scoping for Pagefind is done in markup: module articles carry
 * `data-pagefind-body`; nav chrome, the 404 page, and the search page
 * itself carry `data-pagefind-ignore`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  assertStructuredIndexMatchesData,
  buildStructuredIndex,
} from '../lib/structured-search.ts';

const root = join(import.meta.dirname, '..');
const outDir = join(root, 'out');
const publicIndex = join(root, 'public', 'search-index.json');
const exportedIndex = join(outDir, 'search-index.json');

function emitStructuredIndex(): number {
  const serialized = buildStructuredIndex();
  const count = assertStructuredIndexMatchesData(serialized);
  const json = `${JSON.stringify(serialized)}\n`;
  mkdirSync(dirname(publicIndex), { recursive: true });
  writeFileSync(publicIndex, json);
  if (existsSync(outDir)) {
    writeFileSync(exportedIndex, json);
  }
  return count;
}

const structuredOnly = process.argv.includes('--structured-only');

if (!structuredOnly) {
  if (!existsSync(outDir)) {
    console.error(
      'build:search: FAILED (out/ does not exist; run next build first)',
    );
    process.exit(1);
  }

  const bin = join(root, 'node_modules', '.bin', 'pagefind');
  const result = spawnSync(bin, ['--site', outDir], {
    stdio: 'inherit',
    cwd: root,
  });

  if (result.error) {
    console.error(
      `build:search: FAILED (could not run pagefind: ${result.error.message})`,
    );
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(
      `build:search: FAILED (pagefind exited with code ${result.status})`,
    );
    process.exit(result.status ?? 1);
  }

  const entry = join(outDir, 'pagefind', 'pagefind.js');
  if (!existsSync(entry)) {
    console.error(
      'build:search: FAILED (out/pagefind/pagefind.js was not emitted)',
    );
    process.exit(1);
  }

  console.log('build:search: OK (out/pagefind/ ready)');
}

try {
  const count = emitStructuredIndex();
  console.log(
    `build:search: OK (public/search-index.json, ${count} structured documents)`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`build:search: FAILED (structured index: ${message})`);
  process.exit(1);
}
