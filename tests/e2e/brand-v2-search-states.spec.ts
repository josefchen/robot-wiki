import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './brand-v2-static-fixture';
import {
  SEARCH_DESKTOP_VIEWPORT,
  SEARCH_MOBILE_VIEWPORT,
  SEARCH_STATES_EVIDENCE_PATH,
  SEARCH_STATE_IDS,
  SEARCH_RESULT_STATE_IDS,
  SEARCH_MOBILE_STATE_IDS,
  SEARCH_FACET_OPTIONS,
  SEARCH_SELECTION_RGB,
  facetStateId,
  readSearchStatesEvidence,
  searchAnnouncementVerdicts,
  searchDataDerivationVerdicts,
  searchFacetMemberId,
  searchFacetSelectionVerdicts,
  searchMobileFitVerdicts,
  searchStateMemberId,
  searchStateTreatmentVerdicts,
  searchStatesEvidenceFingerprint,
  type SearchStateObservation,
  type SearchStatesEvidence,
} from '../../lib/brand-v2-search-evidence';

const ROOT = process.cwd();

async function disableStructuredSearchIndex(page: Page) {
  await page.route('**/search-index.json', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{}',
    }),
  );
}

async function disablePagefindIndex(page: Page) {
  await page.route('**/pagefind/pagefind.js', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'text/javascript',
      body: 'search index unavailable',
    }),
  );
}

async function settle(page: Page) {
  await expect(page.getByRole('status').first()).not.toContainText(
    /searching/i,
    { timeout: 15_000 },
  );
}

