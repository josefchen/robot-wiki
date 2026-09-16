import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { CITATIONS } from '../../data/citations';

const route = '/data-hardware/industrial-deployment/';
const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async request => {
    const host = new URL(request.request().url()).hostname;
    if (['localhost', '127.0.0.1', '[::1]'].includes(host)) await request.continue();
    else {
      await request.abort();
      throw new Error(`Unexpected external browser request: ${request.request().url()}`);
    }
  });
  // Stabilize motion before first paint, without hiding development UI.
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.documentElement) return;
      const style = document.createElement('style');
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
      document.documentElement.appendChild(style);
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
});

test('IFR retained science, chronology, disagreement and Stat values', async ({ page }, info) => {
  expect((await page.goto(route))?.status()).toBe(200);
  const prose = page.locator('div.prose[data-pagefind-body]');
  const lead = prose.locator(':scope > p').first();
  for (const text of [
    '4,663,698', '2021 through 2024', '542,076', '2,027,190', '450,530',
    '4.5 times', '295,045', '54 percent', 'May 5, 2026', '128,899',
    '126,088', '88,777', '23 percent on page 13 but 24 percent on page 16',
    'customer-industry categories, not application families', '14 percent',
  ]) await expect(lead).toContainText(text, { useInnerText: true });
  const stats = prose.locator(':scope > div.grid').first();
  for (const text of ['4,663,698', '542,076', '2021-2024 each above 500k', '54%', 'in 2024']) {
    await expect(stats).toContainText(text);
  }
  const uses = prose.locator('p').filter({ hasText: 'OSHA’s Technical Manual lists uses' });
  await expect(uses).toContainText('including arc and resistance welding');
  await expect(uses).toContainText('machine-tool loading and unloading');
  await expect(uses).toContainText('materials handling and packaging');
  await expect(uses).not.toContainText('largest application');
  await expect(uses.locator('[data-cite-id="evst-cell-cost-2026"]')).toHaveCount(0);
  const captures = [];
  for (const [name, element] of [['lead', lead], ['stats', stats], ['uses', uses]] as const) {
    const height = (await element.boundingBox())!.height;
    for (let offset = 0; offset < height; offset += info.project.use.viewport!.height - 150) {
      await element.evaluate((e, y) => scrollBy(0, e.getBoundingClientRect().top - 80 + y), offset);
      const path = info.outputPath(`${name}-${offset}.png`);
      await page.screenshot({ path });
      captures.push({ path, sha256: sha(readFileSync(path)), offset, at: new Date().toISOString() });
    }
  }
  writeFileSync(info.outputPath('science.json'), JSON.stringify({
    captures, lead: await lead.innerText(), stats: await stats.innerText(), uses: await uses.innerText(),
    viewport: info.project.use.viewport, inputs: process.env.ROBOT_WIKI_GATE_INPUTS,
  }, null, 2));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const [id, count] of [
  ['ifr-world-robotics-2025', 3],
  ['ifr-china-five-year-plan-2026', 1],
  ['osha-otm-robots', 1],
] as const) {
  test(`IFR retained ${id}: sources, hover/focus, References and Back`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    expect((await page.goto(route))?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const citation = CITATIONS.find(c => c.id === id)!;
    const parent = id === 'osha-otm-robots'
      ? page.locator('div.prose p').filter({ hasText: 'OSHA’s Technical Manual lists uses' })
      : page.locator('div.prose[data-pagefind-body]');
    const chips = parent.locator(`[data-cite-id="${id}"]`);
    await expect(chips).toHaveCount(count);
    const states: object[] = [];
    const save = () => writeFileSync(info.outputPath('interaction.json'), JSON.stringify({
      id, count, states, errors, viewport: info.project.use.viewport,
      inputs: process.env.ROBOT_WIKI_GATE_INPUTS,
      inputSha256: process.env.ROBOT_WIKI_GATE_INPUTS ? sha(readFileSync(process.env.ROBOT_WIKI_GATE_INPUTS)) : null,
    }, null, 2));
    for (let i = 0; i < count; i++) {
      const chip = chips.nth(i);
      const link = chip.locator('a[target="_blank"]');
      await expect(link).toHaveAttribute('href', citation.url);
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      for (const placement of ['reading', 'lower-edge']) {
        await chip.evaluate((e, p) => scrollBy(0, e.getBoundingClientRect().top -
          (p === 'reading' ? innerHeight / 2 : innerHeight - 100)), placement);
        for (const mode of ['hover', 'focus']) {
          await link.evaluate(e => e.blur());
          if (mode === 'hover') await link.hover();
          else { await page.mouse.move(0, 0); await link.focus(); await expect(link).toBeFocused(); }
          const tip = chip.getByRole('tooltip');
          await expect(tip).toBeVisible();
          await expect(tip).toContainText(citation.title);
          await expect(tip).toContainText(citation.authors.join(', '));
          const box = (await tip.boundingBox())!;
          const focus = await link.evaluate(e => {
            const s = getComputedStyle(e);
            return { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor };
          });
          const path = info.outputPath(`${i}-${placement}-${mode}.png`);
          await page.screenshot({ path });
          states.push({ i, placement, mode, box, focus, path, sha256: sha(readFileSync(path)), at: new Date().toISOString() });
          save();
          expect.soft(box.x, `${i} ${placement} ${mode} left`).toBeGreaterThanOrEqual(0);
          expect.soft(box.x + box.width, `${i} ${placement} ${mode} right`).toBeLessThanOrEqual(info.project.use.viewport!.width);
          expect.soft(box.y, `${i} ${placement} ${mode} top`).toBeGreaterThanOrEqual(0);
          expect.soft(box.y + box.height, `${i} ${placement} ${mode} bottom`).toBeLessThanOrEqual(info.project.use.viewport!.height);
          if (mode === 'focus') {
            expect(focus.style).not.toBe('none');
            expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2);
          }
        }
      }
      expect(await link.evaluate(e => {
        const r = e.getBoundingClientRect();
        return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      })).toBe(true);
      const jump = chip.locator(`a[href="#ref-${id}"]`);
      await jump.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
      const reference = page.locator(`#ref-${id}`);
      await expect(reference).toBeInViewport();
      await expect(reference).toContainText(citation.authors.join(', '));
      await expect(reference).toContainText(citation.venue!);
      await expect(reference).toContainText(String(citation.year));
      await expect(reference.locator('[data-reference-source-link]')).toHaveAttribute('href', citation.url);
      const path = info.outputPath(`${i}-reference.png`);
      await page.screenshot({ path });
      states.push({ i, reference: await reference.innerText(), path, sha256: sha(readFileSync(path)) });
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      // Record the known shared Back-focus debt, rather than pretending that
      // returning to the URL proves keyboard focus was restored.
      states.push({ i, back: await page.evaluate(() => ({
        url: location.href, scrollY, activeTag: document.activeElement?.tagName,
        activeHTML: document.activeElement?.outerHTML.slice(0, 300),
      })) });
      save();
    }
    expect(errors).toEqual([]);
  });
}
