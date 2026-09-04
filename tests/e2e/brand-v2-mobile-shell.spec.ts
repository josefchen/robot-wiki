import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brandV2Registry, test, expect } from './brand-v2-static-fixture';
import {
  MOBILE_SHELL_EVIDENCE_PATH,
  MOBILE_VIEWPORT,
  REQUIRED_INERT_REGIONS,
  SCRIM_SEPARATION_FLOOR,
  SELECTION_LIME_RGB,
  contrastRatio,
  drawerVerdicts,
  mobileHeaderVerdicts,
  mobileShellEvidenceFingerprint,
  readMobileShellEvidence,
  type DrawerDismissal,
  type DrawerTabStop,
  type MobileRouteObservation,
} from '../../lib/brand-v2-mobile-shell-evidence';
import { PUBLIC_DESCRIPTOR } from '../../lib/identity';
import { installRenderedTextProbe } from './rendered-text-probe';

const ROOT = process.cwd();

/** The tab stops the drawer trap has to cycle through, as the shell defines them. */
const TAB_STOPS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Runs inside the page with the drawer closed. Lockup discovery is
 * structural: it keeps the deepest header elements whose whole text is any
 * spelling in the `robot wiki` family, so a lockup that carries no
 * annotation is found and then failed rather than never queried. The
 * descriptor check reads leaf text rather than source, because a descriptor
 * can reach the header through a shared component or a CSS content value.
 */
function collectClosed(input: { descriptor: string; tabStops: string }): {
  visibleTextLength: number;
  header: MobileRouteObservation['header'];
  closedDrawerTabStops: number;
} {
  const BRAND_FAMILY = /^robot[\s\-_]*wiki$/i;
  const round = (value: number) => Math.round(value * 100) / 100;
  const unquote = (value: string): string =>
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
      ? value.slice(1, -1)
      : value;
  const visible = (el: Element): boolean =>
    typeof (el as HTMLElement).checkVisibility === 'function'
      ? (el as HTMLElement).checkVisibility({
          contentVisibilityAuto: true,
          opacityProperty: true,
          visibilityProperty: true,
        })
      : el.getBoundingClientRect().height > 0;

  const header = document.querySelector('header');
  const bodyText = (document.body as HTMLElement).innerText ?? '';
  if (!header) {
    return {
      visibleTextLength: bodyText.trim().length,
      header: {
        present: false,
        display: 'none',
        heightPx: -1,
        contentWidthPx: -1,
        leafTexts: [],
        pseudoTexts: [],
        lockups: [],
        descriptorMatches: [],
        trigger: null,
      },
      closedDrawerTabStops: (
        document.getElementById('mobile-nav-drawer')?.querySelectorAll(
          input.tabStops,
        ) ?? []
      ).length,
    };
  }

  const rendered = (el: Element): string =>
    (
      window.__brandRenderedText?.(el) ?? (el.textContent ?? '')
    )
      .replace(/\s+/g, ' ')
      .trim();
  const pseudoOf = (el: Element): { before: string; after: string } =>
    window.__brandPseudoText?.(el) ?? { before: '', after: '' };
  const selectorOf = (el: Element): string => {
    const id = el.id ? `#${el.id}` : '';
    const role = el.getAttribute('data-tektur-role');
    return `${el.tagName.toLowerCase()}${id}${role ? `[data-tektur-role="${role}"]` : ''}`;
  };

  const style = getComputedStyle(header);
  const inHeader = [...header.querySelectorAll('*')];
  const nameCandidates = inHeader.filter(
    (el) => visible(el) && BRAND_FAMILY.test(rendered(el)),
  );
  const lockupElements = nameCandidates.filter(
    (el) => !nameCandidates.some((other) => other !== el && el.contains(other)),
  );

  const leafTexts = inHeader
    .filter((el) => el.children.length === 0 && visible(el))
    .map((el) => rendered(el))
    .filter((text) => text.length > 0);

  // The header element itself as well as its descendants: a descriptor
  // painted by `header::after` is not inside any of them.
  const pseudoTexts = [header, ...inHeader]
    .filter((el) => el === header || visible(el))
    .flatMap((el) => {
      const pseudo = pseudoOf(el);
      return (
        [
          { position: '::before', text: pseudo.before },
          { position: '::after', text: pseudo.after },
        ] as const
      )
        .filter(({ text }) => text.trim().length > 0)
        .map(({ position, text }) => ({
          selector: selectorOf(el),
          position,
          text: text.replace(/\s+/g, ' ').trim(),
        }));
    });

  const descriptorMatches = inHeader
    .filter((el) => visible(el) && rendered(el).includes(input.descriptor))
    .map((el) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 160));

  const trigger = header.querySelector('button[aria-controls]');

  return {
    visibleTextLength: bodyText.trim().length,
    header: {
      present: true,
      display: style.display,
      heightPx: round(header.getBoundingClientRect().height),
      contentWidthPx: round(
        header.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight),
      ),
      leafTexts,
      pseudoTexts,
      lockups: lockupElements.map((el) => {
        const lockupStyle = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          text: rendered(el),
          href: el.getAttribute('href'),
          tekturRole: el.getAttribute('data-tektur-role'),
          fontFamilyHead: unquote(
            (lockupStyle.fontFamily.split(',')[0] ?? '').trim(),
          ),
          fontSizePx: parseFloat(lockupStyle.fontSize),
          fontWeight: parseFloat(lockupStyle.fontWeight),
          lineBoxes: el.getClientRects().length,
          widthPx: round(el.getBoundingClientRect().width),
          ariaCurrent: el.getAttribute('aria-current'),
        };
      }),
      descriptorMatches,
      trigger: trigger
        ? {
            accessibleName: trigger.getAttribute('aria-label') ?? '',
            ariaExpanded: trigger.getAttribute('aria-expanded'),
            ariaControls: trigger.getAttribute('aria-controls'),
          }
        : null,
    },
    closedDrawerTabStops: (
      document.getElementById('mobile-nav-drawer')?.querySelectorAll(
        input.tabStops,
      ) ?? []
    ).length,
  };
}

