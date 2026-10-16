/**
 * Post-generation check: the shipped Open Graph cards are exactly the bytes
 * the render boundary produces, and every tree the corpus lives in holds
 * the validated, journalled corpus.
 *
 * Runs last in postbuild, after scripts/generate-og-cards.ts, so it observes
 * the final state of both official destinations. That ordering is the point:
 * anything that writes a card after the generator — a helper the generator
 * calls, a later build step, an edit to a committed PNG — has to leave bytes
 * this re-render reproduces, or the build fails. See
 * lib/og-card-emitted-bytes.ts for why this is asked of the artefact rather
 * than of the generator's source, and lib/og-card-parity.ts for the
 * staged/public/out/committed comparison.
 *
 * The export tree is required, as it always was: this runs after the build.
 *
 * Flags:
 *   --committed  also compare the tracked trees with the blobs at HEAD
 *                (release, after the corpus is committed).
 */
import { join } from 'node:path';
import {
  OG_CARD_OUTPUT_ROOTS,
  verifyShippedCardBytes,
} from '../lib/og-card-emitted-bytes.ts';
import { verifyOgCorpusParity } from '../lib/og-card-parity.ts';

const root = join(import.meta.dirname, '..');

try {
  const parity = verifyOgCorpusParity({
    root,
    committed: process.argv.includes('--committed'),
    requireExport: true,
  });
  if (!parity.ok) {
    throw new Error(`corpus parity:\n- ${parity.failures.join('\n- ')}`);
  }
  const destinationRoots = OG_CARD_OUTPUT_ROOTS;
  const verified = await verifyShippedCardBytes({ root, destinationRoots });
  console.log(
    `check-og-card-bytes: OK (${parity.ogCards} OG/X cards + ${parity.structuredImages} structured images equal across the journalled corpus and ${parity.trees.join(', ')}${parity.committedFiles > 0 ? ` and ${parity.committedFiles} committed blobs` : ''}; ${verified.cards.length} files re-rendered through the boundary, ${verified.files} shipped file(s) byte-identical under ${destinationRoots.join(', ')})`,
  );
} catch (error) {
  console.error(`check-og-card-bytes: FAILED (${(error as Error).message})`);
  process.exit(1);
}
