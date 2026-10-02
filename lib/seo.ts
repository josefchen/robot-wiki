import type { Citation } from '../data/citations.ts';
import type { Domain, ModuleRegistryEntry } from '../data/modules.ts';
import { DOMAIN_META } from '../data/modules.ts';
import { AUTHOR_NAME, AUTHOR_PROFILE_URL } from './identity.ts';
import { articleStructuredImagePaths } from './og-cards.ts';
import { routeSeoProfile } from './seo-profiles.ts';
import { SITE_DISPLAY_NAME, SITE_URL } from './site.ts';

/** The suffix the root layout's title template appends to every route but home. */
export const SEO_TITLE_SUFFIX = ' | Robot Wiki';

/** Search-facing copy shared by metadata and WebSite structured data. */
export const HOME_SEO_TITLE = routeSeoProfile('/').title;
export const HOME_SEO_DESCRIPTION =
  'Explore modern robotics with source-cited guides to robot learning, vision-language-action models, reinforcement learning, sim-to-real and control.';
/**
 * Home's meta description. It opens with the locked descriptor, which the
 * site root's metadata has to carry verbatim (VAL-B2-ID-002).
 */
export const HOME_META_DESCRIPTION = routeSeoProfile('/').description;

export const ACQUISITION_CLUSTERS = [
  'robot-learning-vla',
  'classical-robotics',
  'world-models',
  'utility',
] as const;

export type AcquisitionCluster = (typeof ACQUISITION_CLUSTERS)[number];

export interface ArticleSeoProfile {
  title: string;
  description: string;
  headTerm: string;
  keywords: string[];
  acquisitionCluster: AcquisitionCluster;
  primaryIntent: string;
  indexable: true;
}

const STANDALONE_PATHS = {
  about: '/about/',
  azIndex: '/a-z/',
  credits: '/credits/',
  editorialPolicy: '/editorial-policy/',
  glossary: '/glossary/',
  marketMap: '/market-map/',
  playground: '/playground/',
  privacy: '/privacy/',
  search: '/search/',
} as const;

type StandaloneKey = keyof typeof STANDALONE_PATHS;

function standalone<K extends StandaloneKey>(
  keys: readonly K[],
  field: 'title' | 'description',
): Record<K, string> {
  return Object.fromEntries(
    keys.map((key) => [key, routeSeoProfile(STANDALONE_PATHS[key])[field]]),
  ) as Record<K, string>;
}

/**
 * Descriptive titles for the standalone routes. The search route keeps the
 * plain page name it declares itself.
 */
export const STANDALONE_SEO_TITLES = standalone(
  [
    'about',
    'azIndex',
    'credits',
    'editorialPolicy',
    'glossary',
    'marketMap',
    'playground',
    'privacy',
  ] as const,
  'title',
);

/** Metadata descriptions for every fixed route other than the home page. */
export const STANDALONE_SEO_DESCRIPTIONS = standalone(
  Object.keys(STANDALONE_PATHS) as StandaloneKey[],
  'description',
);

const DOMAIN_ACQUISITION_CLUSTERS: Readonly<
  Record<Domain, AcquisitionCluster>
> = {
  manipulation: 'robot-learning-vla',
  'rl-sim2real': 'robot-learning-vla',
  'data-hardware': 'robot-learning-vla',
  classical: 'classical-robotics',
  'world-models': 'world-models',
  frontier: 'utility',
  adjacent: 'utility',
};

/**
 * The search-facing profile of an article. Social cards and the visible h1
 * keep the editorial title; this profile sets only the document title, the
 * meta description and the structured-data keywords.
 */
export function articleSeoProfile(
  entry: Pick<ModuleRegistryEntry, 'domain' | 'slug'>,
): ArticleSeoProfile {
  const profile = routeSeoProfile(`/${entry.domain}/${entry.slug}/`);
  const keywords = [profile.headTerm, ...profile.queries].filter(
    (keyword, index, all) =>
      all.findIndex((other) => other.toLowerCase() === keyword.toLowerCase()) ===
      index,
  );
  return {
    title: profile.title,
    description: profile.description,
    headTerm: profile.headTerm,
    keywords,
    acquisitionCluster: DOMAIN_ACQUISITION_CLUSTERS[entry.domain],
    primaryIntent: profile.queries[0] ?? profile.headTerm,
    indexable: true,
  };
}

