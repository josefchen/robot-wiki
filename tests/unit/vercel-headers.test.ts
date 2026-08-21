import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Live robot-wiki.com serves public JPEGs and OG cards with
 * `Cache-Control: public, max-age=0, must-revalidate` (Vercel's default for
 * Next `public/` files). That forces a revalidation on every page load.
 * `headers()` in next.config is unsupported with `output: 'export'`, so the
 * year-long Cache-Control for `/images/*`, `/og/*`, `/_next/static/*`, and
 * font files has to live in vercel.json. HTML must keep must-revalidate so
 * a deploy is visible immediately.
 */

interface VercelHeaderRule {
  source: string;
  headers: Array<{ key: string; value: string }>;
}

interface VercelConfig {
  headers?: VercelHeaderRule[];
  builds?: unknown;
  functions?: unknown;
  outputDirectory?: unknown;
  buildCommand?: unknown;
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

describe('vercel.json static-asset cache headers', () => {
  it('is headers-only so the Next static export on Vercel stays intact', () => {
    expect(vercel.headers?.length).toBeGreaterThan(0);
    expect(vercel.builds).toBeUndefined();
    expect(vercel.functions).toBeUndefined();
    expect(vercel.outputDirectory).toBeUndefined();
    expect(vercel.buildCommand).toBeUndefined();
  });

  it('gives /images, /og, hashed Next assets, and fonts a year-long cache', () => {
    for (const source of [
      '/images/:path*',
      '/og/:path*',
      '/_next/static/:path*',
      '/:path*.woff2',
      '/:path*.woff',
      '/:path*.ttf',
      '/:path*.otf',
    ]) {
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
