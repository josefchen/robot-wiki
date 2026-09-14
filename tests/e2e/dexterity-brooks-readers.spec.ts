import { writeFileSync } from 'node:fs';
import type { Locator } from '@playwright/test';
import { test, expect, readerBaseURL } from './dexterity-reader-fixture';

test('Brooks readers: complete corrected prose, Stat, citation and References', async ({ page }, info) => {
  test.skip(!readerBaseURL, 'Requires the current owned offline dexterity reader and qualified inputs.');
  await page.goto('/frontier/dexterity/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1, name: 'Dexterity' })).toBeVisible();
  const prose = page.locator('div.prose[data-pagefind-body]');
  const rendered = await prose.innerText();
  for (const old of ['Her vision is intact', 'Nothing about her plan changed', 'The strongest counterargument',
    'states it fairly', "Brooks's conclusion is blunt", 'If touch-driven pipelines get there first']) {
    expect(rendered).not.toContain(old);
  }
  const frames: object[] = [];
  async function capture(name: string, target: Locator) {
    await expect(target).toHaveCount(1);
    const text = await target.innerText();
    const rect = await target.evaluate(element => {
      const r = element.getBoundingClientRect();
      return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, height: r.height };
    });
    const viewport = page.viewportSize()!;
    const span = viewport.height - 240;
    const steps = Math.max(1, Math.ceil(rect.height / span));
    for (let n = 0; n < steps; n++) {
      const desired = Math.max(0, rect.top - 140 + n * span);
      const current = await page.evaluate(() => window.scrollY);
      await page.mouse.move(viewport.width - 15, viewport.height / 2);
      await page.mouse.wheel(0, desired - current);
      await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - desired)).toBeLessThan(3);
      await page.screenshot({ path: info.outputPath(`${name}-${n + 1}.png`), animations: 'disabled' });
      frames.push({ name, part: n + 1, parts: steps, text, rect, viewport, scrollY: await page.evaluate(() => window.scrollY) });
    }
  }
  const paragraphs = prose.locator('p');
  await capture('reported-demo', paragraphs.filter({ hasText: "These are the essay's descriptions of the demonstration" }));
  await capture('residual-sensation', paragraphs.filter({ hasText: 'He says she could still sense other things' }));
  await capture('reported-stat', page.getByText('his reported first-video time; second described as four times as long', { exact: true }).locator('..'));
  await capture('imagined-dialogue', paragraphs.filter({ hasText: 'an imagined inner dialogue' }));
  await capture('qualified-conclusion', paragraphs.filter({ hasText: 'his assessment at the time of the essay' }));
  await capture('victory-inference-removed', paragraphs.filter({ hasText: 'The hands are shipping either way; watch the training pipelines.' }));
  const source = 'https://rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity/';
  const chip = prose.getByRole('link', { name: 'Brooks 2025' }).first();
  await expect(chip).toHaveAttribute('href', source);
  await chip.scrollIntoViewIfNeeded();
  await chip.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.screenshot({ path: info.outputPath('brooks-citation-popover.png'), animations: 'disabled' });
  await page.mouse.move(1, 1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'References', exact: true })).toBeVisible();
  const reference = page.locator(`a[href="${source}"]`).last();
  await capture('brooks-reference', reference.locator('..'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  writeFileSync(info.outputPath('reader-frames.json'), JSON.stringify({
    at: new Date().toISOString(), frames, rendered, source, newSourceRetrievals: 0,
    limitations: 'Mounted development reader only; UI preservation is not source certification of held or neighboring claims.',
  }, null, 2) + '\n');
});


test('Brooks readers: concluding cut endpoint closeout', async ({ page }, info) => {
  test.skip(!readerBaseURL, 'Requires the current owned offline dexterity reader and qualified inputs.');
  await page.goto('/frontier/dexterity/');
  await page.evaluate(() => document.fonts.ready);
  const target = page.locator('div.prose[data-pagefind-body] p').filter({
    hasText: 'The hands are shipping either way; watch the training pipelines.',
  });
  await expect(target).toHaveCount(1);
  const text = await target.innerText();
  expect(text).toMatch(/^Dexterity is solved when/);
  expect(text).not.toContain('If touch-driven pipelines get there first');
  expect(text).toContain('The open question is which data closes the gap.');
  const rect = await target.evaluate(element => {
    const r = element.getBoundingClientRect();
    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, height: r.height };
  });
  const viewport = page.viewportSize()!;
  const span = viewport.height - 240;
  const steps = Math.max(1, Math.ceil(rect.height / span));
  const frames: object[] = [];
  for (let n = 0; n < steps; n++) {
    const desired = Math.max(0, rect.top - 140 + n * span);
    const current = await page.evaluate(() => window.scrollY);
    await page.mouse.move(viewport.width - 15, viewport.height / 2);
    await page.mouse.wheel(0, desired - current);
    await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - desired)).toBeLessThan(3);
    await page.screenshot({ path: info.outputPath(`concluding-cut-${n + 1}.png`), animations: 'disabled' });
    frames.push({ part: n + 1, parts: steps, rect, viewport, scrollY: await page.evaluate(() => window.scrollY) });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  writeFileSync(info.outputPath('concluding-cut-frames.json'), JSON.stringify({
    at: new Date().toISOString(), text, frames,
    endpoint: 'unsupported-victory-inference',
    reason: 'Primary reader mistakenly captured an earlier paragraph for this endpoint; no primary pixels are relabeled as proof.',
    limitations: 'Only the assigned cut is certified here; adjacent concluding claims and full article acceptance remain unadjudicated.',
  }, null, 2) + '\n');
});
