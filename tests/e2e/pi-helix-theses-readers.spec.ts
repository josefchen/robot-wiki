import { test as base, expect } from '@playwright/test';
import { test as evidenceTest } from './helpers/state-smoothing-fixture';
import { writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

const test = process.env.ROBOT_WIKI_GATE_INPUTS ? evidenceTest : base;
const route = '/frontier/competing-theses/';

test('PI and Helix qualifications survive interactive selection and reset', async ({ page }, testInfo) => {
  await page.goto(route);
  const prose = page.locator('div.prose[data-pagefind-body]');
  await expect(prose).toContainText('optional subgoal-image prompts from a separate');
  await expect(prose).toContainText('S1 converts perception into full-body joint targets at 200 Hz');
  await expect(prose).toContainText('S0 executes at 1 kHz');
  await expect(prose).toContainText('Figure reports that Helix 02 completed');
  await expect(prose).toContainText('dishwasher unloading-and-reloading');
  await expect(prose).toContainText('successful episodes per hour, not inference speed');
  const explorer = page.getByTestId('thesis-explorer');
  const detail = page.getByTestId('thesis-detail');
  for (const [name, qualification] of [
    ['World-model-based training', 'the images condition the action policy'],
    ['Hierarchical planner over skills', 'Figure reports a continuous four-minute Helix 02 dishwasher unloading-and-reloading'],
    ['RL fine-tuning on imitation', 'successful episodes per hour, not inference speed'],
  ]) {
    const button = explorer.getByRole('button', { name, exact: true });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(detail).toContainText(qualification);
    for (const label of ['Evidence for', 'Evidence against', 'Falsification criterion']) {
      await expect(detail.getByText(label, { exact: true })).toBeVisible();
    }
  }
  for (const url of ['https://www.pi.website/download/pi07.pdf', 'https://www.pi.website/blog/pi07']) {
    await expect(detail.locator(`a[href="${url}"]`).first()).toBeVisible();
  }
  await explorer.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('pi-helix-selected.png') });
  await explorer.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('thesis-readout')).toHaveText('6 theses, showing: End-to-end VLA scaling');
  const axe = await new AxeBuilder({ page }).include('[data-testid="thesis-explorer"]').analyze();
  writeFileSync(testInfo.outputPath('axe-pi-helix.json'), JSON.stringify(axe, null, 2));
  expect(axe.violations).toEqual([]);
});

test('PI and Figure citation chips retain URLs and keyboard dismissal', async ({ page }, testInfo) => {
  await page.goto(route);
  const prose = page.locator('div.prose[data-pagefind-body]');
  for (const url of [
    'https://www.pi.website/download/pi07.pdf',
    'https://www.pi.website/blog/pi07',
    'https://www.figure.ai/news/helix-02',
  ]) {
    const chip = prose.locator(`a[href="${url}"]`).first();
    await chip.scrollIntoViewIfNeeded();
    await chip.hover();
    await expect(page.getByRole('tooltip')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.mouse.move(0, 0);
    await chip.focus();
    await expect(page.getByRole('tooltip')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await expect(chip).toBeFocused();
    await expect(chip).toHaveAttribute('href', url);
  }
  await page.screenshot({ path: testInfo.outputPath('pi-helix-citation.png') });
});
