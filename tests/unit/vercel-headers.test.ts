import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { articleStructuredImagePaths, SITE_CARD_PATH } from '@/lib/og-cards';

/**
 * Live robot-wiki.com serves public JPEGs and OG cards with
 * `Cache-Control: public, max-age=0, must-revalidate` (Vercel's default for
 * Next `public/` files). That forces a revalidation on every page load.
 * `headers()` in next.config is unsupported with `output: 'export'`, so the
 * year-long Cache-Control for `/images/*`, `/og/*`, `/structured-images/*`,
 * `/_next/static/*`, and font files has to live in vercel.json. HTML must
 * keep must-revalidate so a deploy is visible immediately.
 */

interface VercelHeaderRule {
  source: string;
  has?: Array<{ type: string; value: string }>;
  headers: Array<{ key: string; value: string }>;
}

interface VercelConfig {
  headers?: VercelHeaderRule[];
  builds?: unknown;
  functions?: unknown;
  framework?: unknown;
  outputDirectory?: unknown;
  buildCommand?: unknown;
  trailingSlash?: unknown;
}

const YEAR = 31536000;
const LONG_CACHE = `public, max-age=${YEAR}, immutable`;

const readJson = (rel: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), rel), 'utf8'));

const vercel = readJson('vercel.json') as VercelConfig;
const nextConfigSource = readFileSync(
  join(process.cwd(), 'next.config.ts'),
  'utf8',
);

function cacheControlForSource(source: string): string | undefined {
  const rule = vercel.headers?.find((entry) => entry.source === source);
  return rule?.headers.find((header) => header.key === 'Cache-Control')?.value;
}

describe('vercel.json deploys the finished static export', () => {
  // Under Vercel's Next.js preset the deployment omitted everything postbuild
  // adds to out/: /pagefind/ (article search 404ed live), the 404 guard, and the
  // pruned /_not-found/. Serving out/ as plain static output ships it intact.
  it('serves out/ from vercel-build as static output, not through the Next preset', () => {
    expect(vercel.framework).toBeNull();
    expect(vercel.buildCommand).toBe('npm run vercel-build');
    expect(vercel.outputDirectory).toBe('out');
    expect(vercel.trailingSlash).toBe(true);
    expect(nextConfigSource).toMatch(/trailingSlash:\s*true/);
    expect(vercel.builds).toBeUndefined();
    expect(vercel.functions).toBeUndefined();
  });

  it('sends baseline security headers on every response', () => {
    const rule = vercel.headers?.find((entry) => entry.source === '/(.*)' && !entry.has);
    const header = (key: string) => rule?.headers.find((h) => h.key === key)?.value;
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(header('X-Frame-Options')).toBe('DENY');
    expect(header('Permissions-Policy')).toMatch(/camera=\(\)/);
  });

  it('keeps *.vercel.app aliases out of search indexes', () => {
    const rule = vercel.headers?.find((entry) =>
      entry.has?.some((c) => c.type === 'host' && c.value.includes('vercel\\.app')),
    );
    expect(rule?.headers).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex' });
  });
});

describe('vercel.json static-asset cache headers', () => {

  it('gives /images, /og, /structured-images, hashed Next assets, and fonts a year-long cache', () => {
    for (const source of [
      '/images/:path*',
      '/og/:path*',
      '/structured-images/:path*',
      '/_next/static/:path*',
      '/:path*.woff2',
      '/:path*.woff',
      '/:path*.ttf',
      '/:path*.otf',
    ]) {
      expect(cacheControlForSource(source), source).toBe(LONG_CACHE);
    }
  });

  it('long-caches every image directory the SEO layer publishes', () => {
    // Article JSON-LD `image` and the image sitemap list one OG/X card plus
    // the 4:3 and square structured-data variants per published article.
    // Derive the top-level directories from those paths so a future move of
    // a variant cannot silently fall back to Vercel's must-revalidate default.
    const imagePaths = [
      SITE_CARD_PATH,
      ...publishedModules().flatMap((m) =>
        articleStructuredImagePaths(m.domain, m.slug),
      ),
    ];
    const directories = new Set(
      imagePaths.map((path) => `/${path.split('/')[1]}/:path*`),
    );
    expect(directories.size).toBeGreaterThanOrEqual(2);
    for (const source of directories) {
      expect(cacheControlForSource(source), source).toBe(LONG_CACHE);
    }
  });

  it('does not long-cache HTML (deploys must remain visible immediately)', () => {
    const htmlLike = [/\/$/, /html/i, /^\/:path\*$/, /^\/\(\.\*\)$/];
    for (const rule of vercel.headers ?? []) {
      const cache = rule.headers.find((h) => h.key === 'Cache-Control')?.value;
      if (!cache || !/max-age=(\d+)/.test(cache)) continue;
      const maxAge = Number(/max-age=(\d+)/.exec(cache)?.[1] ?? 0);
      if (maxAge < YEAR) continue;
      expect(
        htmlLike.some((pattern) => pattern.test(rule.source)),
        `${rule.source} must not long-cache HTML`,
      ).toBe(false);
    }
  });
});

describe('static export stays the image host', () => {
  it('keeps output: export and unoptimized images (no remote loader)', () => {
    expect(nextConfigSource).toMatch(/output:\s*'export'/);
    expect(nextConfigSource).toMatch(/images:\s*\{\s*unoptimized:\s*true\s*\}/);
    expect(nextConfigSource).not.toMatch(/remotePatterns/);
    expect(nextConfigSource).not.toMatch(/loaderFile/);
    expect(nextConfigSource).not.toMatch(/r2\.cloudflarestorage|githubusercontent\.com/);
  });
});
