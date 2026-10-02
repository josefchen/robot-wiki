/**
 * The figure-system check: every explanatory figure in the static export
 * sits in the shared figure frame and paints only token colours on the
 * shared type scale. It reads the exported HTML, so it judges what ships.
 *
 * Rules (a) to (d) are the enforcement contract: reserved colours on data
 * marks, colour literals, text off the type scale, and figures outside the
 * frame. The frame rules hold the frame's own shape. Figures not yet
 * migrated sit on one allowlist, entry by entry; an entry that matches no
 * violation is itself an error, so the list only shrinks.
 */
import { JSDOM } from 'jsdom';
import {
  CAPTION_MAX_WORDS,
  FOLD_LABELS,
  HEADLINE_MAX_WORDS,
  KICKER_MAX_WORDS,
  MIN_TEXT_PX,
  STAGE_SURFACE,
  declaredPaints,
  isSignal,
  reservedName,
  words,
  type FigureRule,
  type FigureViolation,
} from './figure-system-paint.ts';

export { FIGURE_RULES, type FigureRule, type FigureViolation } from './figure-system-paint.ts';

const CANDIDATES = [
  '[data-motion-scene]',
  '[data-brand-module-signature="instrument-frame"]',
  '[data-brand-surface-id*="instrument"]',
  '[data-instrument]',
  'figure',
  'canvas',
  'video',
  'svg',
].join(',');
const HIDDEN = '.sr-only, [hidden], [aria-hidden="true"]';

function isPhoto(el: Element): boolean {
  return el.tagName === 'FIGURE' && !!el.querySelector('img') && !el.querySelector('svg, canvas, video');
}

/** An svg is a figure when it explains something: labelled, or drawn at figure size. */
function isExplanatorySvg(el: Element): boolean {
  if (el.closest('a, button, summary, label, [data-brand-device-id]')) return false;
  if (el.getAttribute('role') === 'img' || el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) return true;
  const [, , w, h] = (el.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
  return w >= 160 && h >= 90;
}

/** The outermost figures in main: frames, and off-frame visuals. */
export function findFigures(main: Element): Element[] {
  const frames = [...main.querySelectorAll('[data-figure-frame]')];
  const loose = [...main.querySelectorAll(CANDIDATES)].filter((el) => {
    if (el.closest('[data-figure-frame]') || el.querySelector('[data-figure-frame]')) return false;
    if (isPhoto(el) || el.closest('table')) return false;
    return el.tagName.toLowerCase() !== 'svg' || isExplanatorySvg(el);
  });
  const all = [...frames, ...loose];
  return all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
}

function precedingHeading(el: Element): string {
  let node: Element | null = el;
  while (node) {
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (/^H[1-4]$/.test(sibling.tagName)) return sibling.textContent?.trim() ?? '';
      const inner = sibling.querySelectorAll('h1, h2, h3, h4');
      if (inner.length) return inner[inner.length - 1].textContent?.trim() ?? '';
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
  }
  return 'page top';
}

/** A stable name: the frame id, the scene id, the accessible label, or the title. */
export function figureName(el: Element): string {
  const frame = el.getAttribute('data-figure-frame');
  if (frame) return frame;
  const scene = el.getAttribute('data-motion-scene');
  if (scene) return `scene:${scene}`;
  const image = el.closest('[data-image-id]')?.getAttribute('data-image-id');
  if (image) return `image:${image}`;
  const labelled = el.getAttribute('aria-label') ??
    el.querySelector('svg[aria-label], canvas[aria-label], [role="img"][aria-label]')?.getAttribute('aria-label');
  const titled = el.querySelector('[data-instrument-title], figcaption, h3, h4')?.textContent;
  const name = labelled || titled || `${el.tagName.toLowerCase()} after ${precedingHeading(el)}`;
  return name.replace(/\s+/g, ' ').trim().slice(0, 120);
}

const NAMED_TEXT_PX: Record<string, number> = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 };

function ownTextPx(el: Element): number | null {
  for (const cls of (el.getAttribute('class') ?? '').split(/\s+/)) {
    if (cls.includes(':')) continue;
    const m = cls.match(/^text-\[(\d*\.?\d+)(px|rem)\]$/);
    if (m) return Number(m[1]) * (m[2] === 'rem' ? 16 : 1);
    const named = cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl)$/);
    if (named) return NAMED_TEXT_PX[named[1]];
  }
  const style = (el.getAttribute('style') ?? '').match(/font-size:\s*(\d*\.?\d+)(px|rem)/);
  return style ? Number(style[1]) * (style[2] === 'rem' ? 16 : 1) : null;
}

