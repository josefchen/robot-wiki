import matter from 'gray-matter';

/**
 * The opening paragraph of an article, read from its MDX source, and the
 * verbatim excerpt of it that the home page features.
 *
 * The excerpt has to be found word for word in the rendered lead, so it is
 * built only from whole sentences whose rendered text equals their source
 * text once inline markup is unwrapped. A sentence carrying a citation chip,
 * mathematics or any component other than a glossary term renders extra or
 * different text, so it ends the excerpt instead of being rewritten.
 */

const BLOCKED = '\u0000';

const ABBREVIATION = /(?:\b(?:e\.g|i\.e|et al|vs|approx|cf|Fig|Eq|Dr|Mr|Ms|No|St|Inc|Ltd|Corp)|\b[A-Z](?:\.[A-Z])+)\.$/;

// A paragraph opens with a capital, a figure, a quotation, a link, emphasis
// or a glossary term. A block opening in lower case continues a sentence
// that display mathematics interrupted, so it is not a lead.
function isProseBlock(block: string): boolean {
  return /^(?:[A-Z0-9"“‘(]|\[|\*|_|<Term\b)/.test(block.trimStart());
}

/** The first prose paragraph of the body, joined onto one line. */
export function leadParagraph(source: string): string | null {
  const body = matter(source).content;
  const blocks = body
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((line) => line.trim()).join(' ').trim())
    .filter((block) => block.length > 0 && !/^(?:import|export)\s/.test(block))
    // A component mounted above the opening paragraph is not part of it.
    .filter((block) => !/^<(?!Term\b)/.test(block));
  const first = blocks[0];
  return first && isProseBlock(first) ? first : null;
}

/**
 * The paragraph as the reader sees it: glossary terms and links reduced to
 * their text, emphasis removed. Anything whose rendered text differs from
 * its source is replaced by a marker that disqualifies its sentence.
 */
export function renderedLeadText(paragraph: string): string {
  return paragraph
    .replace(/<Cite\b[^>]*\/>/g, BLOCKED)
    .replace(/<Term\b[^>]*>([^<]*)<\/Term>/g, '$1')
    .replace(/<Term\b[^>]*\/>/g, BLOCKED)
    .replace(/<\/?[A-Za-z][^>]*>/g, BLOCKED)
    .replace(/\$[^$]*\$/g, BLOCKED)
    .replace(/`[^`]*`/g, BLOCKED)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^\w*])\*([^*\s][^*]*)\*(?=[^\w*]|$)/g, '$1$2')
    .replace(/(^|[^\w])_([^_\s][^_]*)_(?=[^\w]|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sentences in reading order; a stop after an abbreviation does not end one. */
export function sentences(text: string): string[] {
  const result: string[] = [];
  let start = 0;
  const boundary = /[.!?]["”’)]?(?=\s+["“(]?[A-Z0-9])/g;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(text))) {
    const end = match.index + match[0].length;
    const candidate = text.slice(start, end).trim();
    if (ABBREVIATION.test(text.slice(start, match.index + 1))) continue;
    result.push(candidate);
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) result.push(rest);
  return result;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Whole leading sentences of the lead, as many as fit in `maxWords`, or
 * null when the first sentence alone cannot be featured verbatim.
 */
export function leadExcerpt(source: string, maxWords: number): string | null {
  const paragraph = leadParagraph(source);
  if (!paragraph) return null;
  const picked: string[] = [];
  let words = 0;
  for (const sentence of sentences(renderedLeadText(paragraph))) {
    const count = wordCount(sentence);
    if (sentence.includes(BLOCKED) || words + count > maxWords) break;
    picked.push(sentence);
    words += count;
  }
  return picked.length > 0 ? picked.join(' ') : null;
}
