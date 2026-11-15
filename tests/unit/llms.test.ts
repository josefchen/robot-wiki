import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET as getLlmsFull } from '@/app/llms-full.txt/route';
import { GET as getLlms } from '@/app/llms.txt/route';
import { SITEMAP_STANDALONE_PATHS } from '@/app/sitemap';
import { DOMAINS, publishedModules } from '@/data/modules';
import { leadParagraph } from '@/lib/article-lead';
import {
  articleKeyFacts,
  articleLead,
  buildLlmsFullTxt,
  buildLlmsTxt,
  LLMS_OPTIONAL_PATHS,
  type LlmsArticle,
  type LlmsInput,
  type LlmsPage,
} from '@/lib/llms';
import { registryLlmsInput, standalonePages } from '@/lib/llms-registry';
import { routeSeoProfile } from '@/lib/seo-profiles';
import { SITE_URL } from '@/lib/site';

const input = registryLlmsInput();
const llms = buildLlmsTxt(input);
const full = buildLlmsFullTxt(input);
const url = (a: Pick<LlmsArticle, 'domain' | 'slug'>) => `${SITE_URL}/${a.domain}/${a.slug}/`;
// An article link is /<domain>/<slug>/; a standalone page of any depth is not.
const articleLinks = (text: string) =>
  [...text.matchAll(/\]\((https:\/\/[^)]+)\)/g)]
    .map((m) => m[1])
    .filter((href) => {
      const segments = new URL(href).pathname.split('/').filter(Boolean);
      return segments.length === 2 && (DOMAINS as readonly string[]).includes(segments[0]);
    });

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
    expect(articleLinks(llms).sort()).toEqual(publishedModules().map(url).sort());
    for (const entry of publishedModules()) {
      expect(llms).toContain(`- [${entry.title}](${url(entry)}): ${entry.summary}\n`);
    }
  });

  it('lists every sitemap standalone page exactly once, in sitemap order, with its seo profile', () => {
    const at = (path: string) => llms.indexOf(`](${SITE_URL}${path}): `);
    for (const path of SITEMAP_STANDALONE_PATHS) {
      expect(llms.split(`](${SITE_URL}${path}): `), path).toHaveLength(2);
      const { title, description } = routeSeoProfile(path);
      expect(llms, path).toContain(`- [${title}](${SITE_URL}${path}): ${description}\n`);
    }
    const order = [...SITEMAP_STANDALONE_PATHS].sort((a, b) => at(a) - at(b));
    expect(order).toEqual([...SITEMAP_STANDALONE_PATHS]);
  });

  it('puts the data and tool pages after the domains and the pages about the site last, under Optional', () => {
    const sections = llms.split(/^## /m).slice(1);
    const headings = sections.map((section) => section.slice(0, section.indexOf('\n')));
    expect(headings.slice(-2)).toEqual(['Data and tools', 'Optional']);
    const links = (section: string) => [...section.matchAll(/\]\(https:\/\/[^/]+(\/[^)]*)\)/g)].map((m) => m[1]);
    const optional = SITEMAP_STANDALONE_PATHS.filter((path) => LLMS_OPTIONAL_PATHS.includes(path));
    expect(optional).toEqual([...LLMS_OPTIONAL_PATHS]);
    expect(links(sections.at(-2)!)).toEqual(SITEMAP_STANDALONE_PATHS.filter((path) => !optional.includes(path)));
    expect(links(sections.at(-1)!)).toEqual(optional);
  });

  it('names a sitemap page that has no seo profile', () => {
    expect(() => standalonePages([...SITEMAP_STANDALONE_PATHS, '/no-such-page/'])).toThrow('/no-such-page/');
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
        expect(fact, url(article)).toMatch(/ \[[^\]]+ (?:\d{4}|n\.d\.)(?:-?[a-z]+)?\]\(https?:\/\/[^)]+\)/);
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
    expect(fullWith).toMatch(/- Its filter ran at 100 Hz on the bench \[Kalman 1960b\]\(https?:\/\/[^)]+\)\./);
  });

  it('add a new sitemap page under Data and tools, before Optional', () => {
    for (const path of ['/fixture-data/', '/fixture-data/nested/']) {
      const page: LlmsPage = { path, title: 'Fixture Data', description: 'A page only this test adds.' };
      const pages = [...input.pages];
      pages.splice(pages.findIndex((entry) => LLMS_OPTIONAL_PATHS.includes(entry.path)), 0, page);
      const withPage = buildLlmsTxt({ ...input, pages: [...input.pages, page] });
      const line = `- [Fixture Data](${SITE_URL}${path}): A page only this test adds.\n`;
      const dataSection = withPage.slice(withPage.indexOf('## Data and tools\n'), withPage.indexOf('## Optional\n'));
      expect(dataSection.endsWith(`${line}\n`), path).toBe(true);
      expect(buildLlmsTxt({ ...input, pages }), path).toBe(withPage);
      expect(withPage.replace(line, ''), path).toBe(llms);
      expect(articleLinks(withPage).sort(), path).toEqual(publishedModules().map(url).sort());
    }
  });

  it('leave llms-full.txt to the articles alone', () => {
    expect(buildLlmsFullTxt({ ...input, pages: [] })).toBe(full);
    for (const path of SITEMAP_STANDALONE_PATHS) expect(full).not.toContain(`${SITE_URL}${path}`);
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
