/**
 * Post-generation check: the shipped Open Graph cards are exactly the bytes
 * the render boundary produces.
 *
 * Runs last in postbuild, after scripts/generate-og-cards.ts, so it observes
 * the final state of both official destinations. That ordering is the point:
 * anything that writes a card after the generator — a helper the generator
 * calls, a later build step, an edit to a committed PNG — has to leave bytes
 * this re-render reproduces, or the build fails. See
 * lib/og-card-emitted-bytes.ts for why this is asked of the artefact rather
 * than of the generator's source.
 */
import { join } from 'node:path';
import {
  OG_CARD_OUTPUT_ROOTS,
  verifyShippedCardBytes,
} from '../lib/og-card-emitted-bytes.ts';

const root = join(import.meta.dirname, '..');

try {
  const verified = await verifyShippedCardBytes({
    root,
    destinationRoots: OG_CARD_OUTPUT_ROOTS,
  });
  console.log(
    `check-og-card-bytes: OK (${verified.cards.length} cards re-rendered through the boundary, ${verified.files} shipped file(s) byte-identical under ${OG_CARD_OUTPUT_ROOTS.join(', ')})`,
  );
} catch (error) {
  console.error(`check-og-card-bytes: FAILED (${(error as Error).message})`);
  process.exit(1);
}
