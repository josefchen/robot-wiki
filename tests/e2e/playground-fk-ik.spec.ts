import { expect, test, type Page } from '@playwright/test';
import {
  SO101_JOINTS,
  expectReach,
  reachFor,
  readoutDeg,
  setSlider,
  techDeg,
  techPosition,
  techResidualMm,
  waitForArm,
} from './helpers/playground';

/**
 * FK/IK behaviour for the playground: sliders (forward kinematics),
 * click-to-reach and keyboard inverse kinematics, joint limits, the plain
 * readouts with the "Technical names" fold behind them, click-vs-drag
 * disambiguation, and post-solve slider sync.
 *
 * Readers see each joint by a plain name with its value in whole degrees
 * (the gripper as percent open), the hand in centimetres from the base, and
 * the reach as "Reached in N steps" or "Out of reach". The fold keeps the
 * exact values: URDF joint names with angles to a tenth of a degree, the
 * hand and target in metres in the base frame (x forward, y left, z up),
 * the gap in millimetres and the iteration count. Exactness is asserted on
 * those, agreement between the two on every joint.
 */

const PLAIN_NAMES: Record<(typeof SO101_JOINTS)[number], string> = {
  shoulder_pan: 'Base turn',
  shoulder_lift: 'Shoulder',
  elbow_flex: 'Elbow',
  wrist_flex: 'Wrist bend',
  wrist_roll: 'Wrist turn',
  gripper: 'Gripper open',
};

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

/** Every plain readout agrees with its technical angle (whole degrees, or percent for the gripper). */
async function expectReadoutsAgree(page: Page) {
  for (const joint of SO101_JOINTS) {
    const technical = await techDeg(page, joint);
    if (joint === 'gripper') {
      const slider = page.getByTestId('joint-slider-gripper');
      const max = Number(await slider.getAttribute('max'));
      const open = (100 * Math.min(max, Math.max(0, technical))) / max;
      const shown = await page.getByTestId('joint-readout-gripper').textContent();
      expect(shown).toMatch(/^\d+%$/);
      expect(Math.abs(Number.parseInt(shown!, 10) - open)).toBeLessThanOrEqual(0.6);
    } else {
      // Whole degrees against tenths, both rounded from the same angle.
      expect(Math.abs((await readoutDeg(page, joint)) - technical)).toBeLessThanOrEqual(0.55);
    }
  }
}

test.describe('playground forward kinematics', () => {
  test('renders one plainly named slider per revolute joint with its value', async ({
    page,
  }) => {
    await page.goto('/playground');
    await waitForArm(page);

    for (const joint of SO101_JOINTS) {
      const slider = page.getByTestId(`joint-slider-${joint}`);
      await expect(slider).toBeVisible();
      await expect(slider).toHaveAttribute('type', 'range');
      await expect(slider).toHaveAccessibleName(PLAIN_NAMES[joint]);
      const readout = page.getByTestId(`joint-readout-${joint}`);
      await expect(readout).toHaveText(joint === 'gripper' ? /^\d+%$/ : /^−?\d+°$/);
      // Slider min/max come straight from the URDF joint limits, which the
      // technical fold lists beside the URDF name.
      const min = Number(await slider.getAttribute('min'));
      const max = Number(await slider.getAttribute('max'));
      expect(Number.isFinite(min)).toBe(true);
      expect(Number.isFinite(max)).toBe(true);
      expect(min).toBeLessThan(max);
      const row = page.getByTestId(`tech-joint-${joint}`).locator('xpath=ancestor::tr');
      await expect(row).toContainText(joint);
      await expect(row).toContainText(PLAIN_NAMES[joint]);
      await expect(row).toContainText(
        `${Math.round(min) < 0 ? '−' : ''}${Math.abs(Math.round(min))} to ${Math.round(max)}`,
      );
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

    await expect(page.getByTestId('joint-readout-shoulder_lift')).toHaveText('45°');
    await expect(page.getByTestId('tech-joint-shoulder_lift')).toHaveText('+45.0°');
    await expect(page.getByTestId('joint-slider-shoulder_lift')).toHaveAttribute(
      'aria-valuetext',
      '45 degrees',
    );
    const after = await canvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);

    // A second joint composes instead of resetting the first.
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '-30');
    await expect(page.getByTestId('joint-readout-shoulder_pan')).toHaveText('−30°');
    await expect(page.getByTestId('tech-joint-shoulder_pan')).toHaveText('-30.0°');
    await expect(page.getByTestId('joint-readout-shoulder_lift')).toHaveText('45°');

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
      `${Math.round(max)}°`,
    );
    await expect(page.getByTestId('tech-joint-shoulder_pan')).toHaveText(
      `+${max.toFixed(1)}°`,
    );

    // Keyboard arrows beyond the limit produce no overshoot.
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('tech-joint-shoulder_pan')).toHaveText(
      `+${max.toFixed(1)}°`,
    );

    await setSlider(slider, '-9999');
    await expect(page.getByTestId('tech-joint-shoulder_pan')).toHaveText(
      `${min.toFixed(1)}°`,
    );
    await expect(page.getByTestId('joint-readout-shoulder_pan')).toHaveText(
      `−${Math.abs(Math.round(min))}°`,
    );
    const technical = await techDeg(page, 'shoulder_pan');
    expect(Number.isFinite(technical)).toBe(true);
    expect(technical).toBeCloseTo(min, 1);
  });
});

