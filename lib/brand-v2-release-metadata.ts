import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { JSDOM } from 'jsdom';
import { DOMAINS, DOMAIN_META, publishedModules } from '../data/modules.ts';
import { COMPANIES } from '../data/companies.ts';
import { glossaryTermsAlphabetical } from '../data/glossary.ts';
import { getCitation } from '../data/citations.ts';
import { APPROVED_TAB_ICONS } from './brand-v2-census.ts';
import { articleDateModified, articleDatePublished } from './content-dates.ts';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from './identity.ts';
import { articleOgImages, siteOgImage } from './og-cards.ts';
import { countWordsInMdxSource, readingTimeMinutes } from './reading-time.ts';
import { inlineCitationIds, resolveReferences } from './references.ts';
import { routeSeoProfile } from './seo-profiles.ts';
import { articleJsonLd, domainCollectionJsonLd, SEO_TITLE_SUFFIX, websiteJsonLd } from './seo.ts';
import { SITE_URL } from './site.ts';
import { glossaryJsonLd, howRobotsWorkJsonLd, marketMapJsonLd, playgroundJsonLd, webPageJsonLd } from './structured-data.ts';

/** Expected exported values are derived from the source owners' data and
 * helpers. They are never copied from an export or a browser observation. */
export type ReleaseMetadata = {
  title: string;
  canonical: string;
  description: string;
  social: Record<string, string[]>;
  jsonLd: unknown[];
  manifest: string[];
  icons: Array<{
    rel: string;
    href: string;
  }>;
  themeColour: string[];
  noindex: boolean;
};
export const NON_INDEXABLE_ROUTES = ['/privacy/', '/search/'] as const;
export const FIXED_PUBLIC_ROUTES = ['/', '/a-z/', '/market-map/', '/playground/', '/how-robots-work/', '/glossary/', '/credits/', '/search/', '/editorial-policy/', '/about/', '/privacy/'] as const;
export function releasePublicRoutes(): string[] {
  return [...FIXED_PUBLIC_ROUTES, ...DOMAINS.map(d => '/' + d + '/'), ...publishedModules().map(m => '/' + m.domain + '/' + m.slug + '/')].sort();
}
const breadcrumbs = (items: Array<{
  name: string;
  route: string;
}>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: SITE_URL + item.route
  }))
});
export function expectedReleaseMetadata(root: string, route: string): ReleaseMetadata {
  const entry = publishedModules().find(m => '/' + m.domain + '/' + m.slug + '/' === route);
  const domain = DOMAINS.find(d => '/' + d + '/' === route);
  if (route !== '/404/' && !releasePublicRoutes().includes(route)) throw new Error('Unknown metadata route: ' + route);
  const profile = route === '/404/' ? {
    title: 'Page not found',
    description: PUBLIC_DESCRIPTOR
  } : routeSeoProfile(route);
  let displayTitle: string;
  if (route === '/') displayTitle = PUBLIC_IDENTITY;else if (entry) displayTitle = entry.title;else if (domain) displayTitle = DOMAIN_META[domain].name;else if (route === '/404/') displayTitle = 'Page not found';else {
    const owner = readFileSync(join(root, 'app', route.slice(1), 'page.tsx'), 'utf8');
    const match = /const title = ['"]([^'"\n]+)['"]/.exec(owner);
    if (!match) throw new Error('No explicit metadata display-title owner: ' + route);
    displayTitle = match[1];
  }
  const canonical = SITE_URL + route;
  const image = entry ? articleOgImages(entry.domain, entry.slug, entry.title)[0] : siteOgImage()[0];
  const social: Record<string, string[]> = {
    'og:title': [displayTitle],
    'og:description': [profile.description],
    'og:url': [canonical],
    'og:site_name': [PUBLIC_IDENTITY],
    'og:type': [entry ? 'article' : 'website'],
    'og:image': [image.url],
    'og:image:width': [String(image.width)],
    'og:image:height': [String(image.height)],
    'og:image:alt': [image.alt],
    'twitter:card': ['summary_large_image'],
    'twitter:title': [displayTitle],
    'twitter:description': [profile.description],
    'twitter:image': [image.url],
    'twitter:image:width': [String(image.width)],
    'twitter:image:height': [String(image.height)],
    'twitter:image:alt': [image.alt]
  };
  const jsonLd: unknown[] = [];
  if (route === '/') {
    social['og:locale'] = ['en_US'];
    jsonLd.push(JSON.parse(websiteJsonLd()));
  } else if (entry) {
    const source = matter(readFileSync(join(root, 'content', entry.domain, entry.slug + '.mdx'), 'utf8'));
    const measured = JSON.parse(readFileSync(join(root, 'data/reading-times.json'), 'utf8'))[entry.domain + '/' + entry.slug] as {
      words: number;
      minutes: number;
    } | undefined;
    const words = measured?.words ?? countWordsInMdxSource(source.content);
    const published = articleDatePublished(entry.domain, entry.slug, source.data.datePublished);
    const modified = articleDateModified(entry.domain, entry.slug);
    social['article:published_time'] = [published];
    social['article:modified_time'] = [modified];
    jsonLd.push(breadcrumbs([{
      name: 'Home',
      route: '/'
    }, {
      name: DOMAIN_META[entry.domain].name,
      route: '/' + entry.domain + '/'
    }, {
      name: entry.title,
      route
    }]));
    jsonLd.push(JSON.parse(articleJsonLd({
      entry,
      datePublished: published,
      dateModified: modified,
      readingTimeMinutes: measured?.minutes ?? readingTimeMinutes(words),
      wordCount: words,
      citations: resolveReferences(source.data.citations ?? [], inlineCitationIds(source.content), getCitation).filter(r => !r.furtherReading).map(r => r.citation)
    })));
  } else if (domain) {
    jsonLd.push(breadcrumbs([{
      name: 'Home',
      route: '/'
    }, {
      name: displayTitle,
      route
    }]));
    jsonLd.push(JSON.parse(domainCollectionJsonLd(domain, publishedModules().filter(m => m.domain === domain))));
  } else if (['/about/', '/a-z/', '/editorial-policy/'].includes(route)) {
    jsonLd.push(breadcrumbs([{
      name: 'Home',
      route: '/'
    }, {
      name: displayTitle,
      route
    }]));
  } else if (route === '/market-map/') jsonLd.push(JSON.parse(marketMapJsonLd(COMPANIES)));else if (route === '/glossary/') jsonLd.push(JSON.parse(glossaryJsonLd(glossaryTermsAlphabetical())));else if (route === '/playground/') jsonLd.push(JSON.parse(playgroundJsonLd(profile.description)));else if (route === '/how-robots-work/') jsonLd.push(JSON.parse(howRobotsWorkJsonLd(profile.description)));else jsonLd.push(JSON.parse(webPageJsonLd({
    path: route,
    name: displayTitle,
    ...(route === '/404/' ? {} : {
      description: profile.description
    }),
    ...(route === '/search/' ? {
      type: 'SearchResultsPage' as const
    } : {})
  })));
  return {
    title: route === '/' ? profile.title : profile.title + SEO_TITLE_SUFFIX,
    canonical,
    description: profile.description,
    social,
    jsonLd,
    manifest: [],
    icons: APPROVED_TAB_ICONS.map(({
      rel,
      href
    }) => ({
      rel,
      href
    })),
    themeColour: [],
    noindex: route === '/404/' || (NON_INDEXABLE_ROUTES as readonly string[]).includes(route)
  };
}
export function parseExportedMetadata(html: string): ReleaseMetadata {
  const dom = new JSDOM(html);
  const d = dom.window.document;
  const values = (selector: string, attr: string) => [...d.querySelectorAll(selector)].map(n => n.getAttribute(attr) ?? '');
  const social: Record<string, string[]> = {};
  for (const n of d.querySelectorAll('meta[property],meta[name]')) {
    const name = n.getAttribute('property') ?? n.getAttribute('name') ?? '';
    if (!/^(og:|twitter:|article:)/.test(name)) continue;
    (social[name] ??= []).push(n.getAttribute('content') ?? '');
  }
  const canonicals = values('link[rel="canonical"]', 'href');
  const descriptions = values('meta[name="description"]', 'content');
  if (d.querySelectorAll('title').length !== 1 || canonicals.length !== 1 || descriptions.length !== 1) throw new Error('Export must contain exactly one title, canonical and description');
  const robotValues = values('meta[name="robots"]', 'content');
  if (!robotValues.length || robotValues.some(v => /\bindex\b/i.test(v)) && robotValues.some(v => /\bnoindex\b/i.test(v))) throw new Error('Missing or contradictory robots policy');
  const parsed: ReleaseMetadata = {
    title: d.title,
    canonical: canonicals[0],
    description: descriptions[0],
    social,
    jsonLd: [...d.querySelectorAll('script[type="application/ld+json"]')].map(n => JSON.parse(n.textContent ?? '')),
    manifest: values('link[rel="manifest"]', 'href'),
    icons: [...d.querySelectorAll('link[rel]')].filter(n => /^(icon|shortcut icon|apple-touch-icon|mask-icon)$/.test(n.getAttribute('rel') ?? '')).map(n => ({
      rel: n.getAttribute('rel')!,
      href: (n.getAttribute('href') ?? '').split(/[?#]/)[0]
    })),
    themeColour: values('meta[name="theme-color"]', 'content'),
    noindex: values('meta[name="robots"]', 'content').some(v => /\bnoindex\b/i.test(v))
  };
  dom.window.close();
  return parsed;
}
export function metadataDifferences(expected: ReleaseMetadata, actual: ReleaseMetadata): string[] {
  const stable = (value: unknown): string => JSON.stringify(value, (_key, x) => x && !Array.isArray(x) && typeof x === 'object' ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x);
  const errors: string[] = [];
  for (const key of Object.keys(expected) as Array<keyof ReleaseMetadata>) {
    const normalize = (value: unknown) => key === 'icons' || key === 'jsonLd' ? (value as unknown[]).map(stable).sort() : value;
    if (stable(normalize(expected[key])) !== stable(normalize(actual[key]))) errors.push('metadata field differs: ' + key);
  }
  return errors;
}
