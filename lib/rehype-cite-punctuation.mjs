/**
 * rehype plugin: bind a citation chip to its trailing punctuation.
 *
 * The <Cite> chip renders as an atomic inline-block, and Chromium allows a
 * line break between an atomic inline and the following plain-text node, so
 * `<Cite id="x" />.` can render the period alone at the start of the next
 * line. The defect is viewport-dependent and corpus-wide: 647 chip-plus-
 * punctuation cluster-ends across all 35 published articles (ripgrep count,
 * 2026-08-14). Two alternatives were measured and ruled out before this
 * plugin (see library/content-pipeline.md): the U+2060 word joiner does NOT
 * suppress the break in Chromium, and white-space on the chip itself cannot
 * bind it to a sibling text node.
 *
 * The fix, at the hast stage: wrap each chip and the leading punctuation of
 * the text node that follows it in a `<span class="whitespace-nowrap">`.
 * Only the leading punctuation run is pulled into the wrapper; the rest of
 * the sentence stays a normal text node. Chips with no trailing punctuation
 * are untouched, as are non-Cite components.
 *
 * In a stacked cluster (`<Cite a/> <Cite b/>.`) only the FINAL chip is bound
 * to the punctuation. A break between two chips starts the next line with a
 * chip, which is not an orphan, and wrapping the whole stack in one nowrap
 * span produced 452-494px unbreakable boxes that overflowed the 375px prose
 * column (measured on /frontier/generalization and /world-models/jepa in the
 * first full-suite run, 2026-08-14). One chip plus one punctuation mark is
 * always narrow enough (worst labels measure ~250px against a ~343px
 * column). This supersedes the hand-fixed precedent in
 * content/frontier/dexterity.mdx (32 wrappers, stripped when this plugin
 * landed), which wrapped stacked chips together.
 *
 * The punctuation set is the sentence/clause-final class: . , ; : ! ?
 * (the corpus uses the first four; the last two cost nothing and prevent
 * the same orphan). A soft line break between chip and punctuation renders
 * as a space in Chromium — still a break opportunity — so leading
 * whitespace is pulled into the wrapper with the punctuation.
 *
 * Idempotent: the walker never recurses into a span it created, so a second
 * run cannot nest wrappers.
 *
 * Plain ESM with no dependencies, like lib/rehype-scrollable-math.mjs and
 * lib/rehype-pagefind-math.mjs: next.config.ts must reference every MDX
 * plugin by string path (Turbopack cannot serialize functions), and local
 * files resolve only by absolute path. No interaction with rehype-katex or
 * rehype-pretty-code (chips never occur inside math or code); it is
 * registered with the other local plugins, after rehype-katex.
 */

// Leading run of optional whitespace plus sentence/clause-final punctuation.
const LEADING_PUNCT = /^(\s*[.,;:!?]+)/;

function isCiteChip(node) {
  return node.type === 'mdxJsxTextElement' && node.name === 'Cite';
}

function isNowrapWrapper(node) {
  return (
    node.type === 'element' &&
    node.tagName === 'span' &&
    Array.isArray(node.properties?.className) &&
    node.properties.className.includes('whitespace-nowrap')
  );
}

export default function rehypeCitePunctuation() {
  const bindClusters = (parent) => {
    const children = parent.children;
    const out = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const next = children[i + 1];
      if (isCiteChip(child) && next?.type === 'text') {
        const match = next.value.match(LEADING_PUNCT);
        if (match) {
          const punct = match[1];
          const rest = next.value.slice(punct.length);
          out.push({
            type: 'element',
            tagName: 'span',
            properties: { className: ['whitespace-nowrap'] },
            children: [child, { type: 'text', value: punct }],
          });
          if (rest) out.push({ type: 'text', value: rest });
          i++; // the text node was consumed (split) above
          continue;
        }
      }
      out.push(child);
    }
    parent.children = out;
  };

  const visit = (node) => {
    if (!node || !Array.isArray(node.children)) return;
    // Never recurse into a wrapper this plugin created (idempotency).
    if (isNowrapWrapper(node)) return;
    bindClusters(node);
    for (const child of node.children) visit(child);
  };

  return (tree) => {
    visit(tree);
  };
}
