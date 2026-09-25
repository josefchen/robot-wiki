import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, test } from './brand-v2-static-fixture';
import {
  DISCOVERY_ANCHORS,
  DOMAIN_LANDING_ROUTES,
  INDEX_H1_TEKTUR_ROLE,
  INDEX_SURFACE_ROUTES,
  INDEX_VIEWPORT,
  INDEX_ROWS_EVIDENCE_PATH,
  discoveryAnchorMemberId,
  discoveryIndexVerdicts,
  editorialRowSurfaceVerdicts,
  expectedAzLetterIds,
  expectedGlossaryIds,
  expectedRowCounts,
  indexRowsEvidenceFingerprint,
  indexSurfaceMemberId,
  readIndexRowsEvidence,
  rowRhythmMemberId,
  rowRhythmVerdicts,
  type FragmentKeyboardObservation,
  type IndexRowListObservation,
  type IndexRowsEvidence,
  type IndexSurfaceObservation,
} from '../../lib/brand-v2-index-evidence';

const ROOT = process.cwd();

/**
 * The index-rows sweep for the discovery-index assertions
 * (`VAL-B2-SHELL-008`, `VAL-B2-DISC-005`, `VAL-B2-DISC-006`): measures the
 * home domain index, the seven domain landings, /a-z/, /glossary/ and
 * /credits/ in the built export, then persists the artifact the enforcement
 * generator reads. The populations are registry-derived here (the route
 * list, the expected row counts, the expected fragment targets), never
 * copied out of a previous run, and every verdict the generator will emit
 * is enforced inside the suite first so a red page fails the suite that
 * measured it rather than only the artifact check.
 */

const ROW_SELECTORS: Record<string, string> = {
  'home-domain-index': 'section[aria-labelledby="domain-index-heading"] ul > li',
  'domain-article': '[data-domain-article]',
  'az-entry': '[data-az-entry]',
  'glossary-term': '[data-glossary-term]',
  'credits-entry': '[data-credits-entry]',
};

function primarySelector(route: string): string {
  if (route === '/') return ROW_SELECTORS['home-domain-index'];
  if (route === '/a-z/') return ROW_SELECTORS['az-entry'];
  if (route === '/glossary/') return ROW_SELECTORS['glossary-term'];
  if (route === '/credits/') return ROW_SELECTORS['credits-entry'];
  return ROW_SELECTORS['domain-article'];
}

