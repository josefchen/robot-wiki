import { citationLabel, getCitation } from '@/data/citations';
import { DOMAINS, DOMAIN_META, publishedModules } from '@/data/modules';
import type { LlmsInput } from '@/lib/llms';
import { moduleSource } from '@/lib/module-source';
import { domainSeoDescription } from '@/lib/seo';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';
import { SITE_URL } from '@/lib/site';

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
    citation: (id) => {
      const citation = getCitation(id);
      return citation && { label: citationLabel(citation), title: citation.title, url: citation.url };
    },
  };
}
