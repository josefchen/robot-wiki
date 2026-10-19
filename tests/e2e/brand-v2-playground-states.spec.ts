import { BRAND_V2_FLOW_SUITES, executeEvidencePlans } from '../../lib/brand-v2-runners';
import { expect, test } from './brand-v2-static-fixture';
import { openImport, waitForPlayground } from './helpers/playground';
import { setSlider } from './slider';

test.describe('brand-v2-playground-states', () => {
  test('executes ordered FK/IK, import/error, trajectory, and fallback phases', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(120_000);
    const flow = BRAND_V2_FLOW_SUITES['brand-v2-playground-states'];
    const records = await executeEvidencePlans(
      [{ id: 'route:/playground/', ...flow }],
      {
        step: async (_, step) => {
          if (step.order === 1) {
            await page.goto(`${staticBase}/playground/`);
            await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 });
            // The controls are live once the root says so; a click before
            // that could land on server HTML.
            await waitForPlayground(page);
          }
          await test.step(step.action, async () => {
            await expect(page.getByTestId('playground-viewport')).toBeVisible();
            if (step.action === 'exercise-fk-ik') {
              await setSlider(
                page.getByTestId('joint-slider-shoulder_pan'),
                10,
              );
              await expect(
                page.getByTestId('joint-readout-shoulder_pan'),
              ).toContainText('10');
              // 60 cm forward, 50 cm up: out of reach.
              await page.getByTestId('reach-input-forward').fill('60');
              await page.getByTestId('reach-input-left').fill('0');
              await page.getByTestId('reach-input-up').fill('50');
              await page.getByTestId('reach-submit').click();
              // The incremental solver ends on convergence, its 100-iteration
              // cap, or the 2.5s wall-clock guard in
              // use-playground-kinematics, so the settled state always
              // arrives. Observing it costs much longer on a software-WebGL
              // host: every solver tick re-renders the SwiftShader scene, and
              // a measured solve on this Linux box settled at ~4.2s with
              // Playwright managing only five locator polls in 5s. The budget
              // covers that without accepting the transient `solving`, which
              // still fails the assertion if the solver never settles.
              await expect(page.getByTestId('reach-status')).toHaveAttribute(
                'data-state',
                /^(reached|unreachable)$/,
                { timeout: 30_000 },
              );
              await expect(page.getByTestId('reach-status')).toHaveText(
                /^(Reached in \d+ steps?|Out of reach, \d+ (cm|mm) short)$/,
              );
            } else if (step.action === 'import-export-errors') {
              await openImport(page);
              await page
                .getByTestId('trajectory-import-json')
                .fill('{"format":"wrong"}');
              await page.getByTestId('trajectory-import').click();
              await expect(page.getByTestId('trajectory-message')).toContainText(
                /invalid|format|trajectory/i,
              );
            } else if (step.action === 'play-reset-clear') {
              await page.getByTestId('trajectory-record').click();
              await setSlider(
                page.getByTestId('joint-slider-shoulder_pan'),
                20,
              );
              await page.getByTestId('trajectory-record').click();
              await page.getByRole('button', { name: 'Reset pose' }).click();
              await expect(page.getByTestId('trajectory-count')).toContainText(
                '2 poses',
              );
              await page.getByTestId('trajectory-clear').click();
              await expect(page.getByTestId('trajectory-count')).toContainText(
                /No poses/i,
              );
            } else if (
              step.action === 'fallback-and-reduced-motion'
            ) {
              await page.emulateMedia({ reducedMotion: 'reduce' });
              await page.reload();
              await expect(page.locator('canvas')).toBeVisible({
                timeout: 30_000,
              });
              await waitForPlayground(page);
              await setSlider(
                page.getByTestId('joint-slider-shoulder_pan'),
                5,
              );
              await expect(
                page.getByTestId('joint-readout-shoulder_pan'),
              ).toContainText('5');
              await page.addInitScript(() => {
                HTMLCanvasElement.prototype.getContext = (() =>
                  null) as typeof HTMLCanvasElement.prototype.getContext;
              });
              await page.reload();
              await expect(
                page.getByText(/WebGL is not available/i),
              ).toBeVisible();
              await expect(page.locator('canvas')).toHaveCount(0);
            } else {
              throw new Error(`Unsupported playground flow action: ${step.action}`);
            }
          });
        },
        capture: async (_, capture) => {
          await test.step(capture.id, async () => {
            if (capture.afterStep === 'step:4:fallback-and-reduced-motion') {
              await expect(page.getByText(/WebGL is not available/i)).toBeVisible();
              await expect(page.locator('canvas')).toHaveCount(0);
            } else {
              expect(
                await page.locator('main input, main button').count(),
              ).toBeGreaterThan(0);
            }
          });
        },
      },
    );
    expect(records[0].steps).toHaveLength(flow.steps.length);
    expect(records[0].captures).toHaveLength(flow.captures.length);
  });
});
