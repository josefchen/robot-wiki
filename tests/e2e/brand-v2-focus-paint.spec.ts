import { test, expect, brandV2Registry } from './brand-v2-static-fixture';
import { focusInstanceFailures, focusPaintFailures } from '../../lib/brand-v2-focus-paint';
import { measureFocusInstances, readFocusPaint } from './helpers/focus-paint';
import { interactiveLedgerPlan } from '../../lib/brand-v2-interactive-ledger';
import { measureLedgerMount } from './helpers/interactive-ledger-driver';

const styles = 'body{color:#1c1c1a;background:#fafaf8} :focus{outline:none} :focus-visible{outline:1px solid #1c1c1a;outline-offset:2px} button{margin:8px}';
const button = (id: string) => `<button id="${id}" data-brand-control-id="control:secondary-action">${id}</button>`;

test.describe('literal focus proof mutations', () => {
  test('measures every structural instance even when resting styles are identical', async ({ page }) => {
    await page.setContent(`<style>${styles} #second:focus-visible{outline-color:#245fff}</style>${button('first')}${button('second')}`);
    const reading = await measureFocusInstances(page, '/fixture/', '1440x900');
    expect(reading.expected).toHaveLength(2);
    expect(reading.instances[0].method).toBe('Tab');
    expect(focusInstanceFailures(reading.instances[0])).toEqual([]);
    expect(focusInstanceFailures(reading.instances[1]).join(' ')).toMatch(/retired|colour/);
  });
  test('a tabindex minus one control cannot acquire a reach witness through programmatic focus', async ({ page }) => {
    await page.setContent(`<style>${styles}</style>${button('first')}<button tabindex="-1" data-brand-control-id="control:secondary-action">Lost</button>`);
    const reading = await measureFocusInstances(page, '/fixture/', '1440x900');
    expect(reading.instances[1].method).toBe('unreached');
    expect(focusInstanceFailures(reading.instances[1])).toContain('not reached by actual Tab/arrow input');
  });
  test('the census reaches beyond thirty stops and includes initially closed disclosure controls', async ({ page }) => {
    await page.setContent(`<style>${styles} #last:focus-visible{outline-width:4px}</style>${Array.from({ length: 35 }, (_, i) => button(`item-${i}`)).join('')}<details><summary data-brand-control-id="control:secondary-action">More</summary>${button('last')}</details>`);
    const reading = await measureFocusInstances(page, '/fixture/', '1440x900');
    expect(reading.instances).toHaveLength(37);
    expect(reading.instances.at(-1)?.method).toBe('Tab');
    expect(focusInstanceFailures(reading.instances.at(-1)!).join(' ')).toMatch(/width 4px/);
  });
  test('native radios receive actual arrow witnesses and pointer inputs retain actual focus-visible matches', async ({ page }) => {
    await page.setContent(`<style>${styles}</style><input type="radio" name="choice" checked data-brand-control-id="control:selection"><input type="radio" name="choice" data-brand-control-id="control:selection"><input aria-label="Text" data-brand-control-id="control:input">`);
    const reading = await measureFocusInstances(page, '/fixture/', '1440x900');
    expect(reading.instances.map(({ method }) => method)).toEqual(['Tab', 'arrow', 'Tab']);
    expect(reading.instances.flatMap(focusInstanceFailures)).toEqual([]);
    expect(reading.instances[2].pointer?.matched).toBe(true);
  });
  test('focus-only pointer paint and wrong offset fail independently', async ({ page }) => {
    await page.setContent(`<style>${styles} #first:focus{outline:1px solid #1c1c1a;outline-offset:2px} #second:focus-visible{outline-offset:0}</style>${button('first')}${button('second')}`);
    const reading = await measureFocusInstances(page, '/fixture/', '1440x900');
    expect(reading.instances[0].pointer?.matched).toBe(false);
    expect(focusInstanceFailures(reading.instances[0])).toContain('focus paint appears without :focus-visible');
    expect(focusInstanceFailures(reading.instances[1]).join(' ')).toMatch(/offset/);
  });
  test('the nonmoving reader rejects a hidden or unrelated chart ring', async ({ page }) => {
    await page.setContent(`<svg width="300" height="150"><circle id="mark" tabindex="0" role="button" cx="50" cy="50" r="12" style="outline:none"/><circle data-focus-ring cx="50" cy="50" r="16" fill="none" stroke="#3b6ea8" stroke-width="2"/></svg>`);
    await page.keyboard.press('Tab');
    const target = page.locator('#mark');
    expect(focusPaintFailures(await target.evaluate(readFocusPaint), true)).toEqual([]);
    await page.locator('[data-focus-ring]').evaluate((ring) => ring.setAttribute('cx', '120'));
    expect(focusPaintFailures(await target.evaluate(readFocusPaint), true)).toContain('no visible focus ring');
    await page.locator('[data-focus-ring]').evaluate((ring) => { ring.setAttribute('cx', '50'); ring.setAttribute('opacity', '0'); });
    expect(focusPaintFailures(await target.evaluate(readFocusPaint), true)).toContain('no visible focus ring');
  });
  test('a selected-state focus regression is measured after the real key changes state', async ({ page }) => {
    await page.setContent(`<style>${styles} button[aria-pressed="true"]:focus-visible{outline-width:3px}</style><button aria-pressed="false" onclick="this.setAttribute('aria-pressed','true')">Select</button>`);
    await page.keyboard.press('Tab');
    expect(focusPaintFailures(await page.locator('button').evaluate(readFocusPaint), true)).toEqual([]);
    await page.keyboard.press('Enter');
    expect(focusPaintFailures(await page.locator('button').evaluate(readFocusPaint), true).join(' ')).toMatch(/width 3px/);
  });
  test('records the browser native system focus colour without moving focus in a forced-colours profile', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.setContent(`<style>${styles} input:focus-visible{outline-color:Highlight}</style><input type="search" aria-label="Find">`);
    await page.keyboard.press('Tab');
    const paint = await page.locator(':focus').evaluate(readFocusPaint);
    expect(paint.forcedColors).toBe(true);
    expect(paint.systemFocus).toBe(paint.color);
    expect(focusPaintFailures(paint, true)).toEqual([]);
    expect(await page.locator('input').evaluate((element) => document.activeElement === element)).toBe(true);
  });

  test('the real ledger persists literal paint for reached controls and every operated state', async ({ browser, staticBase }) => {
    test.setTimeout(180_000);
    const plan = interactiveLedgerPlan(brandV2Registry);
    const mount = plan.mounts.find(({ mountId }) => mountId === 'mount:/adjacent/surgical/:MotionPantograph:1')!;
    const observed: string[] = [];
    const reading = await measureLedgerMount(browser, staticBase, plan, mount, undefined, async (_page, state) => { observed.push(state.id); });
    const controls = reading.controls.filter(({ disabled }) => !disabled);
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.every(({ reached }) => reached)).toBe(true);
    expect(controls.flatMap(({ ring }) => focusPaintFailures(ring, true))).toEqual([]);
    expect(reading.transitions.length).toBeGreaterThan(0);
    expect(reading.transitions.flatMap(({ focus }) => focusPaintFailures(focus.paint, true))).toEqual([]);
    expect(reading.transitions.flatMap(({ pointer }) => 'paint' in pointer ? focusPaintFailures(pointer.paint, false) : [])).toEqual([]);
    expect(observed.filter((id) => id.startsWith('transition:'))).toHaveLength(reading.transitions.length);
  });
});
