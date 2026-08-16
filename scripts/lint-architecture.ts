/**
 * The module-boundary gate: runs the rules in .dependency-cruiser.mjs over the
 * directories passed as arguments (see the `lint:architecture` npm script).
 *
 * The wrapper exists because dependency-cruiser has a failure mode that looks
 * exactly like success. It only uses its TypeScript parser when it resolves a
 * compiler in `>=2.0.0 <7.0.0`; the root toolchain is typescript@7 (the pinned
 * compiler for `tsc --noEmit` and `next build`), so scripts/postinstall.mjs
 * links the `typescript6` alias into node_modules/dependency-cruiser. Without
 * that link the cruise prints a warning, parses 39 of ~500 modules and exits
 * 0, because almost no import ever reaches a rule. A gate that passes by not
 * looking is worse than no gate, so both the parser version and the size of
 * the graph it produced are checked here.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(import.meta.dirname, '..');

/** Version range dependency-cruiser's TypeScript parser accepts. */
const TS_PARSER_MAJOR = { min: 2, max: 7 };

/**
 * Floor for the module count, well under the real graph (~500 modules) but far
 * above what the fallback parser manages. It catches a broken parser bridge
 * and an `exclude` pattern that swallowed a layer, without needing an update
 * every time an article or component is added.
 */
const MIN_MODULES = 300;

function fail(message: string): never {
  console.error(`lint:architecture: ${message}`);
  process.exit(1);
}

/** Assert dependency-cruiser resolves a TypeScript API its parser can use. */
function checkParser(): void {
  const manifest = join(
    repoRoot,
    'node_modules',
    'dependency-cruiser',
    'node_modules',
    'typescript',
    'package.json',
  );
  if (!existsSync(manifest)) {
    fail(
      'dependency-cruiser has no TypeScript 6 bridge, so it would parse almost ' +
        'nothing and pass. Run `npm install` (scripts/postinstall.mjs creates it).',
    );
  }
  const { version } = JSON.parse(readFileSync(manifest, 'utf8')) as { version: string };
  const major = Number(version.split('.')[0]);
  if (!(major >= TS_PARSER_MAJOR.min && major < TS_PARSER_MAJOR.max)) {
    fail(
      `dependency-cruiser resolves typescript@${version}, outside the range its ` +
        `parser accepts (>=${TS_PARSER_MAJOR.min} <${TS_PARSER_MAJOR.max}). Fix the ` +
        'bridge in scripts/postinstall.mjs before trusting this check.',
    );
  }
}

const roots = process.argv.slice(2);
if (roots.length === 0) {
  fail('no directories to cruise. Pass them as arguments, as the npm script does.');
}

checkParser();

// Output is captured rather than inherited so the module count can be read
// back; it is printed verbatim either way, so violations read the same as they
// do from depcruise itself.
const depcruise = join(repoRoot, 'node_modules', '.bin', 'depcruise');
const result = spawnSync(depcruise, roots, {
  cwd: repoRoot,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if (result.error) {
  fail(`could not run depcruise (${result.error.message}). Run \`npm install\`.`);
}
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const cruised = /\((\d+) modules,/.exec(result.stdout ?? '');
if (!cruised) {
  fail(
    'the report carries no module count, so there is no way to tell whether the ' +
      'rules saw the codebase. Check the depcruise reporter output above.',
  );
}
if (Number(cruised[1]) < MIN_MODULES) {
  fail(
    `only ${cruised[1]} modules were parsed (expected at least ${MIN_MODULES}). ` +
      'The rules did not see the codebase, so this pass means nothing: check the ' +
      'TypeScript bridge and the `exclude` patterns in .dependency-cruiser.mjs.',
  );
}
