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
 * metadata, and the MathML `<annotation>` holding raw TeX), a closed
 * `<details>` contributes its `<summary>` and nothing else (an open one
 * counts in full, and a nested one is judged on its own `open` state
 * rather than inheriting its parent's, which is what innerText does), and elements
 * that are hidden only below a breakpoint (`hidden sm:block`) or only
 * until interaction (`group-hover:block`) count the same way they render
 * on a resting desktop page. The citation chips' hover tooltips
 * (components/ui/cite.tsx) are the main resting-hidden content in prose;
 * counting them would inflate every article by roughly 20 words per
 * citation. `aria-hidden` content still counts: innerText is
 * rendering-based, not accessibility-based, and KaTeX's visual layer is
 * aria-hidden yet visibly rendered. KaTeX formulas therefore contribute
 * both copies, once each, which is what innerText reports.
 *
 * One refinement inside KaTeX: the two rendered layers tokenize
 * differently under innerText. The clipped MathML layer (`.katex-mathml`
 * is position:absolute at 1px, so every element wraps onto its own line)
 * reports one token per mi/mo/mn, which a per-tag split already matches.
 * The visual layer (`.katex-html`) is normal inline flow: innerText fuses
 * runs of plain inline atom spans ("bel(x" is one token) and breaks only
 * at the positioning boxes (vlist tables, script-size sizing blocks,
 * accent bodies) that carry scripts, fractions and accents. A per-tag
 * split there counted every glyph span separately and overcounted the
 * math-heavy classical modules by up to ~160 words against Chromium
 * innerText (classical/control, measured 2026-08-11), so inside
 * `.katex-html` — and nowhere else — inline atom runs merge.
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

/**
 * KaTeX visual-layer classes whose spans are plain inline runs for
 * innerText: the TeX atom types, delimiter sizings, array column
 * wrappers, the per-segment `base` wrapper (one formula can stack several
 * bases and innerText fuses straight across them), and the always-empty
 * spacing/strut boxes. KaTeX always puts the atom type first in the class
 * list (font and size classes follow), and TeX's atom taxonomy is closed,
 * so matching the first token is stable. Both naming generations are
 * listed: the site renders through rehype-katex's bundled katex 0.16
 * (`base`, `strut`, `sizing`) while the top-level katex 0.18 prefixes
 * them (`katex-base`, `katex-strut`, `katex-sizing`). Everything else
 * inside `.katex-html` (vlist tables, sizing blocks, accent bodies, svg)
 * separates words, mirroring the line breaks innerText emits for those
 * positioning boxes.
 */
const KATEX_HTML_FUSE_CLASSES = new Set([
  'mord',
  'mbin',
  'mrel',
  'mopen',
  'mclose',
  'mpunct',
  'minner',
  'mop',
  'delimsizing',
  'col-align-c',
  'col-align-l',
  'col-align-r',
  'mspace',
  'strut',
  'pstrut',
  'base',
  'katex-base',
  'katex-strut',
]);

function classTokensOf(attrs: string): string[] {
  const classMatch = /class\s*=\s*"([^"]*)"/.exec(attrs);
  if (!classMatch) return [];
  return classMatch[1].split(/\s+/).filter(Boolean);
}

/**
 * The attribute names of an opening tag, ignoring quoted values. Whole
 * attribute names are what disclosure state lives on (`open` on a
 * `<details>`), so a value that merely contains the word open, such as
 * aria-label="press open to expand", must never read as the attribute.
 */
function attributeNames(attrs: string): Set<string> {
  const names = new Set<string>();
  let i = 0;
  const n = attrs.length;
  while (i < n) {
    while (i < n && /[\s/]/.test(attrs[i])) i += 1;
    if (i >= n) break;
    const start = i;
    while (i < n && !/[\s=/>]/.test(attrs[i])) i += 1;
    if (i > start) names.add(attrs.slice(start, i).toLowerCase());
    // Skip the value when this attribute carries one, so quoted prose
    // never leaks into the name scan.
    let j = i;
    while (j < n && /\s/.test(attrs[j])) j += 1;
    if (attrs[j] === '=') {
      j += 1;
      while (j < n && /\s/.test(attrs[j])) j += 1;
      const quote = attrs[j];
      if (quote === '"' || quote === "'") {
        j += 1;
        while (j < n && attrs[j] !== quote) j += 1;
        j += 1;
      } else {
        while (j < n && !/[\s>]/.test(attrs[j])) j += 1;
      }
      i = j;
    }
  }
  return names;
}

