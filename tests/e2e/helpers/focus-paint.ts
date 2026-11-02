import type { Page } from '@playwright/test';
import type { FocusInstance, FocusPaint } from '../../../lib/brand-v2-focus-paint';

/** Self-contained browser function; call with Locator.evaluate, not a CSS proxy. */
export function readFocusPaint(element: Element): FocusPaint {
  const target = element.matches('[data-brand-control-id="control:segmented"]') && !(element instanceof HTMLButtonElement)
    ? element.querySelector('button:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? element
    : element;
  const route = location.pathname;
  const scope: FocusPaint['scope'] = target.closest('[data-explainers]') && ['/', '/how-robots-work/'].includes(route)
    ? 'frozen-explainer'
    : route === '/market-map/' && target.matches('[data-map-tile]') ? 'map-tile'
      : route === '/market-map/' && target.matches('[data-timeline-id] > button') ? 'timeline-row'
        : route === '/playground/' && target.matches('.pg-stage canvas') ? 'playground-canvas'
          : target instanceof SVGElement && target.matches('[role="button"], [role="slider"], [role="radio"], [tabindex]') ? 'chart-mark' : 'ordinary';
  const matched = document.activeElement === target && target.matches(':focus-visible');
  const forcedColors = matchMedia('(forced-colors: active)').matches;
  let systemInk = '', systemFocus = '';
  if (forcedColors) {
    const sample = document.createElement('span');
    sample.style.cssText = 'color: CanvasText; forced-color-adjust: none; display: none';
    document.body.append(sample); systemInk = getComputedStyle(sample).color;
    sample.style.color = 'Highlight'; systemFocus = getComputedStyle(sample).color; sample.remove();
  }
  const shown = (node: Element) => {
    const box = node.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0 || box.bottom <= 0 || box.top >= innerHeight || box.right <= 0 || box.left >= innerWidth) return false;
    for (let parent: Element | null = node; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    }
    return true;
  };
  const transparent = (colour: string) => colour === 'transparent' || /^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(colour);
  const retired = (colour: string) => ['rgb(198, 255, 25)', 'rgb(36, 95, 255)', 'rgb(36, 94, 219)'].includes(colour);
  const candidates = [target];
  // Only an actually hidden native input may delegate its ring to its label.
  if (target instanceof HTMLInputElement && getComputedStyle(target).opacity === '0') {
    candidates.push(...(target.labels ?? []));
    if (target.parentElement?.tagName === 'LABEL') candidates.push(target.parentElement);
    if (target.nextElementSibling && target.parentElement?.tagName === 'LABEL') candidates.push(target.nextElementSibling);
  }
  let owner = target;
  let style = getComputedStyle(target);
  for (const candidate of candidates) {
    const value = getComputedStyle(candidate);
    if (value.outlineStyle !== 'none' && parseFloat(value.outlineWidth) > 0 && !transparent(value.outlineColor) && shown(candidate)) {
      owner = candidate; style = value; break;
    }
  }
  let kind: FocusPaint['kind'] = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0 ? 'outline' : 'none';
  let widthPx = parseFloat(style.outlineWidth) || 0;
  let color = style.outlineColor;
  let offsetPx = parseFloat(style.outlineOffset) || 0;
  let ringStyle = style.outlineStyle;
  let visible = kind !== 'none' && shown(owner) && !transparent(color);
  if (scope === 'frozen-explainer' && target.matches('canvas') && style.boxShadow !== 'none') {
    const shadow = style.boxShadow.match(/(rgba?\([^)]+\)) 0px 0px 0px (\d+(?:\.\d+)?)px inset/);
    if (shadow) { kind = 'inset-shadow'; color = shadow[1]; widthPx = Number(shadow[2]); offsetPx = -widthPx; ringStyle = 'solid'; visible = shown(target) && !transparent(color); }
  }
  if (scope === 'chart-mark' && target instanceof SVGElement && target.ownerSVGElement) {
    const svg = target.ownerSVGElement;
    const ring = svg.querySelector<SVGGraphicsElement>('[data-focus-ring]');
    if (ring) {
      const value = getComputedStyle(ring), box = ring.getBoundingClientRect(), mark = target.getBoundingClientRect(), frame = svg.getBoundingClientRect();
      // A same-SVG decoration is insufficient: the ring must surround this
      // focused mark and stay outside clip groups and inside the SVG viewport.
      const binds = Math.abs((box.left + box.right - mark.left - mark.right) / 2) < 1 && Math.abs((box.top + box.bottom - mark.top - mark.bottom) / 2) < 1;
      kind = 'svg-ring'; widthPx = parseFloat(value.strokeWidth) || 0; color = value.stroke; offsetPx = 0; ringStyle = value.strokeDasharray === 'none' ? 'solid' : 'dashed';
      visible = shown(ring) && binds && box.left >= frame.left && box.right <= frame.right && box.top >= frame.top && box.bottom <= frame.bottom && !ring.closest('[clip-path]') && color !== 'none' && !transparent(color) && Number(value.strokeOpacity) > 0;
    }
  }
  return { route, target: target.outerHTML.replace(/\s+/g, ' ').slice(0, 250), scope, matched, kind, style: ringStyle, widthPx, color, offsetPx, visible, retiredPaint: visible && retired(color), forcedColors, systemInk, systemFocus };
}

