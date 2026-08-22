import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { modules, publishedModules } from '../../data/modules';
import { SITE_URL } from '../../lib/site';
import { startStaticExportServer } from './static-export-server';

/**
 * OG card images (VAL-DIST-002, VAL-DIST-003, VAL-DIST-005): every card
 * is a real PNG inside the static export, served with no framework
 * process; article cards are per-article (one distinct URL and one
 * byte-distinct asset each, none equal to the site card); every card is
 * 1200x630 or larger with the 1.91:1 aspect and a body of at least 5KB.
 *
 * Population derivation: the article route set walks the module
 * registry (publishedModules), never a hardcoded list, so a newly
 * published module lands inside the measured set. The non-article
 * destinations are the contract's published route set minus the
 * articles. Card-image URLs are read from the exported HTML (the
 * crawler view), and the assets are then requested from a bare static
 * file server over out/ with no framework process running.
 */

const NON_ARTICLE_ROUTES = [
  '/',
  '/a-z/',
  '/market-map/',
  '/playground/',
  '/glossary/',
  '/credits/',
  '/search/',
  ...DOMAIN_META_KEYS(),
] as const;

function DOMAIN_META_KEYS(): string[] {
  // The seven domain landing routes, derived from the same registry the
  // sitemap uses.
  return Array.from(new Set(publishedModules().map((m) => `/${m.domain}/`)));
}

function routeToHtmlPath(route: string): string {
  const clean = route.replace(/^\//, '').replace(/\/$/, '');
  return clean === '' ? 'out/index.html' : `out/${clean}/index.html`;
}

interface CardMeta {
  url: string;
  width: string | null;
  height: string | null;
  alt: string | null;
}

function extractCardMeta(html: string): CardMeta | null {
  const image = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"[^>]*>/);
  if (!image) return null;
  const pick = (prop: string) =>
    html.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]+)"`))?.[1] ?? null;
  return {
    url: image[1],
    width: pick('og:image:width'),
    height: pick('og:image:height'),
    alt: pick('og:image:alt'),
  };
}

/** Decodes PNG IHDR dimensions without an image library. */
function pngDimensions(buf: Buffer): { width: number; height: number } {
  // PNG signature (8) + IHDR length/type (8); width and height are the
  // first two big-endian u32 of the IHDR chunk.
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test.describe('OG card images', () => {
  test('every published route declares a large-image card pointing at a real exported asset (VAL-DIST-002, VAL-DIST-005)', async () => {
    const routes = [
      ...publishedModules().map((m) => `/${m.domain}/${m.slug}/`),
      ...NON_ARTICLE_ROUTES,
    ];
    // 7 non-article standalone routes + 7 domain landings = 14.
    expect(routes.length).toBe(publishedModules().length + 14);

    const server = await startStaticExportServer('out');
    try {
      for (const route of routes) {
        const htmlPath = routeToHtmlPath(route);
        expect(existsSync(htmlPath), `${htmlPath} exists`).toBe(true);
        const html = (await readFile(htmlPath)).toString('utf8');

        // Exactly one twitter:card, value summary_large_image (VAL-DIST-001
        // groundwork; the exhaustive per-route tag audit belongs to the
        // metadata feature, this proves the images resolve).
        const cards = html.match(/name="twitter:card"[^>]*content="([^"]+)"|content="([^"]+)"[^>]*name="twitter:card"/g) ?? [];
        expect(cards.length, `${route} twitter:card count`).toBe(1);
        expect(cards[0]).toContain('summary_large_image');

        const meta = extractCardMeta(html);
        expect(meta, `${route} has og:image`).not.toBeNull();
        expect(meta!.url.startsWith('https://robot-wiki.com/'), `${route} absolute apex URL`).toBe(true);
        expect(meta!.url.includes('/_next/image') || meta!.url.includes('/api/'), 'no optimisation or API route').toBe(false);
        expect(meta!.alt && meta!.alt.length >= 15, `${route} alt length`).toBe(true);
        expect(meta!.alt).not.toMatch(/[\u2010-\u2015]/);
        expect(meta!.width).toBe('1200');
        expect(meta!.height).toBe('630');

        // The URL's path maps to a real file under out/.
        const rel = new URL(meta!.url).pathname;
        const file = join('out', rel);
        expect(existsSync(file), `${file} exists in export`).toBe(true);
        const buf = await readFile(file);
        expect(buf.length, `${route} card at least 5KB`).toBeGreaterThanOrEqual(5 * 1024);
        const dims = pngDimensions(buf);
        expect(dims.width).toBeGreaterThanOrEqual(1200);
        expect(dims.height).toBeGreaterThanOrEqual(630);
        expect(Math.abs(dims.width / dims.height - 1.91)).toBeLessThanOrEqual(0.05);

        // Served from out/ alone, with an image content type.
        const res = await fetch(`http://localhost:${server.port}${rel}`);
        expect(res.status, `${route} card serves 200`).toBe(200);
        expect(res.headers.get('content-type')).toContain('image/png');
        const body = Buffer.from(await res.arrayBuffer());
        expect(body.length).toBe(buf.length);
      }
    } finally {
      await server.stop();
    }
  });

  test('article cards are per-article: one distinct URL and one byte-distinct asset each, none equal to the site card (VAL-DIST-003)', async () => {
    const articles = publishedModules();
    expect(articles.length).toBe(47);

    const urlToSlug = new Map<string, string>();
    const hashes = new Map<string, string>(); // sha -> owning path
    const articleHashes = new Set<string>();

    for (const m of articles) {
      const html = (
        await readFile(routeToHtmlPath(`/${m.domain}/${m.slug}/`))
      ).toString('utf8');
      const meta = extractCardMeta(html)!;
      // Distinct URL, and the slug rides in the path.
      expect(urlToSlug.has(meta.url), `unique URL for ${m.slug}`).toBe(false);
      urlToSlug.set(meta.url, m.slug);
      expect(meta.url).toContain(m.slug);

      const rel = new URL(meta.url).pathname;
      const buf = await readFile(join('out', rel));
      const sha = createHash('sha256').update(buf).digest('hex');
      expect(hashes.has(sha), `byte-distinct asset for ${m.slug}`).toBe(false);
      hashes.set(sha, rel);
      articleHashes.add(sha);
    }
    expect(urlToSlug.size).toBe(articles.length);
    expect(articleHashes.size).toBe(articles.length);

    // Every non-article destination uses the site card, whose asset is
    // byte-distinct from all the article cards.
    const siteHtml = (await readFile(routeToHtmlPath('/'))).toString('utf8');
    const siteMeta = extractCardMeta(siteHtml)!;
    const siteBuf = await readFile(join('out', new URL(siteMeta.url).pathname));
    const siteSha = createHash('sha256').update(siteBuf).digest('hex');
    expect(articleHashes.has(siteSha), 'site card distinct from article cards').toBe(false);
    for (const route of NON_ARTICLE_ROUTES) {
      const html = (await readFile(routeToHtmlPath(route))).toString('utf8');
      expect(extractCardMeta(html)!.url, `${route} uses the site card`).toBe(siteMeta.url);
    }
  });

  test('the card set is derived from the registry: every published slug has a card file, and no draft does', async () => {
    for (const m of modules) {
      const path = join('out', 'og', m.domain, `${m.slug}.png`);
      if (m.status === 'published') {
        expect(existsSync(path), `${m.slug} card exists`).toBe(true);
      } else {
        expect(existsSync(path), `${m.slug} (draft) has no card`).toBe(false);
      }
    }
    void SITE_URL;
  });
});
