/**
 * Post-build export prune.
 *
 * Removes Next.js-internal artifacts (currently `/_not-found/`) from out/
 * so the exported site contains only real routes. See lib/not-found-export.ts
 * for the rationale. Wired into `postbuild` BEFORE build-search so the
 * Pagefind index never sees the pruned artifact.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pruneInternalExportArtifacts } from '../lib/not-found-export.ts';

const outDir = join(import.meta.dirname, '..', 'out');

if (!existsSync(outDir)) {
  console.error('prune-not-found-artifact: FAILED (out/ does not exist; run next build first)');
  process.exit(1);
}

const pruned = await pruneInternalExportArtifacts(outDir);

console.log(
  pruned.length > 0
    ? `prune-not-found-artifact: OK (removed ${pruned.join(', ')})`
    : 'prune-not-found-artifact: OK (nothing to remove)',
);
