import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { collectConsole } from './helpers/console';

const ROUTE = '/adjacent/space/';

const ADJACENT_ROUTES = [
  '/adjacent/autonomous-vehicles/',
  '/adjacent/drones/',
  '/adjacent/surgical/',
  ROUTE,
] as const;

const ADJACENT_TITLES = [
  'Autonomous Vehicles',
  'Drones and Aerial Robotics',
  'Surgical Robotics',
  'Space Robotics',
] as const;

test.describe('adjacent space module', () => {
  test('renders with h1 and substantive article prose (VAL-ADJ-005)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Space Robotics' }),
    ).toBeVisible();

    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toBeVisible();
    const text = (await prose.textContent()) ?? '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    // Concise but substantive, matching the drones module's bar: the
    // 3,000-word floor in VAL-ADJ-001 applies only to autonomous-vehicles.
    expect(words, `article word count (${words})`).toBeGreaterThanOrEqual(1500);

    const fontFamily = await prose.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('font-family'),
    );
    expect(fontFamily.toLowerCase()).toContain('serif');

    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Space Robotics' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });

  test('covers NASA/JPL, ISRU, and orbital robotics (VAL-ADJ-005)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    const text = (await prose.textContent()) ?? '';
    // The three required topic areas, each named in the article.
    expect(text).toMatch(/NASA/);
    expect(text).toMatch(/JPL/);
    expect(text).toMatch(/in-situ resource utilization/);
    expect(text).toMatch(/ISRU/);
    expect(text).toMatch(/orbital/i);
    // Named systems the sections are built on.
    expect(text).toMatch(/Perseverance/);
    expect(text).toMatch(/AEGIS/);
    expect(text).toMatch(/MOXIE/);
    expect(text).toMatch(/Canadarm2/);
    expect(text).toMatch(/Dextre/);
  });

  test('citation chips resolve to primary sources in every topic area (VAL-ADJ-005)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    // NASA/JPL area: AEGIS deployment and Perseverance autonomy records.
    await expect(
      prose.getByRole('link', { name: 'Francis 2017' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1126/scirobotics.aan4582');
    await expect(
      prose.getByRole('link', { name: 'Verma 2023' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1126/scirobotics.adi3099');
    // ISRU area: MOXIE completion and the PRIME-1 lunar drill.
    await expect(
      prose.getByRole('link', { name: 'NASA Jet Propulsion Laboratory 2023' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.jpl.nasa.gov/news/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/',
    );
    await expect(
      prose.getByRole('link', { name: 'NASA 2025' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.nasa.gov/missions/artemis/nasas-lunar-drill-technology-passes-tests-on-the-moon/',
    );
    // Orbital area: ETS-VII, Orbital Express, MEV-1, ADRAS-J.
    await expect(
      prose.getByRole('link', { name: 'Kawano 2001' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.2514/2.3661');
    await expect(
      prose.getByRole('link', { name: 'Friend 2008' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1117/12.783792');
    await expect(
      prose.getByRole('link', { name: 'Northrop Grumman 2025' }).first(),
    ).toHaveAttribute(
      'href',
      'https://news.northropgrumman.com/satellites/Northrop-Grumman-Achieves-First-Ever-Undocking-Between-Two-Commercial-Spacecraft-in-Geosynchronous-Orbit',
    );
    await expect(
      prose.getByRole('link', { name: 'Astroscale 2024' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.astroscale.com/en/news/astroscales-adras-j-achieves-historic-15-meter-approach-to-space-debris',
    );
    const chips = prose.locator('a[href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(10);
  });

  test('orbital robotics milestones table renders completely (VAL-ADJ-007)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const table = page.getByRole('table', {
      name: /five on-orbit robotics milestones/i,
    });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader').first()).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(5);
    const text =
      (await page.locator('div.prose[data-pagefind-body]').textContent()) ?? '';
    expect(text).not.toContain('import {');
    expect(text).not.toContain('<Cite');
    expect(text).not.toContain('<Term');
    expect(text).not.toContain('<OrbitalServicingTable');
    expect(text).not.toContain('$$');
  });

  test('wiki apparatus renders: see also, linked from, references', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 2, name: 'References' }),
    ).toBeVisible();
    // The surgical sibling links back from its closing prose, so the
    // Linked from section must list it.
    const linkedFrom = page.locator('section[data-section="linked-from"]');
    await expect(linkedFrom).toBeVisible();
    await expect(
      linkedFrom.getByRole('link', { name: 'Surgical Robotics' }),
    ).toBeVisible();
    const seeAlso = page.locator('section[data-section="see-also"]');
    await expect(seeAlso).toBeVisible();
    expect(await seeAlso.getByRole('link').count()).toBeGreaterThanOrEqual(2);
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

test.describe('adjacent cross-cutting (VAL-ADJ-008 through 011)', () => {
  test('sidebar lists all four adjacent modules and navigates with active highlight (VAL-ADJ-008)', async ({
    page,
  }) => {
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await page.goto(ROUTE);
    for (const title of ADJACENT_TITLES) {
      await expect(nav.getByRole('link', { name: title })).toBeVisible();
    }
    // Click through two entries and confirm the route and the highlight.
    await nav.getByRole('link', { name: 'Surgical Robotics' }).click();
    await expect(page).toHaveURL('/adjacent/surgical/');
    await expect(
      nav.getByRole('link', { name: 'Surgical Robotics' }),
    ).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Space Robotics' }).click();
    await expect(page).toHaveURL(ROUTE);
    await expect(
      nav.getByRole('link', { name: 'Space Robotics' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('home page links all four adjacent modules (VAL-ADJ-009)', async ({
    page,
  }) => {
    await page.goto('/');
    // The contract leg is ON the home page itself, in main: four anchors
    // whose accessible name is the exact module title, each href resolving
    // to its /adjacent/<slug> route. The sidebar also lists the modules
    // (VAL-ADJ-008), so the assertion is scoped to main to keep the two
    // surfaces distinct and to fail if the home body ever drops back to
    // linking only the /adjacent/ domain landing.
    const main = page.locator('#main-content');
    for (let i = 0; i < ADJACENT_TITLES.length; i++) {
      const link = main
        .getByRole('link', { name: ADJACENT_TITLES[i], exact: true })
        .first();
      await expect(link).toBeVisible();
      expect(await link.getAttribute('href')).toBe(ADJACENT_ROUTES[i]);
    }
    // Each anchor navigates to a real page: correct route, 200, h1.
    for (let i = 0; i < ADJACENT_TITLES.length; i++) {
      await page.goto('/');
      await main
        .getByRole('link', { name: ADJACENT_TITLES[i], exact: true })
        .first()
        .click();
      await expect(page).toHaveURL(ADJACENT_ROUTES[i]);
      const response = await page.goto(ADJACENT_ROUTES[i]);
      expect(response?.ok(), `${ADJACENT_ROUTES[i]} serves 200`).toBe(true);
      await expect(
        page.getByRole('heading', { level: 1, name: ADJACENT_TITLES[i] }),
      ).toBeVisible();
    }
  });

  for (let i = 0; i < ADJACENT_ROUTES.length; i++) {
    test(`no console errors on ${ADJACENT_ROUTES[i]} (VAL-ADJ-010)`, async ({
      page,
    }) => {
      // Shared collector with the documented-benign ERR_ABORTED
      // prefetch-cancel filter (tests/e2e/helpers/console.ts); the
      // assertion below is unchanged from the local filter it replaced.
      const { errors } = collectConsole(page);
      await page.goto(ADJACENT_ROUTES[i]);
      // Let any lazy work settle before reading the log.
      await page.waitForLoadState('networkidle');
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test(`zero axe violations on ${ADJACENT_ROUTES[i]} (VAL-ADJ-011)`, async ({
      page,
    }) => {
      await page.goto(ADJACENT_ROUTES[i]);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
