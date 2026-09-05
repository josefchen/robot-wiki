import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brandV2Registry, test, expect } from './brand-v2-static-fixture';
import {
  ARTICLE_RUNTIME_EVIDENCE_PATH,
  ARTICLE_VIEWPORTS,
  articleEvidenceFingerprint,
  articleRuleVerdicts,
  articleTitleVerdicts,
  displayFaceVerdicts,
  homeWordmarkVerdicts,
  linkTreatmentVerdicts,
  proseFaceVerdicts,
  proseResidueVerdicts,
  readArticleRuntimeEvidence,
  readingSheetVerdicts,
  registrationTrackingVerdicts,
  roleFaceVerdicts,
  sectionHeadingVerdicts,
  titleSheetResidueVerdicts,
  titleSheetVerdicts,
  type ArticleObservation,
} from '../../lib/brand-v2-article-evidence';

const ROOT = process.cwd();

/**
 * Runs inside the page. Everything is discovered from the rendered document:
 * the prose paragraphs are every `<p>` in the reading column rather than the
 * ones a class names, the registration labels are every small mono element
 * that renders in caps rather than the ones carrying the class that tracks
 * them, and the rules are every element painting a hairline rather than the
 * ones carrying a device id. A query scoped to the annotated members could
 * never see the member that lost its annotation.
 */
