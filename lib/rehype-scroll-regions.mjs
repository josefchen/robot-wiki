import {
  codeSampleRegionName,
  codeSampleTitleId,
  displayEquationRegionName,
  scrollRegionHastProperties,
} from './scroll-region.mjs';

/**
 * rehype plugin: make the two prose boxes that scroll answer for themselves.
 *
 * globals.css gives `.katex-display` `overflow-x: auto` so wide equations
 * (the MPC program, the whole-body QP) scroll instead of breaking the page
 * layout, and rehype-pretty-code gives every fenced sample the same
 * treatment plus a tab stop of its own. A scrollable region that cannot
 * receive keyboard focus is an axe `scrollable-region-focusable` violation,
 * and a region that receives focus without a name is the half-fix: the
 * keyboard reader now lands somewhere that announces nothing at all. Both
 * boxes get the whole contract here, at the source, right after
 * rehype-katex runs.
 *
 * A titled fence is named by the caption the author already wrote, so the
 * reader who reaches the box and the reader who reads the caption hear the
 * same filename; an untitled one falls back to its language and ordinal.
 *
 * Plain ESM with no dependencies: next.config.ts must reference every MDX
 * plugin by string path (Turbopack cannot serialize functions), so this
 * file stays JavaScript and walks the tree by hand.
 */
export default function rehypeScrollRegions() {
  return (tree) => {
    let displayEquations = 0;
    let codeSamples = 0;
    const named = new Set();

    const hasClass = (node, className) =>
      Array.isArray(node.properties?.className) &&
      node.properties.className.includes(className);

    /**
     * rehype-pretty-code writes its data attributes under their literal
     * hyphenated keys, while a hast tree parsed from HTML carries the
     * camelCase form. Both spellings mean the same attribute.
     */
    const dataProperty = (node, attribute) => {
      const camel = attribute
        .split('-')
        .map((part, index) =>
          index === 0 ? part : part[0].toUpperCase() + part.slice(1),
        )
        .join('');
      return node?.properties?.[attribute] ?? node?.properties?.[camel];
    };

    const childElement = (node, tagName) =>
      (node.children ?? []).find(
        (child) => child.type === 'element' && child.tagName === tagName,
      );

    /** The title bar rehype-pretty-code emits above the sample, if any. */
    const titleCaption = (figure) =>
      (figure.children ?? []).find(
        (child) =>
          child.type === 'element' &&
          child.tagName === 'figcaption' &&
          dataProperty(child, 'data-rehype-pretty-code-title') !== undefined,
      );

    const nameCodeSample = (pre, caption) => {
      codeSamples += 1;
      named.add(pre);
      const captionText = (caption?.children ?? [])
        .filter((child) => child.type === 'text')
        .map((child) => child.value)
        .join('')
        .trim();
      if (caption && captionText !== '') {
        const id = caption.properties?.id ?? codeSampleTitleId(codeSamples);
        caption.properties = { ...caption.properties, id };
        pre.properties = {
          ...pre.properties,
          ...scrollRegionHastProperties({ labelledBy: id }),
        };
        return;
      }
      pre.properties = {
        ...pre.properties,
        ...scrollRegionHastProperties({
          label: codeSampleRegionName({
            language: dataProperty(pre, 'data-language'),
            ordinal: codeSamples,
          }),
        }),
      };
    };

    const visit = (node) => {
      if (node.type === 'element') {
        if (hasClass(node, 'katex-display')) {
          displayEquations += 1;
          node.properties = {
            ...node.properties,
            ...scrollRegionHastProperties({
              label: displayEquationRegionName(displayEquations),
            }),
          };
        }
        // The figure is where the caption and the `<pre>` are visible at
        // once, so the borrowed name is resolved from here rather than from
        // the `<pre>`, which cannot see its own siblings.
        if (
          node.tagName === 'figure' &&
          dataProperty(node, 'data-rehype-pretty-code-figure') !== undefined
        ) {
          const pre = childElement(node, 'pre');
          if (pre) nameCodeSample(pre, titleCaption(node));
        }
        if (node.tagName === 'pre' && !named.has(node)) {
          nameCodeSample(node, undefined);
        }
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    };
    visit(tree);
  };
}
