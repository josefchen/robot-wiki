import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildFeed, escapeXml, GET } from '@/app/feed.xml/route';
import { publishedModules } from '@/data/modules';
import { SITE_URL } from '@/lib/site';

describe('RSS feed', () => {
  it('contains one canonical item per published article', () => {
    const feed = buildFeed();
    expect(feed.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(feed.match(/<item>/g)).toHaveLength(publishedModules().length);
    for (const entry of publishedModules()) {
      const url = `${SITE_URL}/${entry.domain}/${entry.slug}/`;
      expect(feed).toContain(`<guid isPermaLink="true">${url}</guid>`);
    }
  });

  it('escapes XML-sensitive source text', () => {
    expect(escapeXml(`A & B < C > D "quoted" 'single'`)).toBe(
      'A &amp; B &lt; C &gt; D &quot;quoted&quot; &apos;single&apos;',
    );
  });

  it('returns the feed with the RSS content type', async () => {
    const response = GET();
    expect(response.headers.get('content-type')).toContain(
      'application/rss+xml',
    );
    expect(await response.text()).toBe(buildFeed());
  });

  it('pins the RSS media type for the exported file on Vercel', () => {
    const config = JSON.parse(
      readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'),
    ) as {
      headers: Array<{
        source: string;
        headers: Array<{ key: string; value: string }>;
      }>;
    };
    const feedRule = config.headers.find((rule) => rule.source === '/feed.xml');
    expect(feedRule?.headers).toContainEqual({
      key: 'Content-Type',
      value: 'application/rss+xml; charset=utf-8',
    });
  });
});
