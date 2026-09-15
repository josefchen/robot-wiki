import { writeFileSync } from 'node:fs';
import type { Locator } from '@playwright/test';
import { CITATIONS } from '../../data/citations';
import { test, expect, readerBaseURL } from './dexterity-reader-fixture';

test('Brooks remaining readers: corrected Ernst and eWeek spans, Cite metadata and References at both widths', async ({ page }, info) => {
  test.skip(!readerBaseURL, 'Requires the current owned offline dexterity reader and qualified inputs.');
  await page.goto('/frontier/dexterity/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1, name: 'Dexterity' })).toBeVisible();
  const prose = page.locator('div.prose[data-pagefind-body]');

  const ernst = prose.locator('p').filter({
    hasText: "Rodney Brooks opens his dexterity essay with Heinrich Ernst's PhD work",
  });
  await expect(ernst).toHaveCount(1);
  const ernstText = await ernst.innerText();
  expect(ernstText).toContain("by 1961, he writes, Ernst had connected a computer-controlled arm and hand to MIT's TX-0");
  expect(ernstText).toContain('picking up and stacking blocks');
  expect(ernstText).toContain('The reason is contact');
  expect(ernstText).not.toContain('as old as artificial intelligence itself');
  expect(ernstText).not.toContain('hard for every researcher since');

  const eweek = prose.locator('p').filter({
    hasText: 'Brooks reproduces an eWeek report',
  });
  await expect(eweek).toHaveCount(1);
  const eweekText = await eweek.innerText();
  expect(eweekText).toContain('moving Optimus training toward a "vision-only approach" instead of motion capture suits and teleoperation');
  expect(eweekText).toContain('helmet-and-backpack rigs with five in-house cameras');
  expect(eweekText).toContain('folding a t-shirt or picking up an object');
  expect(eweekText).toContain('train Optimus to mimic those actions');
  expect(eweekText).toContain("This is the report as reproduced in Brooks's essay, not a verified account of Tesla's complete training pipeline or evidence of tested dexterity.");
  expect(eweekText).not.toContain('Tesla has shifted Optimus training to a vision-only approach');
  // Neighboring out-of-scope claims are untouched.
  expect(eweekText).toContain('Two of the best-funded humanoid programs are running that experiment at full scale');
  expect(eweekText).toContain("Figure's Project Go-Big trains its Helix model");

  // Original7 has no article endpoint: the forecast never appears.
  const bodyText = await prose.innerText();
  expect(bodyText).not.toContain('within decades');
  expect(bodyText).not.toContain('pure fantasy thinking');

  const frames: object[] = [];
  const capture = async (name: string, target: Locator) => {
    await expect(target).toHaveCount(1);
    await page.mouse.move(1, 1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    const text = await target.innerText();
    const rect = await target.evaluate(element => {
      const r = element.getBoundingClientRect();
      return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, height: r.height };
    });
    const viewport = page.viewportSize()!;
    const span = viewport.height - 240;
    const steps = Math.max(1, Math.ceil(rect.height / span));
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    for (let n = 0; n < steps; n++) {
      const desired = Math.min(maxScroll, Math.max(0, rect.top - 140 + n * span));
      const current = await page.evaluate(() => window.scrollY);
      await page.mouse.move(viewport.width - 15, viewport.height / 2);
      await page.mouse.wheel(0, desired - current);
      await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - desired)).toBeLessThan(3);
      await page.screenshot({ path: info.outputPath(`${name}-${n + 1}.png`), animations: 'disabled' });
      frames.push({ name, part: n + 1, parts: steps, text, rect, viewport, scrollY: await page.evaluate(() => window.scrollY) });
    }
  };
  await capture('brooks-ernst', ernst);
  await capture('brooks-eweek', eweek);

  const citation = CITATIONS.find(c => c.id === 'brooks-dexterity-2025')!;
  const sources: object[] = [];
  for (const host of [ernst, eweek]) {
    const chipRoot = host.locator(`[data-cite-id="brooks-dexterity-2025"]`);
    await expect(chipRoot.first()).toHaveCount(1);
    const sourceLink = chipRoot.first().locator(`a[href="${citation.url}"]`);
    await expect(sourceLink).toHaveAttribute('target', '_blank');
    await expect(sourceLink).toHaveAttribute('rel', /noopener/);
    await sourceLink.scrollIntoViewIfNeeded();
    await sourceLink.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(citation.title);
    await expect(tooltip).toContainText(String(citation.year));
    const box = await tooltip.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const metadata = await tooltip.innerText();
    await page.screenshot({ path: info.outputPath(`brooks-dexterity-2025-citation-metadata-${host === ernst ? 'ernst' : 'eweek'}.png`), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.mouse.move(1, 1);
    await expect(tooltip).toHaveCount(0);
    await chipRoot.first().locator('a[href="#ref-brooks-dexterity-2025"]').click();
    await expect(page).toHaveURL(/#ref-brooks-dexterity-2025$/);
    const reference = page.locator('#ref-brooks-dexterity-2025');
    await expect(reference).toBeInViewport();
    await expect(reference).toContainText(citation.title);
    await expect(reference).toContainText('Brooks');
    await expect(reference).toContainText(String(citation.year));
    await expect(reference).toContainText(citation.url);
    sources.push({ span: host === ernst ? 'ernst' : 'eweek', id: citation.id, url: citation.url,
      title: citation.title, authors: citation.authors, year: citation.year,
      metadata, referenceText: await reference.innerText(), popupBox: box });
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  writeFileSync(info.outputPath('brooks-remaining-frames.json'), JSON.stringify({
    at: new Date().toISOString(), viewport: page.viewportSize(), frames, sources,
    fonts: await page.evaluate(() => [...document.fonts].map(f => ({ family: f.family, status: f.status }))),
    newSourceRetrievals: 0,
    limitations: 'Mounted development reader. The two corrected spans, the shared citation metadata on both and the full reference entry are exercised at this width; original7 has no article endpoint, neighboring claims, full article/P1, shared Back/Term behavior and independent acceptance are not certified.',
  }, null, 2) + '\n');
});