test.describe('brand-v2-search-states', () => {
  test('covers deterministic results, Methods facet, URL sync, focus retention, and recovery', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/search/`);
    const input = page.getByRole('searchbox', { name: 'Search the wiki' });
    await input.fill('action chunking');
    await expect(page.getByRole('status').first()).not.toContainText(/searching/i);
    const methods = page.getByRole('button', { name: /^Methods/ }).first();
    await methods.click();
    await expect(methods).toBeFocused();
    expect(page.url()).toContain('q=action');
    await input.fill('quartz-lantern-7319');
    await expect(page.getByRole('status').first()).toContainText(
      /No article prose and no method, company or dataset entity matches/,
    );
  });

  test('shows the product unavailable state when both search indexes fail', async ({
    page,
    staticBase,
  }) => {
    await disablePagefindIndex(page);
    await disableStructuredSearchIndex(page);
    await page.goto(`${staticBase}/search/`);
    await page
      .getByRole('searchbox', { name: 'Search the wiki' })
      .fill('action chunking');

    await expect(page.getByRole('status').first()).toHaveText(
      'The search index is unavailable',
    );
    await expect(page.getByRole('note')).toContainText(
      /search index is unavailable in this environment/i,
    );
  });

  test('keeps the later query when an earlier request resolves after it', async ({
    page,
    staticBase,
  }) => {
    await page.route('**/pagefind/pagefind.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: `
          window.__brandV2SearchRequests = [];
          window.__brandV2SearchCompletions = [];
          let releaseFirst;
          window.__brandV2ReleaseFirstSearch = () => releaseFirst?.();
          export async function search(query) {
            window.__brandV2SearchRequests.push(query);
            if (query === 'first query') {
              await new Promise((resolve) => {
                releaseFirst = resolve;
              });
            }
            const later = query === 'second query';
            window.__brandV2SearchCompletions.push(query);
            return {
              results: [{
                data: async () => ({
                  url: later
                    ? '/manipulation/diffusion-policy/'
                    : '/manipulation/action-chunking/',
                  meta: {
                    title: later ? 'Diffusion Policy' : 'Action Chunking',
                  },
                  excerpt: later ? 'second query result' : 'first query result',
                  content: later ? 'second query result' : 'first query result',
                }),
              }],
            };
          }
        `,
      }),
    );
    await disableStructuredSearchIndex(page);
    await page.goto(`${staticBase}/search/`);
    const input = page.getByRole('searchbox', { name: 'Search the wiki' });

    await input.fill('first query');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & { __brandV2SearchRequests?: string[] }
            ).__brandV2SearchRequests ?? [],
        ),
      )
      .toContain('first query');

    await input.fill('second query');
    await expect(page.getByRole('link', { name: /^Diffusion Policy/ })).toBeVisible();
    await page.evaluate(() => {
      (
        window as Window & {
          __brandV2ReleaseFirstSearch?: () => void;
        }
      ).__brandV2ReleaseFirstSearch?.();
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & {
                __brandV2SearchCompletions?: string[];
              }
            ).__brandV2SearchCompletions ?? [],
        ),
      )
      .toContain('first query');
    await expect(page.getByRole('link', { name: /^Diffusion Policy/ })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /^Action Chunking/ }),
    ).toHaveCount(0);
  });

  // The states below are the brand-v2 discovery search contract
  // (VAL-B2-DISC-001..004/007). Each one is driven deterministically: the
  // error states through route interception, the loading state through a
  // pagefind module that resolves only when the test releases it, and the
  // facet/clear/reset states through the real shipped index.

  test('a first query in flight shows an explicit loading row in both groups', async ({
    page,
    staticBase,
  }) => {
    await page.route('**/pagefind/pagefind.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: `
          window.__brandV2SearchRequests = [];
          let release;
          window.__brandV2ReleaseSearch = () => release?.();
          export async function search(query) {
            window.__brandV2SearchRequests.push(query);
            await new Promise((resolve) => { release = resolve; });
            return { results: [] };
          }
        `,
      }),
    );
    await disableStructuredSearchIndex(page);
    await page.goto(`${staticBase}/search/`);
    const input = page.getByRole('searchbox', { name: 'Search the wiki' });
    await input.fill('action chunking');

    // Both groups render a deterministic, non-animated loading row while
    // the first query resolves. The live region carries the announcement,
    // so the placeholder rows themselves stay out of the tree name.
    const loading = page.locator('[data-search-loading]');
    await expect(loading).toHaveCount(2);
    await expect(loading.first()).toBeVisible();
    await expect(loading.first()).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.animate-spin')).toHaveCount(0);
    await expect(page.getByRole('status').first()).toContainText(
      /Searching for/,
    );

    // The release only works once the debounced search has actually
    // started, so wait for the request log before releasing it.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & { __brandV2SearchRequests?: string[] }
            ).__brandV2SearchRequests ?? [],
        ),
      )
      .toContain('action chunking');
    await page.evaluate(() => {
      (
        window as Window & { __brandV2ReleaseSearch?: () => void }
      ).__brandV2ReleaseSearch?.();
    });
    await settle(page);
    await expect(loading).toHaveCount(0);
  });

  test('reports a prose-index failure per group instead of an empty result', async ({
    page,
    staticBase,
  }) => {
    await disablePagefindIndex(page);
    await page.goto(`${staticBase}/search/`);
    const input = page.getByRole('searchbox', { name: 'Search the wiki' });
    await input.fill('action chunking');
    await settle(page);

    // The failed group says its index failed; it must not claim the query
    // matched nothing, which would fabricate a result for a broken index.
    const prose = page.getByRole('region', { name: 'Modules' });
    await expect(
      prose.locator('[data-search-group-error="prose"]'),
    ).toBeVisible();
    await expect(prose).not.toContainText(/no module prose matches/i);

    // The healthy surface still answers, and the site-wide "nothing
    // matches" message stays down because one surface was never answered.
    const structured = page.getByRole('region', { name: 'Structured' });
    await expect(
      structured.locator('[data-search-result]').first(),
    ).toBeVisible();
    await expect(page.locator('[data-search-empty]')).toHaveCount(0);
    await expect(
      page.getByRole('status').first(),
    ).toContainText(/module index is unavailable/i);

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
  });

  test('reports a structured-index failure per group instead of an empty result', async ({
    page,
    staticBase,
  }) => {
    await disableStructuredSearchIndex(page);
    await page.goto(`${staticBase}/search/`);
    const input = page.getByRole('searchbox', { name: 'Search the wiki' });
    await input.fill('action chunking');
    await settle(page);

    const structured = page.getByRole('region', { name: 'Structured' });
    await expect(
      structured.locator('[data-search-group-error="structured"]'),
    ).toBeVisible();
    await expect(structured).not.toContainText(
      /no structured (entities|results) match/i,
    );

    const prose = page.getByRole('region', { name: 'Modules' });
    await expect(
      prose.locator('[data-search-result]').first(),
    ).toBeVisible();
    await expect(page.locator('[data-search-empty]')).toHaveCount(0);
    await expect(
      page.getByRole('status').first(),
    ).toContainText(/entity index is unavailable/i);
  });

  test('selected facets use lime with a marker and reset by keyboard', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/search/`);
    const input = page.getByRole('searchbox', { name: 'Search the wiki' });
    await input.fill('action chunking');
    await settle(page);

    const bar = page.getByRole('group', { name: 'Filter by type' });
    const methods = bar.getByRole('button', { name: /^Methods/ });
    await methods.click();

    // Selection is lime plus an independent shape marker plus semantics,
    // never colour alone (VAL-B2-DISC-003).
    await expect(methods).toHaveAttribute('aria-pressed', 'true');
    await expect(methods).toHaveCSS('background-color', 'rgb(198, 255, 25)');
    await expect(methods.locator('[data-facet-check]')).toBeVisible();
    await expect(methods).toContainText('Methods');

    // Deterministic filtering: every visible row is a method row.
    const structured = page.getByRole('region', { name: 'Structured' });
    const types = await structured
      .locator('[data-entity-type]')
      .allTextContents();
    expect(types.length).toBeGreaterThan(0);
    expect(types.every((label) => /method/i.test(label))).toBe(true);

    // Keyboard reset: the facet options are real buttons reachable by
    // Tab, and the All-types control clears the selection by keyboard.
    const allTypes = bar.getByRole('button', { name: /^All types/ });
    await allTypes.focus();
    await page.keyboard.press('Enter');
    await expect(allTypes).toHaveAttribute('aria-pressed', 'true');
    await expect(methods).toHaveAttribute('aria-pressed', 'false');
    const restored = await structured
      .locator('[data-entity-type]')
      .allTextContents();
    expect(restored.length).toBeGreaterThan(types.length);

    // Keyboard selection of the facet itself.
    await methods.focus();
    await page.keyboard.press('Enter');
    await expect(methods).toHaveAttribute('aria-pressed', 'true');
    await expect(methods).toHaveCSS('background-color', 'rgb(198, 255, 25)');
  });

  test('the input clear control returns to idle, syncs the URL, and holds focus', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/search/`);
    const input = page.getByRole('searchbox', { name: 'Search the wiki' });
    await input.fill('action chunking');
    await settle(page);

    const clear = page.getByRole('button', { name: 'Clear search' });
    await expect(clear).toBeVisible();
    await clear.click();

    await expect(
      page.getByText(/type a query to search/i),
    ).toBeVisible();
    await expect(page.locator('[data-search-result]')).toHaveCount(0);
    await expect(page).toHaveURL(/\/search\/?$/);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('');
    await expect(clear).toHaveCount(0);
  });

  test('result titles stay clean and match their destination heading', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(60_000);
    const queries = ['diffusion policy', 'kalman filter', 'world model'];
    for (const query of queries) {
      await page.goto(`${staticBase}/search/`);
      const input = page.getByRole('searchbox', { name: 'Search the wiki' });
      await input.fill(query);
      await settle(page);
      const first = page
        .getByRole('region', { name: 'Modules' })
        .locator('[data-search-result]')
        .first();
      await expect(first).toBeVisible();
      const title = (await first.locator('[data-result-title]').textContent())?.trim();
      expect(title, `title for "${query}"`).toBeTruthy();
      expect(title!).not.toMatch(/\s[-|]\s*robot-wiki\s*$/i);
      expect(title!).not.toMatch(/\s[-|]\s*robot-atlas\s*$/i);
      expect(title!).not.toMatch(/[\s|-]+$/);

      const href = await first.getAttribute('href');
      expect(href).toBeTruthy();
      const response = await page.goto(`${staticBase}${href}`);
      expect(response?.status()).toBe(200);
      const heading = await page.locator('h1').first().textContent();
      expect(heading?.trim()).toBe(title);
    }
  });

  test('results, facets, and clear controls fit inside 375px', async ({
    page,
    staticBase,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${staticBase}/search/`);
    const input = page.getByRole('searchbox', { name: 'Search the wiki' });
    await input.fill('action chunking');
    await settle(page);

    const methods = page.getByRole('button', { name: /^Methods/ });
    await methods.click();
    await expect(methods).toHaveCSS('background-color', 'rgb(198, 255, 25)');
    const clear = page.getByRole('button', { name: 'Clear search' });
    await expect(clear).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
  });
});

