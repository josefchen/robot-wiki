import type { ReleaseStateReference } from '../../lib/brand-v2-release-state-store';
import { CANONICAL_PLAYGROUND_TRAJECTORY } from '../../lib/playground-canonical-fixture';
import {
  BRAND_V2_DEEP_ROWS,
  executeEvidencePlans,
  type ExecutionRecord,
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
import { forEachInOwnContext } from './helpers/per-route-context';
import { openClosedAncestorDetails } from './helpers/open-ancestor-details';
import {
  holdPlaybackAt,
  openImport,
  SO101_JOINTS,
  techDeg,
  waitForArm,
} from './helpers/playground';
import { setSlider } from './slider';
import { FINAL_RELEASE_PROFILES, captureReleaseState, writeReleaseStateGroup } from './helpers/release-state-probe';
import { captureDeepReference, captureDeepPhase, type DeepPhaseCapture } from './helpers/release-reference';
import { RELEASE_EVIDENCE_DIRECTORY, } from '../../lib/brand-v2-release-evidence';

test.use({ actionTimeout: 10_000, navigationTimeout: 30_000 });

const TWO_KEYFRAME_TRAJECTORY = JSON.stringify(CANONICAL_PLAYGROUND_TRAJECTORY);
const [FIXTURE_FROM, FIXTURE_TO] = (
  JSON.parse(TWO_KEYFRAME_TRAJECTORY) as {
    keyframes: Array<{ angles: Record<string, number> }>;
  }
).keyframes.map(({ angles }) => angles);

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
    browser,
    staticBase,
  }, testInfo) => {
    const profileStates=BRAND_V2_DEEP_ROWS.reduce((count,row)=>count+row.captures.filter(({kind})=>kind==='bounded').length,0);
    test.setTimeout(FINAL_RELEASE_PROFILES?600_000+profileStates*180_000:600_000);
    expect(validateDeepRows(BRAND_V2_DEEP_ROWS)).toEqual([]);
    expect(() =>
      archivedExpectedRedAnchors(
        'brand-v2 core visual authority',
        'VAL-B2-ID-001',
      ),
    ).toThrow(/Missing expected-red anchor list/);
    const actionFailures = new Set<string>();
    const actionFailureDetails: string[] = [];
    const executedDeepSteps = new Map<string, string[]>();
    const phaseCaptures = new Map<string, DeepPhaseCapture[]>();
    const phaseProfiles: ReleaseStateReference[] = [];
    const records: ExecutionRecord[] = [];
    await forEachInOwnContext(browser, BRAND_V2_DEEP_ROWS, async (page, plannedRow) => {
      const viewport = page.getByTestId('playground-viewport');
      const poseList = page.locator('[data-testid^="trajectory-keyframe-"]');
      // The playground's home view, read before a row moves it.
      let homeCamera: string | null = null;
      const rowRecords = await executeEvidencePlans([plannedRow], {
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
                // Owner-approved successor (Josef, 2026-10-10, the research-page
                // standard): the hamburger is gone, and the top bar's
                // "Articles" button opens the same #mobile-nav-drawer panel at
                // every width (tests/e2e/helpers/articles-panel.ts).
                await page.getByRole('button', { name: 'Articles' }).click();
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
                // Owner-approved successor (Josef, 2026-10-10, the research-page
                // standard): the sidebar and its search are gone; the site
                // search sits at the top of the "Articles" panel. The panel is
                // modal, so it closes again before the page's own actions run.
                await page.getByRole('button', { name: 'Articles' }).click();
                const panel = page.getByRole('dialog', { name: 'Site navigation' });
                const search = panel
                  .getByRole('search', { name: 'Site search' })
                  .getByRole('searchbox');
                await search.focus();
                await expect(search).toBeFocused();
                await page.keyboard.press('Escape');
                await expect(panel).toHaveCount(0);
              } else if (step.action === 'hero-action') {
                // Home's black primary action is the search submit under the
                // identity line (VAL-OPUS-014), operated from the keyboard.
                const form = page.getByRole('search', { name: 'Search the wiki' });
                await form.getByRole('searchbox').fill('ALOHA');
                await form.getByRole('button', { name: 'Search' }).focus();
                await page.keyboard.press('Enter');
                await page.waitForURL(/\/search\/\?q=ALOHA$/);
                await expect(page.locator('a[data-search-result]').first()).toBeVisible();
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
                const table = page.locator('table').first();
                await openClosedAncestorDetails(table);
                const region = table.locator('xpath=ancestor::*[@tabindex="0"][1]');
                await region.focus();
                await expect(region).toBeFocused();
              } else if (step.action === 'scroll-table') {
                const table = page.locator('table').first();
                await openClosedAncestorDetails(table);
                const region = table.locator('xpath=ancestor::*[@tabindex="0"][1]');
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
                // The footer carries its own "A-Z index" link, so the recovery
                // link is the one the no-results message offers.
                const recovery = page
                  .locator('[data-search-empty]')
                  .getByRole('link', { name: /A-Z index/i });
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
                // A chart mark in the bubble view, else a map tile: either
                // opens the same company details, a side sheet or, on a
                // phone, a bottom sheet.
                const bubble = page.locator('circle[data-company-id]').first();
                const opener =
                  (await bubble.count()) > 0
                    ? bubble
                    : page.locator('button[data-map-tile]').first();
                await opener.click();
                await expect(page.locator('[data-company-detail]')).toBeVisible();
                await expect(opener).toHaveAttribute('aria-expanded', 'true');
              } else if (step.action === 'dismiss-company') {
                await page
                  .locator('[data-company-detail]')
                  .getByRole('button', { name: /^Close .* details$/ })
                  .click();
                await expect(page.locator('[data-company-detail]')).toHaveCount(0);
              } else if (step.action === 'select-filter') {
                await page
                  .getByRole('group', { name: 'Segment' })
                  .getByRole('button', { name: /^Humanoids/ })
                  .click();
              } else if (step.action === 'clear-filter') {
                await page
                  .getByRole('button', { name: 'Clear filters', exact: true })
                  .click();
              } else if (step.action === 'wait-webgl') {
                await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 });
                // The SO-101 itself, drawn, with every control live.
                await waitForArm(page);
              } else if (step.action === 'change-joint') {
                const canvas = page.locator('canvas');
                const before = await canvas.screenshot();
                await setSlider(
                  page.getByTestId('joint-slider-shoulder_pan'),
                  5,
                );
                await expect(page.getByTestId('joint-readout-shoulder_pan')).toHaveText('5°');
                await expect(page.getByTestId('tech-joint-shoulder_pan')).toHaveText('+5.0°');
                await expect
                  .poll(async () => Buffer.compare(before, await canvas.screenshot()), {
                    timeout: 15_000,
                  })
                  .not.toBe(0);
              } else if (step.action === 'import-trajectory') {
                await waitForArm(page);
                await openImport(page);
                await page
                  .getByTestId('trajectory-import-json')
                  .fill(TWO_KEYFRAME_TRAJECTORY);
                await page.getByTestId('trajectory-import').click();
                await expect(page.getByTestId('trajectory-message')).toHaveText(
                  'Imported 2 poses.',
                );
                await expect(page.getByTestId('trajectory-count')).toHaveText(
                  '2 poses · 1.2 s',
                );
                await expect(poseList).toHaveCount(2);
              } else if (step.action === 'play-trajectory') {
                // Held at the motion's midpoint, so the capture that follows
                // shows the arm between the two poses.
                await holdPlaybackAt(page, 0.6);
                await page.getByTestId('trajectory-play').click();
                const progress = page.getByTestId('trajectory-progress');
                await expect(progress).toHaveAttribute('data-t', '0.600', {
                  timeout: 15_000,
                });
                await expect(progress).toHaveAttribute('data-duration', '1.200');
                await expect(progress).toHaveText('0.6 of 1.2 s');
                await expect(page.getByTestId('trajectory-message')).toHaveText('Playing.');
                await expect(page.getByTestId('trajectory-stop')).toBeVisible();
                // Halfway through the one eased segment (ease(0.5) = 0.5) every
                // joint has made half its move, strictly between the poses.
                for (const joint of SO101_JOINTS) {
                  const halfway =
                    ((FIXTURE_FROM[joint] + FIXTURE_TO[joint]) / 2) * (180 / Math.PI);
                  expect(
                    Math.abs((await techDeg(page, joint)) - halfway),
                    joint,
                  ).toBeLessThanOrEqual(0.05);
                }
              } else if (step.action === 'change-pose') {
                await waitForArm(page);
                homeCamera = await viewport.getAttribute('data-camera-position');
                await setSlider(
                  page.getByTestId('joint-slider-shoulder_pan'),
                  15,
                );
                await expect(page.getByTestId('tech-joint-shoulder_pan')).toHaveText('+15.0°');
                // Turn the view as well, so Reset pose has a camera to bring home.
                await page.locator('canvas').focus();
                await page.keyboard.press('ArrowRight');
                await expect(viewport).not.toHaveAttribute(
                  'data-camera-position',
                  homeCamera ?? '',
                );
              } else if (step.action === 'reset-pose') {
                expect(homeCamera, 'home view read before the change').toBeTruthy();
                await page.getByRole('button', { name: 'Reset pose' }).click();
                for (const joint of SO101_JOINTS) {
                  await expect(page.getByTestId(`tech-joint-${joint}`)).toHaveText('+0.0°');
                }
                await expect(page.getByTestId('tech-target')).toHaveText('none');
                // The eased move home is 0.9 s; the budget is for software
                // rendering late in this long run.
                await expect(viewport).toHaveAttribute('data-camera-position', homeCamera!, {
                  timeout: 15_000,
                });
                // The imported motion stays.
                await expect(page.getByTestId('trajectory-count')).toHaveText(
                  '2 poses · 1.2 s',
                );
                await expect(poseList).toHaveCount(2);
              } else if (step.action === 'clear-trajectory') {
                await page.getByTestId('trajectory-clear').click();
                await expect(page.getByTestId('trajectory-count')).toHaveText(
                  'No poses yet',
                );
                await expect(poseList).toHaveCount(0);
                await expect(page.getByTestId('trajectory-play')).toBeDisabled();
                // Clear leaves the reset pose and the home view alone.
                for (const joint of SO101_JOINTS) {
                  await expect(page.getByTestId(`tech-joint-${joint}`)).toHaveText('+0.0°');
                }
                await expect(viewport).toHaveAttribute('data-camera-position', homeCamera!);
              } else if (step.action === 'activate-credits') {
                await page.getByRole('link', { name: 'Credits' }).first().click();
                await expect(
                  page.getByRole('heading', { level: 1, name: 'Credits' }),
                ).toBeVisible();
              } else {
                throw new Error(`Unsupported deep-row action: ${step.action}`);
              }
              expect(step.order).toBeGreaterThan(0);
              executedDeepSteps.set(memberId, [...(executedDeepSteps.get(memberId) ?? []), step.id]);
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
            const row = BRAND_V2_DEEP_ROWS.find(({ id }) => id === memberId)!;
            if (capture.kind === 'bounded') {
              const fileName = `${memberId}-phase-${capture.order}.png`;
              const path = FINAL_RELEASE_PROFILES ? `${RELEASE_EVIDENCE_DIRECTORY}/deep/${fileName}` : testInfo.outputPath(fileName);
              const measured = await captureDeepPhase(page, row, capture, path);
              phaseCaptures.set(memberId, [...(phaseCaptures.get(memberId) ?? []), measured]);
              if (FINAL_RELEASE_PROFILES) phaseProfiles.push(await captureReleaseState(page, {
                id: `deep:${capture.id}`, route: new URL(page.url()).pathname, state: capture.afterStep,
                steps: executedDeepSteps.get(memberId) ?? [],
              }));
            } else if (capture.kind === 'full-page') {
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
                // host may be rendering other verified captures concurrently.
                // Previous shared-page runs exceeded 10s; each row now owns its
                // own context, while the bounded capture budget is retained. A
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
              if (FINAL_RELEASE_PROFILES) {
                await captureDeepReference(page, row, executedDeepSteps.get(memberId) ?? [], phaseCaptures.get(memberId) ?? []);
              }
            }
          });
        },
      });
      records.push(...rowRecords);
    });
    expect(records).toHaveLength(27);
    expect(records.every(({ steps, captures }) => steps.length > 0 && captures.length > 0))
      .toBe(true);
    expect(
      [...actionFailures].sort(),
      actionFailureDetails.join('\n'),
    ).toEqual([]);
    if (FINAL_RELEASE_PROFILES) writeReleaseStateGroup('deep-phases', BRAND_V2_DEEP_ROWS.flatMap(({ captures }) => captures.filter(({ kind }) => kind === 'bounded').map(({ id }) => `deep:${id}`)), phaseProfiles);
  });

  test('enforces research-page identity, palette and display on every deep row', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const failures: string[] = [];
    await forEachInOwnContext(browser, BRAND_V2_DEEP_ROWS, async (page, row) => {
      await page.setViewportSize(row.viewport);
      await page.goto(`${staticBase}${row.route}`);
      await page.evaluate(() => document.fonts.ready);
      const visual = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const identity = document.querySelector<HTMLAnchorElement>(
          'header a[href="/"]',
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
      if (visual.signal !== '#3B6EA8') {
        failures.push(`${row.id}:signal-token`);
      }
      if (visual.paper !== '#FAFAF8') {
        failures.push(`${row.id}:paper-token`);
      }
      if (!visual.headingFont?.includes('dm sans')) {
        failures.push(`${row.id}:display-type`);
      }
    });
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