/** The size a text node inherits: the nearest declared size up to the figure root. */
function textPx(el: Element, figure: Element): number | null {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const px = ownTextPx(node);
    if (px !== null) return px;
    if (node === figure) break;
  }
  return null;
}

function hasOwnText(el: Element): boolean {
  return [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');
}

/** Rules (a) to (c) over every element of one figure. */
function paintAndTextViolations(figure: Element): [FigureRule, string][] {
  const found: [FigureRule, string][] = [];
  for (const el of [figure, ...figure.querySelectorAll('*')]) {
    const tag = el.tagName.toLowerCase();
    const inLink = !!el.closest('a');
    const status = !!el.closest('[data-figure-status]');
    for (const { property, paint } of declaredPaints(el)) {
      if (paint.kind === 'literal') found.push(['hard-coded-colour', `<${tag}> ${property} ${paint.value}`]);
      const reserved = reservedName(paint);
      if (!reserved) continue;
      const textColour = property === 'color' || property === 'text';
      if (isSignal(reserved) ? inLink : status || textColour) continue;
      found.push(['reserved-colour', `<${tag}> ${property} ${reserved}`]);
    }
    if (!hasOwnText(el)) continue;
    if (el.closest('svg')) {
      const svg = el.closest('svg')!;
      if (el.closest('[data-scene-glyph]')) continue;
      if (!(svg.getAttribute('class') ?? '').split(/\s+/).includes('motion-stage-svg')) {
        found.push(['sub-scale-text', `<${tag}> "${el.textContent?.trim().slice(0, 40)}" is off the stage type scale`]);
      }
      continue;
    }
    const px = textPx(el, figure);
    if (px !== null && px < MIN_TEXT_PX) found.push(['sub-scale-text', `<${tag}> at ${px}px`]);
  }
  return found;
}

function isHidden(el: Element): boolean {
  return el.matches(HIDDEN) || (el.getAttribute('class') ?? '').split(/\s+/).includes('hidden');
}

const FRAME_SHAPES = new Set([
  'header stage caption',
  'header stage caption method',
  'header stage caption source',
  'header stage caption method source',
]);

function summaryText(fold: Element): string {
  return (fold.querySelector(':scope > summary')?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * The frame's two folds: "Adjust more" among the header controls and
 * "How this was made" under the caption. A disclosure nested inside a
 * fold belongs to that fold's content.
 */
function foldViolations(frame: Element): [FigureRule, string][] {
  const found: [FigureRule, string][] = [];
  const header = frame.querySelector(':scope > [data-figure-header]');
  const headerFolds = header
    ? [...header.querySelectorAll('details')].filter((d) => !d.parentElement?.closest('details'))
    : [];
  const frameFolds = [...frame.children].filter((child) => child.tagName === 'DETAILS');
  for (const [folds, expected] of [[headerFolds, FOLD_LABELS.adjust], [frameFolds, FOLD_LABELS.method]] as const) {
    for (const fold of folds) {
      const label = summaryText(fold);
      if (label !== expected) found.push(['fold-label', `fold reads "${label}" where "${expected}" belongs`]);
    }
    if (folds.length > 1) found.push(['fold-label', `${folds.length} folds where one "${expected}" belongs`]);
  }
  return found;
}

/** The frame's shape: header, one graphite stage, one caption, the method fold, at most one source line. */
function frameViolations(frame: Element): [FigureRule, string][] {
  const found: [FigureRule, string][] = [];
  const parts = [...frame.children].filter((child) => !isHidden(child));
  const order = parts.map((child) =>
    child.hasAttribute('data-figure-header') ? 'header'
      : child.hasAttribute('data-figure-stage') ? 'stage'
        : child.hasAttribute('data-figure-caption') ? 'caption'
          : child.tagName === 'DETAILS' ? 'method'
            : child.hasAttribute('data-figure-source') ? 'source' : child.tagName.toLowerCase(),
  );
  const shape = order.join(' ');
  if (!FRAME_SHAPES.has(shape)) {
    found.push(['frame-structure', `frame reads "${shape}"`]);
  }
  const title = frame.querySelector(':scope > [data-figure-header] [data-figure-title]');
  if (!title?.textContent?.trim()) found.push(['frame-structure', 'header has no title']);
  const headline = words(title?.textContent ?? '');
  if (headline > HEADLINE_MAX_WORDS) found.push(['headline-words', `headline has ${headline} words`]);
  const kicker = frame.querySelector(':scope > [data-figure-header] [data-figure-kicker]');
  const kickerWords = words(kicker?.textContent ?? '');
  if (kickerWords > KICKER_MAX_WORDS) found.push(['kicker-words', `kicker has ${kickerWords} words`]);
  found.push(...foldViolations(frame));
  const stage = frame.querySelector(':scope > [data-figure-stage]');
  if (stage && stage.getAttribute('data-brand-surface-id') !== STAGE_SURFACE) {
    found.push(['frame-structure', `stage surface is ${stage.getAttribute('data-brand-surface-id')}`]);
  }
  const caption = frame.querySelector(':scope > [data-figure-caption]');
  const count = words(caption?.textContent ?? '');
  if (count > CAPTION_MAX_WORDS) found.push(['caption-words', `caption has ${count} words`]);
  // A scene shows one beat caption at a time and records every beat's word
  // count, so each beat is held to the caption limit.
  const beats = (frame.getAttribute('data-figure-beat-words') ?? '').split(/\s+/).filter(Boolean).map(Number);
  beats.forEach((beatWords, i) => {
    if (beatWords > CAPTION_MAX_WORDS) found.push(['caption-words', `beat ${i + 1} caption has ${beatWords} words`]);
  });
  if (frame.hasAttribute('data-motion-scene') && beats.length === 0) {
    found.push(['frame-structure', 'scene frame records no beat captions']);
  }
  for (const legend of frame.querySelectorAll('[data-figure-legend], [data-instrument-legend]')) {
    if (!legend.closest('[data-figure-stage]')) found.push(['legend-off-stage', 'legend outside the stage']);
  }
  return found;
}

/** Every figure of one exported page, by name, with its violations. */
export function inspectFigureDocument(html: string, route: string): {
  figures: string[];
  violations: FigureViolation[];
} {
  const { document } = new JSDOM(html).window;
  const main = document.querySelector('main') ?? document.body;
  const seen = new Map<string, number>();
  const figures: string[] = [];
  const violations: FigureViolation[] = [];
  for (const el of findFigures(main)) {
    const base = figureName(el);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const figure = n === 1 ? base : `${base} #${n}`;
    figures.push(figure);
    const found = paintAndTextViolations(el);
    if (el.hasAttribute('data-figure-frame')) found.push(...frameViolations(el));
    else found.push(['outside-frame', `<${el.tagName.toLowerCase()}> outside the figure frame`]);
    const unique = new Map(found.map(([rule, detail]) => [`${rule}\u0000${detail}`, { rule, detail }]));
    for (const { rule, detail } of unique.values()) violations.push({ route, figure, rule, detail });
  }
  return { figures, violations };
}

export function checkFigureDocument(html: string, route: string): FigureViolation[] {
  return inspectFigureDocument(html, route).violations;
}

export type AllowlistEntry = { route: string; figure: string; rules: FigureRule[]; pass: string };
export type Allowlist = { schemaVersion: 'figure-system-allowlist-v1'; entries: AllowlistEntry[] };

export type FigureCheckResult = {
  blocking: FigureViolation[];
  allowed: FigureViolation[];
  stale: { entry: AllowlistEntry; rule: FigureRule }[];
};

/** Splits violations into allowlisted and blocking, and names stale entries. */
export function applyAllowlist(violations: FigureViolation[], allowlist: Allowlist): FigureCheckResult {
  const key = (route: string, figure: string) => `${route}\u0000${figure}`;
  const entries = new Map(allowlist.entries.map((entry) => [key(entry.route, entry.figure), entry]));
  const hit = new Set<string>();
  const result: FigureCheckResult = { blocking: [], allowed: [], stale: [] };
  for (const violation of violations) {
    const entry = entries.get(key(violation.route, violation.figure));
    if (entry?.rules.includes(violation.rule)) {
      result.allowed.push(violation);
      hit.add(`${key(entry.route, entry.figure)}\u0000${violation.rule}`);
    } else {
      result.blocking.push(violation);
    }
  }
  for (const entry of allowlist.entries) {
    for (const rule of entry.rules) {
      if (!hit.has(`${key(entry.route, entry.figure)}\u0000${rule}`)) result.stale.push({ entry, rule });
    }
  }
  return result;
}

export function formatViolation(v: FigureViolation): string {
  return `${v.route} [${v.figure}] ${v.rule}: ${v.detail}`;
}
