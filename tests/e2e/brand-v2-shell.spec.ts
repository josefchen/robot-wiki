import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brandV2Registry, test, expect } from './brand-v2-static-fixture';
import {
  SHELL_RUNTIME_EVIDENCE_PATH,
  SHELL_VIEWPORT,
  currentRouteVerdicts,
  ledgerByBaselineMember,
  readShellRuntimeEvidence,
  shellEvidenceFingerprint,
  skipLinkVerdicts,
  type ShellNavEntry,
  type ShellRouteObservation,
} from '../../lib/brand-v2-shell-evidence';
import { sha256, stableJson } from '../../lib/brand-v2-baseline';
import { navigationBaselineMembers } from '../../lib/shell-populations';

const ROOT = process.cwd();
const BASELINE_PATH = join(
  ROOT,
  'evidence',
  'brand-v2',
  'baseline',
  'baseline.json',
);
const APPROVED_DELTAS_PATH = join(
  ROOT,
  'contract',
  'brand-v2-approved-deltas.json',
);

/**
 * Runs inside the page. Discovery is structural: it collects every element
 * carrying `aria-current` whatever its tag and whatever its position, so a
 * heading that took the state to satisfy a count is found and then failed
 * rather than never queried. Owner-approved successor (Josef, 2026-10-10,
 * the research-page standard): the sidebar is gone and the taxonomy lives
 * in the "Articles" panel, so the entries are read from the open panel's
 * own boxes, the page behind it is inert and so outside the accessibility
 * tree, and any device the active link renders is read off it, registered
 * or not, so a returning rail is found and failed.
 */
function collectShell(): Omit<
  ShellRouteObservation,
  'route' | 'skipLink'
