import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { answerOptionsPredecessor } from '../../lib/audit-answer-options-continuity.ts';
import { domainPassCheckerPredecessor, domainPassPredecessor } from '../../lib/audit-domain-pass-continuity.ts';
import { figureMountPredecessor } from '../../lib/audit-figure-mount-continuity.ts';
import { imageMountPredecessor } from '../../lib/audit-image-mount-continuity.ts';
import { kolBacklogPredecessor } from '../../lib/audit-kol-backlog-continuity.ts';
import { dataHardwareCutPredecessor } from '../../lib/audit-length-cut-data-hardware-continuity.ts';
import { adjacentCutPredecessor } from '../../lib/audit-length-cut-adjacent-continuity.ts';
import { frontierLengthCutPredecessor } from '../../lib/audit-length-cut-frontier-continuity.ts';
import { worldModelsLengthCutPredecessor } from '../../lib/audit-length-cut-world-models-continuity.ts';
import { lengthCutPredecessor } from '../../lib/audit-length-cut-continuity.ts';
import { parallelLocalPredecessor } from '../../lib/audit-parallel-local-continuity.ts';
import { readerFirstPredecessor } from '../../lib/audit-reader-first-continuity.ts';
import { reskinPredecessor } from '../../lib/audit-reskin-site-foundation-continuity.ts';
import { sceneCraftPredecessor } from '../../lib/audit-scene-craft-continuity.ts';
import { seoPassCheckerPredecessor, seoPassPredecessor } from '../../lib/audit-seo-pass-continuity.ts';
import { wordBudgetTrimPredecessor } from '../../lib/audit-word-budget-trim-continuity.ts';

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
 * that pass: the rebuilt pre-pass article or checker while the live file is
 * the reviewed successor, otherwise the live bytes.
 */
export function preDomainPass(path: string): Buffer {
  const live = preFigureMounts(path);
  if (path === 'lib/audit-local-basis.ts') return domainPassCheckerPredecessor(root, live);
  return domainPassPredecessor(root, { path, bytes: 0, sha256: '' }, live);
}

/**
 * The bytes the figure-mount layer of 2026-10-07 hands every check older
 * than the mounts: the rebuilt pre-mount article while the live article is
 * the reviewed successor, otherwise the live bytes.
 */
export function preFigureMounts(path: string): Buffer {
  return figureMountPredecessor(root, { path, bytes: 0, sha256: '' }, preWordBudgetTrim(path));
}

/**
 * The bytes the word-budget trim layer of 2026-10-10 hands every check older
 * than the trim: the rebuilt pre-trim article while the live article is the
 * reviewed successor, otherwise the live bytes.
 */
export function preWordBudgetTrim(path: string): Buffer {
  return wordBudgetTrimPredecessor(root, { path, bytes: 0, sha256: '' }, preWorldModelsLengthCut(path));
}

/**
 * The bytes the world-models length-cut layer of 2026-10-12 hands every
 * check older than the cut: the rebuilt pre-cut article while the live
 * article is the reviewed successor, otherwise the bytes the newer layers
 * hand on.
 */
export function preWorldModelsLengthCut(path: string): Buffer {
  return worldModelsLengthCutPredecessor(root, { path, bytes: 0, sha256: '' }, preLengthCut(path));
}

/**
 * The bytes the length-cut layer of 2026-10-12 (manipulation, classical and
 * rl-sim2real), which landed after the world-models cut, hands every check
 * older than the cut: the rebuilt pre-cut article while the live article is
 * the reviewed successor, otherwise the bytes the newer layers hand on.
 */
export function preLengthCut(path: string): Buffer {
  return lengthCutPredecessor(root, { path, bytes: 0, sha256: '' }, preParallelLocal(path));
}

/**
 * The bytes the parallel-local suite layer of 2026-10-11 hands every check
 * older than the BatchScale rebinding: the rebuilt pre-rebinding suite while
 * the live suite is the reviewed successor, otherwise the bytes the newer
 * re-skin layer hands on.
 */
