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
 * rather than never queried. The navigation entries are read from the
 * sidebar's own boxes, and the current-route rail is read off whatever the
 * active link renders, registered or not.
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

  const aside = document.querySelector('aside');
  const nav = aside?.querySelector('nav[aria-label]') ?? null;
  const main = document.querySelector('main');

  const ariaCurrentNodes = [
    ...document.querySelectorAll('[aria-current]'),
  ].map((el) => ({
    tag: el.tagName.toLowerCase(),
    href: el.getAttribute('href'),
    navigationLink:
      el.tagName === 'A' &&
      el.hasAttribute('href') &&
      el.closest('nav, aside, header') !== null,
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
      const response = await page.goto(`${staticBase}${route}`);
      expect(response?.status(), route).toBe(200);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      const collected = await page.evaluate(collectShell);

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

      observations.push({
        ...collected,
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
    }

    // The all-expanded taxonomy: only an expanded sidebar exposes every
    // destination, and VAL-B2-SHELL-005 is a claim about all of them.
    await page.goto(`${staticBase}/`);
    await page.waitForLoadState('networkidle');
    const groupButtons = page.locator(
      'aside nav[aria-label] > ul > li > button[aria-controls]',
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

    const currentRouteFailures = [...currentRouteVerdicts(evidence).values()]
      .flatMap(({ failures }) => failures)
      .sort();
    expect(currentRouteFailures).toEqual([]);

    const skipLinkFailures = [...skipLinkVerdicts(evidence).values()]
      .flatMap(({ failures }) => failures)
      .sort();
    expect(skipLinkFailures).toEqual([]);

    // VAL-DESIGN-017: one indent depth. Every category marks at the same
    // offset from the taxonomy rail, so the reader reads depth from the text
    // indent and never from where the current-route rail sits.
    const markerLefts = observations.flatMap(({ route, navEntries }) =>
      navEntries
        .filter(({ marker }) => marker !== null)
        .map(({ category, marker }) => ({
          route,
          category,
          left: marker?.leftPx ?? 0,
        })),
    );
    const markedCategories = new Set(markerLefts.map(({ category }) => category));
    expect(
      [...markedCategories].sort(),
      'every entry category has to be observed carrying the current-route rail',
    ).toEqual(['domain-overview', 'lockup', 'module', 'standalone']);
    const lefts = markerLefts.map(({ left }) => left);
    expect(
      Math.max(...lefts) - Math.min(...lefts),
      `current-route rail depth varies across ${JSON.stringify(markerLefts.slice(0, 6))}`,
    ).toBeLessThanOrEqual(1);

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
