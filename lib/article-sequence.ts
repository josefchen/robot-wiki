import { modulesByDomain } from '../data/modules.ts';
import type { ModuleRegistryEntry } from '../data/modules.ts';
import { REPOSITORY_URL, contentCorrectionUrl } from './identity.ts';
import { SITE_URL } from './site.ts';

/**
 * A domain's published articles in the order its hub numbers them: the
 * registry order, drafts left out.
 */
export function domainSequence(domain: string): ModuleRegistryEntry[] {
  return (modulesByDomain()[domain] ?? []).filter((m) => m.status === 'published');
}

export interface ArticleNeighbours {
  previous?: ModuleRegistryEntry;
  next?: ModuleRegistryEntry;
}

/**
 * The articles before and after one article in its domain's sequence. The
 * first article has no previous and the last has no next: the sequence
 * never crosses into another domain.
 */
export function articleNeighbours(domain: string, slug: string): ArticleNeighbours {
  const sequence = domainSequence(domain);
  const index = sequence.findIndex((m) => m.slug === slug);
  if (index === -1) return {};
  return { previous: sequence[index - 1], next: sequence[index + 1] };
}

/** The article's source file on `main`, opened in GitHub's editor. */
export function articleEditUrl(domain: string, slug: string): string {
  return `${REPOSITORY_URL}/edit/main/content/${domain}/${slug}.mdx`;
}

/**
 * The correction form with this article filled in: its title in the issue
 * title and its address in the form's "Page URL" field, whose id is `page`
 * (.github/ISSUE_TEMPLATE/content-correction.yml).
 */
export function articleErrorReportUrl(entry: ModuleRegistryEntry): string {
  const url = new URL(contentCorrectionUrl(entry.title));
  url.searchParams.set('page', `${SITE_URL}/${entry.domain}/${entry.slug}/`);
  return url.toString();
}
