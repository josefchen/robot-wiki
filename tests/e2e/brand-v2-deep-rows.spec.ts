import {
  BRAND_V2_DEEP_ROWS,
  executeEvidencePlans,
  validateDeepRows,
} from '../../lib/brand-v2-runners';
import {
  archivedExpectedRed,
  expect,
  test,
} from './brand-v2-static-fixture';
import { setSlider } from './slider';

const TWO_KEYFRAME_TRAJECTORY = JSON.stringify({
  format: 'robot-atlas-trajectory',
  version: 1,
  jointNames: [
    'shoulder_pan',
    'shoulder_lift',
    'elbow_flex',
    'wrist_flex',
    'wrist_roll',
    'gripper',
  ],
  segmentSeconds: 1.2,
  keyframes: [
    {
      angles: {
        shoulder_pan: 0,
        shoulder_lift: 0,
        elbow_flex: 0,
        wrist_flex: 0,
        wrist_roll: 0,
        gripper: 0,
      },
    },
    {
      angles: {
        shoulder_pan: 0.2,
        shoulder_lift: 0.1,
        elbow_flex: -0.1,
        wrist_flex: 0.1,
        wrist_roll: 0.1,
        gripper: 0.05,
      },
    },
  ],
});

test.describe('brand-v2 27-row deep executor', () => {
  test('executes all sealed rows with ordered steps and captures', async ({
    page,
    staticBase,
  }, testInfo) => {
    test.setTimeout(600_000);
    test.fail(
      true,
      archivedExpectedRed(
        'brand-v2 27-row deep executor',
        'VAL-B2-EVID-010',
      ),
    );
    expect(validateDeepRows(BRAND_V2_DEEP_ROWS)).toEqual([]);
    const actionFailures: string[] = [];
    const records = await executeEvidencePlans(BRAND_V2_DEEP_ROWS, {
      step: async (memberId, step) => {
        const row = BRAND_V2_DEEP_ROWS.find(({ id }) => id === memberId);
        expect(row).toBeTruthy();
        await test.step(`${memberId}:${step.action}`, async () => {
          try {
            if (step.order === 1 && row) {
              await page.setViewportSize(row.viewport);
              await page.goto(`${staticBase}${row.route}`);
              await page.evaluate(() => document.fonts.ready);
            }
            if (step.action === 'settle' || step.action === 'capture') {
            await page.evaluate(() => document.fonts.ready);
          } else if (step.action === 'open-drawer') {
            await page.getByRole('button', { name: /open navigation menu/i }).click();
          } else if (step.action === 'cycle-focus') {
            const drawer = page.locator('#mobile-nav-drawer');
            await page.keyboard.press('Tab');
            await page.keyboard.press('Shift+Tab');
            await expect(drawer).toBeVisible();
          } else if (step.action === 'escape') {
            await page.keyboard.press('Escape');
          } else if (step.action === 'skip-link') {
            const skip = page.getByRole('link', { name: 'Skip to content' });
            await skip.focus();
            await skip.click();
            await expect(page.locator('#main-content')).toBeFocused();
          } else if (step.action === 'search-entry') {
            const search = page.locator('aside input[type="search"]');
            await search.focus();
            await expect(search).toBeFocused();
          } else if (step.action === 'hero-action') {
            await page.getByRole('link', { name: 'Start reading' }).click();
            await expect(page.locator('article')).toBeVisible();
            await page.goBack();
          } else if (step.action === 'scroll-heading') {
            await page
              .getByRole('heading', {
                name: /Temporal ensembling and its limits/i,
              })
              .scrollIntoViewIfNeeded();
          } else if (step.action === 'focus-copy-link') {
            const button = page
              .getByRole('heading', {
                name: /Temporal ensembling and its limits/i,
              })
              .locator('button[data-heading-permalink]');
            await button.focus();
            await expect(button).toBeFocused();
          } else if (step.action === 'focus-table') {
            const region = page
              .locator('table')
              .first()
              .locator('xpath=ancestor::*[@tabindex="0"][1]');
            await region.focus();
            await expect(region).toBeFocused();
          } else if (step.action === 'scroll-table') {
            const region = page
              .locator('table')
              .first()
              .locator('xpath=ancestor::*[@tabindex="0"][1]');
            await region.evaluate((node) => {
              node.scrollLeft = Math.max(1, node.scrollWidth - node.clientWidth);
            });
            expect(await region.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
          } else if (
            step.action === 'enter-query' ||
            step.action === 'enter-unmatched-query'
          ) {
            await page
              .getByRole('searchbox', { name: 'Search the wiki' })
              .fill(
                step.action === 'enter-query'
                  ? 'action chunking'
                  : 'quartz-lantern-7319',
              );
            await expect(page.getByRole('status').first()).not.toContainText(
              /searching/i,
              { timeout: 15_000 },
            );
          } else if (step.action === 'select-methods') {
            await page.getByRole('button', { name: /^Methods/ }).first().click();
          } else if (step.action === 'focus-results') {
            const result = page
              .getByRole('region', { name: 'Modules' })
              .getByRole('link')
              .first();
            await expect(result).toBeVisible({ timeout: 15_000 });
            await result.focus();
            await expect(result).toBeFocused();
          } else if (step.action === 'focus-recovery') {
            const recovery = page.getByRole('link', { name: /A-Z index/i });
            await recovery.focus();
            await expect(recovery).toBeFocused();
          } else if (step.action === 'focus-first-letter') {
            const letter = page.locator('main a[href^="#"]').first();
            await letter.focus();
            await expect(letter).toBeFocused();
          } else if (step.action === 'activate-glossary-entry') {
            await page.locator('main a[href^="/glossary#"]').first().click();
            expect(new URL(page.url()).hash).toBeTruthy();
          } else if (step.action.endsWith('-view')) {
            const name = step.action.replace('-view', '');
            await page
              .getByRole('button', {
                name: new RegExp(`^${name}`, 'i'),
              })
              .click();
          } else if (step.action === 'select-company') {
            const bubble = page.locator('circle[data-company-id]').first();
            if ((await bubble.count()) > 0) {
              await bubble.click();
              await expect(page.locator('[data-bubble-detail]')).toBeVisible();
            } else {
              await page.getByRole('button', { name: 'Expand' }).first().click();
              await expect(
                page.locator('article[data-company-id] [aria-expanded="true"]'),
              ).toHaveCount(1);
            }
          } else if (step.action === 'dismiss-company') {
            const bubble = page.locator('circle[data-company-id]').first();
            if ((await bubble.count()) > 0) {
              await bubble.click();
              await expect(page.locator('[data-bubble-detail]')).toHaveCount(0);
            } else {
              await page.getByRole('button', { name: 'Collapse' }).first().click();
            }
          } else if (step.action === 'select-filter') {
            await page.locator('#filter-segment').selectOption('humanoids');
          } else if (step.action === 'clear-filter') {
            await page.getByRole('button', { name: 'Clear filters' }).click();
          } else if (step.action === 'wait-webgl') {
            await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 });
          } else if (step.action === 'change-joint') {
            await setSlider(
              page.getByTestId('joint-slider-shoulder_pan'),
              5,
            );
          } else if (step.action === 'import-trajectory') {
            await page
              .getByTestId('trajectory-import-json')
              .fill(TWO_KEYFRAME_TRAJECTORY);
            await page.getByTestId('trajectory-import').click();
            await expect(page.getByTestId('trajectory-count')).toContainText(
              '2 keyframes',
            );
          } else if (step.action === 'play-trajectory') {
            await page.getByTestId('trajectory-play').click();
            await expect(page.getByTestId('trajectory-progress')).toBeVisible();
          } else if (step.action === 'change-pose') {
            await setSlider(
              page.getByTestId('joint-slider-shoulder_pan'),
              15,
            );
          } else if (step.action === 'reset-pose') {
            await page.getByRole('button', { name: 'Reset pose' }).click();
            await expect(page.getByTestId('trajectory-count')).toContainText(
              '2 keyframes',
            );
          } else if (step.action === 'clear-trajectory') {
            await page.getByTestId('trajectory-clear').click();
            await expect(page.getByTestId('trajectory-count')).toContainText(
              /no keyframes|0 keyframes/i,
            );
          } else if (step.action === 'activate-credits') {
            await page.getByRole('link', { name: 'Credits' }).first().click();
            await expect(
              page.getByRole('heading', { level: 1, name: 'Credits' }),
            ).toBeVisible();
          } else {
            throw new Error(`Unsupported deep-row action: ${step.action}`);
          }
            expect(step.order).toBeGreaterThan(0);
          } catch (error) {
            actionFailures.push(
              `${memberId}:${step.action}:${error instanceof Error ? error.message : String(error)}`,
            );
          }
        });
      },
      capture: async (memberId, capture) => {
        await test.step(`${memberId}:${capture.id}`, async () => {
          expect(capture.afterStep).toBeTruthy();
          if (capture.kind === 'full-page') {
            await page.screenshot({
              path: testInfo.outputPath(`${memberId}-full.png`),
              // Capture the complete declared viewport. Very long article
              // documents exceed Chromium's single-bitmap ceiling; later
              // evidence assembly may tile these viewport-bounded captures.
              fullPage: false,
              animations: 'disabled',
            });
          } else {
            const computed = await page.evaluate(() => {
              const root = document.documentElement;
              const heading = document.querySelector('h1');
              const style = heading ? getComputedStyle(heading) : null;
              return {
                title: document.title,
                fontFamily: style?.fontFamily ?? null,
                fontSize: style?.fontSize ?? null,
                lineHeight: style?.lineHeight ?? null,
                scrollWidth: root.scrollWidth,
                clientWidth: root.clientWidth,
              };
            });
            await testInfo.attach(`${memberId}-computed`, {
              body: JSON.stringify(computed, null, 2),
              contentType: 'application/json',
            });
          }
        });
      },
    });
    expect(records).toHaveLength(27);
    expect(records.every(({ steps, captures }) => steps.length > 0 && captures.length > 0))
      .toBe(true);
    expect(actionFailures, actionFailures.join('\n')).toEqual([]);
  });
});
