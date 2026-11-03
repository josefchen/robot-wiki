import { describe, expect, it } from 'vitest';
import { emptyFocusPaint, focusInstanceFailures, focusPaintException, focusPaintColorException, focusPaintFailures, focusPaintSchema, type FocusPaint } from '../../lib/brand-v2-focus-paint';

const ring = (change: Partial<FocusPaint> = {}): FocusPaint => ({ ...emptyFocusPaint('/article/'), target: '<button>', matched: true, kind: 'outline', style: 'solid', widthPx: 1, color: 'rgb(28, 28, 26)', offsetPx: 2, visible: true, ...change });

describe('literal focus paint', () => {
  it('accepts only the literal ordinary ink outline and measures selector-specific changes', () => {
    expect(focusPaintFailures(ring(), true)).toEqual([]);
    for (const change of [{ widthPx: 2 }, { offsetPx: 1 }, { color: 'rgb(36, 95, 255)', retiredPaint: true }, { style: 'dashed' }, { visible: false }, { matched: false }]) {
      expect(focusPaintFailures(ring(change), true).length, JSON.stringify(change)).toBeGreaterThan(0);
    }
  });
  it('preserves the actual focus-visible match for editable pointer inputs', () => {
    expect(focusPaintFailures(ring(), false)).toEqual([]);
    expect(focusPaintFailures(ring({ matched: false }), false)).toContain('focus paint appears without :focus-visible');
    expect(focusPaintFailures(emptyFocusPaint('/article/'), false)).toEqual([]);
  });
  it('scopes inset and frozen exceptions to actual component routes and exact paint', () => {
    const inset = ring({ route: '/market-map/', scope: 'map-tile', offsetPx: -1 });
    expect(focusPaintException(inset)).toBe('focus:inset-map-tile');
    expect(focusPaintFailures(inset, true)).toEqual([]);
    expect(focusPaintFailures({ ...inset, route: '/article/' }, true)).not.toEqual([]);
    expect(focusPaintFailures({ ...inset, widthPx: 2 }, true)).not.toEqual([]);
    const frozen = ring({ route: '/how-robots-work/', scope: 'frozen-explainer', widthPx: 2 });
    expect(focusPaintFailures(frozen, true)).toEqual([]);
    expect(focusPaintFailures({ ...frozen, color: 'rgb(36, 95, 255)', retiredPaint: true }, true)).not.toEqual([]);
  });
  it('accepts a bound actual chart ring but refuses invisible or retired ring paint', () => {
    const svg = ring({ kind: 'svg-ring', scope: 'chart-mark', widthPx: 2, offsetPx: 0, color: 'rgb(59, 110, 168)' });
    expect(focusPaintFailures(svg, true)).toEqual([]);
    expect(focusPaintFailures({ ...svg, visible: false }, true)).toContain('no visible focus ring');
    expect(focusPaintFailures({ ...svg, scope: 'ordinary' }, true)).not.toEqual([]);
  });
  it('checks forced-colours paint against the resolved system ink', () => {
    expect(focusPaintFailures(ring({ forcedColors: true, systemInk: 'rgb(255, 255, 255)', color: 'rgb(255, 255, 255)' }), true)).toEqual([]);
    expect(focusPaintFailures(ring({ forcedColors: true, systemInk: 'rgb(255, 255, 255)' }), true)).not.toEqual([]);
  });
  it('accepts only a measured native system Highlight exception under forced colours', () => {
    const native = ring({ target: '<input type="search">', forcedColors: true, systemInk: 'rgb(0, 0, 0)', systemFocus: 'rgba(5, 0, 73, 0.8)', color: 'rgba(5, 0, 73, 0.8)' });
    expect(focusPaintColorException(native)).toBe('focus:forced-native-system-highlight');
    expect(focusPaintFailures(native, true)).toEqual([]);
    expect(focusPaintFailures({ ...native, forcedColors: false }, true)).not.toEqual([]);
    expect(focusPaintFailures({ ...native, target: '<div role="button">' }, true)).not.toEqual([]);
    expect(focusPaintFailures({ ...native, widthPx: 3 }, true)).not.toEqual([]);
    expect(focusPaintFailures({ ...native, systemFocus: '' }, true)).not.toEqual([]);
  });
  it('accepts a measured native summary while retaining every forced-colour ring constraint', () => {
    const summary = ring({ target: '<summary data-brand-control-id="control:secondary-action">More</summary>', forcedColors: true, systemInk: 'rgb(0, 0, 0)', systemFocus: 'rgba(5, 0, 73, 0.8)', color: 'rgba(5, 0, 73, 0.8)' });
    expect(focusPaintColorException(summary)).toBe('focus:forced-native-system-highlight');
    expect(focusPaintFailures(summary, true)).toEqual([]);
    for (const target of ['<input type="range">', '<select>', '<textarea>', '<button>', '<summary>']) {
      expect(focusPaintFailures({ ...summary, target }, true), target).toEqual([]);
    }
    const invalid: Partial<FocusPaint>[] = [
      { target: '<div role="button">' },
      { target: '<span data-native="summary">' },
      { target: '<summaryish>' },
      { target: '<summary-panel tabindex="0">' },
      { target: '<button-like role="button">' },
      { forcedColors: false },
      { systemFocus: '' },
      { systemFocus: 'rgb(255, 0, 0)' },
      { color: 'rgb(0, 128, 0)' },
      { widthPx: 2 },
      { offsetPx: 0 },
      { style: 'dashed' },
      { visible: false },
      { matched: false },
    ];
    for (const mutation of invalid) {
      expect(focusPaintFailures({ ...summary, ...mutation }, true).length, JSON.stringify(mutation)).toBeGreaterThan(0);
    }
  });
  it('requires raw full paint records and genuine keyboard reach for each instance', () => {
    expect(focusPaintSchema.safeParse({ style: 'solid', widthPx: 1, color: 'rgb(28, 28, 26)' }).success).toBe(false);
    const instance = { id: '/article/|1440x900|button:2', route: '/article/', viewport: '1440x900', selector: 'button:nth-child(2)', member: 'control:secondary-action', nativeDisabled: false, method: 'Tab' as const, keys: ['Tab'], state: '', pointerMethod: 'click' as const, keyboard: ring(), pointer: emptyFocusPaint('/article/') };
    expect(focusInstanceFailures(instance)).toEqual([]);
    expect(focusInstanceFailures({ ...instance, method: 'unreached' })).toContain('not reached by actual Tab/arrow input');
    expect(focusInstanceFailures({ ...instance, member: null })).toContain('unregistered structural keyboard control');
  });
});
