import type { Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  collectBrowserReferenceFeatures, evaluateReferenceFeatures, parseReferenceComparisonPayload,
  reconcileResponsiveDeviceCounts, type BrowserReferenceFeatureConfig,
} from '../../../lib/brand-v2-reference-rubric';
import { RELEASE_EVIDENCE_DIRECTORY, releaseArtifactHash, releaseSourceFingerprint } from '../../../lib/brand-v2-release-evidence';
import type { DeepRow, OrderedCapture } from '../../../lib/brand-v2-runners';
import { deepPhaseSubject, type DeepPhaseCapture } from '../../../lib/brand-v2-release-deep';
import { FINAL_CAPTURE_SOURCE_FINGERPRINT, FINAL_CAPTURE_BUILD } from './release-state-probe';
export type { DeepPhaseCapture } from '../../../lib/brand-v2-release-deep';

export function referenceConfig(route: string): BrowserReferenceFeatureConfig {
  const article = /^\/(?:manipulation|classical|rl-sim2real|world-models|frontier|data-hardware|adjacent)\/[^/]+\/$/.test(route);
  const home = route === '/';
  return {
    surfaceKind: home ? 'home' : article ? 'article' : route === '/market-map/' ? 'market-map' : route === '/playground/' ? 'playground' : 'discovery',
    identitySelector: home ? 'main h1' : 'header a[href="/"]',
    descriptorSelector: home ? 'main .page-lead' : undefined,
    descriptorRequired: home,
    primarySelector: 'main h1', supportingSelector: 'main h2',
    bodySelector: article ? 'article .prose p' : 'main p', shellSelector: 'header',
    ...(article ? { proseSelector: 'article .prose' } : {}),
    alternateSymbolSelector: '[data-brand-symbol]',
    repeatedModuleSelector: article ? 'article section' : 'main section',
  };
}

/** Full document evidence is tiled when a page exceeds Chromium's safe
 * bitmap height. Every interval overlaps by at least 80px so sticky chrome
 * cannot hide an unrecorded strip; all tile bounds and bytes are recorded. */
export async function captureWholeDocument(page: Page, stem: string) {
  const geometry = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, documentHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), scrollY }));
  const files: Array<{ path: string; sha256: string; top: number; bottom: number }> = [];
  const root = process.cwd();
  mkdirSync(dirname(join(root, stem)), { recursive: true });
  if (geometry.documentHeight <= 16_000) {
    const path = `${stem}-full.png`;
    await page.screenshot({ path: join(root, path), fullPage: true, animations: 'disabled', timeout: 60_000 });
    files.push({ path, sha256: releaseArtifactHash(root, path), top: 0, bottom: geometry.documentHeight });
  } else {
    const stride = Math.max(1, geometry.height - 80);
    try {
      for (let top = 0, index = 0; top < geometry.documentHeight; top += stride, index += 1) {
        await page.evaluate((y) => scrollTo(0, y), top);
        const actual = await page.evaluate(() => scrollY);
        const path = `${stem}-tile-${String(index).padStart(3, '0')}.png`;
        await page.screenshot({ path: join(root, path), animations: 'disabled', timeout: 60_000 });
        files.push({ path, sha256: releaseArtifactHash(root, path), top: actual, bottom: Math.min(geometry.documentHeight, actual + geometry.height) });
        if (actual + geometry.height >= geometry.documentHeight) break;
      }
    } finally { await page.evaluate((y) => scrollTo(0, y), geometry.scrollY); }
  }
  if (!files.length || files[0].top !== 0 || files.at(-1)!.bottom < geometry.documentHeight || files.some((file, i) => i > 0 && file.top > files[i - 1].bottom)) throw new Error(`${stem}: document capture has a missing interval`);
  return { geometry, files };
}