/**
 * The search-states sweep for the brand-v2 discovery assertions
 * (`VAL-B2-DISC-001..004`, `VAL-B2-DISC-007`): drives every deterministic
 * state of /search on the built export, at the desktop viewport and at
 * 375px for the fit members, then persists the artifact the enforcement
 * generator reads. State populations derive from the evidence module
 * (which derives the facet options from the shipped entity types), never
 * from a previous run, and every verdict the generator will emit is
 * enforced inside the suite before the artifact is written.
 */

async function collectState(
  page: Page,
  stateId: string,
  viewport: string,
): Promise<SearchStateObservation> {
  return page.evaluate(
    ({ stateId: id, viewport: view }) => {
      const status = document.querySelector('[role="status"]');
      const input = document.getElementById('search-page-input');
      const groupReading = (groupId: 'prose' | 'structured') => {
        const section = document.querySelector(
          `[data-results-group="${groupId}"]`,
        );
        return {
          id: groupId,
          rowCount: section
            ? section.querySelectorAll('[data-search-result]').length
            : 0,
          countText:
            section?.querySelector('[data-results-group-count]')
              ?.textContent ?? null,
          errorNote: !!section?.querySelector(
            `[data-search-group-error="${groupId}"]`,
          ),
          emptyNote:
            !!section?.querySelector('[data-search-group-note]') &&
            !section?.querySelector(`[data-search-group-error="${groupId}"]`),
        };
      };
      const bar = document.querySelector(
        '[role="group"][aria-label="Filter by type"]',
      );
      const facetButtons = bar
        ? Array.from(bar.querySelectorAll('button'))
        : [];
      const pressedByOption: Record<string, boolean> = {};
      let selected = 'none';
      let selectedBackgroundRgb = '';
      let selectedHasCheckMarker = false;
      for (const button of facetButtons) {
        const option = button.getAttribute('data-facet-option');
        if (!option) continue;
        const pressed = button.getAttribute('aria-pressed') === 'true';
        pressedByOption[option] = pressed;
        if (pressed) {
          selected = option;
          selectedBackgroundRgb = getComputedStyle(button).backgroundColor;
          selectedHasCheckMarker =
            button.querySelector('[data-facet-check]') !== null;
        }
      }
      const structuredRowTypes = Array.from(
        document.querySelectorAll(
          '[data-results-group="structured"] [data-entity-type]',
        ),
      ).map((element) => element.getAttribute('data-entity-type') ?? '');
      const facet =
        facetButtons.length > 0
          ? {
              selected,
              pressedByOption,
              selectedBackgroundRgb,
              selectedHasCheckMarker,
              rowTypes: structuredRowTypes,
            }
          : null;
      return {
        stateId: id,
        viewport: view,
        statusText: status?.textContent ?? '',
        liveRegionRole: status?.getAttribute('role') ?? null,
        liveRegionAriaLive: status?.getAttribute('aria-live') ?? null,
        inputFocused: document.activeElement === input,
        documentScrollWidthPx: document.documentElement.scrollWidth,
        documentClientWidthPx: document.documentElement.clientWidth,
        idleCopyVisible: /type a query to search/i.test(
          document.body.innerText,
        ),
        loadingRowCount: document.querySelectorAll('[data-search-loading]')
          .length,
        siteEmptyNodeCount: document.querySelectorAll('[data-search-empty]')
          .length,
        unavailableNoteCount: document.querySelectorAll(
          '[data-search-unavailable]',
        ).length,
        clearControlVisible:
          document.querySelector('button[aria-label="Clear search"]') !==
          null,
        proseTitles: Array.from(
          document.querySelectorAll(
            '[data-results-group="prose"] [data-result-title]',
          ),
        ).map((element) => (element.textContent ?? '').trim()),
        structuredRowTypes,
        groups: [groupReading('prose'), groupReading('structured')],
        facet,
      } satisfies SearchStateObservation;
    },
    { stateId, viewport },
  );
}

