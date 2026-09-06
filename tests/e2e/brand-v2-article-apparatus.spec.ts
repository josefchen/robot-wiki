import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page } from '@playwright/test';
import { brandV2Registry, expect, test } from './brand-v2-static-fixture';
import {
  APPARATUS_RUNTIME_EVIDENCE_PATH,
  APPARATUS_VIEWPORTS,
  apparatusEvidenceFingerprint,
  breadcrumbTruthVerdicts,
  citationChipVerdicts,
  furnitureReachVerdicts,
  readApparatusRuntimeEvidence,
  referenceSheetVerdicts,
  relationshipPreservationVerdicts,
  relationshipSourceDrift,
  SIGNAL_BLUE_RENDERED,
  termAffordanceVerdicts,
  type ApparatusObservation,
  type FurnitureLinkObservation,
} from '../../lib/brand-v2-apparatus-evidence';

const ROOT = process.cwd();

/**
 * `transition: none`, not `transition-duration: 0s`.
 *
 * Both stop a transition from STARTING, and only the first cancels one that
 * is already running: CSS Transitions cancels a running transition when the
 * after-change style no longer carries a matching `transition-property`,
 * while a duration change is documented not to disturb a transition already
 * in flight. That distinction is the whole defect. An anchor that paints
 * before the author stylesheet reaches it wears the user-agent link colour
 * `rgb(0, 0, 238)`, and `.transition-colors` then runs it to the sealed
 * accent over 150ms; a sample taken during that run reports a colour that is
 * on the page for a tenth of a second and in no stylesheet. The reported
 * `rgb(30, 80, 252)` is exactly 84% of the way along that line, which is why
 * it only appeared when another spec shared the worker and slowed the load.
 */
const SUPPRESS_MOTION =
  '*, *::before, *::after { transition: none !important; animation: none !important; }';

/**
 * Install the suppression before the first byte of every document this page
 * loads, so the transition never starts rather than being cancelled after
 * the fact. Applies to all subsequent navigations on the page.
 */
async function suppressMotionFromFirstPaint(page: Page) {
  await page.addInitScript((css: string) => {
    const install = () => {
      const style = document.createElement('style');
      style.dataset.suppressMotion = '';
      style.textContent = css;
      (document.head ?? document.documentElement).append(style);
    };
    if (document.head) install();
    else document.addEventListener('DOMContentLoaded', install, { once: true });
  }, SUPPRESS_MOTION);
}

/** Settle a freshly navigated article so every read is the at-rest value. */
async function settleForMeasurement(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Belt to the init script's braces: a document that somehow began a
  // transition before the injected style applied has it cancelled here.
  await page.addStyleTag({ content: SUPPRESS_MOTION });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
  );
}

/**
 * Runs inside the page. Everything is discovered from the rendered document.
 *
 * The two tooltip families are read at rest rather than by driving a
 * pointer: the definition and the reference metadata are in the DOM the
 * whole time and CSS reveals them, so their CONTENT and their
 * `aria-describedby` wiring are structural facts that need no interaction.
 * The reveal itself is a separate claim and is driven for real in
 * `glossary.spec.ts` and `brand-v2-article-interactions.spec.ts`; reading
 * the text here as well is what makes the corpus-wide check affordable at
 * 94 page loads instead of several thousand hover round-trips.
 *
 * Focus indication is measured by outline STYLE and WIDTH, never by colour.
 * `.transition-colors` lists `outline-color` among its transitioned
 * properties, so the ring's hue is still interpolating from `currentColor`
 * for 150ms after focus lands; a colour read taken here would report the
 * link's own text colour and look exactly like a missing focus ring.
 */
/**
 * Everything the page can answer without a key press. The furniture links
 * come back stamped but ungraded: whether Tab reaches them, and what ring
 * the browser paints when it does, is settled by `walkTabOrder`.
 */
function collectApparatus(): Omit<
  ApparatusObservation,
  'route' | 'viewport' | 'furnitureLinks'
