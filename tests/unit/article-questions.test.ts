import matter from 'gray-matter';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AzIndexPage from '@/app/a-z/page';
import { ARTICLE_QUESTIONS_HEADING, questionsForArticles } from '@/data/article-questions';
import { getCitation } from '@/data/citations';
import { articleOutline } from '@/lib/article-outline';
import { buildLlmsTxt } from '@/lib/llms';
import { registryLlmsInput } from '@/lib/llms-registry';
import { inlineCitationIds, resolveReferences } from '@/lib/references';

const input = registryLlmsInput();
const questions = questionsForArticles(input.articles);

describe('article question directory', () => {
  it('serves the same questions and destinations in reading order on the index and in llms.txt', () => {
    const index = new DOMParser().parseFromString(renderToStaticMarkup(AzIndexPage()), 'text/html');
    const section = index.querySelector('nav[aria-labelledby="article-questions"]')!;
    expect(section.querySelector('h2')?.textContent).toBe(ARTICLE_QUESTIONS_HEADING);
    const links = [...section.querySelectorAll('a')].map((a) => ({
      label: a.textContent, href: a.getAttribute('href'),
    }));
    expect(links).toEqual(questions.map(({ label, href }) => ({ label, href })));
    expect(links.map(({ label }) => label)).toEqual([
      expect.stringMatching(/Mars rovers/), expect.stringMatching(/humanoids.*whole-body/),
      expect.stringMatching(/cite.*OpenVLA/), expect.stringMatching(/PACE.*moves/),
      expect.stringMatching(/System 1 and System 2/), expect.stringMatching(/GELLO.*cost/),
      expect.stringMatching(/robot arms reach.*return to the same spot/),
      expect.stringMatching(/knowledge insulation.*training steps.*clear a table/),
      expect.stringMatching(/world model.*best on a real robot/),
      expect.stringMatching(/share of a robot dataset sale/),
    ]);
    const machineSection = buildLlmsTxt(input).split(`## ${ARTICLE_QUESTIONS_HEADING}\n\n`)[1].split('\n\n')[0];
    expect(machineSection.split('\n')).toEqual(links.map(({ label, href }) => `- [${label}](${input.siteUrl}${href})`));
  });

  it('lands each question on a published article heading or a cited paper', () => {
    for (const { href } of questions) {
      const [path, fragment] = href.split('#');
      const article = input.articles.find(({ domain, slug }) => path === `/${domain}/${slug}/`)!;
      const { content, data } = matter(article.source);
      const headings = articleOutline(content).map(({ id }) => id);
      const references = resolveReferences(data.citations, inlineCitationIds(content), getCitation)
        .filter(({ furtherReading }) => !furtherReading)
        .map(({ citation }) => `ref-${citation.id}`);
      expect([...headings, ...references], href).toContain(fragment);
    }
  });

  it('drops question links when their articles leave the published registry', () => {
    const articles = input.articles.filter(({ slug }) => slug !== 'vla-models');
    expect(questionsForArticles(articles)).toHaveLength(questions.length - 1);
    expect(buildLlmsTxt({ ...input, articles })).not.toContain('#ref-openvla-2024');
    expect(buildLlmsTxt({ ...input, articles: [] })).not.toContain(ARTICLE_QUESTIONS_HEADING);
  });
});