async function driveResults(page: Page, staticBase: string, query: string) {
  await page.goto(`${staticBase}/search/`, { waitUntil: 'networkidle' });
  const input = page.getByRole('searchbox', { name: 'Search the wiki' });
  await input.fill(query);
  await settle(page);
}

/**
 * The canonical passing reading for one member, used as scaffolding by the
 * plant proofs: each plant drives its own target state live on the export,
 * mutates it in-page, and splices that real observation into this fixture
 * so exactly the mutated member is graded. If the fixture itself drifted
 * away from the verdicts, the un-mutated members would fail and the plant
 * tests would reject it.
 */
function passingObservation(
  stateId: string,
  viewport: string,
): SearchStateObservation {
  const facetFor = (selected: string): SearchStateObservation['facet'] => ({
    selected,
    pressedByOption: Object.fromEntries(
      SEARCH_FACET_OPTIONS.map((option) => [option, option === selected]),
    ),
    selectedBackgroundRgb: SEARCH_SELECTION_RGB,
    selectedHasCheckMarker: true,
    rowTypes: selected === 'all' ? ['method', 'company', 'dataset'] : [selected],
  });
  const group = (
    id: 'prose' | 'structured',
    rowCount: number,
    countText: string | null,
    note: { errorNote?: boolean; emptyNote?: boolean } = {},
  ) => ({
    id,
    rowCount,
    countText,
    errorNote: note.errorNote ?? false,
    emptyNote: note.emptyNote ?? false,
  });
  const shell = {
    stateId,
    viewport,
    liveRegionRole: 'status',
    liveRegionAriaLive: 'polite',
    inputFocused: true,
    documentScrollWidthPx: 375,
    documentClientWidthPx: 375,
    clearControlVisible: true,
    structuredRowTypes: ['method', 'company', 'dataset'],
    facet: facetFor('all'),
  } satisfies Partial<SearchStateObservation>;
  switch (stateId) {
    case 'state:default-idle':
    case 'state:cleared-to-idle':
      return {
        ...shell,
        statusText: '',
        idleCopyVisible: true,
        loadingRowCount: 0,
        siteEmptyNodeCount: 0,
        unavailableNoteCount: 0,
        proseTitles: [],
        structuredRowTypes: [],
        facet: null,
        groups: [group('prose', 0, null), group('structured', 0, null)],
      };
    case 'state:loading-first-query':
      return {
        ...shell,
        statusText: 'Searching for action chunking…',
        idleCopyVisible: false,
        loadingRowCount: 2,
        siteEmptyNodeCount: 0,
        unavailableNoteCount: 0,
        proseTitles: [],
        structuredRowTypes: [],
        facet: null,
        groups: [group('prose', 0, null), group('structured', 0, null)],
      };
    case 'state:results-both-groups':
      return {
        ...shell,
        statusText: '3 article results and 3 entity results for action chunking',
        idleCopyVisible: false,
        loadingRowCount: 0,
        siteEmptyNodeCount: 0,
        unavailableNoteCount: 0,
        proseTitles: ['Action Chunking'],
        groups: [
          group('prose', 1, '1 result'),
          group('structured', 3, '3 results'),
        ],
      };
    case 'state:facet-method':
    case 'state:facet-company':
    case 'state:facet-dataset':
      return {
        ...shell,
        statusText: '1 entity result for action chunking',
        idleCopyVisible: false,
        loadingRowCount: 0,
        siteEmptyNodeCount: 0,
        unavailableNoteCount: 0,
        proseTitles: ['Action Chunking'],
        structuredRowTypes: [stateId.slice('state:facet-'.length)],
        facet: facetFor(stateId.slice('state:facet-'.length)),
        groups: [
          group('prose', 1, '1 result'),
          group('structured', 1, '1 result'),
        ],
      };
    case 'state:no-results':
      return {
        ...shell,
        statusText:
          'No article prose and no method, company or dataset entity matches quartz-lantern-7319',
        idleCopyVisible: false,
        loadingRowCount: 0,
        siteEmptyNodeCount: 1,
        unavailableNoteCount: 0,
        proseTitles: [],
        structuredRowTypes: [],
        facet: null,
        groups: [
          group('prose', 0, '0 results', { emptyNote: true }),
          group('structured', 0, '0 results', { emptyNote: true }),
        ],
      };
    case 'state:partial-error-prose':
      return {
        ...shell,
        statusText:
          'The entity index answered for action chunking; the article index is unavailable',
        idleCopyVisible: false,
        loadingRowCount: 0,
        siteEmptyNodeCount: 0,
        unavailableNoteCount: 0,
        proseTitles: [],
        structuredRowTypes: ['method', 'company', 'dataset'],
        groups: [
          group('prose', 0, null, { errorNote: true }),
          group('structured', 3, '3 results'),
        ],
      };
    case 'state:partial-error-structured':
    case 'state:total-error':
      return {
        ...shell,
        statusText: 'The search index is unavailable',
        idleCopyVisible: false,
        loadingRowCount: 0,
        siteEmptyNodeCount: 0,
        unavailableNoteCount: 1,
        proseTitles: [],
        structuredRowTypes: [],
        facet: null,
        groups: [group('prose', 0, null), group('structured', 0, null)],
      };
    default:
      throw new Error(`no passing fixture for ${stateId}`);
  }
}

