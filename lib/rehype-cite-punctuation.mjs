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
 * Plain ESM with no dependencies, like lib/rehype-scroll-regions.mjs and
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

/**
 * An authored `<span ...><Cite id="x" /></span>` around one chip: the
 * placement and tooltip-offset wrappers from the chip-and-tooltip citations
 * (for example `data-jepa-source-placement`). It holds the chip, optionally
 * its own punctuation, and nothing else, so it sits in the sentence exactly
 * as the bare chip would and takes the same spacing and binding.
 */
function isCiteWrapper(node) {
  if (node.type !== 'mdxJsxTextElement' || node.name !== 'span') return false;
  const kids = (node.children ?? []).filter(
    (kid) => !(kid.type === 'text' && /^\s*$/.test(kid.value)),
  );
  const [first, second] = kids;
  if (!first) return false;
  const chip =
    isCiteChip(first) ||
    (isNowrapWrapper(first) && first.children?.length > 0 && isCiteChip(first.children[0]));
  if (!chip) return false;
  if (kids.length === 1) return true;
  return kids.length === 2 && isCiteChip(first) && second.type === 'text' && /^\s*[.,;:!?]+$/.test(second.value);
}

/** A chip, or an authored wrapper that holds one chip. */
function isCiteUnit(node) {
  return isCiteChip(node) || isCiteWrapper(node);
}

export default function rehypeCitePunctuation() {
  const bindClusters = (parent) => {
    const children = parent.children;
    const out = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const next = children[i + 1];
      // A citation renders as a superscript number set against the word it
      // annotates ("late¹²"), so the authored space between that word and
      // the chip is dropped. A space between two stacked chips stays, so
      // their numbers never fuse into one.
      const previous = out[out.length - 1];
      if (isCiteUnit(child) && previous?.type === 'text' && /\S\s+$/.test(previous.value)) {
        out[out.length - 1] = { ...previous, value: previous.value.replace(/\s+$/, '') };
      } else if (
        isCiteUnit(child) &&
        previous?.type === 'text' &&
        /^\s+$/.test(previous.value) &&
        out.length > 1 &&
        !isCiteUnit(out[out.length - 2]) &&
        !isNowrapWrapper(out[out.length - 2])
      ) {
        // The annotated run is an element (inline math, a link, a term):
        // the space-only text node between it and the chip goes.
        out.pop();
      } else if (isCiteUnit(child) && previous && isCiteUnit(previous)) {
        // Two chips written with nothing between them ("<Cite a/><Cite b/>")
        // would print their numbers as one ("⁷⁸" reads as 78), so they take
        // the same space as a stack written with one.
        out.push({ type: 'text', value: ' ' });
      }
      if (isCiteUnit(child) && next?.type === 'text') {
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
