import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test, expect } from './brand-v2-static-fixture';
import {
  ACTION_INK_RGB,
  HOME_COMPOSITION_ANCHORS,
  HOME_COMPOSITION_EVIDENCE_PATH,
  HOME_ROUTE,
  HOME_VIEWPORT,
  SELECTION_LIME_RGB,
  canonicalDomainEntries,
  domainDestinationVerdicts,
  heroLockupVerdicts,
  homeCompositionVerdicts,
  homeEvidenceFingerprint,
  readHomeCompositionEvidence,
  type HomeCompositionEvidence,
} from '../../lib/brand-v2-home-evidence';
import { canonicalDomainDestinations } from '../../lib/home-populations';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../../lib/identity';

const ROOT = process.cwd();

/**
 * Reader-facing build-progress and planned-work copy. `VAL-DESIGN-001` and
 * `VAL-B2-SHELL-006` both forbid it on home; counts of currently available
 * sourced content stay allowed, so the patterns match commitments and
 * status rather than any number.
 */
const PROGRESS_PATTERNS = [
  'coming soon',
  'under construction',
  'work in progress',
  'in progress',
  'planned',
  'to be written',
  'not yet written',
  'stay tuned',
  'watch this space',
  'more to come',
  'placeholder',
  'roadmap',
  'milestone 1',
  'phase 1',
];

type CollectArgs = {
  lime: string;
  ink: string;
  progressPatterns: string[];
  domains: Array<{ domain: string; name: string; href: string }>;
};

/**
 * Runs inside the page. Discovery is structural wherever a structural query
 * exists: hero lockups are found by heading level AND by the wordmark type
 * role, so a second lockup that is not an `h1` is found and then failed
 * rather than never looked at; the descriptor is found by resolved font
 * family rather than by class name; and the lime highlights are found by
 * computed paint rather than by an annotation the page could simply omit.
 */
