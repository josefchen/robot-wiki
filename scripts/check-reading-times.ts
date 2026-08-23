/**
 * Reading-times determinism gate.
 *
 * data/reading-times.json is derived from the export, and history has shown
 * two ways it drifts apart from what a fresh measurement says: a stale
 * committed file (prose edited without regenerating it, so the next build
 * corrects it) and a genuinely unstable export (one article re-measured at
 * 2107 words after the same tree had measured 2110, commit 06ebee2). Both
 * surfaced only as a silently modified tracked file, which is
 * indistinguishable from noise in git status and trains people to ignore
 * it.
 *
 * This gate makes the disagreement loud and named. It re-measures the
 * export in out/ WITHOUT writing anything and compares against the file.
 * Wired into postbuild, it closes the loop on the two-pass build: pass 1
 * measures and writes, pass 2 renders from the written file, and this
 * check proves pass 2's export re-measures to exactly what pass 1 wrote.
 * Nothing in .prose depends on the reading-time value (it renders in the
 * header, outside the measured region), so any disagreement here means
 * either the export is not a deterministic function of the tree or the
 * circularity assumption broke — either way, fail loudly rather than
 * shipping a silently rewritten data file.
 *
 * Standalone (`npm run check:reading-times`) it answers the worker
 * question "why is this file dirty": run it right after a build on a tree
 * you believe is unchanged; a clean pass proves determinism, a finding
 * names the article whose measurement moved.
 */
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { diffReadingTimeRecords, type ReadingTimeEntry } from '../lib/reading-time.ts';
import { measureExport } from './measure-reading-times.ts';

const root = join(import.meta.dirname, '..');
const filePath = join(root, 'data', 'reading-times.json');

const recorded = JSON.parse(
  readFileSync(filePath, 'utf8'),
) as Record<string, ReadingTimeEntry>;

const measured = measureExport();
const findings = diffReadingTimeRecords(recorded, measured);

if (findings.length > 0) {
  console.error(
    `check:reading-times: FAILED — ${findings.length} entr${findings.length === 1 ? 'y' : 'ies'} disagree between data/reading-times.json and a fresh measurement of out/:`,
  );
  for (const finding of findings) {
    console.error(`  ${finding}`);
  }
  console.error(
    'The export does not re-measure to the recorded values. If content changed since the file was last regenerated, commit the regenerated file; if the tree is unchanged, the export is not a deterministic function of the tree.',
  );
  process.exit(1);
}

console.log(
  `check:reading-times: OK (${Object.keys(measured).length} entries match the fresh measurement of out/)`,
);
