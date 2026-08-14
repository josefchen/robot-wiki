import { describe, expect, it } from 'vitest';
import rehypeCitePunctuation from '@/lib/rehype-cite-punctuation.mjs';

/**
 * Chromium allows a line break between the atomic inline-block <Cite> chip
 * and a following plain-text punctuation node, so a line can begin with a
 * lone "." or "," (measured corpus-wide, 2026-08-12; the U+2060 word joiner
 * was tried and does NOT suppress the break — see library/content-pipeline.md).
 * The plugin wraps each chip cluster plus its immediately-following sentence
 * punctuation in a single whitespace-nowrap span at build time, so the break
 * opportunity disappears. Stacked chips (<Cite a/> <Cite b/>.) share one
 * wrapper, matching the hand-fixed precedent in content/frontier/dexterity.mdx
 * that this plugin replaces.
 */

type HastNode = {
  type: string;
  tagName?: string;
  name?: string;
  properties?: Record<string, unknown>;
  attributes?: unknown[];
  children?: HastNode[];
  value?: string;
};

/** Mirrors the hast shape MDX gives an inline <Cite id="..." /> (probed). */
function cite(id: string): HastNode {
  return {
    type: 'mdxJsxTextElement',
    name: 'Cite',
    attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: id }],
    children: [],
  };
}

function jsx(name: string): HastNode {
  return { type: 'mdxJsxTextElement', name, attributes: [], children: [] };
}

function text(value: string): HastNode {
  return { type: 'text', value };
}

function element(tagName: string, children: HastNode[] = []): HastNode {
  return { type: 'element', tagName, properties: {}, children };
}

function p(children: HastNode[]): HastNode {
  return element('p', children);
}

function run(tree: HastNode): HastNode {
  rehypeCitePunctuation()(tree);
  return tree;
}

/** All whitespace-nowrap wrapper spans anywhere in the tree. */
function wrappers(node: HastNode): HastNode[] {
  const found: HastNode[] = [];
  const visit = (n: HastNode) => {
    if (
      n.type === 'element' &&
      n.tagName === 'span' &&
      Array.isArray(n.properties?.className) &&
      (n.properties.className as string[]).includes('whitespace-nowrap')
    ) {
      found.push(n);
    }
    for (const child of n.children ?? []) visit(child);
  };
  visit(node);
  return found;
}

