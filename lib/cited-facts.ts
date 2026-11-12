/**
 * Facts that pages outside an article restate from it: the home page's
 * "Did you know" facts and each domain hub's lead fact and evidence cells.
 *
 * A fact links its article and renders one of that article's citations, so
 * the article must be published and must cite that source inline. That is
 * an error. The fact's wording is free to differ from the article's, so an
 * article can be rewritten without touching home or the hub; a number the
 * fact states that the article no longer mentions is reported as a warning
 * for an editor to look at, since a rewrite may only have spelled it out.
 */
import matter from 'gray-matter';
import { DID_YOU_KNOW, didYouKnowText } from '../data/did-you-know.ts';
import { DOMAIN_META } from '../data/modules.ts';
import type { Domain } from '../data/modules.ts';

export type CitedFact = {
  /** Where the fact is shown, for messages: "home did-you-know act-ten-minutes". */
  where: string;
  /** The article that states it, as `domain/slug`. */
  article: string;
  citationId: string;
  /** The text the reader sees. */
  text: string;
};

export type CitedFactFindings = { errors: string[]; warnings: string[] };

const NUMBER = /\d+(?:[.,]\d+)*/g;

/** Article prose as a reader sees it: chips dropped, inline markup unwrapped. */
function readerText(body: string): string {
  return body
    .replace(/<Cite\b[^>]*\/>/g, '')
    .replace(/<Term\b[^>]*>([^<]*)<\/Term>/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ');
}

export function citedFactFindings(
  facts: readonly CitedFact[],
  options: {
    /** `domain/slug` of every published article. */
    published: ReadonlySet<string>;
    citationIds: ReadonlySet<string>;
    /** The raw MDX source of a published article. */
    readArticle: (article: string) => string;
  },
): CitedFactFindings {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const fact of facts) {
    if (!options.published.has(fact.article)) {
      errors.push(`${fact.where}: links ${fact.article}, which is not a published article`);
      continue;
    }
    if (!options.citationIds.has(fact.citationId)) {
      errors.push(`${fact.where}: cites ${fact.citationId}, which data/citations.ts does not hold`);
      continue;
    }
    const { content, data } = matter(options.readArticle(fact.article));
    const listed = Array.isArray(data.citations) && data.citations.includes(fact.citationId);
    const inline = content.includes(`<Cite id="${fact.citationId}"`);
    if (!listed || !inline) {
      errors.push(
        `${fact.where}: cites ${fact.citationId}, which ${fact.article} does not cite ${listed ? 'inline' : 'in its citations list'}`,
      );
      continue;
    }
    const prose = readerText(content);
    const missing = (fact.text.match(NUMBER) ?? []).filter((number) => !prose.includes(number));
    if (missing.length > 0) {
      warnings.push(
        `${fact.where}: ${fact.article} no longer mentions ${missing.map((n) => `"${n}"`).join(', ')} from "${fact.text}"; check the fact still matches the article`,
      );
    }
  }
  return { errors, warnings };
}

/** Every cited fact the site shows outside its article. */
export function siteCitedFacts(): CitedFact[] {
  const facts: CitedFact[] = DID_YOU_KNOW.map((fact) => ({
    where: `home did-you-know ${fact.id}`,
    article: `${fact.domain}/${fact.slug}`,
    citationId: fact.citationId,
    text: didYouKnowText(fact),
  }));
  for (const [domain, meta] of Object.entries(DOMAIN_META) as [Domain, (typeof DOMAIN_META)[Domain]][]) {
    if (meta.fact) facts.push({ where: `/${domain}/ hub fact`, ...meta.fact });
    for (const row of meta.evidence ?? []) {
      facts.push({ where: `/${domain}/ evidence ${row.slug} scale`, ...row.scale });
      facts.push({ where: `/${domain}/ evidence ${row.slug} record`, ...row.record });
    }
  }
  return facts;
}
