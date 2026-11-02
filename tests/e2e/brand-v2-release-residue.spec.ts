import { forEachInOwnContext } from './helpers/per-route-context';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brandV2Registry, expect, test } from './brand-v2-static-fixture';
import { readReleaseBuildStamp } from '../../lib/brand-v2-release-build';
import { collectReleaseResiduePage } from './helpers/release-residue-collector';
import { readReleaseResidueRuntime, RELEASE_RESIDUE_PATH, RELEASE_RESIDUE_VIEWPORTS, releaseResidueFingerprint, type ResidueObservation } from '../../lib/brand-v2-release-residue-runtime';

/** This is evidence collection, not a pass bit. The independent release
 * reader checks every captured text, colour, attribute and ownership join. */
test('release residue captures every public route and the separate 404 at both widths', async ({
  browser,
  staticBase
}) => {
  test.setTimeout(900_000);
  const root = process.cwd();
  const routes = [...brandV2Registry.routes.public.map(r => r.path), '/404/'];
  const build = readReleaseBuildStamp(root);
  const fingerprint = releaseResidueFingerprint(root);
  const observations: ResidueObservation[] = [];
  for (const size of RELEASE_RESIDUE_VIEWPORTS) {
    await forEachInOwnContext(browser,routes,async(page,route)=>{
      const response = await page.goto(staticBase + route, {
        waitUntil: 'networkidle'
      });
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('main')).toBeVisible();
      // The credits surface owns the complete photo/logo census. Scrolling
      // its lazy images into view is necessary to read real delivery.
      if (route === '/credits/') {
        for (const image of await page.locator('img[data-image-id], [data-image-id] img').all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(async e => {
            const image = e as HTMLImageElement;
            await image.decode();
          });
        }
      }
      observations.push({
        route,
        viewport: size.width + 'x' + size.height,
        status: response?.status() ?? 0,
        ...(await page.evaluate(collectReleaseResiduePage))
      });
    },{viewport:size});
  }
  const afterBuild = readReleaseBuildStamp(root);
  expect(afterBuild.sourceAfter).toBe(build.sourceAfter);
  expect(afterBuild.exportFingerprint).toBe(build.exportFingerprint);
  expect(releaseResidueFingerprint(root), 'source/export changed during residue capture').toBe(fingerprint);
  const artifact = {
    version: 1 as const,
    fingerprint,
    routes,
    observations
  };
  readReleaseResidueRuntime({
    artifact,
    fingerprint,
    routes
  });
  const path = join(root, RELEASE_RESIDUE_PATH);
  mkdirSync(dirname(path), {
    recursive: true
  });
  writeFileSync(path, JSON.stringify(artifact, null, 2) + '\n');
});
import { collectReleaseResidueState } from './helpers/release-residue-state';
test('residue state probe rejects activated paint, accessible-name and display-face regressions', async ({
  page
}) => {
  await page.setContent('<h1 style="color:#1c1c1a">Robot Wiki</h1><button style="background:#1c1c1a;color:white">Run</button>');
  expect((await page.evaluate(collectReleaseResidueState)).findings).toEqual([]);
  await page.locator('button').evaluate(button => {
    button.style.backgroundColor = 'rgb(36 94 219)';
    button.setAttribute('aria-label', 'ROBOT WIKI action');
  });
  await page.locator('h1').evaluate(heading => {
    heading.style.fontFamily = 'IBM Plex Sans';
  });
  const changed = await page.evaluate(collectReleaseResidueState);
  expect(changed.elements).toBeGreaterThan(0);
  for (const predicate of ['legacy-signal:', 'blue-filled-action:', 'mixed-accessible-identity:', 'legacy-display-face:']) expect(changed.findings.some(f => f.startsWith(predicate)), predicate).toBe(true);
  await page.locator('button').evaluate(button => {
    button.style.backgroundColor = '#c6ff19';
  });
  expect((await page.evaluate(collectReleaseResidueState)).findings.some(f => f.startsWith('retired-lime:'))).toBe(true);
});
test('residue state probe preserves technical URL and code contexts while refusing an unscoped display name', async ({
  page
}) => {
  await page.setContent('<h1>Robot Wiki</h1><a href="https://robot-wiki.com">https://robot-wiki.com</a><pre><code>robot-atlas-trajectory robot-wiki</code></pre>');
  expect((await page.evaluate(collectReleaseResidueState)).findings).toEqual([]);
  await page.evaluate(() => {
    const label = document.createElement('p');
    label.textContent = 'robot-wiki';
    document.body.append(label);
  });
  expect((await page.evaluate(collectReleaseResidueState)).findings.some(f => f.startsWith('legacy-public-identity:'))).toBe(true);
});
