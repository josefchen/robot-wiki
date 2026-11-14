import matter from 'gray-matter';
import { EXPLAINER_ORDER } from '@/components/explainers/catalog';
import { getCitation } from '@/data/citations';
import { COMPANIES } from '@/data/companies';
import { GLOSSARY } from '@/data/glossary';
import { publishedModules } from '@/data/modules';
import { DEVELOPMENTS, DEVELOPMENTS_FROM } from '@/data/now';
import { readableDate } from '@/lib/home-updates';
import { moduleSource } from '@/lib/module-source';
import { WIDGET_CITATION_IDS } from '@/lib/widget-citations';

/**
 * Every number the home page prints, each derived from its registry when
 * the page is built: the three counts under the search, and the explainers,
 * companies and developments that "Also in the wiki" names.
 *
 * A source counts once however many pages cite it. The population is every
 * citation record a published page renders: the frontmatter `citations` of
 * each published article (validate:content holds every inline chip to that
 * list), the definitions on the glossary page, and the rows of the widgets
 * mounted in articles. An id with no record in `data/citations.ts` is not a
 * source, so it is not counted.
 */
export type HomeCounts = {
  articles: number;
  sources: number;
  glossaryTerms: number;
  explainers: number;
  companies: number;
  developments: number;
  /** The first day those developments cover, as home writes a date. */
  developmentsSince: string;
};

/** A count as the page prints it, thousands grouped: `1,771`. */
export function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

export function citedSourceIds(
  read: (domain: string, slug: string) => string = moduleSource,
): Set<string> {
  const ids = new Set<string>();
  for (const { domain, slug } of publishedModules()) {
    const cited = matter(read(domain, slug)).data.citations;
    if (Array.isArray(cited)) {
      for (const id of cited) if (typeof id === 'string') ids.add(id);
    }
  }
  for (const term of GLOSSARY) {
    for (const id of term.citations ?? []) ids.add(id);
  }
  for (const idsFor of Object.values(WIDGET_CITATION_IDS)) {
    for (const id of idsFor()) ids.add(id);
  }
  return new Set([...ids].filter((id) => getCitation(id) !== undefined));
}

export function homeCounts(): HomeCounts {
  return {
    articles: publishedModules().length,
    sources: citedSourceIds().size,
    glossaryTerms: GLOSSARY.length,
    explainers: EXPLAINER_ORDER.length,
    companies: COMPANIES.length,
    developments: DEVELOPMENTS.length,
    developmentsSince: readableDate(DEVELOPMENTS_FROM),
  };
}
