import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * FK/IK behavior for the playground: sliders (forward kinematics),
 * click-to-reach and keyboard inverse kinematics, joint limits, HUD
 * readouts, click-vs-drag disambiguation, and post-solve slider sync.
 */

const JOINTS = [
  'shoulder_pan',
  'shoulder_lift',
  'elbow_flex',
  'wrist_flex',
  'wrist_roll',
  'gripper',
];

function collectErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    if (/^Failed to load resource/.test(msg.text())) return;
    consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  return { consoleErrors, pageErrors };
}

async function waitForArm(page: Page) {
  const status = page.getByTestId('robot-status');
  await expect(status).not.toHaveText(/loading/i, { timeout: 15_000 });
  await expect(status).toContainText('so-101');
  await expect(page.getByTestId('playground-hud')).toBeVisible();
}

/** Sets a range input's value and dispatches the events React listens to. */
async function setSlider(slider: Locator, value: string) {
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

async function readoutDeg(page: Page, joint: string): Promise<number> {
  const text = await page.getByTestId(`joint-readout-${joint}`).textContent();
  return Number.parseFloat((text ?? 'NaN').replace('°', ''));
}

async function hudJointDeg(page: Page, joint: string): Promise<number> {
  const text = await page.getByTestId(`hud-joint-${joint}`).textContent();
  return Number.parseFloat((text ?? 'NaN').replace('°', ''));
}

async function hudResidualMm(page: Page): Promise<number> {
  const text = await page.getByTestId('hud-residual').textContent();
  return Number.parseFloat((text ?? 'NaN').replace(' mm', ''));
}

/** Parses the "x +0.213 y +0.184 z -0.041" HUD line. */
async function hudPosition(testId: string, page: Page) {
  const text = (await page.getByTestId(testId).textContent()) ?? '';
  const match = text.match(
    /x\s+([+-]?[\d.]+)\s+y\s+([+-]?[\d.]+)\s+z\s+([+-]?[\d.]+)/,
  );
  if (!match) throw new Error(`cannot parse position from "${text}"`);
  return { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
}

test.describe('playground forward kinematics', () => {
  test('renders one labeled slider per revolute joint with degree readouts', async ({
    page,
  }) => {
    await page.goto('/playground');
    await waitForArm(page);

    for (const joint of JOINTS) {
      const slider = page.getByTestId(`joint-slider-${joint}`);
      await expect(slider).toBeVisible();
      await expect(slider).toHaveAttribute('type', 'range');
      await expect(slider).toHaveAccessibleName(new RegExp(joint));
      const readout = page.getByTestId(`joint-readout-${joint}`);
      await expect(readout).toHaveText(/^[+-]?\d+\.\d°$/);
      // Slider min/max come straight from the URDF joint limits.
      const min = Number(await slider.getAttribute('min'));
      const max = Number(await slider.getAttribute('max'));
      expect(Number.isFinite(min)).toBe(true);
      expect(Number.isFinite(max)).toBe(true);
      expect(min).toBeLessThan(max);
    }
    await expect(page.getByRole('slider')).toHaveCount(6);
  });

  test('moving a slider re-poses the arm live and the readouts track it', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    const canvas = page.locator('canvas');
    const before = await canvas.screenshot();

    await setSlider(page.getByTestId('joint-slider-shoulder_lift'), '45');

    await expect(page.getByTestId('joint-readout-shoulder_lift')).toHaveText(
      '+45.0°',
    );
    await expect(page.getByTestId('hud-joint-shoulder_lift')).toHaveText(
      '+45.0°',
    );
    const after = await canvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);

    // A second joint composes instead of resetting the first.
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '-30');
    await expect(page.getByTestId('joint-readout-shoulder_pan')).toHaveText(
      '-30.0°',
    );
    await expect(page.getByTestId('joint-readout-shoulder_lift')).toHaveText(
      '+45.0°',
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('sliders clamp at joint limits, including keyboard input past the end', async ({
    page,
  }) => {
    await page.goto('/playground');
    await waitForArm(page);

    const slider = page.getByTestId('joint-slider-shoulder_pan');
    const max = Number(await slider.getAttribute('max'));
    const min = Number(await slider.getAttribute('min'));

    await setSlider(slider, '9999');
    await expect(page.getByTestId('joint-readout-shoulder_pan')).toHaveText(
      `+${max.toFixed(1)}°`,
    );
    await expect(page.getByTestId('hud-joint-shoulder_pan')).toHaveText(
      `+${max.toFixed(1)}°`,
    );

    // Keyboard arrows beyond the limit produce no overshoot.
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('joint-readout-shoulder_pan')).toHaveText(
      `+${max.toFixed(1)}°`,
    );

    await setSlider(slider, '-9999');
    await expect(page.getByTestId('joint-readout-shoulder_pan')).toHaveText(
      `${min.toFixed(1)}°`,
    );
    const hud = await hudJointDeg(page, 'shoulder_pan');
    expect(Number.isFinite(hud)).toBe(true);
    expect(hud).toBeCloseTo(min, 1);
  });
});

test.describe('playground inverse kinematics', () => {
  test('keyboard path: typed target converges, HUD reports, sliders sync', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    // Aim a few centimeters off the home EE position: reachable by
    // construction.
    const home = await hudPosition('hud-ee-position', page);
    const target = { x: home.x - 0.04, y: home.y + 0.02, z: home.z + 0.03 };
    await page.getByTestId('ik-input-x').fill(target.x.toFixed(3));
    await page.getByTestId('ik-input-y').fill(target.y.toFixed(3));
    await page.getByTestId('ik-input-z').fill(target.z.toFixed(3));
    await page.getByTestId('ik-solve').click();

    await expect(page.getByTestId('hud-ik-status')).toHaveText('reached', {
      timeout: 3_000,
    });
    expect(await hudResidualMm(page)).toBeLessThan(1);
    const iterations = Number(
      await page.getByTestId('hud-iterations').textContent(),
    );
    expect(iterations).toBeGreaterThan(0);
    expect(iterations).toBeLessThan(100);

    // The EE actually landed on the target.
    const ee = await hudPosition('hud-ee-position', page);
    expect(Math.abs(ee.x - target.x)).toBeLessThan(0.002);
    expect(Math.abs(ee.y - target.y)).toBeLessThan(0.002);
    expect(Math.abs(ee.z - target.z)).toBeLessThan(0.002);

    // Sliders synced to the solved pose: every slider readout matches the
    // HUD joint angles, and moving a slider starts from the solved pose
    // (no snap-back).
    for (const joint of JOINTS) {
      expect(await readoutDeg(page, joint)).toBeCloseTo(
        await hudJointDeg(page, joint),
        0,
      );
    }
    const solvedPan = await readoutDeg(page, 'shoulder_pan');
    await setSlider(
      page.getByTestId('joint-slider-shoulder_pan'),
      (solvedPan + 5).toFixed(1),
    );
    expect(await readoutDeg(page, 'shoulder_pan')).toBeCloseTo(
      solvedPan + 5,
      0,
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('a second target re-solves from the current pose', async ({ page }) => {
    await page.goto('/playground');
    await waitForArm(page);

    const home = await hudPosition('hud-ee-position', page);
    const first = { x: home.x - 0.03, y: home.y + 0.01, z: home.z };
    await page.getByTestId('ik-input-x').fill(first.x.toFixed(3));
    await page.getByTestId('ik-input-y').fill(first.y.toFixed(3));
    await page.getByTestId('ik-input-z').fill(first.z.toFixed(3));
    await page.getByTestId('ik-solve').click();
    await expect(page.getByTestId('hud-ik-status')).toHaveText('reached', {
      timeout: 3_000,
    });

    const second = { x: home.x + 0.02, y: home.y - 0.05, z: home.z - 0.03 };
    await page.getByTestId('ik-input-x').fill(second.x.toFixed(3));
    await page.getByTestId('ik-input-y').fill(second.y.toFixed(3));
    await page.getByTestId('ik-input-z').fill(second.z.toFixed(3));
    await page.getByTestId('ik-solve').click();
    await expect(page.getByTestId('hud-ik-status')).toHaveText('reached', {
      timeout: 3_000,
    });

    await expect(page.getByTestId('hud-target')).toContainText(
      `x ${second.x >= 0 ? '+' : ''}${second.x.toFixed(3)}`,
    );
    const ee = await hudPosition('hud-ee-position', page);
    expect(Math.abs(ee.y - second.y)).toBeLessThan(0.002);
    expect(await hudResidualMm(page)).toBeLessThan(1);
  });

  test('unreachable target: honest residual, no crash, limits respected', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    await page.getByTestId('ik-input-x').fill('0.6');
    await page.getByTestId('ik-input-y').fill('0.5');
    await page.getByTestId('ik-input-z').fill('0');
    await page.getByTestId('ik-solve').click();

    await expect(page.getByTestId('hud-ik-status')).toHaveText('not reached', {
      // The solver's own wall-clock guard is 2.5 s, but a busy SwiftShader
      // main thread can delay the interval callback that observes that guard.
      timeout: 10_000,
    });
    const residual = await hudResidualMm(page);
    expect(residual).toBeGreaterThan(100);
    const iterations = Number(
      await page.getByTestId('hud-iterations').textContent(),
    );
    expect(Number.isFinite(iterations)).toBe(true);

    // Every joint stays inside its slider range (the URDF limits).
    for (const joint of JOINTS) {
      const slider = page.getByTestId(`joint-slider-${joint}`);
      const max = Number(await slider.getAttribute('max'));
      const min = Number(await slider.getAttribute('min'));
      const value = await readoutDeg(page, joint);
      expect(value).toBeGreaterThanOrEqual(min - 0.1);
      expect(value).toBeLessThanOrEqual(max + 0.1);
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('click sets a target; orbit drags never do', async ({ page }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    const canvas = page.locator('canvas');

    // A deliberate click on the ground places the gizmo and starts a solve.
    // Done first, while the camera is in its known initial framing; the
    // same click after arbitrary orbit/pan moves can legitimately land on
    // the arm (which swallows it) or beyond the click plane.
    //
    // In this headless environment a click on the canvas intermittently
    // never reaches the scene's click handlers (verified by
    // instrumentation: the DOM event fires but no scene handler runs).
    // Retry the click, then retry on a fresh page, before calling it a
    // failure.
    let placed = false;
    for (let attempt = 0; attempt < 4 && !placed; attempt += 1) {
      const box = (await canvas.boundingBox())!;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.click(cx + 60, cy + Math.min(box.height * 0.3, 120));
      try {
        await expect(page.getByTestId('hud-target')).not.toHaveText('none', {
          timeout: 2_000,
        });
        placed = true;
      } catch {
        if (attempt >= 1 && attempt < 3) {
          await page.reload();
          await waitForArm(page);
        }
      }
    }
    expect(placed).toBe(true);
    await expect(page.getByTestId('hud-ik-status')).not.toHaveText('solving', {
      timeout: 5_000,
    });
    const status = await page.getByTestId('hud-ik-status').textContent();
    expect(['reached', 'not reached']).toContain(status?.trim());
    const residual = await hudResidualMm(page);
    expect(Number.isFinite(residual)).toBe(true);
    if (status?.trim() === 'reached') {
      expect(residual).toBeLessThan(1);
    }

    // The gizmo persists until cleared.
    await page.getByTestId('ik-clear').click();
    await expect(page.getByTestId('hud-target')).toHaveText('none');

    const box = (await canvas.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Orbit drag across the workspace: no target may appear.
    await page.mouse.move(cx - 100, cy + 40);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy - 30, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByTestId('hud-target')).toHaveText('none');

    // Pan drag: still no target.
    await page.mouse.move(cx, cy + 60);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(cx - 140, cy + 90, { steps: 12 });
    await page.mouse.up({ button: 'right' });
    await expect(page.getByTestId('hud-target')).toHaveText('none');

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('reset returns to the home pose and clears the target', async ({
    page,
  }) => {
    await page.goto('/playground');
    await waitForArm(page);

    const home = await hudPosition('hud-ee-position', page);
    await page.getByTestId('ik-input-x').fill((home.x - 0.03).toFixed(3));
    await page.getByTestId('ik-input-y').fill(home.y.toFixed(3));
    await page.getByTestId('ik-input-z').fill(home.z.toFixed(3));
    await page.getByTestId('ik-solve').click();
    await expect(page.getByTestId('hud-ik-status')).toHaveText('reached', {
      timeout: 3_000,
    });
    await setSlider(page.getByTestId('joint-slider-elbow_flex'), '20');

    await page.getByRole('button', { name: /reset pose/i }).click();

    for (const joint of JOINTS) {
      await expect(page.getByTestId(`joint-readout-${joint}`)).toHaveText(
        '+0.0°',
      );
      await expect(page.getByTestId(`hud-joint-${joint}`)).toHaveText('+0.0°');
    }
    await expect(page.getByTestId('hud-target')).toHaveText('none');
    const ee = await hudPosition('hud-ee-position', page);
    expect(Math.abs(ee.x - home.x)).toBeLessThan(0.001);
    expect(Math.abs(ee.y - home.y)).toBeLessThan(0.001);
  });
});
