/**
 * scene:capture — the motion-language capture loop.
 *
 * Renders every beat's end-state plus the poster of a scene at 375 px and
 * 1440 px into evidence/motion/scenes/<scene-id>/, stepping the beats by
 * keyboard exactly the way the e2e spec does, and pins the reduced-motion
 * poster still. The end-states are deterministic (the player only sets t),
 * so re-running overwrites identical bytes for identical code.
 *
 * Clip mounts (`<Clip>`) are captured by scripts/capture-motion-clip.ts;
 * this script walks the live step-through scenes only.
 *
 * Usage: node scripts/capture-motion-scene.ts [-- <scene-id> | all]
 */
import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { auditSceneElement, type SceneAudit } from '../lib/motion-scene-audit.ts';
import { SCENE_TARGETS, type SceneTarget } from '../lib/motion-scene-registry.ts';

const VIEWPORTS = [
  { name: '375', width: 375, height: 800 },
  { name: '1440', width: 1440, height: 900 },
] as const;

const BASE_URL = process.env.CAPTURE_BASE_URL ?? 'http://localhost:3200';

async function captureScene(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  sceneId: string,
  target: SceneTarget,
): Promise<string[]> {
  const outDir = path.resolve('evidence/motion/scenes', sceneId);
  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  const selector = `[data-motion-scene="${sceneId}"]`;
  const measurements: Record<string, SceneAudit> = {};
  const audit = async (scope: import('@playwright/test').Locator, name: string) => {
    const result = await scope.evaluate(auditSceneElement);
    measurements[name] = result;
    const failures = [...result.intersections, ...result.overflow, ...result.lowContrast];
    if (failures.length > 0) {
      throw new Error(`${sceneId} ${name}: ${failures.join('; ')}`);
    }
  };

  for (const viewport of VIEWPORTS) {
    // Reduced motion first: the poster still, never tweened.
    const reducedContext = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'reduce',
    });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(BASE_URL + target.route, { waitUntil: 'networkidle' });
    // The development badge can intrude into a narrow component screenshot.
    await reducedPage.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await reducedPage.locator(selector).waitFor();
    await reducedPage.evaluate(() => document.fonts.ready);
    await audit(reducedPage.locator(selector), `${viewport.name} reduced poster`);
    const reducedStill = path.join(outDir, `${viewport.name}-reduced-poster.png`);
    await reducedPage.locator(selector).screenshot({ path: reducedStill });
    written.push(reducedStill);
    await reducedContext.close();

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await page.goto(BASE_URL + target.route, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    const scene = page.locator(selector);
    await scene.waitFor();
    await page.evaluate(() => document.fonts.ready);

    const posterPath = path.join(outDir, `${viewport.name}-poster.png`);
    await audit(scene, `${viewport.name} poster`);
    await scene.screenshot({ path: posterPath });
    written.push(posterPath);

    // Activate, pause the autoplay, and walk the beats by keyboard from
    // the top so every capture is a beat end-state. A click that races
    // hydration is retried once.
    await scene.getByTestId('motion-poster').click();
    let mounted = false;
    for (let attempt = 0; attempt < 2 && !mounted; attempt += 1) {
      try {
        await scene.getByTestId('motion-scrubber').waitFor({
          timeout: attempt === 0 ? 5_000 : 15_000,
        });
        mounted = true;
      } catch {
        await scene.getByTestId('motion-poster').click();
      }
    }
    if (!mounted) throw new Error(`scene ${sceneId} never activated`);
    const caption = scene.getByTestId('motion-caption');
    await page.keyboard.press('k');
    await page.keyboard.press('Home');
    // Each ArrowRight completes a beat; the beat counter confirms the
    // step landed (the caption can repeat between a beat's start and its
    // own end-state, so it cannot be the step signal).
    for (let beat = 1; beat <= target.beats; beat += 1) {
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(
        ([scope, ordinal, total]) => {
          const root = document.querySelector(scope as string);
          const counter = root?.querySelector(
            '[data-testid="motion-beat-count"]',
          );
          return (
            !!counter &&
            counter.textContent === `beat ${ordinal} / ${total}`
          );
        },
        [selector, beat, target.beats] as const,
      );
      await expect(caption).toBeVisible();
      const still = path.join(outDir, `${viewport.name}-beat-${beat}.png`);
      await audit(scene, `${viewport.name} beat ${beat}`);
      await scene.screenshot({ path: still });
      written.push(still);
    }
    await context.close();
  }
  const auditPath = path.join(outDir, 'audit.json');
  writeFileSync(auditPath, `${JSON.stringify(measurements, null, 2)}\n`);
  written.push(auditPath);
  console.log(`${sceneId}: ${Object.keys(measurements).length} stills, no intersections/overflow; minimum control contrast ${Math.min(...Object.values(measurements).flatMap((result) => result.contrast.map((entry) => entry.ratio)))}:1`);
  return written;
}

async function main() {
  const requested = process.argv.slice(2).filter((arg) => arg !== '--');
  const ids =
    requested.length === 0 || requested.includes('all')
      ? SCENE_TARGETS.map((scene) => scene.id)
      : requested;
  for (const id of ids) {
    if (!SCENE_TARGETS.some((scene) => scene.id === id)) {
      console.error(`unknown scene id: ${id} (known: ${SCENE_TARGETS.map((scene) => scene.id).join(', ')})`);
      process.exit(1);
    }
  }
  const browser = await chromium.launch();
  try {
    for (const id of ids) {
      const written = await captureScene(browser, id, SCENE_TARGETS.find((scene) => scene.id === id)!);
      for (const file of written) {
        console.log(`wrote ${file}`);
      }
    }
  } finally {
    await browser.close();
  }
}

main();
