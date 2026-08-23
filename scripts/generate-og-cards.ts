/**
 * Build-time OG card generation (VAL-DIST-002/003/005).
 *
 * Renders one 1200x630 PNG per published article plus one site-level
 * card, and writes them under out/og/ (and public/og/ so a local dev
 * server serves them too). Runs in postbuild: the static export serves
 * them as plain files, no framework process, no image-optimisation
 * endpoint, no API route (the three shapes VAL-DIST-005 rejects).
 *
 * The route set is derived from the module registry, so publishing a
 * module adds its card with no hand edit. Rendering uses Next's bundled
 * @vercel/og ImageResponse (satori + resvg wasm): no new dependency.
 * Fonts: Geist Regular (bundled with @vercel/og) for titles and
 * KaTeX_Typewriter (a dependency we already ship) for the mono labels;
 * text is sanitized to the fonts' coverage by sanitizeCardText.
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
import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { DOMAIN_META, publishedModules } from '../data/modules.ts';
import matter from 'gray-matter';
import {
  OG_CARD_HEIGHT,
  OG_CARD_WIDTH,
  SITE_CARD_PATH,
  articleCardPath,
} from '../lib/og-cards.ts';
import type { CardNode } from '../lib/og-card-artwork.ts';
import {
  articleCardElement,
  siteCardElement,
} from '../lib/og-card-artwork.ts';
import type { ImageResponseOptions } from 'next/dist/compiled/@vercel/og/index.node.js';

const root = join(import.meta.dirname, '..');
const publicOgDir = join(root, 'public', 'og');
const outOgDir = join(root, 'out', 'og');

/** Article frontmatter facts the card carries (registry + MDX, no new data). */
export interface ArticleCardFacts {
  referenceCount: number;
  reviewYear: number;
}


/** Extracts the citations count and lastReviewed year from MDX frontmatter. */
export function articleCardFacts(mdxSource: string): ArticleCardFacts {
  const fm = matter(mdxSource).data as Record<string, unknown>;
  const citations = Array.isArray(fm.citations) ? fm.citations.length : 0;
  const lastReviewed = typeof fm.lastReviewed === 'string' ? fm.lastReviewed : '';
  const year = Number.parseInt(lastReviewed.slice(0, 4), 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`invalid lastReviewed: ${lastReviewed}`);
  }
  if (citations < 1) {
    throw new Error('published article cites nothing; refusing to render an empty count');
  }
  return { referenceCount: citations, reviewYear: year };
}

const FONT_PATHS = {
  sans: join(root, 'node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf'),
  mono: join(root, 'node_modules/katex/dist/fonts/KaTeX_Typewriter-Regular.ttf'),
};

// ImageResponse's bundled typings expect a ReactElement; the node build
// accepts the same plain satori element trees our CardNode type
// describes. Cast at the boundary rather than loosening CardNode.
async function render(node: CardNode): Promise<Buffer> {
  const fonts = [
    { name: 'Geist', data: readFileSync(FONT_PATHS.sans), weight: 400, style: 'normal' },
    {
      name: 'KaTeX_Typewriter',
      data: readFileSync(FONT_PATHS.mono),
      weight: 400,
      style: 'normal',
    },
  ] satisfies NonNullable<ImageResponseOptions['fonts']>;
  const response = new ImageResponse(node as never, {
    width: OG_CARD_WIDTH,
    height: OG_CARD_HEIGHT,
    fonts,
  });
  return Buffer.from(await response.arrayBuffer());
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

async function main(): Promise<void> {
  const published = publishedModules();
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
  let count = 0;

  for (const entry of published) {
    const mdx = readFileSync(
      join(root, 'content', entry.domain, `${entry.slug}.mdx`),
      'utf8',
    );
    const facts = articleCardFacts(mdx);
    const node = articleCardElement({
      entry,
      domainName: DOMAIN_META[entry.domain].name,
      ...facts,
    });
    const buf = await render(node);
    check(articleCardPath(entry.domain, entry.slug), buf);
    emit(articleCardPath(entry.domain, entry.slug), buf);
    count += 1;
  }

  const siteBuf = await render(siteCardElement());
  check(SITE_CARD_PATH, siteBuf);
  emit(SITE_CARD_PATH, siteBuf);

  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `generate-og-cards: OK (${count} article cards + 1 site card, ${seen.size} distinct assets, ${seconds}s)`,
  );
}

// If invoked with --check, only validate facts parsing (unit-test hook).
if (process.argv.includes('--check-only')) {
  let failures = 0;
  for (const entry of publishedModules()) {
    try {
      const mdx = readFileSync(
        join(root, 'content', entry.domain, `${entry.slug}.mdx`),
        'utf8',
      );
      articleCardFacts(mdx);
    } catch (error) {
      failures += 1;
      console.error(`${entry.domain}/${entry.slug}: ${(error as Error).message}`);
    }
  }
  if (failures > 0) process.exit(1);
} else {
  await main().catch((error: unknown) => {
    console.error(`generate-og-cards: FAILED (${(error as Error).message})`);
    process.exit(1);
  });
}
