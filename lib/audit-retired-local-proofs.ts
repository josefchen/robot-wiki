import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type Artifact = { path: string; bytes: number; sha256: string };

/**
 * Proofs a rebinding moved off the live catalog, archived with the pins they
 * held when they left it. Reviews written before the rebinding name these
 * proofs, so population checks keep counting them.
 */
export const RETIRED_LOCAL_PROOF_ARCHIVES: readonly Artifact[] = [{
  path: 'audit/evidence/parallel-local-20261009/previous-parallel-plan-and-proofs.json',
  bytes: 216263,
  sha256: 'ff49d0fedd361f54e092085366b1eb4adb7b7287341d107bff9db1c03652bcd0',
}];

/** The live proofs followed by every archived proof whose id no live proof has taken. */
export function withRetiredLocalProofs<P extends { id: string }>(
  root: string,
  live: readonly P[],
  parsedInputCache?: Map<string, unknown>,
): P[] {
  const liveIds = new Set(live.map(({ id }) => id));
  const retired = RETIRED_LOCAL_PROOF_ARCHIVES.flatMap(({ path, bytes, sha256 }) => {
    // Fresh bytes and the root are compared before reusing only the pure parse.
    const raw = readFileSync(join(root, path));
    const key = `retired-local-proofs:${resolve(root)}:${path}`;
    const cached = parsedInputCache?.get(key) as { bytes: Buffer; proofs: P[] } | undefined;
    if (cached?.bytes.equals(raw)) return cached.proofs;
    if (raw.length !== bytes || createHash('sha256').update(raw).digest('hex') !== sha256) {
      throw new Error(`retired local proof archive drift: ${path}`);
    }
    const proofs = (JSON.parse(raw.toString()) as { proofs: P[] }).proofs;
    parsedInputCache?.set(key, { bytes: raw, proofs });
    return proofs;
  });
  return [...live, ...retired.filter(({ id }) => !liveIds.has(id))];
}
