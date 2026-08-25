import type { Page, TestInfo } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import {
  collectBrowserReferenceFeatures,
  evaluateReferenceFeatures,
  parseReferenceComparisonPayload,
  type BrowserReferenceFeatureConfig,
} from '../../lib/brand-v2-reference-rubric';
import {
  archivedExpectedRedAnchors,
  archivedExpectedRed,
  expect,
  test,
} from './brand-v2-static-fixture';

async function compareSurface(
  page: Page,
  testInfo: TestInfo,
  staticBase: string,
  surfaceId: string,
  route: string,
  config: BrowserReferenceFeatureConfig,
) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${staticBase}${route}`);
  await page.evaluate(() => document.fonts.ready);
  const screenshotPath = testInfo.outputPath(`${surfaceId}.png`);
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    animations: 'disabled',
  });
  const measurements = await page.evaluate(
    collectBrowserReferenceFeatures,
    config,
  );
  const report = evaluateReferenceFeatures(measurements);
  const payload = parseReferenceComparisonPayload({
    kind: 'autonomous-reference-comparison',
    rubricVersion: 1,
    comparisonMode: 'feature-anchors-only',
    contractLiteralOverridesApplied: true,
    referenceIds: [
      'library/brand-reference-board.jpeg',
      'library/brand-reference-article.png',
    ],
    surfaceId,
    screenshotPaths: [screenshotPath],
    anchors: report.anchors,
    passed: report.passed,
  });
  writeFileSync(
    testInfo.outputPath(`${surfaceId}-reference-comparison.json`),
    `${JSON.stringify({ measurements, payload }, null, 2)}\n`,
  );
  await testInfo.attach(`${surfaceId}-reference-comparison`, {
    body: JSON.stringify({ measurements, payload }, null, 2),
    contentType: 'application/json',
  });
  return payload;
}

test.describe('brand-v2 reference-feature rubric', () => {
  test('home comparison applies all independent reference anchors', async ({
    page,
    staticBase,
  }, testInfo) => {
    test.fail(
      true,
      archivedExpectedRed(
        'brand-v2 reference-feature rubric',
        'VAL-B2-EVID-015',
      ),
    );
    const payload = await compareSurface(
      page,
      testInfo,
      staticBase,
      'B2-EV-001',
      '/',
      {
        surfaceKind: 'home',
        identitySelector: 'main h1',
        descriptorSelector: 'main p.font-mono',
        descriptorRequired: true,
        primarySelector: 'main h1',
        supportingSelector: 'main h2',
        bodySelector: 'main p:not(.font-mono)',
        shellSelector: 'aside',
        alternateSymbolSelector: '[data-brand-symbol]',
        repeatedModuleSelector: 'main section',
      },
    );
    expect(payload.anchors).toHaveLength(8);
    expect(
      payload.anchors.filter(({ passed }) => !passed).map(({ id }) => id),
    ).toEqual(
      archivedExpectedRedAnchors(
        'brand-v2 reference-feature rubric',
        'VAL-B2-EVID-015',
      ),
    );
    expect(payload.anchors.every(({ passed }) => passed)).toBe(true);
    expect(payload.passed).toBe(true);
  });

  test('article comparison applies literals and article hierarchy without pixels', async ({
    page,
    staticBase,
  }, testInfo) => {
    test.fail(
      true,
      archivedExpectedRed(
        'brand-v2 reference-feature rubric',
        'VAL-B2-EVID-004',
      ),
    );
    const payload = await compareSurface(
      page,
      testInfo,
      staticBase,
      'B2-EV-007',
      '/manipulation/action-chunking/',
      {
        surfaceKind: 'article',
        identitySelector: 'aside a[href="/"]',
        descriptorRequired: false,
        primarySelector: 'article h1',
        supportingSelector: 'article h2',
        bodySelector: 'article .prose p',
        shellSelector: 'aside',
        proseSelector: 'article .prose',
        alternateSymbolSelector: '[data-brand-symbol]',
        repeatedModuleSelector: 'article section',
      },
    );
    expect(payload.comparisonMode).toBe('feature-anchors-only');
    expect(payload.contractLiteralOverridesApplied).toBe(true);
    expect(
      payload.anchors.filter(({ passed }) => !passed).map(({ id }) => id),
    ).toEqual(
      archivedExpectedRedAnchors(
        'brand-v2 reference-feature rubric',
        'VAL-B2-EVID-004',
      ),
    );
    expect(payload.anchors.every(({ passed }) => passed)).toBe(true);
    expect(payload.passed).toBe(true);
  });
});
