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

/** The same level-two sections used by the contents rail, with their unfenced MDX. */
export function articlePassages(body: string) {
  const slugger = new GithubSlugger();
  const introduction: string[] = [];
  const sections: Array<OutlineItem & { lines: string[] }> = [];
  let lines = introduction;
  let fence: string | undefined;
  for (const line of body.split(/\r?\n/)) {
    const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (delimiter && delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length && !delimiter[2].trim()) {
        fence = undefined;
      }
      continue;
    }
    if (delimiter && !(delimiter[1][0] === '`' && delimiter[2].includes('`'))) {
      fence = delimiter[1];
      continue;
    }
    const heading = /^ {0,3}(#{1,6})(?:[ \t]+(.*))?$/.exec(line);
    if (heading) {
      const text = headingText((heading[2] ?? '').replace(/(?:^|[ \t]+)#+[ \t]*$/, ''));
      const id = slugger.slug(text);
      if (heading[1].length === 2) {
        lines = [];
        sections.push({ id, text, lines });
      }
    }
    lines.push(line);
  }
  return { introduction, sections };
}

/** Level-two headings with the same order, text and duplicate suffixes as the article. */
export function articleOutline(body: string): OutlineItem[] {
  return articlePassages(body).sections.map(({ id, text }) => ({ id, text }));
}
