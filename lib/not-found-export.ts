/**
 * Pruning of Next.js-internal export artifacts.
 *
 * `output: 'export'` always emits an internal `/_not-found/` copy of the
 * 404 page alongside the conventional `404.html`. That artifact is
 * reachable at `/_not-found/` in the exported site, where it duplicates
 * the 404 route's title and would need a canonical pointing at a different
 * route (or a self-canonical on a route that should not exist). Hosts do
 * not need it: Vercel and every static host serve `404.html` for missing
 * routes. So the artifact is pruned from `out/` in postbuild
 * (scripts/prune-not-found-artifact.ts) rather than papered over with
 * metadata.
 *
 * Pure decision logic lives here for unit testing; the script carries the
 * CLI wrapper.
 */

import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

/** Top-level out/ entries that are framework internals, not routes. */
export const INTERNAL_EXPORT_ARTIFACTS: readonly string[] = ['_not-found'];

/** True when a top-level out/ entry is a framework-internal artifact. */
export function isInternalExportArtifact(entryName: string): boolean {
  return INTERNAL_EXPORT_ARTIFACTS.includes(entryName);
}

/**
 * Remove every internal artifact from `outDir`. Returns the names pruned,
 * in directory order. A no-op (empty result) when none are present.
 */
export async function pruneInternalExportArtifacts(
  outDir: string,
): Promise<string[]> {
  const entries = await readdir(outDir);
  const pruned: string[] = [];
  for (const entry of entries) {
    if (isInternalExportArtifact(entry)) {
      await rm(join(outDir, entry), { recursive: true, force: true });
      pruned.push(entry);
    }
  }
  return pruned;
}