> & {
  focusableCount: number;
  furnitureLinks: Array<{
    section: string;
    href: string;
    text: string;
    occurrence: string;
    documentOrder: number;
    restingRing: string;
  }>;
} {
  const round = (value: number) => Math.round(value * 100) / 100;
  const clean = (el: Element | null | undefined) =>
    (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const parse = (colour: string): [number, number, number, number] | null => {
    const match = colour.match(/-?[\d.]+/g);
    if (!match || match.length < 3) return null;
    return [
      Number(match[0]),
      Number(match[1]),
      Number(match[2]),
      match.length > 3 ? Number(match[3]) : 1,
    ];
  };
  const luminance = (rgb: [number, number, number]) =>
    0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  /** The first ancestor background that is not fully transparent. */
  const backdrop = (el: Element): [number, number, number] => {
    let node: Element | null = el;
    while (node) {
      const parsed = parse(getComputedStyle(node).backgroundColor);
      if (parsed && parsed[3] > 0) return [parsed[0], parsed[1], parsed[2]];
      node = node.parentElement;
    }
    return [255, 255, 255];
  };
  const contrast = (el: Element) => {
    const fg = parse(getComputedStyle(el).color);
    if (!fg) return 0;
    const a = luminance([fg[0], fg[1], fg[2]]);
    const b = luminance(backdrop(el));
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return round((hi + 0.05) / (lo + 0.05));
  };

  /**
   * Every element that can take sequential focus, in document order. The
   * position in this list is the link's place in the Tab order, which is
   * what "reachable with Tab in visual order" is asking about.
   */
  const focusables = Array.from(
    document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, summary, [tabindex]',
    ),
  ).filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.tabIndex < 0) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    // The skip link parks off-screen until focused; it is reachable.
    return rect.width > 0 || rect.height > 0 || el.classList.contains('skip-link');
  });
  const orderOf = new Map(focusables.map((el, index) => [el, index]));

  const describedByResolves = (el: Element) => {
    const id = el.getAttribute('aria-describedby');
    if (!id) return false;
    const target = document.getElementById(id);
    return Boolean(target && clean(target).length > 0);
  };

  const column = document.querySelector('[data-prose-column]');
  const columnRect = column?.getBoundingClientRect() ?? null;

  const trail = document.querySelector('nav[aria-label="Breadcrumb"]');
  const taxonomy = Array.from(document.querySelectorAll('nav')).filter(
    (nav) => nav !== trail,
  );

  const here = window.location.pathname;
  const hasMatchingNavLink = taxonomy.some((nav) =>
    Array.from(nav.querySelectorAll('a[href]')).some(
      (link) => new URL((link as HTMLAnchorElement).href).pathname === here,
    ),
  );

  /**
   * The furniture links, stamped so the Tab walk that follows can name the
   * exact anchor it reached. `documentOrder` is where the link sits among
   * the focusable elements of the page; `restingRing` is its outline and
   * shadow before anything is focused. The two facts the row is about --
   * whether Tab actually reaches the link, and whether the ring changes
   * when it does -- are measured by pressing the key, not modelled here.
   */
  const furnitureLinks: Array<{
    section: string;
    href: string;
    text: string;
    occurrence: string;
    documentOrder: number;
    restingRing: string;
  }> = [];
  const collectFurniture = (section: string, scope: Element | null) => {
    if (!scope) return;
    for (const link of Array.from(scope.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
      const style = getComputedStyle(link);
      const occurrence = String(furnitureLinks.length);
      link.setAttribute('data-furniture-occurrence', occurrence);
      furnitureLinks.push({
        section,
        href: link.getAttribute('href') ?? '',
        text: clean(link),
        occurrence,
        documentOrder: orderOf.get(link) ?? -1,
        restingRing: `${style.outlineStyle}|${style.outlineWidth}|${style.boxShadow}`,
      });
    }
  };
  collectFurniture('breadcrumb', trail);
  collectFurniture('see-also', document.querySelector('[data-section="see-also"]'));
  collectFurniture(
    'linked-from',
    document.querySelector('[data-section="linked-from"]'),
  );
  collectFurniture(
    'references',
    document.querySelector('section[aria-labelledby="references-heading"]'),
  );

  const referencesSection = document.querySelector(
    'section[aria-labelledby="references-heading"]',
  );
  const entries = Array.from(
    referencesSection?.querySelectorAll('[data-reference-id]') ?? [],
  ).map((entry, index) => {
    const link = entry.querySelector<HTMLAnchorElement>(
      'a[data-reference-source-link]',
    );
    const style = link ? getComputedStyle(link) : null;
    const rect = entry.getBoundingClientRect();
    return {
      id: entry.getAttribute('data-reference-id') ?? '',
      index,
      sourceHref: link?.getAttribute('href') ?? '',
      title: clean(link),
      colour: style?.color ?? '',
      decorationLine: style?.textDecorationLine ?? 'none',
      contrast: link ? contrast(link) : 0,
      furtherReading: entry.getAttribute('data-further-reading') === 'true',
      overflowPx:
        columnRect === null
          ? 0
          : round(Math.max(0, rect.right - columnRect.right)),
      focusable: link ? (orderOf.get(link) ?? -1) >= 0 : false,
    };
  });

  const keysUnder = (selector: string) =>
    Array.from(document.querySelectorAll(`${selector} [data-article-key]`)).map(
      (li) => li.getAttribute('data-article-key') ?? '',
    );

  const citations = Array.from(
    document.querySelectorAll('[data-cite-id]'),
  ).map((chip) => {
    const link = chip.querySelector<HTMLAnchorElement>('a[href]');
    const tooltip = chip.querySelector('[role="tooltip"]');
    const jump = Array.from(chip.querySelectorAll<HTMLAnchorElement>('a[href]')).find(
      (candidate) => (candidate.getAttribute('href') ?? '').startsWith('#ref-'),
    );
    return {
      id: chip.getAttribute('data-cite-id') ?? '',
      label: clean(link),
      href: link?.href ?? '',
      opensExternally: link?.getAttribute('target') === '_blank',
      tooltipText: clean(tooltip),
      describedByResolves: link ? describedByResolves(link) : false,
      referenceHref: jump?.getAttribute('href') ?? null,
      // Containment, never identity with the first match: an article carries
      // six `data-pagefind-body` regions (components mark their own), so
      // comparing against `querySelector`'s first hit called every chip in
      // the other five "outside the prose" while they sat in the middle of a
      // sentence.
      inProse: chip.closest('[data-pagefind-body]') !== null,
    };
  });

  const terms = Array.from(document.querySelectorAll('[data-term-id]')).map(
    (host) => {
      const link = host.querySelector<HTMLAnchorElement>('a[href]');
      const tooltip = host.querySelector('[role="tooltip"]');
      const style = link ? getComputedStyle(link) : null;
      return {
        id: host.getAttribute('data-term-id') ?? '',
        text: clean(link),
        href: link?.getAttribute('href') ?? '',
        focusable: link ? (orderOf.get(link) ?? -1) >= 0 : false,
        describedByResolves: link ? describedByResolves(link) : false,
        tooltipText: clean(tooltip),
        decorationLine: style?.textDecorationLine ?? 'none',
        decorationStyle: style?.textDecorationStyle ?? 'solid',
        distinguishedWithoutColour:
          (style?.textDecorationLine ?? 'none').includes('underline') ||
          (style?.textDecorationLine ?? 'none').includes('line-through') ||
          Number.parseInt(style?.fontWeight ?? '400', 10) >= 600 ||
          (style?.fontStyle ?? 'normal') !== 'normal',
      };
    },
  );

  return {
    documentScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    visibleTextLength: ((document.body as HTMLElement).innerText ?? '').trim()
      .length,
    breadcrumb: {
      landmarkCount: document.querySelectorAll('nav[aria-label="Breadcrumb"]')
        .length,
      label: trail?.getAttribute('aria-label') ?? null,
      distinctFromTaxonomyNav:
        trail !== null && !taxonomy.some((nav) => nav.contains(trail)),
      items: Array.from(trail?.querySelectorAll('li') ?? []).map((item) => {
        const link = item.querySelector<HTMLAnchorElement>('a[href]');
        const carrier = (link ?? item.querySelector('span') ?? item) as Element;
        const style = getComputedStyle(carrier);
        return {
          text: clean(link ?? item.querySelector('span') ?? item),
          tag: (link ?? item).tagName.toLowerCase(),
          href: link?.getAttribute('href') ?? null,
          isLink: link !== null,
          ariaCurrent: item.querySelector('[aria-current]')
            ? (item
                .querySelector('[aria-current]')
                ?.getAttribute('aria-current') ?? null)
            : null,
          colour: style.color,
          decorationLine: style.textDecorationLine,
        };
      }),
    },
    // Not just how many current-page markers exist, but WHAT each one is
    // on. Counting alone accepted the marker sitting on any element at all
    // - a footer link, a card, the wrong nav item - as long as exactly one
    // existed and some navigation link happened to match the route. The
    // marker's whole job is to say "this navigation item is where you are",
    // so the element it sits on has to be that item.
    ariaCurrentPage: Array.from(
      document.querySelectorAll('[aria-current="page"]'),
    ).map((el) => {
      const href =
        el.tagName === 'A' ? (el as HTMLAnchorElement).href : null;
      let pathname: string | null = null;
      if (href !== null) {
        try {
          pathname = new URL(href).pathname;
        } catch {
          pathname = null;
        }
      }
      return {
        outline: el.outerHTML.replace(/\s+/g, ' ').slice(0, 120),
        href,
        insideNavLandmark: taxonomy.some((nav) => nav.contains(el)),
        matchesRoute: pathname !== null && pathname === here,
      };
    }),
    hasMatchingNavLink,
    focusableCount: focusables.length,
    references: {
      present: referencesSection !== null,
      headingId: 'references-heading',
      headingText: clean(document.getElementById('references-heading')),
      entries,
    },
    seeAlso: {
      present: document.querySelector('[data-section="see-also"]') !== null,
      keys: keysUnder('[data-section="see-also"]'),
    },
    linkedFrom: {
      present: document.querySelector('[data-section="linked-from"]') !== null,
      keys: keysUnder('[data-section="linked-from"]'),
    },
    citations,
    terms,
    furnitureLinks,
  };
}