> {
  const round = (value: number) => Math.round(value * 100) / 100;
  const outlineOf = (el: Element) =>
    el.outerHTML.replace(/\s+/g, ' ').slice(0, 160);
  const nameOf = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const edge = (box: DOMRect, name: string): number =>
    name === 'right'
      ? box.right
      : name === 'top'
        ? box.top
        : name === 'bottom'
          ? box.bottom
          : name === 'center-x'
            ? box.left + box.width / 2
            : name === 'center-y'
              ? box.top + box.height / 2
              : box.left;

  const aside = document.querySelector('#mobile-nav-drawer');
  const nav = aside?.querySelector('nav[aria-label]') ?? null;
  const main = document.querySelector('main');

  const ariaCurrentNodes = [
    ...document.querySelectorAll('[aria-current]'),
  ]
    .filter((el) => el.closest('[inert]') === null)
    .map((el) => ({
    tag: el.tagName.toLowerCase(),
    href: el.getAttribute('href'),
    navigationLink:
      el.tagName === 'A' &&
      el.hasAttribute('href') &&
      el.closest('nav, aside, header, [role="dialog"]') !== null,
    accessibleName: nameOf(el),
    outline: outlineOf(el),
  }));

  const navEntries: ShellNavEntry[] = [
    ...(aside?.querySelectorAll('a[href]') ?? []),
  ].map((link, index) => {
    const style = getComputedStyle(link);
    const rect = link.getBoundingClientRect();
    const href = link.getAttribute('href') ?? '';
    const inTaxonomy = link.closest('nav') !== null;
    const panel = link.closest('ul[id]');
    const inGroup = panel !== null && panel.id.includes('-group-');
    const segments = href.split('/').filter(Boolean).length;
    const category = !inTaxonomy
      ? ('lockup' as const)
      : inGroup
        ? segments <= 1
          ? ('domain-overview' as const)
          : ('module' as const)
        : ('standalone' as const);
    const markerEl = link.querySelector(':scope > span[data-brand-device-id]');
    let marker: ShellNavEntry['marker'] = null;
    if (markerEl) {
      const markerStyle = getComputedStyle(markerEl);
      const markerRect = markerEl.getBoundingClientRect();
      const anchorSelector =
        (markerEl as HTMLElement).dataset.brandAnchorSelector ?? '';
      const anchor = anchorSelector
        ? document.querySelector(anchorSelector)
        : null;
      marker = {
        deviceId: (markerEl as HTMLElement).dataset.brandDeviceId ?? null,
        anchorSelector: anchorSelector || null,
        ariaHidden: markerEl.getAttribute('aria-hidden'),
        pointerEvents: markerStyle.pointerEvents,
        borderLeftColour: markerStyle.borderLeftColor,
        borderLeftWidthPx: round(parseFloat(markerStyle.borderLeftWidth) || 0),
        leftPx: round(markerRect.left),
        heightPx: round(markerRect.height),
        alignmentErrorPx:
          anchor === null
            ? Number.MAX_SAFE_INTEGER
            : round(
                Math.abs(
                  edge(
                    markerRect,
                    (markerEl as HTMLElement).dataset.brandDeviceEdge ?? 'left',
                  ) -
                    edge(
                      anchor.getBoundingClientRect(),
                      (markerEl as HTMLElement).dataset.brandAnchorEdge ??
                        'left',
                    ),
                ),
              ),
        ownerHeightPx: round(rect.height),
        contributedText: (markerEl.textContent ?? '').trim(),
      };
    }
    return {
      index,
      href,
      name: nameOf(link),
      category,
      leftPx: round(rect.left),
      colour: style.color,
      fontWeight: Number.parseInt(style.fontWeight, 10),
      fontFamilyHead: (style.fontFamily.split(',')[0] ?? '').trim(),
      ariaCurrent: link.getAttribute('aria-current'),
      marker,
    };
  });

  const registrationLabels = [...(aside?.querySelectorAll('*') ?? [])]
    .filter((el) => {
      const style = getComputedStyle(el);
      return (
        style.fontFamily.toLowerCase().includes('mono') &&
        el.children.length === 0 &&
        (el.textContent ?? '').trim().length > 0
      );
    })
    .map((el) => {
      const style = getComputedStyle(el);
      const size = parseFloat(style.fontSize);
      return {
        text: nameOf(el),
        fontSizePx: round(size),
        trackingEm:
          Math.round(((parseFloat(style.letterSpacing) || 0) / size) * 10000) /
          10000,
      };
    });

  return {
    visibleTextLength: ((document.body as HTMLElement).innerText ?? '').trim()
      .length,
    ariaCurrentNodes,
    navEntries,
    railGeometry: {
      asideRightPx: round(aside?.getBoundingClientRect().right ?? -1),
      navLeftPx: round(nav?.getBoundingClientRect().left ?? -1),
      mainLeftPx: round(main?.getBoundingClientRect().left ?? -1),
      documentScrollWidthPx: document.documentElement.scrollWidth,
      documentClientWidthPx: document.documentElement.clientWidth,
    },
    registrationLabels,
  };
}