/** In-page collector for one surface, keyed by its row-list measurement key. */
async function collectSurface(
  page: import('@playwright/test').Page,
  route: string,
  key: string,
  fragmentTargets: { kind: 'az-letters' | 'glossary-terms'; ids: string[] } | null,
): Promise<IndexSurfaceObservation> {
  const rowLists = await page.evaluate(
    ({ selector, key }) => {
      const rows = Array.from(document.querySelectorAll(selector));
      const container = rows[0]?.parentElement ?? null;
      const containerDisplay = container
        ? getComputedStyle(container).display
        : 'none';
      const ruleWidths = new Set<number>();
      const ruleStyles = new Set<string>();
      const paddingTops = new Set<number>();
      const displays = new Set<string>();
      let boxed = 0;
      for (const row of rows) {
        const cs = getComputedStyle(row);
        displays.add(cs.display);
        paddingTops.add(parseFloat(cs.paddingTop));
        for (const side of ['Top', 'Bottom'] as const) {
          const width = parseFloat(cs[`border${side}Width`]);
          const style = cs[`border${side}Style`];
          if (width > 0 && style !== 'none') {
            ruleWidths.add(width);
            ruleStyles.add(style);
          }
        }
        if (container) {
          const top = parseFloat(getComputedStyle(container).borderTopWidth);
          if (top > 0 && getComputedStyle(container).borderTopStyle !== 'none') {
            ruleWidths.add(top);
            ruleStyles.add(getComputedStyle(container).borderTopStyle);
          }
        }
        const fourSided =
          parseFloat(cs.borderTopWidth) > 0 &&
          parseFloat(cs.borderBottomWidth) > 0 &&
          parseFloat(cs.borderLeftWidth) > 0 &&
          parseFloat(cs.borderRightWidth) > 0;
        if (
          fourSided &&
          cs.borderRadius !== '0px' &&
          cs.backgroundColor !== 'rgba(0, 0, 0, 0)'
        ) {
          boxed += 1;
        }
      }
      const h1 = document.querySelector('main h1, h1');
      const h1cs = h1 ? getComputedStyle(h1) : null;
      const monoCount = document.querySelectorAll(
        'main .font-mono, main font-mono',
      ).length;
      return {
        visibleTextLength:
          (document.querySelector('main')?.textContent ?? '').trim().length,
        documentScrollWidthPx: document.documentElement.scrollWidth,
        documentClientWidthPx: document.documentElement.clientWidth,
        h1Text: h1?.textContent?.trim() ?? '',
        h1FontFamilyHead: (h1cs?.fontFamily ?? '').split(',')[0] ?? '',
        h1SizePx: h1cs ? parseFloat(h1cs.fontSize) : 0,
        monoMetadataCount: monoCount,
        rowList: {
          key,
          rowCount: rows.length,
          containerDisplay,
          rowDisplayKinds: [...displays],
          rowPaddingTopPx: [...paddingTops].sort((a, b) => a - b),
          separatorRuleWidthPx: [...ruleWidths].sort((a, b) => a - b),
          separatorRuleStyles: [...ruleStyles],
          boxedRowCount: boxed,
        } satisfies IndexRowListObservation,
      };
    },
    { selector: primarySelector(route), key },
  );

  let deepLinkTargets: IndexSurfaceObservation['deepLinkTargets'] = null;
  if (fragmentTargets) {
    const missing = await page.evaluate((ids: string[]) => {
      return ids.filter((id) => document.getElementById(id) === null);
    }, fragmentTargets.ids);
    deepLinkTargets = {
      kind: fragmentTargets.kind,
      expectedCount: fragmentTargets.ids.length,
      missing,
    };
  }

  return {
    route,
    visibleTextLength: rowLists.visibleTextLength,
    documentScrollWidthPx: rowLists.documentScrollWidthPx,
    documentClientWidthPx: rowLists.documentClientWidthPx,
    h1Text: rowLists.h1Text,
    h1FontFamilyHead: rowLists.h1FontFamilyHead,
    h1SizePx: rowLists.h1SizePx,
    monoMetadataCount: rowLists.monoMetadataCount,
    rowLists: [rowLists.rowList],
    deepLinkTargets,
  };
}

async function measureFragment(
  page: import('@playwright/test').Page,
  route: string,
  fragment: string,
  initiator: 'direct-url' | 'cross-route-link' | 'in-page-jump',
  staticBase: string,
): Promise<FragmentKeyboardObservation> {
  if (initiator === 'direct-url') {
    await page.goto(`${staticBase}${route}${fragment}`, {
      waitUntil: 'networkidle',
    });
  } else if (initiator === 'in-page-jump') {
    await page.goto(`${staticBase}${route}`, { waitUntil: 'networkidle' });
    await page
      .locator(`main nav a[href="${route}${fragment}"]`)
      .first()
      .click();
    await page.waitForTimeout(300);
  } else {
    await page.goto(`${staticBase}/a-z/`, { waitUntil: 'networkidle' });
    // A networkidle wait can settle on the ORIGIN page before the
    // navigation lands (measuring mid-transition once read focus on the
    // link that was clicked, on the page it was clicked from), so the
    // destination is awaited explicitly.
    await Promise.all([
      page
        .waitForURL(new RegExp(`${route.replace(/\//g, '\\/')}${fragment}$`)),
      page.locator(`main a[href="${route}${fragment}"]`).first().click(),
    ]);
    await page.waitForTimeout(300);
  }
  const target = fragment.slice(1);
  const before = await page.evaluate(
    ({ target }) => {
      const el = document.getElementById(target);
      const box = el?.getBoundingClientRect();
      const active = document.activeElement;
      return {
        activeElementTag: active?.tagName ?? '',
        activeElementId: active?.id ?? '',
        targetReceivedFocus: active === el,
        targetScrolledIntoView:
          !!box && box.top >= 0 && box.bottom <= window.innerHeight + 1,
      };
    },
    { target },
  );
  // The continuation reading: the row the reader was deep-linked to is the
  // closest index-row ancestor (`[data-glossary-term]`, the A-Z letter
  // section, or the target itself). "Continues at the target" means focus
  // is already on the target (a direct load focuses a tabindex="-1"
  // fragment target) or the first Tab after the navigation lands on a tab
  // stop inside that same row — never back at the top of the page.
  const withinTargetRow = () =>
    page.evaluate((target) => {
      const el = document.getElementById(target);
      const active = document.activeElement;
      if (!el || !active) return false;
      const rowOf = (node: Element): Element =>
        node.closest('[data-glossary-term]') ?? node.closest('section') ?? node;
      return rowOf(active) === rowOf(el);
    }, target);
  const continuesBeforeTab = await withinTargetRow();
  await page.keyboard.press('Tab');
  const continuesAfterTab = await withinTargetRow();
  return {
    route,
    fragment,
    initiator,
    ...before,
    nextTabContinuesAtTarget: continuesBeforeTab || continuesAfterTab,
  };
}

