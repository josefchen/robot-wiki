import { DOMAIN_META, publishedModules } from '@/data/modules';
import { moduleLastReviewed } from '@/lib/module-source';
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

export function buildFeed(): string {
  const entries = publishedModules()
    .map((entry, registryIndex) => ({
      entry,
      registryIndex,
      reviewed: moduleLastReviewed(entry.domain, entry.slug),
    }))
    .filter(
      (item): item is typeof item & { reviewed: string } =>
        typeof item.reviewed === 'string',
    )
    .sort(
      (a, b) =>
        b.reviewed.localeCompare(a.reviewed) ||
        a.registryIndex - b.registryIndex,
    );

  const lastBuildDate = entries[0]?.reviewed ?? '2026-08-24';
  const items = entries
    .map(({ entry, reviewed }) => {
      const url = `${SITE_URL}/${entry.domain}/${entry.slug}/`;
      return [
        '    <item>',
        `      <title>${escapeXml(entry.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <description>${escapeXml(entry.summary)}</description>`,
        `      <category>${escapeXml(DOMAIN_META[entry.domain].name)}</category>`,
        `      <pubDate>${rssDate(reviewed)}</pubDate>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>robot-wiki</title>',
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
