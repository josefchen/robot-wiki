import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { getTerm } from '../../data/glossary';
import { recomputeLocalDerivation } from '../../lib/audit-local-basis';

const ROUTE = '/classical/kinematics/';

const BASE = { name: /base joint/i };
const ELBOW = { name: /elbow joint/i };
const WRIST = { name: /wrist joint/i };

test('classical closure mounted observations at desktop and mobile', async ({ page }) => {
  test.setTimeout(180_000);
  const startedAt = new Date().toISOString();
  const directory = join(process.cwd(), 'audit/evidence/classical-closure-20260923');
  const captureEnabled = process.env.CLASSICAL_CLOSURE_CAPTURE === '1';
  const ref = (path: string) => {
    const bytes = readFileSync(join(directory, path));
    return { path: `audit/evidence/classical-closure-20260923/${path}`, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex') };
  };
  const captures: object[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Local rendered behavior only. No article-source retrieval or external embed.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  const capture = async (name: string, details: object) => {
    if (!captureEnabled) return;
    const dom = { text: await page.locator('#main-content').innerText(),
      allText: await page.locator('#main-content').textContent(), url: page.url() };
    writeFileSync(join(directory, `${name}.dom.json`), JSON.stringify(dom, null, 2) + '\n');
    await page.screenshot({ path: join(directory, `${name}.png`), animations: 'disabled' });
    captures.push({ name, viewport: page.viewportSize(), observedAt: new Date().toISOString(),
      ...details, dom: ref(`${name}.dom.json`), capture: ref(`${name}.png`) });
  };
  const ready = async (route: string) => {
    expect((await page.goto(route))?.status()).toBe(200);
    await page.waitForFunction(() => [...document.querySelectorAll('button,input')].some(el =>
      Object.keys(el).some(k => k.startsWith('__reactFiber$'))));
    await page.evaluate(async () => { await document.fonts.ready; });
  };
  await page.clock.install();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await ready(ROUTE);
    const main = page.locator('#main-content');
    for (const absent of ['Wampler', 'Levenberg-Marquardt', 'residual decreases monotonically']) {
      await expect(main).not.toContainText(absent);
    }
    for (const id of ['wampler-1986', 'levenberg-1944', 'marquardt-1963', 'denavit-hartenberg-1955']) {
      await expect(main.locator(`[data-cite-id="${id}"],[data-reference-id="${id}"]`)).toHaveCount(0);
    }
    await expect(main.getByRole('link', { name: '3D kinematics playground' })).toHaveAttribute('href', '/playground');
    await expect(page.getByTestId('fk-theta-1')).toHaveText('110°');
    await expect(main).toContainText('±0.5mm');
    const glossary = [];
    for (const id of ['inverse-kinematics', 'denavit-hartenberg-parameters']) {
      const term = main.locator(`[data-term-id="${id}"]`).first();
      await term.locator('a').first().focus();
      await expect(term.getByRole('tooltip')).toBeVisible();
      await expect(term.getByRole('tooltip')).toContainText(getTerm(id)!.definition);
      glossary.push({ id, resolves: true, tooltipObserved: true, definition: getTerm(id)!.definition });
      await page.keyboard.press('Tab');
    }
    await main.getByRole('heading', { name: 'Denavit-Hartenberg parameters', exact: true }).scrollIntoViewIfNeeded();
    await capture(`kinematics-${viewport.width}`, { surface: 'kinematics', glossary,
      checkedText: ['LaValle describes', '3D kinematics playground', '±0.5mm'] });

    await ready('/classical/motion-planning/');
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
    const rrtControl = page.getByRole('slider', { name: /exploration iteration/i });
    const rrtReadouts = ['rrt-iteration-readout', 'rrt-node-readout', 'rrt-status-readout', 'rrt-path-readout'];
    const rrtState = async (name: string, iteration: number, prestate: string, action: string, caseId: string) => {
      const result = recomputeLocalDerivation({ id: 'rrt', mode: 'derive', inputs: { iteration } });
      const display = (result.values as { display: string[] }).display;
      for (let i = 0; i < display.length; i++) await expect(page.getByTestId(rrtReadouts[i])).toHaveText(display[i]);
      await page.getByTestId('rrt-iteration-readout').scrollIntoViewIfNeeded();
      await capture(`rrt-${name}-${viewport.width}`, { surface: 'rrt', recipe: { id: 'rrt', mode: 'derive', inputs: { iteration } },
        mountId: 'mount:/classical/motion-planning/:RrtExplorer:1', caseId, prestate, action, poststate: name,
        readouts: display.map((text, i) => ({ selector: `[data-testid="${rrtReadouts[i]}"]`, text })) });
    };
    await rrtState('opening', 0, 'unmounted', 'navigate to article', 'default');
    await page.getByRole('button', { name: 'Step forward', exact: true }).click();
    await rrtState('step', 1, 'opening', 'Step forward', 'slider-boundaries-and-anchors');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByRole('button', { name: 'Run the exploration', exact: true }).click();
    await expect(page.getByTestId('rrt-iteration-readout')).toHaveAttribute('data-playback-cadence', 'smooth');
    await page.clock.runFor(50);
    await page.getByRole('button', { name: 'Pause the exploration', exact: true }).click();
    await rrtState('playback', 3, 'reset at 0', 'Run, one 50ms timer tick, Pause', 'slider-boundaries-and-anchors');
    await setSlider(rrtControl, 100);
    await rrtState('scrub', 100, 'playback at 3', 'set iteration slider to 100', 'slider-boundaries-and-anchors');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await rrtState('reset', 0, 'scrub at 100', 'Reset', 'reset');
    await page.clock.resume();

    await ready('/classical/perception/');
    const base = { handEyeDeg: .5, depthPct: 2, poseMm: 3, workingDistanceM: .5, target: 'opaque' };
    const perceptionReadouts = ['perception-total-readout', 'perception-depth-readout', 'perception-verdict-readout'];
    const state = async (name: string, inputs: typeof base, prestate: string, action: string, caseId: string) => {
      const result = recomputeLocalDerivation({ id: 'perception', mode: 'derive', inputs });
      const display = (result.values as { display: string[] }).display;
      for (let i = 0; i < display.length; i++) await expect(page.getByTestId(perceptionReadouts[i])).toHaveText(display[i]);
      await page.getByTestId('perception-total-readout').scrollIntoViewIfNeeded();
      await capture(`perception-${name}-${viewport.width}`, { surface: 'perception',
        recipe: { id: 'perception', mode: 'derive', inputs },
        mountId: 'mount:/classical/perception/:PerceptionErrorBudget:1', caseId, prestate, action, poststate: name,
        readouts: display.map((text, i) => ({ selector: `[data-testid="${perceptionReadouts[i]}"]`, text })) });
    };
    await state('opening', base, 'unmounted', 'navigate to article', 'default');
    await expect(page.getByTestId('perception-distance-slider')).toHaveAttribute('min', '0.15');
    await setSlider(page.getByTestId('perception-distance-slider'), .15);
    await state('near', { ...base, workingDistanceM: .15 }, 'opening', 'distance to 0.15m', 'slider-boundaries-and-anchors');
    await setSlider(page.getByTestId('perception-distance-slider'), 1.5);
    await state('far', { ...base, workingDistanceM: 1.5 }, 'near', 'distance to 1.5m', 'slider-boundaries-and-anchors');
    await setSlider(page.getByTestId('perception-handeye-slider'), 0);
    await state('zeroFar', { ...base, handEyeDeg: 0, workingDistanceM: 1.5 }, 'far', 'angle to zero', 'slider-boundaries-and-anchors');
    await setSlider(page.getByTestId('perception-distance-slider'), .15);
    await state('zeroNear', { ...base, handEyeDeg: 0, workingDistanceM: .15 }, 'zeroFar', 'distance to 0.15m', 'slider-boundaries-and-anchors');
    for (const target of ['specular', 'transparent']) {
      await page.getByRole('button', { name: 'Reset the error budget to its opening values' }).click();
      await page.getByTestId(`perception-target-${target}`).check();
      await state(target, { ...base, target }, 'reset opening', `select ${target}`, 'discrete-options');
    }
    await page.getByRole('button', { name: 'Reset the error budget to its opening values' }).click();
    await state('reset', base, 'transparent', 'Reset', 'reset');
    await expect(page.getByTestId('perception-budget')).not.toContainText('will jam');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
  if (captureEnabled) writeFileSync(join(directory, 'mounted-observations.json'), JSON.stringify({
    startedAt, endedAt: new Date().toISOString(), runner: 'playwright', documentNavigations: 6,
    externalRequests: 'blocked; no external source or embed retrieval', errors, captures,
  }, null, 2) + '\n');
});

/** Parse a signed FK readout like "+0.42" / "-1.03" into a number. */
async function eeValue(page: Page, axis: 'x' | 'y'): Promise<number> {
  const text = (await page.getByTestId(`fk-ee-${axis}`).textContent()) ?? '';
  expect(text).not.toContain('NaN');
  const value = Number.parseFloat(text);
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/**
 * Range sliders are driven through the shared setSlider helper
 * (tests/e2e/slider.ts): fill() can leave React's change tracking one
 * event behind under load (quirk 9).
 */

/**
 * The article's visible text. KaTeX keeps the original TeX source inside a
 * screen-reader MathML annotation (.katex-mathml), which textContent would
 * include; raw-math checks must exclude those annotations to test what a
 * user actually sees.
 */
async function visibleArticleText(page: Page): Promise<string> {
  return page.locator('#main-content').evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    for (const node of Array.from(clone.querySelectorAll('.katex-mathml'))) {
      node.remove();
    }
    return clone.textContent ?? '';
  });
}

test.describe('classical kinematics module', () => {
  test('renders full prose on FK, DH, IK, and the Jacobian (VAL-CLASS-001)', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Kinematics' }),
    ).toBeVisible();

    // Sidebar shows the module active under the classical domain.
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Kinematics' }),
    ).toHaveAttribute('aria-current', 'page');

    const main = page.locator('#main-content');
    // The four required strands are all present as rendered prose. The
    // glossary <Term> markup adds hidden-at-rest tooltip copies of the
    // FK/IK definitions to the DOM, so match the VISIBLE text, not the
    // first DOM hit.
    await expect(main.getByText(/forward kinematics/i).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/Denavit/i).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/Hartenberg/i).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/Jacobian/i).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/inverse kinematics/i).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/singularit/i).filter({ visible: true }).first()).toBeVisible();

    // Substantive long-form body: several hundred words at minimum.
    const visibleText = await visibleArticleText(page);
    expect(visibleText.split(/\s+/).filter(Boolean).length).toBeGreaterThan(800);

    // No raw MDX or component source leaks into the rendered page.
    expect(visibleText).not.toContain('import {');
    expect(visibleText).not.toContain('<Cite');
    expect(visibleText).not.toContain('<PlanarFkArm');
    expect(errors).toEqual([]);
  });

  test('citation chips resolve and link externally (VAL-CLASS-002, VAL-CLASS-003)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');

    // Primary sources for the four topic areas, each with its exact href.
    await expect(
      main.getByRole('link', { name: 'LaValle 2006' }).first(),
    ).toHaveAttribute('href', 'https://lavalle.pl/planning/');
    await expect(
      main.getByRole('link', { name: 'Whitney 1969' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/TMMS.1969.299896');
    for (const id of ['wampler-1986', 'levenberg-1944', 'marquardt-1963']) {
      await expect(main.locator(`[data-cite-id="${id}"]`)).toHaveCount(0);
    }
    await expect(
      main.getByRole('link', { name: 'Lynch 2017' }).first(),
    ).toHaveAttribute('href', 'https://modernrobotics.northwestern.edu/');

    // Every chip is a real external link; no unresolved ids render.
    // Scoped to the authored prose: the generated References bibliography
    // also renders target=_blank external links inside main; do not count those.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[target="_blank"][href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(9);
    expect(await main.getByText('missing citation:').count()).toBe(0);

    // A chip is keyboard-focusable and reveals its metadata on focus.
    const dhChip = main.getByRole('link', { name: 'LaValle 2006' }).first();
    await dhChip.focus();
    await expect(
      main
        .locator('span[role="tooltip"]')
        .filter({ hasText: 'Planning Algorithms' }),
    ).toBeVisible();
  });

  test('KaTeX renders with no raw math delimiters (VAL-CLASS-004)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    // Transform matrices, the DH convention, and the Jacobian equations all
    // ship as rendered KaTeX, both display and inline.
    expect(await page.locator('.katex').count()).toBeGreaterThan(20);
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(6);

    // No raw math source is visible anywhere in the article body.
    const visibleText = await visibleArticleText(page);
    expect(visibleText).not.toContain('$$');
    expect(visibleText).not.toContain('\\frac');
    expect(visibleText).not.toContain('\\theta');
    expect(visibleText).not.toContain('\\lambda');
  });

  test('2D FK visualizer renders sliders, readout, and reset (VAL-CLASS-005)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    for (const joint of [BASE, ELBOW, WRIST]) {
      const slider = page.getByRole('slider', joint);
      await expect(slider).toBeVisible();
      await expect(slider).toHaveAttribute('min', '-180');
      await expect(slider).toHaveAttribute('max', '180');
    }
    await expect(page.getByTestId('fk-theta-1')).toBeVisible();
    await expect(page.getByTestId('fk-theta-2')).toBeVisible();
    await expect(page.getByTestId('fk-theta-3')).toBeVisible();
    await expect(page.getByTestId('fk-ee-x')).toBeVisible();
    await expect(page.getByTestId('fk-ee-y')).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
    // The arm itself renders as SVG links with the effector marker.
    await expect(page.getByTestId('fk-link-1')).toBeVisible();
    await expect(page.getByTestId('fk-link-3')).toBeVisible();
    await expect(page.getByTestId('fk-effector-marker')).toBeVisible();
  });

  test('joint sliders drive the arm and readout live (VAL-CLASS-006)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const base = page.getByRole('slider', BASE);
    const elbow = page.getByRole('slider', ELBOW);
    const theta1 = page.getByTestId('fk-theta-1');

    // Default pose: theta1 = 110 degrees.
    await expect(theta1).toHaveText('110°');
    const initialX = await eeValue(page, 'x');
    const initialY = await eeValue(page, 'y');

    // One slider change re-poses the arm and updates both readouts.
    await setSlider(base, 160);
    await expect(theta1).toHaveText('160°');
    expect(await eeValue(page, 'x')).not.toBeCloseTo(initialX, 1);
    expect(await eeValue(page, 'y')).not.toBeCloseTo(initialY, 1);

    // Base-joint sweep with the other joints fixed: the arm rotates rigidly
    // about the base, so x moves monotonically across this range.
    const xs: number[] = [];
    for (const angle of [60, 75, 90, 105, 120]) {
      await setSlider(base, angle);
      xs.push(await eeValue(page, 'x'));
    }
    for (let i = 1; i < xs.length; i += 1) {
      expect(xs[i]).toBeLessThan(xs[i - 1]);
    }

    // A middle joint moves the downstream links and the effector.
    const yBefore = await eeValue(page, 'y');
    await setSlider(elbow, 40);
    expect(await eeValue(page, 'y')).not.toBeCloseTo(yBefore, 1);

    // Keyboard operation: arrow keys on a focused slider move the readout.
    await setSlider(base, 100);
    await expect(theta1).toHaveText('100°');
    await base.focus();
    await page.keyboard.press('ArrowDown');
    await expect(theta1).toHaveText('99°');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(theta1).toHaveText('101°');

    // Reset restores the initial pose and readout values.
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(theta1).toHaveText('110°');
    expect(await eeValue(page, 'x')).toBeCloseTo(initialX, 2);
    expect(await eeValue(page, 'y')).toBeCloseTo(initialY, 2);
  });

  test('playground link works and the arm loads (VAL-CLASS-007, VAL-PLAY-036, VAL-CROSS-005)', async ({
    page,
  }) => {
    // The playground's first frame can take >10s under SwiftShader.
    test.setTimeout(60_000);
    const errors = collectPageErrors(page);
    await page.goto(ROUTE);

    const link = page
      .locator('#main-content')
      .getByRole('link', { name: /3D kinematics playground/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /\/playground\/?$/);

    await link.click();
    await page.waitForURL(/\/playground\/$/);

    // The playground renders its canvas and the SO-101 arm with joint controls.
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const status = page.getByTestId('robot-status');
    await expect(status).not.toHaveText(/loading/i, { timeout: 20_000 });
    await expect(status).toContainText(/so-101/i);
    const sliders = page.getByRole('slider', { name: /joint angle, degrees/ });
    expect(await sliders.count()).toBeGreaterThanOrEqual(6);
    expect(errors).toEqual([]);
  });

  test('DH table headers keep the parameter glyphs in their written case', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const table = page.getByRole('table', { name: /Denavit-Hartenberg/i });
    // innerText reflects the RENDERED text, so it sees any case transform the
    // stylesheet applies where textContent would not. The four DH parameters
    // are mathematical notation and must never be case-folded: under the old
    // uppercase header θi rendered as ΘI, and the ai and αi columns were
    // visually indistinguishable ("AI" next to "ΑΙ").
    const rendered = await table
      .locator('thead th')
      .evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLElement).innerText),
      );
    expect(rendered).toEqual(['Joint i', 'θi', 'di', 'ai', 'αi']);
  });

  test('no horizontal page scroll at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(ROUTE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
