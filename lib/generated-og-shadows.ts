/**
 * Narrow sync-shadow cleanup for the generated Open Graph asset tree.
 *
 * public/og is fully reproducible through `npm run generate:og-cards`, so
 * Finder-style " N" duplicates there are generated noise. The scope is
 * deliberately rooted at public/og: public/images contains locked third-party
 * assets, and repository-root files may be user-authored.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pruneSyncConflictDuplicates } from './sync-duplicates.ts';

export async function pruneGeneratedOgShadows(
  repositoryRoot: string,
): Promise<string[]> {
  const publicOgDir = join(repositoryRoot, 'public', 'og');
  if (!existsSync(publicOgDir)) return [];
  return pruneSyncConflictDuplicates(publicOgDir);
}
