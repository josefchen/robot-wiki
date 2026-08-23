/**
 * Pre-typecheck prune.
 *
 * Removes Finder-style sync-conflict duplicates (" N"-suffixed names; see
 * lib/sync-duplicates.ts) from the Next.js generated type directories that
 * tsconfig includes (.next/types and .next/dev/types). A duplicate landing
 * there breaks `npm run typecheck` with duplicate declarations (observed
 * 2026-08-07, and again at session start on 2026-08-11 and 2026-08-14),
 * and `next typegen` rewrites its own files without removing the ghosts,
 * so the sweep runs as the `pretypecheck` npm hook, before typegen. It
 * runs as `prebuild` for the same reason: `next build` regenerates
 * .next/types itself but never touches .next/dev/types, which its type
 * check still reads, so a ghost in the dev dir fails `npm run build`
 * with a duplicate-identifier error (measured 2026-08-23). A
 * no-op when .next does not exist yet (fresh clone).
 *
 * Pure decision logic lives in lib/sync-duplicates.ts for unit testing;
 * this script is only the CLI wrapper, mirroring
 * scripts/prune-export-artifacts.ts for out/.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pruneSyncConflictDuplicates } from '../lib/sync-duplicates.ts';

const nextDir = join(import.meta.dirname, '..', '.next');
const typeDirs = [join(nextDir, 'types'), join(nextDir, 'dev', 'types')];

const pruned: string[] = [];
for (const dir of typeDirs) {
  if (!existsSync(dir)) continue;
  for (const path of await pruneSyncConflictDuplicates(dir)) {
    pruned.push(path);
  }
}

console.log(
  pruned.length > 0
    ? `prune-next-type-duplicates: OK (removed ${pruned.join(', ')})`
    : 'prune-next-type-duplicates: OK (nothing to remove)',
);
