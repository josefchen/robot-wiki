/**
 * rehype plugin: keep Pagefind from triplicating math in search excerpts.
 *
 * rehype-katex emits every formula as three text representations inside one
 * .katex span: the MathML markup and the application/x-tex annotation (both
 * inside .katex-mathml), plus the rendered HTML inside .katex-html. Pagefind
 * parses HTML without rendering, so it indexed all three and every excerpt
 * showed the formula three times ("dπ∗d_{\pi^*}dπ∗" on bc-foundations,
 * reported 2026-08-11). Marking ONLY .katex-mathml as data-pagefind-ignore
 * leaves exactly one representation — the rendered HTML text — in the index.
 *
 * Accessibility invariant: the MathML span is what screen readers announce
 * (KaTeX already marks .katex-html aria-hidden). data-pagefind-ignore is an
 * index-only hint with no browser or ARIA semantics, so the announcement is
 * untouched; tests/e2e/search-excerpts.spec.ts pins that contract (no
 * aria-hidden on .katex-mathml, <math> subtree intact).
 *
 * Plain ESM with no dependencies, like lib/rehype-scrollable-math.mjs:
 * next.config.ts must reference every MDX plugin by string path (Turbopack
 * cannot serialize functions), and local files resolve only by absolute
 * path. The `katex-mathml` class name is stable across both KaTeX versions
 * in this repo (rehype-katex's bundled 0.16 renders production markup;
 * top-level 0.18 is what lib/reading-time.ts renders in tests) — the 0.16
 * vs 0.18 class drift documented in library/content-pipeline.md affects
 * base/strut/sizing, not this wrapper.
 */
export default function rehypePagefindMath() {
  return (tree) => {
    const visit = (node) => {
      if (
        node.type === 'element' &&
        Array.isArray(node.properties?.className) &&
        node.properties.className.includes('katex-mathml')
      ) {
        node.properties['data-pagefind-ignore'] = 'true';
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    };
    visit(tree);
  };
}
