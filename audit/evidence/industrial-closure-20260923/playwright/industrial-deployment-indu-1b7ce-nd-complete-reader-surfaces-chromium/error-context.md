# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: industrial-deployment.spec.ts >> industrial closure paired cases and complete reader surfaces
- Location: tests/e2e/industrial-deployment.spec.ts:312:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('div.prose > div.rounded-md:has([data-testid="payback-months"])').getByRole('slider').nth(1).locator('xpath=following-sibling::p')
Expected pattern: /assumption|sourced/
Received string:  "Assumption: 2.5x is chosen within EVST’s 2-3x complete-cell guidance, not a measured cell."
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('div.prose > div.rounded-md:has([data-testid="payback-months"])').getByRole('slider').nth(1).locator('xpath=following-sibling::p')
    14 × locator resolved to <p class="mt-1 text-[11px] leading-snug text-text-dim">Assumption: 2.5x is chosen within EVST’s 2-3x com…</p>
       - unexpected value "Assumption: 2.5x is chosen within EVST’s 2-3x complete-cell guidance, not a measured cell."

```

```yaml
- paragraph: "Assumption: 2.5x is chosen within EVST’s 2-3x complete-cell guidance, not a measured cell."
```

# Test source

```ts
  290 | 
  291 |   test('zero axe violations, zero console errors, no horizontal scroll at 375px', async ({
  292 |     page,
  293 |   }) => {
  294 |     const errors: string[] = [];
  295 |     page.on('pageerror', (err) => errors.push(err.message));
  296 |     page.on('console', (msg) => {
  297 |       if (msg.type() === 'error') errors.push(msg.text());
  298 |     });
  299 |     await page.setViewportSize({ width: 375, height: 900 });
  300 |     await page.goto(ROUTE);
  301 |     const scrollWidth = await page.evaluate(
  302 |       () => document.documentElement.scrollWidth,
  303 |     );
  304 |     expect(scrollWidth).toBeLessThanOrEqual(375);
  305 |     const axe = await new AxeBuilder({ page }).analyze();
  306 |     expect(axe.violations).toEqual([]);
  307 |     expect(errors).toEqual([]);
  308 |   });
  309 | });
  310 | 
  311 | 
  312 | test('industrial closure paired cases and complete reader surfaces', async ({ page }) => {
  313 |   const startedAt = new Date().toISOString();
  314 |   const producing = process.env.INDUSTRIAL_WRITE_BROWSER === '1';
  315 |   const errors: string[] = [];
  316 |   page.on('pageerror', error => errors.push(error.message));
  317 |   page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  318 |   await page.setViewportSize({ width: 1440, height: 1100 });
  319 |   expect((await page.goto(ROUTE))?.status()).toBe(200);
  320 |   await page.evaluate(() => document.fonts.ready);
  321 |   const mount = calculator(page);
  322 |   const success = mount.getByRole('slider', { name: /per-pick success/i });
  323 |   const jam = mount.getByRole('slider', { name: /jam-clearing time/i });
  324 |   const observations: unknown[] = [];
  325 |   async function capture(name: string) {
  326 |     const viewport = page.viewportSize()!;
  327 |     if (!producing) return { viewport, dom: null, capture: null };
  328 |     const domPath = `${DIRECTORY}/${name}.dom.json`, pngPath = `${DIRECTORY}/${name}.png`;
  329 |     const dom = await page.evaluate(() => ({ text: document.body.innerText, allText: document.body.textContent, html: document.querySelector('#main-content')!.outerHTML }));
  330 |     writeFileSync(domPath, JSON.stringify(dom, null, 2) + '\n', { flag: 'wx' });
  331 |     await page.screenshot({ path: pngPath, animations: 'disabled' });
  332 |     return { viewport, dom: artifact(domPath), capture: artifact(pngPath) };
  333 |   }
  334 |   for (const clearing of [15, 300]) {
  335 |     for (const rate of [99.9, 99]) {
  336 |       const prestate = `success=${await success.inputValue()}; clearing=${await jam.inputValue()}`;
  337 |       await setSlider(jam, clearing); await setSlider(success, rate);
  338 |       const input = { ...defaults, successRatePercent: rate, jamClearSeconds: clearing };
  339 |       const o = oracle(input);
  340 |       await expect(success).toHaveValue(String(rate)); await expect(jam).toHaveValue(String(clearing));
  341 |       const readouts = [];
  342 |       for (const [i, id] of ['cost-per-pick', 'payback-months'].entries()) {
  343 |         await expect(mount.getByTestId(id)).toHaveText(o.display[i]);
  344 |         readouts.push({ selector: `[data-testid="${id}"]`, text: (await mount.getByTestId(id).innerText()).trim() });
  345 |       }
  346 |       await expect(mount).toContainText(o.summary);
  347 |       await expect(mount.getByTestId('payback-verdict')).toHaveText('Pays back inside 24 months');
  348 |       await mount.scrollIntoViewIfNeeded();
  349 |       observations.push({ input, mountId: 'mount:/data-hardware/industrial-deployment/:DeploymentEconomics:1',
  350 |         caseId: 'slider-boundaries-and-anchors', prestate,
  351 |         action: `Set clearing=${clearing} seconds and success=${rate} percent`,
  352 |         poststate: `${o.summary}; ${o.display.join('; ')}; Pays back inside 24 months`,
  353 |         readouts, ...await capture(`case-${rate}-${clearing}`) });
  354 |     }
  355 |   }
  356 |   await mount.getByRole('button', { name: 'Reset', exact: true }).click();
  357 |   const article = readFileSync(ARTICLE, 'utf8');
  358 |   const ids = [...new Set([...article.matchAll(/<Term id="([^"]+)"/g)].map(m => m[1]))];
  359 |   const glossary: { id: string; resolves: boolean; tooltipObserved: boolean }[] = [];
  360 |   const surfaceObservations: unknown[] = [];
  361 |   const undatedIds = ['lei-takt-time-definition', 'lei-cycle-time-definition'];
  362 |   for (const width of [1440, 375]) {
  363 |     await page.setViewportSize({ width, height: width === 375 ? 812 : 1100 });
  364 |     const checkedText: string[] = [];
  365 |     for (const id of ids) {
  366 |       const canonical = GLOSSARY.find(g => g.id === id);
  367 |       expect(canonical).toBeDefined();
  368 |       for (const citation of canonical!.citations) expect(CITATIONS.some(c => c.id === citation)).toBe(true);
  369 |       const term = page.locator(`[data-term-id="${id}"]`).first();
  370 |       await term.locator('a, span, button').first().focus();
  371 |       const tooltip = term.locator('span[id]').first();
  372 |       await expect(tooltip).toBeVisible();
  373 |       await expect(tooltip).toContainText(canonical!.definition);
  374 |       checkedText.push(canonical!.definition);
  375 |       if (width === 1440) glossary.push({ id, resolves: true, tooltipObserved: true });
  376 |     }
  377 |     for (const id of undatedIds) {
  378 |       const canonical = CITATIONS.find(c => c.id === id)!;
  379 |       expect(canonical.year).toBe('n.d.'); expect(canonical.accessedOn).toBe('2026-09-22');
  380 |       const reference = page.locator(`#ref-${id}`);
  381 |       await expect(reference).toContainText(canonical.title);
  382 |       await expect(reference).toContainText('n.d.; accessed 2026-09-22');
  383 |       await expect(reference.locator('a[href^="https://www.lean.org/"]').first()).toHaveAttribute('href', canonical.url);
  384 |       checkedText.push(canonical.title, 'n.d.; accessed 2026-09-22');
  385 |     }
  386 |     for (const value of ['4,663,698', '542,076', '54%', '~5,500']) {
  387 |       await expect(page.locator('#main-content')).toContainText(value); checkedText.push(value);
  388 |     }
  389 |     const sliders = mount.getByRole('slider'); expect(await sliders.count()).toBe(7);
> 390 |     for (const slider of await sliders.all()) await expect(slider.locator('xpath=following-sibling::p')).toContainText(/assumption|sourced/);
      |                                                                                                          ^ Error: expect(locator).toContainText(expected) failed
  391 |     await expect(page.locator('#main-content')).toContainText('not a measured intervention rate');
  392 |     await expect(page.locator('#main-content')).toContainText('no published success rate');
  393 |     checkedText.push('not a measured intervention rate', 'no published success rate');
  394 |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  395 |     const axe = await new AxeBuilder({ page }).include('#main-content').analyze();
  396 |     expect(axe.violations).toEqual([]);
  397 |     await page.locator('#the-metrics-that-decide-a-deployment').scrollIntoViewIfNeeded();
  398 |     surfaceObservations.push({ checkedText, ...await capture(`surfaces-${width}`), axeViolations: axe.violations });
  399 |   }
  400 |   const dashboardLinkStatus = (await page.request.get('/frontier/reliability-gap/')).status();
  401 |   expect(dashboardLinkStatus).toBe(200); expect(errors).toEqual([]);
  402 |   if (producing) save('browser-run.json', {
  403 |     command: 'NODE_DISABLE_COMPILE_CACHE=1 INDUSTRIAL_WRITE_BROWSER=1 node_modules/.bin/playwright test tests/e2e/industrial-deployment.spec.ts --grep "industrial closure paired" --workers=1 --retries=0 --reporter=line --output=audit/evidence/industrial-closure-20260923/playwright',
  404 |     runner: 'playwright', cwd: process.cwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
  405 |     startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(BROWSER),
  406 |     dependencies: surfacePaths.map(artifact), proofDependencies: dependencies(true),
  407 |     observations, surfaceObservations, glossary, dashboardLinkStatus, errors,
  408 |     p4: { checked: true, statCount: 4, authoredInputs: 7, undatedIds, absentNumericStandIns: [],
  409 |       population: 'All four Stat values; all seven authored controls; numeric prose supported by the full native row conjunction; glossary and bibliography from canonical registries; Figure success remains unpublished, not a guessed number. No spec/data table mounts on this article.' },
  410 |   });
  411 | });
  412 | 
```