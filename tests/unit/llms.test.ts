import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET as getLlmsFull } from '@/app/llms-full.txt/route';
import { GET as getLlms } from '@/app/llms.txt/route';
import { DOMAINS, publishedModules } from '@/data/modules';
import { leadParagraph } from '@/lib/article-lead';
import {
  articleKeyFacts,
  articleLead,
  buildLlmsFullTxt,
  buildLlmsTxt,
  type LlmsArticle,
  type LlmsInput,
} from '@/lib/llms';
import { registryLlmsInput } from '@/lib/llms-registry';
import { SITE_URL } from '@/lib/site';

const input = registryLlmsInput();
const llms = buildLlmsTxt(input);
const full = buildLlmsFullTxt(input);
const url = (a: Pick<LlmsArticle, 'domain' | 'slug'>) => `${SITE_URL}/${a.domain}/${a.slug}/`;

const FIXTURE: LlmsArticle = {
  domain: 'classical',
  slug: 'fixture-article',
  title: 'Fixture Article',
  summary: 'A fixture article is a registry entry that only this test adds.',
  source: [
    '---',
    'title: Fixture Article',
    '---',
    '',
    'A fixture article is a registry entry that exists only in this test.',
    '',
    'Its filter ran at 100 Hz on the bench <Cite id="kalman-1960-filter" />.',
    '',
  ].join('\n'),
};

describe('llms.txt', () => {
  it('lists every domain and every published article once, with its summary and canonical URL', () => {
    for (const domain of DOMAINS) expect(llms).toContain(`(${SITE_URL}/${domain}/)`);
    const listed = [...llms.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]);
    const articles = listed.filter((href) => href.split('/').filter(Boolean).length === 4);
    expect(articles.sort()).toEqual(publishedModules().map(url).sort());
    for (const entry of publishedModules()) {
      expect(llms).toContain(`- [${entry.title}](${url(entry)}): ${entry.summary}\n`);
    }
  });

  it('is served as plain text from the build, not from a hand-kept file', async () => {
    const response = getLlms();
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await response.text()).toBe(llms);
    expect(existsSync(join(process.cwd(), 'public', 'llms.txt'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'public', 'llms-full.txt'))).toBe(false);
  });
});

describe('llms-full.txt', () => {
  it('holds each published article with its current lead', () => {
    const sections = full.split(/^## /m).slice(1);
    expect(sections).toHaveLength(publishedModules().length);
    for (const article of input.articles) {
      expect(leadParagraph(article.source), url(article)).toBeTruthy();
      expect(full).toContain(`URL: ${url(article)}\n`);
      expect(full).toContain(`\n${articleLead(input, article)}\n`);
    }
  });

  it('prints every key fact with the citation it carries', () => {
    let facts = 0;
    for (const article of input.articles) {
      for (const fact of articleKeyFacts(input, article)) {
        facts += 1;
        expect(fact, url(article)).toMatch(/ \[[^\]]+ (?:\d{4}|n\.d\.)\]\(https?:\/\/[^)]+\)/);
        expect(full).toContain(`- ${fact}\n`);
      }
    }
    expect(facts).toBeGreaterThan(publishedModules().length);
  });

  it('is served as plain text', async () => {
    const response = getLlmsFull();
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await response.text()).toBe(full);
  });

  it('pins the plain-text media type for both exported files on Vercel', () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    for (const source of ['/llms.txt', '/llms-full.txt']) {
      expect(config.headers.find((rule) => rule.source === source)?.headers, source).toContainEqual({
        key: 'Content-Type',
        value: 'text/plain; charset=utf-8',
      });
    }
  });
});

describe('llms generators follow the registry', () => {
  const withFixture: LlmsInput = { ...input, articles: [...input.articles, FIXTURE] };
  const removed = input.articles[0];
  const withoutFirst: LlmsInput = { ...input, articles: input.articles.slice(1) };

  it('add a registry entry to both files', () => {
    expect(llms).not.toContain(url(FIXTURE));
    expect(full).not.toContain(url(FIXTURE));
    expect(buildLlmsTxt(withFixture)).toContain(`- [Fixture Article](${url(FIXTURE)}): ${FIXTURE.summary}`);
    const fullWith = buildLlmsFullTxt(withFixture);
    expect(fullWith).toContain(`## Fixture Article\n\nURL: ${url(FIXTURE)}\n`);
    expect(fullWith).toContain('A fixture article is a registry entry that exists only in this test.');
    expect(fullWith).toMatch(/- Its filter ran at 100 Hz on the bench \[Kalman 1960\]\(https?:\/\/[^)]+\)\./);
  });

  it('drop a removed registry entry from both files', () => {
    expect(llms).toContain(url(removed));
    expect(buildLlmsTxt(withoutFirst)).not.toContain(url(removed));
    expect(buildLlmsFullTxt(withoutFirst)).not.toContain(url(removed));
  });

  it('refuse a citation the registry does not hold', () => {
    const unknown: LlmsArticle = { ...FIXTURE, source: FIXTURE.source.replace('kalman-1960-filter', 'no-such-source') };
    expect(() => buildLlmsFullTxt({ ...input, articles: [unknown] })).toThrow(/no-such-source/);
  });
});