test.describe('brand-v2 index rows', () => {
  test('measures every index surface, its rules, its inventory and its fragment keyboard, and persists the artifact', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({
      width: INDEX_VIEWPORT.width,
      height: INDEX_VIEWPORT.height,
    });

    const azLetters = expectedAzLetterIds();
    const glossaryIds = expectedGlossaryIds();
    expect(azLetters.length, 'A-Z letter population').toBeGreaterThan(0);
    expect(glossaryIds.length, 'glossary term population').toBeGreaterThan(0);

    const surfaces: IndexSurfaceObservation[] = [];
    for (const route of INDEX_SURFACE_ROUTES) {
      await page.goto(`${staticBase}${route}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(2, 2);
      const key =
        route === '/'
          ? 'home-domain-index'
          : route === '/a-z/'
            ? 'az-entry'
            : route === '/glossary/'
              ? 'glossary-term'
              : route === '/credits/'
                ? 'credits-entry'
                : 'domain-article';
      const targets =
        route === '/a-z/'
          ? { kind: 'az-letters' as const, ids: azLetters }
          : route === '/glossary/'
            ? { kind: 'glossary-terms' as const, ids: glossaryIds }
            : null;
      surfaces.push(await collectSurface(page, route, key, targets));
    }

    const fragmentKeyboard: FragmentKeyboardObservation[] = [
      await measureFragment(
        page,
        '/a-z/',
        `#${azLetters[0]}`,
        'direct-url',
        staticBase,
      ),
      await measureFragment(
        page,
        '/a-z/',
        `#${azLetters[0]}`,
        'in-page-jump',
        staticBase,
      ),
      await measureFragment(
        page,
        '/glossary/',
        `#${glossaryIds[0]}`,
        'direct-url',
        staticBase,
      ),
      await measureFragment(
        page,
        '/glossary/',
        `#${glossaryIds[0]}`,
        'cross-route-link',
        staticBase,
      ),
    ];

    const artifact: IndexRowsEvidence = {
      version: 1,
      fingerprint: indexRowsEvidenceFingerprint({ root: ROOT }),
      viewport: INDEX_VIEWPORT.id,
      surfaces,
      fragmentKeyboard,
    };

    // Fail-closed read of our own measurement before anything is granted.
    const evidence = readIndexRowsEvidence({
      artifact,
      fingerprint: artifact.fingerprint,
    });

    // VAL-B2-SHELL-008: home + the seven domain landings, per member.
    const editorial = editorialRowSurfaceVerdicts(evidence);
    expect(editorial.map(({ id }) => id)).toEqual(
      ['/', ...DOMAIN_LANDING_ROUTES].map(indexSurfaceMemberId),
    );
    expect(editorial.flatMap(({ failures }) => failures)).toEqual([]);

    // VAL-B2-DISC-005: both discovery routes, all four anchors.
    const anchors = discoveryIndexVerdicts(evidence);
    expect(anchors.map(({ id }) => id)).toEqual([
      '/a-z/',
      '/glossary/',
    ].flatMap((route) => DISCOVERY_ANCHORS.map((a) => discoveryAnchorMemberId(route, a))));
    expect(anchors.flatMap(({ failures }) => failures)).toEqual([]);

    // VAL-B2-DISC-006: the full index family, per member.
    const rhythm = rowRhythmVerdicts(evidence);
    expect(rhythm.map(({ id }) => id)).toEqual(
      [...DOMAIN_LANDING_ROUTES, '/a-z/', '/glossary/', '/credits/'].map(
        rowRhythmMemberId,
      ),
    );
    expect(rhythm.flatMap(({ failures }) => failures)).toEqual([]);

    // The registered Tektur role the shared treatment pins: every discovery
    // h1 carries it in the markup the sweep rendered.
    for (const route of ['/a-z/', '/glossary/']) {
      const role = await page
        .goto(`${staticBase}${route}`)
        .then(() => page.locator('h1').getAttribute('data-tektur-role'));
      expect(role, `${route} h1 Tektur role`).toBe(INDEX_H1_TEKTUR_ROLE);
    }

    const artifactPath = join(ROOT, INDEX_ROWS_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });

  /**
   * Plant proofs. Each mutates the live page the way the defect would look
   * and asserts the verdict that covers it fails by name, which is what
   * makes the three assertions independently decidable rather than one
   * boolean wearing several names.
   */
  test('refuses an index whose row rules are removed in-page', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/glossary/`, { waitUntil: 'networkidle' });
    const stripped = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll('[data-glossary-term]'),
      ) as HTMLElement[];
      for (const row of rows) {
        row.style.borderBottom = 'none';
      }
      const first = rows[0]?.parentElement as HTMLElement | undefined;
      first?.style.setProperty('border-top', 'none');
      return rows.length;
    });
    expect(stripped).toBeGreaterThan(0);
    const surface = await collectSurface(page, '/glossary/', 'glossary-term', null);
    const evidence: IndexRowsEvidence = {
      version: 1,
      fingerprint: 'plant',
      viewport: INDEX_VIEWPORT.id,
      surfaces: [surface, ...stubSurfaces('/glossary/')],
      fragmentKeyboard: stubFragmentKeyboard(),
    };
    const read = readIndexRowsEvidence({
      artifact: evidence,
      fingerprint: 'plant',
    });
    const rhythm = rowRhythmVerdicts(read).find((v) => v.route === '/glossary/')!;
    expect(rhythm.failures.join('\n')).toContain('no 1px rule');
    const shared = discoveryIndexVerdicts(read).find(
      (v) => v.route === '/glossary/' && v.anchor === 'shared-index-treatment',
    )!;
    expect(shared.failures.join('\n')).toContain('no 1px separator rule');
  });

  test('refuses a glossary fragment that leaves focus on the body', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/glossary/`, { waitUntil: 'networkidle' });
    // Reproduce the pre-fix defect: unfocus the target in-page, then read a
    // planted observation the way the sweep would have recorded it.
    const planted: FragmentKeyboardObservation = await page.evaluate(() => {
      const target = document.querySelector('[data-glossary-term]');
      const id = target?.id ?? '';
      const active = document.activeElement;
      return {
        route: '/glossary/',
        fragment: `#${id}`,
        initiator: 'direct-url',
        activeElementTag: active?.tagName ?? 'BODY',
        activeElementId: active?.id ?? '',
        targetReceivedFocus: active === target,
        targetScrolledIntoView: true,
        nextTabContinuesAtTarget: true,
      };
    });
    // On the fixed page focus follows the fragment only after a fragment
    // navigation; emulate the broken one explicitly.
    planted.targetReceivedFocus = false;
    planted.nextTabContinuesAtTarget = false;
    planted.activeElementTag = 'BODY';
    planted.activeElementId = '';
    const evidence: IndexRowsEvidence = {
      version: 1,
      fingerprint: 'plant',
      viewport: INDEX_VIEWPORT.id,
      surfaces: [stubSurface('/glossary/'), ...stubSurfaces('/glossary/')],
      fragmentKeyboard: [planted, ...stubFragmentKeyboard()],
    };
    const read = readIndexRowsEvidence({
      artifact: evidence,
      fingerprint: 'plant',
    });
    const keyboard = discoveryIndexVerdicts(read).find(
      (v) => v.route === '/glossary/' && v.anchor === 'keyboard-reachability',
    )!;
    expect(keyboard.failures.join('\n')).toContain('left focus on <BODY>');
  });

  test('refuses a boxed-card conversion of a domain index', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/manipulation/`, { waitUntil: 'networkidle' });
    const boxed = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll('[data-domain-article]'),
      ) as HTMLElement[];
      for (const row of rows) {
        row.style.border = '1px solid #D9DADB';
        row.style.borderRadius = '8px';
        row.style.backgroundColor = '#FFFFFF';
      }
      return rows.length;
    });
    expect(boxed).toBeGreaterThan(0);
    const surface = await collectSurface(
      page,
      '/manipulation/',
      'domain-article',
      null,
    );
    const evidence: IndexRowsEvidence = {
      version: 1,
      fingerprint: 'plant',
      viewport: INDEX_VIEWPORT.id,
      surfaces: [surface, ...stubSurfaces('/manipulation/')],
      fragmentKeyboard: stubFragmentKeyboard(),
    };
    const read = readIndexRowsEvidence({
      artifact: evidence,
      fingerprint: 'plant',
    });
    const editorial = editorialRowSurfaceVerdicts(read).find(
      (v) => v.route === '/manipulation/',
    )!;
    expect(editorial.failures.join('\n')).toContain('four-sided bordered boxes');
    const rhythm = rowRhythmVerdicts(read).find(
      (v) => v.route === '/manipulation/',
    )!;
    expect(rhythm.failures.join('\n')).toContain('boxed card rows');
  });

  test('refuses an inventory that drifts from the registry count', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/classical/`, { waitUntil: 'networkidle' });
    const surface = await collectSurface(
      page,
      '/classical/',
      'domain-article',
      null,
    );
    // Plant the defect the gate exists to catch: the rendered count
    // disagrees with the registry-derived expectation.
    surface.rowLists[0].rowCount = surface.rowLists[0].rowCount + 1;
    const evidence: IndexRowsEvidence = {
      version: 1,
      fingerprint: 'plant',
      viewport: INDEX_VIEWPORT.id,
      surfaces: [surface, ...stubSurfaces('/classical/')],
      fragmentKeyboard: stubFragmentKeyboard(),
    };
    const read = readIndexRowsEvidence({
      artifact: evidence,
      fingerprint: 'plant',
    });
    const expected = expectedRowCounts()['/classical/'];
    const editorial = editorialRowSurfaceVerdicts(read).find(
      (v) => v.route === '/classical/',
    )!;
    expect(editorial.failures.join('\n')).toContain(
      `not the ${expected} the registry derives`,
    );
  });
});

