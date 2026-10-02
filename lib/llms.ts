import matter from 'gray-matter';
import { leadParagraph, sentences } from './article-lead.ts';

/**
 * The two plain-text maps of the site that `/llms.txt` and `/llms-full.txt`
 * serve. Both are generated at build time from the registry, so an article
 * added to or removed from `data/modules.ts` appears in or leaves both files
 * on the next build; nothing here is maintained by hand.
 */

export interface LlmsCitation {
  label: string;
  title: string;
  url: string;
}

export interface LlmsArticle {
  domain: string;
  slug: string;
  title: string;
  summary: string;
  /** The article's MDX source, front matter included. */
  source: string;
}

export interface LlmsInput {
  siteUrl: string;
  siteName: string;
  descriptor: string;
  domains: ReadonlyArray<{ id: string; name: string; description: string }>;
  articles: readonly LlmsArticle[];
  citation: (id: string) => LlmsCitation | undefined;
}

/** How many cited, numeric sentences llms-full.txt keeps per article. */
export const KEY_FACTS_PER_ARTICLE = 5;

const CITE = /<Cite\b[^>]*\bid="([^"]+)"[^>]*\/>/g;
const MARKER = /\u0001([^\u0002]+)\u0002/g;
const HAS_MARKER = /\u0001[^\u0002]+\u0002/;

function articleUrl(input: LlmsInput, article: LlmsArticle): string {
  return `${input.siteUrl}/${article.domain}/${article.slug}/`;
}

/** Prose with inline markup unwrapped and each citation kept as a marker. */
function proseText(block: string): string {
  return block
    .replace(CITE, (_, id: string) => `\u0001${id}\u0002`)
    .replace(/<Term\b[^>]*>([\s\S]*?)<\/Term>/g, '$1')
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^\w*])\*([^*\s][^*]*)\*(?=[^\w*]|$)/g, '$1$2')
    .replace(/(^|[^\w])_([^_\s][^_]*)_(?=[^\w]|$)/g, '$1$2')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A sentence with its citation markers replaced by Markdown source links. */
function withSources(input: LlmsInput, text: string): { text: string; cited: number } {
  let cited = 0;
  const rendered = text.replace(MARKER, (_, id: string) => {
    const source = input.citation(id);
    if (!source) throw new Error(`llms: <Cite id="${id}" /> is not in the citation registry`);
    cited += 1;
    return ` [${source.label}](${source.url})`;
  });
  return { text: rendered.replace(/\s+([.,;:])/g, '$1').replace(/\s+/g, ' ').trim(), cited };
}

/** Top-level prose paragraphs of the body, in reading order. */
function proseBlocks(source: string): string[] {
  return matter(source)
    .content.replace(/```[\s\S]*?```/g, '')
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((line) => line.trim()).join(' ').trim())
    .filter((block) => /^(?:[A-Z0-9"“‘(]|\*\*?[A-Z]|<Term\b)/.test(block))
    .filter((block) => !/^(?:import|export)\s/.test(block));
}

/** The lead paragraph with its sources, as llms-full.txt prints it. */
export function articleLead(input: LlmsInput, article: LlmsArticle): string {
  const lead = leadParagraph(article.source);
  if (!lead) throw new Error(`llms: ${article.domain}/${article.slug} has no lead paragraph`);
  return withSources(input, proseText(lead)).text;
}

/**
 * Key facts: the first body sentences after the lead that state a number
 * and cite a source, each printed with the sources it cites.
 */
export function articleKeyFacts(input: LlmsInput, article: LlmsArticle): string[] {
  const lead = leadParagraph(article.source);
  const facts: string[] = [];
  for (const block of proseBlocks(article.source)) {
    if (block === lead) continue;
    for (const sentence of sentences(proseText(block))) {
      if (!HAS_MARKER.test(sentence) || !/\d/.test(sentence.replace(MARKER, ''))) continue;
      facts.push(withSources(input, sentence).text);
      if (facts.length === KEY_FACTS_PER_ARTICLE) return facts;
    }
  }
  return facts;
}

/** `/llms.txt`: every domain and published article with a one-line summary. */
export function buildLlmsTxt(input: LlmsInput): string {
  const lines = [`# ${input.siteName}`, '', `> ${input.descriptor}`, ''];
  lines.push(
    `Every article cites its primary sources inline. The full digest of leads and key facts is at ${input.siteUrl}/llms-full.txt.`,
    '',
  );
  for (const domain of input.domains) {
    lines.push(`## ${domain.name}`, '');
    lines.push(`- [${domain.name}](${input.siteUrl}/${domain.id}/): ${domain.description}`);
    for (const article of input.articles.filter((entry) => entry.domain === domain.id)) {
      lines.push(`- [${article.title}](${articleUrl(input, article)}): ${article.summary}`);
    }
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

/** `/llms-full.txt`: each published article's lead and key facts with sources. */
export function buildLlmsFullTxt(input: LlmsInput): string {
  const lines = [`# ${input.siteName}: leads and key facts`, '', `> ${input.descriptor}`, ''];
  for (const domain of input.domains) {
    for (const article of input.articles.filter((entry) => entry.domain === domain.id)) {
      lines.push(`## ${article.title}`, '');
      lines.push(`URL: ${articleUrl(input, article)}`, `Domain: ${domain.name}`, '');
      lines.push(articleLead(input, article), '');
      const facts = articleKeyFacts(input, article);
      if (facts.length > 0) {
        lines.push('Key facts:', ...facts.map((fact) => `- ${fact}`), '');
      }
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
