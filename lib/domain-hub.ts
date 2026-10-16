import { DOMAIN_META, DOMAINS, getModule } from '../data/modules.ts';
import type { Domain } from '../data/modules.ts';

const FIXED_TITLES: Record<string, string> = { '/market-map/': 'Market Map' };

/**
 * The link text for a hub's related link: the published article's title,
 * the hub's name or a fixed page's heading. Throws on anything else, so a
 * related link can never point at a draft or a page that does not exist.
 */
export function relatedTitle(href: string): string {
  if (!href.startsWith('/') || !href.endsWith('/')) {
    throw new Error(`a domain hub links ${href}, which is not a trailing-slash route`);
  }
  const [domain, slug, extra] = href.split('/').filter(Boolean);
  let title: string | undefined = FIXED_TITLES[href];
  if (!title && !extra && (DOMAINS as readonly string[]).includes(domain)) {
    if (!slug) {
      title = DOMAIN_META[domain as Domain].name;
    } else {
      const entry = getModule(domain, slug);
      title = entry?.status === 'published' ? entry.title : undefined;
    }
  }
  if (!title) throw new Error(`a domain hub links ${href}, which is not a published page`);
  return title;
}
