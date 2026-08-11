/**
 * Finder-style sync-conflict duplicates (" N"-suffixed names).
 *
 * The desktop sync tool on this machine copies files and directories to
 * "<name> <N>" duplicates ("visual-glossary-batch3 2.mts", "404 2",
 * "_next 2") inside watched folders, including the repo root, .next/, and
 * out/. The copies are never intentional: committed, they break typecheck
 * with duplicate declarations; left in out/, they phantom into route
 * censuses and sitemap counts (observed 2026-08-10/11 in all three
 * locations). The repo-level defense is the pair of " N" patterns in
 * .gitignore; the export-level defense is the postbuild prune here, so a
 * duplicate landing in out/ between build and deploy never ships.
 *
 * Pure decision logic lives here for unit testing; the script carries the
 * CLI wrapper (scripts/prune-export-artifacts.ts).
 */

import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * True for a Finder-conflict duplicate name: "<anything> <digits>" for a
 * directory ("404 2", "_next 2") or "<anything> <digits>.<ext>" for a file
 * ("visual-glossary-batch3 2.mts"). Route and file names in this repo are
 * slugs without spaces, so the pattern has no legitimate match.
 */
export function isSyncConflictDuplicate(name: string): boolean {
  return / \d+(\.[^/]+)?$/.test(name);
}

/**
 * Remove every sync-conflict duplicate under `dir`, recursively. Returns
 * the pruned paths relative to `dir`, in directory order. A no-op (empty
 * result) when none are present.
 */
export async function pruneSyncConflictDuplicates(
  dir: string,
): Promise<string[]> {
  const pruned: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (isSyncConflictDuplicate(entry.name)) {
      await rm(join(dir, entry.name), { recursive: true, force: true });
      pruned.push(entry.name);
    } else if (entry.isDirectory()) {
      for (const nested of await pruneSyncConflictDuplicates(join(dir, entry.name))) {
        pruned.push(`${entry.name}/${nested}`);
      }
    }
  }
  return pruned;
}
