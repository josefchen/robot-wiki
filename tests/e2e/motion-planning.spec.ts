import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/classical/motion-planning/';

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

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

async function nodeCount(page: Page): Promise<number> {
  const text =
    (await page.getByTestId('rrt-node-readout').textContent()) ?? '';
  const value = Number.parseInt(text, 10);
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

test.describe('classical motion-planning module', () => {
  test('renders full prose on sampling and optimization planning (VAL-CLASS-008)', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    const response = await page.goto(ROUTE);
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Motion Planning' }),
    ).toBeVisible();

    // Sidebar shows the module active under the classical domain.
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Motion Planning' }),
    ).toHaveAttribute('aria-current', 'page');

    const main = page.locator('#main-content');
    // The required strands are all present as rendered prose. The glossary
    // <Term> markup duplicates its text into a hidden tooltip, so match the
    // VISIBLE copy, not the first DOM hit.
    await expect(
      main.getByText(/configuration space/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/rapidly-exploring random tree/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/trajectory optimization/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/CHOMP/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/TrajOpt/i).filter({ visible: true }).first(),
    ).toBeVisible();

    // Substantive long-form body: several hundred words at minimum.
    const visibleText = await visibleArticleText(page);
    expect(visibleText.split(/\s+/).filter(Boolean).length).toBeGreaterThan(
      800,
    );

    // No raw MDX or component source leaks into the rendered page.
    expect(visibleText).not.toContain('import {');
    expect(visibleText).not.toContain('<Cite');
    expect(visibleText).not.toContain('<RrtExplorer');
    expect(errors).toEqual([]);
  });

  test('citation chips resolve and link externally (VAL-CLASS-009, VAL-CLASS-010)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');

    // Primary sources for the main strands, each with its exact href.
    await expect(
      main.getByRole('link', { name: 'LaValle 1998' }).first(),
    ).toHaveAttribute('href', 'https://lavalle.pl/papers/Lav98c.pdf');
    await expect(
      main.getByRole('link', { name: 'Karaman 2011' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/1105.1186');
    await expect(
      main.getByRole('link', { name: 'Ratliff 2009' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.ri.cmu.edu/publications/chomp-gradient-optimization-techniques-for-efficient-motion-planning/',
    );
    await expect(
      main.getByRole('link', { name: 'Schulman 2013' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.roboticsproceedings.org/rss09/p31.pdf',
    );

    // Every chip is a real external link; no unresolved ids render.
    // Scoped to the authored prose: the generated References bibliography
    // also renders target=_blank external links inside main, and with every inline chip deleted its 10 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[target="_blank"][href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(10);
    expect(await main.getByText('missing citation:').count()).toBe(0);

    // A chip is keyboard-focusable and reveals its metadata on focus.
    const rrtChip = main.getByRole('link', { name: 'LaValle 1998' }).first();
    await rrtChip.focus();
    await expect(
      main
        .locator('span[role="tooltip"]')
        .filter({ hasText: 'Rapidly-exploring Random Trees' }),
    ).toBeVisible();
  });

  test('KaTeX renders with no raw math delimiters (VAL-CLASS-011)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    // Configuration-space notation, the extension rule, the RRT* radius
    // schedule and optimality statement, and both optimization objectives
    // all ship as rendered KaTeX, display and inline.
    expect(await page.locator('.katex').count()).toBeGreaterThan(10);
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(
      5,
    );

    const visibleText = await visibleArticleText(page);
    expect(visibleText).not.toContain('$$');
    expect(visibleText).not.toContain('\\mathcal');
    expect(visibleText).not.toContain('\\xi');
    expect(visibleText).not.toContain('\\gamma');
  });

  test('RRT explorer renders scene, obstacles, and controls (VAL-CLASS-012)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const scene = page.getByTestId('rrt-scene');
    await expect(scene).toBeVisible();
    await expect(page.getByTestId('rrt-start')).toBeVisible();
    await expect(page.getByTestId('rrt-goal')).toBeVisible();
    expect(await page.getByTestId(/^rrt-obstacle/).count()).toBe(5);
    await expect(
      page.getByRole('button', { name: /run the exploration/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /step forward/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
    await expect(
      page.getByRole('slider', { name: /exploration iteration/i }),
    ).toBeVisible();
    // Initial readouts: only the root node, no path yet.
    await expect(page.getByTestId('rrt-node-readout')).toHaveText('1');
    await expect(page.getByTestId('rrt-path')).toHaveCount(0);

    // No layout shift: the scene box is stable before and after interaction.
    const before = await scene.boundingBox();
    await page.getByRole('button', { name: /step forward/i }).click();
    const after = await scene.boundingBox();
    expect(after?.width).toBe(before?.width);
    expect(after?.height).toBe(before?.height);
  });

  test('running grows the tree to a highlighted path; reset clears it (VAL-CLASS-013)', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(ROUTE);

    // Step once: one new edge appears.
    await page.getByRole('button', { name: /step forward/i }).click();
    await expect(page.getByTestId('rrt-node-readout')).toHaveText('2');
    expect(await page.locator('[data-testid="rrt-tree"] line').count()).toBe(1);

    // Run to completion: the tree fills in and the path lights up.
    await page.getByRole('button', { name: /run the exploration/i }).click();
    await expect(page.getByTestId('rrt-path')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('rrt-status-readout')).toContainText(
      /goal reached at iteration/i,
    );
    expect(await nodeCount(page)).toBeGreaterThan(100);
    await expect(page.getByTestId('rrt-path-readout')).toContainText(
      /units/i,
    );

    // Reset returns the scene to the initial state.
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(page.getByTestId('rrt-node-readout')).toHaveText('1');
    await expect(page.getByTestId('rrt-path')).toHaveCount(0);
    expect(await page.locator('[data-testid="rrt-tree"] line').count()).toBe(0);
  });

  test('the interactive is keyboard-operable', async ({ page }) => {
    await page.goto(ROUTE);
    const slider = page.getByRole('slider', {
      name: /exploration iteration/i,
    });
    await slider.focus();
    await expect(slider).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('rrt-node-readout')).toHaveText('2');
    // The run control takes focus and toggles with the keyboard.
    const run = page.getByRole('button', { name: /run the exploration/i });
    await run.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', { name: /pause the exploration/i }),
    ).toBeVisible();
    // Stop it again so the spec leaves no timer running.
    await page.keyboard.press('Enter');
  });

  test('reduced motion: exploration advances in coarse discrete jumps (VAL-A11Y-019)', async ({
    browser,
  }) => {
    // Under prefers-reduced-motion the interval playback switches to the
    // coarse cadence (lib/rrt.ts: 340 ms ticks, 25 nodes per tick) instead
    // of smooth per-tick growth. Mutation-checked shape, mirroring the
    // kalman spec: (1) no advance inside the first 150 ms (a smooth-cadence
    // tick fires at 50 ms), then (2) the iteration leaves 0 in multiples of
    // the 25-node coarse jump.
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(ROUTE);
    const readout = page.getByTestId('rrt-iteration-readout');
    await expect(readout).toHaveText(/^0 /);
    await page.getByRole('button', { name: /run the exploration/i }).click();
    // One immediate read, deliberately NOT auto-retrying: absence of
    // advance must be measured once, inside the smooth-tick window.
    await page.waitForTimeout(150);
    expect(await readout.textContent()).toMatch(/^0 /);
    await expect
      .poll(async () => (await readout.textContent()) ?? '', { timeout: 5_000 })
      .not.toMatch(/^0 /);
    const iteration = Number.parseInt(
      ((await readout.textContent()) ?? '0 / x').split(' /')[0],
      10,
    );
    expect(iteration % 25).toBe(0);
    expect(iteration).toBeGreaterThanOrEqual(25);
    await context.close();
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