export function preParallelLocal(path: string): Buffer {
  return parallelLocalPredecessor(root, { path, bytes: 0, sha256: '' }, preReskin(path));
}

/**
 * The bytes the site-foundation re-skin layer of 2026-10-10 hands every
 * check older than the re-skin: the rebuilt pre-reskin source while the live
 * file is the reviewed successor, otherwise the bytes the newer frontier
 * length-cut layer hands on.
 */
export function preReskin(path: string): Buffer {
  return reskinPredecessor(root, { path, bytes: 0, sha256: '' }, preFrontierLengthCut(path));
}

/**
 * The bytes the frontier length-cut layer of 2026-10-13 hands every check
 * older than the cut: the rebuilt pre-cut article while the live article is
 * the reviewed successor, otherwise the bytes the newer data-hardware cut
 * layer hands on.
 */
export function preFrontierLengthCut(path: string): Buffer {
  return frontierLengthCutPredecessor(root, { path, bytes: 0, sha256: '' }, preDataHardwareCut(path));
}

/**
 * The bytes the data-hardware cut layer of 2026-10-13 hands every check older
 * than the data-hardware domain pass: the rebuilt pre-pass article while the
 * live article is the reviewed successor, otherwise the bytes the newer
 * adjacent cut layer hands on.
 */
export function preDataHardwareCut(path: string): Buffer {
  return dataHardwareCutPredecessor(root, { path, bytes: 0, sha256: '' }, preAdjacentCut(path));
}

/**
 * The bytes the adjacent cut layer of 2026-10-14, which landed after the
 * data-hardware cut, hands every check older than the adjacent domain pass:
 * the rebuilt pre-pass article while the live article is the reviewed
 * successor, otherwise the bytes the newer image-mount layer hands on.
 */
export function preAdjacentCut(path: string): Buffer {
  return adjacentCutPredecessor(root, { path, bytes: 0, sha256: '' }, preImageMounts(path));
}

/**
 * The bytes the image-mount layer (images bundle A of 2026-10-13, extended
 * on 2026-10-15 by the adjacent images of bundle B after the adjacent cut
 * and by the data-hardware images after the data-hardware cut)
 * hands every check older than the
 * mounts: the rebuilt pre-mount article while the live article is the
 * reviewed successor, otherwise the bytes the newer figure-mount read hands on.
 */
export function preImageMounts(path: string): Buffer {
  return imageMountPredecessor(root, { path, bytes: 0, sha256: '' }, preLateFigureMounts(path));
}

/**
 * The bytes the figure-mount layer hands every check older than the two
 * frontier figures it admitted on 2026-10-15 after the image mounts
 * (BearCaseLock in the bear case, SafetyFilterFence in safety and
 * assurance): the rebuilt pre-mount article while the live article is the
 * reviewed successor, otherwise the bytes the newer scene-craft read hands
 * on. The same layer is read again in its original place, under the
 * word-budget trim (preFigureMounts).
 */
export function preLateFigureMounts(path: string): Buffer {
  return figureMountPredecessor(root, { path, bytes: 0, sha256: '' }, preSceneCraft(path));
}

/**
 * The bytes the scene-craft layer of 2026-10-18 hands every check older than
 * that pass: the rebuilt pre-pass scene source while the live scene is the
 * reviewed successor, otherwise the bytes the newer answer-options read
 * hands on.
 */
export function preSceneCraft(path: string): Buffer {
  return sceneCraftPredecessor(root, { path, bytes: 0, sha256: '' }, preAnswerOptions(path));
}

/**
 * The bytes the answer-options layer of 2026-10-23 hands every check older
 * than the self-check option rebalance: the rebuilt pre-rebalance article
 * while the live article is the reviewed successor, otherwise the live bytes.
 */
export function preAnswerOptions(path: string): Buffer {
  return answerOptionsPredecessor(root, { path, bytes: 0, sha256: '' }, readFileSync(resolve(root, path)));
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