function collectArticle(): Omit<ArticleObservation, 'route' | 'viewport' | 'isArticle'> {
  const round = (value: number) => Math.round(value * 100) / 100;
  const head = (family: string) =>
    (family.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '').toLowerCase();
  const nameOf = (el: Element) =>
    (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const outlineOf = (el: Element) =>
    el.outerHTML.replace(/\s+/g, ' ').slice(0, 140);
  const ratio = (style: CSSStyleDeclaration) => {
    const size = parseFloat(style.fontSize) || 0;
    const leading = parseFloat(style.lineHeight);
    if (size === 0) return 0;
    return round((Number.isNaN(leading) ? size * 1.2 : leading) / size);
  };
  const tracking = (style: CSSStyleDeclaration) => {
    const size = parseFloat(style.fontSize) || 0;
    if (size === 0) return 0;
    return Math.round(((parseFloat(style.letterSpacing) || 0) / size) * 10000) / 10000;
  };
  const faceOf = (el: Element) => {
    const style = getComputedStyle(el);
    return {
      familyHead: head(style.fontFamily),
      sizePx: round(parseFloat(style.fontSize) || 0),
      lineHeightRatio: ratio(style),
      trackingEm: tracking(style),
      weight: Number.parseInt(style.fontWeight, 10) || 0,
      variationSettings: style.fontVariationSettings,
    };
  };
  /**
   * The `0` advance of an element's own font. The measure of a paragraph is
   * only meaningful in the paragraph's own `ch`, and `ch` differs between
   * two faces set at the same size.
   */
  const zeroAdvance = (el: Element) => {
    const style = getComputedStyle(el);
    const probe = document.createElement('span');
    probe.textContent = '0';
    probe.style.cssText =
      'position:absolute;visibility:hidden;white-space:pre;width:auto;padding:0;border:0;';
    probe.style.fontStyle = style.fontStyle;
    probe.style.fontWeight = style.fontWeight;
    probe.style.fontSize = style.fontSize;
    probe.style.fontFamily = style.fontFamily;
    probe.style.letterSpacing = 'normal';
    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return round(width);
  };
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

  const column = document.querySelector('[data-prose-column]');
  const main = document.querySelector('main');
  const header = column?.querySelector('header') ?? null;

  const tekturRoles = [...document.querySelectorAll('[data-tektur-role]')].map(
    (el) => ({
      role: (el as HTMLElement).dataset.tekturRole ?? '',
      tag: el.tagName.toLowerCase(),
      text: nameOf(el).slice(0, 60),
      face: faceOf(el),
    }),
  );

  const breadcrumbLabels = [
    ...(column?.querySelectorAll('nav[aria-label="Breadcrumb"] li') ?? []),
  ].map((el) => nameOf(el).replace(/\s*\/\s*$/, ''));

  const summaries = header
    ? [...header.querySelectorAll(':scope > p')]
    : [];
  const numberOf = (value: string | undefined) =>
    value === undefined ? null : Number.parseInt(value, 10);
  const titleBlock = {
    present: header !== null,
    h1Count: document.querySelectorAll('h1').length,
    h1Text: nameOf(document.querySelector('h1') ?? document.createElement('h1')),
    summaryCount: summaries.length,
    summaryText: summaries[0] ? nameOf(summaries[0]).slice(0, 80) : '',
    breadcrumbLabels,
    lastReviewed:
      (header?.querySelector('[data-header-last-reviewed]') as HTMLElement | null)
        ?.dataset.headerLastReviewed ?? null,
    readingMinutes: numberOf(
      (header?.querySelector('[data-header-reading-minutes]') as HTMLElement | null)
        ?.dataset.headerReadingMinutes,
    ),
    citationCount: numberOf(
      (header?.querySelector('[data-header-citation-count]') as HTMLElement | null)
        ?.dataset.headerCitationCount,
    ),
    imageCount: header
      ? header.querySelectorAll('img, svg, picture, video, figure').length
      : 0,
    // A pill, chip or badge in a title sheet, however it is spelled: the
    // primitives all render a bordered inline box, and the registry marks
    // them with a surface id.
    badgeCount: header
      ? header.querySelectorAll(
          '[data-brand-surface-id], [class*="badge" i], [class*="chip" i], [class*="pill" i]',
        ).length
      : 0,
    // Small caps text above the title is the shape a domain eyebrow takes.
    eyebrowTexts: header
      ? [...header.querySelectorAll('*')]
          .filter((el) => {
            const style = getComputedStyle(el);
            const h1 = header.querySelector('h1');
            return (
              el.children.length === 0 &&
              nameOf(el).length > 0 &&
              parseFloat(style.fontSize) <= 14 &&
              h1 !== null &&
              el.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING
            );
          })
          .map((el) => nameOf(el))
      : [],
    backgroundImage: header
      ? getComputedStyle(header).backgroundImage
      : 'none',
  };

  const columnStyle = column ? getComputedStyle(column) : null;
  const columnRect = column?.getBoundingClientRect() ?? null;
  const mainRect = main?.getBoundingClientRect() ?? null;
  const sheet = {
    columnFound: column !== null,
    viewportWidthPx: window.innerWidth,
    columnLeftPx: round(columnRect?.left ?? -1),
    columnWidthPx: round(columnRect?.width ?? -1),
    paddingLeftPx: round(parseFloat(columnStyle?.paddingLeft ?? '0') || 0),
    paddingRightPx: round(parseFloat(columnStyle?.paddingRight ?? '0') || 0),
    mainLeftPx: round(mainRect?.left ?? -1),
    mainWidthPx: round(mainRect?.width ?? -1),
  };

  const prose = column?.querySelector('.prose') ?? null;
  const proseParagraphs = [...(prose?.querySelectorAll('p') ?? [])].map((el) => {
    const style = getComputedStyle(el);
    return {
      familyHead: head(style.fontFamily),
      sizePx: round(parseFloat(style.fontSize) || 0),
      lineHeightRatio: ratio(style),
      widthPx: round(el.getBoundingClientRect().width),
      zeroAdvancePx: zeroAdvance(el),
      insideRegisteredFrame:
        el.closest('[data-brand-surface-id], [data-brand-control-id]') !== null,
      text: nameOf(el).slice(0, 60),
    };
  });

  /**
   * Every addressable section heading in the reading column, linked or not.
   * Selecting the anchors instead would make the population the set of
   * headings that already pass the clause: a heading that lost its self-link
   * would leave the population rather than fail in it.
   */
  const sectionLinks = [
    ...(prose?.querySelectorAll('h2[id], h3[id]') ?? []),
  ].map((element) => {
    const heading = element as HTMLElement;
    const anchor = heading.querySelector('a[href^="#"]');
    const style = anchor ? getComputedStyle(anchor) : null;
    const control = heading.querySelector('[data-heading-permalink]');
    const controlStyle = control ? getComputedStyle(control) : null;
    const controlRect = control?.getBoundingClientRect() ?? null;
    return {
      headingId: heading.id,
      headingTag: heading.tagName.toLowerCase(),
      linked: anchor !== null,
      colour: style?.color ?? '',
      decorationLine: style?.textDecorationLine ?? '',
      decorationColour: style?.textDecorationColor ?? '',
      decorationThicknessPx: round(
        style === null
          ? 0
          : style.textDecorationThickness === 'auto'
            ? 1
            : parseFloat(style.textDecorationThickness) || 0,
      ),
      keyboardFocusable:
        anchor !== null && (anchor as HTMLElement).tabIndex >= 0,
      affordance:
        control && controlStyle && controlRect
          ? {
              tag: control.tagName.toLowerCase(),
              accessibleName: control.getAttribute('aria-label') ?? '',
              widthPx: round(controlRect.width),
              heightPx: round(controlRect.height),
              opacity: round(parseFloat(controlStyle.opacity) || 0),
              visibility: controlStyle.visibility,
            }
          : null,
    };
  });

  const describeLink = (
    kind: 'section' | 'citation' | 'glossary' | 'external' | 'internal',
    elements: Element[],
    shape: (el: Element) => string,
  ) => {
    const first = elements[0];
    const style = first ? getComputedStyle(first) : null;
    return {
      kind,
      count: elements.length,
      colour: style?.color ?? '',
      decorationLine: style?.textDecorationLine ?? '',
      decorationStyle: style?.textDecorationStyle ?? '',
      decorationColour: style?.textDecorationColor ?? '',
      familyHead: style ? head(style.fontFamily) : '',
      shape: first ? shape(first) : '',
    };
  };
  const proseAnchors = [...(prose?.querySelectorAll('a[href]') ?? [])];
  const glossaryAnchors = proseAnchors.filter((a) =>
    a.classList.contains('term-link'),
  );
  const citationAnchors = proseAnchors.filter(
    (a) => a.closest('[data-cite-id]') !== null,
  );
  const sectionAnchors = proseAnchors.filter(
    (a) => a.parentElement !== null && /^h[1-6]$/i.test(a.parentElement.tagName),
  );
  const rest = proseAnchors.filter(
    (a) =>
      !glossaryAnchors.includes(a) &&
      !citationAnchors.includes(a) &&
      !sectionAnchors.includes(a),
  );
  const isExternal = (a: Element) =>
    (a.getAttribute('href') ?? '').startsWith('http');
  /**
   * The mark the link itself carries, not the one its surroundings carry.
   * Reading the nearest registered surface instead reported a prose link
   * inside a callout as a bordered chip, which is the callout's frame and
   * not a treatment the link has.
   */
  const boxShape = (el: Element) => {
    const style = getComputedStyle(el);
    const inChip = el.closest('[data-cite-id]') !== null ? 'chip' : 'inline';
    return `${inChip} border:${style.borderTopWidth}/${style.borderTopStyle} radius:${style.borderTopLeftRadius}`;
  };
  const linkTreatments = [
    describeLink('section', sectionAnchors, boxShape),
    describeLink('citation', citationAnchors, boxShape),
    describeLink('glossary', glossaryAnchors, boxShape),
    describeLink('external', rest.filter(isExternal), boxShape),
    describeLink(
      'internal',
      rest.filter((a) => !isExternal(a)),
      boxShape,
    ),
  ];

  /**
   * A registration label: a leaf of small mono text rendered in caps. Found
   * by what it is, so a label that lost its tracking is still in the
   * population that asserts the tracking.
   */
  const registrationLabels = [...document.querySelectorAll('*')]
    .filter((el) => {
      if (el.children.length > 0) return false;
      const text = nameOf(el);
      if (text.length === 0) return false;
      const style = getComputedStyle(el);
      return (
        head(style.fontFamily).includes('mono') &&
        (parseFloat(style.fontSize) || 0) <= 12 &&
        style.textTransform === 'uppercase'
      );
    })
    .map((el) => {
      const style = getComputedStyle(el);
      return {
        text: nameOf(el).slice(0, 32),
        familyHead: head(style.fontFamily),
        sizePx: round(parseFloat(style.fontSize) || 0),
        trackingEm: tracking(style),
      };
    });

  const monoRequired = [...document.querySelectorAll('code, pre, kbd, samp')].map(
    (el) => ({
      tag: el.tagName.toLowerCase(),
      familyHead: head(getComputedStyle(el).fontFamily),
    }),
  );

  const interfaceControls = [
    ...document.querySelectorAll('button, select, [role="tab"]'),
  ]
    .filter((el) => el.closest('.prose') === null && nameOf(el).length > 0)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: nameOf(el).slice(0, 32),
      familyHead: head(getComputedStyle(el).fontFamily),
      sizePx: Number.parseFloat(getComputedStyle(el).fontSize),
    }));

  /**
   * Every hairline the reading column paints outside a registered surface or
   * control. A primitive's own frame is governed by the surface registry;
   * what this row is about is the rules the sheet itself draws.
   *
   * Two kinds of line are not rules and are left out by what they are, not
   * by whether they would pass. A fraction bar inside a typeset expression
   * is part of a glyph: it divides a numerator from a denominator, and the
   * anchor it would be asked for is the equation it is already inside. The
   * edge of replaced media is the boundary of a figure, which the row that
   * governs bounded instruments already owns.
   */
  const rules = [...(column?.querySelectorAll('*') ?? [])]
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (
        el.closest('[data-brand-surface-id], [data-brand-control-id]') !== null
      ) {
        return false;
      }
      if (el.closest('math, .katex, mjx-container') !== null) return false;
      if (
        ['IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME'].includes(el.tagName)
      ) {
        return false;
      }
      if (el.tagName === 'HR') return true;
      const style = getComputedStyle(el);
      return (['Top', 'Bottom', 'Left', 'Right'] as const).some((side) => {
        const width = parseFloat(style[`border${side}Width` as 'borderTopWidth']);
        return (
          width > 0 &&
          style[`border${side}Style` as 'borderTopStyle'] !== 'none' &&
          style[`border${side}Color` as 'borderTopColor'] !== 'rgba(0, 0, 0, 0)'
        );
      });
    })
    .map((el) => {
      const data = (el as HTMLElement).dataset;
      const anchorSelector = data.brandAnchorSelector ?? null;
      const anchor = anchorSelector
        ? document.querySelector(anchorSelector)
        : null;
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        outline: outlineOf(el),
        deviceId: data.brandDeviceId ?? null,
        anchorSelector,
        deviceEdge: data.brandDeviceEdge ?? null,
        anchorEdge: data.brandAnchorEdge ?? null,
        alignmentErrorPx:
          anchor === null
            ? null
            : round(
                Math.abs(
                  edge(rect, data.brandDeviceEdge ?? 'left') -
                    edge(
                      anchor.getBoundingClientRect(),
                      data.brandAnchorEdge ?? 'left',
                    ),
                ),
              ),
        widthPx: round(rect.width),
        heightPx: round(rect.height),
      };
    });

  return {
    visibleTextLength: ((document.body as HTMLElement).innerText ?? '').trim()
      .length,
    tekturRoles,
    titleBlock,
    sheet,
    proseParagraphs,
    sectionLinks,
    linkTreatments,
    registrationLabels,
    monoRequired,
    interfaceControls,
    rules,
  };
}

