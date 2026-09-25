import { expect, test as base } from '@playwright/test';
import { test as evidenceTest } from './helpers/state-smoothing-fixture';
import { writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

// Match existing thesis readers: strict input-bound/offline mode only in the program lane.
const test = process.env.ROBOT_WIKI_GATE_INPUTS ? evidenceTest : base;

const route = '/frontier/competing-theses/';
const source = 'https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai';

test('economics article and explorer retain named claims, source caveats and reader interactions', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
  const prose = page.locator('div.prose[data-pagefind-body]');
  const flywheel = prose.locator('p').filter({ hasText: 'Bessemer’s investor outlook quotes Voxel51’s Brian Moore' }).last();
  const glow = prose.locator('p').filter({ hasText: 'Bessemer quotes the Zeromatter CEO' }).last();
  await expect(flywheel).toContainText('Foxglove’s Adrian Macneil');
  await expect(flywheel).toContainText('better model improvements');
  await expect(flywheel).toContainText('Bessemer lists both companies in its portfolio');
  await expect(glow).toContainText("you'll never get the scale or diversity you need from teleop alone.");
  await expect(glow).toContainText('internet data or simulators with reinforcement learning');
  await expect(glow).toContainText('sim-to-real manipulation remains an open research problem');
  await expect(prose).not.toContainText('Teleoperation is expensive and slow');
  await page.screenshot({ path: info.outputPath('article-top.png') });
  const observations: unknown[] = [];
  for (const [name, paragraph] of [['article-flywheel', flywheel], ['article-glow', glow]] as const) {
    await paragraph.scrollIntoViewIfNeeded();
    await paragraph.screenshot({ path: info.outputPath(`${name}.png`) });
    const chip = paragraph.locator(`a[href="${source}"]`).first();
    await chip.scrollIntoViewIfNeeded();
    await chip.hover();
    await expect(page.getByRole('tooltip')).toBeVisible();
    await expect(page.getByRole('tooltip')).toContainText('Bessemer Predicts');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.mouse.move(0, 0);
    await chip.focus();
    const tip = page.getByRole('tooltip');
    await expect(tip).toBeVisible();
    const box = await tip.boundingBox();
    observations.push({ name, viewport: page.viewportSize(), tooltip: box, sourceHref: await chip.getAttribute('href') });
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({ path: info.outputPath(`${name}-citation.png`) });
    await page.keyboard.press('Escape');
    await expect(tip).toHaveCount(0);
    await expect(chip).toBeFocused();
  }
  const explorer = page.getByTestId('thesis-explorer');
  const choice = explorer.getByRole('button', { name: 'Teleoperation as a bridge', exact: true });
  await choice.focus();
  await page.keyboard.press('Enter');
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  const detail = page.getByTestId('thesis-detail');
  for (const phrase of ['Voxel51’s Brian Moore', 'Foxglove’s Adrian Macneil', 'better model improvements',
    'Both are disclosed portfolio companies', 'Ian Glow, CEO of Zeromatter',
    'scale or diversity you need from teleop alone', 'not a measured teleop cost or speed law']) {
    await expect(detail).toContainText(phrase);
  }
  await expect(detail.locator(`a[href="${source}"]`)).toHaveCount(2);
  await detail.screenshot({ path: info.outputPath('explorer-both-economics-endpoints.png') });
  const detailChip = detail.locator(`a[href="${source}"]`).last();
  await detailChip.scrollIntoViewIfNeeded();
  await detailChip.focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(detailChip).toBeFocused();
  const axe = await new AxeBuilder({ page }).include('[data-testid="thesis-explorer"]').analyze();
  writeFileSync(info.outputPath('axe-economics.json'), JSON.stringify(axe, null, 2));
  expect(axe.violations).toEqual([]);
  await explorer.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('thesis-readout')).toHaveText('6 theses, showing: End-to-end VLA scaling');
  const reference = page.locator('#ref-bessemer-robotics-2026').locator(`a[href="${source}"]`);
  await expect(reference).toHaveCount(1);
  await reference.scrollIntoViewIfNeeded();
  await reference.focus();
  await expect(reference).toBeFocused();
  await page.screenshot({ path: info.outputPath('bessemer-reference.png') });
  const term = prose.locator('a[href="/glossary/#teleoperation"]').first();
  await term.scrollIntoViewIfNeeded();
  await term.focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await term.click();
  await expect(page).toHaveURL(/\/glossary\/#teleoperation$/);
  await expect(page.locator('#teleoperation')).toBeVisible();
  await page.screenshot({ path: info.outputPath('teleoperation-glossary.png') });
  await page.goBack();
  await expect(page).toHaveURL(/\/frontier\/competing-theses\/$/);
  observations.push({ backActiveElement: await page.evaluate(() => document.activeElement?.tagName),
    overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    errors, axeIncompletes: axe.incomplete.map(x => x.id) });
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  writeFileSync(info.outputPath('economics-reader-observations.json'), JSON.stringify(observations, null, 2));
});