interface Frame {
  name: string;
  skipped: boolean;
  /** True for the `.katex-html` subtree root (KaTeX's visual layer). */
  katexHtml: boolean;
  /** Inside `.katex-html`: true when this element is a fused inline run. */
  fuses: boolean;
  /** True for a `<details>` carrying no `open` attribute. */
  closedDetails: boolean;
  /** True for a `<summary>` that is a direct child of a closed `<details>`. */
  detailsSummary: boolean;
  /**
   * On a closed `<details>`: whether a direct-child `<summary>` has already
   * been seen. Chromium renders only the FIRST direct-child summary of a
   * closed disclosure (measured 2026-08-19: two summaries -> innerText
   * "alpha beta", 2 words; three -> still the first one), while an OPEN
   * details renders all of them. Tracked on the parent frame so the
   * open-state path never consults it.
   */
  summarySeen: boolean;
}

/**
 * Where the insertion point sits relative to the nearest enclosing closed
 * `<details>`: inside its `<summary>` (rendered at rest), inside its
 * hidden body, or outside any closed disclosure. The scan runs from the
 * stack top so an inner disclosure is judged before an outer one.
 */
function closedDetailsPosition(stack: Frame[]): 'summary' | 'body' | undefined {
  for (let s = stack.length - 1; s >= 0; s -= 1) {
    if (stack[s].detailsSummary) return 'summary';
    if (stack[s].closedDetails) return 'body';
  }
  return undefined;
}

/**
 * The visible text of an HTML fragment: what a reader sees at rest on a
 * desktop viewport. Input is expected to be well-formed rendered markup
 * (react-dom/server output); text outside any skipped subtree is kept,
 * entities are decoded, and tag boundaries separate words — with one
 * scoped exception: inside KaTeX's `.katex-html` visual layer, boundaries
 * between fused inline runs (see KATEX_HTML_FUSE_CLASSES) do not
 * separate, matching how innerText tokenizes that subtree.
 *
 * Splitting at each tag boundary deliberately mirrors how innerText reads
 * this site's prose: the text-bearing inline elements here (citation
 * chips, table cells, buttons) are CSS inline-block/flex boxes that
 * innerText reports as separate runs. Measured per article against
 * Chromium innerText, this stays within the reading-time tolerance; the
 * e2e header spec re-checks every published page.
 */
