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
    else { await request.abort(); throw new Error(`External request refused: ${request.request().url()}`); }
  });
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

test('Engineering originals: corrected positions, citations and navigation', async ({ page }, info) => {
  const errors: string[] = [];
  const captures: object[] = [];
  const states: object[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const capture = async (name: string, state: object) => {
    const path = info.outputPath(`${name}.png`);
    await page.screenshot({ path });
    captures.push({ name, path, sha256: sha(readFileSync(path)), at: new Date().toISOString(), state });
    writeFileSync(info.outputPath('reader.json'), JSON.stringify({
      captures, states, errors, viewport: info.project.use.viewport, testFile: info.file,
      testFileSha256: sha(readFileSync(info.file)), inputs: process.env.ROBOT_WIKI_GATE_INPUTS,
      inputSha256: process.env.ROBOT_WIKI_GATE_INPUTS ? sha(readFileSync(process.env.ROBOT_WIKI_GATE_INPUTS)) : null,
    }, null, 2));
  };
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const prose = page.locator('div.prose[data-pagefind-body]');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const doc = await cdp.send('DOM.getDocument');
  const fonts = [];
  for (const [selector, family] of [
    ['h1', 'Tektur'], ['div.prose[data-pagefind-body] > p', 'Newsreader'],
    ['nav[aria-label="Breadcrumb"] a', 'IBM Plex Sans'],
    ['[data-cite-id="bessemer-robotics-2026"] a', 'IBM Plex Mono'],
  ]) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
    const used = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts.filter(f => f.glyphCount > 0);
    expect(used.some(f => f.familyName.includes(family))).toBe(true);
    expect(used.every(f => f.isCustomFont)).toBe(true);
    fonts.push({ selector, family, used });
  }
  await cdp.detach();
  await capture('identity', { fonts });
  for (const [id, lead, required] of [
    ['bessemer-robotics-2026', 'In its April 16, 2026 investor outlook, Bessemer predicts', [
      'domain-specific data collection', 'target-environment fine-tuning',
      'hardware integration and operational infrastructure', 'expensive data collection',
      'not yet general enough to work out of the box',
    ]],
    ['goldberg-data-gap-2025', 'Ken Goldberg proposes combining model-based engineering with model-free learning', [
      'perform useful work, collect real-world data', 'improve performance and learn adjacent skills',
      'not a claim that engineering removes the need for learning',
      'model-free AI eventually to enable fully general-purpose robots',
    ]],
  ] as const) {
    const paragraph = prose.locator('p').filter({ hasText: lead });
    await expect(paragraph).toHaveCount(1);
    for (const text of required) await expect(paragraph).toContainText(text, { useInnerText: true });
    await expect(paragraph).not.toContainText('across that 100,000-year gap', { useInnerText: true });
    const height = (await paragraph.boundingBox())!.height;
    for (let offset = 0; offset < height; offset += info.project.use.viewport!.height - 160) {
      await paragraph.evaluate((e, y) => scrollBy(0, e.getBoundingClientRect().top - 80 + y), offset);
      await capture(`${id}-prose-${offset}`, { offset, text: await paragraph.innerText() });
    }
    const citation = CITATIONS.find(c => c.id === id)!;
    const chip = paragraph.locator(`[data-cite-id="${id}"]`);
    await expect(chip).toHaveCount(1);
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
        // The unchanged renderer abbreviates after three authors; the
        // References entry below must still expose the complete byline.
        await expect(tip).toContainText(id === 'bessemer-robotics-2026'
          ? 'Jeremy Levine, Talia Goldberg, Janelle Teng Wade et al., 2026'
          : citation.authors.join(', '));
        const bounds = (await tip.boundingBox())!;
        const focus = await link.evaluate(e => {
          const s = getComputedStyle(e);
          return { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor };
        });
        const state = { id, placement, mode, bounds, focus };
        states.push(state);
        await capture(`${id}-${placement}-${mode}`, state);
        expect.soft(bounds.x).toBeGreaterThanOrEqual(0);
        expect.soft(bounds.x + bounds.width).toBeLessThanOrEqual(info.project.use.viewport!.width);
        expect.soft(bounds.y).toBeGreaterThanOrEqual(0);
        expect.soft(bounds.y + bounds.height).toBeLessThanOrEqual(info.project.use.viewport!.height);
        if (mode === 'focus') {
          expect(focus.style).not.toBe('none');
          expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2);
        }
      }
    }
    await page.keyboard.press('Tab');
    const jump = chip.locator(`a[href="#ref-${id}"]`);
    await expect(jump).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
    const reference = page.locator(`#ref-${id}`);
    await expect(reference).toBeInViewport();
    await expect(reference).toContainText(citation.authors.join(', '));
    await expect(reference.locator('[data-reference-source-link]')).toHaveAttribute('href', citation.url);
    await capture(`${id}-reference`, { text: await reference.innerText() });
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    states.push({ id, back: await page.evaluate(() => ({
      url: location.href, scrollY, activeTag: document.activeElement?.tagName,
    })), focusRestorationAcceptance: false });
  }
  if (info.project.use.viewport!.width === 375) {
    const open = page.getByRole('button', { name: /open navigation/i });
    await open.focus(); await page.keyboard.press('Enter');
    const close = page.getByRole('button', { name: /close navigation/i });
    await expect(close).toBeFocused();
    expect(await page.locator('[inert]').count()).toBeGreaterThan(0);
    const drawer = page.getByRole('dialog');
    await page.keyboard.press('Shift+Tab'); await expect(drawer.locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Tab'); await expect(close).toBeFocused();
    await expect(drawer.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(drawer.locator('[aria-current="page"]')).toHaveAttribute('href', /\/data-hardware\/industrial-deployment\/?$/);
    await capture('drawer', { currentPage: route });
    await page.keyboard.press('Escape'); await expect(open).toBeFocused();
    await expect(page.locator('[inert]')).toHaveCount(0);
  } else {
    await expect(page.locator('nav[aria-label="Robot Wiki taxonomy"] [aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Robot Wiki taxonomy"] [aria-current="page"]')).toHaveAttribute('href', /\/data-hardware\/industrial-deployment\/?$/);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await capture('final', { errors, assertionErrors: info.errors.map(e => e.message), backFocusDebt: 'Recorded, not accepted' });
});

// Competing Theses has three authored chips plus one in its default
// Scaling thesis panel (lib/competing-theses.ts), not only the MDX three.
for (const [slug, count] of [['bear-case', 3], ['competing-theses', 4], ['generalization', 1], ['reliability-gap', 4]] as const) {
  test(`Bessemer changed byline consumer: ${slug}`, async ({ page }, info) => {
    expect((await page.goto(`/frontier/${slug}/`))?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const citation = CITATIONS.find(c => c.id === 'bessemer-robotics-2026')!;
    const chips = page.locator('div.prose[data-pagefind-body] [data-cite-id="bessemer-robotics-2026"]');
    await expect(chips).toHaveCount(count);
    const states = [];
    for (let i = 0; i < count; i++) {
      const chip = chips.nth(i), link = chip.locator('a[target="_blank"]');
      await expect(link).toHaveText('Levine 2026');
      await expect(link).toHaveAttribute('href', citation.url);
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await chip.evaluate(e => scrollBy(0, e.getBoundingClientRect().top - innerHeight / 2));
      for (const mode of ['hover', 'focus']) {
        await link.evaluate(e => e.blur());
        if (mode === 'hover') await link.hover();
        else { await page.mouse.move(0, 0); await link.focus(); }
        const tip = chip.getByRole('tooltip');
        await expect(tip).toBeVisible();
        await expect(tip).toContainText('Jeremy Levine, Talia Goldberg, Janelle Teng Wade et al., 2026');
        const bounds = (await tip.boundingBox())!;
        const path = info.outputPath(`${i}-${mode}.png`);
        await page.screenshot({ path });
        // Observe peer geometry without laundering pre-existing route debt
        // into an article-local layout repair or a global visual pass.
        states.push({ i, mode, bounds, path, sha256: sha(readFileSync(path)),
          contained: bounds.x >= 0 && bounds.x + bounds.width <= info.project.use.viewport!.width &&
            bounds.y >= 0 && bounds.y + bounds.height <= info.project.use.viewport!.height });
      }
    }
    await expect(page.locator('#ref-bessemer-robotics-2026')).toContainText(citation.authors.join(', '));
    writeFileSync(info.outputPath('peer.json'), JSON.stringify({
      slug, count, states, viewport: info.project.use.viewport, inputs: process.env.ROBOT_WIKI_GATE_INPUTS,
      geometryAcceptance: 'Observation only; no peer prose/source or full visual acceptance.',
    }, null, 2));
  });
}
