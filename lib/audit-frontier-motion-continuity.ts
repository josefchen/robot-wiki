/**
 * Finite article successor for the two historical safety local-basis rows.
 * The old proof still reads the exact article it observed; the live article
 * must match the reviewed prose continuation, with its source qualifiers and
 * model disclosures intact. No historical receipt or observation is rewritten.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { reviewedDataHardwareChecker } from './audit-data-hardware-motion-continuity.ts';
import { reviewedDomainPairsChecker } from './audit-motion-domain-pairs-continuity.ts';

const directory = 'audit/evidence/motion-frontier-adjacent-home-20260927/';
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const oldHash = '89c2e410795c25254a1ebdea7ccbadcddb364f6535f5ea9fe5d8ef7063113f69';
const newHash = '54fa9bab160a9d52f0d9ed765c6812c40e2707fa32cc4aeec907dc71350caabd';

const citationIds = (text: string) =>
  [...text.matchAll(/<Cite id="([^"]+)"/g)].map((match) => match[1]);
const frontmatter = (text: string) => text.slice(0, text.indexOf('\n---', 4) + 4);
const numericTokens = (text: string) => text
  .replace(/\b(?:Tables?|Tab\.|Figures?|Fig\.|Equation|Eq\.|Algorithm|Sections?)\s*\(?\s*(?:\d+(?:\.\d+)*[a-z]?|[IVXL]+)\b|\bAppendix\s+[A-Z]\d*(?:\.\d+)?\b|\bv\d+\b/g, '')
  .match(/(?<![\w-])\d(?:[\d,]*\d)?(?:\.\d+)?(?:%|x|Hz|ms|s|m|M|k)?/g)
  ?.sort() ?? [];

export function currentFrontierSafetyArticle(root: string, live: Buffer): Buffer {
  const review = JSON.parse(readFileSync(join(root, `${directory}continuity.json`), 'utf8')) as {
    schemaVersion: string;
    before: { path: string; bytes: number; sha256: string };
    after: { path: string; bytes: number; sha256: string };
    reviewedBy: string;
    rationale: string;
    observedAt: string;
  };
  const beforePath = `${directory}safety-article-before.mdx`;
  const original = readFileSync(join(root, beforePath));
  const old = original.toString('utf8');
  const current = live.toString('utf8');
  if (review.schemaVersion !== 'motion-frontier-safety-continuity-v1' ||
    review.before.path !== beforePath ||
    review.before.bytes !== original.length ||
    review.before.sha256 !== oldHash ||
    sha256(original) !== oldHash ||
    review.after.path !== 'content/frontier/safety-and-assurance.mdx' ||
    review.after.bytes !== live.length ||
    review.after.sha256 !== newHash ||
    sha256(live) !== newHash ||
    !review.reviewedBy || review.rationale.length < 80 ||
    !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now() ||
    frontmatter(old) !== frontmatter(current) ||
    JSON.stringify(citationIds(old)) !== JSON.stringify(citationIds(current)) ||
    JSON.stringify(numericTokens(old)) !== JSON.stringify(numericTokens(current)) ||
    !current.includes('The instrument is an authored teaching model.') ||
    !current.includes('an intrusion margin of at least 850 mm') ||
    !current.includes('2000 mm/s may be more prudent') ||
    !current.includes('these controls are not certified operating limits') ||
    !current.includes('requires traceable stopping-time and braking-distance measurements')) {
    throw new Error('frontier safety prose, history or source scope drift');
  }
  return original;
}

export function reviewedFrontierChecker(root: string, live: Buffer): boolean {
  const review = JSON.parse(readFileSync(join(root, `${directory}checker-transition.json`), 'utf8')) as {
    schemaVersion: string;
    before: { path: string; bytes: number; sha256: string };
    after: { path: string; bytes: number; sha256: string };
    reviewedBy: string;
    rationale: string;
    observedAt: string;
  };
  const beforePath = `${directory}audit-local-basis-before.ts.txt`;
  const old = readFileSync(join(root, beforePath));
  const predecessor = reviewedDomainPairsChecker(root, live);
  return review.schemaVersion === 'motion-frontier-checker-revision-v1' &&
    review.before.path === beforePath &&
    review.before.bytes === 110353 &&
    review.before.sha256 === 'ef39b0de96ac433682a61a390998152871f2a4065c6db4a27f2fd97c66bd7660' &&
    old.length === review.before.bytes &&
    sha256(old) === review.before.sha256 &&
    reviewedDataHardwareChecker(root, old) &&
    review.after.path === 'lib/audit-local-basis.ts' &&
    predecessor.length === review.after.bytes &&
    sha256(predecessor) === review.after.sha256 &&
    Boolean(review.reviewedBy && review.rationale.length > 80) &&
    Number.isFinite(Date.parse(review.observedAt)) &&
    Date.parse(review.observedAt) <= Date.now();
}
