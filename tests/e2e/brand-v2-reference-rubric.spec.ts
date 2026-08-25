import type { Page, TestInfo } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import {
  collectBrowserReferenceFeatures,
  evaluateReferenceFeatures,
  parseReferenceComparisonPayload,
  reconcileResponsiveDeviceCounts,
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
  const desktopViewport = { width: 1440, height: 900 };
  const mobileViewport = { width: 375, height: 812 };
  await page.setViewportSize(desktopViewport);
  await page.goto(`${staticBase}${route}`);
  await page.evaluate(() => document.fonts.ready);
  const screenshotPath = testInfo.outputPath(`${surfaceId}.png`);
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    animations: 'disabled',
  });
  const desktopMeasurements = await page.evaluate(
    collectBrowserReferenceFeatures,
    config,
  );
  await page.setViewportSize(mobileViewport);
  const mobileMeasurements = await page.evaluate(
    collectBrowserReferenceFeatures,
    config,
  );
  const measurements = reconcileResponsiveDeviceCounts(
    desktopMeasurements,
    mobileMeasurements,
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

  test('fails article hierarchy when the body selector resolves nothing', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/manipulation/action-chunking/`);
    const measurements = await page.evaluate(
      collectBrowserReferenceFeatures,
      {
        ...ARTICLE_CONFIG,
        bodySelector: 'article [data-planted-missing-body]',
      },
    );
    expect(measurements.hierarchy.bodySizePx).toBe(0);
    expect(measurements.hierarchy.supportingSizePx).toBeGreaterThan(0);
    expect(
      evaluateReferenceFeatures(measurements).anchors
        .find(({ id }) => id === 'hierarchy')
        ?.predicates.find(({ id }) => id === 'primary-ratio'),
    ).toMatchObject({ actual: 0, passed: false });
  });

  test('measures the largest supporting heading rather than the first match', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/`);
    await page.evaluate(() => {
      const primary = document.querySelector<HTMLElement>('main h1');
      if (primary) primary.style.fontSize = '96px';
      const supporting = [
        ...document.querySelectorAll<HTMLElement>('main h2'),
      ];
      for (const heading of supporting) heading.style.fontSize = '60px';
      const largerLaterHeading = document.createElement('h2');
      largerLaterHeading.textContent = 'Planted larger supporting heading';
      largerLaterHeading.style.fontSize = '80px';
      document.querySelector('main')?.append(largerLaterHeading);
    });
    const measurements = await page.evaluate(
      collectBrowserReferenceFeatures,
      HOME_CONFIG,
    );
    expect(measurements.hierarchy.supportingSizePx).toBe(80);
    expect(
      evaluateReferenceFeatures(measurements).anchors
        .find(({ id }) => id === 'hierarchy')
        ?.predicates.find(({ id }) => id === 'primary-ratio'),
    ).toMatchObject({ actual: 1.2, passed: false });
  });

  test('fails repetition and frames on an unannotated surface', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/`);
    const measurements = await page.evaluate(
      collectBrowserReferenceFeatures,
      HOME_CONFIG,
    );
    expect(measurements.repetitionAndFrames.registeredPopulationCount).toBe(0);
    expect(
      evaluateReferenceFeatures(measurements).anchors
        .find(({ id }) => id === 'repetition-frames')
        ?.predicates.find(({ id }) => id === 'registered-population'),
    ).toMatchObject({ actual: 0, passed: false });
  });

  test('detects an unannotated decorative dot grid structurally', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/`);
    const before = await page.evaluate(
      collectBrowserReferenceFeatures,
      HOME_CONFIG,
    );
    await page.evaluate(() => {
      const grid = document.createElement('div');
      grid.setAttribute('aria-hidden', 'true');
      Object.assign(grid.style, {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        backgroundImage:
          'radial-gradient(circle, rgb(0, 0, 0) 1px, transparent 1px)',
        backgroundRepeat: 'repeat',
        backgroundSize: '8px 8px',
      });
      document.querySelector('main')?.append(grid);
    });
    const after = await page.evaluate(
      collectBrowserReferenceFeatures,
      HOME_CONFIG,
    );
    expect(after.gridAndDevices.unregisteredCount).toBeGreaterThan(
      before.gridAndDevices.unregisteredCount,
    );
    expect(
      evaluateReferenceFeatures(after).anchors
        .find(({ id }) => id === 'grid-alignment')
        ?.predicates.find(({ id }) => id === 'unregistered-device-count'),
    ).toMatchObject({ passed: false });
  });

  test('compares live mobile and desktop device populations', async ({
    page,
    staticBase,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${staticBase}/`);
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent =
        '@media (min-width: 768px) { #planted-mobile-device { display: none } }';
      document.head.append(style);
      const device = document.createElement('div');
      device.id = 'planted-mobile-device';
      device.dataset.brandDeviceId = 'device:planted-mobile-only';
      device.dataset.brandPurpose = 'responsive-mutation';
      device.dataset.brandOwner = 'test';
      device.dataset.brandAnchorSelector = 'main';
      device.style.pointerEvents = 'none';
      device.style.width = '1px';
      device.style.height = '1px';
      document.querySelector('main')?.append(device);
    });
    const desktop = await page.evaluate(
      collectBrowserReferenceFeatures,
      HOME_CONFIG,
    );
    await page.setViewportSize({ width: 375, height: 812 });
    const mobile = await page.evaluate(
      collectBrowserReferenceFeatures,
      HOME_CONFIG,
    );
    const measurements = reconcileResponsiveDeviceCounts(desktop, mobile);
    expect(measurements.gridAndDevices.mobileDeviceCount).toBeGreaterThan(
      measurements.gridAndDevices.desktopDeviceCount,
    );
    expect(
      evaluateReferenceFeatures(measurements).anchors
        .find(({ id }) => id === 'purposeful-devices')
        ?.predicates.find(({ id }) => id === 'mobile-device-count'),
    ).toMatchObject({ passed: false });
  });

  test('scopes adjacent repeated signatures to sibling groups', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/`);
    await page.evaluate(() => {
      const main = document.querySelector('main');
      for (let index = 0; index < 3; index += 1) {
        const parent = document.createElement('div');
        const repeatedSection = document.createElement('section');
        repeatedSection.dataset.brandModuleSignature = 'same';
        parent.append(repeatedSection);
        main?.append(parent);
      }
    });
    const separateParents = await page.evaluate(
      collectBrowserReferenceFeatures,
      HOME_CONFIG,
    );
    expect(
      separateParents.repetitionAndFrames.maximumAdjacentRepeatedSignatures,
    ).toBe(1);

    await page.goto(`${staticBase}/`);
    await page.evaluate(() => {
      const parent = document.createElement('div');
      for (let index = 0; index < 4; index += 1) {
        const repeatedSection = document.createElement('section');
        repeatedSection.dataset.brandModuleSignature = 'same';
        parent.append(repeatedSection);
      }
      document.querySelector('main')?.append(parent);
    });
    const siblings = await page.evaluate(
      collectBrowserReferenceFeatures,
      HOME_CONFIG,
    );
    expect(
      siblings.repetitionAndFrames.maximumAdjacentRepeatedSignatures,
    ).toBe(4);
    expect(
      evaluateReferenceFeatures(siblings).anchors.find(
        ({ id }) => id === 'repetition-frames',
      )?.passed,
    ).toBe(false);
  });
});
