import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { figureMigrationPredecessor } from '../../lib/audit-figure-migration-continuity.ts';

const root = resolve(import.meta.dirname, '../..');
type Artifact = { path: string; bytes: number; sha256: string };
type Source = {
  before: Artifact;
  after: Artifact;
  replaced: { before: string; after: string }[];
  retired: { literal: string; survivor: string }[];
};
const review = JSON.parse(readFileSync(resolve(root,
  'audit/evidence/figure-migration-20261001/source-transition.json'), 'utf8')) as { sources: Source[] };

/**
 * The bytes the artifact reader hands every check older than the figure
 * migration: the archived predecessor while the live file is the reviewed
 * successor, otherwise the live bytes. A bare path stands for the reference
 * that names its pre-migration bytes.
 */
export function preFigureMigration(reference: Artifact | string): Buffer {
  const path = typeof reference === 'string' ? reference : reference.path;
  const live = readFileSync(resolve(root, path));
  const source = review.sources.find((candidate) => candidate.after.path === path);
  const named = typeof reference === 'string'
    ? source && { path, bytes: source.before.bytes, sha256: source.before.sha256 }
    : reference;
  return named ? figureMigrationPredecessor(root, named, live) : live;
}

/**
 * Whether live text still carries a phrase an earlier review requires:
 * verbatim, with every reviewed figure-migration replacement applied, or as a
 * retired mount whose reviewed survivor is present.
 */
export function carriesThroughFigureMigration(path: string, phrase: string, live: string): boolean {
  if (live.includes(phrase)) return true;
  const source = review.sources.find((candidate) => candidate.after.path === path);
  if (!source) return false;
  if (source.retired.some(({ literal, survivor }) => literal === phrase && live.includes(survivor))) return true;
  const rewritten = source.replaced.reduce((text, { before, after }) => text.split(before).join(after), phrase);
  return rewritten !== phrase && live.includes(rewritten);
}
