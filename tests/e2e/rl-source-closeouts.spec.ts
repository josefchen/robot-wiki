import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expectedApparatusGraph } from '../../lib/brand-v2-apparatus-evidence';
import { getCitation } from '../../data/citations';
import { ANCHORS, BUDGET_SPEC, FLEET_SPEC } from '../../lib/sample-efficiency';
import { missingOccurrences } from './source-reader-requirements';
import { setSlider } from './slider';

const graph = expectedApparatusGraph(process.cwd());
const changed = ['levine-hand-eye-2016', 'her-2017', 'q-transformer-2023'];
const affected = [...graph].filter(([, value]) =>
  [...value.references, ...value.citationMarkers,
    ...value.componentCitationSites.map((site) => site.id)]
    .some((id) => changed.includes(id)),
);

/** Real viewport slices, retaining original bytes and document coordinates.
 * The useful coverage band avoids both the sticky header and the dev badge;
 * no DOM, CSS, overlay, caret, or image is masked or removed.
 */
async function captureSlices(page: Page, target: Locator, name: string, directory: string) {
  const viewport = page.viewportSize()!;
  const bounds = await target.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y + scrollY, width: box.width, height: box.height };
  });
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  const slices = [];
  const bandTop = 100;
  const bandBottom = viewport.height - 112;
  const step = bandBottom - bandTop - 40;
  for (let cursor = bounds.y; cursor < bounds.y + bounds.height; cursor += step) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), Math.max(0, Math.floor(cursor - bandTop)));
    const actual = await page.evaluate(() => ({
      scrollY, maxY: document.documentElement.scrollHeight - innerHeight,
    }));
    const path = join(directory, `${name}-${slices.length}.png`);
    await page.screenshot({ path, caret: 'initial' });
    const start = Math.max(bounds.y, actual.scrollY + bandTop);
    const end = Math.min(bounds.y + bounds.height, actual.scrollY + bandBottom);
    expect(end).toBeGreaterThan(start);
    slices.push({ path, viewport, scrollY: actual.scrollY, coverage: [start, end] });
    if (end >= bounds.y + bounds.height) break;
    expect(actual.scrollY).toBeLessThan(actual.maxY);
  }
  expect(slices[0].coverage[0]).toBeLessThanOrEqual(bounds.y);
  expect(slices.at(-1)!.coverage[1]).toBeGreaterThanOrEqual(bounds.y + bounds.height);
  for (let i = 1; i < slices.length; i++) {
    expect(slices[i].coverage[0]).toBeLessThanOrEqual(slices[i - 1].coverage[1]);
  }
  writeFileSync(join(directory, `${name}-coverage.json`), JSON.stringify({ bounds, slices }, null, 2));
}

for (const width of [1440, 375]) {
  test(`RL source closeouts and all mounted consumers at ${width}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const directory = process.env.RL_CLOSEOUT_CAPTURE_DIR ?? testInfo.outputPath('reader-captures');
    mkdirSync(directory, { recursive: true });
    const page = await context.newPage();
    const errors: string[] = [];
    const requests: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => requests.push(request.url()));
    try {
      expect(affected.map(([route]) => route)).toEqual(['/rl-sim2real/rl-for-robotics/']);
      for (const [route, required] of affected) {
        expect((await page.goto(`http://127.0.0.1:3200${route}`))?.ok()).toBe(true);
        await expect(page.getByRole('heading', { name: 'RL for Robotics', exact: true, level: 1 })).toBeVisible();
        const observed = await page.locator('[data-cite-id]').evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('data-cite-id') ?? ''),
        );
        expect(missingOccurrences([
          ...required.citationMarkers,
          ...required.componentCitationSites.map((site) => site.id),
        ], observed)).toEqual([]);
        expect(await page.locator('ol [data-reference-id]').evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('data-reference-id')),
        )).toEqual(required.references);
        for (const id of changed) {
          const citation = getCitation(id)!;
          const reference = page.locator(`ol [data-reference-id="${id}"]`);
          await reference.scrollIntoViewIfNeeded();
          const expand = reference.getByRole('button', { name: /authors/i });
          if (await expand.count()) {
            await expand.focus();
            await expect(expand).toBeFocused();
            await expand.click();
          }
          await expect(reference).toContainText(citation.authors.join(', '));
          const link = reference.locator(`a[href="${citation.url}"]`).first();
          await expect(link).toHaveAttribute('target', '_blank');
          await expect(link).toHaveAttribute('rel', /noopener/);
          await expect(link).toHaveAttribute('rel', /noreferrer/);
          await captureSlices(page, reference, `${width}-${id}`, directory);
          if (await expand.count()) await expand.click();
        }
        for (const id of ['sample-efficiency', 'offline-reinforcement-learning', 'hindsight-experience-replay']) {
          const term = page.locator(`.prose [data-term-id="${id}"]`).first();
          const trigger = term.locator('a,button').first();
          await trigger.scrollIntoViewIfNeeded();
          await trigger.focus();
          await expect(trigger).toBeFocused();
          await expect(term.getByRole('tooltip')).toBeVisible();
          await trigger.hover();
          await expect(term.getByRole('tooltip')).toBeVisible();
        }
        const widget = page.getByTestId('sample-efficiency');
        await page.mouse.move(0, 0);
        await page.getByTestId('sample-budget-slider').focus();
        await captureSlices(page, widget, `${width}-widget-default`, directory);
        for (const anchor of ANCHORS) {
          await expect(page.getByTestId(`sample-anchor-${anchor.id}`)).toHaveText(anchor.label);
        }
        const opening = await page.getByTestId('sample-wallclock-readout').textContent();
        for (const value of [BUDGET_SPEC.min, BUDGET_SPEC.max]) {
          await setSlider(page.getByTestId('sample-budget-slider'), value);
          await setSlider(page.getByTestId('sample-fleet-slider'), value === BUDGET_SPEC.min ? FLEET_SPEC.min : FLEET_SPEC.max);
          for (const source of ['sim', 'robot', 'fleet']) {
            await page.getByTestId(`sample-source-${source}`).check();
            await expect(page.getByTestId(`sample-source-${source}`)).toBeChecked();
            await expect(page.getByTestId('sample-provenance-note')).toContainText(/toy|model/i);
          }
        }
        await captureSlices(page, widget, `${width}-widget-maximum-fleet`, directory);
        const budget = page.getByTestId('sample-budget-slider');
        await budget.focus();
        await page.keyboard.press('ArrowLeft');
        await expect(budget).not.toHaveValue(String(BUDGET_SPEC.max));
        await widget.getByRole('button', { name: /reset the budget/i }).click();
        await expect(budget).toHaveValue(String(BUDGET_SPEC.default));
        await expect(page.getByTestId('sample-fleet-slider')).toHaveValue(String(FLEET_SPEC.default));
        await expect(page.getByTestId('sample-source-sim')).toBeChecked();
        await expect(page.getByTestId('sample-wallclock-readout')).toHaveText(opening!);
        await expect(page.getByTestId('sample-simplification-label')).toContainText('bands do not rule algorithms in or out');
        const details = widget.locator('details');
        if (await details.count() && await details.getAttribute('open') === null) {
          await details.locator('summary').click();
        }
        await expect(widget.getByRole('table')).toBeVisible();
        const axe = await new AxeBuilder({ page }).analyze();
        expect(axe.violations).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      }
      writeFileSync(join(directory, `${width}-reader-checks.json`), JSON.stringify({
        affectedRoutes: affected.map(([route]) => route), errors, requests,
        requiredGraph: affected, authorCounts: changed.map((id) => [id, getCitation(id)!.authors.length]),
      }, null, 2));
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}

