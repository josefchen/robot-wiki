import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Trajectory record/replay and playground polish: keyframe capture, eased
 * playback, reset/clear, JSON export/import round trips, graceful edge
 * cases, reduced-motion degradation, responsive canvas, sustained input,
 * and a full scripted session with zero console errors.
 */

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

/** Records a keyframe at the current pose (record mode must be armed). */
async function addKeyframe(page: Page) {
  await page.getByTestId('trajectory-add').click();
}

/** Waits for an in-progress playback to finish. */
async function waitForPlaybackEnd(page: Page) {
  await expect(page.getByTestId('trajectory-message')).toHaveText(
    /playback finished/i,
    { timeout: 10_000 },
  );
  await expect(page.getByTestId('trajectory-progress')).toHaveCount(0);
}

/** Cubic ease-in-out, mirroring lib/trajectory.ts. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface PlaybackSample {
  /** Seconds into playback, from the progress readout. */
  t: number;
  /** Total duration, seconds. */
  duration: number;
  /** shoulder_pan readout, degrees, from the same DOM commit. */
  pan: number;
}

/**
 * Polls (progress t, joint readout) pairs until playback ends. Reading both
 * values in one evaluate keeps each sample consistent even when the
 * headless SwiftShader main thread lags behind wall-clock time.
 */
async function collectPlaybackSeries(page: Page): Promise<PlaybackSample[]> {
  const series: PlaybackSample[] = [];
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const sample = await page.evaluate(() => {
      const progressEl = document.querySelector(
        '[data-testid="trajectory-progress"]',
      );
      if (!progressEl) return null;
      const readoutEl = document.querySelector(
        '[data-testid="joint-readout-shoulder_pan"]',
      );
      const match = progressEl.textContent!.match(
        /t ([\d.]+) s \/ ([\d.]+) s/,
      );
      if (!match || !readoutEl) return null;
      return {
        t: Number(match[1]),
        duration: Number(match[2]),
        pan: Number.parseFloat(readoutEl.textContent!.replace('°', '')),
      };
    });
    if (sample === null) break;
    series.push(sample);
    await page.waitForTimeout(60);
  }
  return series;
}

