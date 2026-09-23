# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: crossdomain-closure-evidence.spec.ts >> crossdomain selected counts and removal at desktop and mobile
- Location: tests/e2e/crossdomain-closure-evidence.spec.ts:5:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByTestId('release-track')
Expected pattern: /^Selected generalist robot policy records\./
Received string:  "Select a release"
Timeout: 5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByTestId('release-track')
    14 × locator resolved to <div role="group" data-testid="release-track" aria-label="Select a release" class="mt-3 flex flex-wrap items-center gap-1.5">…</div>
       - unexpected value "Select a release"

```

```yaml
- group "Select a release":
  - button "Helix" [pressed]: Helix Feb 2025 not disclosed
  - button "Gemini Robotics 1.0": Gemini Robotics 1.0 Mar 2025 not downloadable
  - button "GR00T N1": GR00T N1 Mar 2025 downloadable
  - button "AgiBot GO-1": AgiBot GO-1 Mar 2025 report downloadable
  - button "π0.5": π0.5 Apr 2025 downloadable
  - button "Gemini Robotics 1.5": Gemini Robotics 1.5 Oct 2025 report not disclosed
  - button "π0.6": π0.6 Nov 2025 not downloadable
  - button "Helix 02": Helix 02 Jan 2026 not disclosed
  - button "Skild Brain": Skild Brain Jan 2026 announcement not disclosed
  - button "GR00T N1.7": GR00T N1.7 Apr 2026 downloadable
  - button "AgiBot GO-2": AgiBot GO-2 Apr 2026 HTML date not disclosed
  - button "π0.7": π0.7 Apr 2026 not downloadable
  - button "Gemini Robotics 2": Gemini Robotics 2 Jul 2026 not disclosed
  - text: 13 of 13 shown
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { readFileSync, writeFileSync } from 'node:fs';
  3  | import { createHash } from 'node:crypto';
  4  | 
  5  | test('crossdomain selected counts and removal at desktop and mobile', async ({ page }) => {
  6  |   test.setTimeout(180_000);
  7  |   const directory = 'audit/evidence/crossdomain-closure-20260923';
  8  |   const startedAt = new Date().toISOString();
  9  |   const errors: string[] = [];
  10 |   const observations: object[] = [];
  11 |   page.on('pageerror', e => errors.push(e.message));
  12 |   await page.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
  13 |     ? route.continue() : route.abort());
  14 |   for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }]) {
  15 |     await page.setViewportSize(viewport);
  16 |     for (const slug of ['manipulation/generalist-policies', 'world-models/taxonomy']) {
  17 |       expect((await page.goto(`/${slug}/`))?.status()).toBe(200);
  18 |       await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el =>
  19 |         Object.keys(el).some(k => k.startsWith('__reactFiber$'))));
  20 |       const main = page.locator('#main-content');
  21 |       if (slug.includes('generalist')) {
  22 |         await expect(main).toContainText('13 selected records, an authored selection');
  23 |         for (const absent of ['marked downloadable', 'arXiv papers', 'blog/press sources', 'Seven of the thirteen']) {
  24 |           await expect(main).not.toContainText(absent);
  25 |         }
  26 |         await expect(page.getByTestId('release-track')).toContainText('13 of 13 shown');
> 27 |         await expect(page.getByTestId('release-track')).toHaveAttribute('aria-label', /^Selected generalist robot policy records\./);
     |                                                         ^ Error: expect(locator).toHaveAttribute(expected) failed
  28 |         await page.getByRole('button', { name: 'Downloadable', exact: true }).click();
  29 |         await expect(page.getByTestId('release-track')).toContainText('4 of 13 shown');
  30 |         await page.getByRole('button', { name: 'Not disclosed', exact: true }).click();
  31 |         await expect(page.getByTestId('release-track')).toContainText('6 of 13 shown');
  32 |         await page.getByRole('button', { name: 'Skild Brain', exact: true }).click();
  33 |         await expect(page.getByTestId('release-detail')).toContainText('weights: not disclosed');
  34 |         await page.getByRole('button', { name: 'Reset', exact: true }).click();
  35 |         await expect(page.getByTestId('release-track')).toContainText('13 of 13 shown');
  36 |         await page.getByTestId('release-track').scrollIntoViewIfNeeded();
  37 |       } else {
  38 |         await expect(main).toContainText("this article's authored selection");
  39 |         await expect(main).toContainText('not an exhaustive or universally agreed scientific taxonomy');
  40 |         await expect(main).toContainText('example groups');
  41 |       }
  42 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  43 |       const name = `${slug.split('/')[1]}-${viewport.width}`;
  44 |       const text = await main.innerText();
  45 |       expect(text).not.toContain('$$');
  46 |       writeFileSync(`${directory}/${name}.dom.txt`, text + '\n', { flag: 'wx' });
  47 |       await page.screenshot({ path: `${directory}/${name}.png`, animations: 'disabled' });
  48 |       const ref = (path: string) => {
  49 |         const bytes = readFileSync(path);
  50 |         return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  51 |       };
  52 |       observations.push({ route: `/${slug}/`, viewport, observedAt: new Date().toISOString(),
  53 |         dom: ref(`${directory}/${name}.dom.txt`), capture: ref(`${directory}/${name}.png`),
  54 |         scope: 'Actual selected counts, disclosure/removal and preserved controls; not scientific/source certification.' });
  55 |     }
  56 |   }
  57 |   expect(errors).toEqual([]);
  58 |   writeFileSync(`${directory}/browser-observations.json`, JSON.stringify({
  59 |     startedAt, endedAt: new Date().toISOString(), observations, errors,
  60 |   }, null, 2) + '\n', { flag: 'wx' });
  61 | });
  62 | 
```