export async function captureDeepPhase(page: Page, row: DeepRow, capture: OrderedCapture, path: string): Promise<DeepPhaseCapture> {
  const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  const subject = deepPhaseSubject(row, capture);
  const locators = {
    'open navigation dialog': page.getByRole('dialog', { name: 'Site navigation' }),
    'selected company detail': page.locator('[data-company-detail]'),
    'live playground stage': page.getByTestId('playground-viewport'),
    'article section heading': page.getByRole('heading', { name: /Temporal ensembling and its limits/i }),
    'article figure': page.locator('main [data-figure-frame]'),
    'article table': page.locator('main table'),
    'search state': page.locator(row.state === 'search-empty' ? 'main [role=search]' : 'main [role=status]'),
    'market map state': page.locator('main [data-map-view], main [data-map-tile], main svg').first(),
    'A-Z letter navigation': page.locator('main a[href*="/a-z/#"]').first(),
    'glossary destination': page.locator(':target'),
    'page identity': page.locator('main h1'),
  };
  const locator = locators[subject as keyof typeof locators];
  if (!locator) throw new Error(`${row.id}: unsupported bounded subject ${subject}`);
  try {
      for (const element of await locator.all()) {
        if (!await element.isVisible()) continue;
        await element.scrollIntoViewIfNeeded();
        await page.evaluate(() => document.fonts.ready);
        const box = await element.boundingBox();
        if (!box || box.width <= 0 || box.height <= 0) continue;
        mkdirSync(dirname(path), { recursive: true });
        await element.screenshot({ path, animations: 'disabled', timeout: 60_000 });
        return { id: capture.id, afterStep: capture.afterStep, path,
          sha256: releaseArtifactHash(process.cwd(), path), subject,
          width: Math.round(box.width), height: Math.round(box.height) };
      }
    throw new Error(`${row.id}/${capture.id}: required bounded subject is missing: ${subject}`);
  } finally { await page.evaluate(({ x, y }) => scrollTo({ left: x, top: y, behavior: 'instant' }), scroll); }
}

/** Runs after a real deep-row sequence. It never navigates away or restores
 * state by copying rendered values. Both measurement widths share that
 * state, and the original declared viewport is restored. */