test.describe('trajectory recording and playback', () => {
  test('record captures keyframes and the counter accumulates them', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    await expect(page.getByTestId('trajectory-count')).toHaveText(
      'no keyframes',
    );
    await page.getByTestId('trajectory-record').click();
    await expect(page.getByTestId('trajectory-record')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await addKeyframe(page);
    await expect(page.getByTestId('trajectory-count')).toHaveText('1 keyframe');

    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '45');
    await addKeyframe(page);
    await setSlider(page.getByTestId('joint-slider-elbow_flex'), '-30');
    await addKeyframe(page);
    await expect(page.getByTestId('trajectory-count')).toHaveText(
      '3 keyframes · 2.4 s',
    );
    await expect(page.getByTestId('trajectory-keyframe-0')).toBeVisible();
    await expect(page.getByTestId('trajectory-keyframe-2')).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('playback eases between keyframes and ends on the final pose', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    // Three keyframes, 0 -> 60 -> 60 degrees on shoulder_pan: one eased
    // segment then a hold, 2.4 s total, so there is a wide window to sample
    // the eased curve even when evaluate calls lag behind wall-clock time.
    await page.getByTestId('trajectory-record').click();
    await addKeyframe(page); // home pose, pan at 0
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '60');
    await addKeyframe(page);
    await addKeyframe(page); // hold at 60
    // Playback starts from wherever the arm is; park it on the first pose.
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '0');

    await page.getByTestId('trajectory-play').click();
    await expect(page.getByTestId('trajectory-progress')).toBeVisible();

    const series = await collectPlaybackSeries(page);

    // The pose updated continuously through playback (no teleport).
    expect(series.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i].pan).toBeGreaterThanOrEqual(series[i - 1].pan - 0.2);
      expect(series[i].t).toBeGreaterThanOrEqual(series[i - 1].t);
    }

    // Every sample tracks the eased curve exactly (DOM pairs come from the
    // same commit, so a linear playback would miss by several degrees).
    const expectedPan = (t: number, duration: number) => {
      const segment = duration / 2;
      if (t >= segment) return 60; // second segment holds the pose
      return 60 * easeInOutCubic(t / segment);
    };
    for (const sample of series) {
      expect(
        Math.abs(sample.pan - expectedPan(sample.t, sample.duration)),
      ).toBeLessThanOrEqual(1.5);
    }

    // The tracking check above is the instrumental easing verification;
    // this guard keeps it honest by requiring at least one sample where
    // eased and linear genuinely differ (more than 2 degrees apart),
    // otherwise a linear playback could sneak through the tolerance.
    const discriminating = series.filter((s) => {
      const segment = s.duration / 2;
      if (s.t >= segment) return false;
      return Math.abs(easeInOutCubic(s.t / segment) - s.t / segment) * 60 > 2;
    });
    expect(discriminating.length).toBeGreaterThan(0);

    await waitForPlaybackEnd(page);
    expect(await readoutDeg(page, 'shoulder_pan')).toBeCloseTo(60, 0);
    await expect(page.getByTestId('hud-joint-shoulder_pan')).toHaveText(
      '+60.0°',
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('a single-keyframe trajectory moves straight to the pose', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    await page.getByTestId('trajectory-record').click();
    await setSlider(page.getByTestId('joint-slider-shoulder_lift'), '30');
    await addKeyframe(page);
    await setSlider(page.getByTestId('joint-slider-shoulder_lift'), '0');

    await page.getByTestId('trajectory-play').click();
    await expect(page.getByTestId('trajectory-message')).toHaveText(
      /single keyframe/i,
    );
    await expect(
      page.getByTestId('joint-readout-shoulder_lift'),
    ).toHaveText('+30.0°');

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('clear empties the trajectory and stops playback', async ({ page }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    await page.getByTestId('trajectory-record').click();
    await addKeyframe(page);
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '40');
    await addKeyframe(page);
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '0');

    await page.getByTestId('trajectory-play').click();
    await expect(page.getByTestId('trajectory-progress')).toBeVisible();
    await page.getByTestId('trajectory-clear').click();

    await expect(page.getByTestId('trajectory-count')).toHaveText(
      'no keyframes',
    );
    await expect(page.getByTestId('trajectory-progress')).toHaveCount(0);
    // Playback with no keyframes is disabled and explains itself.
    await expect(page.getByTestId('trajectory-play')).toBeDisabled();
    await expect(page.getByTestId('trajectory-message')).toHaveText(/record/i);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});

