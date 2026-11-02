import { z } from 'zod';

/** Literal owner focus treatment, shared by the control sweep and widget ledger. */
export const focusPaintSchema = z.object({
  route: z.string(),
  target: z.string(),
  scope: z.enum(['ordinary', 'frozen-explainer', 'map-tile', 'timeline-row', 'playground-canvas', 'chart-mark']),
  matched: z.boolean(),
  kind: z.enum(['outline', 'svg-ring', 'inset-shadow', 'none']),
  style: z.string(),
  widthPx: z.number(),
  color: z.string(),
  offsetPx: z.number(),
  visible: z.boolean(),
  retiredPaint: z.boolean(),
  forcedColors: z.boolean(),
  systemInk: z.string(),
  systemFocus: z.string(),
}).strict();
export type FocusPaint = z.infer<typeof focusPaintSchema>;

export function emptyFocusPaint(route = ''): FocusPaint {
  return { route, target: '', scope: 'ordinary', matched: false, kind: 'none', style: 'none', widthPx: 0, color: '', offsetPx: 0, visible: false, retiredPaint: false, forcedColors: false, systemInk: '', systemFocus: '' };
}

export const focusInstanceSchema = z.object({
  id: z.string().min(1), route: z.string(), viewport: z.string(),
  selector: z.string().min(1), member: z.string().nullable(),
  nativeDisabled: z.boolean(),
  method: z.enum(['Tab', 'arrow', 'unreached', 'native-disabled']),
  keys: z.array(z.string()),
  state: z.string(),
  pointerMethod: z.enum(['click', 'keyboard-revealed-skip-link', 'native-disabled', 'missing']),
  keyboard: focusPaintSchema.nullable(), pointer: focusPaintSchema.nullable(),
}).strict();
export type FocusInstance = z.infer<typeof focusInstanceSchema>;

export function focusInstanceFailures(instance: FocusInstance): string[] {
  const failures: string[] = [];
  if (!instance.member) failures.push('unregistered structural keyboard control');
  if (instance.nativeDisabled) {
    if (instance.method !== 'native-disabled') failures.push('native-disabled control recorded as keyboard reachable');
    return failures;
  }
  if (!['Tab', 'arrow'].includes(instance.method) || instance.keys.length === 0) failures.push('not reached by actual Tab/arrow input');
  if (!instance.keyboard) failures.push('keyboard focus paint is missing');
  else failures.push(...focusPaintFailures(instance.keyboard, true));
  if (!instance.pointer) failures.push('pointer focus paint is missing');
  else failures.push(...focusPaintFailures(instance.pointer, false));
  if (instance.pointerMethod === 'missing') failures.push('pointer observation method is missing');
  if (instance.pointerMethod === 'keyboard-revealed-skip-link' && !/class="[^"]*\bskip-link\b/.test(instance.pointer?.target ?? '')) failures.push('offscreen pointer exception is not the keyboard-revealed skip link');
  return failures;
}

export const FOCUS_INK = 'rgb(28, 28, 26)';
export const FOCUS_CHART_ACCENT = 'rgb(59, 110, 168)';

export function focusPaintColorException(paint: FocusPaint): string | null {
  return paint.forcedColors && paint.systemFocus !== '' && paint.color === paint.systemFocus && /^<(?:input|select|textarea|button)\b/.test(paint.target)
    ? 'focus:forced-native-system-highlight' : null;
}

/** Exceptions name a real component and route, never an arbitrary visible ring. */
export function focusPaintException(paint: FocusPaint): string | null {
  if (paint.scope === 'frozen-explainer' && ['/', '/how-robots-work/'].includes(paint.route)) return 'owner-freeze:explainers';
  if (paint.scope === 'map-tile' && paint.route === '/market-map/') return 'focus:inset-map-tile';
  if (paint.scope === 'timeline-row' && paint.route === '/market-map/') return 'focus:inset-timeline-row';
  if (paint.scope === 'playground-canvas' && paint.route === '/playground/') return 'focus:inset-playground-canvas';
  if (paint.scope === 'chart-mark' && paint.kind === 'svg-ring') return 'focus:chart-mark-ring';
  return null;
}

/**
 * Pointer focus on an editable field can legitimately match :focus-visible.
 * The browser's actual selector match decides whether a ring should appear;
 * keyboard reach is established separately by a recorded Tab/arrow walk.
 */
export function focusPaintFailures(paint: FocusPaint, keyboard: boolean): string[] {
  const failures: string[] = [];
  if (keyboard && !paint.matched) failures.push('keyboard focus does not match :focus-visible');
  if (!paint.matched) {
    if (paint.visible) failures.push('focus paint appears without :focus-visible');
    return failures;
  }
  if (!paint.visible || paint.kind === 'none') failures.push('no visible focus ring');
  const nativeSystemFocus = focusPaintColorException(paint) !== null;
  // In forced colours the user's resolved system palette owns native
  // focus paint. Normal profiles still reject every retired brand colour.
  if (paint.retiredPaint && !nativeSystemFocus && !(paint.forcedColors && paint.color === paint.systemInk)) failures.push('retired lime or signal-blue focus paint');
  const exception = focusPaintException(paint);
  const frozen = exception === 'owner-freeze:explainers';
  const chart = exception === 'focus:chart-mark-ring';
  const inset = exception?.startsWith('focus:inset-') === true;
  if (paint.style !== 'solid') failures.push(`focus style ${paint.style}, expected solid`);
  if (paint.widthPx !== (frozen || chart ? 2 : 1)) failures.push(`focus width ${paint.widthPx}px, expected ${frozen || chart ? 2 : 1}px`);
  const ink = paint.forcedColors ? paint.systemInk : FOCUS_INK;
  if (!ink || (paint.color !== ink && !nativeSystemFocus && !(chart && !paint.forcedColors && paint.color === FOCUS_CHART_ACCENT))) failures.push(`focus colour ${paint.color}, expected ink${chart ? ' or the chart accent' : ''}`);
  if (chart) {
    if (paint.offsetPx !== 0) failures.push('SVG ring has an unexpected outline offset');
  } else if (frozen && paint.kind === 'inset-shadow') {
    if (paint.offsetPx !== -2) failures.push('frozen canvas ring is not its 2px inset');
  } else {
    if (paint.kind !== 'outline') failures.push(`unexpected focus treatment ${paint.kind}`);
    const expected = inset ? -1 : 2;
    if (paint.offsetPx !== expected) failures.push(`focus offset ${paint.offsetPx}px, expected ${expected}px`);
  }
  return failures;
}
