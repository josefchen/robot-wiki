import { describe, expect, it } from 'vitest';
import rehypeCitePunctuation from '@/lib/rehype-cite-punctuation.mjs';

/**
 * A citation is a superscript number set against the word it annotates.
 * The plugin keeps it there at build time: the space before the first chip
 * of a run is dropped, each later chip holds the space before it in a
 * whitespace-nowrap span (the last one with the sentence punctuation), and
 * a run of four or more is set in groups of three or two so a line can
 * break between groups but never starts with a lone number or a lone "."
 * (the U+2060 word joiner was tried and does NOT suppress either break in
 * Chromium).
 *
 * Changed on 15 November 2026: until then only the FINAL chip of a run was
 * bound, because chips were author-year labels and a whole run measured
 * 450 to 500px. As numbers, three chips are about 45px, and the free space
 * between them let the second or third number wrap to a line of its own at
 * 360 to 430px.
 *
 * Each group sits in a wrap-anywhere span and is not one nowrap span: one
 * nowrap span around a pair added the pair's whole width to the narrowest
 * width of its table column and widened three table frames at 360 and
 * 375px. With overflow-wrap: anywhere the group parts only in a cell too
 * narrow for it, and no column changes width.
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

/** A span as the plugin writes it. */
function span(className: string, children: HastNode[]): HastNode {
  return { type: 'element', tagName: 'span', properties: { className: [className] }, children };
}

/** One group of a run: it parts only where the line cannot hold it. */
function group(...children: HastNode[]): HastNode {
  return span('wrap-anywhere', children);
}

/** A later chip of a group, with the space before it and any punctuation. */
function held(...children: HastNode[]): HastNode {
  return span('whitespace-nowrap', children);
}

/** All spans of one class anywhere in the tree. */
function spans(node: HastNode, className: string): HastNode[] {
  const found: HastNode[] = [];
  const visit = (n: HastNode) => {
    if (
      n.type === 'element' &&
      n.tagName === 'span' &&
      Array.isArray(n.properties?.className) &&
      (n.properties.className as string[]).includes(className)
    ) {
      found.push(n);
    }
    for (const child of n.children ?? []) visit(child);
  };
  visit(node);
  return found;
}

/** All whitespace-nowrap spans anywhere in the tree. */
function wrappers(node: HastNode): HastNode[] {
  return spans(node, 'whitespace-nowrap');
}

/** All wrap-anywhere group spans anywhere in the tree. */
function groups(node: HastNode): HastNode[] {
  return spans(node, 'wrap-anywhere');
}

/** Every chip under a node, in document order. */
function chipsIn(node: HastNode): HastNode[] {
  const own = node.name === 'Cite' ? [node] : [];
  return [...own, ...(node.children ?? []).flatMap(chipsIn)];
}

