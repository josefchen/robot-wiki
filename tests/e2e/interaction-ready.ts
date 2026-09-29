import { expect, type Locator } from '@playwright/test';
import { setSlider } from './slider';

/**
 * Server HTML exposes controls before client event handlers work. React can
 * attach a fiber before Next completes its initial route commit, so require
 * both signals on the intended control rather than replaying lost actions.
 * This is a reader-test readiness guard; it changes no product behavior.
 */
export async function waitForHydration(control: Locator): Promise<void> {
  await expect.poll(() => control.evaluate((element) =>
    element.ownerDocument.defaultView?.history.state !== null &&
    Object.keys(element).some((key) => key.startsWith('__reactFiber$')),
  )).toBe(true);
}

export async function setHydratedSlider(slider: Locator, value: number): Promise<void> {
  await waitForHydration(slider);
  await setSlider(slider, value);
}
