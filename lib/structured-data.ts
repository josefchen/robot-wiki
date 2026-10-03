import type { Company } from '../data/schemas/company.ts';
import type { GlossaryTerm } from '../data/schemas/glossary.ts';
import { getCompanyLogo } from '../data/logos.ts';
import { serializeJsonLd } from './seo.ts';
import { SITE_DISPLAY_NAME, SITE_URL } from './site.ts';

/**
 * JSON-LD for the fixed routes that are not articles or hubs. Every exported
 * page carries at least one node (the build's SEO check fails otherwise), so
 * each fixed route names what it is in schema.org terms.
 */

const WEBSITE_REF = { '@id': `${SITE_URL}/#website` } as const;

export function glossaryTermUrl(id: string): string {
  return `${SITE_URL}/glossary/#${id}`;
}

/** The glossary as one DefinedTermSet, each term anchored at its own id. */
export function glossaryJsonLd(
  terms: ReadonlyArray<Pick<GlossaryTerm, 'id' | 'term' | 'definition'>>,
): string {
  const setId = `${SITE_URL}/glossary/#defined-term-set`;
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': setId,
    url: `${SITE_URL}/glossary/`,
    name: `${SITE_DISPLAY_NAME} glossary`,
    inLanguage: 'en',
    isPartOf: WEBSITE_REF,
    hasDefinedTerm: terms.map((term) => ({
      '@type': 'DefinedTerm',
      '@id': glossaryTermUrl(term.id),
      url: glossaryTermUrl(term.id),
      name: term.term,
      description: term.definition,
      inDefinedTermSet: { '@id': setId },
    })),
  });
}

/**
 * A company's canonical link: its own site, or its card on the map when the
 * registry records no website.
 */
export function companyUrl(company: Pick<Company, 'id' | 'website'>): string {
  return company.website ?? `${SITE_URL}/market-map/#company-${company.id}`;
}

export function companyLogoUrl(
  company: Pick<Company, 'logo'>,
): string | undefined {
  const asset = company.logo ? getCompanyLogo(company.logo) : undefined;
  return asset ? `${SITE_URL}${asset.file}` : undefined;
}

/** The market map as an ItemList with one Organization per company. */
export function marketMapJsonLd(
  companies: ReadonlyArray<Pick<Company, 'id' | 'name' | 'website' | 'logo'>>,
): string {
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${SITE_URL}/market-map/#companies`,
    url: `${SITE_URL}/market-map/`,
    name: 'Robotics and embodied-AI companies',
    numberOfItems: companies.length,
    itemListElement: companies.map((company, index) => {
      const logo = companyLogoUrl(company);
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Organization',
          name: company.name,
          url: companyUrl(company),
          ...(logo ? { logo } : {}),
        },
      };
    }),
  });
}

/** The 3D playground is a browser application, free to use. */
export function playgroundJsonLd(description: string): string {
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${SITE_URL}/playground/#application`,
    url: `${SITE_URL}/playground/`,
    name: '3D Kinematics Playground',
    description,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript and WebGL.',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isPartOf: WEBSITE_REF,
  });
}

/** The interactive 3D explainers: a learning resource, not an article. */
export function howRobotsWorkJsonLd(description: string): string {
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${SITE_URL}/how-robots-work/#explainers`,
    url: `${SITE_URL}/how-robots-work/`,
    name: 'How robots work',
    description,
    learningResourceType: 'Interactive explainer',
    interactivityType: 'active',
    inLanguage: 'en',
    isAccessibleForFree: true,
    isPartOf: WEBSITE_REF,
  });
}

/** A plain WebPage node for a fixed route that is neither list nor app. */
export function webPageJsonLd({
  path,
  name,
  description,
  type = 'WebPage',
}: {
  path: string;
  name: string;
  description?: string;
  type?: 'WebPage' | 'AboutPage' | 'SearchResultsPage';
}): string {
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${SITE_URL}${path}#webpage`,
    url: `${SITE_URL}${path}`,
    name,
    ...(description ? { description } : {}),
    inLanguage: 'en',
    isPartOf: WEBSITE_REF,
  });
}
