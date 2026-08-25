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

const HOME_CONFIG = {
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
} satisfies BrowserReferenceFeatureConfig;

const ARTICLE_CONFIG = {
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
} satisfies BrowserReferenceFeatureConfig;

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
    const payload = await compareSurface(
      page,
      testInfo,
      staticBase,
      'B2-EV-001',
      '/',
      HOME_CONFIG,
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
  });

  test('article comparison applies literals and article hierarchy without pixels', async ({
    page,
    staticBase,
  }, testInfo) => {
    const payload = await compareSurface(
      page,
      testInfo,
      staticBase,
      'B2-EV-007',
      '/manipulation/action-chunking/',
      ARTICLE_CONFIG,
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
  });

  test('home comparison reaches full v2 parity', async ({
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
      'B2-EV-001-parity',
      '/',
      HOME_CONFIG,
    );
    expect(payload.passed).toBe(true);
  });

  test('article comparison reaches full v2 parity', async ({
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
      'B2-EV-007-parity',
      '/manipulation/action-chunking/',
      ARTICLE_CONFIG,
    );
    expect(payload.passed).toBe(true);
  });

  test('detects prose and material intersections in both nesting directions', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/manipulation/action-chunking/`);
    await page.evaluate(() => {
      const material = document.createElement('span');
      material.dataset.brandMaterialId = 'material:planted-prose-texture';
      material.dataset.brandMaterialDeterministic = 'true';
      material.dataset.brandMaterialContrast = 'pass';
      document.querySelector('article .prose')?.append(material);
    });
    const measurements = await page.evaluate(
      collectBrowserReferenceFeatures,
      ARTICLE_CONFIG,
    );
    expect(measurements.materialTreatment.proseTextureIntersectionCount).toBe(1);
    expect(
      evaluateReferenceFeatures(measurements).anchors
        .find(({ id }) => id === 'material-treatment')
        ?.predicates.find(({ id }) => id === 'prose-texture-intersections'),
    ).toMatchObject({ actual: 1, passed: false });

    await page.goto(`${staticBase}/manipulation/action-chunking/`);
    await page.locator('article .prose').evaluate((prose) => {
      const material = document.createElement('div');
      material.dataset.brandMaterialId = 'material:planted-prose-wrapper';
      material.dataset.brandMaterialDeterministic = 'true';
      material.dataset.brandMaterialContrast = 'pass';
      prose.parentElement?.insertBefore(material, prose);
      material.append(prose);
    });
    const wrappedMeasurements = await page.evaluate(
      collectBrowserReferenceFeatures,
      ARTICLE_CONFIG,
    );
    expect(
      wrappedMeasurements.materialTreatment.proseTextureIntersectionCount,
    ).toBe(1);
  });

  test('fails closed when a declared prose selector resolves nothing', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/manipulation/action-chunking/`);
    await page.locator('article .prose').evaluate((element) => element.remove());
    const measurements = await page.evaluate(
      collectBrowserReferenceFeatures,
      ARTICLE_CONFIG,
    );
    expect(
      evaluateReferenceFeatures(measurements).anchors
        .find(({ id }) => id === 'material-treatment')
        ?.predicates.find(({ id }) => id === 'prose-element-resolved'),
    ).toMatchObject({ actual: false, passed: false });
  });
});