test.describe('brand-v2 desktop shell and navigation', () => {
  /**
   * The one place the desktop shell claims are measured. It is persisted
   * because the enforcement generator has no other way to know what a
   * document rendered: a generator that re-read the class names would be
   * comparing source with itself, which is the tautology the token, Tektur
   * and identity evidence readers already exist to prevent.
   */
  test('every public route marks its current route, opens on the skip link, and keeps the sealed taxonomy', async ({
    browser,
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    const routes = brandV2Registry.routes.public.map(({ path }) => path);
    expect(routes.length).toBeGreaterThan(5);
    await page.setViewportSize({
      width: SHELL_VIEWPORT.width,
      height: SHELL_VIEWPORT.height,
    });

    const observations: ShellRouteObservation[] = [];
    for (const route of routes) {
      // One context per route, torn down before the next. A renderer keeps
      // every document the page navigated away from (~26MB per route here),
      // so a 61-route walk on one page spends over a gigabyte and kills a
      // later test. The context is built inline rather than through
      // tests/e2e/helpers/per-route-context.ts because this spec's import
      // graph is hashed into its evidence fingerprint, and that closure
      // refuses modules outside its scanned roots.
      const context = await browser.newContext({
        viewport: {
          width: SHELL_VIEWPORT.width,
          height: SHELL_VIEWPORT.height,
        },
      });
      const page = await context.newPage();
      try {
        const response = await page.goto(`${staticBase}${route}`);
        expect(response?.status(), route).toBe(200);
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => document.fonts.ready);
        // With the panel closed, nothing outside the shell's navigation
        // chrome may carry aria-current. A misplaced node found here is kept
        // in the observation, so the verdict fails it by name.
        const closedMisplaced = await page.evaluate(() =>
          [...document.querySelectorAll('[aria-current]')]
            .filter(
              (el) =>
                !(
                  el.tagName === 'A' &&
                  el.hasAttribute('href') &&
                  el.closest('nav, header') !== null
                ),
            )
            .map((el) => ({
              tag: el.tagName.toLowerCase(),
              href: el.getAttribute('href'),
              navigationLink: false,
              accessibleName: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
              outline: el.outerHTML.replace(/\s+/g, ' ').slice(0, 160),
            })),
        );

        const restTopPx = await page.evaluate(
          () =>
            Math.round(
              (document
                .querySelector('a[href="#main-content"]')
                ?.getBoundingClientRect().top ?? 0) * 100,
            ) / 100,
        );
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el) return null;
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            href: el.getAttribute('href'),
            text: (el.textContent ?? '').trim(),
            top: Math.round(rect.top * 100) / 100,
            visible:
              rect.top >= 0 &&
              rect.bottom <= window.innerHeight &&
              rect.width > 0 &&
              rect.height > 0,
            colour: style.color,
            borderColour: style.borderTopColor,
          };
        });
        expect(focused, `${route} focused nothing on the first Tab`).not.toBeNull();
        await page.keyboard.press('Enter');
        const activatedFocusId = await page.evaluate(
          () => (document.activeElement as HTMLElement | null)?.id ?? null,
        );

        await page.getByRole('button', { name: 'Articles' }).click();
        await expect(page.getByRole('dialog', { name: 'Site navigation' })).toBeVisible();
        const collected = await page.evaluate(collectShell);

        observations.push({
          ...collected,
          ariaCurrentNodes: [...collected.ariaCurrentNodes, ...closedMisplaced],
          route,
          skipLink: {
            firstTabStopTag: focused?.tag ?? '',
            firstTabStopHref: focused?.href ?? null,
            firstTabStopText: focused?.text ?? '',
            restTopPx,
            focusedTopPx: focused?.top ?? -1,
            visibleWhenFocused: focused?.visible ?? false,
            colour: focused?.colour ?? '',
            borderColour: focused?.borderColour ?? '',
            activatedFocusId,
          },
        });
      } finally {
        await context.close();
      }
    }

    // The all-expanded taxonomy: only an expanded panel exposes every
    // destination, and VAL-B2-SHELL-005 is a claim about all of them.
    await page.goto(`${staticBase}/`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Articles' }).click();
    const groupButtons = page.locator(
      '#mobile-nav-drawer nav[aria-label] > ul > li > button[aria-controls]',
    );
    const groupCount = await groupButtons.count();
    expect(groupCount, 'taxonomy groups').toBeGreaterThan(0);
    for (let index = 0; index < groupCount; index += 1) {
      const button = groupButtons.nth(index);
      if ((await button.getAttribute('aria-expanded')) !== 'true') {
        await button.click();
      }
      await expect(button).toHaveAttribute('aria-expanded', 'true');
    }
    const expandedLedger = (await page.evaluate(collectShell)).navEntries;

    const artifact = {
      version: 1 as const,
      fingerprint: shellEvidenceFingerprint({
        root: ROOT,
        deviceRegistryRows: brandV2Registry.gridDevices as unknown as Array<{
          id: string;
          fingerprint: string;
        }>,
      }),
      viewport: SHELL_VIEWPORT.id,
      routes,
      observations,
      expandedLedger,
    };

    // Enforced here as well as in the generator, so a red shell fails the
    // suite that measured it rather than only the artifact check.
    const evidence = readShellRuntimeEvidence({
      artifact,
      routes,
      fingerprint: artifact.fingerprint,
    });

    const registeredDeviceIds = (
      brandV2Registry.gridDevices as unknown as Array<{ id: string }>
    ).map(({ id }) => id);
    const currentRouteFailures = [
      ...currentRouteVerdicts(evidence, registeredDeviceIds).values(),
    ]
      .flatMap(({ failures }) => failures)
      .sort();
    expect(currentRouteFailures).toEqual([]);

    const skipLinkFailures = [...skipLinkVerdicts(evidence).values()]
      .flatMap(({ failures }) => failures)
      .sort();
    expect(skipLinkFailures).toEqual([]);

    // VAL-DESIGN-017: one indent depth. Owner-approved successor (Josef,
    // 2026-10-10, the research-page standard): with the rail retired, the
    // current entry's own text box is what a reader sees move, so every
    // category is observed carrying the current-route state, each category
    // sets its current entry at one offset on every route, and the domain
    // overview and its modules share one indent: depth is read from the
    // text indent alone.
    //
    // The lockup is deliberately absent: it is the wordmark, and the owner
    // decision of 2026-09-25 excludes the wordmark from every accent bar.
    // `currentRouteVerdicts` above fails any route where an entry renders a
    // device at all.
    const currentLefts = observations.flatMap(({ route, navEntries }) =>
      navEntries
        .filter(
          ({ ariaCurrent, category, href }) =>
            ariaCurrent === 'page' &&
            category !== 'lockup' &&
            href.replace(/\/$/, '') === route.replace(/\/$/, ''),
        )
        .map(({ category, leftPx }) => ({ route, category, left: leftPx })),
    );
    const markedCategories = new Set(currentLefts.map(({ category }) => category));
    expect(
      [...markedCategories].sort(),
      'every taxonomy entry category has to be observed carrying the current-route state',
    ).toEqual(['domain-overview', 'module', 'standalone']);
    for (const category of markedCategories) {
      const lefts = currentLefts
        .filter((entry) => entry.category === category)
        .map(({ left }) => left);
      expect(
        Math.max(...lefts) - Math.min(...lefts),
        `the current ${category} entry moves across routes: ${JSON.stringify(currentLefts.filter((entry) => entry.category === category).slice(0, 6))}`,
      ).toBeLessThanOrEqual(1);
    }
    const groupedLefts = currentLefts
      .filter(({ category }) => category === 'domain-overview' || category === 'module')
      .map(({ left }) => left);
    expect(
      Math.max(...groupedLefts) - Math.min(...groupedLefts),
      'a domain overview and its modules sit at different indents, so the taxonomy has two depths',
    ).toBeLessThanOrEqual(1);
    expect(
      observations
        .flatMap(({ navEntries }) => navEntries)
        .filter(({ marker }) => marker !== null)
        .map(({ href, marker }) => `${href}: ${marker?.deviceId ?? 'unregistered'}`),
      'a navigation entry renders a device, which the research-page standard retires',
    ).toEqual([]);

    // VAL-B2-SHELL-005: the rendered taxonomy still hashes to the sealed
    // navigation baseline, entry for entry.
    const sealed = navigationBaselineMembers(
      JSON.parse(readFileSync(BASELINE_PATH, 'utf8')),
      JSON.parse(readFileSync(APPROVED_DELTAS_PATH, 'utf8')),
    );
    const rendered = ledgerByBaselineMember(evidence);
    expect([...rendered.keys()].sort()).toEqual(sealed.map(({ id }) => id));
    const drifted = sealed
      .filter(({ id, hash }) => {
        const entry = rendered.get(id);
        if (!entry) return true;
        return (
          sha256(
            stableJson({
              index: entry.index,
              href: entry.href,
              name: entry.name,
            }),
          ) !== hash
        );
      })
      .map(({ id }) => id);
    expect(
      drifted,
      'navigation destinations whose href, accessible name or position no longer hash to the sealed baseline',
    ).toEqual([]);

    const artifactPath = join(ROOT, SHELL_RUNTIME_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });
});