/** Every text value under a node, in document order. */
function textsIn(node: HastNode): string[] {
  const own = node.type === 'text' ? [node.value ?? ''] : [];
  return [...own, ...(node.children ?? []).flatMap(textsIn)];
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

  it('keeps two chips cited together, and their punctuation, on one line', () => {
    // The space between the two numbers was a free break: the second number
    // started a line alone at 360 to 430px.
    const tree = p([
      text('Stacked '),
      cite('a'),
      text(' '),
      cite('b'),
      text(', done'),
    ]);
    run(tree);
    // Nothing breakable is left between the word and the run, and the
    // second number holds its space and the comma.
    expect(tree.children).toEqual([
      text('Stacked'),
      group(cite('a'), held(text(' '), cite('b'), text(','))),
      text(' done'),
    ]);
  });

  it('joins an adjacent (no-space) pair with one space', () => {
    // content/frontier/dexterity.mdx has this exact shape (CITECITE.).
    const tree = p([cite('a'), cite('b'), text('.')]);
    run(tree);
    // Changed in the launch review of 2026-10-15: two chips written with
    // nothing between them
    // printed their numbers as one ("⁷⁸" on /world-models/jepa/), so the
    // adjacent stack takes the space a written stack has.
    expect(tree.children).toEqual([group(cite('a'), held(text(' '), cite('b'), text('.')))]);
  });

  it('separates every chip of an adjacent stack and stays idempotent', () => {
    const tree = p([text('steer '), cite('a'), cite('b'), cite('c'), text('. Next')]);
    run(tree);
    run(tree);
    expect(tree.children).toEqual([
      text('steer'),
      group(cite('a'), held(text(' '), cite('b')), held(text(' '), cite('c'), text('.'))),
      text(' Next'),
    ]);
  });

  it('normalizes a soft line break between two chips to one space', () => {
    const tree = p([text('word '), cite('a'), text('\n'), cite('b'), text(' and prose')]);
    run(tree);
    expect(tree.children).toEqual([
      text('word'),
      group(cite('a'), held(text(' '), cite('b'))),
      text(' and prose'),
    ]);
  });

  it('treats an authored wrapper around one chip as the chip', () => {
    // The placement wrappers (<span className="block" data-*-source-placement>
    // and the max-sm tooltip offsets) left the authored space before the
    // number ("invariance ¹⁰.") and the period free to start a line.
    const wrapper: HastNode = {
      type: 'mdxJsxTextElement',
      name: 'span',
      attributes: [{ type: 'mdxJsxAttribute', name: 'className', value: 'max-sm:-left-4' }],
      children: [cite('a')],
    };
    const tree = p([text('policy invariance '), wrapper, text('. Next')]);
    run(tree);
    const wraps = wrappers(tree);
    expect(wraps).toHaveLength(1);
    expect(wraps[0].children).toEqual([wrapper, text('.')]);
    expect(tree.children).toEqual([text('policy invariance'), wraps[0], text(' Next')]);
  });

  it('closes up a wrapper that carries its own punctuation, and joins it to an adjacent chip', () => {
    const placed: HastNode = {
      type: 'mdxJsxTextElement',
      name: 'span',
      attributes: [{ type: 'mdxJsxAttribute', name: 'className', value: 'block' }],
      children: [cite('b'), text('.')],
    };
    const tree = p([text('at ten trials per setting '), cite('a'), placed, text(' Next')]);
    run(tree);
    run(tree);
    expect(tree.children).toHaveLength(3);
    expect(tree.children?.[0]).toEqual(text('at ten trials per setting'));
    // The chip and the authored wrapper are one run of two.
    const pair = tree.children?.[1];
    expect(groups(tree)).toHaveLength(1);
    expect(groups(tree)[0]).toBe(pair);
    expect(pair?.children).toHaveLength(2);
    expect(pair?.children?.[0]).toEqual(cite('a'));
    // The authored wrapper holds the space before it, as a bare chip would.
    const second = pair?.children?.[1];
    expect(wrappers(tree)[0]).toBe(second);
    expect(second?.children).toHaveLength(2);
    expect(second?.children?.[0]).toEqual(text(' '));
    expect(second?.children?.[1]).toBe(placed);
    // The chip and its period are bound inside the authored wrapper.
    const inner = wrappers(placed);
    expect(inner).toHaveLength(1);
    expect(inner[0].children).toEqual([cite('b'), text('.')]);
    expect(tree.children?.[2]).toEqual(text(' Next'));
  });

  it('leaves a wrapper that holds more than one chip or any prose alone', () => {
    const prose: HastNode = {
      type: 'mdxJsxTextElement',
      name: 'span',
      attributes: [],
      children: [text('see '), cite('a')],
    };
    const before = p([text('words '), prose, text('. tail')]);
    const tree = run(structuredClone(before));
    expect(tree.children?.[0]).toEqual(text('words '));
    expect(tree.children?.[2]).toEqual(text('. tail'));
  });

  it('keeps a run of three and its punctuation on one line', () => {
    const tree = p([
      cite('a'),
      text(' '),
      cite('b'),
      text(' '),
      cite('c'),
      text(': colon'),
    ]);
    run(tree);
    expect(tree.children).toEqual([
      group(cite('a'), held(text(' '), cite('b')), held(text(' '), cite('c'), text(':'))),
      text(' colon'),
    ]);
  });

  it.each([
    [4, [2, 2]],
    [5, [3, 2]],
    [6, [3, 3]],
    [7, [3, 2, 2]],
    [10, [3, 3, 2, 2]],
  ])(
    'sets a run of %i in groups of %j: it breaks between groups, and no chip stands alone',
    (count, sizes) => {
      // content/manipulation/rl-finetuning.mdx cites ten sources together.
      const ids = Array.from({ length: count }, (_, index) => `c${index}`);
      const tree = p([
        text('each source '),
        ...ids.flatMap((id, index) => (index === 0 ? [cite(id)] : [text(' '), cite(id)])),
        text('. Next'),
      ]);
      run(tree);
      run(tree);
      const sets = groups(tree);
      // Chips per group; the last chip of the run also holds the full stop.
      expect(sets.map((set) => chipsIn(set).length)).toEqual(sizes);
      expect(sets.at(-1)?.children?.at(-1)?.children?.at(-1)).toEqual(text('.'));
      // Inside a group: the first chip bare, each later one with its space.
      for (const set of sets) {
        const [first, ...later] = set.children ?? [];
        expect(first.name).toBe('Cite');
        for (const kid of later) {
          expect(kid.properties?.className).toEqual(['whitespace-nowrap']);
          expect(kid.children?.[0]).toEqual(text(' '));
          expect(kid.children?.[1].name).toBe('Cite');
        }
      }
      // The word, then the groups with one breakable space between them.
      expect(tree.children).toEqual([
        text('each source'),
        ...sets.flatMap((set, index) => (index === 0 ? [set] : [text(' '), set])),
        text(' Next'),
      ]);
      // Every chip is in a group, in the order written.
      expect(sets.flatMap(chipsIn)).toEqual(ids.map(cite));
    },
  );

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
    // Updated for the research-page standard of 10 October 2026: a
    // citation is a superscript set against the word it annotates, so the
    // authored space before a chip is dropped (" Mid " became " Mid").
    expect(tree.children).toEqual([wraps[0], text(' Mid'), wraps[1]]);
  });

  it('keeps a pair together when no punctuation follows it', () => {
    // A table cell that ends on two sources, or a pair mid-sentence.
    const tree = p([cite('a'), text(' '), cite('b'), text(' and prose')]);
    run(tree);
    expect(tree.children).toEqual([
      group(cite('a'), held(text(' '), cite('b'))),
      text(' and prose'),
    ]);
  });

  it('never holds two chips in one nowrap span, so a table column keeps its narrowest width', () => {
    // One nowrap span around "²¹ ³⁸" made the third table of
    // /rl-sim2real/offline-rl/ 331px wide in a 327px frame at 375px, and
    // 331px where it had been 315px at 360px. The break before the second
    // number has to stay available to the table's sizing.
    const cell = element('td', [text('IQL '), cite('a'), text(' '), cite('b')]);
    const tree = element('tr', [cell]);
    run(tree);
    expect(cell.children).toEqual([text('IQL'), group(cite('a'), held(text(' '), cite('b')))]);
    for (const wrap of wrappers(tree)) expect(chipsIn(wrap)).toHaveLength(1);
  });

  it('never puts more than three chips, or any prose, in one group', () => {
    // Regression pin for the first full-suite run: an unbounded nowrap span
    // around a stack overflowed the 375px column on generalization and
    // jepa. The bound is now three numbers and the sentence punctuation.
    const ids = Array.from({ length: 23 }, (_, index) => `c${index}`);
    const tree = p([
      text('x '.repeat(80).trimEnd() + ' '),
      ...ids.flatMap((id, index) => (index === 0 ? [cite(id)] : [text(' '), cite(id)])),
      text('. More prose after the run.'),
    ]);
    run(tree);
    const sets = groups(tree);
    expect(sets).toHaveLength(8);
    for (const set of sets) {
      const chips = chipsIn(set);
      expect(chips.length).toBeGreaterThanOrEqual(2);
      expect(chips.length).toBeLessThanOrEqual(3);
      expect(textsIn(set).every((value) => value === ' ' || value === '.')).toBe(true);
    }
    for (const wrap of wrappers(tree)) expect(chipsIn(wrap)).toHaveLength(1);
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
