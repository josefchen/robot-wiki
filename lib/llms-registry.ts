import { SITEMAP_STANDALONE_PATHS } from '@/app/sitemap';
import { citationLabel, getCitation } from '@/data/citations';
import { DOMAINS, DOMAIN_META, publishedModules } from '@/data/modules';
import type { LlmsInput, LlmsPage } from '@/lib/llms';
import { moduleSource } from '@/lib/module-source';
import { domainSeoDescription } from '@/lib/seo';
import { routeSeoProfile } from '@/lib/seo-profiles';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';
import { SITE_URL } from '@/lib/site';

/** Each path with its seo profile's title and description; a path with no profile throws by name. */
export function standalonePages(paths: readonly string[]): LlmsPage[] {
  return paths.map((path) => {
    const { title, description } = routeSeoProfile(path);
    return { path, title, description };
  });
}

/** The registry as the llms.txt generators read it at build time. */
export function registryLlmsInput(): LlmsInput {
  return {
    siteUrl: SITE_URL,
    siteName: PUBLIC_IDENTITY,
    descriptor: PUBLIC_DESCRIPTOR,
    domains: DOMAINS.map((id) => ({
      id,
      name: DOMAIN_META[id].name,
      description: domainSeoDescription(id),
    })),
    articles: publishedModules().map((entry) => ({
      domain: entry.domain,
      slug: entry.slug,
      title: entry.title,
      summary: entry.summary,
      source: moduleSource(entry.domain, entry.slug),
    })),
    pages: standalonePages(SITEMAP_STANDALONE_PATHS),
    citation: (id) => {
      const citation = getCitation(id);
      return citation && { label: citationLabel(citation), title: citation.title, url: citation.url };
    },
  };
}
