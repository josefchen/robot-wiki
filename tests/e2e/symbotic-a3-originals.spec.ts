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

test('Symbotic A3 current quantities and source scopes', async ({ page }, info) => {
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const prose = page.locator('div.prose[data-pagefind-body]');
  const financial = prose.locator('p').filter({ hasText: "Symbotic's FY2025 Form 10-K distinguishes" });
  const a3 = prose.locator('p').filter({ hasText: "In A3's North American order data" });
  const brownfield = prose.locator('p').filter({ hasText: 'non-collaborative robot applications during automatic operation' });
  for (const text of ['approximately $22.5 billion', 'September 27, 2025', '$2.246922 billion', 'not revenue already earned', 'May 2022', 'all 42', 'contractual scope, not a count of operating sites', '50 systems in deployment and 48 operational systems under software maintenance and support contracts', 'then expected approximately 12 percent', 'not an order-to-running duration', 'estimates can change']) await expect(financial).toContainText(text, { useInnerText: true });
  for (const text of ['North American order data for 2025', '7,212', '$241 million', '19.6 percent of the 36,766', '10.7 percent of the $2.25 billion', 'Q1 2025']) await expect(a3).toContainText(text, { useInnerText: true });
  for (const text of ['interlocked guards', 'enabling device', 'lockout/tagout', '29 CFR 1910.147 or 29 CFR 1910.333', 'Separately, Symbotic', 'company-reported capability, not a guarantee']) await expect(brownfield).toContainText(text, { useInnerText: true });
  await expect(brownfield).not.toContainText('schedule cannot stop');
  await expect(a3).not.toContainText('lower-volume shops');
  const captures = [];
  for (const [name, element] of [['a3', a3], ['financial', financial], ['brownfield', brownfield]] as const) {
    const height = (await element.boundingBox())!.height;
    for (let offset = 0; offset < height; offset += info.project.use.viewport!.height - 150) {
      await element.evaluate((e, y) => scrollBy(0, e.getBoundingClientRect().top - 80 + y), offset);
      const path = info.outputPath(`${name}-${offset}.png`);
      await page.screenshot({ path });
      captures.push({ path, sha256: sha(readFileSync(path)), offset, at: new Date().toISOString() });
    }
  }
  writeFileSync(info.outputPath('science.json'), JSON.stringify({ captures, financial: await financial.innerText(), a3: await a3.innerText(), brownfield: await brownfield.innerText(), viewport: info.project.use.viewport, inputs: process.env.ROBOT_WIKI_GATE_INPUTS }, null, 2));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const [id, count] of [
  ['symbotic-10k-2025', 3],
  ['a3-orders-2025', 1],
  ['osha-otm-robots', 1],
] as const) {
  test(`Symbotic A3 retained ${id}: sources, hover/focus, References and Back`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    expect((await page.goto(route))?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const citation = CITATIONS.find(c => c.id === id)!;
    const parent = id === 'osha-otm-robots'
      ? page.locator('div.prose p').filter({ hasText: 'non-collaborative robot applications during automatic operation' })
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
