import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { publishedModules } from '../../data/modules';

const ROUTE = '/market-map/';

async function noOverflow(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
}

function segmentSelect(page: Page) {
  return page.locator('#filter-segment');
}

function statusSelect(page: Page) {
  return page.locator('#filter-status');
}

test.describe('market map visualization', () => {
  test('renders 112 companies grouped by segment (VAL-MKT-001, VAL-MKT-002)', async ({
    page,
  }) => {
    const response = await page.goto(ROUTE);
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Market Map' }),
    ).toBeVisible();
    await expect(page.getByText('112 of 112 companies')).toBeVisible();
    await expect(page.locator('article[data-company-id]')).toHaveCount(112);
    await expect(
      page.getByRole('heading', { name: /Foundation models/ }),
    ).toContainText('12');
    await expect(page.getByRole('heading', { name: /^Humanoids/ })).toContainText(
      '35',
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
  });

  test('filters compose, deep-link, and clear (VAL-MKT-005 to VAL-MKT-008, VAL-MKT-018)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await segmentSelect(page).selectOption('humanoids');
    await expect(page.getByText('35 of 112 companies')).toBeVisible();
    await expect(page.locator('article[data-company-id]')).toHaveCount(35);
    expect(page.url()).toContain('segment=humanoids');

    await page.getByLabel('Country', { exact: true }).selectOption('US');
    await expect(page.getByText('6 of 112 companies')).toBeVisible();

    await page.getByLabel('Confidence', { exact: true }).selectOption('high');
    await expect(page.getByText('4 of 112 companies')).toBeVisible();

    const filteredUrl = page.url();
    await page.goto(filteredUrl);
    await expect(page.getByText('4 of 112 companies')).toBeVisible();
    await expect(page.locator('article[data-company-id]')).toHaveCount(4);

    await page.getByRole('button', { name: 'Bubble' }).click();
    await expect(page.getByRole('img', { name: /bubble chart/i })).toBeVisible();
    await expect(page.getByText('4 of 112 companies')).toBeVisible();

    await page.getByRole('button', { name: 'Timeline' }).click();
    await expect(page.getByText('4 of 112 companies')).toBeVisible();

    await page.getByRole('button', { name: 'Grid' }).click();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByText('112 of 112 companies')).toBeVisible();
    expect(new URL(page.url()).search).toBe('');
  });

  test('invalid params fall back to the full set (VAL-MKT-024)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(`${ROUTE}?segment=bogus&confidence=999`);
    await expect(page.getByText('112 of 112 companies')).toBeVisible();
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
    await segmentSelect(page).selectOption('humanoids');
    await expect(sub.locator('option[value="industrial-humanoids"]')).toHaveCount(
      1,
    );
    await expect(sub.locator('option[value="warehouse-automation"]')).toHaveCount(
      0,
    );
  });

  test('company cards expand and keep unknown funding honest (VAL-MKT-009 to VAL-MKT-013)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const pi = page.locator('article[data-company-id="physical-intelligence"]');
    await expect(pi.getByRole('heading', { name: 'Physical Intelligence' })).toBeVisible();
    await expect(pi.getByText(/vision-language-action/)).toBeVisible();
    await expect(pi.getByText('$600M')).toBeVisible();
    await expect(pi.getByText('$5.6B')).toBeVisible();
    await expect(pi.getByText('high')).toBeVisible();
    await pi.getByRole('button', { name: 'Expand' }).click();
    await expect(pi.getByText('openpi')).toBeVisible();
    await expect(pi.getByText('CapitalG')).toBeVisible();
    await pi.getByRole('button', { name: 'Collapse' }).click();
    await expect(pi.getByText('openpi')).toHaveCount(0);

    const unitree = page.locator('article[data-company-id="unitree-robotics"]');
    await expect(unitree.locator('[data-field="status"]')).toHaveText('IPO');
    await expect(unitree.getByText(/5,500/)).toBeVisible();

    const covariant = page.locator('article[data-company-id="covariant"]');
    await expect(covariant.getByText('not disclosed').first()).toBeVisible();
    await expect(covariant).not.toContainText('$0');
  });

  test('timeline renders the 2023-2026 anchors (VAL-MKT-015, VAL-MKT-016)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByRole('button', { name: 'Timeline' }).click();
    await expect(page.getByText('Figure AI')).toBeVisible();
    await expect(page.getByText('$1B at $39B')).toBeVisible();
    await expect(page.getByText('$1.4B at $14B')).toBeVisible();
    await expect(page.getByText('Unitree Robotics')).toBeVisible();

    const unitree = page.locator('[data-company-id="unitree-robotics"]');
    await expect(unitree).toContainText('IPO');

    const figure = page.locator('[data-company-id="figure-ai"]');
    await figure.getByRole('button').click();
    await expect(figure.getByText(/as of/i).first()).toBeVisible();
    await expect(figure.getByRole('link').first()).toHaveAttribute(
      'href',
      /^https:\/\//,
    );

    const covariant = page.locator('[data-company-id="covariant"]');
    await covariant.getByRole('button').click();
    await expect(covariant.getByText('not disclosed').first()).toBeVisible();
  });

  test('bubble view excludes null funding and labels axes (VAL-MKT-023)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByRole('button', { name: 'Bubble' }).click();
    const marks = page.locator('circle[data-company-id]');
    const markCount = await marks.count();
    expect(markCount).toBeGreaterThan(0);
    expect(markCount).toBeLessThan(112);
    await expect(page.getByText(/Founding year/)).toBeVisible();
    await expect(page.getByText(/excluded for missing/)).toBeVisible();
    await expect(page.locator('circle[data-company-id="covariant"]')).toHaveCount(
      0,
    );
    await page.locator('circle[data-company-id="figure-ai"]').click();
    await expect(page.getByText('Figure AI').first()).toBeVisible();
    await expect(page.getByText('$39B').first()).toBeVisible();
  });

  test('empty filter state is recoverable (VAL-MKT-017)', async ({ page }) => {
    await page.goto(ROUTE);
    await segmentSelect(page).selectOption('components-hardware');
    await statusSelect(page).selectOption('shut-down');
    await expect(
      page.getByText('No companies match these filters.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page.getByText('112 of 112 companies')).toBeVisible();
  });

  test('acquired and shut-down statuses are truthful (VAL-MKT-022)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await statusSelect(page).selectOption('acquired');
    await expect(
      page.locator('article[data-company-id="covariant"]'),
    ).toBeVisible();
    await expect(page.locator('article[data-company-id="irobot"]')).toBeVisible();
    await expect(
      page.locator('article[data-company-id="berkshire-grey"]'),
    ).toBeVisible();
    await expect(
      page.locator('article[data-company-id="abb-robotics"]'),
    ).toBeVisible();

    await statusSelect(page).selectOption('shut-down');
    await expect(
      page.locator('article[data-company-id="k-scale-labs"]'),
    ).toBeVisible();
    await expect(page.locator('article[data-company-id]')).toHaveCount(1);
  });

  test('is usable at 375px and has no axe violations (VAL-MKT-019, VAL-MKT-026)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ROUTE);
    await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible();
    expect(await noOverflow(page)).toBe(true);

    await page.getByRole('button', { name: 'Filters' }).click();
    await segmentSelect(page).selectOption('humanoids');
    await expect(page.getByText('35 of 112 companies')).toBeVisible();
    await page.getByRole('button', { name: 'Close filters' }).click();
    await expect(segmentSelect(page)).toBeHidden();

    await page.getByRole('button', { name: 'Timeline' }).click();
    expect(await noOverflow(page)).toBe(true);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('filter bar is keyboard operable (VAL-MKT-026)', async ({ page }) => {
    await page.goto(ROUTE);
    await segmentSelect(page).focus();
    await segmentSelect(page).selectOption('humanoids');
    await expect(page.getByText('35 of 112 companies')).toBeVisible();
    await page.getByRole('button', { name: 'Timeline' }).press('Enter');
    await expect(page.getByText('Figure AI')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).press('Enter');
    await expect(page.getByText('112 of 112 companies')).toBeVisible();
  });

  test('uppercase letterspaced micro-labels stay at or under 5 (VAL-DESIGN-010)', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const routes = [
      '/',
      '/glossary/',
      '/market-map/',
      '/playground/',
      ...publishedModules().map((m) => `/${m.domain}/${m.slug}/`),
    ];
    for (const route of routes) {
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
    }
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
    const cases: ReadonlyArray<{ route: string; labels: readonly string[] }> = [
      {
        route: '/world-models/generative-video/',
        labels: [
          'Model conditioning',
          'Rollout A action',
          'Rollout B action',
          'Shared initial frame',
        ],
      },
      {
        route: '/rl-sim2real/reward-design-mpc/',
        labels: [
          'Task:',
          'Fitness:',
          'Proposed reward code',
          'Reward statistics from training',
          'Task fitness',
          'Weighted total:',
          'Compute per step:',
          'Model-based MPC (iLQR + MuJoCo)',
        ],
      },
      {
        route: '/rl-sim2real/why-rl-locomotion/',
        labels: ['Contacts:', 'Patch:', 'Tolerance:'],
      },
      {
        route: '/rl-sim2real/humanoid-wbc/',
        labels: ['Representative:', 'Layers:', 'Fastest loop:', 'Motion data'],
      },
      {
        route: '/world-models/taxonomy/',
        labels: [
          'Used for',
          'Selected:',
          'Latent dynamics',
          'Decoder-free latent',
          'Generative video',
          'World-action',
          'Symbolic',
        ],
      },
      { route: '/classical/kinematics/', labels: ['Joint i'] },
      {
        route: '/manipulation/generalist-policies/',
        labels: ['Provenance:'],
      },
    ];
    for (const { route, labels } of cases) {
      await page.goto(route);
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
