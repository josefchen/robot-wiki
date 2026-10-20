import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { publishedModules } from '../../data/modules';
import { forEachInOwnContext } from './helpers/per-route-context';

const ROUTE = '/market-map/';

async function noOverflow(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
}

function segmentTab(page: Page, name: RegExp) {
  return page.getByRole('group', { name: 'Segment' }).getByRole('button', { name });
}

function statusSelect(page: Page) {
  return page.locator('#filter-status');
}

function tiles(page: Page) {
  return page.locator('button[data-map-tile]');
}

function tile(page: Page, id: string) {
  return page.locator(`button[data-map-tile="${id}"]`);
}

/** The open company's details: a side sheet, or a bottom sheet on phones. */
function sheet(page: Page, name: string | RegExp) {
  return page.getByRole('dialog', { name });
}

async function openMoreFilters(page: Page) {
  const toggle = page.getByRole('button', { name: /More filters/ });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(page.locator('#filter-country')).toBeVisible();
}

test.describe('market map visualization', () => {
  test('maps 111 companies in six segments (VAL-MKT-001, VAL-MKT-002)', async ({
    page,
  }) => {
    const response = await page.goto(ROUTE);
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Market Map' }),
    ).toBeVisible();
    await expect(page.getByText('111 of 111 companies')).toBeVisible();
    await expect(tiles(page)).toHaveCount(111);
    await expect(
      page.getByRole('heading', { name: /Foundation models/ }),
    ).toContainText('12');
    // 34 humanoids since the 2026-08-18 audit removed the duplicate
    // galaxea-ai-robot row (a humanoids row): 35 -> 34.
    await expect(page.getByRole('heading', { name: /^Humanoids/ })).toContainText(
      '34',
    );
    await expect(
      page.getByRole('heading', { name: /Industrial \/ logistics/ }),
    ).toContainText('15');
    await expect(
      page.getByRole('heading', { name: /Vertical applications/ }),
    ).toContainText('32');
    await expect(
      page.getByRole('heading', { name: /Simulation \/ tooling/ }),
    ).toContainText('10');
    await expect(page.getByRole('heading', { name: /^Components/ })).toContainText(
      '8',
    );
    await expect(page.getByText(/as of 6 August 2026/i)).toBeVisible();
    // At desktop width the six segments sit side by side: every segment
    // heading starts on the same line, so the whole landscape reads at once.
    const tops = await page.locator('[data-segment] > h2').evaluateAll((headings) =>
      headings.map((heading) => Math.round(heading.getBoundingClientRect().top)),
    );
    expect(tops).toHaveLength(6);
    // Simulation / tooling and Components share the last column.
    expect(new Set(tops.slice(0, 5)).size).toBe(1);
    expect(tops[5]).toBeGreaterThan(tops[4]);
  });

  test('filters compose, deep-link, and clear (VAL-MKT-005 to VAL-MKT-008, VAL-MKT-018)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await segmentTab(page, /^Humanoids/).click();
    await expect(page.getByText('34 of 111 companies')).toBeVisible();
    // 34 tiles for the 34-row humanoids segment (see the heading count
    // above; both oracles must agree).
    await expect(tiles(page)).toHaveCount(34);
    expect(page.url()).toContain('segment=humanoids');

    await openMoreFilters(page);
    await page.getByLabel('Country', { exact: true }).selectOption('US');
    // 6 -> 7 on 2026-10-19 (market-map field audit): 1X Technologies'
    // headquarters moved Oslo -> Palo Alto, as its Wikipedia body states
    // ("headquartered in Palo Alto, California"), so it joins the US
    // humanoids. Its confidence is medium, so the high count stays 4.
    await expect(page.getByText('7 of 111 companies')).toBeVisible();

    await page.getByLabel('Confidence', { exact: true }).selectOption('high');
    // 4 -> 5 on 2026-10-20 (market-map field audit): Persona AI's confidence
    // rose to high (its own site, its October 2026 PR Times release and The
    // AI Insider's POSCO report agree).
    await expect(page.getByText('5 of 111 companies')).toBeVisible();

    const filteredUrl = page.url();
    await page.goto(filteredUrl);
    await expect(page.getByText('5 of 111 companies')).toBeVisible();
    await expect(tiles(page)).toHaveCount(5);
    // Filters arriving with the URL open the fold that holds them.
    await expect(page.locator('#filter-country')).toHaveValue('US');

    await page.getByRole('button', { name: 'Bubble' }).click();
    await expect(page.getByRole('group', { name: /bubble chart/i })).toBeVisible();
    await expect(page.getByText('5 of 111 companies')).toBeVisible();

    await page.getByRole('button', { name: 'Timeline' }).click();
    await expect(page.getByText('5 of 111 companies')).toBeVisible();

    await page.getByRole('button', { name: 'Grid' }).click();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByText('111 of 111 companies')).toBeVisible();
    expect(new URL(page.url()).search).toBe('');
  });

  test('name search narrows the map and lives in the URL', async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByRole('searchbox', { name: 'Search companies by name' }).fill('dyn');
    await expect(page.getByText('3 of 111 companies')).toBeVisible();
    await expect(tiles(page)).toHaveCount(3);
    expect(new URL(page.url()).searchParams.get('q')).toBe('dyn');
    await page.reload();
    await expect(page.getByRole('searchbox', { name: 'Search companies by name' })).toHaveValue('dyn');
    await expect(tiles(page)).toHaveCount(3);
  });

  test('invalid params fall back to the full set (VAL-MKT-024)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(`${ROUTE}?segment=bogus&confidence=999`);
    await expect(page.getByText('111 of 111 companies')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('dependent facets hide zero-count sub-segments (VAL-MKT-025)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const sub = page.locator('#filter-subsegment');
    await expect(sub.locator('option[value="warehouse-automation"]')).toHaveCount(
      1,
    );
    await segmentTab(page, /^Humanoids/).click();
    await expect(sub.locator('option[value="industrial-humanoids"]')).toHaveCount(
      1,
    );
    await expect(sub.locator('option[value="warehouse-automation"]')).toHaveCount(
      0,
    );
  });

  test('company details open in a sheet and keep unknown funding honest (VAL-MKT-009 to VAL-MKT-013)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await tile(page, 'physical-intelligence').click();
    const pi = sheet(page, 'Physical Intelligence');
    await expect(pi).toBeVisible();
    await expect(pi.getByRole('heading', { name: 'Physical Intelligence' })).toBeFocused();
    await expect(page).toHaveURL(/#company-physical-intelligence$/);
    await expect(pi.getByText(/vision-language-action/)).toBeVisible();
    // Target the funding figure by its data field: the source list in the
    // sheet includes a Robot Report link whose TITLE contains "$600M" (a
    // correct title), so a bare getByText collides with it in strict mode.
    // The data-field locator still fails if the figure is wrong.
    await expect(pi.locator('[data-field="amount"]')).toHaveText('$600M');
    await expect(pi.locator('[data-field="valuation"]')).toHaveText('$5.6B');
    await expect(pi.locator('[data-field="confidence"]')).toHaveText('high');
    // The open-source entry was "openpi" until the 2026-10-19 field audit:
    // no fetched source names that repository, and Physical Intelligence's
    // own release says "We are releasing the weights and code for π0 as
    // well as our new π0-FAST autoregressive model."
    const piRelease = 'π0 and π0-FAST (weights and code)';
    await expect(pi.getByText(piRelease)).toBeVisible();
    await expect(pi.getByText('openpi')).toHaveCount(0);
    await expect(pi.getByText('CapitalG, Lux Capital')).toBeVisible();
    await pi.getByRole('button', { name: 'Close Physical Intelligence details' }).click();
    await expect(page.getByText(piRelease)).toHaveCount(0);
    await expect(tile(page, 'physical-intelligence')).toBeFocused();

    await tile(page, 'unitree-robotics').click();
    const unitree = sheet(page, 'Unitree Robotics');
    await expect(unitree.locator('[data-field="status"]')).toHaveText('IPO');
    // VAL-MKT-009 (2026-09-24 qualification): the 5,500-unit 2025
    // shipment, 30,000+ cumulative quadruped and ~33% sales-share
    // literals were press-repeated prospectus figures (Rest of World);
    // the Unitree prospectus itself was never inspected, so the details
    // disclose that scope instead of asserting a count or rank.
    await expect(
      unitree.getByText(/not verified from an inspected Unitree company body/).first(),
    ).toBeVisible();
    await expect(unitree.getByText(/5,500/)).toHaveCount(0);
    await expect(unitree.getByText(/30,000\+/)).toHaveCount(0);
    await expect(unitree.getByText(/33%/)).toHaveCount(0);
    await expect(unitree.getByText(/profitable since 2025/)).toHaveCount(0);

    await tile(page, 'covariant').click();
    const covariant = sheet(page, 'Covariant');
    await expect(covariant.getByText('not disclosed').first()).toBeVisible();
    await expect(covariant).not.toContainText('$0');
  });

  test('timeline renders the 2023-2026 anchors (VAL-MKT-015, VAL-MKT-016)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByRole('button', { name: 'Timeline' }).click();
    await expect(page.getByText('Figure AI')).toBeVisible();
    // Both anchors lost a floor on 2026-10-19 (market-map field audit):
    // Figure's release says the Series C "exceeds $1B" and TechCrunch says
    // Skild's round "values it at more than $14 billion". Neither floor is
    // a figure, so the row prints what is stated and each card carries the
    // floor as a sourced caveat.
    const figureRow = page.locator('[data-timeline-id][data-company-id="figure-ai"]');
    await expect(figureRow).toContainText('not disclosed at $39B');
    await expect(figureRow).not.toContainText('$1B');
    const skildRow = page.locator('[data-timeline-id][data-company-id="skild-ai"]');
    await expect(skildRow).toContainText('$1.4B');
    await expect(skildRow).not.toContainText('$14B');
    await expect(page.getByText('Unitree Robotics')).toBeVisible();

    const unitree = page.locator('[data-company-id="unitree-robotics"]');
    await expect(unitree).toContainText('IPO');

    const figure = page.locator('[data-company-id="figure-ai"]');
    await figure.getByRole('button').click();
    const details = sheet(page, 'Figure AI');
    await expect(details.locator('[data-round-source]')).toContainText(/as of/i);
    await expect(details.locator('[data-round-source] a')).toHaveAttribute(
      'href',
      /^https:\/\//,
    );

    const covariant = page.locator('[data-company-id="covariant"]');
    await covariant.getByRole('button').click();
    await expect(sheet(page, 'Covariant').getByText('not disclosed').first()).toBeVisible();
  });

  test('bubble view excludes null funding and labels axes (VAL-MKT-023)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByRole('button', { name: 'Bubble' }).click();
    const marks = page.locator('circle[data-company-id]');
    const markCount = await marks.count();
    expect(markCount).toBeGreaterThan(0);
    expect(markCount).toBeLessThan(111);
    await expect(page.getByText('Founding year', { exact: true })).toBeVisible();
    await expect(page.getByText(/left off, not drawn at zero/)).toBeVisible();
    await expect(page.locator('circle[data-company-id="covariant"]')).toHaveCount(
      0,
    );
    await page.locator('circle[data-company-id="figure-ai"]').click();
    await expect(sheet(page, 'Figure AI')).toBeVisible();
    await expect(sheet(page, 'Figure AI').locator('[data-field="valuation"]')).toHaveText('$39B');
  });

  test('empty filter state is recoverable (VAL-MKT-017)', async ({ page }) => {
    await page.goto(ROUTE);
    await segmentTab(page, /^Components/).click();
    await openMoreFilters(page);
    await statusSelect(page).selectOption('shut-down');
    await expect(
      page.getByText('No companies match these filters.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page.getByText('111 of 111 companies')).toBeVisible();
  });

  test('acquired and shut-down statuses are truthful (VAL-MKT-022)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await openMoreFilters(page);
    await statusSelect(page).selectOption('acquired');
    await expect(tile(page, 'boston-dynamics')).toBeVisible();
    await expect(tile(page, 'irobot')).toBeVisible();
    await expect(tile(page, 'berkshire-grey')).toBeVisible();
    // pollen-robotics moved private -> acquired on 2026-10-20 (market-map
    // field audit): Hugging Face announced that it had bought the company on
    // 14 April 2025 (its blog).
    await expect(tile(page, 'pollen-robotics')).toBeVisible();
    // abb-robotics moved acquired -> public the same day: ABB and SoftBank
    // signed the sale on 8 October 2025 and expected it to close in
    // mid-to-late 2026, and no fetched source reports that it has closed,
    // so it is still a division of the listed ABB Ltd.
    await expect(tile(page, 'abb-robotics')).toHaveCount(0);
    // mentee-robotics moved private -> acquired on 2026-08-18: Mobileye's
    // Form 8-K records the acquisition completed Feb 3, 2026.
    await expect(tile(page, 'mentee-robotics')).toBeVisible();
    // covariant moved acquired -> private on 2026-10-19 (market-map field
    // audit): Amazon hired its founders and licensed its models, and
    // TechCrunch reports Covariant "will continue operating" under Ted
    // Stinson. No source calls it an acquisition.
    await expect(tile(page, 'covariant')).toHaveCount(0);
    // Each says so on its tile.
    await expect(tile(page, 'boston-dynamics')).toContainText('Acquired');

    await statusSelect(page).selectOption('shut-down');
    await expect(tile(page, 'k-scale-labs')).toBeVisible();
    await expect(tile(page, 'k-scale-labs')).toContainText('Shut down');
    await expect(tiles(page)).toHaveCount(1);
  });

  test('is usable at 375px and has no axe violations (VAL-MKT-019, VAL-MKT-026)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ROUTE);
    await expect(page.getByRole('button', { name: /More filters/ })).toBeVisible();
    expect(await noOverflow(page)).toBe(true);

    await segmentTab(page, /^Humanoids/).click();
    await expect(page.getByText('34 of 111 companies')).toBeVisible();
    await openMoreFilters(page);
    await page.getByRole('button', { name: /More filters/ }).click();
    await expect(page.locator('#filter-country')).toBeHidden();

    await page.getByRole('button', { name: 'Timeline' }).click();
    expect(await noOverflow(page)).toBe(true);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('the details are a modal bottom sheet on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ROUTE);
    await tile(page, 'figure-ai').click();
    const details = sheet(page, 'Figure AI');
    await expect(details).toHaveAttribute('aria-modal', 'true');
    await expect(details).toHaveAttribute('data-company-sheet', 'bottom');
    // The sheet rises to rest on the bottom edge and the page behind it is
    // still.
    const panel = details.locator(':scope > div').nth(1);
    await expect
      .poll(async () => {
        const box = await panel.boundingBox();
        return Math.round((box?.y ?? 0) + (box?.height ?? 0));
      })
      .toBe(844);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    // Tab stays inside the sheet.
    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null),
      ).toBe(true);
    }
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
    // The browser's Back closes it, as on desktop.
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
    expect(await noOverflow(page)).toBe(true);
  });

  test('filter bar is keyboard operable (VAL-MKT-026)', async ({ page }) => {
    await page.goto(ROUTE);
    await segmentTab(page, /^Humanoids/).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('34 of 111 companies')).toBeVisible();
    await page.getByRole('button', { name: 'Timeline' }).press('Enter');
    await expect(page.getByText('Figure AI')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).press('Enter');
    await expect(page.getByText('111 of 111 companies')).toBeVisible();
  });

  test('the map is one tab stop with arrow keys; Enter opens, Escape and Back close', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(page.locator('button[data-map-tile][tabindex="0"]')).toHaveCount(1);
    await tiles(page).first().focus();
    const first = await page.evaluate(() => document.activeElement?.getAttribute('data-map-tile'));
    // Down stays in the column: the next tile is directly below.
    await page.keyboard.press('ArrowDown');
    const below = await page.evaluate(() => document.activeElement?.getAttribute('data-map-tile'));
    expect(below).toBeTruthy();
    expect(below).not.toBe(first);
    const [a, b] = await Promise.all(
      [first, below].map((id) => tile(page, id as string).boundingBox()),
    );
    expect(Math.abs((a?.x ?? 0) - (b?.x ?? 1))).toBeLessThan(2);
    expect(b!.y).toBeGreaterThan(a!.y);
    await page.keyboard.press('ArrowRight');
    const right = await page.evaluate(() => document.activeElement?.getAttribute('data-map-tile'));
    expect(right).not.toBe(below);
    await expect(page.locator('button[data-map-tile][tabindex="0"]')).toHaveCount(1);

    // Enter opens the details and the URL names the company.
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#company-${right}$`));
    await expect(page.getByRole('dialog')).toBeVisible();
    // Escape closes them and hands focus back to the tile.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(tile(page, right as string)).toBeFocused();
    expect(new URL(page.url()).hash).toBe('');

    // Back closes them too, and Forward reopens.
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe('/market-map/');
    await page.goForward();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('uppercase letterspaced micro-labels stay at or under 5 (VAL-DESIGN-010)', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const routes = [
      '/',
      '/glossary/',
      '/market-map/',
      '/playground/',
      ...publishedModules().map((m) => `/${m.domain}/${m.slug}/`),
    ];
    await forEachInOwnContext(
      browser,
      routes,
      async (page, route) => {
        await page.goto(route);
        const count = await page.evaluate(() => {
          let n = 0;
          for (const el of Array.from(document.querySelectorAll('body *'))) {
            if (el.children.length > 0) continue;
            const text = (el.textContent ?? '').trim();
            if (text.length < 3) continue;
            const cs = getComputedStyle(el);
            const fontSize = parseFloat(cs.fontSize);
            if (fontSize > 15) continue;
            const spacing =
              cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
            if (spacing < 0.02 * fontSize) continue;
            const upper =
              cs.textTransform === 'uppercase' ||
              (text === text.toUpperCase() && /[A-Z]/.test(text));
            if (upper) n += 1;
          }
          return n;
        });
        expect(count, `${route} micro-label count`).toBeLessThanOrEqual(5);
      },
      { viewport: { width: 1440, height: 900 } },
    );
  });

  test('demoted micro-labels read as sentence case, not lowercase (VAL-DESIGN-010)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    // These labels were authored in lowercase source text because CSS was
    // uppercasing them. Once the uppercase transform came off they rendered
    // literally lowercase. innerText is the instrument that can see this:
    // it reflects text-transform, textContent does not.
    const cases: ReadonlyArray<{ route: string; labels: readonly string[]; openFolds?: boolean }> = [
      // The generative-video figure is one stage whose visible controls
      // are the two video-model presets.
      {
        route: '/world-models/generative-video/',
        labels: ['Listens to the action', 'Ignores the action'],
      },
      // The reward-weight figure's weighted total, the Eureka replay's labels
      // and the planner figure's controller names sit in "How this was made".
      {
        route: '/rl-sim2real/reward-design-mpc/',
        labels: [
          'Eureka loop, scripted replay',
          'Fitness:',
          'Proposed reward code',
          'Scripted reward statistics',
          'Scripted reflection on the statistics',
          'Weighted total:',
          'Plans ahead: Model-based MPC (iLQR + MuJoCo)',
          'Learned by practice:',
        ],
        openFolds: true,
      },
      // The contact-geometry figure reads its contact count, patch and
      // tolerance as one readout sentence, so its labels are the error
      // control and the scenario that opens the readout. Both sit in the
      // figure's folds, which a reader opens first.
      {
        route: '/rl-sim2real/why-rl-locomotion/',
        labels: ['Contact-model error', 'Locomotion at'],
        openFolds: true,
      },
      // The whole-body-control readouts sit in "How this was made".
      {
        route: '/rl-sim2real/humanoid-wbc/',
        labels: ['Representative:', 'Layers:', 'Fastest loop:', 'Motion data'],
        openFolds: true,
      },
      // The taxonomy figure's one visible control names the form a model
      // imagines; its use tags moved into "Adjust more".
      { route: '/world-models/taxonomy/', labels: ['What it imagines', 'Summary'] },
      { route: '/classical/kinematics/', labels: ['Joint i'] },
      {
        route: '/manipulation/generalist-policies/',
        labels: ['Downloadable:'],
      },
    ];
    for (const { route, labels, openFolds } of cases) {
      await page.goto(route);
      if (openFolds) {
        const summaries = page.locator('article [data-figure-fold] > summary');
        for (let i = 0; i < await summaries.count(); i += 1) {
          const summary = summaries.nth(i);
          await summary.click();
          await expect(summary.locator('..')).toHaveJSProperty('open', true);
        }
      }
      // Match on labels that OPEN an element's rendered text. Substring
      // matching over the whole article would collide with body prose that
      // legitimately contains these phrases lowercase mid-sentence
      // ("two rollouts start from one shared initial frame").
      const openers = await page.evaluate(() =>
        Array.from(document.querySelectorAll('article *'))
          .map((el) => (el as HTMLElement).innerText?.trim() ?? '')
          .filter(Boolean)
          .map((t) => t.slice(0, 60)),
      );
      for (const label of labels) {
        expect(
          openers.filter((t) => t.startsWith(label)),
          `${route} renders "${label}" in sentence case`,
        ).not.toHaveLength(0);
        expect(
          openers.filter((t) => t.startsWith(label.toLowerCase())),
          `${route} no longer renders "${label}" all-lowercase`,
        ).toHaveLength(0);
      }
    }
  });
});
