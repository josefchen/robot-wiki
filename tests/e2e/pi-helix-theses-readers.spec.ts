import { test as base, expect } from '@playwright/test';
import { test as evidenceTest } from './helpers/state-smoothing-fixture';
import { writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { openAdjustMore } from './helpers/figure-fold';
import { citeNoteInMargin, citeParts, closeCiteNote, revealCiteNote } from './helpers/citation-note';
import { waitForHydration } from './interaction-ready';

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
  await expect(prose).toContainText('successful episodes per hour; inference speed is a separate measure');
  const explorer = page.getByTestId('thesis-explorer');
  const detail = page.getByTestId('thesis-detail');
  for (const [name, qualification] of [
    ['Let the robot imagine first', 'the images condition the action policy'],
    ['A planner directs simple skills', 'Figure reports a continuous four-minute Helix 02 dishwasher unloading-and-reloading'],
    ['Copy first, then practise', 'successful episodes per hour, not inference speed'],
  ]) {
    const button = explorer.getByRole('button', { name, exact: true });
    // Enter on the server-rendered button before React attaches its click
    // handler is a no-op, which left aria-pressed false on a loaded server.
    await waitForHydration(button);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(detail).toContainText(qualification);
    for (const label of ['Evidence for', 'Evidence against', 'We’d know it’s wrong if']) {
      await expect(detail.getByText(label, { exact: true })).toBeVisible();
    }
  }
  // Inside a figure a citation is a number whose note opens inline, and the
  // note's author-year link is the source link the chip used to show.
  for (const [id, url] of [
    ['pi07-2026', 'https://www.pi.website/download/pi07.pdf'],
    ['pi07-blog-2026', 'https://www.pi.website/blog/pi07'],
  ] as const) {
    const cite = detail.locator(`[data-cite-id="${id}"]`).first();
    await revealCiteNote(cite, 'keyboard');
    await expect(citeParts(cite).source).toBeVisible();
    await expect(citeParts(cite).source).toHaveAttribute('href', url);
  }
  await explorer.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('pi-helix-selected.png') });
  await openAdjustMore(explorer);
  await explorer.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('thesis-readout')).toHaveText('6 bets. Tap one to read the evidence for and against.');
  const axe = await new AxeBuilder({ page }).include('[data-testid="thesis-explorer"]').analyze();
  writeFileSync(testInfo.outputPath('axe-pi-helix.json'), JSON.stringify(axe, null, 2));
  expect(axe.violations).toEqual([]);
});

test('PI and Figure citation chips retain URLs and keyboard dismissal', async ({ page }, testInfo) => {
  await page.goto(route);
  const prose = page.locator('div.prose[data-pagefind-body]');
  // Owner-approved successor (Josef, 2026-10-10, the research-page
  // standard): the tooltip chip became a numbered sidenote. From 1200 px the
  // note stands in the margin at rest. Where there is no margin the number
  // opens the note inline and closes it again, so the pointer and keyboard
  // dismissal the tooltip had is checked at 375 px.
  const sources = [
    ['pi07-2026', 'https://www.pi.website/download/pi07.pdf'],
    ['pi07-blog-2026', 'https://www.pi.website/blog/pi07'],
    ['helix-02-2026', 'https://www.figure.ai/news/helix-02'],
  ] as const;
  for (const [id, url] of sources) {
    const cite = prose.locator(`[data-cite-id="${id}"]`).first();
    await expect(citeParts(cite).note).toBeVisible();
    expect(await citeNoteInMargin(cite), `${id} note in the margin`).toBe(true);
    await expect(citeParts(cite).source).toHaveAttribute('href', url);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  for (const [id, url] of sources) {
    const cite = prose.locator(`[data-cite-id="${id}"]`).first();
    const { mark, note, source } = citeParts(cite);
    await mark.scrollIntoViewIfNeeded();
    await expect(note).toBeHidden();
    await revealCiteNote(cite, 'pointer');
    await expect(note).toHaveAttribute('data-open', 'true');
    await closeCiteNote(cite);
    await expect(note).toBeHidden();
    await page.mouse.move(0, 0);
    await revealCiteNote(cite, 'keyboard');
    await expect(mark).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(note).toBeHidden();
    await expect(mark).toBeFocused();
    await expect(source).toHaveAttribute('href', url);
  }
  await page.screenshot({ path: testInfo.outputPath('pi-helix-citation.png') });
});
