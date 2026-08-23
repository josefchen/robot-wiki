/**
 * Reading-times gate: two failure modes, deliberately distinguishable.
 *
 * data/reading-times.json is derived from the export, and history has
 * shown two ways it drifts apart from what a fresh measurement says:
 *
 * 1. A genuinely unstable export (one article re-measured at 2107 words
 *    after the same tree had measured 2110, commit 06ebee2 — the stale
 *    Turbopack-cache class). Detected by comparing the working-tree file
 *    (what the build's pass 1 just wrote) against a fresh measurement of
 *    the pass-2 export. Response: investigate the export.
 *
 * 2. A stale COMMITTED file (prose edited and committed without the
 *    regenerated reading times — the 4d52d78 class, where twelve articles
 *    served stale counts). The working-tree comparison is blind to this
 *    inside `npm run build`: the chain is `next build && measure-reading-times
 *    && next build`, and the middle step rewrites the file on disk, so a
 *    postbuild check reading the working-tree file compares the build's
 *    own output against itself and passes green with the truth restored
 *    but nothing committed. That green-but-dirty exit is exactly how the
 *    stale class reached readers. So this gate also reads the
 *    git-COMMITTED blob (`git show HEAD:data/reading-times.json`) and
 *    diffs that against the fresh measurement. The build's rewrite
 *    cannot launder that comparison. Response: commit the regenerated
 *    file — this is the intended failure for a legitimate in-progress
 *    prose edit, not corruption.
 *
 * Standalone (`npm run check:reading-times` against a committed file and
 * an existing out/) both modes bite: the working-tree comparison is then
 * the committed comparison plus any uncommitted edits.
 */
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  classifyReadingTimeGate,
  type ReadingTimeEntry,
} from '../lib/reading-time.ts';
import { measureExport } from './measure-reading-times.ts';

const root = join(import.meta.dirname, '..');
const filePath = join(root, 'data', 'reading-times.json');

const recorded = JSON.parse(
  readFileSync(filePath, 'utf8'),
) as Record<string, ReadingTimeEntry>;

/**
 * The HEAD blob of data/reading-times.json, or null when the file is not
 * (yet) tracked: on the very first commit of the file there is no
 * committed record that could be stale, so the stale-commit mode is
 * skipped rather than failing a change that is doing the right thing.
 */
function committedRecord(): Record<string, ReadingTimeEntry> | null {
  try {
    const blob = execFileSync(
      'git',
      ['show', 'HEAD:data/reading-times.json'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return JSON.parse(blob) as Record<string, ReadingTimeEntry>;
  } catch {
    return null;
  }
}

const measured = measureExport();
const report = classifyReadingTimeGate(
  recorded,
  committedRecord(),
  measured,
);

let failed = false;

if (report.determinismFindings.length > 0) {
  failed = true;
  console.error(
    `check:reading-times: FAILED (determinism) — ${report.determinismFindings.length} entr${
      report.determinismFindings.length === 1 ? 'y' : 'ies'
    } disagree between the working-tree data/reading-times.json and a fresh measurement of out/:`,
  );
  for (const finding of report.determinismFindings) {
    console.error(`  ${finding}`);
  }
  console.error(
    'The export does not re-measure to what the build wrote. Investigate a non-deterministic export (stale build cache, e.g. rm -rf .next) rather than committing the moved file.',
  );
}

if (report.staleCommitFindings.length > 0) {
  failed = true;
  console.error(
    `check:reading-times: FAILED (stale committed file) — ${
      report.staleCommitFindings.length
    } entr${report.staleCommitFindings.length === 1 ? 'y' : 'ies'} in the COMMITTED data/reading-times.json disagree with a fresh measurement of out/:`,
  );
  for (const finding of report.staleCommitFindings) {
    console.error(`  ${finding}`);
  }
  console.error(
    'The build regenerated the file correctly (the working-tree copy matches the export); only the committed record is stale. Commit the regenerated data/reading-times.json together with the prose change it belongs to. Nothing is corrupted.',
  );
}

if (failed) process.exit(1);

console.log(
  `check:reading-times: OK (${report.articleCount} entries match the fresh measurement of out/, committed file and working tree agree)`,
);
