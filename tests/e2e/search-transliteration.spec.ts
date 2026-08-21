import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * VAL-SEARCH-016/017/018 against the shipped artifact.
 *
 * Two tokenizer defects, measured on the pre-fix export (2026-08-21):
 *
 * 016 — the model family is stored with a literal Greek pi in its display
 * name (data/methods.ts: 'π0'), and MiniSearch's fuzzy distance cannot
 * bridge Levenshtein('pi0', 'π0') = 2 against a maximum of 1. The ASCII
 * query "pi0" returned exactly one result, the Physical Intelligence
 * COMPANY, whose alias list contains 'Pi'. The reader asking for the model
 * was handed the lab.
 *
 * 017 — the query tokenizer split on whitespace and dashes then stripped
 * remaining punctuation inside the token, while the content tokenizer split
 * on every non-alphanumeric. "pi0.5" became the query token "pi05" and the
 * content words ["pi0", "5"], so isGenuineHit discarded hits Pagefind had
 * genuinely returned. Measured pre-fix prose-result counts: pi0.5 → 0,
 * pi0.7 → 0, N1.7 → 0, "GR00T N1.7" → 0, v1.1 → 0, with raw Pagefind
 * returning 6, 5, 6, 6 and 1 hits for those same queries.
 *
 * 018 — the cheapest way to make a period-bearing query match is to split
 * on the period, which also makes the two-character query "zq" match the
 * initialled name "Z. Zhao". The negative side below pins that boundary in
 * the same run as the positive side, matching the four negatives pinned by
 * tests/unit/search.test.ts.
 */

const ASCII_TO_METHOD: Array<{ query: string; entityId: string; greek: string }> =
  [
    { query: 'pi0', entityId: 'pi0', greek: '\u03c00' },
    { query: 'pi0-FAST', entityId: 'pi0-fast', greek: '\u03c00-FAST' },
    { query: 'pi0.5', entityId: 'pi05', greek: '\u03c00.5' },
    { query: 'pi0.6', entityId: 'pi06', greek: '\u03c00.6' },
    { query: 'pi0.7', entityId: 'pi07', greek: '\u03c00.7' },
  ];

const VERSION_QUERIES = [
  'pi0.5',
  'pi0.7',
  'N1.7',
  'GR00T N1.7',
  'Gemini Robotics 1.5',
  'v1.1',
];

const GARBAGE_QUERIES = ['zzqqxx', 'zq', 'zz-qq-xx', 'sim-to-zzz'];

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'pagefind', 'pagefind.js')),
    'out/ is missing or stale: run `npm run build` before this spec',
  ).toBe(true);
  expect(
    existsSync(join(outDir, 'search-index.json')),
    'out/search-index.json is missing: the structured index was not exported',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

async function search(page: Page, query: string) {
  await page.goto(`${BASE}/search`);
  const box = page.getByRole('searchbox', { name: 'Search the wiki' });
  await box.fill('');
  await box.pressSequentially(query, { delay: 15 });
  await expect(page.getByRole('status').first()).not.toHaveText(/searching/i, {
    timeout: 15_000,
  });
}

function structuredLinks(page: Page) {
  return page
    .locator('[data-results-group="structured"] a[data-search-result]');
}

function proseLinks(page: Page) {
  return page.locator('[data-results-group="prose"] a[data-search-result]');
}

test.describe('VAL-SEARCH-016 ASCII spellings of Greek-lettered names', () => {
  for (const entry of ASCII_TO_METHOD) {
    test(`"${entry.query}" ranks its own model row first and resolves`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await search(page, entry.query);

      const links = structuredLinks(page);
      await expect(
        links.first(),
        `"${entry.query}" must return at least one structured result`,
      ).toBeVisible();

      const href = await links.first().getAttribute('href');
      expect(
        href,
        `the first structured result for "${entry.query}" must be the model row`,
      ).toContain(`#method-${entry.entityId}`);

      // The destination resolves rather than 404s, and names the model.
      const response = await page.request.get(
        `${BASE}${(href ?? '').split('#')[0]}`,
      );
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain(`method-${entry.entityId}`);
    });

    test(`the Greek form "${entry.greek}" still ranks it first (additive)`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await search(page, entry.greek);
      const href = await structuredLinks(page).first().getAttribute('href');
      expect(
        href,
        `Greek query "${entry.greek}" must not regress`,
      ).toContain(`#method-${entry.entityId}`);
    });
  }
});

test.describe('VAL-SEARCH-017 version-numbered queries reach the prose results', () => {
  for (const query of VERSION_QUERIES) {
    test(`"${query}" returns prose results whose destination contains it verbatim`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await search(page, query);

      const links = proseLinks(page);
      const count = await links.count();
      expect(
        count,
        `"${query}" must return at least one prose result`,
      ).toBeGreaterThan(0);

      const hrefs = await links.evaluateAll((els) =>
        els.map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? ''),
      );

      // At least one destination contains the query verbatim. Pagefind ranks
      // by relevance and legitimately returns near matches alongside, so the
      // assertion is on the set, not on every member of it.
      let verbatimHits = 0;
      for (const href of hrefs) {
        const response = await page.request.get(`${BASE}${href}`);
        expect(response.status(), `${href} must resolve`).toBe(200);
        const text = (await response.text())
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .toLowerCase();
        if (text.includes(query.toLowerCase())) verbatimHits += 1;
      }
      expect(
        verbatimHits,
        `at least one destination for "${query}" must contain it verbatim`,
      ).toBeGreaterThan(0);

      // The excerpt carries a highlighted span, i.e. the index really matched.
      const marks = await page
        .locator('[data-results-group="prose"] .search-excerpt mark')
        .count();
      expect(marks, `"${query}" excerpts must carry <mark> spans`).toBeGreaterThan(
        0,
      );
    });
  }
});

test.describe('VAL-SEARCH-018 loosening tokenization admits no garbage', () => {
  for (const query of GARBAGE_QUERIES) {
    test(`"${query}" still returns zero prose results`, async ({ page }) => {
      test.setTimeout(90_000);
      await search(page, query);
      await expect(
        proseLinks(page),
        `"${query}" must not survive the genuineness filter`,
      ).toHaveCount(0);
      await expect(
        page.locator('[data-results-group="prose"]'),
      ).toContainText(`No module prose matches "${query}"`);
    });
  }
});
