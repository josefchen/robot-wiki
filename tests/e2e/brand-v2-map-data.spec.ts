import { forEachInOwnContext } from './helpers/per-route-context';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { test, expect } from './brand-v2-static-fixture';
import { COMPANIES } from '../../data/companies';
import { IMAGES } from '../../data/images';
import { WITHHELD_MARKS } from '../../lib/market-map-marks';
import { decodePng } from '../../lib/png-decode';
import { readReleaseBuildStamp } from '../../lib/brand-v2-release-build';
import { MAP_DATA_WIDTHS, MAP_DATA_VIEWS, MAP_DATA_STATES, MAP_DATA_SELECTED, RELEASE_MAP_DATA_PATH, validateReleaseMapData, mapCompanyRecordProblems, mapGeometryProblems, mapStateStyleProblems, mapLogoProblems, type MapDataRecord, type MapDataView, type MapDataLogo } from '../../lib/brand-v2-release-map-data';
import { collectMapCompanyRecord, collectMapDataView } from './helpers/release-map-data';
import { expectedCountText } from '../../lib/brand-v2-market-map-states';
test('canonical company values, encodings and official rendered masks remain truthful at both widths', async ({
  browser,
  staticBase
}, testInfo) => {
  test.setTimeout(900_000);
  const root = process.cwd(),
    build = process.env.ROBOT_WIKI_RELEASE_PROFILES === '1' ? readReleaseBuildStamp(root) : null;
  const records: MapDataRecord[] = [],
    views: MapDataView[] = [],
    logos: MapDataLogo[] = [];
  try {
    for (const viewport of MAP_DATA_WIDTHS) {
      const [width, height] = viewport.split('x').map(Number);
      const options = {
        viewport: {
          width,
          height
        }
      };
      await forEachInOwnContext(browser, ['/market-map/', '/credits/'] as const, async (page, route) => {
        await page.goto(staticBase + route);
        await page.waitForLoadState('networkidle');
        for (const company of COMPANIES) {
          if (!company.logo || WITHHELD_MARKS[company.logo]) continue;
          const image = IMAGES.find(image => image.id === company.logo)!;
          const mark = page.locator(route === '/market-map/' ? `button[data-map-tile="${company.id}"] [data-logo-mark]` : `[data-image-id="${company.logo}"] [data-logo-mark]`);
          await expect(mark, company.logo + ' mark').toHaveCount(1);
          await mark.scrollIntoViewIfNeeded();
          const measured = await mark.evaluate(node => {
            const style = getComputedStyle(node),
              ink = getComputedStyle(node.querySelector('[data-logo-ink]')!),
              box = node.getBoundingClientRect();
            return {
              file: node.getAttribute('data-logo-src') ?? '',
              ink: ink.backgroundColor,
              mask: ink.maskImage,
              mode: node.getAttribute('data-logo-ink-mode') ?? '',
              filter: style.filter,
              inkFilter: ink.filter,
              background: style.backgroundColor,
              shadow: style.boxShadow,
              borders: ['top', 'right', 'bottom', 'left'].map(side => parseFloat(style.getPropertyValue('border-' + side + '-width')) || 0),
              padding: ['top', 'right', 'bottom', 'left'].map(side => parseFloat(style.getPropertyValue('padding-' + side)) || 0),
              width: box.width,
              height: box.height
            };
          });
          const shot = await mark.screenshot({
              animations: 'disabled'
            }),
            decoded = decodePng(shot);
          let covered = 0;
          for (let i = 0; i < decoded.rgba.length; i += 4) covered += Math.min(1, Math.max(0, (250 - decoded.rgba[i + 1]) / (250 - 107)));
          const fileName = `${viewport}-${route === '/market-map/' ? 'map' : 'credits'}-${image.id}.png`,
            relativePath = 'evidence/brand-v2/release/map-marks/' + fileName,
            path = build ? join(root, relativePath) : testInfo.outputPath(fileName);
          mkdirSync(dirname(path), {
            recursive: true
          });
          writeFileSync(path, shot);
          logos.push({
            id: viewport + '|' + route + '|' + image.id,
            imageId: image.id,
            route,
            viewport,
            ...measured,
            fill: covered / (decoded.width * decoded.height),
            screenshot: build ? relativePath : path,
            screenshotSha256: createHash('sha256').update(shot).digest('hex')
          });
        }
      }, options);
      await forEachInOwnContext(browser, COMPANIES, async (page, company) => {
        await page.goto(staticBase + '/market-map/#company-' + company.id);
        await expect(page.locator(`[data-company-detail="${company.id}"]`)).toBeVisible();
        await page.evaluate(async () => {
          await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => null)));
        });
        records.push(await page.evaluate(collectMapCompanyRecord, {
          companyId: company.id,
          viewport
        }));
      }, options);
      await forEachInOwnContext(browser, MAP_DATA_VIEWS.flatMap(view => MAP_DATA_STATES.map(state => ({
        view,
        state
      }))), async (page, {
        view,
        state
      }) => {
        const query = new URLSearchParams();
        if (view !== 'grid') query.set('view', view);
        if (state === 'filtered') query.set('segment', 'humanoids');
        await page.goto(staticBase + '/market-map/' + (query.size ? '?' + query : ''));
        await page.waitForFunction(() => [...document.querySelectorAll('[aria-label=View] button')].some(button => Object.keys(button).some(key => key.startsWith('__reactFiber$'))));
        await expect(page.locator('[data-result-count]')).toHaveText(expectedCountText(state === 'filtered' ? {
          segment: 'humanoids'
        } : {}));
        await expect(page.getByRole('group', {
          name: 'View',
          exact: true
        }).getByRole('button', {
          name: view[0].toUpperCase() + view.slice(1),
          exact: true
        })).toHaveAttribute('aria-pressed', 'true');
        const target = page.locator(view === 'grid' ? `button[data-map-tile="${MAP_DATA_SELECTED}"]` : view === 'bubble' ? `circle[data-company-id="${MAP_DATA_SELECTED}"]` : `[data-company-id="${MAP_DATA_SELECTED}"] > button`);
        if (state === 'selected' || state === 'focused') {
          await page.keyboard.press('Tab');
          await expect(async () => {
            await target.scrollIntoViewIfNeeded();
            await target.focus();
            await expect(target).toBeFocused({
              timeout: 1000
            });
          }).toPass({
            timeout: 10_000
          });
          if (state === 'selected') {
            await page.keyboard.press('Enter');
            await expect(page.locator('[data-company-detail]')).toHaveAttribute('data-company-detail', MAP_DATA_SELECTED);
          }
        }
        await page.evaluate(async () => {
          await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => null)));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
        await page.waitForTimeout(100);
        const reading = await page.evaluate(collectMapDataView, {
          viewport,
          view,
          state
        });
        if (reading.sheet) {
          const stops = page.locator('[data-company-sheet] a[href],[data-company-sheet] button:not(:disabled)');
          await stops.last().focus();
          await page.keyboard.press('Tab');
          reading.sheet.tabEscaped = await page.evaluate(() => !document.activeElement?.closest('[data-company-sheet]'));
          const beforeDismiss = await page.evaluateHandle(() => document.activeElement);
          await page.keyboard.press('Escape');
          await expect(page.locator('[data-company-sheet]')).toHaveCount(0);
          reading.sheet.closeWorked = (await page.locator('[data-company-sheet]').count()) === 0;
          reading.sheet.focusRestored = (await target.evaluate(node => document.activeElement === node)) || (await beforeDismiss.evaluate(node => node !== null && node !== document.body && node === document.activeElement && node.isConnected));
          await beforeDismiss.dispose();
        }
        views.push(reading);
      }, options);
    }
  } finally {
    writeFileSync(testInfo.outputPath('map-data-progress.json'), JSON.stringify({
      diagnostic: true,
      acceptedReleaseEvidence: false,
      records,
      views,
      logos
    }, null, 2) + '\n');
  }
  const artifact = {
    version: 1,
    sourceFingerprint: build?.sourceAfter ?? '0'.repeat(64),
    exportFingerprint: build?.exportFingerprint ?? '0'.repeat(64),
    records,
    views,
    logos
  };
  validateReleaseMapData(artifact, {
    source: artifact.sourceFingerprint,
    exported: artifact.exportFingerprint
  });
  const errors = records.flatMap(record => mapCompanyRecordProblems(record).map(error => record.id + ': ' + error));
  for (const view of views) {
    errors.push(...mapGeometryProblems(view).map(error => view.id + ': ' + error));
    for (const [assertion, failures] of Object.entries(mapStateStyleProblems(view))) errors.push(...failures.map(error => view.id + ' ' + assertion + ': ' + error));
  }
  for (const logo of logos) for (const [assertion, failures] of Object.entries(mapLogoProblems(root, logo))) errors.push(...failures.map(error => logo.id + ' ' + assertion + ': ' + error));
  const output = build ? join(root, RELEASE_MAP_DATA_PATH) : testInfo.outputPath('map-data-pilot.json');
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