type CollectedApparatus = Awaited<ReturnType<typeof collectApparatus>>;

/**
 * The real Tab order, taken by pressing the key.
 *
 * What this replaces was a model: the document was queried for elements
 * that look focusable, their index in that list was recorded as the link's
 * "tab index", and the focus ring was read after calling `element.focus()`
 * from script. Both are the wrong instrument for `VAL-WIKI-018`, which
 * says the link is reachable BY TAB and shows a ring when it is. A
 * `querySelectorAll` cannot see that an ancestor is `inert`, that a
 * dialog traps focus above the link, that a positive `tabindex` reordered
 * the page, or that the browser skips the element for any of the reasons
 * the focus algorithm has and a selector list does not. And a scripted
 * `focus()` does not set the `:focus-visible` heuristic a keyboard press
 * sets, so a ring that only ever appears for keyboard users read the same
 * as a ring that never appears at all.
 *
 * Focus is recorded by a `focusin` listener rather than by an evaluate per
 * press, so the walk costs one round trip per Tab instead of two, and the
 * ring is read at the instant the browser painted it.
 */
async function walkTabOrder(
  page: Page,
  collected: CollectedApparatus,
): Promise<FurnitureLinkObservation[]> {
  await page.evaluate(() => {
    const trace: Array<{
      occurrence: string | null;
      ring: string;
      focusVisible: boolean;
    }> = [];
    (window as unknown as { __furnitureTrace: typeof trace }).__furnitureTrace =
      trace;
    document.addEventListener(
      'focusin',
      () => {
        const el = document.activeElement;
        if (!(el instanceof HTMLElement)) return;
        const style = getComputedStyle(el);
        trace.push({
          occurrence: el.getAttribute('data-furniture-occurrence'),
          ring: `${style.outlineStyle}|${style.outlineWidth}|${style.boxShadow}`,
          focusVisible: el.matches(':focus-visible'),
        });
      },
      true,
    );
    document.body.setAttribute('tabindex', '-1');
    (document.body as HTMLElement).focus();
    // Parking focus on the body is itself a focusin, and counting it would
    // make a stop index one larger than the Tab press that produced it.
    trace.length = 0;
  });

  // Enough presses to walk the page once, plus room for the browser's own
  // stops (the address bar returns focus to the document at the wrap).
  const budget = collected.focusableCount + 8;
  const wanted = new Set(
    collected.furnitureLinks.map(({ occurrence }) => occurrence),
  );
  let pressed = 0;
  while (pressed < budget) {
    await page.keyboard.press('Tab');
    pressed += 1;
    if (pressed % 25 === 0 || pressed === budget) {
      const seen = await page.evaluate(
        () =>
          (
            window as unknown as {
              __furnitureTrace: Array<{ occurrence: string | null }>;
            }
          ).__furnitureTrace
            .map(({ occurrence }) => occurrence)
            .filter((occurrence): occurrence is string => occurrence !== null),
      );
      if (seen.length >= wanted.size && wanted.size > 0) {
        const found = new Set(seen);
        if ([...wanted].every((occurrence) => found.has(occurrence))) break;
      }
    }
  }

  const trace = await page.evaluate(
    () =>
      (
        window as unknown as {
          __furnitureTrace: Array<{
            occurrence: string | null;
            ring: string;
            focusVisible: boolean;
          }>;
        }
      ).__furnitureTrace,
  );
  const stopByOccurrence = new Map<
    string,
    { stop: number; ring: string; focusVisible: boolean }
  >();
  trace.forEach((entry, index) => {
    if (entry.occurrence === null) return;
    if (stopByOccurrence.has(entry.occurrence)) return;
    stopByOccurrence.set(entry.occurrence, {
      stop: index,
      ring: entry.ring,
      focusVisible: entry.focusVisible,
    });
  });

  return collected.furnitureLinks.map((link) => {
    const reached = stopByOccurrence.get(link.occurrence);
    return {
      section: link.section,
      href: link.href,
      text: link.text,
      documentOrder: link.documentOrder,
      tabStop: reached?.stop ?? -1,
      tabPresses: pressed,
      restingRing: link.restingRing,
      focusedRing: reached?.ring ?? null,
      focusVisible: reached?.focusVisible ?? false,
    };
  });
}

