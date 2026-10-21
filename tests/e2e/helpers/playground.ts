import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Shared steps for the playground specs. The playground's root carries
 * `data-playground-state`: `loading` in the server HTML and until the arm
 * and its controls are live, then `ready` (or `unavailable` without WebGL).
 * Waiting on it, not on time, is what keeps a click from landing before
 * the controls are hydrated.
 */

export const SO101_JOINTS = [
  'shoulder_pan',
  'shoulder_lift',
  'elbow_flex',
  'wrist_flex',
  'wrist_roll',
  'gripper',
] as const;

/** Waits until the arm and every control are live. */
export async function waitForPlayground(page: Page, timeout = 30_000) {
  await expect(page.getByTestId('playground')).toHaveAttribute(
    'data-playground-state',
    'ready',
    { timeout },
  );
}

/**
 * Waits for the SO-101 itself (not the fallback arm) to be live and drawn:
 * the stage publishes its camera after the first frame with the arm in it.
 */
export async function waitForArm(page: Page) {
  await waitForPlayground(page);
  await expect(page.getByTestId('robot-status')).toContainText('SO-101');
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-scene-ready',
    'true',
    { timeout: 15_000 },
  );
  await expect(page.getByTestId('playground-viewport')).toHaveAttribute(
    'data-camera-position',
    /^-?[\d.]+,-?[\d.]+,-?[\d.]+$/,
  );
}

/** Sets a range input's value and dispatches the events React listens to. */
export async function setSlider(slider: Locator, value: string) {
  await slider.evaluate((el, v) => {
    const input = el as HTMLInputElement;
    // Bypass React's value tracker: direct `input.value = v` assignments are
    // invisible to React's synthetic change detection.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;
    setter.call(input, v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/** Parses a signed number that may use a typographic minus. */
export function parseSigned(text: string | null): number {
  return Number.parseFloat((text ?? 'NaN').replace('−', '-'));
}

/** The plain readout beside a slider, in whole degrees ("45°", "−30°"). */
export async function readoutDeg(page: Page, joint: string): Promise<number> {
  return parseSigned(await page.getByTestId(`joint-readout-${joint}`).textContent());
}

/** The technical readout, degrees to a tenth ("+45.0°"). */
export async function techDeg(page: Page, joint: string): Promise<number> {
  return parseSigned(await page.getByTestId(`tech-joint-${joint}`).textContent());
}

export interface BasePoint {
  /** Metres forward of the base (URDF x). */
  x: number;
  /** Metres to the arm's left (URDF y). */
  y: number;
  /** Metres up from the table (URDF z). */
  z: number;
}

/** Parses an "x +0.213 y +0.041 z +0.184" technical readout (metres, base frame). */
export async function techPosition(page: Page, testId: 'tech-hand' | 'tech-target'): Promise<BasePoint> {
  const text = (await page.getByTestId(testId).textContent()) ?? '';
  const match = text.match(/x\s+([+-]?[\d.]+)\s+y\s+([+-]?[\d.]+)\s+z\s+([+-]?[\d.]+)/);
  if (!match) throw new Error(`cannot parse a position from "${text}"`);
  return { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
}

/** The gap the solver reports, millimetres. */
export async function techResidualMm(page: Page): Promise<number> {
  const text = await page.getByTestId('tech-residual').textContent();
  return Number.parseFloat((text ?? 'NaN').replace(' mm', ''));
}

/** Types a target (metres, base frame) into the Reach boxes, in centimetres, and presses Reach. */
export async function reachFor(page: Page, target: BasePoint) {
  await page.getByTestId('reach-input-forward').fill((target.x * 100).toFixed(1));
  await page.getByTestId('reach-input-left').fill((target.y * 100).toFixed(1));
  await page.getByTestId('reach-input-up').fill((target.z * 100).toFixed(1));
  await page.getByTestId('reach-submit').click();
}

/**
 * Waits for the reach verdict to settle on one of the given states. The
 * solver steps on a timer; the budget covers a software-rendered page whose
 * frames (shadows included) hold the main thread under a loaded suite.
 */
export async function expectReach(
  page: Page,
  state: 'reached' | 'unreachable' | RegExp,
  timeout = 10_000,
) {
  await expect(page.getByTestId('reach-status')).toHaveAttribute('data-state', state, { timeout });
}

/**
 * Holds the next playback `seconds` into the motion. Playback reads the time
 * from Date.now() on a 40 ms timer; from the press of Play the page's clock
 * runs two ticks (80 ms) per read and stops at `seconds`, so the stage and
 * its text settle part-way between two poses however rarely a software
 * rasteriser lets the timer fire. The press is caught in the capture phase,
 * before React's handler takes its start time. Navigating restores the
 * real clock.
 */
export async function holdPlaybackAt(page: Page, seconds: number) {
  await page.evaluate((holdMs) => {
    const realNow = Date.now.bind(Date);
    let start: number | null = null;
    let now = 0;
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as Element | null;
        if (start !== null || !target?.closest('[data-testid="trajectory-play"]')) return;
        start = realNow();
        now = start - 80;
      },
      true,
    );
    Date.now = () => {
      if (start === null) return realNow();
      now = Math.min(now + 80, start + holdMs);
      return now;
    };
  }, Math.round(seconds * 1000));
}

/** Opens the "Import a motion" fold. */
export async function openImport(page: Page) {
  const fold = page.getByTestId('trajectory-import-fold');
  if ((await fold.getAttribute('open')) === null) await fold.locator('summary').click();
  await expect(page.getByTestId('trajectory-import-json')).toBeVisible();
}
