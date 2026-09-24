import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ogCardCorpus, type OgCardCorpusEntry } from './og-card-corpus.ts';
import { renderCorpusCard } from './og-card-render-boundary.ts';
import { ARTICLE_IMAGE_VARIANTS, articleCardPath } from './og-cards.ts';
import { isSyncConflictDuplicate } from './sync-duplicates.ts';

/**
 * Whether the cards on disk are the bytes the render boundary produces.
 *
 * The structural half of this guarantee lives in
 * `lib/og-render-boundary-invariant.ts`: the corpus hands out sealed trees,
 * one module may obtain an image renderer, and that module renders the
 * opened tree unwrapped. What the structural half cannot see is the last
 * write. It used to be approximated by following the generator's own
 * `writeFileSync` arguments through its tokens, which established that
 * *those* writes shipped the boundary's return value and nothing about
 * whether they were the final ones: a reachable helper could perform the
 * canonical render, let the checked writes happen, and then overwrite the
 * same files with arbitrary bytes.
 *
 * No source-level reading closes that, because the number of ways to reach a
 * file is open-ended — a re-exported writer, a destructured dynamic import,
 * a stream. So the question is asked of the artefact instead: every card in
 * the corpus is re-rendered through the boundary here, and the shipped file
 * at each official destination has to be exactly those bytes. Whichever
 * module wrote last, and through whichever API, the bytes have to agree.
 *
 * The card directory is also reconciled exactly against the corpus, so an
 * extra file cannot ship alongside the 48 that are accounted for.
 */
export const OG_CARD_OUTPUT_ROOTS = ['public', 'out'] as const;

/**
 * The destination whose cards are committed. `out/` is the export tree and
 * is git-ignored, so it exists only after a build; the tracked copy can be
 * verified at any time, including on a clean checkout.
 */
export const OG_CARD_TRACKED_OUTPUT_ROOT = 'public';

export type ShippedCardBytes = {
  cardId: string;
  cardPath: string;
  /** sha256 of the bytes the render boundary produced for this card. */
  sha256: string;
  /** Destination files whose bytes are exactly that render. */
  destinations: string[];
};

export type ShippedCardBytesVerification = {
  cards: ShippedCardBytes[];
  /** The card directory reconciled under each destination root. */
  directories: string[];
  /** Destination files compared, across every root. */
  files: number;
};

function digest(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Every file under `directory`, as paths relative to it, sorted. */
function filesUnder(directory: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const name of readdirSync(directory).sort()) {
    // A sync tool's " 2" duplicate is machine-local, so it is neither a
    // shipped card nor an unaccounted extra.
    if (isSyncConflictDuplicate(name)) continue;
    const path = join(directory, name);
    const relativePath = prefix === '' ? name : `${prefix}/${name}`;
    if (statSync(path).isDirectory()) {
      found.push(...filesUnder(path, relativePath));
    } else {
      found.push(relativePath);
    }
  }
  return found.sort();
}

export async function verifyShippedCardBytes(input: {
  root: string;
  /**
   * Destination roots holding the card directory, each resolved against
   * `root` unless it is already absolute.
   */
  destinationRoots: readonly string[];
}): Promise<ShippedCardBytesVerification> {
  const { root } = input;
  if (input.destinationRoots.length === 0) {
    throw new Error(
      'No Open Graph card destination was given, so no shipped byte was compared',
    );
  }
  const corpus = ogCardCorpus(root);
  if (corpus.length === 0) {
    throw new Error('The Open Graph corpus is empty');
  }
  // The rendered population the shipped tree must match: each corpus card
  // at its landscape path, plus the two registered structured-data
  // variants (4:3, square) every article card emits for JSON-LD and the
  // sitemap's image entries.
  const expectedFiles = new Map<
    string,
    { entry: OgCardCorpusEntry; width?: number; height?: number }
  >();
  for (const entry of corpus) {
    expectedFiles.set(entry.cardPath.replace(/^\/+/, ''), { entry });
    if (entry.cardId === 'site') continue;
    const [domain, slug] = entry.cardId.split('/');
    for (const variant of ARTICLE_IMAGE_VARIANTS) {
      if (variant.id === 'landscape') continue;
      expectedFiles.set(
        articleCardPath(domain, slug, variant.id).replace(/^\/+/, ''),
        { entry, width: variant.width, height: variant.height },
      );
    }
  }
  const directories = new Set(
    [...expectedFiles.keys()].map((path) => path.split('/')[0]),
  );

  const reconciled: string[] = [];
  for (const destinationRoot of input.destinationRoots) {
    for (const cardDirectory of [...directories].sort()) {
      const directory = join(resolve(root, destinationRoot), cardDirectory);
      if (!existsSync(directory)) {
        throw new Error(
          `${directory} does not exist, so the shipped cards cannot be compared with the render boundary's output`,
        );
      }
      const shipped = filesUnder(directory);
      const expected = [...expectedFiles.keys()]
        .filter((path) => path.startsWith(`${cardDirectory}/`))
        .map((path) => path.slice(`${cardDirectory}/`.length))
        .sort();
      if (shipped.join('|') !== expected.join('|')) {
        throw new Error(
          `${directory} holds ${shipped.length} file(s) [${shipped.join(', ')}]; the corpus ships ${expected.length} [${expected.join(', ')}]`,
        );
      }
      reconciled.push(directory);
    }
  }

  const cards: ShippedCardBytes[] = [];
  let files = 0;
  for (const [relPath, { entry, width, height }] of expectedFiles) {
    const rendered = await renderCorpusCard(
      entry,
      root,
      width === undefined ? undefined : { width, height: height as number },
    );
    const expected = digest(rendered);
    const destinations: string[] = [];
    for (const destinationRoot of input.destinationRoots) {
      const file = join(resolve(root, destinationRoot), relPath);
      const actual = digest(readFileSync(file));
      if (actual !== expected) {
        throw new Error(
          `${file} holds bytes hashing to ${actual}; the render boundary produces ${expected} for card ${entry.cardId}, so the shipped card is not what was painted`,
        );
      }
      destinations.push(file);
      files += 1;
    }
    cards.push({
      cardId: relPath,
      cardPath: `/${relPath}`,
      sha256: expected,
      destinations,
    });
  }
  return { cards, directories: reconciled, files };
}