/** Minimal passing surfaces for the routes a plant does not visit. */
function stubSurface(route: string): IndexSurfaceObservation {
  const key =
    route === '/'
      ? 'home-domain-index'
      : route === '/a-z/'
        ? 'az-entry'
        : route === '/glossary/'
          ? 'glossary-term'
          : route === '/credits/'
            ? 'credits-entry'
            : 'domain-article';
  const expected = expectedRowCounts()[route] ?? 1;
  return {
    route,
    visibleTextLength: 1000,
    documentScrollWidthPx: INDEX_VIEWPORT.width,
    documentClientWidthPx: INDEX_VIEWPORT.width,
    h1Text: 'stub',
    h1FontFamilyHead: 'tektur',
    h1SizePx: 30,
    monoMetadataCount: 2,
    rowLists: [
      {
        key,
        rowCount: expected,
        containerDisplay: 'block',
        rowDisplayKinds: ['list-item'],
        rowPaddingTopPx: [16],
        separatorRuleWidthPx: [1],
        separatorRuleStyles: ['solid'],
        boxedRowCount: 0,
      },
    ],
    deepLinkTargets: null,
  };
}

function stubSurfaces(exclude: string): IndexSurfaceObservation[] {
  return INDEX_SURFACE_ROUTES.filter((r) => r !== exclude).map(stubSurface);
}

function stubFragmentKeyboard(): FragmentKeyboardObservation[] {
  return [
    {
      route: '/a-z/',
      fragment: '#stub',
      initiator: 'direct-url',
      activeElementTag: 'H2',
      activeElementId: 'stub',
      targetReceivedFocus: true,
      targetScrolledIntoView: true,
      nextTabContinuesAtTarget: true,
    },
    {
      route: '/a-z/',
      fragment: '#stub',
      initiator: 'in-page-jump',
      activeElementTag: 'A',
      activeElementId: '',
      targetReceivedFocus: false,
      targetScrolledIntoView: true,
      nextTabContinuesAtTarget: false,
    },
    {
      route: '/glossary/',
      fragment: '#stub',
      initiator: 'direct-url',
      activeElementTag: 'LI',
      activeElementId: 'stub',
      targetReceivedFocus: true,
      targetScrolledIntoView: true,
      nextTabContinuesAtTarget: true,
    },
    {
      route: '/glossary/',
      fragment: '#stub',
      initiator: 'cross-route-link',
      activeElementTag: 'LI',
      activeElementId: 'stub',
      targetReceivedFocus: true,
      targetScrolledIntoView: true,
      nextTabContinuesAtTarget: true,
    },
  ];
}
