/**
 * Reading-time derivation for the article header (architecture.md
 * section 6b).
 *
 * One documented rate, one named constant: WORDS_PER_MINUTE. The word
 * count comes from the compiled article itself (the rendered MDX module,
 * the content of the `.prose` region), never a per-article hand-tuned
 * number, and the estimate is rounded to the nearest whole minute: never
 * zero, never to a coarser marketing-friendly unit.
 *
 * The extraction mirrors what a reader actually sees, the way the
 * browser's innerText reports it: elements hidden at rest contribute
 * nothing (the HTML `hidden` attribute, Tailwind's `hidden`/`invisible`
 * utilities, inline display:none/visibility:hidden), non-rendered
 * containers contribute nothing (script, style, template, noscript, SVG
 * metadata, and the MathML `<annotation>` holding raw TeX), and elements
 * that are hidden only below a breakpoint (`hidden sm:block`) or only
 * until interaction (`group-hover:block`) count the same way they render
 * on a resting desktop page. The citation chips' hover tooltips
 * (components/ui/cite.tsx) are the main resting-hidden content in prose;
 * counting them would inflate every article by roughly 20 words per
 * citation. `aria-hidden` content still counts: innerText is
 * rendering-based, not accessibility-based, and KaTeX's visual layer is
 * aria-hidden yet visibly rendered. KaTeX formulas therefore contribute
 * both copies, once each, which is what innerText reports.
 */

/**
 * The documented reading rate: 200 words per minute. Every reading-time
 * derivation on the site (template, tests, validators) goes through this
 * constant so the estimate is reproducible and can only change in one
 * place.
 */
export const WORDS_PER_MINUTE = 200;

/** HTML elements that never render a box and never have children. */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * Elements whose whole subtree is never rendered text: script/style
 * payloads, inert templates, SVG metadata (an SVG `title` or `desc` is
 * not painted, so it is absent from innerText too), and the MathML
 * `<annotation>` that KaTeX tucks inside every formula (the raw TeX
 * source: never painted, absent from innerText, and pure double-counting
 * if included).
 */
const SKIP_TREE_TAGS = new Set([
  'script',
  'style',
  'template',
  'noscript',
  'title',
  'desc',
  'annotation',
]);

/**
 * Display utilities that make a `hidden`-classed element visible at the
 * desktop viewport or beyond. Group-state variants (group-hover:block and
 * friends) deliberately do NOT qualify: they only apply while the reader
 * is interacting, so the element is still hidden at rest.
 */
const VIEWPORT_DISPLAY =
  /^(?:sm|md|lg|xl|2xl):(?:block|flex|grid|inline|inline-block|inline-flex|inline-grid|table|flow-root|list-item)$/;
const VIEWPORT_VISIBLE = /^(?:sm|md|lg|xl|2xl):visible$/;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number(dec)),
    )
    .replace(/&([a-zA-Z]+);/g, (whole, name: string) => {
      const decoded = NAMED_ENTITIES[name.toLowerCase()];
      return decoded === undefined ? whole : decoded;
    });
}

/** True when the opening-tag markup describes an element hidden at rest. */
function hiddenAtRest(tagName: string, attrs: string): boolean {
  if (SKIP_TREE_TAGS.has(tagName)) return true;

  // The HTML hidden attribute (not data-hidden and friends). Note this
  // deliberately does NOT treat `aria-hidden` as hidden: the browser's
  // innerText is rendering-based, not accessibility-based, and reports
  // aria-hidden text too (verified against KaTeX's aria-hidden visual
  // layer). Counting it keeps the estimate aligned with innerText.
  if (/(?:^|\s)hidden(?:\s*=|\s|$)/.test(attrs)) return true;

  // Inline display:none / visibility:hidden.
  if (/style\s*=\s*"[^"]*display\s*:\s*none/i.test(attrs)) return true;
  if (/style\s*=\s*"[^"]*visibility\s*:\s*hidden/i.test(attrs)) return true;

  const classMatch = /class\s*=\s*"([^"]*)"/.exec(attrs);
  if (classMatch) {
    const tokens = classMatch[1].split(/\s+/).filter(Boolean);
    if (tokens.includes('hidden') && !tokens.some((t) => VIEWPORT_DISPLAY.test(t))) {
      return true;
    }
    if (tokens.includes('invisible') && !tokens.some((t) => VIEWPORT_VISIBLE.test(t))) {
      return true;
    }
  }
  return false;
}

interface Frame {
  name: string;
  skipped: boolean;
}

/**
 * The visible text of an HTML fragment: what a reader sees at rest on a
 * desktop viewport. Input is expected to be well-formed rendered markup
 * (react-dom/server output); text outside any skipped subtree is kept,
 * every tag boundary separates words, entities are decoded.
 *
 * Splitting at each tag boundary deliberately mirrors how innerText reads
 * this site's prose: the text-bearing inline elements here (KaTeX glyph
 * spans, citation chips, table cells, buttons) are CSS inline-block/flex
 * boxes that innerText reports as separate runs. Measured per article
 * against Chromium innerText, this stays within the reading-time
 * tolerance; the e2e header spec re-checks every published page.
 */
