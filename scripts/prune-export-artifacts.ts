/**
 * Post-build export prune.
 *
 * Removes from out/ everything that is not a real route: Next.js-internal
 * artifacts (currently `/_not-found/`; see lib/not-found-export.ts) and
 * Finder-style sync-conflict duplicates ("404 2", "_next 2"; see
 * lib/sync-duplicates.ts). Wired into `postbuild` BEFORE build-search so
 * the Pagefind index never sees a pruned artifact.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pruneInternalExportArtifacts } from '../lib/not-found-export.ts';
import { pruneSyncConflictDuplicates } from '../lib/sync-duplicates.ts';

const outDir = join(import.meta.dirname, '..', 'out');

if (!existsSync(outDir)) {
  console.error('prune-export-artifacts: FAILED (out/ does not exist; run next build first)');
  process.exit(1);
}

const internal = await pruneInternalExportArtifacts(outDir);
const duplicates = await pruneSyncConflictDuplicates(outDir);
const pruned = [...internal, ...duplicates];

console.log(
  pruned.length > 0
    ? `prune-export-artifacts: OK (removed ${pruned.join(', ')})`
    : 'prune-export-artifacts: OK (nothing to remove)',
);
