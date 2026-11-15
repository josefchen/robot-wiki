import matter from 'gray-matter';
import { EXPLAINER_ORDER } from '@/components/explainers/catalog';
import { getCitation } from '@/data/citations';
import { COMPANIES } from '@/data/companies';
import { GLOSSARY } from '@/data/glossary';
import { publishedModules } from '@/data/modules';
import { DEVELOPMENTS, DEVELOPMENTS_FROM } from '@/data/now';
import { readableDate } from '@/lib/home-updates';
import { moduleSource } from '@/lib/module-source';
import { headlineFacts } from '@/lib/rounds-page';
import { WIDGET_CITATION_IDS } from '@/lib/widget-citations';

/**
 * Every number the home page prints, each derived from its registry when
 * the page is built: the three counts under the search, and the explainers,
 * companies, funding rounds and developments that "Also in the wiki" names.
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
  /** The closed rounds the recent funding rounds page holds. */
  closedRounds: number;
  /** The days those rounds cover, as home writes a span of dates. */
  roundsWindow: string;
  developments: number;
  /** The first day those developments cover, as home writes a date. */
  developmentsSince: string;
};

/** A count as the page prints it, thousands grouped: `1,771`. */
export function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

/**
 * Two days as home writes a span: `17 Jul to 14 Nov 2026`. The first day
 * keeps its year when the two fall in different years.
 */
export function readableSpan(from: string, to: string): string {
  const start = readableDate(from);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${sameYear ? start.replace(/ \d{4}$/, '') : start} to ${readableDate(to)}`;
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
  const rounds = headlineFacts();
  return {
    articles: publishedModules().length,
    sources: citedSourceIds().size,
    glossaryTerms: GLOSSARY.length,
    explainers: EXPLAINER_ORDER.length,
    companies: COMPANIES.length,
    closedRounds: rounds.closed,
    roundsWindow: readableSpan(rounds.start, rounds.end),
    developments: DEVELOPMENTS.length,
    developmentsSince: readableDate(DEVELOPMENTS_FROM),
  };
}
