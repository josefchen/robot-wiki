/**
 * The search-facing floor every exported page has to meet, checked on the
 * built HTML, sitemap and llms.txt rather than on the metadata code that
 * produces them, so a regression anywhere in the pipeline fails the build.
 */

export const SEO_RULES = {
  'title-length': 'a sitemap page has one <title> of 1 to 60 characters',
  'description-length': 'a sitemap page has one meta description of 70 to 155 characters',
  'img-alt': 'every <img> has non-empty alt text',
  'json-ld': 'every page carries JSON-LD that parses',
  'sitemap-lastmod': 'every sitemap <url> has a <lastmod>',
  'sitemap-coverage': 'every indexable exported page is in the sitemap',
  'llms-article': 'llms.txt lists every published article',
} as const;

export type SeoRule = keyof typeof SEO_RULES;

export interface SeoViolation {
  route: string;
  rule: SeoRule;
  detail: string;
}

export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 70;
export const DESCRIPTION_MAX = 155;

const length = (text: string) => [...text].length;

/** Whether the page asks search engines not to index it. */
export function isNoindex(document: Document): boolean {
  return [...document.querySelectorAll('meta[name="robots"]')].some((meta) =>
    /\bnoindex\b/i.test(meta.getAttribute('content') ?? ''),
  );
}

/** Title and description rules, which bind the pages the sitemap lists. */
export function inspectSearchSnippet(document: Document, route: string): SeoViolation[] {
  const violations: SeoViolation[] = [];
  const titles = [...document.querySelectorAll('head title')].map((title) => title.textContent ?? '');
  const title = titles[0] ?? '';
  if (titles.length !== 1 || length(title) < 1 || length(title) > TITLE_MAX) {
    violations.push({
      route,
      rule: 'title-length',
      detail: `${titles.length} title(s); "${title}" has ${length(title)} characters, limit ${TITLE_MAX}`,
    });
  }
  const descriptions = [...document.querySelectorAll('meta[name="description"]')].map(
    (meta) => meta.getAttribute('content') ?? '',
  );
  const description = descriptions[0] ?? '';
  const size = length(description);
  if (descriptions.length !== 1 || size < DESCRIPTION_MIN || size > DESCRIPTION_MAX) {
    violations.push({
      route,
      rule: 'description-length',
      detail: `${descriptions.length} description(s); "${description}" has ${size} characters, range ${DESCRIPTION_MIN} to ${DESCRIPTION_MAX}`,
    });
  }
  return violations;
}

/** Alt text and JSON-LD rules, which bind every exported page. */
export function inspectPageMarkup(document: Document, route: string): SeoViolation[] {
  const violations: SeoViolation[] = [];
  for (const img of document.querySelectorAll('img')) {
    if ((img.getAttribute('alt') ?? '').trim()) continue;
    violations.push({
      route,
      rule: 'img-alt',
      detail: `<img src="${img.getAttribute('src') ?? ''}"> has ${img.hasAttribute('alt') ? 'empty' : 'no'} alt text`,
    });
  }
  const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
  const parsed = blocks.filter((block) => {
    try {
      const value = JSON.parse(block.textContent ?? '') as unknown;
      return typeof value === 'object' && value !== null;
    } catch {
      return false;
    }
  });
  if (parsed.length === 0 || parsed.length !== blocks.length) {
    violations.push({
      route,
      rule: 'json-ld',
      detail: `${blocks.length} JSON-LD block(s), ${blocks.length - parsed.length} unparseable`,
    });
  }
  return violations;
}

/** The sitemap's page paths, each with its lastmod when it has one. */
export function sitemapEntries(xml: string): { route: string; lastmod: string | null }[] {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body]) => ({
    route: new URL(/<loc>([^<]+)<\/loc>/.exec(body)?.[1] ?? '/', 'https://invalid.example').pathname,
    lastmod: /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(body)?.[1] ?? null,
  }));
}

export function inspectSitemap(xml: string): SeoViolation[] {
  return sitemapEntries(xml)
    .filter((entry) => !entry.lastmod)
    .map((entry) => ({ route: entry.route, rule: 'sitemap-lastmod', detail: 'the sitemap <url> has no <lastmod>' }));
}

/** Published article paths that llms.txt does not link. */
export function inspectLlmsTxt(text: string | null, siteUrl: string, articlePaths: readonly string[]): SeoViolation[] {
  if (text === null) {
    return [{ route: '/llms.txt', rule: 'llms-article', detail: 'the export has no llms.txt' }];
  }
  const linked = new Set([...text.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]));
  return articlePaths
    .filter((path) => !linked.has(`${siteUrl}${path}`))
    .map((path) => ({ route: path, rule: 'llms-article', detail: 'llms.txt does not list this published article' }));
}

export function formatSeoViolation(violation: SeoViolation): string {
  return `${violation.route} ${violation.rule}: ${violation.detail}`;
}