test('inherited Gemini mobile full author entry, unmasked viewport slices only', async ({ browser }, testInfo) => {
  test.skip(process.env.RL_CLOSEOUT_PROOF !== '1', 'One bounded inherited evidence obligation, not an unrelated default sweep.');
  const context = await browser.newContext({ viewport: { width: 375, height: 1000 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  const directory = process.env.RL_CLOSEOUT_CAPTURE_DIR ?? testInfo.outputPath('inherited-mobile');
  mkdirSync(directory, { recursive: true });
  try {
    const routes = [...graph.keys()].filter((route) => route.endsWith('/generalist-policies/'));
    expect(routes).toHaveLength(1);
    expect((await page.goto(`http://127.0.0.1:3200${routes[0]}`))?.ok()).toBe(true);
    await expect(page.locator('h1')).not.toHaveText('Page not found');
    const reference = page.locator('ol [data-reference-id="gemini-robotics-2025"]');
    const button = reference.getByRole('button', { name: /authors/i });
    await button.click();
    const authors = getCitation('gemini-robotics-2025')!.authors;
    expect(authors).toHaveLength(118);
    await expect(reference).toContainText(authors.join(', '));
    await captureSlices(page, reference, '375-gemini-full-authors', directory);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

for (const width of [1440, 375]) {
  test(`source focus and expanded model table at ${width}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 900 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    const directory = process.env.RL_CLOSEOUT_CAPTURE_DIR ?? testInfo.outputPath('source-details');
    mkdirSync(directory, { recursive: true });
    const measurements = [];
    try {
      expect((await page.goto('http://127.0.0.1:3200/rl-sim2real/rl-for-robotics/'))?.ok()).toBe(true);
      await expect(page.getByRole('heading', { level: 1, name: 'RL for Robotics', exact: true })).toBeVisible();
      for (const id of [...changed, 'offline-rl-tutorial-2020']) {
        const chip = page.locator(`.prose [data-cite-id="${id}"]`).first();
        await chip.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
        const trigger = chip.locator('a,button').first();
        await trigger.focus();
        await expect(trigger).toBeFocused();
        const tooltip = chip.getByRole('tooltip');
        await expect(tooltip).toBeVisible();
        await trigger.hover();
        await expect(tooltip).toBeVisible();
        const box = await tooltip.boundingBox();
        expect(box).not.toBeNull();
        expect.soft(box!.x).toBeGreaterThanOrEqual(0);
        expect.soft(box!.y).toBeGreaterThanOrEqual(0);
        expect.soft(box!.x + box!.width).toBeLessThanOrEqual(width);
        expect.soft(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
        const overflow = await tooltip.evaluate((element) => element.scrollWidth - element.clientWidth);
        expect.soft(overflow).toBeLessThanOrEqual(1);
        measurements.push({ id, box, overflow });
      }
      await page.mouse.move(0, 0);
      const widget = page.getByTestId('sample-efficiency');
      await setSlider(page.getByTestId('sample-budget-slider'), BUDGET_SPEC.min);
      await setSlider(page.getByTestId('sample-fleet-slider'), FLEET_SPEC.min);
      await page.getByTestId('sample-source-fleet').check();
      await captureSlices(page, widget, `${width}-widget-minimum`, directory);
      await widget.getByRole('button', { name: /reset the budget/i }).click();
      const details = widget.locator('details');
      if (await details.getAttribute('open') === null) await details.locator('summary').click();
      const table = widget.getByRole('table');
      await expect(table).toBeVisible();
      await expect(table.getByRole('row')).toHaveCount(4);
      await captureSlices(page, widget, `${width}-widget-reset-table`, directory);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(errors).toEqual([]);
      writeFileSync(join(directory, `${width}-source-focus.json`), JSON.stringify({ measurements, errors }, null, 2));
    } finally { await context.close(); }
  });
}
