import { articleOutline, headingText } from './article-outline.ts';

/** Keep only unfenced MDX, grouped by the level-two heading that introduces it. */
export function articlePassages(body: string) {
  const source = body.split(/\r?\n/);
  const introduction: string[] = [];
  const sections: Array<{ text: string; start: number; lines: string[] }> = [];
  let lines = introduction;
  let fence: string | undefined;
  for (const [start, line] of source.entries()) {
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
    const heading = /^ {0,3}##(?:[ \t]+(.*))?$/.exec(line);
    if (heading) {
      const text = headingText((heading[1] ?? '').replace(/(?:^|[ \t]+)#+[ \t]*$/, ''));
      lines = [];
      sections.push({ text, start, lines });
    }
    lines.push(line);
  }

  // Resolve the link with the reader's outline. The same title can occur twice,
  // so require that this exact source line introduces the requested fragment.
  const outline = articleOutline(body);
  function forFragment(id: string) {
    const target = outline.find((item) => item.id === id);
    if (!target) return undefined;
    return sections.find(({ text, start }) => {
      if (text !== target.text) return false;
      const before = articleOutline(source.slice(0, start).join('\n'));
      const through = articleOutline(source.slice(0, start + 1).join('\n'));
      return through.length === before.length + 1 && through.at(-1)?.id === id;
    });
  }
  return { introduction, sections, forFragment };
}