test.describe('trajectory export and import', () => {
  /** Records a 3-keyframe trajectory and exports it; returns the JSON. */
  async function recordAndExport(page: Page): Promise<string> {
    await page.getByTestId('trajectory-record').click();
    await addKeyframe(page);
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '45');
    await setSlider(page.getByTestId('joint-slider-shoulder_lift'), '20');
    await addKeyframe(page);
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '-30');
    await setSlider(page.getByTestId('joint-slider-elbow_flex'), '25');
    await addKeyframe(page);
    await page.getByTestId('trajectory-export').click();
    return page.getByTestId('trajectory-export-json').inputValue();
  }

  test('export produces valid JSON with the recorded keyframes', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    const text = await recordAndExport(page);
    const parsed = JSON.parse(text);
    expect(parsed.format).toBe('robot-atlas-trajectory');
    expect(parsed.version).toBe(1);
    expect(parsed.keyframes).toHaveLength(3);
    expect(parsed.jointNames).toHaveLength(6);
    for (const keyframe of parsed.keyframes) {
      for (const joint of parsed.jointNames) {
        expect(Number.isFinite(keyframe.angles[joint])).toBe(true);
      }
    }
    await expect(page.getByTestId('trajectory-count')).toHaveText(/^3 keyframes/);
    await expect(page.getByTestId('trajectory-download')).toHaveAttribute(
      'download',
      /trajectory\.json$/,
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('import round-trips an exported trajectory and replays it', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    const exported = await recordAndExport(page);
    const finalKeyframe = JSON.parse(exported).keyframes[2].angles;

    // Disturb the pose and wipe the trajectory, then re-import.
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '-60');
    await page.getByTestId('trajectory-clear').click();
    await expect(page.getByTestId('trajectory-count')).toHaveText(
      'no keyframes',
    );

    await page.getByTestId('trajectory-import-json').fill(exported);
    await page.getByTestId('trajectory-import').click();
    await expect(page.getByTestId('trajectory-count')).toHaveText(/^3 keyframes/);
    await expect(page.getByTestId('trajectory-message')).toHaveText(
      /imported 3 keyframes/i,
    );

    // Playback lands on the imported final pose within a degree per joint.
    await page.getByTestId('trajectory-play').click();
    await waitForPlaybackEnd(page);
    const RAD_TO_DEG = 180 / Math.PI;
    for (const [joint, radians] of Object.entries(finalKeyframe)) {
      const expected = (radians as number) * RAD_TO_DEG;
      expect(await readoutDeg(page, joint)).toBeCloseTo(expected, 0);
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  const BAD_IMPORTS: Array<[string, object | string, RegExp]> = [
    ['malformed JSON', '{not a trajectory', /not valid json/i],
    [
      'an empty keyframes array',
      { format: 'robot-atlas-trajectory', version: 1, keyframes: [] },
      /no keyframes/i,
    ],
    [
      'mismatched joint names',
      {
        format: 'robot-atlas-trajectory',
        version: 1,
        keyframes: [{ angles: { shoulder_pan: 0, mystery_joint: 0.2 } }],
      },
      /does not match this arm/i,
    ],
    [
      'out-of-range joint angles',
      {
        format: 'robot-atlas-trajectory',
        version: 1,
        keyframes: [
          {
            angles: {
              shoulder_pan: 99,
              shoulder_lift: 0,
              elbow_flex: 0,
              wrist_flex: 0,
              wrist_roll: 0,
              gripper: 0,
            },
          },
        ],
      },
      /outside its limits/i,
    ],
  ];

  for (const [label, payload, pattern] of BAD_IMPORTS) {
    test(`rejects ${label} without crashing or losing state`, async ({
      page,
    }) => {
      const { consoleErrors, pageErrors } = collectErrors(page);
      await page.goto('/playground');
      await waitForArm(page);

      await page.getByTestId('trajectory-record').click();
      await addKeyframe(page);
      await expect(page.getByTestId('trajectory-count')).toHaveText(
        '1 keyframe',
      );

      const text =
        typeof payload === 'string' ? payload : JSON.stringify(payload);
      await page.getByTestId('trajectory-import-json').fill(text);
      await page.getByTestId('trajectory-import').click();

      const message = page.getByTestId('trajectory-message');
      await expect(message).toHaveText(pattern);
      await expect(message).toHaveAttribute('role', 'alert');
      // The previously recorded keyframe survives the failed import.
      await expect(page.getByTestId('trajectory-count')).toHaveText(
        '1 keyframe',
      );

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
});

test.describe('playground polish', () => {
  test('reduced motion: playback steps discretely, controls stay usable', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    await page.getByTestId('trajectory-record').click();
    await addKeyframe(page);
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '50');
    await addKeyframe(page);
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '0');

    await page.getByTestId('trajectory-play').click();
    // Every mid-playback sample holds the first pose: discrete state
    // changes instead of eased motion.
    const midSamples: number[] = [];
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const sample = await page.evaluate(() => {
        const progressEl = document.querySelector(
          '[data-testid="trajectory-progress"]',
        );
        if (!progressEl) return null;
        const readoutEl = document.querySelector(
          '[data-testid="joint-readout-shoulder_pan"]',
        );
        return Number.parseFloat(readoutEl!.textContent!.replace('°', ''));
      });
      if (sample === null) break;
      midSamples.push(sample);
      await page.waitForTimeout(80);
    }
    expect(midSamples.length).toBeGreaterThan(0);
    for (const value of midSamples) {
      expect(Math.abs(value)).toBeLessThan(0.6);
    }
    await waitForPlaybackEnd(page);
    expect(await readoutDeg(page, 'shoulder_pan')).toBeCloseTo(50, 0);

    // Sliders and reset still work under reduced motion.
    await setSlider(page.getByTestId('joint-slider-elbow_flex'), '20');
    await expect(page.getByTestId('joint-readout-elbow_flex')).toHaveText(
      '+20.0°',
    );
    await page.getByRole('button', { name: /reset pose/i }).click();
    await expect(page.getByTestId('joint-readout-elbow_flex')).toHaveText(
      '+0.0°',
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('canvas and controls fit a 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(375);

    // No horizontal overflow anywhere on the page.
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(376);

    // Controls remain reachable and usable at mobile width.
    await page.getByTestId('trajectory-record').scrollIntoViewIfNeeded();
    await page.getByTestId('trajectory-record').click();
    await addKeyframe(page);
    await expect(page.getByTestId('trajectory-count')).toHaveText('1 keyframe');
    const slider = page.getByTestId('joint-slider-shoulder_pan');
    await slider.scrollIntoViewIfNeeded();
    await setSlider(slider, '30');
    await expect(page.getByTestId('joint-readout-shoulder_pan')).toHaveText(
      '+30.0°',
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('sustained slider input keeps readouts live with no frame gaps', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    // Sweep shoulder_pan back and forth for ~4 seconds, sampling the
    // readout at >= 1 Hz. Every sample must match the slider value and
    // change between samples: no frozen frames.
    const slider = page.getByTestId('joint-slider-shoulder_pan');
    const targets = ['40', '-35', '55', '-50', '25', '-15', '45', '0'];
    let previous = await readoutDeg(page, 'shoulder_pan');
    for (const target of targets) {
      const started = Date.now();
      await setSlider(slider, target);
      const value = await readoutDeg(page, 'shoulder_pan');
      expect(value).toBeCloseTo(Number.parseFloat(target), 0);
      expect(value).not.toBeCloseTo(previous, 0);
      previous = value;
      // Keep the sweep moving for roughly 4.5 s of sustained input.
      const remaining = 550 - (Date.now() - started);
      if (remaining > 0) await page.waitForTimeout(remaining);
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('full scripted session produces zero console errors', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');
    await waitForArm(page);

    // Orbit: rotate, zoom, pan.
    const canvas = page.locator('canvas');
    const box = (await canvas.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy + 30, { steps: 8 });
    await page.mouse.up();
    await page.mouse.wheel(0, -400);
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(cx - 80, cy + 40, { steps: 8 });
    await page.mouse.up({ button: 'right' });

    // Move every slider.
    for (const joint of [
      'shoulder_pan',
      'shoulder_lift',
      'elbow_flex',
      'wrist_flex',
      'wrist_roll',
      'gripper',
    ]) {
      await setSlider(page.getByTestId(`joint-slider-${joint}`), '15');
    }

    // Reachable IK target, then an unreachable one.
    const eeText = await page.getByTestId('hud-ee-position').textContent();
    const match = eeText!.match(
      /x\s+([+-]?[\d.]+)\s+y\s+([+-]?[\d.]+)\s+z\s+([+-]?[\d.]+)/,
    )!;
    await page.getByTestId('ik-input-x').fill((Number(match[1]) - 0.03).toFixed(3));
    await page.getByTestId('ik-input-y').fill(Number(match[2]).toFixed(3));
    await page.getByTestId('ik-input-z').fill(Number(match[3]).toFixed(3));
    await page.getByTestId('ik-solve').click();
    await expect(page.getByTestId('hud-ik-status')).toHaveText('reached', {
      timeout: 3_000,
    });

    await page.getByTestId('ik-input-x').fill('0.6');
    await page.getByTestId('ik-input-y').fill('0.5');
    await page.getByTestId('ik-input-z').fill('0');
    await page.getByTestId('ik-solve').click();
    await expect(page.getByTestId('hud-ik-status')).toHaveText('not reached', {
      timeout: 5_000,
    });
    await page.getByTestId('ik-clear').click();

    // Record a 3-keyframe trajectory, play it back, export it, reset.
    await page.getByRole('button', { name: /reset pose/i }).click();
    await page.getByTestId('trajectory-record').click();
    await addKeyframe(page);
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '40');
    await setSlider(page.getByTestId('joint-slider-shoulder_lift'), '25');
    await addKeyframe(page);
    await setSlider(page.getByTestId('joint-slider-elbow_flex'), '-20');
    await addKeyframe(page);
    await expect(page.getByTestId('trajectory-count')).toHaveText(/^3 keyframes/);
    await page.getByTestId('trajectory-play').click();
    await waitForPlaybackEnd(page);
    await page.getByTestId('trajectory-export').click();
    const exported = await page
      .getByTestId('trajectory-export-json')
      .inputValue();
    expect(JSON.parse(exported).keyframes).toHaveLength(3);
    await page.getByRole('button', { name: /reset pose/i }).click();
    await expect(page.getByTestId('joint-readout-shoulder_pan')).toHaveText(
      '+0.0°',
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
