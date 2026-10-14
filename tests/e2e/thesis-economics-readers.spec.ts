import { expect, test as base } from '@playwright/test';
import { test as evidenceTest } from './helpers/state-smoothing-fixture';
import { writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { openAdjustMore } from './helpers/figure-fold';
import { citeNoteInMargin, citeParts, closeCiteNote, revealCiteNote } from './helpers/citation-note';

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
  const flywheel = prose.locator('p').filter({ hasText: 'Bessemer quotes Voxel51’s Brian Moore' }).last();
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
  // Owner-approved successor (Josef, 2026-10-10, the research-page
  // standard): the tooltip chip became a numbered sidenote. From 1200 px the
  // note stands in the margin at rest. Where there is no margin the number
  // opens the note inline and closes it again, so the pointer and keyboard
  // states, the note's bounds and the dismissal are checked at 375 px.
  const desktop = page.viewportSize()!;
  for (const [name, paragraph] of [['article-flywheel', flywheel], ['article-glow', glow]] as const) {
    await page.setViewportSize(desktop);
    await paragraph.scrollIntoViewIfNeeded();
    await paragraph.screenshot({ path: info.outputPath(`${name}.png`) });
    const cite = paragraph.locator('[data-cite-id="bessemer-robotics-2026"]').first();
    const { mark, note, source: link } = citeParts(cite);
    await expect(link).toHaveAttribute('href', source);
    await expect(note).toBeVisible();
    await expect(note).toContainText('Bessemer Predicts');
    expect(await citeNoteInMargin(cite), `${name} note in the margin`).toBe(true);
    await page.setViewportSize({ width: 375, height: 812 });
    await mark.scrollIntoViewIfNeeded();
    await revealCiteNote(cite, 'pointer');
    await expect(note).toContainText('Bessemer Predicts');
    await closeCiteNote(cite);
    await expect(note).toBeHidden();
    await page.mouse.move(0, 0);
    await revealCiteNote(cite, 'keyboard');
    const box = await note.boundingBox();
    observations.push({ name, viewport: page.viewportSize(), note: box, sourceHref: await link.getAttribute('href') });
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({ path: info.outputPath(`${name}-citation.png`) });
    await page.keyboard.press('Enter');
    await expect(note).toBeHidden();
    await expect(mark).toBeFocused();
  }
  await page.setViewportSize(desktop);
  const explorer = page.getByTestId('thesis-explorer');
  const choice = explorer.getByRole('button', { name: 'Humans steer while robots learn', exact: true });
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
  // In the figure the number opens its note inline and closes it again.
  const detailCite = detail.locator('[data-cite-id="bessemer-robotics-2026"]').last();
  const detailParts = citeParts(detailCite);
  await detailParts.mark.scrollIntoViewIfNeeded();
  await revealCiteNote(detailCite, 'keyboard');
  await expect(detailParts.source).toHaveAttribute('href', source);
  await page.keyboard.press('Enter');
  await expect(detailParts.note).toBeHidden();
  await expect(detailParts.mark).toBeFocused();
  const axe = await new AxeBuilder({ page }).include('[data-testid="thesis-explorer"]').analyze();
  writeFileSync(info.outputPath('axe-economics.json'), JSON.stringify(axe, null, 2));
  expect(axe.violations).toEqual([]);
  await openAdjustMore(explorer);
  await explorer.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('thesis-readout')).toHaveText('6 bets. Tap one to read the evidence for and against.');
  const reference = page.locator('#ref-bessemer-robotics-2026').locator(`a[href="${source}"]`);
  await expect(reference).toHaveCount(1);
  await reference.scrollIntoViewIfNeeded();
  await reference.focus();
  await expect(reference).toBeFocused();
  await page.screenshot({ path: info.outputPath('bessemer-reference.png') });
  // The first plain mention also links to the glossary entry; the authored
  // Term further down is the trigger that carries the tooltip.
  const term = prose.locator('[data-term-id="teleoperation"] a.term-link').first();
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
