import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { questionsForArticles } from '@/data/article-questions';
import { articleOutline } from '@/lib/article-outline';
import { buildLlmsFullTxt, type LlmsArticle } from '@/lib/llms';
import { articlePassages } from '@/lib/llms-passages';
import { registryLlmsInput } from '@/lib/llms-registry';

const input = registryLlmsInput();
const full = buildLlmsFullTxt(input);

describe('question sources in llms-full.txt', () => {
  it('resolves every published outline fragment to the corresponding passage in source order', () => {
    for (const article of input.articles) {
      const { content } = matter(article.source);
      const { sections, forFragment } = articlePassages(content);
      const outline = articleOutline(content);
      expect(sections, article.slug).toHaveLength(outline.length);
      for (const [index, heading] of outline.entries()) {
        expect(forFragment(heading.id), `${article.slug}#${heading.id}`).toBe(sections[index]);
      }
    }
  });

  it('connects the published answers to their primary sources, preserving the selected source versions', () => {
    const ids = ['enav-perseverance-2026', 'asap-2025', 'openvla-2024', 'pace-2026', 'helix-2025', 'gello-2023'];
    const questions = questionsForArticles(input.articles);
    // A reader that only downloads the start of the digest can still follow every question.
    const sourceGuide = full.slice(0, full.indexOf('\n## '));
    expect(questions).toHaveLength(ids.length);
    for (const [i, { href, label }] of questions.entries()) {
      const source = input.citation(ids[i])!;
      const block = sourceGuide.split(`Sources for [${label}](${input.siteUrl}${href})\n`)[1].split('\n\n')[0];
      const note = `${input.siteUrl}${href.split('#')[0]}#ref-${ids[i]}`;
      expect(block).toContain(`- [${source.label}](${note}). [${source.title}](${source.url})`);
      expect(full).toContain(`[All references for this article](${input.siteUrl}${href.split('#')[0]}#references-heading)`);
    }
  });

  const chunking = input.articles.find((a) => a.slug === 'action-chunking')!;
  const article = (source: string): LlmsArticle => ({
    ...chunking,
    source: [
      '---',
      'citations: [pace-2026, asap-2025]',
      '---',
      'A timing study asks when to plan again.',
      source,
    ].join('\n\n'),
  });
  const section = '## Chunk size trades error against reaction time';

  it('keeps cited sources from that passage only, skips sample code and prints a repeated source once', () => {
    const fixture = article([
      '```md', section, '<Cite id="asap-2025" />', '````',
      '~~~md', section, '<Cite id="asap-2025" />', '~~~~',
      section, 'The study <Cite id="pace-2026" /> is cited twice <Cite id=\'pace-2026\' />.',
      'An example of markup is `<Cite id="asap-2025" />`.',
      '##', 'An untitled section cites <Cite id="asap-2025" />.',
      '## A different experiment', 'Another lab <Cite id="asap-2025" />.',
    ].join('\r\n'));
    const block = buildLlmsFullTxt({ ...input, articles: [fixture] }).split('Sources for ')[1];
    expect(block.match(/2606\.00537v3/g)).toHaveLength(1);
    expect(block).not.toContain(input.citation('asap-2025')!.url);
  });

  it('reports a missing passage or unresolved citation and omits the section from other articles', () => {
    const render = (body: string) => buildLlmsFullTxt({ ...input, articles: [article(body)] });
    expect(() => render('## Elsewhere\nNo study here.')).toThrow(/no cited source/);
    // A short delimiter inside a longer fence makes the legacy rail miss the real heading.
    const ambiguous = ['````md', '```', '````', section, 'A study <Cite id="pace-2026" />.'];
    expect(() => render(ambiguous.join('\r\n'))).toThrow(/no cited source/);
    expect(() => render(section + '\nA study <Cite id="unknown" />.')).toThrow(/unresolved citation "unknown"/);
    const other = { ...article(section + '\nNothing to cite.'), slug: 'unlisted-article' };
    expect(buildLlmsFullTxt({ ...input, articles: [other] })).not.toContain('Sources for ');
  });

  it('binds repeated titles to the exact anchor, including suffixes shared with lower-level headings', () => {
    const body = ['### Same', '## Same', 'First.', '## Same', 'Second.'].join('\n');
    const { forFragment } = articlePassages(body);
    expect(forFragment('same')).toBeUndefined();
    expect(forFragment('same-1')?.lines).toEqual(['## Same', 'First.']);
    expect(forFragment('same-2')?.lines).toEqual(['## Same', 'Second.']);
  });
});
