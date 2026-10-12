/**
 * The reviewer brief for the five-second reader test, rendered from the
 * fixed rubric in contract/reader-first-rubric.json, so every round gives
 * reviewers the same instructions and the same exemption list.
 *
 *   node scripts/brief-reader-first.ts --dir <folder> (--capture <file.json> | --ids a,b)
 *
 * Writes before.md, which the reviewer reads with the screenshots; after.md,
 * the registered takeaways, shown only once every sentence and list is
 * written; and key.json, which maps F1, F2 ... to registry ids and
 * screenshots. key.json stays with the operator: ids and file names carry
 * the technical names the test hides. The answers then go to
 * scripts/record-reader-first.ts.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readRegistry, screenshotPath } from '../lib/reader-first.ts';
import { loadRubric, reviewerBrief, rubricProblems } from '../lib/reader-first-rubric.ts';

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : '';
};
const dir = option('--dir');
const capture = option('--capture');
if (!dir || (!capture && !option('--ids'))) {
  throw new Error('brief-reader-first: --dir <folder> and --capture <file.json> or --ids a,b are required');
}
const ids = capture
  ? (JSON.parse(readFileSync(capture, 'utf8')) as { captured: { id: string }[] }).captured.map(({ id }) => id)
  : option('--ids').split(',').filter(Boolean);

const rubric = loadRubric('.');
const problems = rubricProblems(rubric.rubric);
if (problems.length) throw new Error(`brief-reader-first:\n${problems.join('\n')}`);
const registry = readRegistry('.');
const figures = ids.map((id) => {
  const entry = registry.figures.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`brief-reader-first: ${id} is not registered`);
  return { id, takeaway: entry.takeaway, screenshots: { 1280: screenshotPath(id, 1280), 375: screenshotPath(id, 375) } };
});

const brief = reviewerBrief(rubric, figures);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'before.md'), brief.before);
writeFileSync(join(dir, 'after.md'), brief.after);
writeFileSync(join(dir, 'key.json'), `${JSON.stringify(brief.key, null, 2)}\n`);
console.log(`brief-reader-first: ${figures.length} figure(s), rubric ${rubric.digest.slice(0, 12)} -> ${dir}`);
