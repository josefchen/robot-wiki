/**
 * CLI wrapper for the file-size budgets in lib/file-size.ts.
 *
 *   node scripts/check-file-size.ts            # every tracked file (prebuild, CI)
 *   node scripts/check-file-size.ts --staged   # staged blobs only (pre-commit hook)
 *   npm run check:file-size
 *
 * Exits non-zero on any overage, naming the file, the budget it broke, and
 * why that budget exists. Files inside 10% of their budget are reported as
 * warnings so the ceiling is visible before it is hit.
 *
 * Staged mode reads blobs out of the index (`git show :path`) rather than the
 * working tree, so it measures exactly what the commit would contain.
 * Deliberately dependency-free: it runs from a bare checkout in CI and from a
 * git hook, neither of which has node_modules guaranteed.
 */
import { execFileSync } from 'node:child_process';
import {
  checkMeasurement,
  budgetFor,
  measureContent,
  measureFile,
  type FileMeasurement,
  type SizeViolation,
} from '../lib/file-size.ts';

const staged = process.argv.includes('--staged');

/** Fraction of a budget a file may reach before it is reported as a warning. */
const WARN_AT = 0.9;

const git = (args: string[]): string =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// The file list comes from git, so the check needs a work tree. A Vercel
// build unpacks a tarball without .git, and prebuild runs there: skip rather
// than fail the deployment, since the CI job and the pre-commit hook both run
// against a real checkout.
let root: string;
try {
  root = git(['rev-parse', '--show-toplevel']).trim();
} catch {
  console.log('file-size: not a git work tree, check skipped (runs in CI and pre-commit)');
  process.exit(0);
}

/** Tracked paths, or the paths a commit would add or change in staged mode. */
function listPaths(): string[] {
  const args = staged
    ? ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR']
    : ['ls-files', '-z'];
  return git(args).split('\0').filter(Boolean);
}

function measure(path: string): FileMeasurement | null {
  if (!staged) return measureFile(root, path);
  const blob = execFileSync('git', ['show', `:${path}`], { maxBuffer: 64 * 1024 * 1024 });
  return measureContent(path, blob);
}

const paths = listPaths();
const violations: SizeViolation[] = [];
const warnings: string[] = [];

for (const path of paths) {
  const file = measure(path);
  if (!file) continue;

  const found = checkMeasurement(file);
  violations.push(...found);
  if (found.length > 0) continue;

  const budget = budgetFor(path, file.lines === null ? 'binary' : 'text');
  if (
    budget.maxLines !== undefined &&
    file.lines !== null &&
    file.lines > budget.maxLines * WARN_AT
  ) {
    warnings.push(
      `${path}: ${file.lines} lines, within 10% of the ${budget.maxLines}-line ` +
        `${budget.label} budget`,
    );
  }
  if (file.bytes > budget.maxBytes * WARN_AT) {
    warnings.push(
      `${path}: ${Math.round(file.bytes / 1024)} KiB, within 10% of the ` +
        `${Math.round(budget.maxBytes / 1024)} KiB ${budget.label} budget`,
    );
  }
}

const scope = staged ? 'staged' : 'tracked';
console.log(`file-size: checked ${paths.length} ${scope} file(s) against lib/file-size.ts budgets`);

for (const warning of warnings) console.warn(`  approaching budget: ${warning}`);

if (violations.length > 0) {
  console.error(`file-size: FAILED (${violations.length} file(s) over budget)`);
  for (const violation of violations) console.error(`  ${violation.message}`);
  console.error(
    'Split the file, compress the asset, or, if the category genuinely needs more room, ' +
      'raise the budget in lib/file-size.ts as part of the same review.',
  );
  process.exit(1);
}

console.log(`file-size: OK (${warnings.length} file(s) approaching their budget)`);
