import { test, expect, type Locator } from './servo-apollo-fixture';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { GLOSSARY } from '../../data/glossary';
import { termConsumerInventory } from './helpers/term-consumer-inventory';
import { setSlider } from './slider';

test('visual-servo origin pair has bounded reader, glossary and control evidence', async ({ page }, testInfo) => {
  const viewport = page.viewportSize()!;
  const states: object[] = [], errors: string[] = [], denied: string[] = [];
  const inputPath = process.env.ROBOT_WIKI_GATE_INPUTS;
  const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const inputSha256 = inputPath ? hash(inputPath) : null;
  const population = termConsumerInventory();
  expect(population).toHaveLength(47);
  expect(population.flatMap(article => article.unresolved)).toEqual([]);
  const consumers = population.flatMap(article => article.occurrences
    .filter(term => term.termId === 'visual-servoing')
    .map(term => ({ route: article.route, ...term })));
  expect(consumers.map(term => term.route)).toEqual(['/classical/perception/']);
  const save = () => writeFileSync(testInfo.outputPath('reader-state.json'), JSON.stringify({
    viewport, inputPath, inputSha256, consumers, states, errors, denied,
  }, null, 2));
  const capture = async (name: string, state: object = {}) => {
    const path = testInfo.outputPath(name + '.png');
    await page.screenshot({ path, animations: 'disabled' });
    states.push({ name, path, sha256: hash(path), at: new Date().toISOString(),
      viewport, url: page.url(), inputPath, inputSha256, ...state });
    save();
  };
  const position = async (element: Locator, top = 110) => {
    await element.scrollIntoViewIfNeeded();
    await element.evaluate((el, top) => window.scrollBy(0, el.getBoundingClientRect().top - top), top);
  };
  const clear = async () => {
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect(page.locator('div.prose [role="tooltip"]:visible')).toHaveCount(0);
  };
  const captureText = async (element: Locator, name: string) => {
    await clear(); await position(element);
    const box = (await element.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    for (let offset = 0, part = 1; offset < box.height; offset += viewport.height - 180, part++) {
      await element.evaluate((el, offset) =>
        window.scrollBy(0, el.getBoundingClientRect().top - 110 + offset), offset);
      await capture(`${name}-${part}`, { offset, elementHeight: box.height });
    }
  };
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.context().route('**/*', route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return route.continue();
    denied.push(url.href); return route.abort();
  });
  expect((await page.goto('/classical/perception/'))?.status()).toBe(200);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el =>
    Object.keys(el).some(key => key.startsWith('__reactFiber$'))));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  const roles = await page.evaluate(() => [
    'h1', '[data-testid="perception-target-note"]',
    'div.prose[data-pagefind-body] > p', '[data-testid="perception-total-readout"]',
  ].map(selector => {
    const family = getComputedStyle(document.querySelector(selector)!).fontFamily;
    return { selector, family, loaded: document.fonts.check('16px ' + family.split(',')[0]) };
  }));
  expect(roles.every(role => role.loaded)).toBe(true);
  [/tektur/i, /plex.*sans/i, /newsreader/i, /plex.*mono/i]
    .forEach((pattern, index) => expect(roles[index].family).toMatch(pattern));
  await capture('opening-fonts', { roles });

  const menu = page.getByRole('button', { name: 'Open navigation menu' });
  if (viewport.width === 375) {
    await menu.focus(); await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    const close = dialog.getByRole('button', { name: 'Close navigation menu' });
    await expect(close).toBeFocused();
    await expect(page.locator('#main-content').locator('xpath=ancestor-or-self::*[@inert]').first()).toBeAttached();
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Tab'); await expect(close).toBeFocused();
    await capture('drawer-trap');
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    await expect(menu).toBeFocused();
  } else await expect(menu).not.toBeVisible();

  const defaultTotal = await page.getByTestId('perception-total-readout').innerText();
  await page.getByTestId('perception-target-specular').check();
  await expect(page.getByTestId('perception-depth-readout')).toContainText('6.0%');
  await setSlider(page.getByTestId('perception-distance-slider'), 1.35);
  await position(page.getByTestId('perception-chart')); await capture('calculator-changed');
  await page.getByRole('button', { name: /reset the error budget/i }).click();
  for (const [slider, value] of [['handeye', '0.5'], ['distance', '0.5'], ['depth', '2'], ['pose', '3']]) {
    await expect(page.getByTestId(`perception-${slider}-slider`)).toHaveValue(value);
  }
  await expect(page.getByTestId('perception-target-opaque')).toBeChecked();
  await expect(page.getByTestId('perception-total-readout')).toHaveText(defaultTotal);
  await capture('calculator-reset');
  const disclosures = page.locator('main details');
  for (let index = 0; index < await disclosures.count(); index++) {
    const disclosure = disclosures.nth(index);
    const summary = disclosure.locator('summary').first();
    const wasOpen = await disclosure.evaluate(el => (el as HTMLDetailsElement).open);
    await summary.focus(); await page.keyboard.press('Enter');
    expect(await disclosure.evaluate(el => (el as HTMLDetailsElement).open)).toBe(!wasOpen);
    await page.keyboard.press('Enter');
    expect(await disclosure.evaluate(el => (el as HTMLDetailsElement).open)).toBe(wasOpen);
  }
  states.push({ name: 'disclosure-population', count: await disclosures.count(),
    noPopulationMeansNotApplicable: true });
  const stat = page.getByText('visual-servo formulation', { exact: true }).locator('..');
  await expect(stat).toContainText('1992');
  await expect(stat).toContainText('Espiau, Chaumette and Rives; image-feature feedback');
  await captureText(stat, 'attributed-stat');
  const prose = page.locator('div.prose[data-pagefind-body]');
  const opening = prose.locator('p').filter({ hasText: 'Image-based visual control defines' });
  for (const text of ['1992 paper applies a task-function framework', 'need not be the raw feature difference',
    'relative to the scene, expressed in the camera frame', 'neglecting target motion can leave a tracking error']) {
    await expect(opening).toContainText(text);
  }
  await captureText(opening, 'servo-formulation');
  const equation = prose.locator('p').filter({ hasText: 'For the fixed goal and motionless target considered' });
  await expect(equation).toContainText('six-component spatial velocity, not a vector of joint rates');
  await expect(equation.locator('annotation').first()).toHaveText('\\dot{s} = L_s v_c');
  await captureText(equation, 'camera-velocity-equation');
  const term = prose.locator('[data-term-id="visual-servoing"]');
  await expect(term).toHaveCount(consumers.length);
  const definition = GLOSSARY.find(term => term.id === 'visual-servoing')!.definition;
  for (const [name, root] of [
    ['espiau', opening.locator('[data-cite-id="espiau-1992"]')],
    ['tutorial', equation.locator('[data-cite-id="chaumette-hutchinson-2006"]')],
    ['visual-servo-term', term],
  ] as const) {
    for (const [placement, top] of [['top', 110], ['middle', viewport.height / 2], ['lower', viewport.height - 70]] as const) {
      await clear(); await position(root, top);
      const trigger = root.locator('a').first(), tooltip = root.getByRole('tooltip');
      const header = await page.locator('header.sticky').boundingBox();
      if (viewport.width === 375) expect(header).not.toBeNull();
      else expect(header).toBeNull();
      const boundary = header ? header.y + header.height : 0;
      const check = async () => {
        await expect(tooltip).toBeVisible();
        const box = (await tooltip.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y).toBeGreaterThanOrEqual(boundary);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        if (name === 'visual-servo-term') await expect(tooltip).toContainText(definition);
        return box;
      };
      await trigger.hover(); const hover = await check();
      await capture(`${name}-${placement}-hover`, { hover, header, boundary });
      await clear(); await trigger.focus(); const focus = await check();
      await capture(`${name}-${placement}-keyboard`, { focus, header, boundary });
      const scrolling = await tooltip.evaluate(el => ({ client: el.clientHeight, scroll: el.scrollHeight, tabIndex: (el as HTMLElement).tabIndex }));
      if (scrolling.scroll > scrolling.client) {
        expect(scrolling.tabIndex).toBe(0);
        await page.keyboard.press('Tab'); await expect(tooltip).toBeFocused();
        await page.keyboard.press('End');
        await expect.poll(() => tooltip.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
        await capture(`${name}-${placement}-definition-end`, { scrolling });
      }
      await page.evaluate(() => window.scrollBy(0, 12)); await check();
      await page.keyboard.press('Tab'); await clear();
    }
  }
  for (const [id, title, byline, url] of [
    ['espiau-1992', 'A new approach to visual servoing in robotics', 'B. Espiau, F. Chaumette, P. Rives', 'https://doi.org/10.1109/70.143350'],
    ['chaumette-hutchinson-2006', 'Visual Servo Control, Part I: Basic Approaches', 'François Chaumette, Seth Hutchinson', 'https://doi.org/10.1109/MRA.2006.250573'],
  ]) {
    const reference = page.locator(`ol [data-reference-id="${id}"]`);
    await expect(reference).toContainText(title);
    for (const author of byline.split(', ')) await expect(reference).toContainText(author);
    const source = reference.getByRole('link', { name: title, exact: true });
    await expect(source).toHaveAttribute('href', url);
    await expect(source).toHaveAttribute('rel', /noopener/);
    await captureText(reference, `${id}-reference`);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const articleAxe = (await new AxeBuilder({ page }).include('#main-content').analyze()).violations;
  expect(articleAxe).toEqual([]);
  await clear(); await term.locator('a').first().click();
  await expect(page).toHaveURL(/\/glossary\/?#visual-servoing$/);
  await page.evaluate(() => document.fonts.ready);
  const entry = page.locator('[data-glossary-term="visual-servoing"]');
  await expect(entry.locator('p')).toHaveText(definition);
  await expect(entry.locator('a')).toHaveCount(2);
  await expect(entry.locator('a').first()).toHaveAttribute('href', 'https://doi.org/10.1109/70.143350');
  await expect(entry.locator('a').nth(1)).toHaveAttribute('href', 'https://doi.org/10.1109/MRA.2006.250573');
  await captureText(entry, 'glossary-definition-and-sources');
  expect((await new AxeBuilder({ page }).include('[data-glossary-term="visual-servoing"]').analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]); expect(denied).toEqual([]);
  states.push({ name: 'scoped-axe', articleAxe, glossaryAxe: [], fullProfilesAccepted: false });
  save();
});
