/**
 * Writes one reader-test record per reviewed figure from a reviewer's
 * answers and the capture file of scripts/capture-reader-first.ts.
 *
 *   node scripts/record-reader-first.ts --capture <file.json> --answers <file.json> [--date YYYY-MM-DD]
 *
 * The answers file is a list of { id, session, sentence, unclearTerms,
 * samePoint, reason }, in the reviewer's own words, given after the brief of
 * scripts/brief-reader-first.ts. A figure passes when the answer is yes and
 * every listed term is one the fixed rubric (contract/reader-first-rubric.json)
 * exempts; the record keeps the full list and the rubric's digest. A new
 * attempt replaces the record; git history keeps the earlier ones.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  readRegistry,
  recordPath,
  screenshotPath,
  sourceDigest,
  type ReaderRecord,
} from '../lib/reader-first.ts';
import { countedTerms, loadRubric, readerVerdict } from '../lib/reader-first-rubric.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback = '') => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
type Answer = { id: string; session: string; sentence: string; unclearTerms: string[]; samePoint: 'yes' | 'no'; reason: string };
const capture = JSON.parse(readFileSync(option('--capture'), 'utf8')) as {
  commit: string;
  captured: { id: string; sourceDigest: string }[];
};
const answers = JSON.parse(readFileSync(option('--answers'), 'utf8')) as Answer[];
const date = option('--date', new Date().toISOString().slice(0, 10));
const registry = readRegistry('.');
const rubric = loadRubric('.');

for (const answer of answers) {
  const entry = registry.figures.find((candidate) => candidate.id === answer.id);
  const shot = capture.captured.find((candidate) => candidate.id === answer.id);
  if (!entry || !shot) throw new Error(`record-reader-first: ${answer.id} is not registered or was not captured`);
  if (shot.sourceDigest !== sourceDigest('.', entry.sources)) {
    throw new Error(`record-reader-first: ${answer.id} changed after its screenshots; capture and review it again`);
  }
  const unclearTerms = answer.unclearTerms.map((term) => term.trim()).filter(Boolean);
  const record: ReaderRecord = {
    schemaVersion: 'reader-first-record-v1',
    route: entry.route,
    mount: entry.mount,
    screenshots: { 1280: screenshotPath(entry.id, 1280), 375: screenshotPath(entry.id, 375) },
    takeaway: entry.takeaway,
    sentence: answer.sentence.trim(),
    unclearTerms,
    samePoint: answer.samePoint,
    reason: answer.reason.trim(),
    verdict: readerVerdict(rubric.rubric, { samePoint: answer.samePoint, unclearTerms }),
    screenshotCommit: capture.commit,
    date,
    reviewerSession: answer.session,
    sourceDigest: shot.sourceDigest,
    rubricDigest: rubric.digest,
  };
  writeFileSync(recordPath(entry.id), `${JSON.stringify(record, null, 2)}\n`);
  const counted = countedTerms(rubric.rubric, unclearTerms);
  const exempt = unclearTerms.filter((term) => !counted.includes(term));
  console.log(`${record.verdict} ${entry.id}${counted.length ? ` (unclear: ${counted.join(', ')})` : ''}` +
    `${exempt.length ? ` (exempt: ${exempt.join(', ')})` : ''}`);
}
