import { expect, test, type Page } from '@playwright/test';
import { EXPLAINER_MOUNTS } from '../../components/explainers/mounts';
import { EXPLAINER_WORDS, type ExplainerId } from '../../components/explainers/words';
import { collectConsole } from './helpers/console';

/**
 * VAL-OPUS-153 in the browser: each curriculum explainer is mounted once in
 * its home article, right after the sentence that points at it, and opens no
 * WebGL context until the reader presses Start, then exactly one. The other
 * home articles link to it on /how-robots-work/. The unit test
 * tests/unit/explainer-mounts.test.ts holds the MDX to the same table.
 */
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
] as const;

const MOUNTS = Object.entries(EXPLAINER_MOUNTS) as [ExplainerId, (typeof EXPLAINER_MOUNTS)[ExplainerId]][];

/** Counts every WebGL context the page opens, before any page script runs. */
async function countWebgl(page: Page, { block = false } = {}) {
  await page.addInitScript((blocked) => {
    const counter = { contexts: 0 };
    (window as unknown as { __webgl: typeof counter }).__webgl = counter;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      if (/^(webgl|webgl2|experimental-webgl)$/.test(kind)) {
        if (blocked) return null;
        const context = (original as (...args: unknown[]) => unknown).call(this, kind, ...rest);
        if (context) counter.contexts += 1;
        return context;
      }
      return (original as (...args: unknown[]) => unknown).call(this, kind, ...rest);
    } as typeof original;
  }, block);
  return () => page.evaluate(() => (window as unknown as { __webgl: { contexts: number } }).__webgl.contexts);
}

async function openMount(page: Page, article: string, id: ExplainerId) {
  await page.goto(`/${article}/`);
  await page.waitForLoadState('networkidle');
  const mounts = page.locator('[data-explainer-mount]');
  await expect(mounts).toHaveCount(1);
  const mount = page.locator(`[data-explainer-mount="${id}"]`);
  await mount.scrollIntoViewIfNeeded();
  return mount;
}

for (const viewport of VIEWPORTS) {
  for (const [id, { article, cue }] of MOUNTS) {
    test(`${id} is mounted once in ${article} at ${viewport.name} width`, async ({ page }) => {
      test.setTimeout(120_000);
      const { errors } = collectConsole(page);
      const contexts = await countWebgl(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const mount = await openMount(page, article, id);
      const words = EXPLAINER_WORDS[id];

      await expect(page.getByRole('group', { name: words.question })).toHaveCount(1);
      // The cue ends the paragraph just before the figure.
      const before = await mount.evaluate((el) => el.closest('figure, [data-explainer-mount]')!.previousElementSibling?.textContent ?? '');
      expect(before.trim().endsWith(cue)).toBe(true);
      const poster = mount.locator('[data-x="poster"]');
      await expect(poster).toBeVisible();
      await expect(poster).toHaveAttribute('alt', words.steps[0]);
      await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect(mount.locator('[data-x="stepText"]')).toHaveText(words.steps[0]);
      expect(await contexts(), 'no WebGL context before the reader starts the scene').toBe(0);

      const start = mount.locator('[data-x="start"]');
      await expect(start).toBeVisible();
      const posterBox = (await mount.locator('[data-x="stage"]').boundingBox())!;
      await start.click();
      await page.waitForFunction(
        () => (window as unknown as { __explainer?: { live: boolean } }).__explainer?.live === true,
        undefined,
        { timeout: 60_000 },
      );
      const canvas = mount.locator('[data-x="stage"] canvas');
      await expect(canvas).toBeVisible();
      expect(await contexts(), 'one WebGL context once started').toBe(1);
      const liveBox = (await mount.locator('[data-x="stage"]').boundingBox())!;
      expect(Math.abs(liveBox.height - posterBox.height), 'the scene replaces the poster without a shift').toBeLessThanOrEqual(1);
      expect(liveBox.x + liveBox.width).toBeLessThanOrEqual(viewport.width + 1);
      await mount.locator('[data-x="next"]').click();
      await expect(mount.locator('[data-x="dots"] button').nth(1)).toHaveAttribute('aria-pressed', 'true');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'the page does not scroll sideways').toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  }
}

for (const [id, { linkedFrom }] of MOUNTS) {
  for (const article of linkedFrom) {
    test(`${article} links to the ${id} explainer instead of mounting it`, async ({ page }) => {
      await page.goto(`/${article}/`);
      await expect(page.locator(`[data-explainer-mount="${id}"]`)).toHaveCount(0);
      await expect(page.locator(`.prose a[href="/how-robots-work/#${id}"]`).first()).toBeVisible();
    });
  }
}

test('with reduced motion the mount waits for Start and keeps its steps', async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const { errors } = collectConsole(page);
  const contexts = await countWebgl(page);
  const mount = await openMount(page, EXPLAINER_MOUNTS.reaching.article, 'reaching');
  await expect(mount.locator('[data-x="start"]')).toBeVisible();
  await page.waitForTimeout(500);
  expect(await contexts()).toBe(0);
  await expect(mount.locator('[data-x="stepText"]')).toHaveText(EXPLAINER_WORDS.reaching.steps[0]);
  expect(errors).toEqual([]);
  await context.close();
});

test('without WebGL the mount says so and teaches its steps as text', async ({ page }) => {
  test.setTimeout(120_000);
  const { errors } = collectConsole(page);
  await countWebgl(page, { block: true });
  const mount = await openMount(page, EXPLAINER_MOUNTS.flying.article, 'flying');
  await mount.locator('[data-x="start"]').click();
  await expect(mount.locator('[data-x="status"]')).toHaveText(/cannot show 3D/);
  await expect(mount.locator('[data-x="poster"]')).toBeVisible();
  const steps = EXPLAINER_WORDS.flying.steps;
  await expect(mount.locator('[data-x="dots"] button')).toHaveCount(steps.length);
  await mount.locator('[data-x="next"]').click();
  await expect(mount.locator('[data-x="stepText"]')).toHaveText(steps[1]);
  expect(errors).toEqual([]);
});
