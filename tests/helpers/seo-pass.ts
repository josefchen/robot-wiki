import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { domainPassPredecessor } from '../../lib/audit-domain-pass-continuity.ts';
import { kolBacklogPredecessor } from '../../lib/audit-kol-backlog-continuity.ts';
import { readerFirstPredecessor } from '../../lib/audit-reader-first-continuity.ts';
import { seoPassCheckerPredecessor, seoPassPredecessor } from '../../lib/audit-seo-pass-continuity.ts';

const root = resolve(import.meta.dirname, '../..');
type Artifact = { path: string; bytes: number; sha256: string };
const review = JSON.parse(readFileSync(resolve(root,
  'audit/evidence/seo-pass-20261002/source-transition.json'), 'utf8')) as { sources: { before: Artifact; after: Artifact }[] };
const specReview = JSON.parse(readFileSync(resolve(root,
  'audit/evidence/seo-pass-20261002/spec-transition.json'), 'utf8')) as { sources: { before: Artifact; after: Artifact }[] };

/**
 * The bytes the KOL backlog layer of 2026-10-05 hands every check older than
 * that batch: the rebuilt pre-batch article while the live article is the
 * reviewed successor, otherwise the live bytes.
 */
export function preKolBacklog(path: string): Buffer {
  return kolBacklogPredecessor(root, { path, bytes: 0, sha256: '' }, preDomainPass(path));
}

/**
 * The bytes the domain-pass layer of 2026-10-06 hands every check older than
 * that pass: the rebuilt pre-pass article while the live article is the
 * reviewed successor, otherwise the live bytes.
 */
export function preDomainPass(path: string): Buffer {
  return domainPassPredecessor(root, { path, bytes: 0, sha256: '' }, readFileSync(resolve(root, path)));
}

/**
 * The bytes the reader-first layer hands every check older than the
 * reader-first figure pass: the rebuilt pre-pass file while the live file is
 * the reviewed successor, otherwise the live bytes.
 */
export function preReaderFirst(path: string): Buffer {
  return readerFirstPredecessor(root, { path, bytes: 0, sha256: '' }, preKolBacklog(path));
}

/**
 * The bytes the artifact reader hands every check older than the SEO pass:
 * the rebuilt pre-pass article, end-to-end spec or checker while the live
 * file is the reviewed successor, otherwise the live bytes.
 */
export function preSeoPass(path: string): Buffer {
  const live = preReaderFirst(path);
  if (path === 'lib/audit-local-basis.ts') return seoPassCheckerPredecessor(root, live);
  if (path === 'components/article/commit-to-reveal.tsx') {
    return seoPassPredecessor(root, { path, bytes: 0, sha256: '' }, live);
  }
  const source = [...review.sources, ...specReview.sources].find((candidate) => candidate.after.path === path);
  return source ? seoPassPredecessor(root, source.before, live) : live;
}

export const preSeoPassText = (path: string): string => preSeoPass(path).toString('utf8');

/** The last commit before the SEO pass. */
export const PRE_SEO_PASS_COMMIT = '953a891b42e762aa1e6ddbf77421fc8f727019f4';

const gitShow = (path: string) => execFileSync('git', ['show', `${PRE_SEO_PASS_COMMIT}:${path}`], {
  cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
});
let observed: Map<string, string | undefined> | undefined;

/**
 * An article-truth member's hash just before the SEO pass, as that commit's
 * own brand-v2 evidence observed it, for checks of the endpoint an older
 * approval reached before the pass moved the member on.
 */
export function preSeoPassHash(kind: string, memberId: string): string {
  observed ??= new Map((JSON.parse(gitShow('evidence/brand-v2/results.json')) as {
    results: Array<{ resultId: string; payload?: { observed?: { currentHash?: string } } }>;
  }).results.map((row) => [row.resultId, row.payload?.observed?.currentHash]));
  const hash = observed.get(`result:VAL-B2-BASE-002:${kind}:${memberId}`);
  if (!hash) throw new Error(`no pre-pass observation for ${kind}:${memberId}`);
  return hash;
}

// The label code in data/citations.ts runs from the comment above the first
// label table to the end of citationLabel; the venue-year helper follows it.
const LABEL_CODE = /\n\/\*\*\n \* (?:Organisation bylines|Inline chip label)[\s\S]*?(?=\n\/\*\*\n \* True when the venue string)/;
let preSeoPassLabelCode: string | undefined;

/**
 * The citation registry with the SEO pass's label code swapped back for the
 * code it replaced, so byte checks on older registry states still compare
 * every citation entry exactly.
 */
export function withPreSeoPassLabelCode(registry: string): string {
  preSeoPassLabelCode ??= gitShow('data/citations.ts').match(LABEL_CODE)?.[0];
  const live = registry.match(LABEL_CODE);
  if (!preSeoPassLabelCode || !live || registry.split(live[0]).length !== 2) {
    throw new Error('the citation registry must hold the label code exactly once');
  }
  return registry.replace(LABEL_CODE, () => preSeoPassLabelCode!);
}
