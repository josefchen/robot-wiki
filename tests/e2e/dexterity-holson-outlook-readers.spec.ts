import { writeFileSync } from 'node:fs';
import type { Locator } from '@playwright/test';
import { CITATIONS } from '../../data/citations';
import { test, expect, readerBaseURL } from './dexterity-reader-fixture';

test('Holson/outlook/keyring readers: corrected spans, Cite metadata and References at both widths', async ({ page }, info) => {
  test.skip(!readerBaseURL, 'Requires the current owned offline dexterity reader and qualified inputs.');
  await page.goto('/frontier/dexterity/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1, name: 'Dexterity' })).toBeVisible();
  const prose = page.locator('div.prose[data-pagefind-body]');

  const holson = prose.locator('p').filter({
    hasText: 'In his September 8, 2025 post, Benjie Holson described limitations',
  });
  await expect(holson).toHaveCount(1);
  const holsonText = await holson.innerText();
  expect(holsonText).toContain('explicitly calling them a general trend with exceptions');
  expect(holsonText).toContain('lack of good standard ways to relay wrist-force information to the human teleoperator');
  expect(holsonText).toContain('controlling fingers beyond open and close');
  expect(holsonText).toContain('making human-like touch sensing available to the puppeteer');
  expect(holsonText).toContain('was a guess from videos');
  expect(holsonText).toContain('likely more a teleoperation limitation than a model limitation');
  expect(holsonText).toContain('sub-centimeter tasks');
  expect(holsonText).not.toContain('Each limitation is a tactile limitation');
  expect(holsonText).not.toContain('anesthesia');

  const outlook = prose.locator('p').filter({
    hasText: 'Luo and colleagues define tactile robotics',
  });
  await expect(outlook).toHaveCount(1);
  const outlookText = await outlook.innerText();
  expect(outlookText).toContain('developing and integrating tactile-sensing technologies into robotic systems');
  expect(outlookText).toContain('sensor materials, networks, simulation, benchmarking, data interpretation, multimodal learning, and active touch');
  expect(outlookText).not.toContain('stick flips to slip');

  const keyring = prose.locator('p').filter({
    hasText: "gold-medal \"Use a key\" event of Holson's Humanoid Olympics",
  });
  await expect(keyring).toHaveCount(1);
  const keyringText = await keyring.innerText();
  expect(keyringText).toContain('at least two keys and a keychain');
  expect(keyringText).toContain("dropped into the robot's waiting palm or gripper");
  expect(keyringText).toContain('Without putting the keys down');
  expect(keyringText).toContain('align, insert, and turn the correct key');
  expect(keyringText).toContain('challenge rules, not a report that a robot completed the task');
  expect(keyringText).not.toContain('handed a keyring');

  const statusSpan = prose.locator('p').filter({
    hasText: 'Each is a task or a task family with its own training run.',
  });
  await expect(statusSpan).toHaveCount(1);
  expect(await statusSpan.innerText()).not.toContain('sat unclaimed');

  // Full corrected spans visible in-viewport slices at this width, captured.
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
  await capture('holson-pipeline', holson);
  await capture('outlook-framing', outlook);
  await capture('keyring-rules', keyring);

  // Both retained citations render with registry-true metadata on the corrected spans,
  // and their full References entries carry the registered identities.
  const sources: object[] = [];
  for (const id of ['holson-olympics-2025', 'tactile-outlook-2025']) {
    const citation = CITATIONS.find(c => c.id === id)!;
    const host = id === 'holson-olympics-2025' ? holson : outlook;
    const chipRoot = host.locator(`[data-cite-id="${id}"]`);
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
    await page.screenshot({ path: info.outputPath(`${id}-citation-metadata.png`), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.mouse.move(1, 1);
    await expect(tooltip).toHaveCount(0);
    await chipRoot.first().locator('a[href="#ref-' + id + '"]').click();
    await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
    const reference = page.locator(`#ref-${id}`);
    await expect(reference).toBeInViewport();
    await expect(reference).toContainText(citation.title);
    await expect(reference).toContainText(String(citation.year));
    await expect(reference).toContainText(citation.url);
    const surname = id === 'holson-olympics-2025' ? 'Holson' : 'Luo';
    await expect(reference).toContainText(surname);
    await capture(`${id}-full-reference`, reference);
    sources.push({ id, url: citation.url, title: citation.title, authors: citation.authors,
      year: citation.year, metadata, referenceText: await reference.innerText(), popupBox: box });
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  writeFileSync(info.outputPath('holson-outlook-keyring-frames.json'), JSON.stringify({
    at: new Date().toISOString(), viewport: page.viewportSize(), frames, sources,
    fonts: await page.evaluate(() => [...document.fonts].map(f => ({ family: f.family, status: f.status }))),
    newSourceRetrievals: 0,
    limitations: 'Mounted development reader. The three corrected spans, both citation metadata views and full reference entries are exercised at this width; adjacent paragraph claims, original8, full article/P1, shared Back/Term behavior and independent acceptance are not certified.',
  }, null, 2) + '\n');
});
