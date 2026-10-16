/**
 * Staging and validation for one Open Graph corpus generation.
 *
 * `stageOgCorpus` paints every corpus card and structured-data variant
 * through the render boundary into the staging copy of each published
 * tree. `validateStagedOgCorpus` then decides whether that staged corpus may
 * replace the canonical one, before anything canonical is touched:
 *
 * - the renderer-input manifest (lib/og-card-manifest.ts): sealed matrix,
 *   route ownership, painted strings against their sources, devices,
 *   palette tokens against runtime declarations, font binaries, file
 *   dimensions, sizes and distinctness;
 * - rendered glyph probes for every assigned string;
 * - the decoded pixels of every OG/X card against its painted palette and
 *   registered device anchors;
 * - a second, independent render of every OG/X card, which must reproduce
 *   the staged bytes exactly (VAL-B2-OG-010);
 * - byte equality between the staged copies of each tree pair.
 *
 * The manifest is written into the staged evidence tree only when every
 * check passes, so a published manifest always describes a validated
 * corpus.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { cardPaintedColors } from './og-card-artwork.ts';
import { openSealedCardTree, type OgCardCorpusEntry } from './og-card-corpus.ts';
import { runGlyphProbes } from './og-card-glyph-probes.ts';
import {
  OG_CARD_EVIDENCE_DIR,
  buildOgCardManifest,
  sha256,
  type OgCardManifest,
} from './og-card-manifest.ts';
import { inspectCardPixels } from './og-card-pixels.ts';
import type { OgPublicationTree } from './og-card-publication.ts';
import { treeFiles } from './og-card-publication.ts';
import { renderCorpusCard } from './og-card-render-boundary.ts';
import { ARTICLE_IMAGE_VARIANTS, articleCardPath } from './og-cards.ts';

/** `/og/x.png` → the publication tree that holds it, e.g. `public/og`. */
function treeFor(sitePath: string, prefix: 'public' | 'out'): string {
  return `${prefix}/${sitePath.split('/')[1]}`;
}

export type StagedCorpus = {
  /** Rendered bytes by site-absolute path, e.g. `/og/robot-wiki.png`. */
  files: Map<string, Buffer>;
};

export async function stageOgCorpus(input: {
  root: string;
  stagingRoot: string;
  trees: readonly OgPublicationTree[];
  corpus: readonly OgCardCorpusEntry[];
}): Promise<StagedCorpus> {
  const { root, stagingRoot, trees, corpus } = input;
  const files = new Map<string, Buffer>();
  for (const entry of corpus) {
    files.set(entry.cardPath, await renderCorpusCard(entry, root));
    if (entry.cardId === 'site') continue;
    const [domain, slug] = entry.cardId.split('/');
    for (const variant of ARTICLE_IMAGE_VARIANTS) {
      if (variant.id === 'landscape') continue;
      files.set(
        articleCardPath(domain, slug, variant.id),
        await renderCorpusCard(entry, root, { width: variant.width, height: variant.height }),
      );
    }
  }
  const imageTrees = trees.filter(({ kind }) => kind !== 'evidence');
  for (const tree of trees) mkdirSync(join(stagingRoot, tree.path), { recursive: true });
  for (const [sitePath, bytes] of files) {
    for (const prefix of ['public', 'out'] as const) {
      const tree = treeFor(sitePath, prefix);
      if (!imageTrees.some(({ path }) => path === tree)) continue;
      const file = join(stagingRoot, prefix, sitePath);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, bytes);
    }
  }
  return { files };
}

export type ValidatedCorpus = {
  manifest: OgCardManifest;
  failures: string[];
};

export async function validateStagedOgCorpus(input: {
  root: string;
  stagingRoot: string;
  trees: readonly OgPublicationTree[];
  corpus: readonly OgCardCorpusEntry[];
  staged: StagedCorpus;
}): Promise<ValidatedCorpus> {
  const { root, stagingRoot, trees, corpus, staged } = input;
  const failures: string[] = [];

  // Every staged tree holds exactly its share of the corpus, byte for byte.
  for (const tree of trees.filter(({ kind }) => kind !== 'evidence')) {
    const prefix = tree.path.split('/')[0] as 'public' | 'out';
    const expected = [...staged.files.keys()]
      .filter((sitePath) => treeFor(sitePath, prefix) === tree.path)
      .map((sitePath) => sitePath.split('/').slice(2).join('/'))
      .sort();
    const directory = join(stagingRoot, tree.path);
    const found = treeFiles(directory);
    if (found.join('|') !== expected.join('|')) {
      failures.push(`staged ${tree.path} holds [${found.join(', ')}]; the corpus ships [${expected.join(', ')}]`);
      continue;
    }
    for (const file of found) {
      const sitePath = `/${tree.path.split('/')[1]}/${file}`;
      if (sha256(readFileSync(join(directory, file))) !== sha256(staged.files.get(sitePath) as Buffer)) {
        failures.push(`staged ${tree.path}/${file} is not the rendered ${sitePath}`);
      }
    }
  }

  const probes = await runGlyphProbes({ root, corpus });
  failures.push(...probes.failures);
  const built = buildOgCardManifest({ root, corpus, files: staged.files, glyphProbes: probes.results });
  failures.push(...built.failures);

  for (const card of built.manifest.cards) {
    const entry = corpus.find(({ cardId }) => cardId === card.cardId) as OgCardCorpusEntry;
    const bytes = staged.files.get(card.assetPath);
    if (bytes === undefined) continue;
    const paintedHexes = cardPaintedColors(openSealedCardTree(entry.card)).flatMap(({ hexes }) => hexes);
    const pixels = inspectCardPixels({ png: bytes, kind: card.kind, paintedHexes });
    failures.push(...pixels.failures.map((failure) => `${card.assetPath}: ${failure}`));
    const rerendered = sha256(await renderCorpusCard(entry, root));
    if (rerendered !== card.asset.sha256) {
      failures.push(`${card.assetPath}: a second render from identical inputs hashes to ${rerendered}, not ${card.asset.sha256}`);
    }
    card.pixels = {
      decodedWidth: pixels.width,
      decodedHeight: pixels.height,
      maxPaletteDistance: pixels.maxPaletteDistance,
      offPalettePixels: pixels.offPalettePixels,
      translucentPixels: pixels.translucentPixels,
      anchorsChecked: pixels.anchors.length,
      anchorsFailed: pixels.anchors.filter(({ ok }) => !ok).map(({ anchor }) => anchor),
      inkPixels: pixels.inkPixels,
      secondRenderSha256: rerendered,
    };
  }

  if (failures.length === 0 && trees.some(({ kind }) => kind === 'evidence')) {
    const file = join(stagingRoot, OG_CARD_EVIDENCE_DIR, 'manifest.json');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(built.manifest, null, 2)}\n`);
  }
  return { manifest: built.manifest, failures };
}