/**
 * Runs inside the page with the drawer open. The scrim's separation is
 * composited by the browser's own colour engine rather than computed from
 * the token, so a scrim whose notation resolves to the panel's colour is
 * measured as the 1.00:1 it renders as. The self-check fill proves the
 * canvas parsed the notations at all, so a parse failure cannot masquerade
 * as an invisible boundary.
 */
function collectOpen(input: {
  route: string;
  tabStops: string;
  /**
   * The regions the assertion requires to be inert, passed in rather than
   * listed here so the sweep and the verdict cannot disagree about which
   * ones were supposed to be read.
   */
  requiredRegions: ReadonlyArray<{ selector: string; id: string }>;
}): {
  triggerExpandedWhenOpen: string | null;
  triggerControlsResolvesWhenOpen: boolean;
  stops: DrawerTabStop[];
  panelRightPx: number;
  inert: MobileRouteObservation['inert'];
  separation: Omit<MobileRouteObservation['separation'], 'contrastRatio'> & {
    scrimParsedAlpha: number;
    canvasRoundTrip: [number, number, number];
  };
  currentRoute: MobileRouteObservation['currentRoute'];
} {
  const round = (value: number) => Math.round(value * 100) / 100;
  const visible = (el: Element): boolean =>
    typeof (el as HTMLElement).checkVisibility === 'function'
      ? (el as HTMLElement).checkVisibility({
          contentVisibilityAuto: true,
          opacityProperty: true,
          visibilityProperty: true,
        })
      : el.getBoundingClientRect().height > 0;
  const labelOf = (el: Element): string =>
    el.getAttribute('aria-label') ??
    (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const trim = (value: string) =>
    value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;

  const dialog = document.getElementById('mobile-nav-drawer');
  const scrim = dialog?.querySelector(':scope > [aria-hidden]') ?? null;
  const panel = dialog?.querySelector(':scope > div:not([aria-hidden])') ?? null;
  const stopsIn = (root: Element | null) => [
    ...(root?.querySelectorAll<HTMLElement>(input.tabStops) ?? []),
  ];

  const panelStops = stopsIn(panel);
  const outside = [...document.querySelectorAll<HTMLElement>(input.tabStops)]
    .filter(
      (el) =>
        !(panel?.contains(el) ?? false) &&
        el.closest('[inert]') === null &&
        visible(el),
    )
    .map((el) => `${el.tagName.toLowerCase()}[${labelOf(el)}]`);

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const pixel = (fills: string[]): [number, number, number, number] => {
    if (!ctx) return [-1, -1, -1, -1];
    ctx.clearRect(0, 0, 1, 1);
    for (const fill of fills) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, 1, 1);
    }
    const data = ctx.getImageData(0, 0, 1, 1).data;
    return [data[0], data[1], data[2], data[3]];
  };

  const pageBackground = getComputedStyle(document.body).backgroundColor;
  const scrimBackground = scrim
    ? getComputedStyle(scrim).backgroundColor
    : 'transparent';
  const panelStyle = panel ? getComputedStyle(panel) : null;
  const panelBackground = panelStyle?.backgroundColor ?? 'transparent';
  const composited = pixel([pageBackground, scrimBackground]);
  const panelPixel = pixel([panelBackground]);
  const scrimAlone = pixel([scrimBackground]);
  const roundTrip = pixel(['rgb(1, 2, 3)']);
  const scrimRgb: [number, number, number] = [
    composited[0],
    composited[1],
    composited[2],
  ];
  const panelRgb: [number, number, number] = [
    panelPixel[0],
    panelPixel[1],
    panelPixel[2],
  ];

  const scrimBox = scrim?.getBoundingClientRect();
  const panelBox = panel?.getBoundingClientRect();

  const drawerLinks = [
    ...(panel?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []),
  ];
  const hasNavigationItem = drawerLinks.some(
    (link) =>
      trim(new URL(link.href, location.href).pathname) === trim(input.route),
  );
  const matching = drawerLinks.find(
    (link) =>
      trim(new URL(link.href, location.href).pathname) === trim(input.route) &&
      link.getAttribute('aria-current') === 'page',
  );
  const marker = matching?.querySelector('[data-brand-device-id]') ?? null;
  const anchor = marker
    ? document.querySelector(
        marker.getAttribute('data-brand-anchor-selector') ?? '',
      )
    : null;

  const openTrigger = document.querySelector('header button[aria-controls]');

  return {
    triggerExpandedWhenOpen:
      openTrigger?.getAttribute('aria-expanded') ?? null,
    triggerControlsResolvesWhenOpen:
      document.getElementById(
        openTrigger?.getAttribute('aria-controls') ?? '',
      ) !== null,
    stops: panelStops.map((el) => ({
      tag: el.tagName.toLowerCase(),
      label: labelOf(el),
    })),
    panelRightPx: panelBox ? round(panelBox.right) : -1,
    inert: {
      regions: input.requiredRegions.map(({ selector, id }) => {
        const el = document.querySelector(selector);
        return {
          id,
          present: el !== null,
          inert: el?.hasAttribute('inert') ?? false,
        };
      }),
      reachableOutsideDrawer: outside,
    },
    separation: {
      scrimBackground,
      pageBackground,
      panelBackground,
      scrimCompositedRgb: scrimRgb,
      panelRgb,
      coverage:
        scrimBox && innerWidth * innerHeight > 0
          ? round((scrimBox.width * scrimBox.height) / (innerWidth * innerHeight))
          : 0,
      panelBorderLeftPx: parseFloat(panelStyle?.borderLeftWidth ?? '-1'),
      panelBorderRightPx: parseFloat(panelStyle?.borderRightWidth ?? '-1'),
      panelBoxShadow: panelStyle?.boxShadow ?? 'unmeasured',
      scrimParsedAlpha: scrimAlone[3],
      canvasRoundTrip: [roundTrip[0], roundTrip[1], roundTrip[2]],
    },
    currentRoute: {
      hasNavigationItem,
      exposedAriaCurrent: [...document.querySelectorAll('[aria-current]')]
        .filter((el) => visible(el) && el.closest('[inert]') === null)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          href: el.getAttribute('href'),
          value: el.getAttribute('aria-current'),
          insideDrawer: panel?.contains(el) ?? false,
          accessibleName: labelOf(el),
        })),
      markerDeviceId: marker?.getAttribute('data-brand-device-id') ?? null,
      markerColour: marker ? getComputedStyle(marker).borderLeftColor : null,
      markerAlignmentErrorPx:
        marker && anchor
          ? round(
              Math.abs(
                marker.getBoundingClientRect().left -
                  anchor.getBoundingClientRect().left,
              ),
            )
          : null,
    },
  };
}

