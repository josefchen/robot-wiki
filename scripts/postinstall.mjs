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
 * Idempotent, quiet and self-healing: it exits silently when the bridge is
 * already intact. It reruns after every `npm install` / `npm ci` (postinstall)
 * and before every `npm run lint` (prelint), because tree-reconciling
 * commands such as `npm audit fix` destroy the bridge WITHOUT firing
 * postinstall — the prelint hook is what makes lint recover on its own.
 * See: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  readdirSync,
  rmSync,
  statSync,
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
if (!existsSync(join(nm, 'eslint-config-next', 'node_modules', 'typescript-eslint'))) {
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
  console.log('postinstall: linked typescript6 into eslint-config-next for typescript-eslint');
}

// ts-api-utils gets hoisted to the root node_modules, where it would resolve
// typescript@7 and crash at load time. Give the eslint-config-next subtree a
// physical copy so resolution from typescript-estree finds this one first and
// its require('typescript') picks up the TS 6 link above.
const tsApiUtilsSource = join(nm, 'ts-api-utils');
const tsApiUtilsCopy = join(nm, 'eslint-config-next', 'node_modules', 'ts-api-utils');

// Entry-level equality (names, kinds, symlink targets, file sizes). The copy
// is always produced from the source by cpSync, so this granularity reliably
// distinguishes "our copy is intact" from "npm reconciled the subtree away";
// it keeps the happy path (prelint before every lint) silent and write-free.
const sameTree = (a, b) => {
  let da;
  let db;
  try {
    da = readdirSync(a, { withFileTypes: true });
    db = readdirSync(b, { withFileTypes: true });
  } catch {
    return false;
  }
  if (da.length !== db.length) return false;
  for (const entry of da) {
    const twin = db.find((e) => e.name === entry.name);
    if (!twin) return false;
    if (entry.isDirectory() !== twin.isDirectory()) return false;
    if (entry.isSymbolicLink() !== twin.isSymbolicLink()) return false;
    const pa = join(a, entry.name);
    const pb = join(b, entry.name);
    if (entry.isDirectory()) {
      if (!sameTree(pa, pb)) return false;
    } else if (entry.isSymbolicLink()) {
      if (readlinkSync(pa) !== readlinkSync(pb)) return false;
    } else if (statSync(pa).size !== statSync(pb).size) {
      return false;
    }
  }
  return true;
};

if (existsSync(tsApiUtilsSource) && !sameTree(tsApiUtilsSource, tsApiUtilsCopy)) {
  rmSync(tsApiUtilsCopy, { recursive: true, force: true });
  cpSync(tsApiUtilsSource, tsApiUtilsCopy, { recursive: true });
  console.log('postinstall: copied ts-api-utils into eslint-config-next subtree');
}