describe('rehypeCitePunctuation', () => {
  it('binds a chip to a trailing period mid-sentence', () => {
    const tree = p([text('A claim'), cite('a'), text('. The next sentence.')]);
    run(tree);
    const wraps = wrappers(tree);
    expect(wraps).toHaveLength(1);
    expect(wraps[0].children).toEqual([cite('a'), text('.')]);
    // The remainder of the split text node stays outside the wrapper.
    expect(tree.children).toEqual([
      text('A claim'),
      wraps[0],
      text(' The next sentence.'),
    ]);
  });

  it.each(['.', ',', ';', ':', '!', '?'])(
    'binds a chip to trailing "%s"',
    (punct) => {
      const tree = p([cite('a'), text(`${punct} tail`)]);
      run(tree);
      const wraps = wrappers(tree);
      expect(wraps).toHaveLength(1);
      expect(wraps[0].children).toEqual([cite('a'), text(punct)]);
      expect(tree.children?.[1]).toEqual(text(' tail'));
    },
  );

  it('binds a paragraph-final period without leaving an empty text node', () => {
    const tree = p([text('Ends here'), cite('a'), text('.')]);
    run(tree);
    const wraps = wrappers(tree);
    expect(wraps).toHaveLength(1);
    expect(wraps[0].children).toEqual([cite('a'), text('.')]);
    expect(tree.children).toHaveLength(2);
  });

  it('wraps stacked chips and their punctuation in ONE span', () => {
    const tree = p([
      text('Stacked'),
      cite('a'),
      text(' '),
      cite('b'),
      text(', done'),
    ]);
    run(tree);
    const wraps = wrappers(tree);
    expect(wraps).toHaveLength(1);
    expect(wraps[0].children).toEqual([
      cite('a'),
      text(' '),
      cite('b'),
      text(','),
    ]);
    expect(tree.children?.[2]).toEqual(text(' done'));
  });

  it('wraps adjacent stacked chips with no inter-chip space', () => {
    // content/frontier/dexterity.mdx has this exact shape (CITECITE.).
    const tree = p([cite('a'), cite('b'), text('.')]);
    run(tree);
    const wraps = wrappers(tree);
    expect(wraps).toHaveLength(1);
    expect(wraps[0].children).toEqual([cite('a'), cite('b'), text('.')]);
  });

  it('wraps a triple-stacked cluster in one span', () => {
    const tree = p([
      cite('a'),
      text(' '),
      cite('b'),
      text(' '),
      cite('c'),
      text(': colon'),
    ]);
    run(tree);
    const wraps = wrappers(tree);
    expect(wraps).toHaveLength(1);
    expect(wraps[0].children).toEqual([
      cite('a'),
      text(' '),
      cite('b'),
      text(' '),
      cite('c'),
      text(':'),
    ]);
  });

  it('leaves a chip followed by plain words alone', () => {
    const before = p([cite('a'), text(' and more words')]);
    const tree = run(structuredClone(before));
    expect(wrappers(tree)).toHaveLength(0);
    expect(tree).toEqual(before);
  });

  it('leaves a paragraph-final chip with no following text alone', () => {
    const before = p([text('No punct'), cite('a')]);
    const tree = run(structuredClone(before));
    expect(wrappers(tree)).toHaveLength(0);
    expect(tree).toEqual(before);
  });

  it('leaves a chip followed by another element alone', () => {
    const before = p([cite('a'), element('sup', [text('1')]), text('. x')]);
    const tree = run(structuredClone(before));
    expect(wrappers(tree)).toHaveLength(0);
    expect(tree).toEqual(before);
  });

  it('does not bind non-Cite JSX components (Term stays out of scope)', () => {
    const before = p([jsx('Term'), text('. tail')]);
    const tree = run(structuredClone(before));
    expect(wrappers(tree)).toHaveLength(0);
    expect(tree).toEqual(before);
  });

  it('is idempotent: a second run adds no nested wrappers', () => {
    const tree = p([cite('a'), text('. tail')]);
    run(tree);
    run(tree);
    const wraps = wrappers(tree);
    expect(wraps).toHaveLength(1);
    expect(wraps[0].children).toEqual([cite('a'), text('.')]);
  });

  it('reaches chips nested inside inline elements like <strong>', () => {
    const tree = p([
      element('strong', [text('Bold claim '), cite('a'), text('. More')]),
    ]);
    run(tree);
    const strong = tree.children?.[0];
    const wraps = wrappers(tree);
    expect(wraps).toHaveLength(1);
    expect(strong?.children?.[1]).toBe(wraps[0]);
    expect(strong?.children?.[2]).toEqual(text(' More'));
  });

  it('wraps two clusters in one paragraph independently', () => {
    const tree = p([
      cite('a'),
      text('. Mid '),
      cite('b'),
      text(';'),
    ]);
    run(tree);
    const wraps = wrappers(tree);
    expect(wraps).toHaveLength(2);
    expect(wraps[0].children).toEqual([cite('a'), text('.')]);
    expect(wraps[1].children).toEqual([cite('b'), text(';')]);
    expect(tree.children).toEqual([wraps[0], text(' Mid '), wraps[1]]);
  });

  it('does not wrap a chip cluster whose last chip has no punctuation', () => {
    const before = p([cite('a'), text(' '), cite('b'), text(' and prose')]);
    const tree = run(structuredClone(before));
    expect(wrappers(tree)).toHaveLength(0);
    expect(tree).toEqual(before);
  });

  it('binds punctuation separated from the chip by a soft line break', () => {
    // MDX turns an author newline between chip and punctuation into a
    // whitespace-leading text node; Chromium renders it as a space, which is
    // still a break opportunity that would orphan the punctuation.
    const tree = p([cite('a'), text('\n. tail')]);
    run(tree);
    const wraps = wrappers(tree);
    expect(wraps).toHaveLength(1);
    expect(wraps[0].children).toEqual([cite('a'), text('\n.')]);
    expect(tree.children?.[1]).toEqual(text(' tail'));
  });
});
