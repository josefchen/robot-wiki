/**
 * Paint and text readers for the figure-system check: which colour an
 * element declares (a token, a literal, or nothing) and whether that colour
 * is reserved for links, focus or status.
 */

export const FIGURE_RULES = {
  'reserved-colour': 'signal blue or a status colour paints a data mark',
  'hard-coded-colour': 'a colour literal stands in for a token',
  'sub-scale-text': 'text renders below 12 px or off the stage type scale',
  'outside-frame': 'the figure renders outside the shared figure frame',
  'frame-structure': 'the frame is not a header, one stage, one caption and at most one source line',
  'caption-words': 'the caption runs over 20 words',
  'legend-off-stage': 'a legend sits outside the stage',
} as const;

export type FigureRule = keyof typeof FIGURE_RULES;

export type FigureViolation = {
  route: string;
  figure: string;
  rule: FigureRule;
  detail: string;
};

export const CAPTION_MAX_WORDS = 20;
export const MIN_TEXT_PX = 12;
export const STAGE_SURFACE = 'surface:bounded-dark-instrument';

const SIGNAL_TOKENS = new Set(['signal', 'accent', 'link', 'focus', 'registration', 'active-path']);
const STATUS_TOKENS = new Set(['ok', 'warn', 'error', 'err', 'destructive']);
const RESERVED_HEX = new Map([
  ['#245fff', 'signal'],
  ['#1a6f45', 'ok'],
  ['#8a5a00', 'warn'],
  ['#a52a1e', 'error'],
  ['#6b1839', 'destructive'],
]);
const NAMED_COLOURS = new Set([
  'white', 'black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink',
  'gray', 'grey', 'silver', 'navy', 'teal', 'lime', 'maroon', 'olive', 'aqua', 'fuchsia',
]);
const PAINT_ATTRIBUTES = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'];
const PAINT_STYLE = /^(fill|stroke|color|background|background-color|border(-[a-z]+)?-color|stop-color|outline-color)$/;

export type Paint =
  | { kind: 'none' }
  | { kind: 'token'; name: string }
  | { kind: 'literal'; value: string };

/** Classifies one paint value: a token reference, a literal, or nothing. */
export function classifyPaint(raw: string): Paint {
  const value = raw.trim().toLowerCase();
  if (!value || /^(none|transparent|currentcolor|inherit|initial|unset)$/.test(value) || value.startsWith('url(')) {
    return { kind: 'none' };
  }
  const token = value.match(/^var\(\s*--(?:color-)?([a-z0-9-]+)/);
  if (token) return { kind: 'token', name: token[1] };
  if (/^#[0-9a-f]{3,8}$/.test(value) || /^(rgb|hsl|oklch|oklab|lab|lch|color)a?\(/.test(value) || NAMED_COLOURS.has(value)) {
    return { kind: 'literal', value };
  }
  return { kind: 'none' };
}

export function reservedName(paint: Paint): string | null {
  if (paint.kind === 'token') {
    if (SIGNAL_TOKENS.has(paint.name) || STATUS_TOKENS.has(paint.name)) return paint.name;
    return null;
  }
  if (paint.kind === 'literal') return RESERVED_HEX.get(paint.value) ?? null;
  return null;
}

export function isSignal(name: string): boolean {
  return SIGNAL_TOKENS.has(name);
}

/** Tailwind utilities that paint with a named token or an arbitrary colour. */
function classPaints(element: Element): { property: string; paint: Paint }[] {
  const out: { property: string; paint: Paint }[] = [];
  for (const cls of (element.getAttribute('class') ?? '').split(/\s+/)) {
    if (!cls || cls.includes(':')) continue;
    const arbitrary = cls.match(/^(bg|text|fill|stroke|border|outline|decoration)-\[(#[0-9a-fA-F]{3,8}|(?:rgb|hsl)a?\([^\]]*\))\]$/);
    if (arbitrary) {
      out.push({ property: arbitrary[1], paint: { kind: 'literal', value: arbitrary[2].toLowerCase() } });
      continue;
    }
    const named = cls.match(/^(bg|text|fill|stroke|border)-([a-z-]+?)(?:\/\d+)?$/);
    if (named && (SIGNAL_TOKENS.has(named[2]) || STATUS_TOKENS.has(named[2]))) {
      out.push({ property: named[1], paint: { kind: 'token', name: named[2] } });
    }
  }
  return out;
}

/** Inline style declarations and presentation attributes that set a paint. */
export function declaredPaints(element: Element): { property: string; paint: Paint }[] {
  const out: { property: string; paint: Paint }[] = [];
  for (const attribute of PAINT_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (value !== null) out.push({ property: attribute, paint: classifyPaint(value) });
  }
  for (const declaration of (element.getAttribute('style') ?? '').split(';')) {
    const [property, ...rest] = declaration.split(':');
    const name = property?.trim().toLowerCase();
    if (name && PAINT_STYLE.test(name)) out.push({ property: name, paint: classifyPaint(rest.join(':')) });
  }
  return out.concat(classPaints(element));
}

export function words(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