test.describe('brand-v2 article sheet and type hierarchy', () => {
  /**
   * The one place the twelve article and typography claims are measured. It
   * is persisted because the enforcement generator has no other way to know
   * what a document rendered: a `clamp()` has no size until a viewport picks
   * one, and a measure written in `ch` is a different width in each face.
   */
  test('every public route renders the sealed type hierarchy, and every article the sealed reading sheet', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    const routes = brandV2Registry.routes.public.map(({ path }) => path);
    const articleRoutes = brandV2Registry.routes.public
      .filter(({ routeKind }) => routeKind === 'article')
      .map(({ path }) => path);
    expect(routes.length).toBeGreaterThan(5);
    expect(articleRoutes.length).toBeGreaterThan(5);

    const observations: ArticleObservation[] = [];
    for (const viewport of ARTICLE_VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      for (const route of routes) {
        const response = await page.goto(`${staticBase}${route}`);
        expect(response?.status(), route).toBe(200);
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => document.fonts.ready);
        observations.push({
          ...(await page.evaluate(collectArticle)),
          route,
          viewport: viewport.id,
          isArticle: articleRoutes.includes(route),
        });
      }
    }

    const artifact = {
      version: 1 as const,
      fingerprint: articleEvidenceFingerprint({ root: ROOT }),
      viewports: ARTICLE_VIEWPORTS.map(({ id }) => id),
      routes,
      articleRoutes,
      observations,
    };

    // Enforced here as well as in the generator, so a sheet that regressed
    // fails the suite that measured it and not only the artifact check.
    const evidence = readArticleRuntimeEvidence({
      artifact,
      routes,
      articleRoutes,
      fingerprint: artifact.fingerprint,
    });

    for (const [label, verdicts] of [
      ['VAL-B2-ART-001 title sheet', titleSheetVerdicts(evidence)],
      ['VAL-B2-ART-002 reading sheet', readingSheetVerdicts(evidence)],
      ['VAL-B2-ART-003 link treatments', linkTreatmentVerdicts(evidence)],
      ['VAL-B2-ART-009 title-sheet residue', titleSheetResidueVerdicts(evidence)],
      ['VAL-B2-TYPE-003 display face', displayFaceVerdicts(evidence)],
      ['VAL-B2-TYPE-004 prose face', proseFaceVerdicts(evidence)],
      ['VAL-B2-TYPE-005 role faces', roleFaceVerdicts(evidence)],
      ['VAL-B2-TYPE-006 home wordmark', homeWordmarkVerdicts(evidence)],
      ['VAL-B2-TYPE-007 article title', articleTitleVerdicts(evidence)],
      ['VAL-B2-TYPE-008 prose residue', proseResidueVerdicts(evidence)],
      ['VAL-B2-TYPE-009 section headings', sectionHeadingVerdicts(evidence)],
      [
        'VAL-B2-TYPE-010 registration tracking',
        registrationTrackingVerdicts(evidence),
      ],
      ['VAL-DESIGN-018 article rules', articleRuleVerdicts(evidence)],
    ] as const) {
      const failures = [...verdicts.values()]
        .flatMap(({ failures: own }) => own)
        .sort();
      expect(failures.slice(0, 12), label).toEqual([]);
    }

    const artifactPath = join(ROOT, ARTICLE_RUNTIME_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });
});