export function visibleTextInMarkup(markup: string): string {
  const parts: string[] = [];
  const stack: Frame[] = [];
  const skipping = () => stack.some((frame) => frame.skipped);

  let i = 0;
  const n = markup.length;
  while (i < n) {
    const lt = markup.indexOf('<', i);
    if (lt === -1) {
      if (!skipping()) parts.push(markup.slice(i));
      break;
    }
    if (lt > i && !skipping()) parts.push(markup.slice(i, lt));
    // A tag boundary always separates words, even for skipped subtrees;
    // extra whitespace is harmless to the count.
    parts.push(' ');

    if (markup.startsWith('<!--', lt)) {
      const end = markup.indexOf('-->', lt + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    const gt = markup.indexOf('>', lt);
    if (gt === -1) {
      // Malformed tail: treat the remainder as text.
      if (!skipping()) parts.push(markup.slice(lt));
      break;
    }
    const tag = markup.slice(lt + 1, gt);
    i = gt + 1;

    if (tag.startsWith('!')) continue; // doctype, CDATA markers

    if (tag.startsWith('/')) {
      const name = tag.slice(1).trim().toLowerCase();
      for (let s = stack.length - 1; s >= 0; s -= 1) {
        if (stack[s].name === name) {
          stack.splice(s, 1);
          break;
        }
      }
      continue;
    }

    const nameMatch = /^([a-zA-Z][a-zA-Z0-9-]*)/.exec(tag);
    if (!nameMatch) continue;
    const name = nameMatch[1].toLowerCase();
    const attrs = tag.slice(nameMatch[0].length);
    const selfClosing = tag.endsWith('/') || VOID_ELEMENTS.has(name);
    const skipped = skipping() || hiddenAtRest(name, attrs);
    if (!selfClosing) {
      stack.push({ name, skipped });
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Whitespace-separated token count. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => token.length > 0).length;
}

/** Visible word count of rendered markup (see visibleTextInMarkup). */
export function countVisibleWords(markup: string): number {
  return countWords(decodeEntities(visibleTextInMarkup(markup)));
}

/**
 * Estimated reading time in whole minutes at the documented rate. Rounded
 * to the nearest minute and floored at one: an existing article is never
 * a zero-minute read.
 */
export function readingTimeMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

/**
 * Word count of the authored prose in an MDX body (frontmatter already
 * stripped). This is only the FALLBACK used when data/reading-times.json
 * has no entry for the article yet (the first build pass, and `next dev`
 * before any build): the exact rendered count is measured against each
 * prerendered `.prose` region by scripts/measure-reading-times.ts between
 * the build's two passes, and the article template reads that file. The
 * fallback stays proportional to article length but intentionally ignores
 * text that only exists once components render: table cells fed from data
 * files, interactive labels, Stat and KeyValue props, and citation chip
 * labels.
 */
export function countWordsInMdxSource(body: string): number {
  const text = body
    // Module imports/exports are build plumbing, not article text.
    .replace(/^\s*(?:import|export)\b[^\n]*$/gm, ' ')
    // Fenced code: keep the code text, drop the fence lines and language
    // tags. The rendered article shows code, so it counts.
    .replace(/^```[^\n]*$/gm, ' ')
    // JSX tags drop to a space; their children survive. Attribute values
    // (labels, values, notes) are component-fed and stay excluded: the
    // postbuild measurement is what accounts for them.
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
    // Images contribute no visible prose.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // Links keep their text, lose the URL.
    .replace(/\[([^\]]*)\]\([^)]*\)/g, ' $1 ')
    // Heading, blockquote, list and hr markers.
    .replace(/^\s{0,3}#{1,6}\s+/gm, ' ')
    .replace(/^\s{0,3}>+\s?/gm, ' ')
    .replace(/^\s{0,3}[-*+]\s+/gm, ' ')
    .replace(/^\s{0,3}\d{1,3}\.\s+/gm, ' ')
    .replace(/^\s{0,3}---+\s*$/gm, ' ')
    // Table pipes and alignment rows.
    .replace(/\|/g, ' ')
    .replace(/^\s*:?-{3,}:?\s*$/gm, ' ')
    // Emphasis markers, paired forms first.
    .replace(/\*\*|__/g, ' ')
    .replace(/[*_]/g, '')
    // Display-math delimiters; the TeX itself counts (it renders as
    // roughly comparable text). Escaped markdown characters unescape.
    .replace(/\$\$/g, ' ')
    .replace(/\\([!#$%&*+,./:;<=>?@[\\\]^_`{|}~-])/g, '$1');
  return countWords(text);
}
