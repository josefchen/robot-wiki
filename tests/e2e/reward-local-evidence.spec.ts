import { expect, test, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  ROOT, DIRECTORY, BROWSER, rewardDisclosure, eurekaDisclosure, defaults,
  rewardRecipe, eurekaRecipe, extract, dependencies, artifact, save,
} from '../../audit/evidence/reward-local-20260923/proof-support';

const route = '/rl-sim2real/reward-design-mpc/';
const producing = process.env.REWARD_LOCAL_CAPTURE === '1';

test('observes the mounted authored reward and complete scripted replay', async ({ page }) => {
  test.setTimeout(180_000);
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);
  await expect(page.getByText(rewardDisclosure, { exact: true })).toBeVisible();
  await expect(page.getByText(eurekaDisclosure, { exact: true })).toBeAttached();
  const reward = page.getByTestId('quad-preview').locator('..');
  const eureka = page.getByTestId('generation-readout').locator('../..');
  const observations: unknown[] = [];
  async function capture(name: string, family: 'reward' | 'eureka', recipe: unknown, target: Locator) {
    const expected = extract(recipe);
    const values = expected.values as { display: string[] };
    const selector = family === 'reward' ? '[data-testid="total-readout"]' : '[data-testid="generation-readout"], [data-testid="fitness-readout"]';
    const texts = family === 'reward'
      ? [(await page.getByTestId('total-readout').innerText()).replace(' / step', '')]
      : [await page.getByTestId('generation-readout').innerText(), await page.getByTestId('fitness-readout').innerText()];
    expect(texts).toEqual(values.display);
    await target.scrollIntoViewIfNeeded();
    const text = await page.locator('body').innerText();
    expect(text).toContain(family === 'reward' ? rewardDisclosure : eurekaDisclosure);
    if (producing) {
      const dom = save(`${name}.dom.json`, {
        url: page.url(), viewport: page.viewportSize(), text,
        html: await page.locator('main').innerHTML(),
        preview: family === 'reward' ? await page.getByTestId('quad-preview').evaluate(n => n.outerHTML) : null,
        controls: await target.locator('button, input').evaluateAll(nodes => nodes.map(n => ({
          tag: n.tagName, name: n.getAttribute('aria-label') ?? n.textContent,
          disabled: (n as HTMLButtonElement).disabled, value: (n as HTMLInputElement).value,
        }))),
      });
      await page.screenshot({ path: `${DIRECTORY}/${name}.png`, animations: 'disabled' });
      observations.push({
        name, family, recipe, expected, dependencies: dependencies(family, BROWSER),
        viewport: page.viewportSize(), readouts: texts.map(text => ({ selector, text })),
        dom, capture: artifact(`${DIRECTORY}/${name}.png`),
      });
    }
  }
  async function setSlider(name: string, value: 'min' | 'max') {
    const slider = reward.getByRole('slider', { name, exact: true });
    await slider.focus();
    await slider.press(value === 'min' ? 'Home' : 'End');
  }
  async function resetReward() {
    await reward.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByTestId('behavior-status')).toHaveText('balanced gait');
  }
  await expect(reward.getByRole('slider')).toHaveCount(12);
  const ids = await reward.getByRole('slider').evaluateAll(nodes => nodes.map(n => n.id.replace('rs-', '')));
  expect(ids).toEqual(Object.keys(defaults));
  expect(await reward.getByRole('slider').evaluateAll(nodes => nodes.map(n => {
    const input = n as HTMLInputElement;
    return [input.min, input.max, input.step, input.value];
  }))).toEqual(Object.values(defaults).map(w => ['0', '40', '1', String(w * 10)]));
  await capture('reward-default', 'reward', rewardRecipe('default'), reward);
  const defaultPose = await page.getByTestId('quad-preview').innerHTML();
  for (const [name, slider, end, status] of [
    ['freeze', 'Torque penalty weight', 'max', 'failure attractor: freeze'],
    ['prance', 'Foot air time weight', 'max', 'failure attractor: prance'],
    ['chatter', 'Action-rate penalty weight', 'min', 'failure attractor: chatter'],
  ] as const) {
    await resetReward();
    await setSlider(slider, end);
    await expect(page.getByTestId('behavior-status')).toHaveText(status);
    expect(await page.getByTestId('quad-preview').innerHTML()).not.toEqual(defaultPose);
    await capture(`reward-${name}`, 'reward', rewardRecipe(name), reward);
  }
  await resetReward();
  expect(await page.getByTestId('quad-preview').innerHTML()).toEqual(defaultPose);
  await capture('reward-reset', 'reward', rewardRecipe('default'), reward);
  const script = extract({ id: 'eureka', mode: 'parameters', inputs: {} }).values as {
    generations: { code: string[]; stats: { label: string; value: string }[]; reflection: string }[];
  };
  for (let n = 0; n < 3; n++) {
    if (n) {
      // Actual keyboard activation also witnesses the registered focus case.
      await eureka.getByRole('button', { name: 'Run next generation' }).focus();
      await eureka.getByRole('button', { name: 'Run next generation' }).press('Enter');
    }
    await expect(page.getByTestId('generation-readout')).toHaveText(`Generation ${n} of 2`);
    await expect(page.getByTestId('eureka-code')).toHaveText(script.generations[n].code.join('\n'));
    await expect(page.getByTestId('eureka-reflection')).toHaveText(script.generations[n].reflection);
    for (const stat of script.generations[n].stats) {
      await expect(page.getByTestId('eureka-stats').getByText(stat.label, { exact: true })).toBeVisible();
      await expect(page.getByTestId('eureka-stats').getByText(stat.value, { exact: true })).toBeVisible();
    }
    if (n === 2) await expect(eureka.getByRole('button', { name: 'Run next generation' })).toBeDisabled();
    else await expect(eureka.getByRole('button', { name: 'Run next generation' })).toBeEnabled();
    await capture(`eureka-${n}`, 'eureka', eurekaRecipe(n), eureka);
  }
  await eureka.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('generation-readout')).toHaveText('Generation 0 of 2');
  await expect(page.getByTestId('eureka-diff')).toHaveCount(0);
  await expect(eureka.getByRole('button', { name: 'Run next generation' })).toBeEnabled();
  await capture('eureka-reset', 'eureka', eurekaRecipe(0), eureka);
  expect(errors).toEqual([]);
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
  if (producing) save('browser-run.json', {
    startedAt, endedAt: new Date().toISOString(), cwd: ROOT, runner: 'playwright',
    command: process.env.REWARD_LOCAL_COMMAND, environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
    test: artifact(BROWSER), observations, errors,
  });
});

test('renders both disclosures without horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(route);
  await expect(page.getByText(rewardDisclosure, { exact: true })).toBeVisible();
  await expect(page.getByText(eurekaDisclosure, { exact: true })).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await page.getByTestId('generation-readout').scrollIntoViewIfNeeded();
  if (producing) {
    save('reader-mobile.dom.json', { url: page.url(), text: await page.locator('body').innerText() });
    await page.screenshot({ path: `${DIRECTORY}/reader-mobile.png`, animations: 'disabled' });
  }
});
