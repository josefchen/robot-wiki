import type { MetadataRoute } from 'next';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // While the wiki is unfinished the whole site stays non-indexable
    // (ALLOW_INDEXING in lib/site.ts is the single switch; polish-go-public
    // flips it). The sitemap pointer stays so the crawl surface is already
    // wired for go-public.
    rules: ALLOW_INDEXING
      ? { userAgent: '*', allow: '/' }
      : { userAgent: '*', disallow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
