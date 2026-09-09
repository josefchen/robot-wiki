import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { getCitation } from '../../data/citations';
import { getTerm } from '../../data/glossary';
import { setSlider } from './slider';

for (const width of [375, 1440]) test(`Rudin scoped source readers ${width}`, async ({ browser }, info) => {
  const height = width === 375 ? 812 : 900;
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const directory = `${process.env.DR_READER_OUT ?? info.outputPath('readers')}/${process.env.DR_READER_RUN ?? 'scoped'}/reader-${width}`;
  mkdirSync(directory, { recursive: true });
  const errors: string[] = [], external: string[] = [];
  const captures: object[] = [], measures: object[] = [], axe: object[] = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    external.push(url.href); return route.abort();
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  async function capture(target: Locator, name: string) {
    await target.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const file = `${directory}/${name}.png`;
    await page.screenshot({ path: file, caret: 'initial' });
    captures.push({ file, bounds: await target.boundingBox(), scrollY: await page.evaluate(() => scrollY), viewport: { width, height } });
  }
  async function fontAndContrast(target: Locator, name: string) {
    const result = await target.evaluate(async e => {
      await document.fonts.ready;
      const s = getComputedStyle(e);
      let n: Element | null = e, bg = 'rgba(0, 0, 0, 0)';
      while (n && bg === 'rgba(0, 0, 0, 0)') { bg = getComputedStyle(n).backgroundColor; n = n.parentElement; }
      const lum = (color: string) => {
        const rgb = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(x => {
          x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
        });
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
      };
      const a = lum(s.color), b = lum(bg);
      return { family: s.fontFamily, size: s.fontSize, loaded: document.fonts.check(`${s.fontSize} ${s.fontFamily}`), color: s.color, background: bg, contrast: (Math.max(a,b)+.05)/(Math.min(a,b)+.05) };
    });
    measures.push({ name, ...result });
  }
  try {
    for (const slug of ['parallel-sim-rl', 'legged-locomotion', 'reward-design-mpc']) {
      expect((await page.goto(`/rl-sim2real/${slug}/`))?.ok()).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      const prose = page.locator('div.prose[data-pagefind-body]');
      const paragraphs = prose.locator('p').filter({ hasText: /1,500|nineteen reward functions|twelve-term|fifteen reward scales/ });
      expect(await paragraphs.count()).toBeGreaterThan(0);
      for (let i = 0; i < await paragraphs.count(); i++) {
        await capture(paragraphs.nth(i), `${slug}-corrected-${i}`);
        await fontAndContrast(paragraphs.nth(i), `${slug}-corrected-${i}`);
      }
      for (const id of ['rudin-2021', 'legged-gym-repo-2021']) {
        const citation = getCitation(id)!;
        const chip = prose.locator(`[data-cite-id="${id}"]`).first();
        const link = chip.getByRole('link').first();
        await chip.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await link.focus(); await expect(link).toBeFocused();
        const tooltip = chip.getByRole('tooltip'); await expect(tooltip).toBeVisible();
        await expect(link).toHaveAttribute('href', citation.url);
        measures.push({ slug, id, state: 'focus-tooltip', box: await tooltip.boundingBox() });
        await page.screenshot({ path: `${directory}/${slug}-${id}-focus.png`, caret: 'initial' });
        await link.hover(); await expect(tooltip).toBeVisible();
        await page.screenshot({ path: `${directory}/${slug}-${id}-hover.png`, caret: 'initial' });
        await page.mouse.move(0, 0); await link.blur();
        const reference = page.locator(`[data-reference-id="${id}"]`);
        await expect(reference).toContainText(citation.title);
        await expect(reference.locator('[data-author-names]')).toHaveText(citation.authors.join(', '));
        await capture(reference, `${slug}-${id}-reference`);
        await fontAndContrast(reference.locator('[data-author-names]'), `${slug}-${id}-authors`);
      }
      if (slug === 'parallel-sim-rl') {
        const flat = page.getByTestId('rudin-marker-flat');
        await expect(flat).toContainText('x illustrative');
        await expect(page.getByTestId('rudin-marker-uneven')).toContainText('< 20 min');
        const chart = flat.locator('..').locator('..');
        await capture(chart, 'chart-default');
        const slider = page.getByRole('slider', { name: /parallel environments/i });
        await setSlider(slider, 6); await capture(chart, 'chart-minimum');
        await setSlider(slider, 14);
        await page.getByRole('button', { name: /cpu single-core bottleneck/i }).click();
        await capture(chart, 'chart-cpu-maximum');
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await expect(page.getByTestId('envs-readout')).toHaveText('4,096');
        const term = prose.locator('[data-term-id="curriculum-learning"]').first();
        if (await term.count()) {
          await term.locator('a').first().focus();
          await expect(term.getByRole('tooltip')).toContainText('1,500');
          await page.screenshot({ path: `${directory}/curriculum-inline-focus.png`, caret: 'initial' });
        }
      }
      if (slug === 'reward-design-mpc') {
        const panel = page.getByTestId('quad-preview').locator('..');
        await expect(panel).toContainText('No policy is trained here.');
        await capture(panel, 'reward-default');
      }
      const result = await new AxeBuilder({ page }).analyze();
      axe.push({ slug, violations: result.violations, incomplete: result.incomplete });
      expect.soft(result.violations).toEqual([]);
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    }
    await page.goto('/glossary/');
    const term = page.locator('[data-glossary-term="curriculum-learning"]');
    await expect(term).toContainText(getTerm('curriculum-learning')!.definition);
    await capture(term, 'curriculum-glossary');
    await fontAndContrast(term.locator('p').first(), 'curriculum-glossary');
    expect(errors).toEqual([]); expect(external).toEqual([]);
  } finally {
    writeFileSync(`${directory}/observations.json`, JSON.stringify({ width, height, captures, measures, axe, errors, external, limitations: ['development runtime only', 'centered captures do not prove full tall-section coverage or the full chart', 'computed fonts are not CDP glyph attribution', 'screenshots require separate inspection'] }, null, 2));
    await context.close();
  }
});
