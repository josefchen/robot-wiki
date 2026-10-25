import GithubSlugger from 'github-slugger';

export type OutlineItem = { id: string; text: string };

/**
 * The id the template gives the start of an article body, so the contents
 * rail can offer "Introduction" for the text before the first section.
 */
export const ARTICLE_START_ID = 'article-start';

const ESCAPABLE = '\\`*_{}[]()#+-.!$';
// Private-use stand-ins keep an escaped character out of the math and
// emphasis rules: `\$122 to \$70,000` is two literal dollars, not a math span.
const hold = (char: string) => String.fromCodePoint(0xe000 + ESCAPABLE.indexOf(char));
const HELD = new RegExp(`[\\u{E000}-\\u{${(0xe000 + ESCAPABLE.length - 1).toString(16)}}]`, 'gu');

/** Markdown and MDX inline syntax reduced to the text a heading renders. */
export function headingText(source: string): string {
  return source
    .replace(/\\([\\`*_{}[\]()#+\-.!$])/g, (_, char: string) => hold(char))
    .replace(/<([A-Z][\w.]*)\b[^>]*\/>/g, '')
    .replace(/<\/?[A-Za-z][\w.]*\b[^>]*>/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(HELD, (char) => ESCAPABLE[char.codePointAt(0)! - 0xe000])
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The section outline of an MDX body: every level-2 heading with the id
 * rehype-slug gives it. The slugger is shared across every heading level,
 * as rehype-slug's is, so a repeated title gets the same `-1` suffix here
 * as in the rendered page. Fenced code is skipped. The rail re-reads the
 * rendered headings after hydration, so a heading whose rendered text this
 * reduction misses still lands on the right id.
 */
export function articleOutline(body: string): OutlineItem[] {
  const slugger = new GithubSlugger();
  const items: OutlineItem[] = [];
  let fence: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    const fenceMatch = /^\s*(```+|~~~+)/.exec(line);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!heading) continue;
    const text = headingText(heading[2]);
    const id = slugger.slug(text);
    if (heading[1].length === 2) items.push({ id, text });
  }
  return items;
}