export async function captureDeepReference(page: Page, row: DeepRow, executedSteps: readonly string[], phaseCaptures: readonly DeepPhaseCapture[]) {
  const root = process.cwd();
  if (!FINAL_CAPTURE_SOURCE_FINGERPRINT || !FINAL_CAPTURE_BUILD || releaseSourceFingerprint(root) !== FINAL_CAPTURE_SOURCE_FINGERPRINT) throw new Error('deep release capture requires unchanged frozen source and production build');
  const route = new URL(page.url()).pathname;
  const config = referenceConfig(route);
  await page.evaluate(() => document.fonts.ready);
  const computed = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const selector = (node: Element) => `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}`;
    const elements = [...document.querySelectorAll('header a[href="/"], main h1, main h2, main p, main button, main input, main select, main table, main [data-figure-frame], main [role=status]')]
      .filter((node) => node.checkVisibility({ opacityProperty: true, visibilityProperty: true })).map((node) => {
        const style = getComputedStyle(node);
        return { selector: selector(node), text: (node.textContent ?? '').trim(),
          fontFamily: style.fontFamily, fontSize: style.fontSize, lineHeight: style.lineHeight,
          colour: style.color, background: style.backgroundColor, radius: style.borderRadius,
          shadow: style.boxShadow, filter: style.filter, outline: style.outline, outlineOffset: style.outlineOffset,
          aria: Object.fromEntries([...node.attributes].filter(({ name }) => name.startsWith('aria-') || name === 'role').map(({ name, value }) => [name, value])) };
      });
    return { publicText: document.querySelector<HTMLElement>('main')?.innerText.trim() ?? '',
      viewport: { width: innerWidth, height: innerHeight }, fontsLoaded: document.fonts.status === 'loaded',
      pendingFonts: [...document.fonts].filter(({ status }) => status === 'loading' || status === 'error').map(({ family, status }) => `${family}:${status}`),
      busy: [...document.querySelectorAll('[aria-busy=true]')].filter((node) => node.checkVisibility()).map(selector),
      transitions: document.getAnimations().filter((animation) => animation instanceof CSSTransition && animation.playState === 'running').map((animation) => animation.constructor.name),
      tokens: Object.fromEntries(['--color-paper','--color-ink','--color-signal','--color-graphite','--color-concrete','--color-white','--color-highlight'].map((name) => [name, root.getPropertyValue(name).trim()])), elements };
  });
  const stem = `${RELEASE_EVIDENCE_DIRECTORY}/deep/${row.id}`;
  const documentCapture = await captureWholeDocument(page, stem);
  const boundedPath = `${stem}-state.png`;
  await page.screenshot({ path: join(root, boundedPath), fullPage: false, animations: 'disabled', timeout: 60_000 });
  const measured = await page.evaluate(collectBrowserReferenceFeatures, config);
  let desktop = measured;
  let mobile = measured;
  try {
    if (row.viewport.width !== 1440) await page.setViewportSize({ width: 1440, height: 900 });
    desktop = await page.evaluate(collectBrowserReferenceFeatures, config);
    await page.setViewportSize({ width: 375, height: 812 });
    mobile = await page.evaluate(collectBrowserReferenceFeatures, config);
  } finally { await page.setViewportSize(row.viewport); }
  const reconciled = reconcileResponsiveDeviceCounts(desktop, mobile);
  const actual = { ...measured, gridAndDevices: { ...measured.gridAndDevices,
    mobileDeviceCount: reconciled.gridAndDevices.mobileDeviceCount,
    desktopDeviceCount: reconciled.gridAndDevices.desktopDeviceCount } };
  const report = evaluateReferenceFeatures(actual);
  const payload = parseReferenceComparisonPayload({
    kind: 'autonomous-reference-comparison', rubricVersion: 1,
    comparisonMode: 'feature-anchors-only', contractLiteralOverridesApplied: true,
    referenceIds: ['library/brand-reference-board.jpeg', 'library/brand-reference-article.png'],
    surfaceId: row.id, screenshotPaths: [...documentCapture.files.map(({ path }) => path), boundedPath],
    anchors: report.anchors, passed: report.passed,
  });
  if (releaseSourceFingerprint(root) !== FINAL_CAPTURE_SOURCE_FINGERPRINT) throw new Error(`${row.id}: source changed during deep capture`);
  const artifact = { version: 1, sourceFingerprint: FINAL_CAPTURE_SOURCE_FINGERPRINT, exportFingerprint: FINAL_CAPTURE_BUILD.exportFingerprint,
    id: row.id, declaredRoute: row.route, renderedRoute: route, viewport: row.viewport, state: row.state,
    expectedSteps: row.steps.map(({ id }) => id), executedSteps: [...executedSteps],
    captures: row.captures, documentCapture,
    phaseCaptures: [...phaseCaptures],
    bounded: { path: boundedPath, sha256: releaseArtifactHash(root, boundedPath) },
    measurements: actual, computed, payload,
    referenceHashes: payload.referenceIds.map((path) => ({ path, sha256: releaseArtifactHash(root, path) })),
  };
  writeFileSync(join(root, `${stem}.json`), JSON.stringify(artifact, null, 2) + '\n');
  // Merely producing the file is not acceptance. These fail on any actual
  // anchor or missing phase and keep the failed observations for diagnosis.
  if (JSON.stringify(artifact.expectedSteps) !== JSON.stringify(artifact.executedSteps)) throw new Error(`${row.id}: deep evidence has a missing or reordered executed step`);
  if (JSON.stringify(row.captures.filter(({ kind }) => kind === 'bounded').map(({ id }) => id)) !== JSON.stringify(phaseCaptures.map(({ id }) => id))) throw new Error(`${row.id}: a declared phase has no actual bounded capture`);
  if (!payload.passed) throw new Error(`${row.id}: reference anchors fail: ${payload.anchors.filter(({ passed }) => !passed).map(({ id }) => id).join(', ')}`);
  // Re-read the actual persisted record, never a caller-maintained pass map.
  return JSON.parse(readFileSync(join(root, `${stem}.json`), 'utf8')) as typeof artifact;
}
