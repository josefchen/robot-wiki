/**
 * Runs the SEO check over the static export: titles and descriptions on
 * every Sitemap URL; alt text and JSON-LD on every exported page; a lastmod
 * on every sitemap URL; every indexable page in the sitemap; and every
 * published article in llms.txt.
 *
 *   node scripts/check-seo.ts [--root out]
 *
 * Exits 1 on any violation, naming the page and the rule.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { JSDOM } from 'jsdom';
import { publishedModules } from '../data/modules.ts';
import {
  formatSeoViolation,
  inspectLlmsTxt,
  inspectPageMarkup,
  inspectSearchSnippet,
  inspectSitemap,
  isNoindex,
  sitemapEntries,
  type SeoViolation,
} from '../lib/seo-check.ts';
import { SITE_URL } from '../lib/site.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--root');
const root = at >= 0 && args[at + 1] ? args[at + 1] : 'out';

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_next' ? [] : htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

function pageRoute(file: string): string {
  const path = `/${relative(root, file).split(sep).join('/')}`;
  return path.endsWith('/index.html') ? path.slice(0, -'index.html'.length) : path;
}

const sitemapPath = join(root, 'sitemap.xml');
if (!existsSync(sitemapPath)) {
  console.error(`seo: no sitemap at ${sitemapPath}; build the export first`);
  process.exit(1);
}
const sitemap = readFileSync(sitemapPath, 'utf8');
const listed = new Set(sitemapEntries(sitemap).map((entry) => entry.route));
const violations: SeoViolation[] = [...inspectSitemap(sitemap)];

const pages = new Map(htmlFiles(root).map((file) => [pageRoute(file), file]));
for (const route of listed) {
  if (!pages.has(route)) {
    violations.push({ route, rule: 'sitemap-coverage', detail: 'the sitemap lists a page the export does not have' });
  }
}
for (const [route, file] of [...pages].sort(([a], [b]) => a.localeCompare(b))) {
  const document = new JSDOM(readFileSync(file, 'utf8')).window.document;
  violations.push(...inspectPageMarkup(document, route));
  if (listed.has(route)) violations.push(...inspectSearchSnippet(document, route));
  else if (!isNoindex(document)) {
    violations.push({ route, rule: 'sitemap-coverage', detail: 'an indexable page is missing from the sitemap' });
  }
}

const llmsPath = join(root, 'llms.txt');
violations.push(
  ...inspectLlmsTxt(
    existsSync(llmsPath) ? readFileSync(llmsPath, 'utf8') : null,
    SITE_URL,
    publishedModules().map((entry) => `/${entry.domain}/${entry.slug}/`),
  ),
);

for (const violation of violations) console.error(`seo: ${formatSeoViolation(violation)}`);
console.log(
  `seo: ${violations.length ? 'FAIL' : 'ok'}; ${violations.length} violation(s) over ${pages.size} pages, ` +
    `${listed.size} sitemap URLs, ${publishedModules().length} published articles`,
);
process.exit(violations.length ? 1 : 0);
