import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('crossdomain selected counts and removal at desktop and mobile', async ({ page }) => {
  test.setTimeout(180_000);
  const directory = 'audit/evidence/crossdomain-closure-20260923';
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const observations: object[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
    ? route.continue() : route.abort());
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    for (const slug of ['manipulation/generalist-policies', 'world-models/taxonomy']) {
      expect((await page.goto(`/${slug}/`))?.status()).toBe(200);
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el =>
        Object.keys(el).some(k => k.startsWith('__reactFiber$'))));
      const main = page.locator('#main-content');
      if (slug.includes('generalist')) {
        await expect(main).toContainText('13 selected records, an authored selection');
        for (const absent of ['marked downloadable', 'arXiv papers', 'blog/press sources', 'Seven of the thirteen']) {
          await expect(main).not.toContainText(absent);
        }
        await expect(page.getByTestId('release-track')).toContainText('13 of 13 shown');
        await expect(main.getByRole('img', { name: /^Selected generalist robot policy records\./ })).toBeVisible();
        await page.getByRole('button', { name: 'Downloadable', exact: true }).click();
        await expect(page.getByTestId('release-track')).toContainText('4 of 13 shown');
        await page.getByRole('button', { name: 'Not disclosed', exact: true }).click();
        await expect(page.getByTestId('release-track')).toContainText('6 of 13 shown');
        await page.getByRole('button', { name: 'Skild Brain', exact: true }).click();
        await expect(page.getByTestId('release-detail')).toContainText('weights: not disclosed');
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await expect(page.getByTestId('release-track')).toContainText('13 of 13 shown');
        await page.getByTestId('release-track').scrollIntoViewIfNeeded();
      } else {
        await expect(main).toContainText("this article's authored selection");
        await expect(main).toContainText('not an exhaustive or universally agreed scientific taxonomy');
        await expect(main).toContainText('example groups');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const name = `${slug.split('/')[1]}-${viewport.width}`;
      const text = await main.innerText();
      expect(text).not.toContain('$$');
      writeFileSync(`${directory}/${name}.dom.txt`, text + '\n', { flag: 'wx' });
      await page.screenshot({ path: `${directory}/${name}.png`, animations: 'disabled' });
      const ref = (path: string) => {
        const bytes = readFileSync(path);
        return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
      };
      observations.push({ route: `/${slug}/`, viewport, observedAt: new Date().toISOString(),
        dom: ref(`${directory}/${name}.dom.txt`), capture: ref(`${directory}/${name}.png`),
        scope: 'Actual selected counts, disclosure/removal and preserved controls; not scientific/source certification.' });
    }
  }
  expect(errors).toEqual([]);
  writeFileSync(`${directory}/browser-observations.json`, JSON.stringify({
    startedAt, endedAt: new Date().toISOString(), observations, errors,
  }, null, 2) + '\n', { flag: 'wx' });
});
