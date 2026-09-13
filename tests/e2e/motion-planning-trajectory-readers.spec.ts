import { test, expect } from './helpers/motion-planning-offline-fixture';
import { writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

const TABLES = [
  { name: 'TrajOpt arm benchmark results', first: 'Arm method', rows: [
    ['TrajOpt', '0.84', '0.20', '1.2'],
    ['TrajOpt, multiple initializations', '0.99', '0.32', '1.2'],
    ['OMPL RRTConnect', '0.97', '1.2', '1.6'],
    ['OMPL LBKPIECE', '0.96', '3.1', '1.7'],
    ['CHOMP', '0.66', '3.1', '2.4'],
    ['CHOMP, multiple initializations', '0.85', '6.0', '2.6'],
  ] },
  { name: 'TrajOpt full-body benchmark results', first: 'Full-body method', rows: [
    ['TrajOpt', '0.63', '2.1', '1.08'],
    ['TrajOpt, multiple initializations', '0.84', '7.6', '1.09'],
    ['OMPL RRTConnect', '0.53', '18.0', '1.5'],
    ['OMPL LBKPIECE', '0.50', '18.7', '1.5'],
  ] },
];

test('trajectory benchmark tables retain every value and keyboard-reachable right edge', async ({ page }, info) => {
  await page.goto('/classical/motion-planning/');
  await page.evaluate(() => document.fonts.ready);
  const states: object[] = [];
  const save = () => writeFileSync(info.outputPath('trajectory-tables.json'), JSON.stringify({
    project: info.project.name, viewport: page.viewportSize(), inputPath: process.env.ROBOT_WIKI_GATE_INPUTS,
    states, sourceTruth: 'Retained predecessor result; these assertions are reader proof, not new source certification.',
  }, null, 2));
  try {
    for (const [index, expected] of TABLES.entries()) {
      const region = page.getByRole('region', { name: expected.name, exact: true });
      await expect(region).toHaveCount(1);
      await expect(region).toHaveAttribute('tabindex', '0');
      const table = region.getByRole('table');
      await expect(table.getByRole('columnheader')).toHaveText([
        expected.first, 'Success fraction', 'Average time (s)', 'Average normalized length',
      ]);
      const rows = table.locator('tbody tr');
      await expect(rows).toHaveCount(expected.rows.length);
      for (const [row, cells] of expected.rows.entries()) {
        await expect(rows.nth(row).getByRole('cell')).toHaveText(cells);
      }
      await region.scrollIntoViewIfNeeded();
      await region.evaluate(el => window.scrollBy(0, el.getBoundingClientRect().top - 100));
      await region.focus();
      await expect(region).toBeFocused();
      const before = await region.evaluate(el => {
        const box = el.getBoundingClientRect(), style = getComputedStyle(el);
        return { left: box.left, right: box.right, width: el.clientWidth,
          scrollWidth: el.scrollWidth, scrollLeft: el.scrollLeft,
          outline: style.outline, overflowX: style.overflowX };
      });
      expect(before.left).toBeGreaterThanOrEqual(0);
      expect(before.right).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(before.overflowX).toBe('auto');
      await page.screenshot({ path: info.outputPath(`table-${index}-start.png`), animations: 'disabled' });
      if (before.scrollWidth > before.width) {
        for (let step = 0; step < 50 &&
          await region.evaluate(el => el.scrollLeft + el.clientWidth < el.scrollWidth - 1); step++) {
          await page.keyboard.press('ArrowRight');
        }
        await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
        await expect.poll(() => region.evaluate(el => el.scrollWidth - el.clientWidth - el.scrollLeft))
          .toBeLessThanOrEqual(1);
      }
      const end = await table.locator('th').last().boundingBox();
      expect(end!.x + end!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      states.push({ name: expected.name, before, end, scrollLeft: await region.evaluate(el => el.scrollLeft) });
      save();
      await page.screenshot({ path: info.outputPath(`table-${index}-end.png`), animations: 'disabled' });
      await page.keyboard.press('Tab');
      await expect(region).not.toBeFocused();
    }
    const prose = page.locator('div.prose[data-pagefind-body]');
    for (const text of ['Table II contains no CHOMP full-body result', 'three seconds per CHOMP initialization',
      'thirty-second full-body OMPL limit', 'not a separate smoothness measurement',
      'does not identify the processor']) {
      await expect(prose).toContainText(text);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    const axe = await new AxeBuilder({ page }).include('#main-content').analyze();
    states.push({ name: 'axe', violations: axe.violations, incomplete: axe.incomplete });
    expect(axe.violations).toEqual([]);
  } finally {
    save();
  }
});
