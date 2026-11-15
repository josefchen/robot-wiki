/**
 * rehype plugin: keep a citation's number with its sentence.
 *
 * A citation renders as a superscript number set against the word it
 * annotates ("late¹²"). Left alone, a line can start with a lone number or
 * a lone full stop. The joins that prevent it are made here, at the hast
 * stage, because each depends on a chip's neighbours, which the chip cannot
 * see:
 *
 * 1. The authored space between the annotated word and the first chip is
 *    dropped, so the number cannot leave its word.
 * 2. Chips cited together (`<Cite a/> <Cite b/>`) form a run, with one
 *    space between numbers so they never fuse ("⁷⁸" reads as 78). Each
 *    number after the first sits in a `<span class="whitespace-nowrap">`
 *    with the space before it, so that space is no longer a place to break.
 *    A run of four or more is set in groups of three, or of two where a
 *    single chip would be left over (4 is 2 + 2, 7 is 3 + 2 + 2): it may
 *    break between groups, and no number starts a line alone. Before this,
 *    the second or third number of a run wrapped to a line of its own on
 *    phones (measured on the built pages at 360 to 430px).
 * 3. Each group sits in a `<span class="wrap-anywhere">`. A group held by
 *    `white-space: nowrap` alone counts whole towards the narrowest width a
 *    table column can take, and it widened three table frames that had no
 *    room to give at 360 and 375px. `overflow-wrap: anywhere` breaks the
 *    group before a number only where the line cannot hold the word and its
 *    numbers at all, and counts that break when a column is sized: every
 *    column keeps the width it had, and a pair parts only in a cell too
 *    narrow for it. The space then falls at the line start and collapses,
 *    so the parted number sits flush.
 * 4. The sentence punctuation after the last chip (. , ; : ! ?) joins that
 *    chip's nowrap span, with any whitespace before it: a soft line break
 *    between chip and punctuation renders as a space, which is a break
 *    opportunity. The rest of the sentence stays a normal text node.
 *
 * A single chip with no punctuation after it is left untouched, as are
 * non-Cite components.
 *
 * A word joiner (U+2060) does not hold a number or a full stop in Chromium;
 * `white-space: nowrap` on a shared span does, and it adds nothing to the
 * text a reader copies.
 *
 * Idempotent: a span this plugin created is never bound again, so a second
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

const ONLY_SPACE = /^\s+$/;

function isCiteChip(node) {
  return node.type === 'mdxJsxTextElement' && node.name === 'Cite';
}

function hasClass(node, name) {
  return (
    node.type === 'element' &&
    node.tagName === 'span' &&
    Array.isArray(node.properties?.className) &&
    node.properties.className.includes(name)
  );
}

function isNowrapWrapper(node) {
  return hasClass(node, 'whitespace-nowrap');
}

/** A span this plugin created: a nowrap span, or the group around a run. */
function isBound(node) {
  return isNowrapWrapper(node) || hasClass(node, 'wrap-anywhere');
}

function span(className, children) {
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: [className] },
    children,
  };
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

/**
 * How many chips each unbreakable group of a run holds: threes, with the
 * tail rebalanced so that no group is a single chip.
 */
function citeGroupSizes(count) {
  const sizes = [];
  let left = count;
  while (left > 4) {
    sizes.push(3);
    left -= 3;
  }
  if (left === 4) sizes.push(2, 2);
  else if (left > 0) sizes.push(left);
  return sizes;
}

export default function rehypeCitePunctuation() {
  const bindClusters = (parent) => {
    const children = parent.children;
    const out = [];
    let i = 0;
    while (i < children.length) {
      const first = children[i];
      if (!isCiteUnit(first)) {
        out.push(first);
        i++;
        continue;
      }

      // The number is set against the word it annotates ("late¹²"), so the
      // authored space between that word and the run's first chip is dropped.
      const previous = out[out.length - 1];
      if (previous?.type === 'text' && /\S\s+$/.test(previous.value)) {
        out[out.length - 1] = { ...previous, value: previous.value.replace(/\s+$/, '') };
      } else if (
        previous?.type === 'text' &&
        ONLY_SPACE.test(previous.value) &&
        out.length > 1 &&
        !isBound(out[out.length - 2])
      ) {
        // The annotated run is an element (inline math, a link, a term):
        // the space-only text node between it and the chip goes.
        out.pop();
      }

      // The run: this chip and each chip after it with nothing but
      // whitespace, or nothing at all, in between.
      const run = [first];
      i++;
      for (;;) {
        const next = children[i];
        const afterSpace = children[i + 1];
        if (next && isCiteUnit(next)) {
          run.push(next);
          i += 1;
        } else if (
          next?.type === 'text' &&
          ONLY_SPACE.test(next.value) &&
          afterSpace &&
          isCiteUnit(afterSpace)
        ) {
          run.push(afterSpace);
          i += 2;
        } else {
          break;
        }
      }

      // Sentence punctuation after the last chip; the rest of that text
      // node stays outside the wrapper.
      const after = children[i];
      const match = after?.type === 'text' ? after.value.match(LEADING_PUNCT) : null;
      const punct = match ? match[1] : null;
      const rest = match ? after.value.slice(punct.length) : '';
      if (match) i++;

      if (run.length === 1 && punct === null) {
        out.push(first);
        continue;
      }

      if (run.length === 1) {
        out.push(span('whitespace-nowrap', [first, { type: 'text', value: punct }]));
        if (rest) out.push({ type: 'text', value: rest });
        continue;
      }

      const sizes = citeGroupSizes(run.length);
      let taken = 0;
      sizes.forEach((size, index) => {
        const units = run.slice(taken, taken + size);
        taken += size;
        const closesRun = index === sizes.length - 1;
        // The first number stands against its word. Each later one holds
        // the space before it, so two never read as one and none starts a
        // line; the last also holds the sentence punctuation.
        const group = units.map((unit, at) => {
          if (at === 0) return unit;
          const held = [{ type: 'text', value: ' ' }, unit];
          if (closesRun && at === units.length - 1 && punct !== null) {
            held.push({ type: 'text', value: punct });
          }
          return span('whitespace-nowrap', held);
        });
        // A line may break between groups. Inside one it breaks only where
        // the line is too narrow for the word and its numbers.
        if (index > 0) out.push({ type: 'text', value: ' ' });
        out.push(span('wrap-anywhere', group));
      });
      if (rest) out.push({ type: 'text', value: rest });
    }
    parent.children = out;
  };

  const visit = (node) => {
    if (!node || !Array.isArray(node.children)) return;
    // A span this plugin created is never bound again (idempotency). An
    // authored wrapper inside it still gets its own chip and punctuation
    // bound.
    if (!isBound(node)) bindClusters(node);
    for (const child of node.children) visit(child);
  };

  return (tree) => {
    visit(tree);
  };
}
