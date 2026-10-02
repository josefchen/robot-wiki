/**
 * The main view of a figure and the symbols it may not show.
 *
 * The main view is what a figure shows at settle with both folds closed:
 * the header (kicker and headline), the visible controls with their labels,
 * the stage, and the caption. A reader with no engineering background
 * should meet plain words there, so the sweep below looks for the symbols
 * and bare units that send such a reader away: a Greek letter used as a
 * quantity, a one- or two-letter variable, a subscript or superscript, a
 * power, a formula, or a unit abbreviation given without words.
 *
 * Everyday forms stay allowed: %, currency, dates, and kg, km, km/h, m, cm
 * and mm after a number. Model names such as π0.5 are names. A symbol whose
 * plain-words gloss sits on the same line ("10 times a second (10 Hz)") is
 * marked with `data-figure-gloss`, and the sweep lists it instead of
 * failing it.
 */

export type SymbolPattern = { id: string; what: string; test: (line: string) => string | null };

const regex = (pattern: RegExp) => (line: string) => line.match(pattern)?.[0] ?? null;

/** Model and product names that carry a Greek letter. */
const GREEK_NAMES = /π\*?\d+(?:\.\d+)?(?:-FAST)?/gu;

/** Two-letter English words and the everyday abbreviation "vs". */
const SHORT_WORDS = new Set([
  'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'hi', 'if', 'in', 'is', 'it',
  'me', 'my', 'no', 'of', 'oh', 'ok', 'on', 'or', 'ox', 'so', 'to', 'up', 'us', 'vs', 'we',
]);

const BARE_UNITS =
  'ms|s|sec|Hz|kHz|MHz|GHz|N|kN|Nm|N·m|N/m|rad|deg|W|kW|V|mA|fps|dB|Pa|kPa|MPa|GB|MB|TB|rpm|m/s|cm/s|mm/s';

/** Lengths and masses a reader meets every day, allowed after a number. */
const EVERYDAY_UNITS = new Set(['kg', 'km', 'm', 'cm', 'mm']);

function shortVariable(line: string): string | null {
  let previous = '';
  for (const raw of line.replace(/\bet al\./g, '').split(/\s+/)) {
    const token = raw.replace(/^[([{"'“‘]+|[)\]}"'”’.,;:!?…]+$/gu, '');
    const afterNumber = /\d$/.test(previous);
    previous = token;
    if (!/^\p{L}{1,2}$/u.test(token)) continue;
    if (afterNumber && EVERYDAY_UNITS.has(token)) continue;
    if (token.length === 1) {
      if (token === 'a' || token === 'A' || token === 'I') continue;
      return token;
    }
    if (token === token.toUpperCase()) continue; // an abbreviation such as AI or RL
    if (!SHORT_WORDS.has(token.toLowerCase())) return token;
  }
  return null;
}

/** The committed pattern list the main-view sweep applies, line by line. */
export const MAIN_VIEW_SYMBOL_PATTERNS: readonly SymbolPattern[] = [
  { id: 'greek', what: 'a Greek letter', test: (line) => regex(/[\u0370-\u03FF\u1F00-\u1FFF]/u)(line.replace(GREEK_NAMES, '')) },
  { id: 'formula', what: 'a formula symbol', test: regex(/[=≈≤≥≠∑∏∫√∂∇±∝∞]|[<>]\s?\d/u) },
  { id: 'power', what: 'a power expression', test: regex(/[\p{L}\p{N})\]]\s?\^|\^\s?[\p{L}\p{N}(]/u) },
  { id: 'script', what: 'a subscript or superscript', test: regex(/[\u00B2\u00B3\u00B9\u2070-\u209F]|\p{L}_[\p{L}\p{N}{]/u) },
  {
    id: 'bare-unit',
    what: 'a bare unit',
    // A decade ("the 2010s") is a date, not seconds.
    test: (line) => regex(new RegExp(`(?:\\d\\s?(?:${BARE_UNITS})(?![\\p{L}/])|°|/step\\b|/s\\b|\\b(?:Hz|ms|rad)\\b)`, 'u'))(
      line.replace(/\b[12]\d{3}s\b/g, ''),
    ),
  },
  { id: 'variable', what: 'a one- or two-letter variable', test: shortVariable },
];

export type SymbolHit = { line: string; pattern: string; what: string; match: string };

export function symbolHits(line: string): SymbolHit[] {
  const hits: SymbolHit[] = [];
  for (const { id, what, test } of MAIN_VIEW_SYMBOL_PATTERNS) {
    const match = test(line);
    if (match !== null) hits.push({ line, pattern: id, what, match });
  }
  return hits;
}

const LINE_CONTAINERS =
  'text, p, div, li, figcaption, label, button, summary, legend, dt, dd, td, th, h1, h2, h3, h4, h5, h6, option, output';
const NEVER_SHOWN = 'script, style, template, title, desc, [data-figure-fold] > :not(summary), .sr-only, [hidden]';

function displayHidden(el: Element): boolean {
  const classes = (el.getAttribute('class') ?? '').split(/\s+/);
  if (classes.includes('hidden') && !classes.some((c) => /^(sm|md|lg|xl):(block|inline|flex|grid|table|inline-block|inline-flex)$/.test(c))) return true;
  const style = (el.getAttribute('style') ?? '').replace(/\s+/g, '');
  if (/(^|;)(display:none|visibility:hidden|opacity:0(;|$))/.test(style)) return true;
  return el.getAttribute('opacity') === '0' || el.getAttribute('display') === 'none' || el.getAttribute('visibility') === 'hidden';
}

/** Whether a node inside the frame is shown at settle with both folds closed. */
function shownAtSettle(node: Element, frame: Element): boolean {
  for (let el: Element | null = node; el && el !== frame; el = el.parentElement) {
    if (el.matches(NEVER_SHOWN) || displayHidden(el)) return false;
    const details = el.parentElement;
    if (details?.tagName === 'DETAILS' && !details.hasAttribute('open') && el.tagName !== 'SUMMARY') return false;
    if (el.tagName === 'OPTION' && !el.hasAttribute('selected') && el.parentElement?.querySelector('option[selected]')) return false;
  }
  return true;
}

export type MainViewText = { lines: string[]; glossed: string[] };

/** The main view's text in reading order, one entry per rendered line. */
export function mainViewText(frame: Element): MainViewText {
  const regions = [
    frame.querySelector(':scope > [data-figure-header]'),
    frame.querySelector(':scope > [data-figure-stage]'),
    frame.querySelector(':scope > [data-figure-caption]'),
  ].filter((el): el is Element => el !== null);
  const lines = new Map<Element, string>();
  const glossed: string[] = [];
  const walker = frame.ownerDocument.createTreeWalker(frame, 4);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    const text = node.textContent ?? '';
    if (!parent || !text.trim() || !regions.some((region) => region.contains(parent))) continue;
    if (!shownAtSettle(parent, frame)) continue;
    const gloss = parent.closest('[data-figure-gloss]');
    if (gloss && frame.contains(gloss)) {
      glossed.push((gloss.closest(LINE_CONTAINERS) ?? gloss).textContent?.replace(/\s+/g, ' ').trim() ?? '');
      continue;
    }
    const container = parent.closest(LINE_CONTAINERS) ?? parent;
    lines.set(container, `${lines.get(container) ?? ''}${text}`);
  }
  return {
    lines: [...lines.values()].map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean),
    glossed: [...new Set(glossed)],
  };
}

/** Every symbol hit in a frame's main view. */
export function mainViewSymbolHits(frame: Element): SymbolHit[] {
  return mainViewText(frame).lines.flatMap(symbolHits);
}
