import type { MetadataRoute } from 'next';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // ALLOW_INDEXING in lib/site.ts is the single switch; true since the
    // go-public decision of 2026-08-16, so robots.txt permits crawling and
    // keeps the sitemap pointer on the apex origin.
    rules: ALLOW_INDEXING
      ? { userAgent: '*', allow: '/' }
      : { userAgent: '*', disallow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
