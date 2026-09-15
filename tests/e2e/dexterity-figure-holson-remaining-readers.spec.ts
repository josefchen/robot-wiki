import { writeFileSync } from 'node:fs';
import type { Locator } from '@playwright/test';
import { CITATIONS } from '../../data/citations';
import { test, expect, readerBaseURL } from './dexterity-reader-fixture';

const goBig = CITATIONS.find(c => c.id === 'figure-go-big-2025')!;
const figure02 = CITATIONS.find(c => c.id === 'figure-02-2024')!;
const helix02 = CITATIONS.find(c => c.id === 'helix-02-2026')!;

test('Figure/Holson remaining readers: corrected Go-Big, Figure 02 DoF and Helix 02 task spans at both widths', async ({ page }, info) => {
  test.skip(!readerBaseURL, 'Requires the current owned offline dexterity reader and qualified inputs.');
  await page.goto('/frontier/dexterity/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1, name: 'Dexterity' })).toBeVisible();
  const prose = page.locator('div.prose[data-pagefind-body]');

  // D8/D10 paragraph: exact original10-shared replacement still renders once.
  const holson = prose.locator('p').filter({
    hasText: 'In his September 8, 2025 post, Benjie Holson described limitations',
  });
  await expect(holson).toHaveCount(1);
  const holsonText = await holson.innerText();
  expect(holsonText).toContain('explicitly calling them a general trend with exceptions');
  expect(holsonText).toContain('was a guess from videos');
  expect(holsonText).toContain('pointed to a video he described as showing sub-centimeter tasks');

  // D12: coupled lead cut, navigation-scoped Go-Big sentence.
  const betAgainst = prose.locator('p').filter({
    hasText: 'Brooks frames the scaling counterargument as an imagined inner dialogue',
  });
  await expect(betAgainst).toHaveCount(1);
  const betText = await betAgainst.innerText();
  expect(betText).not.toContain('running that experiment at full scale');
  expect(betText).toContain("Figure's September 2025 Project Go-Big announcement describes a pretraining data-collection initiative rather than a general-dexterity result");
  expect(betText).toContain('mapping images and language to low-level SE(2) velocity commands');
  expect(betText).toContain('a transfer Figure calls zero-shot and, "to our knowledge", a first');
  expect(betText).toContain("describe Brookfield's portfolio, not homes or trajectories collected");
  expect(betText).not.toContain('no robot demonstrations at all');

  // D23: quoted release wording with disclosed ambiguity.
  const spreadPara = prose.locator('p').filter({ hasText: 'The spread is the story' });
  await expect(spreadPara).toHaveCount(1);
  const spreadText = await spreadPara.innerText();
  expect(spreadText).toContain('its August 6, 2024 release for Figure 02');
  expect(spreadText).toContain('"4th generation hands"');
  expect(spreadText).toContain('"equipped with 16 degrees of freedom"');
  expect(spreadText).toContain('without saying whether that count is per hand or combined, or giving an actuator count');
  expect(spreadText).not.toContain('16 degrees of freedom on the Figure 02 hand');

  // D25: Figure-characterized four tasks with titled syringe task.
  const inHand = prose.locator('p').filter({ hasText: 'Figure says Helix 02, using Figure 03' });
  await expect(inHand).toHaveCount(1);
  const inHandText = await inHand.innerText();
  expect(inHandText).toContain('manipulation previously out of reach for its stack, in videos it calls fully autonomous rather than teleoperated');
  expect(inHandText).toContain('a task titled "Push exactly 5 ml from a syringe"');
  expect(inHandText).toContain('The announcement publishes no task-level success rates, volume calibration, or sensor-ablation results');
  expect(inHandText).not.toContain('dispensing exactly 5 ml from a syringe');
  // Per-task-training sentence stays untouched out-of-scope debt.
  expect(inHandText).toContain('Each is a task or a task family with its own training run.');

  // References render the three citations with their registered URLs.
  const refText = await page.locator('main').innerText();
  expect(refText).toContain('Project Go-Big: Internet-Scale Humanoid Pretraining and Direct Human-to-Robot Transfer');
  expect(refText).toContain('Figure unveils Figure 02, its second-generation humanoid');
  expect(refText).toContain('Introducing Helix 02: Full-Body Autonomy');
  for (const c of [goBig, figure02, helix02]) {
    await expect(page.locator('main').locator(`a[href="${c.url}"]`).first()).toBeVisible();
  }

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
  await capture('gobig-paragraph', betAgainst);
  await capture('figure02-paragraph', spreadPara);
  await capture('helix02-paragraph', inHand);
  writeFileSync(`${info.outputPath('frames')}.json`, JSON.stringify(frames, null, 1));
});
