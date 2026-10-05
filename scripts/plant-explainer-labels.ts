/**
 * Mutation proof for the explainer label check (VAL-OPUS-043).
 *
 *   node scripts/plant-explainer-labels.ts [--out out | --base-url URL] [--ids flying,puppeteer]
 *
 * Runs the check three times and fails unless:
 * - with the planted layout (no clamp, no push-apart) the step sweep exits non-zero, and every
 *   failure message names the explainer, step, width and labels;
 * - the fixture (two labels on one anchor, one anchored beyond the stage edge) passes with the layout on;
 * - the same fixture fails with the layout off.
 */
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const server = option('--base-url', '') ? ['--base-url', option('--base-url', '')] : ['--out', option('--out', 'out')];
// Two labels that collide in flying step 3, and a label under the prompt in puppeteer step 1 at 390 px.
const ids = option('--ids', 'flying,puppeteer');
const MESSAGE = /^explainer-labels: #([a-z]+) step (\d+(?: guess| reveal| back)?|fixture) at (1280|390) px: "[^"]+" (overlaps "[^"]+" by \d+ x \d+ px|runs \d+ px past the stage (left|top|right|bottom) edge|is clipped by \S+)$/;

const runs = [
  { name: 'planted layout, step sweep', extra: ['--ids', ids, '--layout', 'off'], expect: 1 },
  { name: 'fixture, layout on', extra: ['--fixture'], expect: 0 },
  { name: 'fixture, layout off', extra: ['--fixture', '--layout', 'off'], expect: 1 },
];
let failed = 0;
for (const run of runs) {
  const result = spawnSync(process.execPath, ['scripts/check-explainer-labels.ts', ...server, ...run.extra], { encoding: 'utf8' });
  const lines = `${result.stdout}\n${result.stderr}`.split('\n');
  const problems = lines.filter((line) => line.startsWith('explainer-labels: #') && !line.endsWith(' swept'));
  const unnamed = problems.filter((line) => !MESSAGE.test(line));
  const ok = result.status === run.expect && unnamed.length === 0 && (run.expect === 0 || problems.length > 0);
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${run.name}: exit ${result.status}, ${problems.length} message(s)`);
  for (const line of problems.slice(0, 4)) console.log(`         ${line}`);
  for (const line of unnamed) console.log(`         does not name the explainer, step, width and labels: ${line}`);
  if (!ok) {
    failed += 1;
    console.log(lines.filter(Boolean).slice(-6).map((line) => `         ${line}`).join('\n'));
  }
}
if (failed) {
  console.log(`plant-explainer-labels: FAIL, ${failed} of ${runs.length} run(s) did not behave`);
  process.exit(1);
}
console.log('plant-explainer-labels: ok, the planted layout fails the sweep and the fixture, and the fixture passes with the layout on');
