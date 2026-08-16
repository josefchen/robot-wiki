import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAIN_META, DOMAINS, publishedModules } from '../../data/modules';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * Final integration sweep for the go-public pass, against the shipped
 * static export (out/), not the dev server: navigation behaviors that
 * only exist in the exported artifact (history restoration survives real
 * document loads) and the reachability/highlight contracts a first-time
 * visitor exercises.
 *
 * VAL-CROSS-026: back/forward restores application state across the
 *   / -> module -> /search?q=... -> /market-map?segment=... sequence.
 * VAL-CROSS-003 + VAL-NAV-010: sidebar-only reachability, one non-first
 *   module per domain plus market map and playground.
 * VAL-CROSS-021: the sidebar active highlight tracks the current route
 *   across sequential client-side navigations, including a cross-domain
 *   jump.
 *
 * The first two use the static export because the history spec navigates
 * by document URL (fresh loads make state restoration meaningful) and the
 * sidebar-only spec starts from the exported home page's default state.
 */

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the go-public-integration spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

function nav(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
}

/**
 * The one invariant VAL-CROSS-021 actually states: at any moment exactly
 * one sidebar link is active. Sections collapse when their domain is left
 * (the sidebar auto-expands only the active route's group), so asserting
 * a previous link LOST the attribute fails on "element not found" once
 * its group collapses, which is correct product behavior, not a defect.
 * Counting active links sidesteps DOM presence entirely.
 */
async function expectSingleActive(
  page: import('@playwright/test').Page,
  expectedTitle: string,
) {
  const sidebar = nav(page);
  const activeTitles = await sidebar
    .getByRole('link')
    .evaluateAll((links) =>
      links
        .filter((l) => l.getAttribute('aria-current') === 'page')
        .map((l) => l.textContent?.trim() ?? ''),
    );
  expect(activeTitles).toEqual([expectedTitle]);
}

test.describe('browser back/forward restores application state (VAL-CROSS-026)', () => {
  test('history steps restore the module, the search query, and the market-map filter', async ({
    page,
  }) => {
    // The exact sequence from the assertion: / -> module -> /search?q= ->
    // /market-map?segment=. Each step is a real navigation so the history
    // stack has four distinct entries with state to restore.
    await page.goto(`${BASE}/`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const moduleUrl = `${BASE}/manipulation/action-chunking/`;
    await page.goto(moduleUrl);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Action Chunking (ACT and ALOHA)',
      }),
    ).toBeVisible();

    const searchUrl = `${BASE}/search/?q=flow%20matching`;
    await page.goto(searchUrl);
    const searchBox = page.getByRole('searchbox', { name: 'Search the wiki' });
    await expect(searchBox).toHaveValue('flow matching');
    await expect(
      page
        .locator('#main-content')
        .getByText(/flow matching/i)
        .first(),
    ).toBeVisible();

    const marketUrl = `${BASE}/market-map/?segment=humanoids`;
    await page.goto(marketUrl);
    await expect(page.getByText('35 of 112 companies')).toBeVisible();

    // Back: the filtered market-map state gives way to the populated
    // search view (query and results intact), not a blank page.
    await page.goBack();
    await expect(page).toHaveURL(/\/search\/\?q=flow%20matching/);
    await expect(searchBox).toHaveValue('flow matching');
    await expect(
      page
        .locator('#main-content')
        .getByText(/flow matching/i)
        .first(),
    ).toBeVisible();

    // Back again: the module page renders its heading.
    await page.goBack();
    await expect(page).toHaveURL(/\/manipulation\/action-chunking\//);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Action Chunking (ACT and ALOHA)',
      }),
    ).toBeVisible();

    // Back to the home page.
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Forward re-applies each state in order.
    await page.goForward();
    await expect(page).toHaveURL(/\/manipulation\/action-chunking\//);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Action Chunking (ACT and ALOHA)',
      }),
    ).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/search\/\?q=flow%20matching/);
    await expect(searchBox).toHaveValue('flow matching');

    await page.goForward();
    await expect(page).toHaveURL(/\/market-map\/\?segment=humanoids/);
    await expect(page.getByText('35 of 112 companies')).toBeVisible();
  });

  test('back from a client-side navigation restores the previous route', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);
    await nav(page).getByRole('link', { name: 'Market Map' }).click();
    await expect(page).toHaveURL(/\/market-map\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/\/market-map\/$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Market Map' }),
    ).toBeVisible();
  });
});

