/**
 * Postinstall: TypeScript 7 bridge for tooling that needs the TS 6 API.
 *
 * The root toolchain stays on typescript@7.0.2 (the pinned compiler for
 * `tsc --noEmit` and `next build`), but two devDependencies cannot use it:
 *
 * - typescript-eslint (pulled in by eslint-config-next) hard-fails on TS >= 7.
 * - dependency-cruiser silently skips its TypeScript parser when the compiler
 *   it resolves is outside `>=2.0.0 <7.0.0`. That failure mode is the
 *   dangerous one: `npm run lint:architecture` still exits 0, but on a graph
 *   of 39 modules instead of ~500, so the boundary rules pass by not looking.
 *
 * The `typescript6` alias (npm:typescript@6.0.3) is installed at the root;
 * this script links it into those packages' nested node_modules so their
 * `require('typescript')` resolves TS 6 while everything else stays on TS 7.
 *
 * Idempotent and self-healing: it runs after every `npm install`.
 * See: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const source = join(nm, 'typescript6');

if (!existsSync(source)) {
  process.exit(0);
}

/**
 * Point one installed package's nested node_modules at the TS 6 alias, so
 * resolution from inside that package finds TS 6 before the root TS 7.
 * Packages that are not installed are skipped.
 */
function linkTypeScript6(packageName) {
  if (!existsSync(join(nm, packageName))) {
    return;
  }
  const link = join(nm, packageName, 'node_modules', 'typescript');
  const current = lstatSync(link, { throwIfNoEntry: false });
  if (current?.isSymbolicLink() && readlinkSync(link) === source) {
    return;
  }
  if (current) {
    rmSync(link, { recursive: true, force: true });
  } else {
    mkdirSync(dirname(link), { recursive: true });
  }
  // 'junction' needs no elevated privileges on Windows and is a plain symlink
  // on macOS/Linux.
  symlinkSync(source, link, 'junction');
  console.log(`postinstall: linked typescript6 into ${packageName}`);
}

if (existsSync(join(nm, 'eslint-config-next', 'node_modules', 'typescript-eslint'))) {
  linkTypeScript6('eslint-config-next');

  // ts-api-utils gets hoisted to the root node_modules, where it would resolve
  // typescript@7 and crash at load time. Give the eslint-config-next subtree a
  // physical copy so resolution from typescript-estree finds this one first and
  // its require('typescript') picks up the TS 6 link above.
  const tsApiUtilsSource = join(nm, 'ts-api-utils');
  const tsApiUtilsCopy = join(nm, 'eslint-config-next', 'node_modules', 'ts-api-utils');
  if (existsSync(tsApiUtilsSource)) {
    rmSync(tsApiUtilsCopy, { recursive: true, force: true });
    cpSync(tsApiUtilsSource, tsApiUtilsCopy, { recursive: true });
    console.log('postinstall: copied ts-api-utils into eslint-config-next subtree');
  }
}

linkTypeScript6('dependency-cruiser');
