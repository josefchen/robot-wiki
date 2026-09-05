import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
  termAffordanceVerdicts,
  type ApparatusObservation,
} from '../../lib/brand-v2-apparatus-evidence';

const ROOT = process.cwd();

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
function collectApparatus(): Omit<
  ApparatusObservation,
  'route' | 'viewport'
> {
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

  /**
   * Does focusing this element change its own outline or shadow? Style and
   * width only, for the transition reason above.
   */
  const focusChangesRing = (el: HTMLElement) => {
    const before = getComputedStyle(el);
    const resting = `${before.outlineStyle}|${before.outlineWidth}|${before.boxShadow}`;
    const previous = document.activeElement as HTMLElement | null;
    el.focus();
    const after = getComputedStyle(el);
    const focused = `${after.outlineStyle}|${after.outlineWidth}|${after.boxShadow}`;
    el.blur();
    if (previous && previous !== document.body) previous.focus();
    return resting !== focused;
  };

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

  const furnitureLinks: Array<{
    section: string;
    href: string;
    text: string;
    tabIndex: number;
    focusVisible: boolean;
  }> = [];
  const collectFurniture = (section: string, scope: Element | null) => {
    if (!scope) return;
    for (const link of Array.from(scope.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
      furnitureLinks.push({
        section,
        href: link.getAttribute('href') ?? '',
        text: clean(link),
        tabIndex: orderOf.get(link) ?? -1,
        focusVisible: focusChangesRing(link),
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
    ariaCurrentPage: Array.from(
      document.querySelectorAll('[aria-current="page"]'),
    ).map((el) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 120)),
    hasMatchingNavLink,
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

    const observations: ApparatusObservation[] = [];
    for (const viewport of APPARATUS_VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      for (const route of articleRoutes) {
        const response = await page.goto(`${staticBase}${route}`);
        expect(response?.status(), route).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        // Colour here is time-dependent without this. Tailwind's
        // `transition-colors` covers `color` and `outline-color`, so a token
        // that settles after hydration is read mid-interpolation: a
        // reference link measured 33,88,254 on one slow route while every
        // other route measured the sealed 36,95,255, purely on timing.
        // Suppressing transitions makes the sample the at-rest value the
        // reader ends up looking at, which is the thing the contract seals.
        await page.addStyleTag({
          content:
            '*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; }',
        });
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
        );
        observations.push({
          ...(await page.evaluate(collectApparatus)),
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
        relationshipPreservationVerdicts(evidence, ROOT),
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
});
