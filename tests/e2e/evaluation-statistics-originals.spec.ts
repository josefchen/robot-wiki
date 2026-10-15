import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CITATIONS, citationLabel, citationMeta } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { openAdjustMore } from './helpers/figure-fold';
import { citeNoteInMargin, citeParts, clickCiteMark, closeCiteNote } from './helpers/citation-note';
import { setSlider } from './slider';

const evaluation = '/data-hardware/evaluation-crisis/';
const bottleneck = '/data-hardware/data-bottleneck/';
const tri = CITATIONS.find((c) => c.id === 'tri-lbm-2025')!;
const snyder = CITATIONS.find((c) => c.id === 'optimal-stopping-2025')!;
const definition = GLOSSARY.find((t) => t.id === 'success-rate')!;

async function capture(page: Page, name: string) {
  const out = process.env.DR_READER_OUT;
  if (out) await page.screenshot({
    path: path.join(out, `${process.env.DR_READER_RUN}-${name}.png`),
  });
}

async function bounds(locator: Locator, width: number, height: number) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(height);
  return box;
}

for (const width of [375, 1440]) {
  const height = width === 375 ? 812 : 900;
  test.describe(`evaluation statistics at ${width}px`, () => {
    test.use({ viewport: { width, height } });

    test.beforeEach(async ({ context }) => {
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (['127.0.0.1', 'localhost'].includes(url.hostname)) await route.continue();
        else await route.abort('blockedbyclient');
      });
    });

    for (const route of [evaluation, bottleneck]) {
      test(`${route} preserves source reading and full bylines`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => document.fonts.ready);
        const slug = route.split('/').filter(Boolean).at(-1)!;
        const observations = [];
        // Owner-approved successor (Josef, 2026-10-10, the research-page
        // standard): the chip's author-year link and its tooltip became the
        // citation's numbered sidenote. The label, source link, title and
        // byline are read off the note; from 1200 px it stands in the margin
        // at rest and the number jumps to the References entry, and narrower
        // the number opens it inline, by pointer (the hover state) or by
        // Enter (the keyboard state). The number is the hit target now.
        const wide = width >= 1200;
        for (const citation of route === evaluation ? [tri, snyder] : [tri]) {
          const chip = page.locator(`div.prose [data-cite-id="${citation.id}"]`).first();
          const { mark, note, source } = citeParts(chip);
          await expect(source).toHaveText(citationLabel(citation));
          await expect(source).toHaveAttribute('href', citation.url);
          await expect(source).toHaveAttribute('target', '_blank');
          await expect(source).toHaveAttribute('rel', 'noopener noreferrer');
          expect(await citeNoteInMargin(chip)).toBe(wide);
          for (const position of ['reading', 'lower-edge']) {
            await mark.evaluate((element, low) => {
              const top = element.getBoundingClientRect().top + window.scrollY;
              window.scrollTo(0, top - (low ? window.innerHeight - 80 : 340));
            }, position === 'lower-edge');
            for (const method of ['hover', 'keyboard']) {
              if (method === 'hover') {
                // Aimed at the number's own box, as clickCiteMark aims its click.
                const target = (await mark.boundingBox())!;
                await mark.hover({ position: { x: target.width / 2, y: target.height / 2 } });
                if (!wide) await clickCiteMark(mark);
              } else {
                await page.mouse.move(0, 0);
                await mark.focus();
                if (!wide) await page.keyboard.press('Enter');
              }
              await expect(note).toBeVisible();
              await expect(note).toContainText(citation.title);
              await expect(note).toContainText(citationMeta(citation));
              observations.push({ citation: citation.id, position, method, inMargin: wide,
                box: await note.boundingBox() });
              await capture(page, `${slug}-${width}-${citation.id}-${position}-${method}`);
              await bounds(note, width, height);
              expect(await mark.evaluate((element) => {
                const rect = element.getBoundingClientRect();
                return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
              })).toBe(true);
              await closeCiteNote(chip);
            }
          }
          // Below 1200 px the number opens the note instead of jumping, so
          // the jump to the References entry is taken at the desktop width.
          if (!wide) await page.setViewportSize({ width: 1280, height });
          const jump = chip.locator('a[href^="#ref-"]');
          await jump.focus();
          await page.keyboard.press('Enter');
          await expect(page).toHaveURL(new RegExp(`#ref-${citation.id}$`));
          const ref = page.locator(`[data-reference-id="${citation.id}"]`);
          await expect(ref.locator('[data-reference-source-link]')).toHaveText(citation.title);
          if (citation.authors.length > 8) {
            const expand = ref.getByRole('button', { name: `Show all ${citation.authors.length} authors` });
            await expand.focus();
            await page.keyboard.press('Enter');
            await expect(ref.getByRole('button', { name: 'Show 8 authors' })).toHaveAttribute('aria-expanded', 'true');
          }
          // The expanded entry is read, captured and checked for overflow at
          // the width under test.
          if (!wide) await page.setViewportSize({ width, height });
          await expect(ref.locator('[data-author-names]')).toHaveText(citation.authors.join(', '));
          if (citation.id === tri.id) await expect(ref).not.toContainText('Science Robotics 2026');
          await capture(page, `${slug}-${width}-${citation.id}-full-authors`);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
          await page.goBack();
          await expect(page).toHaveURL(new RegExp(`${route}$`));
          observations.push({ backFocus: await page.evaluate(() => document.activeElement?.tagName) });
        }
        expect(errors).toEqual([]);
        if (process.env.DR_READER_OUT) fs.writeFileSync(
          path.join(process.env.DR_READER_OUT, `${process.env.DR_READER_RUN}-${slug}-${width}-observations.json`),
          JSON.stringify({ route, width, observations, inputManifest: process.env.ROBOT_WIKI_GATE_INPUTS,
            inspectedScreenshots: false }, null, 2));
      });
    }

    test('remaining glossary consumers, data-scale chart and delivered fonts', async ({ page }) => {
      const observations = [];
      for (const route of [bottleneck, '/adjacent/surgical/', '/frontier/bear-case/',
        '/frontier/reliability-gap/', '/frontier/generalization/', '/manipulation/rl-finetuning/']) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => document.fonts.ready);
        const term = page.locator('div.prose [data-term-id="success-rate"]').first();
        await term.locator('a').focus();
        await expect(term.getByRole('tooltip')).toContainText(definition.definition);
        await expect(term.getByRole('tooltip')).not.toContainText('most papers measure it on 10 to 20');
        const box = await bounds(term.getByRole('tooltip'), width, height);
        const fonts = await page.evaluate(() => ({
          heading: getComputedStyle(document.querySelector('h1')!).fontFamily,
          prose: getComputedStyle(document.querySelector('div.prose p')!).fontFamily,
          loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
          resources: performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /woff2/.test(n)),
        }));
        // Owner-approved successor (Josef, 2026-10-10, the research-page
        // standard): DM Sans (display), Geist (body and interface) and Geist
        // Mono (numerals) replace Tektur, Newsreader and the two IBM Plex
        // roles. Names match whole, so Geist Mono cannot pass for Geist.
        expect(fonts.heading).toMatch(/^"?DM Sans"?,/);
        expect(fonts.prose).toMatch(/^"?Geist"?,/);
        for (const role of [/^"?DM Sans"?$/, /^"?Geist"?$/, /^"?Geist Mono"?$/]) {
          expect(fonts.loaded.some((f) => role.test(f))).toBe(true);
        }
        expect(fonts.resources.length).toBeGreaterThan(0);
        await capture(page, `peer-${route.replaceAll('/', '-')}-${width}`);
        observations.push({ route, box, fonts });
        if (route === bottleneck) {
          // The page's one data-scale chart is its prediction step's figure,
          // operable at settle with the reasoning still closed.
          const dataStep = page.locator('[data-predict]:has([data-figure-frame="data-scale-chart"])');
          await expect(dataStep.locator('details[data-reveal]')).not.toHaveAttribute('open');
          await expect(dataStep.locator(':scope > [data-predict-figure] [data-figure-frame="data-scale-chart"]')).toBeVisible();
          const slider = page.getByRole('slider', { name: /teleoperation rigs/ }).first();
          const summary = page.getByTestId('projection-summary').first();
          const before = await summary.innerText();
          await slider.focus();
          await page.keyboard.press('ArrowRight');
          await expect(summary).not.toHaveText(before);
          await expect(page.locator('svg[aria-label^="Chatbot training text"]').first()).toContainText('TRI LBM');
        }
      }
      if (process.env.DR_READER_OUT) fs.writeFileSync(
        path.join(process.env.DR_READER_OUT, `${process.env.DR_READER_RUN}-peers-${width}.json`),
        JSON.stringify({ observations, inputManifest: process.env.ROBOT_WIKI_GATE_INPUTS }, null, 2));
    });

    test('corrected scientific strings, SelfCheck, arithmetic and glossary flow', async ({ page }) => {
      await page.goto(evaluation);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole('heading', { name: 'Small samples limit comparison' })).toBeVisible();
      const prose = page.locator('div.prose[data-pagefind-body]');
      for (const phrase of ['10 or 50', '1,700 demonstration hours', 'up to 32%',
        'uniform risk-accumulation schedule', 'while STEP is a separate method', 'significant risk',
        'variation from stochastic training', 'Simulation used automated predicates']) {
        await expect(prose).toContainText(phrase);
      }
      await expect(prose).not.toContainText('up to 40%');
      await expect(prose).not.toContainText('Only the 50-trial number');
      await page.getByRole('heading', { name: 'Small samples limit comparison' }).scrollIntoViewIfNeeded();
      await capture(page, `science-${width}`);
      // The page's one calculator is its prediction step's figure, shown at
      // settle; the per-step slider and Reset sit in its "Adjust more" fold.
      const step = page.locator('[data-predict]:has(svg[aria-label^="Line chart of episode success"])');
      await expect(step.locator('details[data-reveal]')).not.toHaveAttribute('open');
      const mount = step.locator(':scope > [data-predict-figure] [data-brand-module-signature="instrument-frame"]');
      await expect(mount).toBeVisible();
      await openAdjustMore(mount);
      await setSlider(mount.getByRole('slider', { name: /per-step success/i }), 95);
      await setSlider(mount.getByRole('slider', { name: /episode length/i }), 30);
      await expect(mount.getByTestId('episode-success-readout')).toHaveText('21.5%');
      await setSlider(mount.getByRole('slider', { name: /per-step success/i }), 0);
      await expect(mount.getByTestId('episode-success-readout')).toHaveText('0.0%');
      await mount.getByRole('button', { name: /reset/i }).click();
      await expect(mount.getByTestId('episode-success-readout')).toHaveText('48.8%');
      const check = page.locator('[data-self-check]');
      await expect(check.locator('details[data-reveal]')).not.toHaveAttribute('open');
      await check.getByRole('radio', { name: 'The identical reported success rates establish equivalent performance' }).check();
      await expect(check.locator('[data-reason="equal"]')).toContainText('does not establish equal underlying');
      const answer = check.getByRole('radio', { name: 'Neither policy is established as better; inspect the uncertainty and comparison protocol' });
      await answer.focus();
      await page.keyboard.press('Space');
      await expect(answer).toBeChecked();
      await expect(check.locator('[data-reason="b-signals"]')).toContainText('there is no universal threshold');
      await capture(page, `self-check-${width}`);
      const term = page.locator('div.prose [data-term-id="success-rate"]').first();
      await term.locator('a').focus();
      await expect(term.getByRole('tooltip')).toContainText(definition.definition);
      await bounds(term.getByRole('tooltip'), width, height);
      await capture(page, `term-${width}`);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/glossary\/?#success-rate$/);
      const entry = page.locator('[data-glossary-term="success-rate"]');
      await expect(entry).toContainText(definition.definition);
      for (const citation of [tri, snyder]) await expect(entry.getByRole('link', { name: citation.title }))
        .toHaveAttribute('href', citation.url);
      await capture(page, `glossary-${width}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${evaluation}$`));
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