test.describe('sidebar-only reachability (VAL-CROSS-003, VAL-NAV-010)', () => {
  // A non-first published module per domain (the assertion's sampling
  // rule): reaching it requires expanding the domain section, which a
  // first-time visitor must be able to do without any other entry point.
  const published = publishedModules();
  const sampled = DOMAINS.flatMap((domain) => {
    const modules = published.filter((m) => m.domain === domain);
    // The registry-ordered second module when it exists, else the first.
    // All seven domains have at least two published modules today; the
    // filter keeps the spec honest if that ever changes.
    const target = modules[1] ?? modules[0];
    return target ? [{ domain, target }] : [];
  });

  test('every domain has a non-first module to sample', () => {
    expect(sampled.map((s) => s.domain).sort()).toEqual([...DOMAINS].sort());
  });

  for (const { domain, target } of sampled) {
    test(`sidebar-only navigation reaches ${domain}/${target.slug}`, async ({
      page,
    }) => {
      await page.goto(`${BASE}/`);
      const sidebar = nav(page);
      const group = sidebar.getByRole('button', {
        name: DOMAIN_META[domain].name,
      });
      await group.click();
      await expect(group).toHaveAttribute('aria-expanded', 'true');

      const link = sidebar.getByRole('link', { name: target.title });
      await link.click();

      // Lands on the module page: correct URL, correct h1, no 404.
      await page.waitForURL(`${BASE}/${domain}/${target.slug}/`);
      const response = await page.goto(`/${domain}/${target.slug}/`);
      expect(response?.ok()).toBe(true);
      await expect(page.locator('h1')).toHaveText(target.title);

      // The sidebar highlights exactly this module afterwards.
      await expect(
        sidebar.getByRole('link', { name: target.title }),
      ).toHaveAttribute('aria-current', 'page');
    });
  }

  test('sidebar-only navigation reaches Market Map and Playground', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);
    const sidebar = nav(page);
    await sidebar.getByRole('link', { name: 'Market Map' }).click();
    await page.waitForURL(/\/market-map\/$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Market Map' }),
    ).toBeVisible();

    await sidebar.getByRole('link', { name: 'Playground' }).click();
    await page.waitForURL(/\/playground\/$/);
    await expect(
      page.getByRole('heading', { level: 1, name: /playground/i }),
    ).toBeVisible();
  });
});

test.describe('sidebar active highlight across sequential navigations (VAL-CROSS-021)', () => {
  test('A -> B -> C including a cross-domain jump keeps exactly one active entry', async ({
    page,
  }) => {
    await page.goto(`${BASE}/manipulation/action-chunking/`);
    const sidebar = nav(page);
    const actionChunking = sidebar.getByRole('link', {
      name: 'Action Chunking (ACT and ALOHA)',
    });
    await expect(actionChunking).toHaveAttribute('aria-current', 'page');

    // A: in-prose internal link to diffusion-policy (same domain).
    await page
      .getByRole('link', { name: /diffusion policy/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/manipulation\/diffusion-policy\//);
    const diffusion = sidebar.getByRole('link', {
      name: 'Diffusion Policy',
    });
    await expect(diffusion).toHaveAttribute('aria-current', 'page');
    await expectSingleActive(page, 'Diffusion Policy');

    // B: cross-domain jump via the sidebar to a classical module.
    const classicalGroup = sidebar.getByRole('button', {
      name: DOMAIN_META.classical.name,
    });
    await classicalGroup.click();
    const kinematics = sidebar.getByRole('link', { name: 'Kinematics' });
    await kinematics.click();
    await expect(page).toHaveURL(/\/classical\/kinematics\//);
    await expect(kinematics).toHaveAttribute('aria-current', 'page');
    await expectSingleActive(page, 'Kinematics');
    // The parent section of the active module is expanded.
    await expect(classicalGroup).toHaveAttribute('aria-expanded', 'true');

    // C: search click-through back into manipulation.
    await page.goto(`${BASE}/search/?q=temporal%20ensembling`);
    const proseHit = page
      .locator('#main-content')
      .getByRole('link', { name: /action chunking/i })
      .first();
    await proseHit.click();
    await expect(page).toHaveURL(/\/manipulation\/action-chunking\//);
    await expect(actionChunking).toHaveAttribute('aria-current', 'page');
    await expectSingleActive(page, 'Action Chunking (ACT and ALOHA)');
  });
});