function collectHome(args: CollectArgs) {
  const round = (value: number) => Math.round(value * 100) / 100;
  const main = document.querySelector('main');
  if (!main) throw new Error('home rendered no main landmark');
  const text = (el: Element) =>
    ((el as HTMLElement).innerText ?? el.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  const box = (el: Element) => {
    const rect = el.getBoundingClientRect();
    return {
      topPx: round(rect.top + window.scrollY),
      bottomPx: round(rect.bottom + window.scrollY),
      heightPx: round(rect.height),
    };
  };
  const familyHead = (style: CSSStyleDeclaration) =>
    style.fontFamily.split(',')[0].replace(/["']/g, '').trim();

  const lockupElements = [
    ...new Set([
      ...main.querySelectorAll('h1'),
      ...main.querySelectorAll('[data-tektur-role="home-wordmark"]'),
    ]),
  ].sort((left, right) =>
    left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1,
  );

  const heroLockups = lockupElements.map((el, index) => {
    const style = getComputedStyle(el);
    const geometry = box(el);
    const lineHeightPx = parseFloat(style.lineHeight);
    // The descriptor is the mono leaf paragraph inside the same sheet as
    // the lockup, resolved by computed family so a class rename cannot
    // quietly turn the check off.
    const sheet = el.closest('section > div') ?? el.parentElement ?? el;
    const descriptor =
      [...sheet.querySelectorAll('p')].find((candidate) =>
        getComputedStyle(candidate).fontFamily.toLowerCase().includes('mono'),
      ) ?? null;
    return {
      index,
      text: text(el),
      fontFamilyHead: familyHead(style),
      fontSizePx: round(parseFloat(style.fontSize)),
      lineHeightPx: round(lineHeightPx),
      heightPx: geometry.heightPx,
      renderedLines:
        lineHeightPx > 0 ? Math.round(geometry.heightPx / lineHeightPx) : 0,
      topPx: geometry.topPx,
      bottomPx: geometry.bottomPx,
      descriptorText: descriptor ? text(descriptor) : null,
      descriptorFontFamilyHead: descriptor
        ? familyHead(getComputedStyle(descriptor))
        : null,
    };
  });

  const supportingSizes = [...main.querySelectorAll('h2')].map((el) =>
    round(parseFloat(getComputedStyle(el).fontSize)),
  );

  const actionElements = [...main.querySelectorAll('a, button')].filter(
    (el) =>
      (el as HTMLElement).dataset.brandControlId !== undefined ||
      getComputedStyle(el).backgroundColor === args.ink,
  );
  const actions = actionElements.map((el) => {
    const style = getComputedStyle(el);
    const geometry = box(el);
    return {
      controlId: (el as HTMLElement).dataset.brandControlId ?? null,
      accessibleName: text(el),
      href: el.getAttribute('href'),
      backgroundColour: style.backgroundColor,
      colour: style.color,
      topPx: geometry.topPx,
      bottomPx: geometry.bottomPx,
    };
  });

  const highlights = [...main.querySelectorAll('*')]
    .map((el) => {
      const style = getComputedStyle(el);
      const carriers: string[] = [];
      if (style.backgroundColor === args.lime) carriers.push('background');
      if (style.color === args.lime) carriers.push('color');
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
        const colour = style.getPropertyValue(
          `border-${side.toLowerCase()}-color`,
        );
        const width = parseFloat(
          style.getPropertyValue(`border-${side.toLowerCase()}-width`),
        );
        if (colour === args.lime && width > 0) {
          carriers.push(`border-${side.toLowerCase()}`);
        }
      }
      if (
        style.textDecorationColor === args.lime &&
        style.textDecorationLine !== 'none'
      ) {
        carriers.push('text-decoration');
      }
      if (carriers.length === 0) return null;
      const el2 = el as HTMLElement;
      const ariaState = ['aria-selected', 'aria-pressed', 'aria-current'].find(
        (attribute) => el.hasAttribute(attribute),
      );
      const geometry = box(el);
      return {
        tag: el.tagName.toLowerCase(),
        carriers,
        text: text(el).slice(0, 80),
        // `data-brand-highlight` is deliberately not a cue. It is addressed
        // to this sweep, and a reader in greyscale or forced colours meets
        // nothing at all where it is the only thing beside the lime.
        nonColourCue:
          el.tagName === 'MARK' ? 'mark-element' : (ariaState ?? null),
        annotation: el2.dataset.brandHighlight ?? null,
        topPx: geometry.topPx,
        bottomPx: geometry.bottomPx,
      };
    })
    .filter((entry) => entry !== null);

  const fourSided = (el: Element) => {
    const style = getComputedStyle(el);
    return (['top', 'right', 'bottom', 'left'] as const).every((side) => {
      const width = parseFloat(
        style.getPropertyValue(`border-${side}-width`),
      );
      const colour = style.getPropertyValue(`border-${side}-color`);
      return (
        width >= 1 && colour !== 'transparent' && colour !== 'rgba(0, 0, 0, 0)'
      );
    });
  };

  const hrefMatches = (href: string, target: string) => {
    const trim = (value: string) =>
      value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
    return trim(new URL(href, location.href).pathname) === trim(target);
  };

  const domainEntries = args.domains.flatMap(({ href }) => {
    const links = [...main.querySelectorAll('a[href]')].filter((link) =>
      hrefMatches(link.getAttribute('href') ?? '', href),
    );
    return links.map((link) => {
      const row = link.closest('li') ?? link.parentElement ?? link;
      const linkText = text(link);
      const rowText = text(row);
      const geometry = box(row);
      return {
        name: linkText,
        href,
        description: rowText.startsWith(linkText)
          ? rowText.slice(linkText.length).trim()
          : rowText,
        topPx: geometry.topPx,
        bottomPx: geometry.bottomPx,
        heightPx: geometry.heightPx,
        bordered: fourSided(row),
      };
    });
  });

  // The structural form a section actually has, measured rather than read
  // off the annotation the section writes about itself.
  const surfaceForm = (node: Element): string => {
    const style = getComputedStyle(node);
    const frame = (['top', 'right', 'bottom', 'left'] as const)
      .map((side) => {
        const width = round(
          parseFloat(style.getPropertyValue(`border-${side}-width`)) || 0,
        );
        // A zero-width border paints nothing, and its resolved colour tracks
        // `color`, so including it would make two identically painted boxes
        // measure as different surfaces because their text differs.
        return width === 0
          ? '0'
          : `${width}${style.getPropertyValue(`border-${side}-style`)}${style.getPropertyValue(`border-${side}-color`)}`;
      })
      .join(',');
    const background = style.backgroundColor;
    return [
      background === 'rgba(0, 0, 0, 0)' ? 'transparent' : background,
      frame,
      round(parseFloat(style.borderTopLeftRadius) || 0),
      style.boxShadow === 'none' ? 'no-shadow' : style.boxShadow,
    ].join('|');
  };
  const headingForm = (heading: Element | null): string => {
    if (!heading) return 'no-heading';
    const style = getComputedStyle(heading);
    return [
      heading.tagName.toLowerCase(),
      round(parseFloat(style.fontSize)),
      style.fontWeight,
      (style.fontFamily.split(',')[0] ?? '').trim().replace(/["']/g, ''),
      style.textTransform,
    ].join('/');
  };
  const actionForm = (node: Element): string => {
    const treatments = [
      ...node.querySelectorAll('a[href], button, [role="button"]'),
    ].map((control) => {
      const style = getComputedStyle(control);
      return `${control.tagName.toLowerCase()}[${style.backgroundColor}/${style.color}/${round(parseFloat(style.borderTopWidth) || 0)}]`;
    });
    return [...new Set(treatments)].sort().join(',') || 'no-actions';
  };
  const CONTENT_TAGS = [
    'p',
    'ul',
    'ol',
    'li',
    'dl',
    'figure',
    'img',
    'svg',
    'canvas',
    'table',
    'input',
    'h3',
    'h4',
    'blockquote',
    'pre',
  ];
  const contentForm = (node: Element): string =>
    CONTENT_TAGS.map(
      (tag) => `${tag}=${node.querySelectorAll(tag).length}`,
    ).join(',');

  const sectionElements = [...main.querySelectorAll(':scope > section')];
  const sections = sectionElements.map((el, index) => {
    const labelledBy = el.getAttribute('aria-labelledby');
    const heading =
      (labelledBy ? document.getElementById(labelledBy) : null) ??
      el.querySelector('h1, h2');
    // The distinct painted frames the section puts on the page, its own and
    // its direct children's. Reading only the section would measure every
    // one of them as the same transparent box, because the sheet and the
    // instrument card are containers inside it; keeping the list ordered and
    // repeated would instead make two identically treated sections differ
    // merely by how many boxes they happen to contain.
    const surface = [
      ...new Set([el, ...el.children].map(surfaceForm)),
    ]
      .sort()
      .join(' + ');
    const surfaceHeadingAction = [
      surface,
      headingForm(heading),
      actionForm(el),
    ].join(' || ');
    return {
      index,
      label: el.getAttribute('aria-label') ?? (heading ? text(heading) : ''),
      signature: (el as HTMLElement).dataset.brandModuleSignature ?? null,
      derivedSignature: `${surfaceHeadingAction} || ${contentForm(el)}`,
      derivedSurfaceHeadingAction: surfaceHeadingAction,
      headingTag: heading?.tagName.toLowerCase() ?? null,
      headingSizePx: heading
        ? round(parseFloat(getComputedStyle(heading).fontSize))
        : null,
    };
  });

  const chromeText = [
    ...[
      ...main.querySelectorAll(
        'h1, h2, h3, h4, button, [role="button"], figcaption, [aria-label]',
      ),
    ].map((el) => text(el)),
    ...[...main.querySelectorAll('img[alt]')].map(
      (el) => el.getAttribute('alt') ?? '',
    ),
    ...[...main.querySelectorAll('[aria-label]')].map(
      (el) => el.getAttribute('aria-label') ?? '',
    ),
  ].join(' | ');

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const anchors = [...document.querySelectorAll('a')];
  const domainAnchorCounts: Record<string, number> = {};
  for (const { name } of args.domains) {
    domainAnchorCounts[name] = anchors.filter(
      (anchor) => normalize(text(anchor)) === normalize(name),
    ).length;
  }

  // The index owner is the section that renders the domain rows; every
  // other section is prose and may not re-enumerate the taxonomy.
  const indexOwner = sectionElements.find(
    (section) =>
      args.domains.filter(({ href }) =>
        [...section.querySelectorAll('a[href]')].some((link) =>
          hrefMatches(link.getAttribute('href') ?? '', href),
        ),
      ).length >= 4,
  );
  const proseSectionDomainNames = sectionElements
    .filter((section) => section !== indexOwner)
    .map((section) => {
      const sectionText = normalize(text(section));
      return {
        label:
          section.getAttribute('aria-label') ??
          text(section.querySelector('h1, h2') ?? section).slice(0, 60),
        names: args.domains
          .map(({ name }) => name)
          .filter((name) => sectionText.includes(normalize(name))),
      };
    });

  const overviewParagraph =
    [...main.querySelectorAll('p')].find((paragraph) =>
      /encyclopedia of modern robotics/i.test(text(paragraph)),
    ) ?? null;

  const bodyText = text(main).toLowerCase();
  const progressMetadataMatches = args.progressPatterns.filter((pattern) =>
    bodyText.includes(pattern),
  );

  const borderedCardCount = [...main.querySelectorAll('*')].filter(
    (el) => fourSided(el) && el.getBoundingClientRect().height >= 80,
  ).length;

  return {
    visibleTextLength: text(main).length,
    documentScrollWidthPx: document.documentElement.scrollWidth,
    documentClientWidthPx: document.documentElement.clientWidth,
    heroLockups,
    largestSupportingHeadingPx:
      supportingSizes.length > 0 ? Math.max(...supportingSizes) : null,
    actions,
    highlights,
    domainEntries,
    sections,
    chromeText,
    domainAnchorCounts,
    proseSectionDomainNames,
    overviewProse: overviewParagraph ? text(overviewParagraph) : '',
    progressMetadataMatches,
    borderedCardCount,
  };
}

test.describe('brand-v2 home composition', () => {
  /**
   * The one place the home-composition claims are measured. It is persisted
   * because the enforcement generator has no other way to know what the page
   * laid out: whether the black action and the lime highlight are inside the
   * first viewport is geometry, and a generator that re-read `app/page.tsx`
   * would be comparing source with itself.
   */
  test('home renders one dominant lockup, a black action, a lime highlight, and all seven domain destinations', async ({
    page,
    staticBase,
  }) => {
    const domains = canonicalDomainDestinations();
    expect(domains.length, 'canonical domain population').toBeGreaterThan(0);

    await page.setViewportSize({
      width: HOME_VIEWPORT.width,
      height: HOME_VIEWPORT.height,
    });
    const response = await page.goto(`${staticBase}${HOME_ROUTE}`);
    expect(response?.status(), HOME_ROUTE).toBe(200);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    // Playwright leaves the cursor where the last action put it, and a
    // group-hover accent baked into a measurement reads as a real colour.
    await page.mouse.move(2, 2);

    const collected = await page.evaluate(collectHome, {
      lime: SELECTION_LIME_RGB,
      ink: ACTION_INK_RGB,
      progressPatterns: PROGRESS_PATTERNS,
      domains: domains.map(({ domain, name, href }) => ({
        domain,
        name,
        href,
      })),
    });

    const artifact: HomeCompositionEvidence = {
      version: 1,
      fingerprint: homeEvidenceFingerprint({
        root: ROOT,
        identity: PUBLIC_IDENTITY,
        descriptor: PUBLIC_DESCRIPTOR,
      }),
      viewport: HOME_VIEWPORT.id,
      route: HOME_ROUTE,
      ...collected,
    };

    // Enforced here as well as in the generator, so a red home fails the
    // suite that measured it rather than only the artifact check.
    const evidence = readHomeCompositionEvidence({
      artifact,
      fingerprint: artifact.fingerprint,
    });
    const literals = {
      identity: PUBLIC_IDENTITY,
      descriptor: PUBLIC_DESCRIPTOR,
    };

    // VAL-B2-ID-007: one dominant lockup, one exact descriptor, no duplicate.
    expect(
      heroLockupVerdicts(evidence, literals).flatMap(({ failures }) => failures),
    ).toEqual([]);

    // VAL-B2-SHELL-006: the six composition anchors, independently.
    const anchorVerdicts = homeCompositionVerdicts(evidence, literals);
    expect(anchorVerdicts.map(({ id }) => id)).toEqual([
      ...HOME_COMPOSITION_ANCHORS,
    ]);
    expect(
      anchorVerdicts.flatMap(({ failures }) => failures),
    ).toEqual([]);

    // VAL-B2-SHELL-007: every canonical destination, by registry name.
    const destinationVerdicts = domainDestinationVerdicts(evidence, domains);
    expect(destinationVerdicts).toHaveLength(domains.length);
    expect(
      destinationVerdicts.flatMap(({ failures }) => failures),
    ).toEqual([]);

    // VAL-DESIGN-003 / VAL-CROSS-001: every canonical destination is
    // reachable inside the first viewport, not merely somewhere on the page.
    const belowFold = domains.filter(({ href, name }) =>
      canonicalDomainEntries(
        evidence.domainEntries.filter((entry) => entry.href === href),
        name,
      ).every((entry) => entry.bottomPx > HOME_VIEWPORT.height),
    );
    expect(
      belowFold.map(({ href }) => href),
      'domain entry points below the first viewport',
    ).toEqual([]);

    // VAL-DESIGN-005: bordered containers on home stay bounded.
    expect(evidence.borderedCardCount).toBeLessThanOrEqual(6);

    // VAL-DESIGN-007: each canonical name is anchor text at most twice.
    expect(
      Object.entries(evidence.domainAnchorCounts).filter(
        ([, count]) => count > 2,
      ),
    ).toEqual([]);

    // VAL-DESIGN-008: no prose section re-enumerates the taxonomy.
    expect(
      evidence.proseSectionDomainNames.filter(({ names }) => names.length >= 4),
    ).toEqual([]);

    // VAL-DESIGN-011: the overview is substantive prose, not a tagline.
    const words = evidence.overviewProse.split(/\s+/).filter(Boolean);
    expect(words.length, 'home overview words').toBeGreaterThanOrEqual(25);
    expect(
      evidence.overviewProse.split(/[.!?]+/).filter((s) => s.trim().length > 0)
        .length,
      'home overview sentences',
    ).toBeGreaterThanOrEqual(2);

    // VAL-DESIGN-012: home chrome carries no em-dash or en-dash.
    expect(evidence.chromeText.match(/[\u2013\u2014]/g) ?? []).toEqual([]);

    // No horizontal overflow at the measured viewport.
    expect(evidence.documentScrollWidthPx).toBeLessThanOrEqual(
      evidence.documentClientWidthPx,
    );

    const artifactPath = join(ROOT, HOME_COMPOSITION_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });

  /**
   * The plant proof for the anchor that carries this feature's product
   * change. A page that renders no black action has to fail the black-action
   * anchor and only that one, which is what makes the six anchors
   * independent rather than one boolean wearing six names.
   */
  test('the composition anchors fail independently when the black action is removed', async ({
    page,
    staticBase,
  }) => {
    const domains = canonicalDomainDestinations();
    await page.setViewportSize({
      width: HOME_VIEWPORT.width,
      height: HOME_VIEWPORT.height,
    });
    await page.goto(`${staticBase}${HOME_ROUTE}`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      for (const el of document.querySelectorAll(
        'main [data-brand-control-id="control:primary-action"]',
      )) {
        el.remove();
      }
      for (const el of document.querySelectorAll('main mark')) {
        el.remove();
      }
    });

    const collected = await page.evaluate(collectHome, {
      lime: SELECTION_LIME_RGB,
      ink: ACTION_INK_RGB,
      progressPatterns: PROGRESS_PATTERNS,
      domains: domains.map(({ domain, name, href }) => ({
        domain,
        name,
        href,
      })),
    });
    const planted = {
      version: 1 as const,
      fingerprint: homeEvidenceFingerprint({
        root: ROOT,
        identity: PUBLIC_IDENTITY,
        descriptor: PUBLIC_DESCRIPTOR,
      }),
      viewport: HOME_VIEWPORT.id,
      route: HOME_ROUTE,
      ...collected,
    };
    const verdicts = homeCompositionVerdicts(planted, {
      identity: PUBLIC_IDENTITY,
      descriptor: PUBLIC_DESCRIPTOR,
    });
    const failing = verdicts
      .filter(({ failures }) => failures.length > 0)
      .map(({ id }) => id);
    expect(failing.sort()).toEqual([
      'anchor:home-black-primary-action',
      'anchor:home-lime-highlight',
    ]);
  });

  /**
   * The plant for the reading this sweep used to do. Swapping the `<mark>`
   * for a lime-painted `<span>` that carries `data-brand-highlight` leaves a
   * reader in greyscale or forced colours with nothing at all, and used to
   * pass: the attribute was counted as the non-colour cue, so the sweep read
   * its own annotation back as evidence of the thing the annotation was
   * supposed to be evidence of.
   */
  test('refuses a lime highlight whose only cue is the annotation this sweep reads', async ({
    page,
    staticBase,
  }) => {
    const domains = canonicalDomainDestinations();
    await page.setViewportSize({
      width: HOME_VIEWPORT.width,
      height: HOME_VIEWPORT.height,
    });
    await page.goto(`${staticBase}${HOME_ROUTE}`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    const swapped = await page.evaluate((lime) => {
      let count = 0;
      for (const mark of [...document.querySelectorAll('main mark')]) {
        const span = document.createElement('span');
        span.textContent = mark.textContent;
        span.style.backgroundColor = lime;
        span.dataset.brandHighlight =
          (mark as HTMLElement).dataset.brandHighlight ?? 'home-premise';
        mark.replaceWith(span);
        count += 1;
      }
      return count;
    }, SELECTION_LIME_RGB);
    // The plant has to have replaced something, or the case proves nothing.
    expect(swapped).toBeGreaterThan(0);

    const collected = await page.evaluate(collectHome, {
      lime: SELECTION_LIME_RGB,
      ink: ACTION_INK_RGB,
      progressPatterns: PROGRESS_PATTERNS,
      domains: domains.map(({ domain, name, href }) => ({
        domain,
        name,
        href,
      })),
    });
    const painted = collected.highlights.filter(
      ({ annotation }) => annotation !== null,
    );
    expect(painted, 'the swapped span still paints the sealed lime').not.toHaveLength(
      0,
    );
    for (const highlight of painted) {
      expect(highlight.nonColourCue, highlight.text).toBeNull();
    }
    const verdicts = homeCompositionVerdicts(
      {
        version: 1 as const,
        fingerprint: homeEvidenceFingerprint({
          root: ROOT,
          identity: PUBLIC_IDENTITY,
          descriptor: PUBLIC_DESCRIPTOR,
        }),
        viewport: HOME_VIEWPORT.id,
        route: HOME_ROUTE,
        ...collected,
      },
      { identity: PUBLIC_IDENTITY, descriptor: PUBLIC_DESCRIPTOR },
    );
    const highlightFailures =
      verdicts.find(({ id }) => id === 'anchor:home-lime-highlight')?.failures ??
      [];
    expect(highlightFailures.join(' ')).toMatch(
      /is an annotation addressed to this sweep/,
    );
  });
});
