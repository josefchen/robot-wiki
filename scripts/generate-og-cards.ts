/**
 * Build-time OG card generation (VAL-DIST-002/003/005).
 *
 * Renders one 1200x630 PNG per published article plus one site-level
 * card, and writes them under out/og/ (and public/og/ so a local dev
 * server serves them too). Runs in postbuild: the static export serves
 * them as plain files, no framework process, no image-optimisation
 * endpoint, no API route (the three shapes VAL-DIST-005 rejects).
 *
 * The card trees and their destinations come from the shared corpus in
 * lib/og-card-corpus.ts, which is also the population the renderer
 * evidence measures. This module must not build a card tree of its own,
 * and cannot transform one either: two parallel constructions of the same
 * corpus made a painted-colour change here invisible to the evidence, and
 * so did a wrapper applied to a corpus tree on its way to the renderer.
 * What it receives is a sealed handle whose element tree is unreachable
 * from here, and lib/og-card-render-boundary.ts is the only module that
 * opens one and paints it.
 *
 * The corpus is derived from the module registry, so publishing a
 * module adds its card with no hand edit. Rendering uses Next's bundled
 * @vercel/og ImageResponse (satori + resvg wasm): no new dependency.
 * Fonts come from the renderer face registry (lib/og-renderer-fonts.ts):
 * the separately vendored static Tektur SemiBold TTF for display text and
 * the vendored static IBM Plex Mono Regular TTF for the data and
 * registration labels. No runtime font request or variable-font renderer
 * support is involved.
 *
 * Byte-distinctness (VAL-DIST-003) holds structurally: since e937d16 the
 * panel artwork is one constant ornament per domain chosen by a literal
 * table (lib/og-card-artwork.ts has no Rng and no hashString), so
 * distinctness rests on each card's TEXT (title, domain, reference count,
 * review year), not on varied geometry. The generator additionally
 * verifies the produced set by hash and fails the build on any collision,
 * so a future edit cannot silently reintroduce a repeated canvas.
 *
 * Reference counts and review years come from the article MDX
 * frontmatter (citations list and lastReviewed) via the same helpers
 * the article template uses.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { ogCardCorpus } from '../lib/og-card-corpus.ts';
import { renderCorpusCard } from '../lib/og-card-render-boundary.ts';

const root = join(import.meta.dirname, '..');
const publicOgDir = join(root, 'public', 'og');
const outOgDir = join(root, 'out', 'og');

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

async function main(): Promise<void> {
  const corpus = ogCardCorpus(root);
  const hashes = new Map<string, string>(); // sha -> path
  const seen = new Map<string, string>(); // path -> sha

  const check = (path: string, buf: Buffer): void => {
    if (buf.length < 5 * 1024) {
      throw new Error(`${path} is only ${buf.length} bytes; minimum card body is 5KB`);
    }
    const digest = sha256(buf);
    const clash = hashes.get(digest);
    if (clash) {
      throw new Error(`byte-identical cards: ${path} and ${clash} share ${digest}`);
    }
    hashes.set(digest, path);
    seen.set(path, digest);
  };

  const emit = (path: string, buf: Buffer): void => {
    const rel = path.replace(/^\/+/, '');
    const publicFile = join(root, 'public', rel);
    const outFile = join(root, 'out', rel);
    mkdirSync(join(publicFile, '..'), { recursive: true });
    writeFileSync(publicFile, buf);
    mkdirSync(join(outFile, '..'), { recursive: true });
    writeFileSync(outFile, buf);
  };

  // Stale-card sweep: cards for unpublished modules must not ship. The
  // whole tree is regenerated from the registry every build, so clear it
  // first (drafts are excluded from the export and from this set).
  rmSync(publicOgDir, { recursive: true, force: true });
  if (outOgDir.startsWith(join(root, 'out'))) {
    rmSync(outOgDir, { recursive: true, force: true });
  }

  const t0 = Date.now();
  let articleCards = 0;
  let siteCards = 0;

  for (const entry of corpus) {
    const { cardId, cardPath } = entry;
    const buf = await renderCorpusCard(entry, root);
    check(cardPath, buf);
    emit(cardPath, buf);
    if (cardId === 'site') siteCards += 1;
    else articleCards += 1;
  }

  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `generate-og-cards: OK (${articleCards} article cards + ${siteCards} site card, ${seen.size} distinct assets, ${seconds}s)`,
  );
}

// If invoked with --check-only, build the corpus without rendering, which
// exercises registry lookup and frontmatter fact parsing for every card.
if (process.argv.includes('--check-only')) {
  try {
    const corpus = ogCardCorpus(root);
    console.log(`generate-og-cards: OK (${corpus.length} card trees built)`);
  } catch (error) {
    console.error(`generate-og-cards: FAILED (${(error as Error).message})`);
    process.exit(1);
  }
} else {
  await main().catch((error: unknown) => {
    console.error(`generate-og-cards: FAILED (${(error as Error).message})`);
    process.exit(1);
  });
}
