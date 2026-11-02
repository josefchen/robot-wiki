import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test, expect } from './brand-v2-static-fixture';
import { CANONICAL_PLAYGROUND_JOINTS, CANONICAL_PLAYGROUND_TRAJECTORY } from '../../lib/playground-canonical-fixture';
import { PLAYGROUND_NUMERICAL_PROFILES, RELEASE_PLAYGROUND_PATH, playgroundNumericalStateIds, playgroundReadingProblems, playgroundTransitionProblems, validateReleasePlayground, type PlaygroundReading } from '../../lib/brand-v2-release-playground';
import { readReleaseBuildStamp } from '../../lib/brand-v2-release-build';
import { canonicalPlaygroundLandmarks, canonicalPlaygroundModel } from '../../lib/brand-v2-playground-oracle';
import { collectPlaygroundNumericalReading } from './helpers/release-playground-numerical';
import { holdPlaybackAt, openImport, waitForArm } from './helpers/playground';
test('available renderer and canonical trajectory produce actual numerical/pixel proof', async ({
  browser,
  staticBase
}, testInfo) => {
  test.setTimeout(600_000);
  const root = process.cwd(),
    final = process.env.ROBOT_WIKI_RELEASE_PROFILES === '1';
  const build = final ? readReleaseBuildStamp(root) : null,
    readings: PlaygroundReading[] = [];
  if (final && process.env.ROBOT_WIKI_PLAYGROUND_DIAGNOSTIC_ORIGIN) throw Error('A diagnostic origin cannot produce stamped release evidence');
  const origin = process.env.ROBOT_WIKI_PLAYGROUND_DIAGNOSTIC_ORIGIN ?? staticBase;
  for (const profile of PLAYGROUND_NUMERICAL_PROFILES) {
    const context = await browser.newContext({
      viewport: {
        width: profile.width,
        height: profile.height
      },
      deviceScaleFactor: profile.dpr,
      reducedMotion: profile.id === 'reduced-motion' ? 'reduce' : 'no-preference'
    });
    try {
      const page = await context.newPage();
      if (profile.id === 'unavailable') await page.addInitScript(() => {
        HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
      });
      await page.goto(origin + '/playground/');
      const capture = async (state: string, steps: string[]) => {
        const baseline = readings.find(row => row.id === profile.id + (profile.id === 'high-dpr' ? ':resized' : ':default'));
        const waitCamera = baseline && (/reset$/.test(state) || state === 'trajectory-import' || state === 'trajectory-clear') ? {
          position: baseline.camera,
          target: baseline.cameraTarget
        } : undefined;
        const reading = await collectPlaygroundNumericalReading(page, profile.id + ':' + state, profile.id, steps, waitCamera);
        readings.push(reading);
        return reading;
      };
      if (profile.id === 'unavailable') {
        await expect(page.getByText(/WebGL is not available/)).toBeVisible();
        await capture('fallback', ['disable WebGL context creation', 'load separate unavailable fallback']);
        continue;
      }
      await waitForArm(page);
      await expect(page.getByTestId('playground-viewport')).toHaveAttribute('data-rendered-model', /"kind":"so101"/);
      await page.getByTestId('technical-names').locator('summary').focus();
      await page.keyboard.press('Enter');
      await capture('default', ['load active canonical SO-101', 'open technical names by keyboard', 'read actual object graph and framebuffer']);
      await page.getByTestId('playground-viewport').screenshot({
        path: testInfo.outputPath(profile.id + '-default.png')
      });
      if (profile.id === 'desktop' || profile.id === 'phone') {
        // A prior locator screenshot scrolls to its subject. Restore the
        // top before a page-wide image so sticky header/stage geometry is
        // captured in its initial placement, not halfway down the sheet.
        await page.evaluate(() => window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant'
        }));
        await page.waitForTimeout(150);
        await page.screenshot({
          path: testInfo.outputPath(profile.id + '-page.png'),
          fullPage: true
        });
      }
      const reset = async () => {
        await page.getByTestId('reset-pose').focus();
        await page.keyboard.press('Enter');
      };
      const change = async () => {
        const slider = page.getByTestId('joint-slider-shoulder_pan');
        await slider.focus();
        for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
      };
      const orbit = async () => {
        await page.locator('canvas').focus();
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('+');
      };
      if (profile.id === 'high-dpr') {
        await page.setViewportSize({
          width: 1440,
          height: 900
        });
        await capture('resized', ['resize live DPR3 context from phone to desktop', 'read semantic pose and drawing buffer']);
        await reset();
        await capture('reset', ['keyboard Reset pose at resized viewport']);
        continue;
      }
      if (profile.id === 'desktop') {
        for (const joint of CANONICAL_PLAYGROUND_JOINTS) {
          for (const [edge, key] of [['min', 'Home'], ['max', 'End']] as const) {
            await reset();
            await page.getByTestId('joint-slider-' + joint).focus();
            await page.keyboard.press(key);
            await capture(edge + ':' + joint, ['keyboard Reset pose', 'focus ' + joint, 'press ' + key, 'read actual endpoint graph and text']);
          }
        }
        await reset();
      }
      await change();
      await capture('fk-changed', ['focus Base turn', 'press ArrowRight ten times', 'read rendered kinematics after ten native range increments']);
      if (profile.id === 'phone') {
        await reset();
        await capture('reset', ['keyboard Reset pose', 'read reset pose/camera']);
        continue;
      }
      await orbit();
      await capture('camera-orbit', ['focus canvas', 'keyboard ArrowRight and +', 'read actual moved camera']);
      await reset();
      await capture(profile.id === 'desktop' ? 'camera-reset' : 'reset', ['keyboard Reset pose', 'read pose and camera against default']);
      if (profile.id === 'reduced-motion') continue;
      // Canonical home hand rounded to the same centimetre input precision
      // gives a reachable target without copying the solver's result.
      const end = canonicalPlaygroundLandmarks(canonicalPlaygroundModel(root), CANONICAL_PLAYGROUND_TRAJECTORY.keyframes[0].angles).links.gripper_frame_link;
      const home = [end[0], -end[2], end[1]] as const;
      for (const [state, target] of [['ik-reached', home], ['ik-unreachable', [.6, 0, .5]]] as const) {
        for (const [axis, value] of [['forward', target[0]], ['left', target[1]], ['up', target[2]]] as const) await page.getByTestId('reach-input-' + axis).fill((value * 100).toFixed(1));
        await page.getByTestId('reach-submit').focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('reach-status')).toHaveAttribute('data-state', state === 'ik-reached' ? 'reached' : 'unreachable', {
          timeout: 30000
        });
        await capture(state, ['enter reach target', 'keyboard Reach', 'wait for settled IK verdict', 'read actual target/hand/gap']);
      }
      await reset();
      await openImport(page);
      await page.getByTestId('trajectory-import-json').fill(JSON.stringify(CANONICAL_PLAYGROUND_TRAJECTORY));
      await page.getByTestId('trajectory-import').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('trajectory-count')).toContainText('2 poses');
      await page.getByTestId('trajectory-export').focus();
      await page.keyboard.press('Enter');
      await capture('trajectory-import', ['import sealed two-keyframe fixture', 'export the imported trajectory', 'read exact data round-trip']);
      await holdPlaybackAt(page, .6);
      await page.getByTestId('trajectory-play').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('trajectory-progress')).toHaveAttribute('data-t', '0.600', {
        timeout: 30000
      });
      await capture('trajectory-middle', ['keyboard start canonical playback', 'hold the real playback clock at 0.6 seconds', 'read intermediate graph/text/time']);
      await reset();
      await capture('trajectory-reset', ['keyboard Reset pose while trajectory exists', 'read zero pose/default camera and retained two keyframes']);
      await page.getByTestId('trajectory-clear').focus();
      await page.keyboard.press('Enter');
      await capture('trajectory-clear', ['keyboard Clear the recorded poses', 'read removed keyframes and unchanged reset pose']);
      for (const [state, invalid] of [['malformed-import', '{not JSON'], ['mismatched-import', JSON.stringify({
        ...CANONICAL_PLAYGROUND_TRAJECTORY,
        jointNames: ['unknown'],
        keyframes: [{
          angles: {
            unknown: 0
          }
        }]
      })]] as const) {
        await page.getByTestId('trajectory-import-json').fill(invalid);
        await page.getByTestId('trajectory-import').focus();
        await page.keyboard.press('Enter');
        await capture(state, ['submit ' + state + ' motion', 'read announced error and retained robot state']);
      }
    } finally {
      await context.close();
    }
  }
  const artifact = {
    version: 1,
    sourceFingerprint: build?.sourceAfter ?? '0'.repeat(64),
    exportFingerprint: build?.exportFingerprint ?? '0'.repeat(64),
    stateIds: playgroundNumericalStateIds(),
    readings
  };
  validateReleasePlayground(artifact, {
    source: artifact.sourceFingerprint,
    exported: artifact.exportFingerprint
  });
  const errors = readings.flatMap(row => Object.entries(playgroundReadingProblems(root, row)).flatMap(([assertion, failures]) => failures.map(failure => row.id + ' ' + assertion + ': ' + failure)));
  for (const [assertion, failures] of Object.entries(playgroundTransitionProblems(readings))) errors.push(...failures.map(failure => assertion + ': ' + failure));
  const output = build ? join(root, RELEASE_PLAYGROUND_PATH) : testInfo.outputPath('playground-numerical-pilot.json');
  mkdirSync(dirname(output), {
    recursive: true
  });
  writeFileSync(output, JSON.stringify(artifact, null, 2) + '\n');
  if (build) {
    const after = readReleaseBuildStamp(root);
    expect(after.sourceAfter).toBe(build.sourceAfter);
    expect(after.exportFingerprint).toBe(build.exportFingerprint);
  }
  expect(errors).toEqual([]);
});
