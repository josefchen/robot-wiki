import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import {
  inspectPageLinks,
  internalPathname,
  resolveExportPath,
} from '@/lib/internal-link-check';
import {
  inspectLlmsTxt,
  inspectPageMarkup,
  inspectSearchSnippet,
  inspectSitemap,
  isNoindex,
  type SeoRule,
} from '@/lib/seo-check';

const SITE = 'https://robot-wiki.com';
const TITLE = 'Kalman Filter for Robot State Estimation | Robot Wiki';
const DESCRIPTION =
  'A Kalman filter fuses a motion model with noisy sensor readings to estimate a robot state, and its covariance says how far to trust it.';
const page = ({
  title = TITLE,
  description = DESCRIPTION as string | null,
  body = '<img src="/a.png" alt="A diagram">',
  jsonLd = '{"@context":"https://schema.org","@type":"Article"}' as string | null,
} = {}) =>
  new JSDOM(
    `<!doctype html><html><head><title>${title}</title>` +
      (description === null ? '' : `<meta name="description" content="${description}">`) +
      (jsonLd === null ? '' : `<script type="application/ld+json">${jsonLd}</script>`) +
      `</head><body><main>${body}</main></body></html>`,
  ).window.document;
const rules = (violations: { rule: SeoRule }[]) => violations.map((v) => v.rule);

describe('SEO check', () => {
  it('passes a page that meets every rule', () => {
    expect(inspectSearchSnippet(page(), '/x/')).toEqual([]);
    expect(inspectPageMarkup(page(), '/x/')).toEqual([]);
  });

  it('fails a title over 60 characters and a missing title', () => {
    expect(rules(inspectSearchSnippet(page({ title: `${'T'.repeat(48)} | Robot Wiki` }), '/x/'))).toEqual(['title-length']);
    expect(rules(inspectSearchSnippet(page({ title: `${'T'.repeat(47)} | Robot Wiki` }), '/x/'))).toEqual([]);
    expect(rules(inspectSearchSnippet(page({ title: '' }), '/x/'))).toEqual(['title-length']);
  });

  it('fails a description outside 70 to 155 characters, or none', () => {
    for (const size of [69, 156]) {
      expect(rules(inspectSearchSnippet(page({ description: 'd'.repeat(size) }), '/x/')), String(size)).toEqual(['description-length']);
    }
    for (const size of [70, 155]) {
      expect(rules(inspectSearchSnippet(page({ description: 'd'.repeat(size) }), '/x/')), String(size)).toEqual([]);
    }
    expect(rules(inspectSearchSnippet(page({ description: null }), '/x/'))).toEqual(['description-length']);
  });

  it('fails an image without alt text, empty alt included', () => {
    expect(rules(inspectPageMarkup(page({ body: '<img src="/a.png">' }), '/x/'))).toEqual(['img-alt']);
    expect(rules(inspectPageMarkup(page({ body: '<img src="/a.png" alt=" ">' }), '/x/'))).toEqual(['img-alt']);
  });

  it('fails a page without JSON-LD or with JSON-LD that does not parse', () => {
    expect(rules(inspectPageMarkup(page({ jsonLd: null }), '/x/'))).toEqual(['json-ld']);
    expect(rules(inspectPageMarkup(page({ jsonLd: '{"@type":' }), '/x/'))).toEqual(['json-ld']);
  });

  it('fails a sitemap URL without lastmod', () => {
    const xml = (lastmod: string) =>
      `<urlset><url><loc>${SITE}/</loc><lastmod>2026-10-01</lastmod></url><url><loc>${SITE}/a/</loc>${lastmod}</url></urlset>`;
    expect(inspectSitemap(xml('<lastmod>2026-09-01</lastmod>'))).toEqual([]);
    expect(inspectSitemap(xml(''))).toEqual([expect.objectContaining({ route: '/a/', rule: 'sitemap-lastmod' })]);
  });

  it('fails an llms.txt that misses a published article, or no llms.txt', () => {
    const text = `- [A](${SITE}/classical/a/): A.\n- [B](${SITE}/classical/b/): B.\n`;
    expect(inspectLlmsTxt(text, SITE, ['/classical/a/', '/classical/b/'])).toEqual([]);
    expect(inspectLlmsTxt(text, SITE, ['/classical/a/', '/classical/c/']).map((v) => v.route)).toEqual(['/classical/c/']);
    expect(rules(inspectLlmsTxt(null, SITE, ['/classical/a/']))).toEqual(['llms-article']);
  });

  it('reads noindex from the robots meta', () => {
    expect(isNoindex(new JSDOM('<meta name="robots" content="noindex, follow">').window.document)).toBe(true);
    expect(isNoindex(page())).toBe(false);
  });
});

describe('internal-link check', () => {
  const files = new Set(['/index.html', '/classical/kinematics/index.html', '/feed.xml', '/images/a.png']);
  const exists = (file: string) => files.has(file);

  it('treats site-relative and canonical-origin links as internal, and nothing else', () => {
    expect(internalPathname('/classical/kinematics/?q=1#x', SITE)).toBe('/classical/kinematics/');
    expect(internalPathname(`${SITE}/feed.xml`, SITE)).toBe('/feed.xml');
    for (const href of ['#top', 'https://arxiv.org/abs/1', 'mailto:a@b.c', '//cdn.example/x']) {
      expect(internalPathname(href, SITE), href).toBeNull();
    }
  });

  it('resolves pages and files the way the trailing-slash host serves them', () => {
    expect(resolveExportPath('/', exists)).toEqual({ status: 200 });
    expect(resolveExportPath('/classical/kinematics/', exists)).toEqual({ status: 200 });
    expect(resolveExportPath('/classical/kinematics', exists)).toEqual({ status: 308, location: '/classical/kinematics/' });
    expect(resolveExportPath('/feed.xml', exists)).toEqual({ status: 200 });
    expect(resolveExportPath('/feed.xml/', exists)).toEqual({ status: 308, location: '/feed.xml' });
    expect(resolveExportPath('/classical/missing/', exists)).toEqual({ status: 404 });
  });

  it('fails a planted link without its trailing slash', () => {
    const hrefs = ['/classical/kinematics/', '/images/a.png', 'https://example.com/x'];
    expect(inspectPageLinks('/p/', hrefs, SITE, exists)).toEqual([]);
    expect(inspectPageLinks('/p/', [...hrefs, '/classical/kinematics'], SITE, exists)).toEqual([
      { page: '/p/', href: '/classical/kinematics', status: 308, location: '/classical/kinematics/' },
    ]);
  });
});

describe('build wiring', () => {
  it('runs both checks in the gated and the production build, after the export and llms.txt exist', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['check:seo']).toBe('node scripts/check-seo.ts');
    expect(pkg.scripts['check:internal-links']).toBe('node scripts/check-internal-links.ts');
    for (const hook of ['postbuild', 'vercel-build']) {
      const command = pkg.scripts[hook];
      for (const check of ['check:seo', 'check:internal-links']) {
        expect(command, hook).toContain(`&& npm run ${check} &&`);
        expect(command.indexOf(check), hook).toBeGreaterThan(command.lastIndexOf('next build'));
        expect(command.indexOf(check), hook).toBeGreaterThan(command.indexOf('patch-404-guard'));
      }
    }
  });
});