/** Runs inside the page: where focus is now, relative to the drawer. */
function readFocus(tabStops: string): {
  focused: DrawerTabStop | null;
  insideDrawer: boolean;
  index: number;
  stopCount: number;
  isTrigger: boolean;
  dialogPresent: boolean;
} {
  const active = document.activeElement;
  const panel = document
    .getElementById('mobile-nav-drawer')
    ?.querySelector(':scope > div:not([aria-hidden])');
  const stops = [...(panel?.querySelectorAll<HTMLElement>(tabStops) ?? [])];
  const index = active ? stops.indexOf(active as HTMLElement) : -1;
  return {
    focused:
      active && active !== document.body
        ? {
            tag: active.tagName.toLowerCase(),
            label:
              active.getAttribute('aria-label') ??
              (active.textContent ?? '').replace(/\s+/g, ' ').trim(),
          }
        : null,
    insideDrawer: panel?.contains(active) ?? false,
    index,
    stopCount: stops.length,
    isTrigger:
      active?.getAttribute('aria-controls') === 'mobile-nav-drawer' &&
      active.getAttribute('aria-label') === 'Open navigation menu',
    dialogPresent: document.getElementById('mobile-nav-drawer') !== null,
  };
}

test.describe('brand-v2 mobile header and drawer', () => {
  /**
   * The one place the mobile shell claims are measured. It is persisted
   * because the enforcement generator has no other way to know where a real
   * Tab put focus, or which regions the browser actually made inert: a
   * generator that re-read the JSX would be comparing source with itself.
   */
  test('every public route omits the descriptor from the compact header and traps the drawer in both directions', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    const routes = brandV2Registry.routes.public.map(({ path }) => path);
    expect(routes.length).toBeGreaterThan(5);
    await page.addInitScript(installRenderedTextProbe);
    await page.setViewportSize({
      width: MOBILE_VIEWPORT.width,
      height: MOBILE_VIEWPORT.height,
    });

    const dialog = page.locator('#mobile-nav-drawer');
    const trigger = page.getByRole('button', { name: 'Open navigation menu' });
    const observations: MobileRouteObservation[] = [];

    for (const route of routes) {
      const response = await page.goto(`${staticBase}${route}`);
      expect(response?.status(), route).toBe(200);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      const closed = await page.evaluate(collectClosed, {
        descriptor: PUBLIC_DESCRIPTOR,
        tabStops: TAB_STOPS,
      });

      // Cycle one: open, measure, then prove the trap with two real key
      // presses and dismiss with Escape.
      await trigger.click();
      await dialog.waitFor();
      const open = await page.evaluate(collectOpen, {
        route,
        tabStops: TAB_STOPS,
        requiredRegions: REQUIRED_INERT_REGIONS.map(({ selector, id }) => ({
          selector,
          id,
        })),
      });
      expect(
        open.separation.canvasRoundTrip,
        `${route} could not round-trip a colour through the canvas, so no scrim reading is trustworthy`,
      ).toEqual([1, 2, 3]);
      expect(
        open.separation.scrimParsedAlpha,
        `${route} parsed the scrim colour ${open.separation.scrimBackground} to zero alpha`,
      ).toBeGreaterThan(0);

      const focusOnOpen = await page.evaluate(readFocus, TAB_STOPS);
      await page.evaluate((tabStops) => {
        const stops = [
          ...(document
            .getElementById('mobile-nav-drawer')
            ?.querySelector(':scope > div:not([aria-hidden])')
            ?.querySelectorAll<HTMLElement>(tabStops) ?? []),
        ];
        stops[stops.length - 1]?.focus();
      }, TAB_STOPS);
      await page.keyboard.press('Tab');
      const forward = await page.evaluate(readFocus, TAB_STOPS);
      await page.evaluate((tabStops) => {
        const stops = [
          ...(document
            .getElementById('mobile-nav-drawer')
            ?.querySelector(':scope > div:not([aria-hidden])')
            ?.querySelectorAll<HTMLElement>(tabStops) ?? []),
        ];
        stops[0]?.focus();
      }, TAB_STOPS);
      await page.keyboard.press('Shift+Tab');
      const backward = await page.evaluate(readFocus, TAB_STOPS);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      const afterEscape = await page.evaluate(readFocus, TAB_STOPS);

      // Cycle two: the close control.
      await trigger.click();
      await dialog.waitFor();
      await page.getByRole('button', { name: 'Close navigation menu' }).click();
      await dialog.waitFor({ state: 'detached' });
      const afterClose = await page.evaluate(readFocus, TAB_STOPS);

      // Cycle three: the scrim, clicked to the right of the panel.
      await trigger.click();
      await dialog.waitFor();
      await page.mouse.click(
        Math.round((open.panelRightPx + MOBILE_VIEWPORT.width) / 2),
        Math.round(MOBILE_VIEWPORT.height / 2),
      );
      await dialog.waitFor({ state: 'detached' });
      const afterScrim = await page.evaluate(readFocus, TAB_STOPS);

      const dismissals: DrawerDismissal[] = (
        [
          ['escape', afterEscape],
          ['close-control', afterClose],
          ['scrim', afterScrim],
        ] as const
      ).map(([via, reading]) => ({
        via,
        closed: !reading.dialogPresent,
        focused: reading.focused,
        focusedTrigger: reading.isTrigger,
      }));

      observations.push({
        route,
        visibleTextLength: closed.visibleTextLength,
        header: closed.header,
        closedDrawerTabStops: closed.closedDrawerTabStops,
        triggerExpandedWhenOpen: open.triggerExpandedWhenOpen,
        triggerControlsResolvesWhenOpen: open.triggerControlsResolvesWhenOpen,
        focus: {
          focusOnOpen: focusOnOpen.focused,
          focusOnOpenInsideDrawer: focusOnOpen.insideDrawer,
          tabStopCount: open.stops.length,
          first: open.stops[0] ?? null,
          last: open.stops[open.stops.length - 1] ?? null,
          forwardWrap: {
            focused: forward.focused,
            insideDrawer: forward.insideDrawer,
            landedOnFirstStop: forward.index === 0,
          },
          backwardWrap: {
            focused: backward.focused,
            insideDrawer: backward.insideDrawer,
            landedOnLastStop:
              backward.stopCount > 0 &&
              backward.index === backward.stopCount - 1,
          },
        },
        inert: open.inert,
        dismissals,
        separation: {
          scrimBackground: open.separation.scrimBackground,
          pageBackground: open.separation.pageBackground,
          panelBackground: open.separation.panelBackground,
          scrimCompositedRgb: open.separation.scrimCompositedRgb,
          panelRgb: open.separation.panelRgb,
          contrastRatio:
            Math.round(
              contrastRatio(
                open.separation.scrimCompositedRgb,
                open.separation.panelRgb,
              ) * 100,
            ) / 100,
          coverage: open.separation.coverage,
          panelBorderLeftPx: open.separation.panelBorderLeftPx,
          panelBorderRightPx: open.separation.panelBorderRightPx,
          panelBoxShadow: open.separation.panelBoxShadow,
        },
        currentRoute: open.currentRoute,
      });
    }

    const artifact = {
      version: 1 as const,
      fingerprint: mobileShellEvidenceFingerprint({
        root: ROOT,
        deviceRegistryRows: brandV2Registry.gridDevices as unknown as Array<{
          id: string;
          fingerprint: string;
        }>,
      }),
      viewport: MOBILE_VIEWPORT.id,
      routes,
      observations,
    };

    // Enforced here as well as in the generator, so a mobile shell that
    // regressed fails the suite that measured it, not only the artifact
    // check that reads it back.
    const evidence = readMobileShellEvidence({
      artifact,
      routes,
      fingerprint: artifact.fingerprint,
    });

    const headerFailures = [...mobileHeaderVerdicts(evidence).values()]
      .flatMap(({ failures }) => failures)
      .sort();
    expect(headerFailures).toEqual([]);

    const drawerFailures = [...drawerVerdicts(evidence).values()]
      .flatMap(({ failures }) => failures)
      .sort();
    expect(drawerFailures).toEqual([]);

    // VAL-DESIGN-020: the scrim is what separates the drawer, and the
    // separation is the same on every route because it is a shell surface.
    const ratios = [
      ...new Set(observations.map(({ separation }) => separation.contrastRatio)),
    ];
    expect(ratios, 'the scrim separates the panel by a different amount per route').toHaveLength(1);
    expect(ratios[0]).toBeGreaterThanOrEqual(SCRIM_SEPARATION_FLOOR);
    for (const { route, separation } of observations) {
      expect(separation.panelBoxShadow, route).toBe('none');
      expect(separation.coverage, route).toBeGreaterThanOrEqual(0.9);
    }

    // The drawer is the taxonomy at mobile widths, so it exposes the route's
    // position exactly as the sidebar does: one aria-current="page" on the
    // matching link when the drawer has an entry for the route, none when it
    // does not, and the mark is the registered lime rail on its rail anchor.
    const currentRouteFailures = observations.flatMap(
      ({ route, currentRoute }) => {
        const problems: string[] = [];
        const exposed = currentRoute.exposedAriaCurrent;
        if (!currentRoute.hasNavigationItem) {
          if (exposed.length > 0) {
            problems.push(
              `${route} has no drawer entry yet exposes ${exposed.length} aria-current node(s)`,
            );
          }
          return problems;
        }
        if (exposed.length !== 1) {
          problems.push(
            `${route} exposes ${exposed.length} aria-current node(s) with the drawer open, not exactly one`,
          );
        }
        if (!exposed.every(({ insideDrawer }) => insideDrawer)) {
          problems.push(`${route} exposes aria-current outside the open drawer`);
        }
        if (currentRoute.markerDeviceId !== 'device:active-interval-rail') {
          problems.push(
            `${route} marks the current drawer entry with ${String(currentRoute.markerDeviceId)}`,
          );
        }
        if (currentRoute.markerColour !== SELECTION_LIME_RGB) {
          problems.push(
            `${route} paints the drawer's current-route rail ${String(currentRoute.markerColour)}`,
          );
        }
        if ((currentRoute.markerAlignmentErrorPx ?? 99) > 2) {
          problems.push(
            `${route} sets the drawer's current-route rail ${String(currentRoute.markerAlignmentErrorPx)}px from its rail anchor`,
          );
        }
        return problems;
      },
    );
    expect(currentRouteFailures.sort()).toEqual([]);

    const artifactPath = join(ROOT, MOBILE_SHELL_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });

  /**
   * The plant for the reading this sweep used to do. `::after { content: ... }`
   * paints the locked descriptor into the compact header while the DOM
   * stores none of it, so every `textContent` reading — the leaf texts, the
   * descriptor scan, the lockup's own text — was byte-identical to a
   * compliant header's.
   */
  test('reports a descriptor a pseudo-element paints into the compact header', async ({
    page,
    staticBase,
  }) => {
    await page.addInitScript(installRenderedTextProbe);
    await page.setViewportSize({
      width: MOBILE_VIEWPORT.width,
      height: MOBILE_VIEWPORT.height,
    });
    const response = await page.goto(`${staticBase}/`);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);

    const clean = await page.evaluate(collectClosed, {
      descriptor: PUBLIC_DESCRIPTOR,
      tabStops: TAB_STOPS,
    });
    expect(
      clean.header.pseudoTexts,
      'the shipped compact header paints no generated text',
    ).toEqual([]);

    await page.addStyleTag({
      content: `header::after { content: ${JSON.stringify(PUBLIC_DESCRIPTOR)}; }`,
    });
    const planted = await page.evaluate(collectClosed, {
      descriptor: PUBLIC_DESCRIPTOR,
      tabStops: TAB_STOPS,
    });
    // The plant has to actually reach the reading, or the case proves nothing.
    expect(planted.header.pseudoTexts.map(({ text }) => text)).toContain(
      PUBLIC_DESCRIPTOR,
    );
    // And it stays invisible to every stored-text reading, which is why the
    // pseudo reading is the fix rather than another descriptor pattern.
    expect(planted.header.leafTexts).toEqual(clean.header.leafTexts);
    expect(planted.header.descriptorMatches).toEqual([]);
  });
});