export function articleSeoTitle(
  entry: Pick<ModuleRegistryEntry, 'domain' | 'slug'>,
): string {
  return articleSeoProfile(entry).title;
}

export function domainSeoTitle(domain: Domain): string {
  return routeSeoProfile(`/${domain}/`).title;
}

export function domainSeoDescription(domain: Domain): string {
  return routeSeoProfile(`/${domain}/`).description;
}

/**
 * JSON-LD is inserted with dangerouslySetInnerHTML, so escape the one byte
 * sequence that could open an HTML tag and terminate the script element.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function personJsonLd() {
  return {
    '@type': 'Person',
    name: AUTHOR_NAME,
    url: AUTHOR_PROFILE_URL,
  } as const;
}

/** The site search URL, with the placeholder its SearchAction declares. */
export const SEARCH_URL_TEMPLATE = `${SITE_URL}/search/?q={search_term_string}`;

export function websiteJsonLd(): string {
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_DISPLAY_NAME,
    description: HOME_SEO_DESCRIPTION,
    inLanguage: 'en',
    creator: personJsonLd(),
    potentialAction: {
      '@type': 'SearchAction',
      target: SEARCH_URL_TEMPLATE,
      'query-input': 'required name=search_term_string',
    },
  });
}

type ArticleJsonLdInput = {
  entry: Pick<ModuleRegistryEntry, 'domain' | 'slug' | 'title' | 'summary'>;
  datePublished: string;
  dateModified: string;
  readingTimeMinutes: number;
  wordCount: number;
  /** Registry entries of the sources the article cites inline. */
  citations: ReadonlyArray<Pick<Citation, 'title' | 'url' | 'type'>>;
};

export function articleJsonLd({
  entry,
  datePublished,
  dateModified,
  readingTimeMinutes,
  wordCount,
  citations,
}: ArticleJsonLdInput): string {
  const url = `${SITE_URL}/${entry.domain}/${entry.slug}/`;
  const profile = articleSeoProfile(entry);
  const seen = new Set<string>();
  const citation = citations
    .filter(({ url: sourceUrl }) => !seen.has(sourceUrl) && seen.add(sourceUrl))
    .map((source) => ({
      '@type': source.type === 'paper' ? 'ScholarlyArticle' : 'CreativeWork',
      name: source.title,
      url: source.url,
    }));
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: entry.title,
    description: profile.description,
    about: { '@type': 'Thing', name: profile.headTerm },
    keywords: profile.keywords,
    url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    image: articleStructuredImagePaths(entry.domain, entry.slug).map(
      (path) => `${SITE_URL}${path}`,
    ),
    author: personJsonLd(),
    publisher: personJsonLd(),
    datePublished,
    dateModified,
    articleSection: DOMAIN_META[entry.domain].name,
    inLanguage: 'en',
    isAccessibleForFree: true,
    wordCount: Math.max(1, Math.round(wordCount)),
    timeRequired: `PT${Math.max(1, Math.round(readingTimeMinutes))}M`,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_DISPLAY_NAME,
      url: `${SITE_URL}/`,
    },
    citation,
  });
}

export function domainCollectionJsonLd(
  domain: Domain,
  entries: ReadonlyArray<
    Pick<ModuleRegistryEntry, 'domain' | 'slug' | 'title' | 'summary'>
  >,
): string {
  const url = `${SITE_URL}/${domain}/`;
  const meta = DOMAIN_META[domain];
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    url,
    name: meta.name,
    description: meta.description,
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => {
        const articleUrl = `${SITE_URL}/${entry.domain}/${entry.slug}/`;
        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Article',
            '@id': `${articleUrl}#article`,
            url: articleUrl,
            name: entry.title,
            description: entry.summary,
          },
        };
      }),
    },
  });
}