type Candidate = { n: number; selector: string; member: string | null; nativeDisabled: boolean; group: string | null; arrows: string[] };

/** Focus pseudo-classes and reduced-motion transitions need a painted frame. */
export async function settleFocusPaint(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

/** Independent, unmerged structural census, before any focus measurement. */
function discoverFocusInstances(): Candidate[] {
  const selectorOf = (element: Element) => {
    const parts: string[] = [];
    for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
      parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${[...node.parentElement!.children].indexOf(node) + 1})`);
    }
    return `body > ${parts.join(' > ')}`;
  };
  const native = 'a[href],button,input:not([type="hidden"]),select,textarea,summary';
  const widget = '[role="button"],[role="checkbox"],[role="radio"],[role="slider"],[role="tab"],[role="switch"],[role="combobox"],[role="textbox"]';
  const found: Candidate[] = [];
  for (const element of document.querySelectorAll(`${native},${widget},[tabindex],[contenteditable="true"]`)) {
    if (element.closest('[inert],[aria-hidden="true"]')) continue;
    if (!element.matches(`${native},${widget}`) && (element as HTMLElement).tabIndex < 0) continue;
    if (!element.checkVisibility({ visibilityProperty: true })) continue;
    if (element.tagName === 'SUMMARY' && element.parentElement?.querySelector(':scope > summary') !== element) continue;
    const n = found.length, selector = selectorOf(element);
    element.setAttribute('data-focus-proof', String(n));
    let group: string | null = null, arrows: string[] = [];
    if (element instanceof HTMLInputElement && element.type === 'radio' && element.name) {
      group = `native-radio:${element.form ? selectorOf(element.form) : 'document'}:${element.name}`; arrows = ['ArrowRight', 'ArrowLeft'];
    } else if (element.matches('[data-map-tile]')) {
      group = 'map-tiles'; arrows = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
    } else if (element.matches('[data-timeline-id] > button')) {
      group = 'timeline-rows'; arrows = ['ArrowDown', 'ArrowUp'];
    } else if (element instanceof SVGElement && element.ownerSVGElement && element.matches('[role="button"][data-company-id]')) {
      group = selectorOf(element.ownerSVGElement); arrows = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
    } else if (element.closest('[role="radiogroup"],[role="tablist"]')) {
      group = selectorOf(element.closest('[role="radiogroup"],[role="tablist"]')!); arrows = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
    }
    found.push({ n, selector, member: element.getAttribute('data-brand-control-id'), nativeDisabled: (element as HTMLButtonElement).disabled === true, group, arrows });
  }
  return found;
}

/**
 * One actual full-page Tab traversal plus directed arrow exploration inside
 * roving groups. No target receives programmatic focus. Only an injected
 * start sentinel does; removing it returns the production DOM unchanged.
 */
export async function measureFocusInstances(page: Page, route: string, viewport: string): Promise<{ expected: string[]; instances: FocusInstance[] }> {
  // The page census includes controls inside disclosure content. Opening
  // native folds prepares this declared state; only the subsequent real
  // Tab/arrow walk can provide a reach witness for any of those controls.
  await page.evaluate(() => document.querySelectorAll<HTMLDetailsElement>('details').forEach((details) => { details.open = true; }));
  await settleFocusPaint(page);
  const candidates = await page.evaluate(discoverFocusInstances);
  const instances: FocusInstance[] = candidates.map((candidate) => ({
    id: `${route}|${viewport}|${candidate.selector}`, route, viewport, selector: candidate.selector, member: candidate.member,
    nativeDisabled: candidate.nativeDisabled, method: candidate.nativeDisabled ? 'native-disabled' : 'unreached', keys: [], state: '', pointerMethod: candidate.nativeDisabled ? 'native-disabled' : 'missing', keyboard: null, pointer: null,
  }));
  const activeIndex = () => page.evaluate(() => Number(document.activeElement?.getAttribute('data-focus-proof') ?? -1));
  const record = async (n: number, method: 'Tab' | 'arrow', keys: string[]) => {
    if (n < 0 || !instances[n] || instances[n].keyboard) return;
    await settleFocusPaint(page);
    const active = page.locator(`[data-focus-proof="${n}"]`);
    const reading = await active.evaluate(readFocusPaint);
    instances[n].method = method; instances[n].keys = keys; instances[n].keyboard = reading;
    instances[n].state = await active.evaluate((element) => 'disclosures-open|' + ['aria-pressed', 'aria-selected', 'aria-checked', 'aria-expanded', 'aria-disabled'].map((name) => `${name}=${element.getAttribute(name)}`).join('|') + ('checked' in element ? `|checked=${(element as HTMLInputElement).checked}` : ''));
  };
  await page.evaluate(() => {
    const start = document.createElement('button'); start.setAttribute('data-focus-start', ''); start.textContent = 'Focus audit start'; document.body.prepend(start);
    const end = document.createElement('button'); end.setAttribute('data-focus-end', ''); end.textContent = 'Focus audit end'; document.body.append(end);
    start.focus();
  });
  const explored = new Set<string>();
  const explore = async (start: number) => {
    const group = candidates[start]?.group;
    if (!group || explored.has(group)) return;
    explored.add(group);
    const members = candidates.filter((item) => item.group === group && !item.nativeDisabled);
    const edges = new Map<number, Map<string, number>>();
    let current = start;
    // Explore each directed key edge once. Known edges route the walk to a
    // discovered node with unexplored keys; inability to reach a member is
    // retained as a missing keyboard witness, never repaired with focus().
    for (let step = 0; step < members.length * (members[0]?.arrows.length ?? 0) * 4; step += 1) {
      const keys = candidates[current]?.arrows ?? [];
      const tried = edges.get(current) ?? new Map<string, number>(); edges.set(current, tried);
      const nextKey = keys.find((key) => !tried.has(key));
      if (nextKey) {
        await page.keyboard.press(nextKey); await page.waitForTimeout(20);
        const next = await activeIndex(); tried.set(nextKey, next);
        if (next < 0 || candidates[next]?.group !== group) break;
        current = next; await record(next, 'arrow', ['Tab', nextKey]);
        continue;
      }
      const queue: Array<{ n: number; path: string[] }> = [{ n: current, path: [] }], seen = new Set<number>();
      let path: string[] | null = null;
      while (queue.length) {
        const node = queue.shift()!; if (seen.has(node.n)) continue; seen.add(node.n);
        if ((candidates[node.n]?.arrows ?? []).some((key) => !edges.get(node.n)?.has(key))) { path = node.path; break; }
        for (const [key, next] of edges.get(node.n) ?? []) if (candidates[next]?.group === group) queue.push({ n: next, path: [...node.path, key] });
      }
      if (!path?.length) break;
      for (const key of path) { await page.keyboard.press(key); current = await activeIndex(); }
    }
  };
  try {
    const seen = new Set<number>();
    for (let step = 0; step <= candidates.length * 2 + 2; step += 1) {
      await page.keyboard.press('Tab'); await page.waitForTimeout(20);
      if (await page.locator('[data-focus-end]').evaluate((element) => document.activeElement === element)) break;
      const n = await activeIndex();
      if (n < 0 || seen.has(n)) break;
      seen.add(n); await record(n, 'Tab', ['Tab']); await explore(n);
    }
  } finally {
    await page.evaluate(() => document.querySelectorAll('[data-focus-start],[data-focus-end]').forEach((element) => element.remove()));
  }
  // Suppress activation/navigation while preserving the browser's real
  // pointer focus on mousedown. Native editable fields may still match
  // :focus-visible, which the raw reading records rather than overriding.
  await page.evaluate(() => {
    const stop = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
    (window as unknown as { __focusStop: typeof stop }).__focusStop = stop;
    document.addEventListener('click', stop, true);
  });
  try {
    for (const candidate of candidates) {
      if (candidate.nativeDisabled) continue;
      const target = page.locator(`[data-focus-proof="${candidate.n}"]`);
      if (!(await target.count()) || !(await target.isVisible())) continue;
      await page.mouse.click(1, 1);
      await target.scrollIntoViewIfNeeded();
      if (await target.evaluate((element) => element.matches('a.skip-link') && element.getBoundingClientRect().bottom <= 0)) {
        instances[candidate.n].pointerMethod = 'keyboard-revealed-skip-link';
        instances[candidate.n].pointer = await target.evaluate(readFocusPaint);
        continue;
      }
      await target.click({ force: true, timeout: 1500 });
      await settleFocusPaint(page);
      instances[candidate.n].pointerMethod = 'click';
      instances[candidate.n].pointer = await target.evaluate(readFocusPaint);
    }
  } finally {
    await page.evaluate(() => {
      document.removeEventListener('click', (window as unknown as { __focusStop: (event: Event) => void }).__focusStop, true);
      document.querySelectorAll('[data-focus-proof]').forEach((element) => element.removeAttribute('data-focus-proof'));
    });
  }
  return { expected: instances.map(({ id }) => id), instances };
}
