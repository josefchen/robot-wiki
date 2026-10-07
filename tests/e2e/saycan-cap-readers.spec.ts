import { test as standardTest, expect } from '@playwright/test';
import { test as missionTest } from './helpers/state-smoothing-fixture';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { GLOSSARY } from '../../data/glossary';
import { CITATIONS } from '../../data/citations';
import { openAdjustMore } from './helpers/figure-fold';
import { waitForHydration } from './interaction-ready';

// Normal-suite collectability must not require a Mission or its input manifest.
const test = process.env.ROBOT_WIKI_GATE_INPUTS ? missionTest : standardTest;

test('SayCan and CaP retain complete caveats, definitions and reference identities', async ({ page }, info) => {
  await page.goto('/manipulation/hierarchical/');
  await page.evaluate(() => document.fonts.ready);
  const observations: Record<string, unknown> = {};
  const shot = async (name: string) => {
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  };
  // The system selector, the playhead (which starts at the 2000 ms end) and
  // Reset sit in the figure's "Adjust more" fold.
  const figure = page.locator('main [data-figure-frame="hierarchy-timescales"]');
  await waitForHydration(figure.locator('[data-figure-fold="adjust"] > summary'));
  await openAdjustMore(figure);
  const controls = page.getByRole('group', { name: 'Robot system' });
  const choices = controls.locator('button[aria-pressed]');
  await choices.last().click();
  await expect(choices.last()).toHaveAttribute('aria-pressed', 'true');
  const playhead = page.locator('#hierarchy-playhead');
  await playhead.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(playhead).not.toHaveValue('2000');
  await figure.getByRole('button', { name: /reset/i }).click();
  await expect(playhead).toHaveValue('2000');

  const saycan = page.getByRole('heading', { name: 'SayCan: scoring usefulness and affordance' });
  await saycan.scrollIntoViewIfNeeded();
  await expect(page.locator('p').filter({ hasText: 'SayCan (2022) scores each skill' })).toContainText('its description is appended to the prompt');
  await expect(page.locator('p').filter({ hasText: 'On the mobile manipulator,' })).toContainText('calibrated before use as probabilities');
  await shot('saycan-mechanism');
  const limitation = page.locator('p').filter({ hasText: 'The skill library bounds the system' });
  await limitation.scrollIntoViewIfNeeded();
  await expect(limitation).toContainText('difficulty reacting when a skill fails despite a high value');
  await shot('saycan-limitations');
  const cap = page.getByRole('heading', { name: 'Code as Policies: the planner writes programs' });
  await cap.scrollIntoViewIfNeeded();
  await expect(page.locator('p').filter({ hasText: 'Code as Policies (2022) prompts' })).toContainText('loops, conditionals, spatial arithmetic and feedback over perception outputs');
  await shot('cap-mechanism');
  const capLimits = page.locator('p').filter({ hasText: 'It assumes feasible instructions and cannot check correctness in advance.' });
  await capLimits.scrollIntoViewIfNeeded();
  await expect(capLimits).toContainText('pre-registered camera-to-robot transform');
  await expect(capLimits).toContainText('Quantitative evaluation covers only a tabletop simulation');
  await shot('cap-limitations');

  const citeIds = ['saycan-2022', 'code-as-policies-2022'];
  // Escape is handled by the hydrated chip; before hydration the tooltip only
  // shows. Wait for both chips up front: the first chip's reference jump is a
  // hash navigation, which clears history.state, the hydration signal.
  for (const id of citeIds) {
    await waitForHydration(page.locator(`[data-cite-id="${id}"]`).first().locator('a').first());
  }
  for (const id of citeIds) {
    const citation = CITATIONS.find(item => item.id === id)!;
    const chip = page.locator(`[data-cite-id="${id}"]`).first();
    const source = chip.locator('a').first();
    const tip = chip.getByRole('tooltip');
    await source.scrollIntoViewIfNeeded();
    await source.hover();
    await expect(tip).toBeVisible();
    await expect(tip).toContainText(citation.title);
    await expect(source).toHaveAttribute('href', citation.url);
    await source.focus();
    await page.keyboard.press('Escape');
    await expect(tip).toBeHidden();
    await expect(source).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(chip.locator('a').nth(1)).toBeFocused();
    await page.keyboard.press('Enter');
    const reference = page.locator(`#ref-${id}`);
    if (citation.authors.length > 8) {
      await expect(reference.locator(`[data-author-names]`)).toHaveText(`${citation.authors.slice(0, 8).join(`, `)}, and ${citation.authors.length - 8} more`);
      const expand = reference.getByRole(`button`, { name: `Show all ${citation.authors.length} authors` });
      await expand.focus();
      await page.keyboard.press(`Enter`);
      await expect(reference.getByRole('button', { name: 'Show 8 authors' })).toHaveAttribute('aria-expanded', 'true');
    }
    await expect(reference.locator('[data-author-names]')).toHaveText(citation.authors.join(', '));
    await expect(reference.locator('[data-reference-source-link]')).toHaveAttribute('href', citation.url);
    await reference.scrollIntoViewIfNeeded();
    observations[id] = { authors: citation.authors.length, title: citation.title, venue: citation.venue, year: citation.year, url: citation.url };
    await shot(`${id}-references`);
  }

  await capLimits.scrollIntoViewIfNeeded();
  const axe = await new AxeBuilder({ page }).include('main').analyze();
  writeFileSync(info.outputPath('axe.json'), JSON.stringify(axe, null, 2));

  const term = page.locator('[data-term-id="affordance"]').first();
  const termLink = term.locator('a');
  await termLink.scrollIntoViewIfNeeded();
  await termLink.hover();
  const termTip = term.getByRole('tooltip');
  const affordance = GLOSSARY.find(item => item.id === 'affordance')!;
  await expect(termTip).toContainText(affordance.definition);
  await termLink.focus();
  await page.keyboard.press('Escape');
  // Existing shared Term Escape behavior is observed, not repaired or waived.
  observations.termAfterEscape = { visible: await termTip.isVisible(), focused: await termLink.evaluate(el => el === document.activeElement) };
  observations.termGeometry = await termTip.boundingBox();
  await shot('affordance-tooltip');
  if (await termTip.getAttribute('tabindex') === '0') {
    await page.keyboard.press('Tab');
    await expect(termTip).toBeFocused();
    await page.keyboard.press('End');
    observations.termScroll = await termTip.evaluate(el => ({ top: el.scrollTop, height: el.clientHeight, full: el.scrollHeight }));
    await termLink.focus();
  }
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/glossary\/?#affordance$/);
  for (const id of ['affordance', 'hierarchical-policy']) {
    const entry = GLOSSARY.find(item => item.id === id)!;
    const target = page.locator(`#${id}`);
    await target.scrollIntoViewIfNeeded();
    await expect(target).toContainText(entry.definition);
    await shot(`${id}-definition`);
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/manipulation\/hierarchical/);
  // Back's URL, mounted body and focus are separate observations, not navigation acceptance.
  observations.afterBack = await page.evaluate(() => ({
    url: location.href, heading: document.querySelector('h1')?.textContent,
    articleBodyPresent: [...document.querySelectorAll('p')].some(el => el.textContent?.includes('It assumes feasible instructions and cannot check correctness in advance.')),
    tag: document.activeElement?.tagName, href: document.activeElement?.getAttribute('href'),
  }));
  info.annotations.push({ type: 'scope', description: 'Term Escape and Back body/focus are recorded for the separately owned shared-reader gate, not certified by this content test.' });
  await shot('after-back-observed');
  writeFileSync(info.outputPath('reader-observations.json'), JSON.stringify(observations, null, 2));
  expect(axe.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
