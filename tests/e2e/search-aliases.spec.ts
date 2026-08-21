import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DATASETS } from '../../data/datasets';
import { METHODS } from '../../data/methods';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * VAL-SEARCH-019 and VAL-SEARCH-020 against the shipped artifact.
 *
 * The MiniSearch index is exported to out/search-index.json, so only the
 * static export proves that the alias text actually reached the reader's
 * browser; the dev server would pass on a stale index.
 */

let server: StaticExportServer | null = null;
let BASE: string;

/**
 * Derived, never listed: an entity added to either data file is graded by
 * these tests rather than skipped by them.
 */
const ALIASED = [
  ...METHODS.filter((method) => method.aka.length > 0).map((method) => ({
    kind: 'method' as const,
    id: method.id,
    title: method.name,
    aliases: method.aka,
    route: '/manipulation/comparison-matrix/',
    anchor: `method-${method.id}`,
  })),
  ...DATASETS.filter((dataset) => dataset.aka.length > 0).map((dataset) => ({
    kind: 'dataset' as const,
    id: dataset.id,
    title: dataset.name,
    aliases: dataset.aka,
    route: '/data-hardware/datasets/',
    anchor: `dataset-${dataset.id}`,
  })),
];

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'search-index.json')),
    'out/search-index.json is missing: run `npm run build` before the search-aliases spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

async function typeQuery(page: Page, query: string) {
  const box = page.getByRole('searchbox', { name: 'Search the wiki' });
  await box.fill('');
  await box.pressSequentially(query, { delay: 15 });
}

async function waitForSettled(page: Page) {
  await expect(page.getByRole('status').first()).not.toHaveText(/searching/i, {
    timeout: 15_000,
  });
}

/**
 * The title a reader sees, selected by its own hook rather than by position.
 * A positional `> span:first-child` was correct only while the title was the
 * anchor's first child: adding the snippet row wrapped the title and the type
 * label together, and the selector silently resolved to that wrapper,
 * returning "ACTmethod" for a row rendering perfectly.
 */
async function structuredTitles(page: Page): Promise<string[]> {
  return page
    .getByRole('region', { name: 'Structured' })
    .locator('[data-search-result] [data-entity-title]')
    .allTextContents();
}

test.describe('aliases reach methods and datasets (VAL-SEARCH-020)', () => {
  test('the sample is large enough to satisfy the assertion', async () => {
    expect(ALIASED.filter((entry) => entry.kind === 'method')).toHaveLength(11);
    expect(ALIASED.filter((entry) => entry.kind === 'dataset')).toHaveLength(3);
  });

  for (const entry of ALIASED) {
    for (const alias of entry.aliases) {
      test(`"${alias}" returns ${entry.kind} ${entry.title} first`, async ({
        page,
      }) => {
        await page.goto(`${BASE}/search`);
        await typeQuery(page, alias);
        await waitForSettled(page);
        const titles = await structuredTitles(page);
        expect(
          titles.length,
          `alias "${alias}" returned no structured results at all`,
        ).toBeGreaterThan(0);
        expect(titles[0]).toBe(entry.title);
      });
    }
  }

  test('an alias click reaches the entity, and the alias is not on that route', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'Distributed Robot Interaction Dataset');
    await waitForSettled(page);
    await page
      .getByRole('region', { name: 'Structured' })
      .locator('[data-search-result]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/data-hardware\/datasets\/#dataset-droid/);
    await expect(page.locator('[data-entity-id="dataset-droid"]')).toBeVisible();
  });

  /**
   * VAL-SEARCH-020(c) exempts text a route already presented before this
   * change, and four of these strings were already on their route as citation
   * titles: the π0.6 and π0.7 reference URLs contain "pi06" and "pi07", and
   * the AgiBot World and RoboMIND paper titles contain "Colosseo" and
   * "Multi-embodiment Intelligence Normative Data" verbatim. So a whole-page
   * scan cannot separate a leak from the bibliography that predates it. The
   * entity's own row is where a rendered alias field WOULD appear, so that is
   * what this measures; the citation apparatus is asserted to be the only
   * other place the string survives.
   */
  test('no alias renders in its entity row, and survives only in the bibliography (VAL-SEARCH-020c)', async ({
    page,
  }) => {
    for (const route of [...new Set(ALIASED.map((entry) => entry.route))]) {
      await page.goto(`${BASE}${route}`);
      const onRoute = ALIASED.filter((item) => item.route === route);
      expect(onRoute.length).toBeGreaterThan(0);

      for (const entry of onRoute) {
        const row = page.locator(`[data-entity-id="${entry.anchor}"]`);
        await expect(row).toHaveCount(1);
        const rowText = (await row.innerText()).toLowerCase();
        for (const alias of entry.aliases) {
          expect(
            rowText,
            `alias "${alias}" rendered inside the ${entry.title} row`,
          ).not.toContain(alias.toLowerCase());
        }
      }

      // Strip the bibliography and the citation chips from the LIVE document,
      // then re-scan: what remains is body text this change could have added.
      // The removal must happen in the live tree rather than on a clone,
      // because innerText on a detached node ignores CSS and would surface the
      // collapsed citation tooltips, which no reader sees.
      const body = await page.evaluate(() => {
        document
          .querySelectorAll('[data-reference-id], [data-cite-id], a[href]')
          .forEach((node) => node.remove());
        return document.body.innerText.toLowerCase();
      });
      for (const entry of onRoute) {
        for (const alias of entry.aliases) {
          expect(
            body,
            `alias "${alias}" appears on ${route} outside the citation apparatus`,
          ).not.toContain(alias.toLowerCase());
        }
      }
    }
  });
});

test.describe('an acronym ranks above its prefix collisions (VAL-SEARCH-019)', () => {
  /**
   * Each query is paired with the collision it was chosen for: an indexed term
   * in a non-title field that the query strictly prefixes, which is what pulls
   * unrelated rows into the result set under `prefix: true`.
   */
  const ACRONYMS = [
    { query: 'ACT', title: 'ACT', collides: ['actuator', 'actuators', 'action'] },
    { query: 'act', title: 'ACT', collides: ['actuator', 'actuators', 'action'] },
    { query: 'Octo', title: 'Octo', collides: ['october'] },
    { query: 'pi0', title: '\u03c00', collides: ['pi0.5', 'pi0.6', 'pi0.7'] },
  ];

  for (const entry of ACRONYMS) {
    test(`"${entry.query}" ranks ${entry.title} first, above ${entry.collides.join('/')}`, async ({
      page,
    }) => {
      await page.goto(`${BASE}/search`);
      await typeQuery(page, entry.query);
      await waitForSettled(page);
      const titles = await structuredTitles(page);
      expect(titles.length).toBeGreaterThan(0);
      expect(titles[0]).toBe(entry.title);
    });
  }

  test('the first ACT result is a method row that resolves to a live route', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'ACT');
    await waitForSettled(page);
    const structured = page.getByRole('region', { name: 'Structured' });
    const first = structured.locator('[data-search-result]').first();
    await expect(first.locator('[data-entity-type]')).toHaveAttribute(
      'data-entity-type',
      'method',
    );
    const href = await first.getAttribute('href');
    expect(href).toContain('/manipulation/comparison-matrix/#method-act');
    const response = await page.request.get(
      `${BASE}/manipulation/comparison-matrix/`,
    );
    expect(response.status()).toBe(200);
  });
});