function plantEvidence(mutated: SearchStateObservation): SearchStatesEvidence {
  const states = [
    ...SEARCH_STATE_IDS.map((id) =>
      passingObservation(id, SEARCH_DESKTOP_VIEWPORT.id),
    ),
    ...SEARCH_MOBILE_STATE_IDS.map((id) =>
      passingObservation(id, SEARCH_MOBILE_VIEWPORT.id),
    ),
  ];
  const index = states.findIndex(
    (state) =>
      state.stateId === mutated.stateId &&
      state.viewport === mutated.viewport,
  );
  if (index === -1) {
    throw new Error(
      `the plant mutation targets no sweep member: ${mutated.stateId} at ${mutated.viewport}`,
    );
  }
  states[index] = mutated;
  return {
    version: 1,
    fingerprint: searchStatesEvidenceFingerprint({ root: ROOT }),
    desktopViewport: SEARCH_DESKTOP_VIEWPORT.id,
    mobileViewport: SEARCH_MOBILE_VIEWPORT.id,
    states,
    facetKeyboard: {
      optionActivatedByKeyboard: Object.fromEntries(
        SEARCH_FACET_OPTIONS.map((option) => [option, true]),
      ),
      resetByKeyboard: true,
      focusRetainedOnInputThroughSettle: true,
    },
  };
}