test.describe('brand-v2 article wiki apparatus', () => {
  /**
   * The one place the apparatus rows are measured across the whole article
   * corpus. Persisted because the enforcement generator has no other way to
   * know what a document rendered: a bibliography's wrap behaviour, a
   * crumb's underline and a chip's resolved external href are all facts
   * about a painted page.
   */
  test('every published article renders the derived relationship graph and the brand-v2 apparatus treatment', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    const articleRoutes = brandV2Registry.routes.public
      .filter(({ routeKind }) => routeKind === 'article')
      .map(({ path }) => path);
    expect(articleRoutes.length).toBeGreaterThan(5);

    await suppressMotionFromFirstPaint(page);

    const observations: ApparatusObservation[] = [];
    for (const viewport of APPARATUS_VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      for (const route of articleRoutes) {
        const response = await page.goto(`${staticBase}${route}`);
        expect(response?.status(), route).toBe(200);
        await settleForMeasurement(page);
        const collected = await page.evaluate(collectApparatus);
        observations.push({
          ...collected,
          furnitureLinks: await walkTabOrder(page, collected),
          route,
          viewport: viewport.id,
        });
      }
    }

    const artifact = {
      version: 1 as const,
      fingerprint: apparatusEvidenceFingerprint({ root: ROOT }),
      viewports: APPARATUS_VIEWPORTS.map(({ id }) => id),
      articleRoutes,
      observations,
    };

    // Enforced here as well as in the generator, so an apparatus that
    // regressed fails the suite that measured it and not only the artifact
    // check downstream.
    const evidence = readApparatusRuntimeEvidence({
      artifact,
      articleRoutes,
      fingerprint: artifact.fingerprint,
      root: ROOT,
    });

    for (const [label, verdicts] of [
      [
        'VAL-B2-ART-010 relationship preservation',
        relationshipPreservationVerdicts(
          evidence,
          ROOT,
          relationshipSourceDrift(ROOT),
        ),
      ],
      ['VAL-WIKI-016 breadcrumb truth', breadcrumbTruthVerdicts(evidence, ROOT)],
      ['VAL-WIKI-006 reference sheet', referenceSheetVerdicts(evidence)],
      ['VAL-WIKI-018 furniture reach', furnitureReachVerdicts(evidence)],
      ['VAL-GLOSS-004 term affordance', termAffordanceVerdicts(evidence)],
      ['VAL-NAV-022 citation chips', citationChipVerdicts(evidence)],
    ] as const) {
      const failures = [...verdicts.values()]
        .flatMap(({ failures: own }) => own)
        .sort();
      expect(failures.slice(0, 12), label).toEqual([]);
    }

    const artifactPath = join(ROOT, APPARATUS_RUNTIME_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });

  /**
   * The sweep above measures sealed colours, so it can only be trusted if a
   * document that is still settling cannot leak an interpolated value into
   * it. This drives that condition on purpose.
   *
   * Both halves are asserted. The control proves the plant still reproduces
   * the defect, so the guard announces it rather than passing silently if a
   * future browser stops transitioning here; the guarded half proves the
   * suppression removes it. Without the control this test would pass on a
   * page where nothing ever transitioned, which is the population trap one
   * scope down.
   */
  test('reads the at-rest colour when the author stylesheet reaches an anchor after it has painted', async ({
    browser,
    staticBase,
  }) => {
    const route = brandV2Registry.routes.public.find(
      ({ routeKind }) => routeKind === 'article',
    )?.path;
    expect(route, 'registry publishes at least one article route').toBeTruthy();

    /**
     * Disable and re-enable the shipped stylesheet. The anchor falls back to
     * the user-agent link colour and is then restyled, which is the same
     * before-change/after-change pair a late stylesheet produces, and it
     * starts the `transition-colors` run that the reported failure sampled.
     */
    const plantLateStylesheet = async (page: Page) => {
      await page.evaluate(async () => {
        const linked = Array.from(document.styleSheets).filter(
          (sheet) => sheet.ownerNode instanceof HTMLLinkElement,
        );
        for (const sheet of linked) sheet.disabled = true;
        // Long enough for the unstyled colour to be the settled one, so the
        // restyle below starts its run from the user-agent blue rather than
        // from a value still a few frames away from the accent.
        await new Promise((resolve) => setTimeout(resolve, 300));
        for (const sheet of linked) sheet.disabled = false;
      });
    };

    const referenceColours = (page: Page) =>
      page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLAnchorElement>(
            'a[data-reference-source-link]',
          ),
        ).map((link) => getComputedStyle(link).color),
      );

    const control = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    try {
      await control.goto(`${staticBase}${route}`);
      await control.evaluate(() => document.fonts.ready);
      await plantLateStylesheet(control);
      const during = await referenceColours(control);
      expect(during.length, 'the route carries reference source links').toBeGreaterThan(0);
      expect(
        during.some((colour) => colour !== SIGNAL_BLUE_RENDERED),
        `the plant no longer starts a colour transition, so this guard proves nothing (saw ${[...new Set(during)].join(', ')})`,
      ).toBe(true);
    } finally {
      await control.close();
    }

    const guarded = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    try {
      await suppressMotionFromFirstPaint(guarded);
      await guarded.goto(`${staticBase}${route}`);
      await plantLateStylesheet(guarded);
      await settleForMeasurement(guarded);
      const settled = await referenceColours(guarded);
      expect(settled.length).toBeGreaterThan(0);
      expect([...new Set(settled)]).toEqual([SIGNAL_BLUE_RENDERED]);
    } finally {
      await guarded.close();
    }
  });
});