export function visibleTextInMarkup(markup: string): string {
  const parts: string[] = [];
  const stack: Frame[] = [];
  const skipping = () => stack.some((frame) => frame.skipped);
  const inKatexHtml = () => stack.some((frame) => frame.katexHtml);
  // Text is excluded when any enclosing element is skipped, or when it
  // sits in the body of a closed disclosure: innerText drops both.
  const obscured = () =>
    skipping() || closedDetailsPosition(stack) === 'body';

  let i = 0;
  const n = markup.length;
  while (i < n) {
    const lt = markup.indexOf('<', i);
    if (lt === -1) {
      if (!obscured()) parts.push(markup.slice(i));
      break;
    }
    if (lt > i && !obscured()) parts.push(markup.slice(i, lt));

    if (markup.startsWith('<!--', lt)) {
      // A tag boundary always separates words, even for skipped subtrees;
      // extra whitespace is harmless to the count.
      parts.push(' ');
      const end = markup.indexOf('-->', lt + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    const gt = markup.indexOf('>', lt);
    if (gt === -1) {
      // Malformed tail: treat the remainder as text.
      if (!obscured()) parts.push(markup.slice(lt));
      break;
    }
    const tag = markup.slice(lt + 1, gt);
    i = gt + 1;

    if (tag.startsWith('!')) {
      parts.push(' ');
      continue; // doctype, CDATA markers
    }

    if (tag.startsWith('/')) {
      const name = tag.slice(1).trim().toLowerCase();
      let closed: Frame | undefined;
      for (let s = stack.length - 1; s >= 0; s -= 1) {
        if (stack[s].name === name) {
          closed = stack[s];
          stack.splice(s, 1);
          break;
        }
      }
      // Closing a fused inline run inside the KaTeX visual layer does not
      // separate words; every other tag boundary does.
      if (!(closed?.fuses && inKatexHtml())) parts.push(' ');
      continue;
    }

    const nameMatch = /^([a-zA-Z][a-zA-Z0-9-]*)/.exec(tag);
    if (!nameMatch) {
      parts.push(' ');
      continue;
    }
    const name = nameMatch[1].toLowerCase();
    const attrs = tag.slice(nameMatch[0].length);
    const selfClosing = tag.endsWith('/') || VOID_ELEMENTS.has(name);
    const parent = stack[stack.length - 1];
    // A <summary> renders even while its own disclosure is closed; every
    // other element of that closed body stays hidden at rest. Requiring
    // the direct child of the closed disclosure (and an unskipped
    // context, so hidden ancestors still win) keeps a summary inside a
    // nested closed body correctly excluded, as Chromium excludes it.
    const detailsSummary =
      name === 'summary' &&
      !skipping() &&
      parent?.closedDetails === true &&
      !parent.summarySeen;
    if (detailsSummary && parent) parent.summarySeen = true;
    const skipped =
      skipping() ||
      (closedDetailsPosition(stack) === 'body' && !detailsSummary) ||
      hiddenAtRest(name, attrs);
    const classTokens = classTokensOf(attrs);
    const katexHtml = classTokens.includes('katex-html');
    // A classless span nested directly inside a fused run is a KaTeX
    // italic-correction kern wrapper (e.g. \log renders as "lo" + a
    // margined "g" span): innerText fuses straight across it. Classless
    // spans elsewhere in the visual layer are the vlist positioning
    // boxes, which must keep separating.
    const fuses =
      KATEX_HTML_FUSE_CLASSES.has(classTokens[0] ?? '') ||
      (name === 'span' &&
        classTokens.length === 0 &&
        inKatexHtml() &&
        parent?.fuses === true);
    // The `.katex-html` opening tag itself still separates (the formula's
    // boundary with the surrounding prose): its frame is pushed after
    // this decision, so inKatexHtml() is false for it here.
    if (!inKatexHtml() || !fuses) parts.push(' ');
    if (!selfClosing) {
      stack.push({
        name,
        skipped,
        katexHtml,
        fuses,
        closedDetails: name === 'details' && !attributeNames(attrs).has('open'),
        detailsSummary,
        summarySeen: false,
      });
    }
  }

  // Join with no separator: every tag boundary that should separate words
  // already pushed its own ' ' part above, so a join separator would
  // re-split the inline runs the KaTeX fusion just merged. Whitespace is
  // normalized afterwards either way.
  return parts.join('').replace(/\s+/g, ' ').trim();
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

/** One article's measured entry in data/reading-times.json. */
export interface ReadingTimeEntry {
  words: number;
  minutes: number;
}

/**
 * Compare a recorded reading-time file against a fresh measurement and
 * return one human-readable finding per disagreement (drifted word or
 * minute counts, entries missing on either side). Empty means the two
 * records agree. This is the pure logic behind the build-time
 * reading-times gate (scripts/check-reading-times.ts): when the export
 * re-measures to different values than the file the build renders from,
 * the disagreement must be loud and named per article, never a silent
 * rewrite of a tracked file. Findings are sorted by article id so the
 * output is stable across runs.
 */
export function diffReadingTimeRecords(
  recorded: Record<string, ReadingTimeEntry>,
  measured: Record<string, ReadingTimeEntry>,
): string[] {
  const findings: string[] = [];
  const ids = new Set([...Object.keys(recorded), ...Object.keys(measured)]);
  for (const id of ids) {
    const r = recorded[id];
    const m = measured[id];
    if (r === undefined) {
      findings.push(`${id}: measured but not recorded (${m?.words} words)`);
    } else if (m === undefined) {
      findings.push(`${id}: recorded but not measured (${r.words} words)`);
    } else if (r.words !== m.words || r.minutes !== m.minutes) {
      findings.push(
        `${id}: recorded ${r.words} words / ${r.minutes} minutes, measured ${m.words} words / ${m.minutes} minutes`,
      );
    }
  }
  return findings.sort();
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
