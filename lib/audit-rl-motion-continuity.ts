import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { createLocalArtifactReader, type LocalArtifact } from './audit-local-basis.ts';

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const artifact = z.object({
  path: z.string().min(1),
  bytes: z.number().int().positive(),
  sha256: hash,
}).strict();
const slugs = ['parallel-sim-rl', 'legged-locomotion', 'reward-design-mpc', 'sim2real-transfer'] as const;
const entrySchema = z.object({
  article: z.string().min(1),
  historical: artifact,
  snapshot: artifact,
  current: artifact,
  proofIds: z.array(z.string().min(1)).min(1),
  requiredPresent: z.array(z.string().min(1)).min(2),
  review: z.object({
    reviewedBy: z.string().min(1),
    rationale: z.string().min(80),
    observedAt: z.string().datetime(),
    inputDigest: hash,
  }).strict(),
}).strict();
type Continuity = z.infer<typeof entrySchema>;

export function rlMotionContinuityDigest(entry: Omit<Continuity, 'review'>): string {
  return createHash('sha256').update(JSON.stringify(entry)).digest('hex');
}

export function parseRlMotionContinuity(value: unknown): Continuity[] {
  const entries = z.object({
    schemaVersion: z.literal('motion-rl-sim2real-continuity-v1'),
    entries: z.array(entrySchema).length(4),
  }).strict().parse(value).entries;
  for (const [index, entry] of entries.entries()) {
    const article = `content/rl-sim2real/${slugs[index]}.mdx`;
    if (entry.article !== article || entry.historical.path !== article ||
      entry.current.path !== article ||
      entry.snapshot.path !== `audit/evidence/motion-rl-sim2real-20260927/${slugs[index]}-before.mdx`) {
      throw Error('RL motion continuity population or path drift');
    }
  }
  return entries;
}

export function loadRlMotionContinuity(root: string): Continuity[] {
  return parseRlMotionContinuity(JSON.parse(readFileSync(join(
    root, 'audit/evidence/motion-rl-sim2real-20260927/continuity.json',
  ), 'utf8')));
}

/** Old receipts remain bound to old bytes. This separately reviews the active article. */
export function currentRlMotionArticle(
  root: string,
  historical: LocalArtifact,
  entries: readonly Continuity[],
  proofReference: LocalArtifact = historical,
  parsedInputCache?: Map<string, unknown>,
): Buffer {
  const entry = entries.find((candidate) => candidate.article === historical.path);
  if (!entry || entry.historical.path !== historical.path ||
    entry.historical.bytes !== historical.bytes ||
    entry.historical.sha256 !== historical.sha256) {
    throw Error('RL motion continuity identity drift');
  }
  // Fresh bytes and the root are compared before reusing only the pure parse.
  // Population, article, citation and review checks still run for this member.
  const catalogBytes = readFileSync(join(root, 'audit/local-basis.json'));
  const key = resolve(root);
  type ProofIndex = {
    proofs: { id: string; artifacts: { file: LocalArtifact }[] }[];
  };
  const cached = parsedInputCache?.get(key) as { bytes: Buffer; catalog: ProofIndex } | undefined;
  const unchanged = cached?.bytes.equals(catalogBytes) ?? false;
  const catalog: ProofIndex = unchanged ? cached!.catalog : JSON.parse(catalogBytes.toString()) as ProofIndex;
  if (!unchanged) parsedInputCache?.set(key, { bytes: catalogBytes, catalog });
  const bound = catalog.proofs.filter((proof) => proof.artifacts.some(({ file }) =>
    file.path === proofReference.path && file.bytes === proofReference.bytes &&
    file.sha256 === proofReference.sha256)).map((proof) => proof.id).sort();
  if (JSON.stringify(bound) !== JSON.stringify(entry.proofIds)) {
    throw Error('RL motion continuity proof population drift');
  }
  const reader = createLocalArtifactReader(root);
  const old = reader(entry.snapshot);
  const current = reader(entry.current).toString('utf8');
  const citations = (text: string) => [...text.matchAll(/<Cite id="([^"]+)"\s*\/>/g)]
    .map((match) => match[1]);
  if (old.length !== historical.bytes ||
    createHash('sha256').update(old).digest('hex') !== historical.sha256 ||
    JSON.stringify(citations(old.toString('utf8'))) !== JSON.stringify(citations(current)) ||
    entry.requiredPresent.some((phrase) => !current.includes(phrase)) ||
    entry.review.inputDigest !== rlMotionContinuityDigest({
      article: entry.article, historical: entry.historical, snapshot: entry.snapshot,
      current: entry.current, proofIds: entry.proofIds, requiredPresent: entry.requiredPresent,
    }) ||
    Date.parse(entry.review.observedAt) > Date.now()) {
    throw Error('RL motion continuity disclosure, citations or review drift');
  }
  return old;
}
