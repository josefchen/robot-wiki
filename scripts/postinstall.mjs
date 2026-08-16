/**
 * Postinstall: TypeScript 7 / typescript-eslint bridge.
 *
 * typescript-eslint (pulled in by eslint-config-next) hard-fails on TS >= 7
 * and needs the TS 6 API. The root toolchain stays on typescript@7.0.2 (the
 * pinned compiler for `tsc --noEmit` and `next build`). The `typescript6`
 * alias (npm:typescript@6.0.3) is installed at the root; this script links it
 * into eslint-config-next's nested node_modules so that typescript-eslint and
 * its nested @typescript-eslint/* packages resolve TS 6 instead of TS 7.
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
const link = join(nm, 'eslint-config-next', 'node_modules', 'typescript');

if (!existsSync(source)) {
  process.exit(0);
}
if (
  !existsSync(
    join(nm, 'eslint-config-next', 'node_modules', 'typescript-eslint'),
  )
) {
  process.exit(0);
}

const current = lstatSync(link, { throwIfNoEntry: false });
if (!(current?.isSymbolicLink() && readlinkSync(link) === source)) {
  if (current) {
    rmSync(link, { recursive: true, force: true });
  } else {
    mkdirSync(dirname(link), { recursive: true });
  }
  // 'junction' needs no elevated privileges on Windows and is a plain symlink
  // on macOS/Linux.
  symlinkSync(source, link, 'junction');
  console.log(
    'postinstall: linked typescript6 into eslint-config-next for typescript-eslint',
  );
}

// ts-api-utils gets hoisted to the root node_modules, where it would resolve
// typescript@7 and crash at load time. Give the eslint-config-next subtree a
// physical copy so resolution from typescript-estree finds this one first and
// its require('typescript') picks up the TS 6 link above.
const tsApiUtilsSource = join(nm, 'ts-api-utils');
const tsApiUtilsCopy = join(
  nm,
  'eslint-config-next',
  'node_modules',
  'ts-api-utils',
);
if (existsSync(tsApiUtilsSource)) {
  rmSync(tsApiUtilsCopy, { recursive: true, force: true });
  cpSync(tsApiUtilsSource, tsApiUtilsCopy, { recursive: true });
  console.log(
    'postinstall: copied ts-api-utils into eslint-config-next subtree',
  );
}
