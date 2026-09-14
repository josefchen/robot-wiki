import { test, expect, type Locator } from './helpers/motion-planning-offline-fixture';
import { getTerm } from '../../data/glossary';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ownedEvidencePath } from './helpers/keypoint-reader-oracle';

test('RRT report correction, bibliography date and full configuration-space definition render together', async ({ page }, info) => {
  const states: object[] = [];
  const inputPath = process.env.ROBOT_WIKI_GATE_INPUTS!;
  const root = process.env.ROBOT_WIKI_EVIDENCE_ROOT;
  const capture = async (name: string) => {
    const path = ownedEvidencePath(root, info.outputPath(`${name}.png`));
    await page.screenshot({ path, animations: 'disabled' });
    states.push({ name, path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
  };
  const show = async (locator: Locator, name: string) => {
    await locator.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await capture(name);
  };
  expect((await page.goto('/classical/motion-planning/'))?.status()).toBe(200);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => Object.keys(el).some(k => k.startsWith('__reactFiber$'))));
  await page.evaluate(async () => { await document.fonts.ready; });
  await expect(page.getByRole('heading', { level: 1, name: 'Motion Planning', exact: true })).toBeVisible();
  await expect(page.getByText('17 August 2026', { exact: true })).toBeVisible();
  const prose = page.locator('div.prose[data-pagefind-body]');
  const paragraphs = prose.locator(':scope > p');
  const origin = paragraphs.filter({ hasText: "LaValle's report introduces" });
  for (const text of ['Technical Report 98-11, October 1998', 'fixed time interval', 'entire local paths']) await expect(origin).toContainText(text);
  await show(origin, 'report-origin-and-algorithm');
  const equation = prose.locator('.katex-display').filter({ has: page.locator('annotation').filter({ hasText: 'x_{new}' }) });
  await expect(equation).toHaveCount(1);
  await expect(equation.locator('annotation')).toHaveText(String.raw`x_{new} \approx x + f(x,u)\Delta t`);
  await expect(equation.locator('.katex-html')).toBeVisible();
  await show(equation, 'euler-approximation');
  const integration = paragraphs.filter({ hasText: 'A fixed integration interval does not impose' });
  await expect(integration).toContainText('higher-order integrator such as Runge-Kutta');
  await show(integration, 'integration-qualification');
  const swath = paragraphs.filter({ hasText: "LaValle's 2006 Section 5.5" });
  for (const text of ['initial obstacle-free construction', "nearest point in the tree's swath", 'Figure 5.18 splits the edge']) await expect(swath).toContainText(text);
  await show(swath, 'distinct-book-construction');
  const stats = prose.locator(':scope > div.grid');
  await expect(stats).toContainText('1998');
  await expect(stats).toContainText("Iowa State TR 98-11; date in LaValle's bibliography");
  await show(stats, 'bibliography-attributed-stat');
  for (const [id, count, title, meta, url] of [
    ['lavalle-1998', 5, 'Rapidly-exploring Random Trees: A New Tool for Path Planning', 'Steven M. LaValle, Iowa State University TR 98-11, 1998', 'https://lavalle.pl/papers/Lav98c.pdf'],
    ['lavalle-2006', 7, 'Planning Algorithms', 'Steven M. LaValle, Cambridge University Press, 2006', 'https://lavalle.pl/planning/'],
  ] as const) {
    const chips = prose.locator(`[data-cite-id="${id}"]`);
    await expect(chips).toHaveCount(count);
    const chip = chips.first(), anchor = chip.getByRole('link').first();
    await chip.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await anchor.focus();
    await expect(chip.getByRole('tooltip')).toContainText(title);
    await expect(chip.getByRole('tooltip')).toContainText(meta);
    await expect(anchor).toHaveAttribute('href', url);
    await capture(`${id}-metadata`);
    const reference = page.locator(`[data-reference-id="${id}"]`);
    await expect(reference.locator('[data-author-names]')).toHaveText('Steven M. LaValle');
    await expect(reference.getByRole('link', { name: title, exact: true })).toHaveAttribute('href', url);
    await page.keyboard.press('Tab');
    await page.mouse.move(1, 1);
  }
  const term = prose.locator('[data-term-id="configuration-space"]');
  const trigger = term.getByRole('link'), tip = term.getByRole('tooltip');
  await term.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await trigger.focus();
  await expect(tip).toBeVisible();
  await expect(tip.locator('span').last()).toHaveText(getTerm('configuration-space')!.definition);
  const box = (await tip.boundingBox())!, viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y).toBeGreaterThanOrEqual(54); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  await capture('configuration-space-definition-top');
  await tip.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await capture('configuration-space-definition-bottom');
  await page.keyboard.press('Tab');
  await expect(tip).not.toBeVisible();
  // Tab exit is tested here; this is not a claim to repair the separate Term Escape debt.
  const slider = page.getByRole('slider', { name: /exploration iteration/i });
  await slider.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(page.getByTestId('rrt-node-readout')).toHaveText('1');
  await slider.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('rrt-node-readout')).toHaveText('2');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('rrt-node-readout')).toHaveText('1');
  await capture('unchanged-toy-controls');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  states.push({ overflow, viewport, documentNavigations: 1, termExit: 'Tab, not Escape',
    limits: 'Changed reader states only; inherited small SVG labels, mobile TrajOpt typography, contrast incompletes and Back-to-BODY/TermEscape debt are not repaired.' });
  writeFileSync(ownedEvidencePath(root, info.outputPath('reader-states.json')), JSON.stringify({
    inputPath, inputSha256: createHash('sha256').update(readFileSync(inputPath)).digest('hex'), states,
  }, null, 2));
});
