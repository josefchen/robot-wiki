/**
 * Build-time OG card generation (VAL-DIST-002/003/005, VAL-B2-OG-001..015).
 *
 * Renders one 1200x630 PNG per published article plus one site-level
 * card, and the registered 4:3 and square structured-data variant of each
 * article card, into public/og/ and public/structured-images/ — and into
 * their out/ copies when the static export exists. The static export
 * serves them as plain files: no framework process, no image-optimisation
 * endpoint, no API route (the three shapes VAL-DIST-005 rejects).
 *
 * Publication is staged and journalled (lib/og-card-publication.ts): the
 * complete corpus is rendered into a clean staging tree, validated there
 * in full (lib/og-card-generation.ts: sealed matrix, route ownership,
 * strings against their sources, glyph probes, decoded pixels, a second
 * render for determinism), and only then swapped into place tree by tree,
 * with a rollback on any caught failure and recovery of an interrupted run
 * from its journal. The renderer-input manifest and the completed journal
 * are written to evidence/brand-v2/og-cards/.
 *
 * The card trees and their destinations come from the shared corpus in
 * lib/og-card-corpus.ts, which is also the population the renderer
 * evidence measures. This module must not build a card tree of its own,
 * and cannot transform one either: what it receives is a sealed handle
 * whose element tree is unreachable from here, and
 * lib/og-card-render-boundary.ts is the only module that opens one and
 * paints it. scripts/check-og-card-bytes.ts runs after this one in
 * postbuild, re-renders every corpus card through the boundary and
 * requires each shipped file to be exactly those bytes.
 *
 * Flags:
 *   --check-only  build the corpus without rendering (registry and facts).
 *   --stage-only  stage and validate into .og-staging/stage without
 *                 publishing, and leave the staging tree for inspection.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ogCardCorpus } from '../lib/og-card-corpus.ts';
import {
  stageOgCorpus,
  validateStagedOgCorpus,
  type StagedCorpus,
} from '../lib/og-card-generation.ts';
import { OG_CARD_JOURNAL_PATH, type OgCardManifest } from '../lib/og-card-manifest.ts';
import {
  OG_STAGING_DIR,
  activeTrees,
  publicationRecord,
  publishOgCorpus,
  recoverOgPublication,
} from '../lib/og-card-publication.ts';

const root = join(import.meta.dirname, '..');

function fail(error: unknown): never {
  console.error(`generate-og-cards: FAILED (${(error as Error).message})`);
  process.exit(1);
}

type Trees = Parameters<typeof stageOgCorpus>[0]['trees'];

/** One generation: the corpus, what staging rendered, and its validation. */
function generation() {
  const corpus = ogCardCorpus(root);
  let staged: StagedCorpus | null = null;
  let manifest: OgCardManifest | null = null;
  return {
    stage: async (stagingRoot: string, trees: Trees): Promise<void> => {
      staged = await stageOgCorpus({ root, stagingRoot, trees, corpus });
    },
    validate: async (stagingRoot: string, trees: Trees): Promise<void> => {
      if (staged === null) throw new Error('validation ran before staging');
      const validated = await validateStagedOgCorpus({ root, stagingRoot, trees, corpus, staged });
      if (validated.failures.length > 0) {
        throw new Error(
          `the staged corpus failed validation, so nothing canonical was changed:\n- ${validated.failures.join('\n- ')}`,
        );
      }
      manifest = validated.manifest;
    },
    summary: (): string => {
      if (manifest === null) return 'no validated manifest';
      const { cards, glyphProbes, corpusSha256 } = manifest as OgCardManifest;
      const variants = cards.reduce((sum, card) => sum + card.structuredVariants.length, 0);
      return `${cards.length} OG/X cards + ${variants} structured images, ${glyphProbes.length} glyph probes, corpus ${corpusSha256.slice(0, 12)}`;
    },
  };
}

async function main(): Promise<void> {
  const t0 = Date.now();
  const run = generation();
  if (process.argv.includes('--stage-only')) {
    const recovery = recoverOgPublication(root);
    const stagingRoot = join(root, OG_STAGING_DIR, 'stage');
    const trees = activeTrees(root);
    mkdirSync(stagingRoot, { recursive: true });
    await run.stage(stagingRoot, trees);
    await run.validate(stagingRoot, trees);
    console.log(
      `generate-og-cards: STAGED (${run.summary()} validated in ${OG_STAGING_DIR}/stage; recovery ${recovery}; nothing published)`,
    );
    return;
  }

  const { recovery, journal } = await publishOgCorpus({
    root,
    stage: run.stage,
    validate: run.validate,
  });
  writeFileSync(
    join(root, OG_CARD_JOURNAL_PATH),
    `${JSON.stringify(publicationRecord(journal), null, 2)}\n`,
  );
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `generate-og-cards: OK (${run.summary()}; ${journal.trees.map(({ path }) => path).join(', ')} swapped; recovery ${recovery}; ${seconds}s)`,
  );
}

// If invoked with --check-only, build the corpus without rendering, which
// exercises registry lookup and frontmatter fact parsing for every card.
if (process.argv.includes('--check-only')) {
  try {
    const corpus = ogCardCorpus(root);
    console.log(`generate-og-cards: OK (${corpus.length} card trees built)`);
  } catch (error) {
    fail(error);
  }
} else {
  await main().catch(fail);
}
