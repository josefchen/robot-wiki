import matter from 'gray-matter';
import { getCitation } from '@/data/citations';
import { GLOSSARY } from '@/data/glossary';
import { publishedModules } from '@/data/modules';
import { moduleSource } from '@/lib/module-source';
import { WIDGET_CITATION_IDS } from '@/lib/widget-citations';

/**
 * The three counts printed under the home identity line, each derived from
 * its registry when the page is built.
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
};

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
  };
}
