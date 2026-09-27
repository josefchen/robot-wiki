import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { createLocalArtifactReader, type LocalArtifact } from './audit-local-basis.ts';

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const artifact = z.object({
  path: z.string().min(1),
  bytes: z.number().int().positive(),
  sha256: hash,
}).strict();
const entrySchema = z.object({
  article: z.enum(['content/classical/control.mdx', 'content/classical/kinematics.mdx']),
  historical: artifact,
  snapshot: artifact,
  current: artifact,
  requiredPresent: z.array(z.string().min(1)).min(1),
  requiredAbsent: z.array(z.string().min(1)).min(1),
  review: z.object({
    reviewedBy: z.string().min(1),
    rationale: z.string().min(40),
    observedAt: z.string().datetime(),
    inputDigest: hash,
  }).strict(),
}).strict();
type Continuity = z.infer<typeof entrySchema>;

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function classicalContinuityDigest(entry: Omit<Continuity, 'review'>): string {
  return digest(entry);
}

export function parseClassicalCorrectionContinuity(value: unknown): Continuity[] {
  const document = z.object({
    schemaVersion: z.literal('motion-classical-correction-continuity-v1'),
    entries: z.array(entrySchema).length(2),
  }).strict().parse(value);
  const entries = document.entries;
  if (entries.map((entry) => entry.article).join(',') !==
    'content/classical/control.mdx,content/classical/kinematics.mdx') {
    throw Error('classical correction continuity population drift');
  }
  return entries;
}

export function loadClassicalCorrectionContinuity(root: string): Continuity[] {
  return parseClassicalCorrectionContinuity(JSON.parse(readFileSync(
    join(root, 'audit/evidence/motion-classical-20260927/continuity.json'), 'utf8',
  )));
}

/** Earlier browser receipts retain their exact inputs; this checks the active article separately. */
export function currentClassicalCorrectionArticle(
  root: string,
  historical: LocalArtifact,
  entries: readonly Continuity[],
  requiredPresent: readonly string[] = [],
  requiredAbsent: readonly string[] = [],
): string {
  const entry = entries.find((candidate) => candidate.article === historical.path);
  if (!entry || entry.historical.bytes !== historical.bytes ||
    entry.historical.sha256 !== historical.sha256 ||
    entry.historical.path !== historical.path ||
    entry.snapshot.path !== `audit/evidence/motion-classical-20260927/${historical.path.includes('/control.') ? 'control' : 'kinematics'}-before.mdx` ||
    entry.current.path !== historical.path ||
    requiredPresent.some((phrase) => !entry.requiredPresent.includes(phrase)) ||
    requiredAbsent.some((phrase) => !entry.requiredAbsent.includes(phrase))) {
    throw Error('classical correction continuity identity drift');
  }
  const reader = createLocalArtifactReader(root);
  const old = reader(entry.snapshot);
  const current = reader(entry.current).toString('utf8');
  if (old.length !== historical.bytes ||
    createHash('sha256').update(old).digest('hex') !== historical.sha256 ||
    entry.requiredPresent.some((phrase) => !current.includes(phrase)) ||
    entry.requiredAbsent.some((phrase) => current.includes(phrase)) ||
    entry.review.inputDigest !== classicalContinuityDigest({
      article: entry.article, historical: entry.historical, snapshot: entry.snapshot,
      current: entry.current, requiredPresent: entry.requiredPresent, requiredAbsent: entry.requiredAbsent,
    }) ||
    Date.parse(entry.review.observedAt) > Date.now()) {
    throw Error('classical correction continuity review or active removal drift');
  }
  return current;
}
