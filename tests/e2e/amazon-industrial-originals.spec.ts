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

test('Amazon current quantities and source scopes', async ({ page }, info) => {
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const prose = page.locator('div.prose[data-pagefind-body]');
  const paragraph = prose.locator('p').filter({ hasText: 'In its October 18, 2023 Sequoia and Digit announcement' });
  await expect(paragraph).toHaveCount(1);
  for (const text of ['over 750,000 robots working collaboratively', 'one Houston fulfillment center',
    'testing Digit for tote recycling was planned', 'published October 9, 2024 and updated June 4, 2026',
    'more than one million robots deployed across its operations network since 2012', 'Proteus as a lab pilot awaiting deployment',
    'identify and store received inventory up to 75 percent faster than its then-current process',
    'reduce the time to process an order through a fulfillment center by up to 25 percent',
    'published May 7, 2025 and updated June 4, 2026', 'approximately 75 percent of the types of items',
    'Spokane and Hamburg', 'handoff to employees', 'further European and US deployment as planned',
    'not pick success or independently validated reliability', 'not a simultaneous active-fleet count']) {
    await expect(paragraph).toContainText(text, { useInnerText: true });
  }
  await expect(paragraph).not.toContainText('process orders up to 25 percent faster');
  const captures = [];
  const height = (await paragraph.boundingBox())!.height;
  for (let offset = 0; offset < height; offset += info.project.use.viewport!.height - 150) {
    await paragraph.evaluate((e, y) => scrollBy(0, e.getBoundingClientRect().top - 80 + y), offset);
    const path = info.outputPath(`amazon-${offset}.png`);
    await page.screenshot({ path });
    captures.push({ path, sha256: sha(readFileSync(path)), offset, at: new Date().toISOString() });
  }
  writeFileSync(info.outputPath('science.json'), JSON.stringify({ captures, text: await paragraph.innerText(), viewport: info.project.use.viewport, inputs: process.env.ROBOT_WIKI_GATE_INPUTS }, null, 2));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const [id, count] of [
  ['amazon-sequoia-digit-2023', 2],
  ['amazon-robot-fleet-2026', 1],
  ['amazon-vulcan-2026', 1],
] as const) {
  test(`Amazon retained ${id}: sources, hover/focus, References and Back`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    expect((await page.goto(route))?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const citation = CITATIONS.find(c => c.id === id)!;
    const parent = page.locator('div.prose[data-pagefind-body]');
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
