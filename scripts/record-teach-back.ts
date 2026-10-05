/**
 * Writes one explainer's teach-back record (VAL-OPUS-044) from the step
 * sweep and the reviewer's answers.
 *
 *   node scripts/record-teach-back.ts --id arm --audit sweep.json --shots dir --review review.json
 *     [--commit <sha>] [--date YYYY-MM-DD]
 *
 * --audit is the record of `scripts/audit-explainers.ts --record`, --shots the
 * directory its `--shots` option wrote (one folder per explainer), and
 * --review the reviewer's answers: { session, sentence, selfCheckAnswer,
 * selfCheckCorrect, unclearTerms, samePoint, reason }, with unclearTerms
 * every word the reviewer listed. Words the test does not count are kept
 * apart in the record, each with its rule. Screenshots are copied beside the
 * record as JPEG.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  explainerDigest, explainerWords, recordPath, TEACH_BACK_DIR, TEACH_BACK_WIDTHS, uncountedReason, type NoiseRow, type TeachBackRecord,
} from '../lib/teach-back.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback = '') => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const id = option('--id');
const words = await explainerWords('.', id);
if (!words) throw new Error(`record-teach-back: unknown explainer ${id}`);

type AuditStep = { explainer: string; width: number; step: string; words: number; labels: string[]; controls: string[]; colours: Record<string, number> };
const audit = JSON.parse(readFileSync(option('--audit'), 'utf8')) as { steps: AuditStep[] };
const noiseAudit: NoiseRow[] = audit.steps.filter((s) => s.explainer === id).map((s) => ({
  width: s.width, step: s.step, words: s.words, labels: s.labels.length, controls: s.controls.length, colours: Object.keys(s.colours ?? {}),
}));
for (const width of TEACH_BACK_WIDTHS) {
  if (!noiseAudit.some((row) => row.width === width)) throw new Error(`record-teach-back: the sweep has no ${width} px steps for #${id}`);
}
const noiseClean = noiseAudit.every((row) => row.words <= 25 && row.labels <= 3 && row.controls <= 2 && row.colours.filter((c) => c !== 'fail').length <= 1);

const dir = join(TEACH_BACK_DIR, id);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const screenshots: string[] = [];
const from = join(option('--shots'), id);
for (const file of readdirSync(from).filter((f) => f.endsWith('.png')).sort()) {
  const to = join(dir, file.replace(/\.png$/, '.jpg'));
  await sharp(join(from, file)).jpeg({ quality: 82, mozjpeg: true }).toFile(to);
  screenshots.push(to);
}

const review = JSON.parse(readFileSync(option('--review'), 'utf8')) as {
  session: string; sentence: string; selfCheckAnswer: string; selfCheckCorrect: boolean; unclearTerms: string[]; samePoint: 'yes' | 'no'; reason: string;
};
const selfCheck = words.selfCheck as { q: string };
const reviewed = words as unknown as Parameters<typeof uncountedReason>[0];
const unclearTerms = review.unclearTerms.filter((term) => !uncountedReason(reviewed, term));
const uncountedTerms = review.unclearTerms.flatMap((term) => {
  const why = uncountedReason(reviewed, term);
  return why ? [{ term, why }] : [];
});
const pass = review.samePoint === 'yes' && review.selfCheckCorrect && unclearTerms.length === 0 && noiseClean;
const record: TeachBackRecord = {
  schemaVersion: 'teach-back-record-v1',
  explainer: id,
  screenshots,
  takeaway: String(words.takeaway),
  selfCheck: { question: selfCheck.q, answer: review.selfCheckAnswer, correct: review.selfCheckCorrect },
  sentence: review.sentence,
  unclearTerms,
  ...(uncountedTerms.length ? { uncountedTerms } : {}),
  samePoint: review.samePoint,
  reason: review.reason,
  noiseAudit,
  noiseClean,
  verdict: pass ? 'pass' : 'fail',
  screenshotCommit: option('--commit', execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()),
  date: option('--date', new Date().toISOString().slice(0, 10)),
  reviewerSession: review.session,
  sourceDigest: await explainerDigest('.', id),
};
writeFileSync(recordPath(id), `${JSON.stringify(record, null, 2)}\n`);
console.log(`record-teach-back: #${id} ${record.verdict}, ${screenshots.length} screenshots, digest ${record.sourceDigest.slice(0, 12)}`);
