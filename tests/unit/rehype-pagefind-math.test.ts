import { describe, expect, it } from 'vitest';
import rehypePagefindMath from '@/lib/rehype-pagefind-math.mjs';

/**
 * rehype-katex emits every formula as three text representations inside one
 * .katex span: the MathML markup AND the application/x-tex annotation (both
 * inside .katex-mathml), plus the rendered HTML inside .katex-html. Pagefind
 * parses HTML without rendering, so it indexed all three and search excerpts
 * triplicated every formula ("dπ∗d_{\pi^*}dπ∗", reported 2026-08-11). The
 * plugin marks ONLY the .katex-mathml span data-pagefind-ignore, so the
 * rendered HTML text is what gets indexed, exactly once.
 *
 * The accessibility contract is the other half of the spec: the MathML span
 * is what screen readers announce (KaTeX marks .katex-html aria-hidden), so
 * the plugin must add the index-only attribute and nothing else — no
 * aria-hidden, no removal, no structural change.
 */

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

function element(
  tagName: string,
  properties: Record<string, unknown> = {},
  children: HastNode[] = [],
): HastNode {
  return { type: 'element', tagName, properties, children };
}

function text(value: string): HastNode {
  return { type: 'text', value };
}

/** Mirrors the production rehype-katex output shape. */
function katexSpan(): HastNode {
  return element('span', { className: ['katex'] }, [
    element('span', { className: ['katex-mathml'] }, [
      element('math', {}, [
        element('semantics', {}, [
          element('mrow', {}, [element('mi', {}, [text('π')])]),
          element('annotation', { encoding: ['application/x-tex'] }, [
            text('\\pi'),
          ]),
        ]),
      ]),
    ]),
    element('span', { className: ['katex-html'], ariaHidden: 'true' }, [
      element('span', { className: ['base'] }, [text('π')]),
    ]),
  ]);
}

function findAll(
  node: HastNode,
  predicate: (n: HastNode) => boolean,
): HastNode[] {
  const found: HastNode[] = [];
  const visit = (n: HastNode) => {
    if (predicate(n)) found.push(n);
    for (const child of n.children ?? []) visit(child);
  };
  visit(node);
  return found;
}

describe('rehypePagefindMath', () => {
  it('marks the .katex-mathml span data-pagefind-ignore', () => {
    const tree = element('div', {}, [katexSpan()]);
    rehypePagefindMath()(tree);
    const mathml = findAll(
      tree,
      (n) =>
        Array.isArray(n.properties?.className) &&
        (n.properties.className as string[]).includes('katex-mathml'),
    );
    expect(mathml).toHaveLength(1);
    expect(mathml[0].properties?.['data-pagefind-ignore']).toBe('true');
  });

  it('leaves .katex-html untouched so the rendered text stays indexed', () => {
    const tree = element('div', {}, [katexSpan()]);
    rehypePagefindMath()(tree);
    const html = findAll(
      tree,
      (n) =>
        Array.isArray(n.properties?.className) &&
        (n.properties.className as string[]).includes('katex-html'),
    );
    expect(html).toHaveLength(1);
    expect(html[0].properties).not.toHaveProperty('data-pagefind-ignore');
    // The rendered-HTML half keeps its aria-hidden marker untouched.
    expect(html[0].properties?.ariaHidden).toBe('true');
  });

  it('never adds aria-hidden to the MathML span (screen readers read it)', () => {
    const tree = element('div', {}, [katexSpan()]);
    rehypePagefindMath()(tree);
    const mathml = findAll(
      tree,
      (n) =>
        Array.isArray(n.properties?.className) &&
        (n.properties.className as string[]).includes('katex-mathml'),
    );
    expect(mathml[0].properties).not.toHaveProperty('ariaHidden');
    expect(mathml[0].properties).not.toHaveProperty('aria-hidden');
  });

  it('reaches display math nested inside .katex-display', () => {
    const tree = element('div', {}, [
      element('span', { className: ['katex-display'], tabIndex: 0 }, [
        katexSpan(),
      ]),
    ]);
    rehypePagefindMath()(tree);
    const mathml = findAll(
      tree,
      (n) =>
        Array.isArray(n.properties?.className) &&
        (n.properties.className as string[]).includes('katex-mathml'),
    );
    expect(mathml).toHaveLength(1);
    expect(mathml[0].properties?.['data-pagefind-ignore']).toBe('true');
    // The sibling plugin's tabindex on .katex-display is preserved.
    const display = findAll(
      tree,
      (n) =>
        Array.isArray(n.properties?.className) &&
        (n.properties.className as string[]).includes('katex-display'),
    );
    expect(display[0].properties?.tabIndex).toBe(0);
  });

  it('leaves non-KaTeX elements alone', () => {
    const tree = element('div', {}, [
      element('p', { className: ['prose'] }, [text('plain prose')]),
      element('span', { className: ['not-math'] }, [text('x')]),
    ]);
    rehypePagefindMath()(tree);
    const ignored = findAll(tree, (n) =>
      Boolean(n.properties?.['data-pagefind-ignore']),
    );
    expect(ignored).toHaveLength(0);
  });
});
