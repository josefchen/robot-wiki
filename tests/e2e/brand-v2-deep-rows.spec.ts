import {
  BRAND_V2_DEEP_ROWS,
  executeEvidencePlans,
  validateDeepRows,
} from '../../lib/brand-v2-runners';
import {
  archivedExpectedRedAnchors,
  expect,
  test,
} from './brand-v2-static-fixture';
import { glossaryTermsAlphabetical } from '../../data/glossary';
import { publishedModules } from '../../data/modules';
import {
  buildAzIndex,
  letterAnchorId,
  type AzIndexSourceEntry,
} from '../../lib/az-index';
import { setSlider } from './slider';

test.use({ actionTimeout: 10_000, navigationTimeout: 30_000 });

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

const azEntries: AzIndexSourceEntry[] = [
  ...publishedModules().map((module) => ({
    kind: 'article' as const,
    label: module.title,
    href: `/${module.domain}/${module.slug}/`,
    group: module.domain,
  })),
  ...glossaryTermsAlphabetical().map((term) => ({
    kind: 'term' as const,
    label: term.term,
    href: `/glossary/#${term.id}`,
    group: 'Glossary',
  })),
];
const firstLetter = buildAzIndex(azEntries).groups[0]?.letter;
const firstGlossaryTerm = glossaryTermsAlphabetical()[0];

if (!firstLetter || !firstGlossaryTerm) {
  throw new Error('A-Z and glossary populations must be non-empty.');
}

test.describe('brand-v2 27-row deep executor', () => {
  test('enforces all sealed row interactions and capture populations', async ({
    page,
    staticBase,
  }, testInfo) => {
    test.setTimeout(600_000);
    expect(validateDeepRows(BRAND_V2_DEEP_ROWS)).toEqual([]);
    expect(() =>
      archivedExpectedRedAnchors(
        'brand-v2 core visual authority',
        'VAL-B2-ID-001',
      ),
    ).toThrow(/Missing expected-red anchor list/);
    const actionFailures = new Set<string>();
    const actionFailureDetails: string[] = [];
    const records = await executeEvidencePlans(BRAND_V2_DEEP_ROWS, {
      step: async (memberId, step) => {
        const row = BRAND_V2_DEEP_ROWS.find(({ id }) => id === memberId);
        expect(row).toBeTruthy();
        await test.step(`${memberId}:${step.action}`, async () => {
          if (step.order === 1 && row) {
            await page.setViewportSize(row.viewport);
            await page.goto(`${staticBase}${row.route}`);
            await page.evaluate(() => document.fonts.ready);
          }
          try {
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
              const letter = page.locator(
                `main a[href="/a-z/#${letterAnchorId(firstLetter)}"]`,
              );
              await letter.focus();
              await expect(letter).toBeFocused();
            } else if (step.action === 'activate-glossary-entry') {
              await page
                .locator(
                  `main a[href="/glossary/#${firstGlossaryTerm.id}"]`,
                )
                .click();
              await expect(page).toHaveURL(
                new RegExp(`/glossary/#${firstGlossaryTerm.id}$`),
              );
              expect(new URL(page.url()).hash).toBe(
                `#${firstGlossaryTerm.id}`,
              );
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
              await page
                .getByRole('button', { name: 'Clear filters', exact: true })
                .click();
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
            actionFailures.add(`${memberId}:${step.action}`);
            actionFailureDetails.push(
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
              // The 10s suite actionTimeout is not a compositor budget. The
              // WebGL rows capture a live SwiftShader canvas mid-playback,
              // which needs a rendered frame from a software rasteriser this
              // test has already driven through 22 earlier rows in the same
              // page: measured at 1.3s in isolation on this Linux host and
              // observed exceeding 10s inside the full sequential run. A
              // capture either produces the frame or fails, so this budget
              // asserts nothing weaker.
              timeout: 60_000,
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
    expect(
      [...actionFailures].sort(),
      actionFailureDetails.join('\n'),
    ).toEqual([]);
  });

  test('archives only the still-unreachable v2 visual claim', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const failures: string[] = [];
    for (const row of BRAND_V2_DEEP_ROWS) {
      await page.setViewportSize(row.viewport);
      await page.goto(`${staticBase}${row.route}`);
      await page.evaluate(() => document.fonts.ready);
      const visual = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const identity = document.querySelector<HTMLAnchorElement>(
          'aside a[href="/"]',
        );
        const heading = document.querySelector<HTMLElement>('main h1');
        return {
          identity: identity?.innerText.trim() ?? null,
          signal: root.getPropertyValue('--color-signal').trim().toUpperCase(),
          paper: root.getPropertyValue('--color-paper').trim().toUpperCase(),
          headingFont: heading
            ? getComputedStyle(heading).fontFamily.toLowerCase()
            : null,
        };
      });
      if (visual.identity !== 'Robot Wiki') {
        failures.push(`${row.id}:public-identity`);
      }
      if (visual.signal !== '#245FFF') {
        failures.push(`${row.id}:signal-token`);
      }
      if (visual.paper !== '#F5F6F7') {
        failures.push(`${row.id}:paper-token`);
      }
      if (!visual.headingFont?.includes('tektur')) {
        failures.push(`${row.id}:display-type`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