test.describe('playground inverse kinematics', () => {
  test('keyboard path: typed target converges, the verdict reports, sliders sync', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    // Aim a few centimetres off the home hand position: reachable by
    // construction.
    const home = await techPosition(page, 'tech-hand');
    await expect(page.getByTestId('hand-readout')).toHaveText(
      `Hand ${Math.round(home.x * 100)} cm forward, ${Math.abs(Math.round(home.y * 100))} cm ${home.y < -0.005 ? 'right' : 'left'}, ${Math.round(home.z * 100)} cm up`,
    );
    const target = { x: home.x - 0.04, y: home.y - 0.03, z: home.z + 0.02 };
    await reachFor(page, target);

    await expectReach(page, 'reached');
    expect(await techResidualMm(page)).toBeLessThan(1);
    const iterations = Number(
      await page.getByTestId('tech-iterations').textContent(),
    );
    expect(iterations).toBeGreaterThan(0);
    expect(iterations).toBeLessThan(100);
    await expect(page.getByTestId('reach-status')).toHaveText(
      `Reached in ${iterations} ${iterations === 1 ? 'step' : 'steps'}`,
    );

    // The hand actually landed on the target.
    const hand = await techPosition(page, 'tech-hand');
    expect(Math.abs(hand.x - target.x)).toBeLessThan(0.002);
    expect(Math.abs(hand.y - target.y)).toBeLessThan(0.002);
    expect(Math.abs(hand.z - target.z)).toBeLessThan(0.002);

    // Sliders synced to the solved pose: every plain readout matches the
    // technical angle, and moving a slider starts from the solved pose
    // (no snap-back).
    await expectReadoutsAgree(page);
    const solvedPan = await techDeg(page, 'shoulder_pan');
    await setSlider(
      page.getByTestId('joint-slider-shoulder_pan'),
      (solvedPan + 5).toFixed(1),
    );
    expect(await techDeg(page, 'shoulder_pan')).toBeCloseTo(solvedPan + 5, 0);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('a second target re-solves from the current pose', async ({ page }) => {
    await page.goto('/playground');
    await waitForArm(page);

    const home = await techPosition(page, 'tech-hand');
    await reachFor(page, { x: home.x - 0.03, y: home.y, z: home.z + 0.01 });
    await expectReach(page, 'reached');

    const second = { x: home.x + 0.02, y: home.y + 0.03, z: home.z - 0.05 };
    await reachFor(page, second);
    await expectReach(page, 'reached');

    await expect(page.getByTestId('tech-target')).toContainText(
      `x ${second.x >= 0 ? '+' : ''}${second.x.toFixed(3)}`,
    );
    const hand = await techPosition(page, 'tech-hand');
    expect(Math.abs(hand.z - second.z)).toBeLessThan(0.002);
    expect(await techResidualMm(page)).toBeLessThan(1);
  });

  test('unreachable target: honest gap, no crash, limits respected', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    // 60 cm forward and 50 cm up: past the arm's reach.
    await reachFor(page, { x: 0.6, y: 0, z: 0.5 });

    // The solver's own wall-clock guard is 2.5 s, but a busy SwiftShader
    // main thread can delay the interval callback that observes that guard.
    await expectReach(page, 'unreachable', 10_000);
    const residual = await techResidualMm(page);
    expect(residual).toBeGreaterThan(100);
    await expect(page.getByTestId('reach-status')).toHaveText(
      `Out of reach, ${Math.round(residual / 10)} cm short`,
    );
    const iterations = Number(
      await page.getByTestId('tech-iterations').textContent(),
    );
    expect(Number.isFinite(iterations)).toBe(true);

    // Every joint stays inside its slider range (the URDF limits).
    for (const joint of SO101_JOINTS) {
      const slider = page.getByTestId(`joint-slider-${joint}`);
      const max = Number(await slider.getAttribute('max'));
      const min = Number(await slider.getAttribute('min'));
      const value = await techDeg(page, joint);
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

    // A deliberate click on the floor places the target and starts a solve.
    // Done first, while the camera is in its known home framing; the same
    // click after arbitrary orbit/pan moves can legitimately land on the
    // arm (which swallows it) or beyond the click plane.
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
        await expect(page.getByTestId('tech-target')).not.toHaveText('none', {
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
    // A click lands on the table: the target's height is zero.
    expect((await techPosition(page, 'tech-target')).z).toBeCloseTo(0, 3);
    await expectReach(page, /^(reached|unreachable)$/, 10_000);
    const state = await page.getByTestId('reach-status').getAttribute('data-state');
    const residual = await techResidualMm(page);
    expect(Number.isFinite(residual)).toBe(true);
    if (state === 'reached') {
      expect(residual).toBeLessThan(1);
    }

    // The target persists until cleared.
    await page.getByTestId('reach-clear').click();
    await expect(page.getByTestId('tech-target')).toHaveText('none');
    await expect(page.getByTestId('reach-status')).toHaveAttribute('data-state', 'idle');

    const box = (await canvas.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Orbit drag across the workspace: no target may appear.
    await page.mouse.move(cx - 100, cy + 40);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy - 30, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByTestId('tech-target')).toHaveText('none');

    // Pan drag: still no target.
    await page.mouse.move(cx, cy + 60);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(cx - 140, cy + 90, { steps: 12 });
    await page.mouse.up({ button: 'right' });
    await expect(page.getByTestId('tech-target')).toHaveText('none');

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('reset returns to the home pose and view and clears the target', async ({
    page,
  }) => {
    await page.goto('/playground');
    await waitForArm(page);
    const viewport = page.getByTestId('playground-viewport');
    const homeCamera = await viewport.getAttribute('data-camera-position');

    const home = await techPosition(page, 'tech-hand');
    await reachFor(page, { x: home.x - 0.03, y: home.y, z: home.z });
    await expectReach(page, 'reached');
    await setSlider(page.getByTestId('joint-slider-elbow_flex'), '20');
    // Turn the view away from home.
    const canvas = page.locator('canvas');
    await canvas.focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(viewport).not.toHaveAttribute('data-camera-position', homeCamera!);

    await page.getByRole('button', { name: /reset pose/i }).click();

    for (const joint of SO101_JOINTS) {
      await expect(page.getByTestId(`joint-readout-${joint}`)).toHaveText(
        joint === 'gripper' ? '0%' : '0°',
      );
      await expect(page.getByTestId(`tech-joint-${joint}`)).toHaveText('+0.0°');
    }
    await expect(page.getByTestId('tech-target')).toHaveText('none');
    const hand = await techPosition(page, 'tech-hand');
    expect(Math.abs(hand.x - home.x)).toBeLessThan(0.001);
    expect(Math.abs(hand.z - home.z)).toBeLessThan(0.001);
    // The camera eases back to exactly the home view. The move takes 0.9 s;
    // the budget is for software rendering, which can draw a frame a second
    // when the suite has loaded the host.
    await expect(viewport).toHaveAttribute('data-camera-position', homeCamera!, {
      timeout: 15_000,
    });
  });
});
