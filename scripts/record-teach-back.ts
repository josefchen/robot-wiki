/**
 * Writes one explainer's teach-back record (VAL-OPUS-044) from the step
 * sweep and the reviewer's answers.
 *
 *   node scripts/record-teach-back.ts --id arm --round 2 --audit sweep.json --shots dir --review review.json
 *     [--seen dir] [--commit <sha>] [--date YYYY-MM-DD] [--provenance text]
 *
 * --audit is the record of `scripts/audit-explainers.ts --record`, --shots the
 * directory its `--shots` option wrote (one folder per explainer), and
 * --review the reviewer's answers: { session, sentence, selfCheckAnswer,
 * selfCheckCorrect, unclearTerms, samePoint, reason }, with unclearTerms
 * every word the reviewer listed, each with the reviewer's note. --seen is a
 * checkout of the commit the round ran on, when that is not this tree: the
 * self-check question is read from what the reviewer saw, and nothing is
 * written when that commit's scene or model files, or the registered
 * takeaway, differ from this tree's. Words the test does not count, judged
 * against the explainer's words in this tree as the check judges them, are
 * kept apart, each with its rule. A failing record from a round before the
 * owner acceptance of 12 Oct 2026 carries the line citing it with the
 * residual unclear words. Screenshots are copied beside the record as JPEG.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  explainerDigest, explainerWords, measuredVerdict, OWNER_ACCEPTANCE_DATE, ownerAcceptanceLine, recordPath, residualTerm, TEACH_BACK_DIR,
  TEACH_BACK_WIDTHS, uncountedReason, type NoiseRow, type TeachBackRecord,
} from '../lib/teach-back.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback = '') => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const id = option('--id');
const round = Number(option('--round'));
if (!Number.isInteger(round) || round < 1) throw new Error('record-teach-back: --round names the teach-back round the record carries');
const words = await explainerWords('.', id);
if (!words) throw new Error(`record-teach-back: unknown explainer ${id}`);
const seenRoot = option('--seen', '.');
const seen = await explainerWords(seenRoot, id);
if (!seen) throw new Error(`record-teach-back: ${seenRoot} has no words for #${id}`);
const sourceDigest = explainerDigest('.', id);
if (explainerDigest(seenRoot, id) !== sourceDigest) {
  throw new Error(`record-teach-back: #${id}'s scene or model files changed since the round; it needs a fresh teach-back`);
}
if (seen.takeaway !== words.takeaway) throw new Error(`record-teach-back: #${id}'s registered takeaway changed since the round`);

type AuditStep = {
  explainer: string; width: number; step: string; words: number; labels: string[]; tones?: string[]; controls: string[]; colours: Record<string, number>;
};
const audit = JSON.parse(readFileSync(option('--audit'), 'utf8')) as { steps: AuditStep[] };
const noiseAudit: NoiseRow[] = audit.steps.filter((s) => s.explainer === id).map((s) => ({
  width: s.width, step: s.step, words: s.words, labels: s.labels.length, controls: s.controls.length,
  colours: [...new Set([...Object.keys(s.colours ?? {}), ...(s.tones ?? []).filter((tone) => tone !== 'plain')])],
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
const reviewed = words as unknown as Parameters<typeof uncountedReason>[0];
// The word itself, without the reviewer's note or its quotation marks.
const term = (entry: string) => residualTerm(entry).replace(/^"([^"]*)"$/, '$1');
const unclearTerms = review.unclearTerms.filter((entry) => !uncountedReason(reviewed, term(entry)));
const uncountedTerms = review.unclearTerms.flatMap((entry) => {
  const why = uncountedReason(reviewed, term(entry));
  return why ? [{ term: term(entry), why }] : [];
});
const selfCheck = { question: String((seen.selfCheck as { q: string }).q), answer: review.selfCheckAnswer, correct: review.selfCheckCorrect };
const verdict = measuredVerdict({ samePoint: review.samePoint, selfCheck, unclearTerms, noiseClean });
const date = option('--date', new Date().toISOString().slice(0, 10));
const provenance = option('--provenance');
const record: TeachBackRecord = {
  schemaVersion: 'teach-back-record-v2',
  explainer: id,
  round,
  screenshots,
  takeaway: String(words.takeaway),
  selfCheck,
  sentence: review.sentence,
  unclearTerms,
  ...(uncountedTerms.length ? { uncountedTerms } : {}),
  samePoint: review.samePoint,
  reason: review.reason,
  noiseAudit,
  noiseClean,
  verdict,
  ...(verdict === 'fail' && date <= OWNER_ACCEPTANCE_DATE ? { ownerAcceptance: ownerAcceptanceLine(unclearTerms) } : {}),
  ...(provenance ? { provenance } : {}),
  screenshotCommit: option('--commit', execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()),
  date,
  reviewerSession: review.session,
  sourceDigest,
};
writeFileSync(recordPath(id), `${JSON.stringify(record, null, 2)}\n`);
console.log(`record-teach-back: #${id} round ${round} ${verdict}, ${screenshots.length} screenshots, digest ${sourceDigest.slice(0, 12)}`);
