import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { CITATIONS } from '../../data/citations';
import { citeNoteInMargin, citeParts, clickCiteMark, closeCiteNote } from './helpers/citation-note';

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
  // The data-hardware length cut of 2026-10-13 split this passage into a
  // fleet paragraph and a Vulcan paragraph, and cut the Sequoia speed claims,
  // both posts' dates and Vulcan's sites and rollout plan. Each retired
  // phrase is replaced by a fact the same paragraph still reports, and each
  // move and retirement is recorded with its reason in
  // audit/evidence/length-cut-20261013-data-hardware/source-transition.json.
  const fleet = prose.locator('p').filter({ hasText: 'In October 2023 Amazon reported over 750,000 robots' });
  const vulcan = prose.locator('p').filter({ hasText: "Amazon's Vulcan picks and stows" });
  await expect(fleet).toHaveCount(1);
  await expect(vulcan).toHaveCount(1);
  for (const text of ['over 750,000 robots working collaboratively', 'one Houston fulfillment center',
    'testing Digit for tote recycling was planned', 'updated in June 2026',
    'more than one million robots deployed since 2012', 'next-generation Proteus still a lab pilot',
    'more than 300 facilities', '75 percent of the customer orders it delivers',
    'not a simultaneous active-fleet count']) {
    await expect(fleet).toContainText(text, { useInnerText: true });
  }
  for (const text of ['at speeds comparable to front-line employees', 'approximately 75 percent of the types of items',
    'over 100,000 attempts in a fulfillment center', 'hands items it cannot move to employees', '85.86 percent succeeded',
    'the post reports no pick-success rate or independently validated reliability']) {
    await expect(vulcan).toContainText(text, { useInnerText: true });
  }
  await expect(fleet).not.toContainText('process orders up to 25 percent faster');
  const captures = [];
  for (const [name, paragraph] of [['amazon', fleet], ['vulcan', vulcan]] as const) {
    const height = (await paragraph.boundingBox())!.height;
    for (let offset = 0; offset < height; offset += info.project.use.viewport!.height - 150) {
      await paragraph.evaluate((e, y) => scrollBy(0, e.getBoundingClientRect().top - 80 + y), offset);
      const path = info.outputPath(`${name}-${offset}.png`);
      await page.screenshot({ path });
      captures.push({ path, sha256: sha(readFileSync(path)), offset, at: new Date().toISOString() });
    }
  }
  writeFileSync(info.outputPath('science.json'), JSON.stringify({ captures, text: await fleet.innerText(), vulcan: await vulcan.innerText(), viewport: info.project.use.viewport, inputs: process.env.ROBOT_WIKI_GATE_INPUTS }, null, 2));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

// The length cut left the 2023 announcement one citation: the Sequoia speed
// claims it also supported were cut.
for (const [id, count] of [
  ['amazon-sequoia-digit-2023', 1],
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
    // Owner-approved successor (Josef, 2026-10-10, the research-page standard):
    // the chip's hover and focus tooltip became the citation's numbered
    // sidenote. From 1200 px the note stands in the margin at rest and the
    // number jumps to the References entry; narrower, the number opens the
    // note inline, by pointer (the hover state) or by Enter (the focus
    // state). Title, byline, bounds, source link and focus ring are read off
    // the note and the number, the keyboard stop that replaced the chip link.
    const wide = info.project.use.viewport!.width >= 1200;
    for (let i = 0; i < count; i++) {
      const chip = chips.nth(i);
      const { mark, note, source: link } = citeParts(chip);
      await expect(link).toHaveAttribute('href', citation.url);
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(await citeNoteInMargin(chip)).toBe(wide);
      // Reaching the number by keyboard is what shows the keyboard-only ring.
      const tabToMark = async () => {
        await mark.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
        await expect(mark).toBeFocused();
      };
      for (const placement of ['reading', 'lower-edge']) {
        await chip.evaluate((e, p) => scrollBy(0, e.getBoundingClientRect().top -
          (p === 'reading' ? innerHeight / 2 : innerHeight - 100)), placement);
        for (const mode of ['hover', 'focus']) {
          await mark.evaluate(e => e.blur());
          if (mode === 'hover') {
            // Aimed at the number's own box, as clickCiteMark aims its click.
            const target = (await mark.boundingBox())!;
            await mark.hover({ position: { x: target.width / 2, y: target.height / 2 } });
            if (!wide) await clickCiteMark(mark);
          } else {
            await page.mouse.move(0, 0); await tabToMark();
            if (!wide) await page.keyboard.press('Enter');
          }
          await expect(note).toBeVisible();
          await expect(note).toContainText(citation.title);
          await expect(note).toContainText(citation.authors.join(', '));
          const box = (await note.boundingBox())!;
          const focus = await mark.evaluate(e => {
            const s = getComputedStyle(e);
            return { visible: e.matches(':focus-visible'), style: s.outlineStyle, width: s.outlineWidth,
              offset: s.outlineOffset, color: s.outlineColor };
          });
          const path = info.outputPath(`${i}-${placement}-${mode}.png`);
          await page.screenshot({ path });
          states.push({ i, placement, mode, box, focus, inMargin: wide, path, sha256: sha(readFileSync(path)), at: new Date().toISOString() });
          save();
          expect.soft(box.x, `${i} ${placement} ${mode} left`).toBeGreaterThanOrEqual(0);
          expect.soft(box.x + box.width, `${i} ${placement} ${mode} right`).toBeLessThanOrEqual(info.project.use.viewport!.width);
          expect.soft(box.y, `${i} ${placement} ${mode} top`).toBeGreaterThanOrEqual(0);
          expect.soft(box.y + box.height, `${i} ${placement} ${mode} bottom`).toBeLessThanOrEqual(info.project.use.viewport!.height);
          if (mode === 'focus') {
            // The locked ring: a 1 px ink outline offset 2 px, keyboard only,
            // in place of the 2 px brand-v2 ring.
            expect(focus.visible).toBe(true);
            expect(focus.style).not.toBe('none');
            expect(parseFloat(focus.width)).toBe(1);
            expect(parseFloat(focus.offset)).toBe(2);
            expect(focus.color).toBe('rgb(28, 28, 26)');
          }
          await closeCiteNote(chip);
        }
      }
      // The number is the chip's hit target now: nothing may cover it.
      expect(await mark.evaluate(e => {
        const r = e.getBoundingClientRect();
        return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      })).toBe(true);
      // Below 1200 px the number opens the note instead of jumping, so the
      // jump to the References entry is taken at the desktop width there.
      const viewport = page.viewportSize()!;
      if (!wide) await page.setViewportSize({ width: 1280, height: viewport.height });
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
      if (!wide) await page.setViewportSize(viewport);
    }
    expect(errors).toEqual([]);
  });
}
