import type { Locator } from '@playwright/test';

/**
 * Set a React-controlled range input's value deterministically.
 * Playwright's fill() assigns the value through the element's own
 * (React-tracked) setter, so React's change detection can swallow the
 * dispatched event and the onChange handler never fires; a readout
 * assertion then sees the stale value (intermittently, under full-suite
 * load). Going through the HTMLInputElement prototype setter leaves the
 * tracker behind and always delivers the event. Two occurrences of the
 * fill() flake are recorded in library/user-testing.md ("Known environment
 * quirks"); every e2e slider interaction goes through this helper.
 */
export async function setSlider(slider: Locator, value: number): Promise<void> {
  await slider.focus();
  await slider.evaluate((el, next) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(el, String(next));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