test.describe('brand-v2 search states sweep', () => {
  test('measures every search state at both viewports and persists the artifact', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({
      width: SEARCH_DESKTOP_VIEWPORT.width,
      height: SEARCH_DESKTOP_VIEWPORT.height,
    });
    const states: SearchStateObservation[] = [];

    // default-idle
    await page.goto(`${staticBase}/search/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(2, 2);
    states.push(
      await collectState(page, 'state:default-idle', SEARCH_DESKTOP_VIEWPORT.id),
    );

    // loading-first-query, released into partial-error-structured: the
    // pagefind module hangs until released and returns one genuine prose
    // hit, while the structured index 503s, so the same drive measures the
    // in-flight treatment and then the settled partial failure.
    await page.route('**/pagefind/pagefind.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: `
          window.__brandV2SearchRequests = [];
          let release;
          window.__brandV2ReleaseSearch = () => release?.();
          export async function search(query) {
            window.__brandV2SearchRequests.push(query);
            await new Promise((resolve) => { release = resolve; });
            return {
              results: [{
                data: async () => ({
                  url: '/manipulation/action-chunking/',
                  meta: { title: 'Action Chunking' },
                  excerpt: 'action chunking',
                  content: 'action chunking over the aloha trajectory',
                }),
              }],
            };
          }
        `,
      }),
    );
    await disableStructuredSearchIndex(page);
    await page.goto(`${staticBase}/search/`, { waitUntil: 'networkidle' });
    await page
      .getByRole('searchbox', { name: 'Search the wiki' })
      .fill('action chunking');
    await expect(page.locator('[data-search-loading]')).toHaveCount(2);
    states.push(
      await collectState(
        page,
        'state:loading-first-query',
        SEARCH_DESKTOP_VIEWPORT.id,
      ),
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & { __brandV2SearchRequests?: string[] }
            ).__brandV2SearchRequests ?? [],
        ),
      )
      .toContain('action chunking');
    await page.evaluate(() => {
      (
        window as Window & { __brandV2ReleaseSearch?: () => void }
      ).__brandV2ReleaseSearch?.();
    });
    await settle(page);
    states.push(
      await collectState(
        page,
        'state:partial-error-structured',
        SEARCH_DESKTOP_VIEWPORT.id,
      ),
    );
    await page.unroute('**/pagefind/pagefind.js');
    await page.unroute('**/search-index.json');

    // results-both-groups on the real indexes, plus one focus-retention
    // reading while the typed query settles.
    await driveResults(page, staticBase, 'action chunking');
    states.push(
      await collectState(
        page,
        'state:results-both-groups',
        SEARCH_DESKTOP_VIEWPORT.id,
      ),
    );
    const focusRetainedOnInputThroughSettle = await page.evaluate(() => {
      const input = document.getElementById('search-page-input');
      return document.activeElement === input;
    });

    // One facet state per shipped entity type, each selected by keyboard
    // and reset by keyboard, which is the DISC-003 keyboard half.
    const optionActivatedByKeyboard: Record<string, boolean> = {};
    let resetByKeyboard = false;
    for (const option of SEARCH_FACET_OPTIONS) {
      const button = page.locator(`button[data-facet-option="${option}"]`);
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      // The facet colours transition; read the computed lime only once it
      // has settled, so the recorded value is the resting treatment.
      await expect(button).toHaveCSS(
        'background-color',
        SEARCH_SELECTION_RGB,
      );
      optionActivatedByKeyboard[option] = true;
      if (option !== 'all') {
        states.push(
          await collectState(
            page,
            facetStateId(option),
            SEARCH_DESKTOP_VIEWPORT.id,
          ),
        );
        const allTypes = page.locator('button[data-facet-option="all"]');
        await allTypes.focus();
        await page.keyboard.press('Enter');
        await expect(allTypes).toHaveAttribute('aria-pressed', 'true');
        resetByKeyboard = true;
      }
    }

    // no-results (the sealed neutral query)
    await driveResults(page, staticBase, 'quartz-lantern-7319');
    states.push(
      await collectState(page, 'state:no-results', SEARCH_DESKTOP_VIEWPORT.id),
    );

    // partial-error-prose: pagefind 503s, structured stays real.
    await disablePagefindIndex(page);
    await driveResults(page, staticBase, 'action chunking');
    states.push(
      await collectState(
        page,
        'state:partial-error-prose',
        SEARCH_DESKTOP_VIEWPORT.id,
      ),
    );
    await page.unroute('**/pagefind/pagefind.js');

    // total-error: both indexes 503.
    await disablePagefindIndex(page);
    await disableStructuredSearchIndex(page);
    await driveResults(page, staticBase, 'action chunking');
    states.push(
      await collectState(page, 'state:total-error', SEARCH_DESKTOP_VIEWPORT.id),
    );
    await page.unroute('**/pagefind/pagefind.js');
    await page.unroute('**/search-index.json');

    // cleared-to-idle through the labelled clear control.
    await driveResults(page, staticBase, 'action chunking');
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page.getByText(/type a query to search/i)).toBeVisible();
    states.push(
      await collectState(
        page,
        'state:cleared-to-idle',
        SEARCH_DESKTOP_VIEWPORT.id,
      ),
    );

    // The 375px fit members (VAL-B2-DISC-007).
    await page.setViewportSize({
      width: SEARCH_MOBILE_VIEWPORT.width,
      height: SEARCH_MOBILE_VIEWPORT.height,
    });
    await driveResults(page, staticBase, 'action chunking');
    states.push(
      await collectState(
        page,
        'state:results-both-groups',
        SEARCH_MOBILE_VIEWPORT.id,
      ),
    );
    await page.locator('button[data-facet-option="method"]').click();
    await expect(
      page.locator('button[data-facet-option="method"]'),
    ).toHaveCSS('background-color', SEARCH_SELECTION_RGB);
    states.push(
      await collectState(
        page,
        facetStateId('method'),
        SEARCH_MOBILE_VIEWPORT.id,
      ),
    );

    const artifact: SearchStatesEvidence = {
      version: 1,
      fingerprint: searchStatesEvidenceFingerprint({ root: ROOT }),
      desktopViewport: SEARCH_DESKTOP_VIEWPORT.id,
      mobileViewport: SEARCH_MOBILE_VIEWPORT.id,
      states,
      facetKeyboard: {
        optionActivatedByKeyboard,
        resetByKeyboard,
        focusRetainedOnInputThroughSettle,
      },
    };

    // Fail-closed read of our own measurement before anything is granted.
    const evidence = readSearchStatesEvidence({
      artifact,
      fingerprint: artifact.fingerprint,
    });

    const treatment = searchStateTreatmentVerdicts(evidence);
    expect(treatment.map(({ id }) => id)).toEqual(
      SEARCH_STATE_IDS.map(searchStateMemberId),
    );
    expect(treatment.flatMap(({ failures }) => failures)).toEqual([]);

    const derivation = searchDataDerivationVerdicts(evidence);
    expect(derivation.map(({ id }) => id)).toEqual(
      SEARCH_RESULT_STATE_IDS.map(searchStateMemberId),
    );
    expect(derivation.flatMap(({ failures }) => failures)).toEqual([]);

    const facets = searchFacetSelectionVerdicts(evidence);
    expect(facets.map(({ id }) => id)).toEqual(
      SEARCH_FACET_OPTIONS.map(searchFacetMemberId),
    );
    expect(facets.flatMap(({ failures }) => failures)).toEqual([]);

    const announcements = searchAnnouncementVerdicts(evidence);
    expect(announcements.flatMap(({ failures }) => failures)).toEqual([]);

    const mobile = searchMobileFitVerdicts(evidence);
    expect(mobile.map(({ id }) => id)).toEqual(
      SEARCH_MOBILE_STATE_IDS.map(searchStateMemberId),
    );
    expect(mobile.flatMap(({ failures }) => failures)).toEqual([]);

    const artifactPath = join(ROOT, SEARCH_STATES_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });

  /**
   * Plant proofs: each mutates the live page the way the defect would look
   * and asserts the verdict that covers it fails by name, so the five
   * assertions are independently decidable rather than one boolean wearing
   * several names.
   */
  test('refuses a loading treatment whose rows are removed in-page', async ({
    page,
    staticBase,
  }) => {
    await page.setViewportSize({
      width: SEARCH_DESKTOP_VIEWPORT.width,
      height: SEARCH_DESKTOP_VIEWPORT.height,
    });
    await page.route('**/pagefind/pagefind.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: `
          export async function search() {
            await new Promise(() => {});
            return { results: [] };
          }
        `,
      }),
    );
    await disableStructuredSearchIndex(page);
    await page.goto(`${staticBase}/search/`);
    await page
      .getByRole('searchbox', { name: 'Search the wiki' })
      .fill('action chunking');
    await expect(page.locator('[data-search-loading]')).toHaveCount(2);
    await page.evaluate(() => {
      document
        .querySelectorAll('[data-search-loading]')
        .forEach((row) => row.remove());
    });
    const mutated = await collectState(
      page,
      'state:loading-first-query',
      SEARCH_DESKTOP_VIEWPORT.id,
    );
    const evidence = plantEvidence(mutated);
    const failures = searchStateTreatmentVerdicts(evidence).find(
      (verdict) =>
        verdict.id === searchStateMemberId('state:loading-first-query'),
    )?.failures;
    expect(failures).toEqual(['expected one loading row per group, saw 0']);
  });

  test('refuses a result count that lies about its rows', async ({
    page,
    staticBase,
  }) => {
    await driveResults(page, staticBase, 'action chunking');
    await page.evaluate(() => {
      const counts = document.querySelectorAll('[data-results-group-count]');
      counts.forEach((count) => {
        count.textContent = '0 results';
      });
    });
    const mutated = await collectState(
      page,
      'state:results-both-groups',
      SEARCH_DESKTOP_VIEWPORT.id,
    );
    const evidence = plantEvidence(mutated);
    const failures = searchDataDerivationVerdicts(evidence).flatMap(
      ({ failures: entry }) => entry,
    );
    expect(failures.length).toBe(2);
    expect(
      failures.every((entry) => /count says 0 but/.test(entry)),
    ).toBe(true);
  });

  test('refuses a selected facet whose lime fill is stripped in-page', async ({
    page,
    staticBase,
  }) => {
    await driveResults(page, staticBase, 'action chunking');
    await page.locator('button[data-facet-option="method"]').click();
    await page.evaluate(() => {
      const button = document.querySelector(
        'button[data-facet-option="method"]',
      );
      if (button) {
        const element = button as HTMLElement;
        // Freeze the transition so the plant reads its own mutation, not a
        // frame of the colour fading out.
        element.style.transition = 'none';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0)';
      }
    });
    const mutated = await collectState(
      page,
      facetStateId('method'),
      SEARCH_DESKTOP_VIEWPORT.id,
    );
    const evidence = plantEvidence(mutated);
    const failures = searchFacetSelectionVerdicts(evidence).flatMap(
      ({ failures: entry }) => entry,
    );
    // The exact serialized colour is the engine's business; the plant's
    // claim is that a selected facet whose fill is not lime fails by name.
    expect(failures.length).toBe(1);
    expect(failures[0]).toMatch(
      /^the selected method facet computes to .+, not lime$/,
    );
  });

  test('refuses an announcement region whose role is removed in-page', async ({
    page,
    staticBase,
  }) => {
    await driveResults(page, staticBase, 'action chunking');
    await page.evaluate(() => {
      document
        .querySelector('[role="status"]')
        ?.removeAttribute('aria-live');
    });
    const mutated = await collectState(
      page,
      'state:results-both-groups',
      SEARCH_DESKTOP_VIEWPORT.id,
    );
    const evidence = plantEvidence(mutated);
    const failures = searchAnnouncementVerdicts(evidence).flatMap(
      ({ failures: entry }) => entry,
    );
    expect(failures).toEqual(['the status region is not polite']);
  });

  test('refuses a 375px state whose document overflows in-page', async ({
    page,
    staticBase,
  }) => {
    await page.setViewportSize({
      width: SEARCH_MOBILE_VIEWPORT.width,
      height: SEARCH_MOBILE_VIEWPORT.height,
    });
    await driveResults(page, staticBase, 'action chunking');
    await page.evaluate(() => {
      const wart = document.createElement('div');
      wart.style.width = '800px';
      wart.style.height = '4px';
      document.body.appendChild(wart);
    });
    const mutated = await collectState(
      page,
      'state:results-both-groups',
      SEARCH_MOBILE_VIEWPORT.id,
    );
    const evidence = plantEvidence(mutated);
    const failures = searchMobileFitVerdicts(evidence).flatMap(
      ({ failures: entry }) => entry,
    );
    expect(failures.length).toBe(1);
    expect(failures[0]).toMatch(/the document overflows by/);
  });
});
