import { DOMAIN_META, publishedModules } from '@/data/modules';
import { articleDateModified, articleDatePublished } from '@/lib/content-dates';
import { moduleDatePublished } from '@/lib/module-source';
import { HOME_SEO_DESCRIPTION } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function rssDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00.000Z`).toUTCString();
}

// The feed carries the dates each article's meta tags and JSON-LD carry: an
// item's pubDate is its datePublished, and lastBuildDate is the newest
// dateModified among the items.
export function buildFeed(): string {
  const entries = publishedModules()
    .map((entry, registryIndex) => ({
      entry,
      registryIndex,
      published: articleDatePublished(
        entry.domain,
        entry.slug,
        moduleDatePublished(entry.domain, entry.slug),
      ),
      modified: articleDateModified(entry.domain, entry.slug),
    }))
    .sort(
      (a, b) =>
        b.published.localeCompare(a.published) ||
        a.registryIndex - b.registryIndex,
    );

  const lastBuildDate = entries
    .map(({ modified }) => modified)
    .reduce((newest, date) => (date > newest ? date : newest));
  const items = entries
    .map(({ entry, published }) => {
      const url = `${SITE_URL}/${entry.domain}/${entry.slug}/`;
      return [
        '    <item>',
        `      <title>${escapeXml(entry.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <description>${escapeXml(entry.summary)}</description>`,
        `      <category>${escapeXml(DOMAIN_META[entry.domain].name)}</category>`,
        `      <pubDate>${rssDate(published)}</pubDate>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>Robot Wiki</title>',
    `    <link>${SITE_URL}/</link>`,
    `    <description>${escapeXml(HOME_SEO_DESCRIPTION)}</description>`,
    '    <language>en</language>',
    `    <lastBuildDate>${rssDate(lastBuildDate)}</lastBuildDate>`,
    `    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

export function GET() {
  return new Response(buildFeed(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
