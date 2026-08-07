/**
 * Post-build prose search index (Pagefind).
 *
 * Runs the Pagefind CLI over the static export in out/ and verifies the
 * index was emitted. Wired as the `postbuild` npm script so `npm run build`
 * always produces a searchable export. Index scoping is done in markup:
 * module articles carry `data-pagefind-body`; nav chrome, the 404 page, and
 * the search page itself carry `data-pagefind-ignore`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const outDir = join(root, 'out');

if (!existsSync(outDir)) {
  console.error('build:search: FAILED (out/ does not exist; run next build first)');
  process.exit(1);
}

const bin = join(root, 'node_modules', '.bin', 'pagefind');
const result = spawnSync(bin, ['--site', outDir], {
  stdio: 'inherit',
  cwd: root,
});

if (result.error) {
  console.error(`build:search: FAILED (could not run pagefind: ${result.error.message})`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`build:search: FAILED (pagefind exited with code ${result.status})`);
  process.exit(result.status ?? 1);
}

const entry = join(outDir, 'pagefind', 'pagefind.js');
if (!existsSync(entry)) {
  console.error('build:search: FAILED (out/pagefind/pagefind.js was not emitted)');
  process.exit(1);
}

console.log('build:search: OK (out/pagefind/ ready)');
