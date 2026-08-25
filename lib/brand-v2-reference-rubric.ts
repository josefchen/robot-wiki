import { z } from 'zod';
import rubricContract from '../contract/brand-v2-reference-rubric.v1.json' with {
  type: 'json',
};

const anchorIdSchema = z.enum([
  'identity',
  'hierarchy',
  'grid-alignment',
  'purposeful-devices',
  'light-dark-balance',
  'repetition-frames',
  'palette-type',
  'material-treatment',
]);

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const rubricSchema = z
  .object({
    schemaVersion: z.literal(1),
    rubricId: z.literal('robot-wiki-brand-v2-reference-features'),
    version: z.literal(1),
    references: z.tuple([
      z.literal('library/brand-reference-board.jpeg'),
      z.literal('library/brand-reference-article.png'),
    ]),
    contractLiterals: z
      .object({
        publicIdentity: z.literal('Robot Wiki'),
        descriptor: z.literal(
          'Citation-first encyclopedia of modern robot learning.',
        ),
        webDisplayFamily: z.literal('Tektur Variable'),
        ogStaticRole: z.literal('registered-static-tektur'),
        ink: z.literal('#0B0B0C'),
        graphite: z.literal('#242D33'),
        concrete: z.literal('#D9DADB'),
        paper: z.literal('#F5F6F7'),
        white: z.literal('#FFFFFF'),
        highlight: z.literal('#C6FF19'),
        signal: z.literal('#245FFF'),
      })
      .strict(),
    comparisonPolicy: z
      .object({
        crossComposition: z.literal('feature-anchors-only'),
        deterministicSameInput: z.literal(
          'pixel-or-byte-equality-allowed',
        ),
        averaging: z.literal('prohibited'),
      })
      .strict(),
    anchors: z
      .array(
        z
          .object({
            id: anchorIdSchema,
            threshold: z.string().trim().min(1),
          })
          .strict(),
      )
      .length(8),
  })
  .strict()
  .superRefine((rubric, context) => {
    const expected = anchorIdSchema.options;
    const actual = rubric.anchors.map(({ id }) => id);
    if (
      new Set(actual).size !== expected.length ||
      expected.some((id) => !actual.includes(id))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Rubric must contain every sealed anchor exactly once.',
      });
    }
  });

export const BRAND_V2_REFERENCE_RUBRIC = rubricSchema.parse(
  rubricContract,
);

export type ReferenceSurfaceKind =
  | 'home'
  | 'site-card'
  | 'article'
  | 'article-card'
  | 'discovery'
  | 'market-map'
  | 'playground';

export type ReferenceFeatureMeasurements = {
  surfaceKind: ReferenceSurfaceKind;
  viewport: { width: number; height: number };
  identity: {
    publicName: string;
    descriptor: string | null;
    descriptorRequired: boolean;
    webDisplayFamily: string | null;
    ogStaticRoleMatched: boolean | null;
    alternateSymbolCount: number;
    v1IdentityCount: number;
  };
  hierarchy: {
    primarySizePx: number;
    supportingSizePx: number;
    bodySizePx: number;
    primaryLineCount: number;
  };
  gridAndDevices: {
    registeredCount: number;
    unregisteredCount: number;
    maximumAlignmentErrorPx: number;
    missingPurposeCount: number;
    missingOwnerCount: number;
    maximumDominantMotifsPerSection: number;
    mobileDeviceCount: number;
    desktopDeviceCount: number;
    obscuringCount: number;
    inputInterceptingCount: number;
  };
  lightDarkBalance: {
    bodyIsLight: boolean;
    shellIsLight: boolean;
    proseIsLight: boolean;
    darkNonActionAreaPx2: number;
    firstViewportAreaPx2: number;
    unregisteredDarkSurfaceCount: number;
    shellOrProseIntersectionCount: number;
  };
  repetitionAndFrames: {
    registeredPopulationCount: number;
    maximumAdjacentRepeatedSignatures: number;
    redundantNestedFourSidedFrameCount: number;
    maximumFrameDepth: number;
    unregisteredDepthTwoCount: number;
  };
  paletteAndType: {
    auditedColourCount: number;
    matchingColourCount: number;
    auditedTypeRoleCount: number;
    matchingTypeRoleCount: number;
    unregisteredRoleCount: number;
    fallbackGlyphCount: number;
  };
  materialTreatment: {
    registeredRepresentativeCount: number;
    deterministicCount: number;
    contrastPassingCount: number;
    provenanceCompleteCount: number;
    externalRepresentativeCount: number;
    proseElementResolved: boolean;
    proseTextureIntersectionCount: number;
  };
};

export type BrowserReferenceFeatureConfig = {
  surfaceKind: ReferenceSurfaceKind;
  identitySelector: string;
  descriptorSelector?: string;
  descriptorRequired: boolean;
  primarySelector: string;
  supportingSelector: string;
  bodySelector: string;
  shellSelector: string;
  proseSelector?: string;
  alternateSymbolSelector: string;
  repeatedModuleSelector?: string;
};

/**
 * Browser-side collector for Playwright's page.evaluate(). Keep this function
 * self-contained: Playwright serializes its body without module closures.
 */
export function collectBrowserReferenceFeatures(
  config: BrowserReferenceFeatureConfig,
): ReferenceFeatureMeasurements {
  const root = document.documentElement;
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const one = (selector: string | undefined) =>
    selector ? document.querySelector<HTMLElement>(selector) : null;
  const all = (selector: string) =>
    [...document.querySelectorAll<HTMLElement>(selector)];
  const style = (element: Element | null) =>
    element ? getComputedStyle(element) : null;
  const numberPx = (value: string | undefined | null) => {
    const parsed = Number.parseFloat(value ?? '');
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const normalized = (element: HTMLElement | null) =>
    (element?.innerText ?? element?.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  const rgb = (value: string) => {
    const match = value.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
    return match
      ? [Number(match[1]), Number(match[2]), Number(match[3])]
      : [255, 255, 255];
  };
  const alpha = (value: string) => {
    const match = value.match(
      /rgba?\([\d.]+[,\s]+[\d.]+[,\s]+[\d.]+(?:[,\s/]+([\d.]+))?/,
    );
    return match?.[1] === undefined ? 1 : Number(match[1]);
  };
  const luminance = (value: string) => {
    const channels = rgb(value).map((channel) => {
      const normalizedChannel = channel / 255;
      return normalizedChannel <= 0.04045
        ? normalizedChannel / 12.92
        : ((normalizedChannel + 0.055) / 1.055) ** 2.4;
    });
    return (
      0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
    );
  };
  const effectiveBackground = (element: Element | null) => {
    let current = element;
    while (current) {
      const background = style(current)?.backgroundColor;
      if (background && alpha(background) > 0) return background;
      current = current.parentElement;
    }
    return 'rgb(255, 255, 255)';
  };
  const isLight = (element: Element | null) =>
    luminance(effectiveBackground(element)) >= 0.45;
  const clippedRect = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const left = Math.max(0, Math.min(viewport.width, rect.left));
    const right = Math.max(0, Math.min(viewport.width, rect.right));
    const top = Math.max(0, Math.min(viewport.height, rect.top));
    const bottom = Math.max(0, Math.min(viewport.height, rect.bottom));
    return right > left && bottom > top
      ? { left, right, top, bottom }
      : null;
  };
  const unionArea = (
    rectangles: Array<{
      left: number;
      right: number;
      top: number;
      bottom: number;
    }>,
  ) => {
    const xs = [...new Set(rectangles.flatMap(({ left, right }) => [left, right]))]
      .sort((left, right) => left - right);
    let area = 0;
    for (let index = 0; index < xs.length - 1; index += 1) {
      const x1 = xs[index];
      const x2 = xs[index + 1];
      const intervals = rectangles
        .filter(({ left, right }) => left < x2 && right > x1)
        .map(({ top, bottom }) => [top, bottom] as const)
        .sort(([leftTop], [rightTop]) => leftTop - rightTop);
      let covered = 0;
      let start = -1;
      let end = -1;
      for (const [top, bottom] of intervals) {
        if (start < 0) {
          start = top;
          end = bottom;
        } else if (top <= end) {
          end = Math.max(end, bottom);
        } else {
          covered += end - start;
          start = top;
          end = bottom;
        }
      }
      if (start >= 0) covered += end - start;
      area += (x2 - x1) * covered;
    }
    return area;
  };
  const identity = one(config.identitySelector);
  const descriptor = one(config.descriptorSelector);
  const primary = one(config.primarySelector);
  const supportingSizePx = Math.max(
    0,
    ...all(config.supportingSelector).map((element) =>
      numberPx(style(element)?.fontSize),
    ),
  );
  const body = one(config.bodySelector);
  const shell = one(config.shellSelector);
  const prose = one(config.proseSelector ?? '[data-prose-column], .prose');
  const primaryStyle = style(primary);
  const primaryRect = primary?.getBoundingClientRect();
  const primaryLineHeight = numberPx(primaryStyle?.lineHeight);
  const primaryLineCount =
    primaryRect && primaryLineHeight > 0
      ? Math.max(1, Math.round(primaryRect.height / primaryLineHeight))
      : 0;

  const isRendered = (element: Element) => {
    const computed = style(element);
    const rect = element.getBoundingClientRect();
    return (
      computed?.display !== 'none' &&
      computed?.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    );
  };
  const devices = all('[data-brand-device-id]').filter(isRendered);
  const alignmentErrors = devices.map((device) => {
    const anchorSelector = device.dataset.brandAnchorSelector;
    const anchor = anchorSelector
      ? document.querySelector<HTMLElement>(anchorSelector)
      : null;
    if (!anchor) return 999_999;
    const deviceRect = device.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const deviceEdge = device.dataset.brandDeviceEdge ?? 'left';
    const anchorEdge = device.dataset.brandAnchorEdge ?? 'left';
    const edge = (
      rect: DOMRect,
      name: string,
    ) =>
      name === 'right'
        ? rect.right
        : name === 'top'
          ? rect.top
          : name === 'bottom'
            ? rect.bottom
            : name === 'center-x'
              ? rect.left + rect.width / 2
              : name === 'center-y'
                ? rect.top + rect.height / 2
                : rect.left;
    return Math.abs(edge(deviceRect, deviceEdge) - edge(anchorRect, anchorEdge));
  });
  const deviceCandidates = all('body *').filter((element) => {
    if (!isRendered(element)) return false;
    if (element.hasAttribute('data-registration-device')) return true;
    const computed = style(element);
    const rect = element.getBoundingClientRect();
    const backgroundImage = computed?.backgroundImage ?? 'none';
    const repeatedGrid =
      backgroundImage !== 'none' &&
      /(radial-gradient|repeating-(?:linear|radial)-gradient|data:image\/svg\+xml)/i.test(
        backgroundImage,
      ) &&
      computed?.backgroundRepeat !== 'no-repeat';
    const borderWidths = [
      numberPx(computed?.borderTopWidth),
      numberPx(computed?.borderRightWidth),
      numberPx(computed?.borderBottomWidth),
      numberPx(computed?.borderLeftWidth),
    ];
    const singleRule = borderWidths.filter((width) => width > 0).length === 1;
    const thinRail =
      singleRule &&
      (rect.width <= 4 || rect.height <= 4) &&
      Math.max(rect.width, rect.height) >= 24;
    return (
      element.getAttribute('aria-hidden') === 'true' &&
      computed?.pointerEvents === 'none' &&
      (repeatedGrid || thinRail)
    );
  });
  const unregisteredDevices = deviceCandidates.filter(
    (element) => !element.dataset.brandDeviceId,
  );
  const sections = all('main section');
  const motifCounts = sections.map(
    (section) =>
      new Set(
        [...section.querySelectorAll<HTMLElement>('[data-brand-device-id]')]
          .map((device) => device.dataset.brandMotif)
          .filter(Boolean),
      ).size,
  );
  const currentDeviceCount = devices.length;

  const darkCandidates = all('body *').filter((element) => {
    const computed = style(element);
    const rect = element.getBoundingClientRect();
    return (
      !element.matches('button, a, input, select, textarea') &&
      computed?.display !== 'none' &&
      computed?.visibility !== 'hidden' &&
      alpha(computed?.backgroundColor ?? 'transparent') > 0 &&
      rect.width * rect.height >= 10_000 &&
      luminance(computed?.backgroundColor ?? 'rgb(255, 255, 255)') < 0.2
    );
  });
  const darkRects = darkCandidates
    .map(clippedRect)
    .filter((rect): rect is NonNullable<typeof rect> => rect !== null);
  const unregisteredDark = darkCandidates.filter(
    (element) =>
      element.dataset.brandSurfaceId !== 'surface:bounded-dark-instrument',
  );
  const intersects = (left: Element, right: Element) => {
    const a = left.getBoundingClientRect();
    const b = right.getBoundingClientRect();
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  };
  const proseTextElements = prose
    ? [
        ...prose.querySelectorAll<HTMLElement>(
          'p, h1, h2, h3, h4, blockquote',
        ),
      ]
    : [];

  const repeatedModules = config.repeatedModuleSelector
    ? all(config.repeatedModuleSelector)
    : [];
  const repetitionPopulation = all(
    [
      '[data-brand-module-signature]',
      '[data-brand-redundant-four-sided-frame]',
      '[data-brand-frame-depth]',
      '[data-brand-frame-interior-registered]',
    ].join(', '),
  );
  let maximumAdjacentRepeatedSignatures = 0;
  let run = 0;
  let previousSignature = '';
  let previousParent: Element | null = null;
  for (const repeatedModule of repeatedModules) {
    const signature = repeatedModule.dataset.brandModuleSignature ?? '';
    run =
      signature &&
      signature === previousSignature &&
      repeatedModule.parentElement === previousParent
        ? run + 1
        : signature
          ? 1
          : 0;
    previousSignature = signature;
    previousParent = repeatedModule.parentElement;
    maximumAdjacentRepeatedSignatures = Math.max(
      maximumAdjacentRepeatedSignatures,
      run,
    );
  }
  const framed = all('[data-brand-frame-depth]');
  const frameDepths = framed.map((element) =>
    Number(element.dataset.brandFrameDepth ?? 0),
  );

  const colourPairs = [
    ['--color-ink', '#0B0B0C'],
    ['--color-graphite', '#242D33'],
    ['--color-concrete', '#D9DADB'],
    ['--color-paper', '#F5F6F7'],
    ['--color-white', '#FFFFFF'],
    ['--color-highlight', '#C6FF19'],
    ['--color-signal', '#245FFF'],
  ] as const;
  const rootStyle = getComputedStyle(root);
  const matchingColourCount = colourPairs.filter(
    ([property, expected]) =>
      rootStyle.getPropertyValue(property).trim().toUpperCase() === expected,
  ).length;
  const roleElements = all('[data-brand-type-role]');
  const roleFamilies: Record<string, string> = {
    display: 'Tektur',
    interface: 'IBM Plex Sans',
    reading: 'Newsreader',
    data: 'IBM Plex Mono',
  };
  const matchingTypeRoleCount = roleElements.filter((element) => {
    const role = element.dataset.brandTypeRole ?? '';
    return style(element)?.fontFamily.includes(roleFamilies[role] ?? '\0');
  }).length;
  const registeredRoleNames = new Set(Object.keys(roleFamilies));

  const materials = all('[data-brand-material-id]');
  const externalMaterials = materials.filter(
    (element) => element.dataset.brandMaterialExternal === 'true',
  );

  return {
    surfaceKind: config.surfaceKind,
    viewport,
    identity: {
      publicName: normalized(identity),
      descriptor: descriptor ? normalized(descriptor) : null,
      descriptorRequired: config.descriptorRequired,
      webDisplayFamily:
        identity && style(identity)?.fontFamily.includes('Tektur')
          ? 'Tektur Variable'
          : style(identity)?.fontFamily ?? null,
      ogStaticRoleMatched: null,
      alternateSymbolCount: all(config.alternateSymbolSelector).length,
      v1IdentityCount: all('body *').filter((element) =>
        /^(robot-wiki|ROBOT WIKI|Robot-Wiki)$/.test(normalized(element)),
      ).length,
    },
    hierarchy: {
      primarySizePx: numberPx(primaryStyle?.fontSize),
      supportingSizePx,
      bodySizePx: numberPx(style(body)?.fontSize),
      primaryLineCount,
    },
    gridAndDevices: {
      registeredCount: currentDeviceCount,
      unregisteredCount: unregisteredDevices.length,
      maximumAlignmentErrorPx:
        alignmentErrors.length > 0 ? Math.max(...alignmentErrors) : 999_999,
      missingPurposeCount: devices.filter(
        (device) => !device.dataset.brandPurpose,
      ).length,
      missingOwnerCount: devices.filter((device) => !device.dataset.brandOwner)
        .length,
      maximumDominantMotifsPerSection:
        motifCounts.length > 0 ? Math.max(...motifCounts) : 0,
      mobileDeviceCount: viewport.width < 768 ? currentDeviceCount : -1,
      desktopDeviceCount: viewport.width >= 768 ? currentDeviceCount : -1,
      obscuringCount: devices.filter(
        (device) => device.dataset.brandObscuresContent === 'true',
      ).length,
      inputInterceptingCount: devices.filter(
        (device) => style(device)?.pointerEvents !== 'none',
      ).length,
    },
    lightDarkBalance: {
      bodyIsLight: isLight(document.body),
      shellIsLight: isLight(shell),
      proseIsLight: prose ? isLight(prose) : true,
      darkNonActionAreaPx2: unionArea(darkRects),
      firstViewportAreaPx2: viewport.width * viewport.height,
      unregisteredDarkSurfaceCount: unregisteredDark.length,
      shellOrProseIntersectionCount: darkCandidates.filter(
        (candidate) =>
          (shell ? intersects(candidate, shell) : false) ||
          proseTextElements.some((textElement) =>
            intersects(candidate, textElement),
          ),
      ).length,
    },
    repetitionAndFrames: {
      registeredPopulationCount: repetitionPopulation.length,
      maximumAdjacentRepeatedSignatures,
      redundantNestedFourSidedFrameCount: all(
        '[data-brand-redundant-four-sided-frame="true"]',
      ).length,
      maximumFrameDepth:
        frameDepths.length > 0 ? Math.max(...frameDepths) : 0,
      unregisteredDepthTwoCount: framed.filter(
        (element) =>
          Number(element.dataset.brandFrameDepth ?? 0) === 2 &&
          element.dataset.brandFrameInteriorRegistered !== 'true',
      ).length,
    },
    paletteAndType: {
      auditedColourCount: colourPairs.length,
      matchingColourCount,
      auditedTypeRoleCount: roleElements.length,
      matchingTypeRoleCount,
      unregisteredRoleCount: roleElements.filter(
        (element) =>
          !registeredRoleNames.has(element.dataset.brandTypeRole ?? ''),
      ).length,
      fallbackGlyphCount: all('[data-brand-fallback-glyph="true"]').length,
    },
    materialTreatment: {
      registeredRepresentativeCount: materials.length,
      deterministicCount: materials.filter(
        (element) => element.dataset.brandMaterialDeterministic === 'true',
      ).length,
      contrastPassingCount: materials.filter(
        (element) => element.dataset.brandMaterialContrast === 'pass',
      ).length,
      provenanceCompleteCount: externalMaterials.filter(
        (element) =>
          Boolean(element.dataset.brandMaterialOwner) &&
          Boolean(element.dataset.brandMaterialLicence) &&
          Boolean(element.dataset.brandMaterialHash),
      ).length,
      externalRepresentativeCount: externalMaterials.length,
      proseElementResolved: config.proseSelector === undefined || prose !== null,
      proseTextureIntersectionCount: prose
        ? materials.filter(
            (material) =>
              prose.contains(material) || material.contains(prose),
          ).length
        : 0,
    },
  };
}

export function reconcileResponsiveDeviceCounts(
  desktop: ReferenceFeatureMeasurements,
  mobile: ReferenceFeatureMeasurements,
): ReferenceFeatureMeasurements {
  if (
    desktop.surfaceKind !== mobile.surfaceKind ||
    desktop.viewport.width < 768 ||
    mobile.viewport.width >= 768
  ) {
    throw new Error(
      'Responsive device reconciliation requires the same surface measured once below and once at or above 768px.',
    );
  }
  return {
    ...desktop,
    gridAndDevices: {
      ...desktop.gridAndDevices,
      mobileDeviceCount: mobile.gridAndDevices.registeredCount,
      desktopDeviceCount: desktop.gridAndDevices.registeredCount,
    },
  };
}

const predicateSchema = z
  .object({
    id: z.string().trim().min(1),
    expected: jsonValueSchema,
    actual: jsonValueSchema,
    passed: z.boolean(),
  })
  .strict();

export const referenceAnchorResultSchema = z
  .object({
    id: anchorIdSchema,
    applicable: z.boolean(),
    notApplicableReason: z.string().trim().min(1).optional(),
    expected: jsonValueSchema,
    actual: jsonValueSchema,
    predicates: z.array(predicateSchema).min(1),
    passed: z.boolean(),
  })
  .strict()
  .superRefine((anchor, context) => {
    if (!anchor.applicable && !anchor.notApplicableReason) {
      context.addIssue({
        code: 'custom',
        message: 'A non-applicable anchor requires notApplicableReason.',
      });
    }
    const expectedPass = anchor.applicable
      ? anchor.predicates.every(({ passed }) => passed)
      : true;
    if (anchor.passed !== expectedPass) {
      context.addIssue({
        code: 'custom',
        message: 'Anchor pass must equal its independent predicates.',
      });
    }
  });

export type ReferenceAnchorResult = z.infer<
  typeof referenceAnchorResultSchema
>;

function predicate(
  id: string,
  expected: unknown,
  actual: unknown,
  passed: boolean,
) {
  return predicateSchema.parse({ id, expected, actual, passed });
}

function anchor(
  id: ReferenceAnchorResult['id'],
  predicates: ReferenceAnchorResult['predicates'],
  options?: { applicable?: boolean; notApplicableReason?: string },
): ReferenceAnchorResult {
  const applicable = options?.applicable ?? true;
  return referenceAnchorResultSchema.parse({
    id,
    applicable,
    ...(options?.notApplicableReason
      ? { notApplicableReason: options.notApplicableReason }
      : {}),
    expected: BRAND_V2_REFERENCE_RUBRIC.anchors.find(
      (entry) => entry.id === id,
    )?.threshold,
    actual: Object.fromEntries(
      predicates.map(({ id: predicateId, actual }) => [predicateId, actual]),
    ),
    predicates,
    passed: applicable ? predicates.every(({ passed }) => passed) : true,
  });
}

function hierarchyRatio(surfaceKind: ReferenceSurfaceKind): number | null {
  if (surfaceKind === 'home' || surfaceKind === 'site-card') return 1.5;
  if (surfaceKind === 'article' || surfaceKind === 'article-card') return 1.35;
  return null;
}

function darkAreaMaximum(surfaceKind: ReferenceSurfaceKind): number {
  return surfaceKind === 'market-map' || surfaceKind === 'playground'
    ? 0.75
    : 0.4;
}

export function evaluateReferenceFeatures(
  measurements: ReferenceFeatureMeasurements,
) {
  const literals = BRAND_V2_REFERENCE_RUBRIC.contractLiterals;
  const expectedHierarchyRatio = hierarchyRatio(measurements.surfaceKind);
  const hierarchyDenominator =
    measurements.surfaceKind === 'article' ||
    measurements.surfaceKind === 'article-card'
      ? measurements.hierarchy.bodySizePx
      : measurements.hierarchy.supportingSizePx;
  const actualHierarchyRatio =
    hierarchyDenominator > 0
      ? measurements.hierarchy.primarySizePx /
        hierarchyDenominator
      : 0;
  const darkAreaRatio =
    measurements.lightDarkBalance.firstViewportAreaPx2 > 0
      ? measurements.lightDarkBalance.darkNonActionAreaPx2 /
        measurements.lightDarkBalance.firstViewportAreaPx2
      : 1;
  const maximumDarkArea = darkAreaMaximum(measurements.surfaceKind);
  const material = measurements.materialTreatment;
  const anchors = [
    anchor('identity', [
      predicate(
        'public-identity',
        literals.publicIdentity,
        measurements.identity.publicName,
        measurements.identity.publicName === literals.publicIdentity,
      ),
      predicate(
        'descriptor',
        measurements.identity.descriptorRequired
          ? literals.descriptor
          : 'omitted or exact literal',
        measurements.identity.descriptor,
        measurements.identity.descriptorRequired
          ? measurements.identity.descriptor === literals.descriptor
          : measurements.identity.descriptor === null ||
            measurements.identity.descriptor === literals.descriptor,
      ),
      predicate(
        'registered-tektur-role',
        'web Tektur Variable or registered static OG role',
        {
          web: measurements.identity.webDisplayFamily,
          og: measurements.identity.ogStaticRoleMatched,
        },
        measurements.identity.webDisplayFamily === literals.webDisplayFamily ||
          measurements.identity.ogStaticRoleMatched === true,
      ),
      predicate(
        'alternate-symbol-count',
        0,
        measurements.identity.alternateSymbolCount,
        measurements.identity.alternateSymbolCount === 0,
      ),
      predicate(
        'v1-identity-count',
        0,
        measurements.identity.v1IdentityCount,
        measurements.identity.v1IdentityCount === 0,
      ),
    ]),
    anchor(
      'hierarchy',
      [
        predicate(
          'primary-ratio',
          expectedHierarchyRatio ?? 'not applicable',
          actualHierarchyRatio,
          expectedHierarchyRatio === null ||
            actualHierarchyRatio >= expectedHierarchyRatio,
        ),
        predicate(
          'desktop-primary-lines',
          measurements.viewport.width >= 1024 ? '<=3' : 'not applicable',
          measurements.hierarchy.primaryLineCount,
          measurements.viewport.width < 1024 ||
            measurements.hierarchy.primaryLineCount <= 3,
        ),
      ],
      expectedHierarchyRatio === null
        ? {
            applicable: false,
            notApplicableReason:
              'The sealed ratio applies only to home/site-card identity and article headings.',
          }
        : undefined,
    ),
    anchor('grid-alignment', [
      predicate(
        'registered-population',
        '>0',
        measurements.gridAndDevices.registeredCount,
        measurements.gridAndDevices.registeredCount > 0,
      ),
      predicate(
        'maximum-alignment-error-px',
        '<=2',
        measurements.gridAndDevices.maximumAlignmentErrorPx,
        measurements.gridAndDevices.maximumAlignmentErrorPx <= 2,
      ),
      predicate(
        'unregistered-device-count',
        0,
        measurements.gridAndDevices.unregisteredCount,
        measurements.gridAndDevices.unregisteredCount === 0,
      ),
    ]),
    anchor('purposeful-devices', [
      predicate(
        'registered-population',
        '>0',
        measurements.gridAndDevices.registeredCount,
        measurements.gridAndDevices.registeredCount > 0,
      ),
      predicate(
        'missing-purpose-count',
        0,
        measurements.gridAndDevices.missingPurposeCount,
        measurements.gridAndDevices.missingPurposeCount === 0,
      ),
      predicate(
        'missing-owner-count',
        0,
        measurements.gridAndDevices.missingOwnerCount,
        measurements.gridAndDevices.missingOwnerCount === 0,
      ),
      predicate(
        'dominant-motifs-per-section',
        '<=1',
        measurements.gridAndDevices.maximumDominantMotifsPerSection,
        measurements.gridAndDevices.maximumDominantMotifsPerSection <= 1,
      ),
      predicate(
        'mobile-device-count',
        '<=desktop',
        {
          mobile: measurements.gridAndDevices.mobileDeviceCount,
          desktop: measurements.gridAndDevices.desktopDeviceCount,
        },
        measurements.gridAndDevices.mobileDeviceCount >= 0 &&
          measurements.gridAndDevices.desktopDeviceCount >= 0 &&
          measurements.gridAndDevices.mobileDeviceCount <=
            measurements.gridAndDevices.desktopDeviceCount,
      ),
      predicate(
        'obscuring-count',
        0,
        measurements.gridAndDevices.obscuringCount,
        measurements.gridAndDevices.obscuringCount === 0,
      ),
      predicate(
        'input-intercepting-count',
        0,
        measurements.gridAndDevices.inputInterceptingCount,
        measurements.gridAndDevices.inputInterceptingCount === 0,
      ),
    ]),
    anchor('light-dark-balance', [
      predicate(
        'light-body-shell-prose',
        true,
        {
          body: measurements.lightDarkBalance.bodyIsLight,
          shell: measurements.lightDarkBalance.shellIsLight,
          prose: measurements.lightDarkBalance.proseIsLight,
        },
        measurements.lightDarkBalance.bodyIsLight &&
          measurements.lightDarkBalance.shellIsLight &&
          measurements.lightDarkBalance.proseIsLight,
      ),
      predicate(
        'dark-area-ratio',
        `<=${maximumDarkArea}`,
        darkAreaRatio,
        darkAreaRatio <= maximumDarkArea,
      ),
      predicate(
        'unregistered-dark-surfaces',
        0,
        measurements.lightDarkBalance.unregisteredDarkSurfaceCount,
        measurements.lightDarkBalance.unregisteredDarkSurfaceCount === 0,
      ),
      predicate(
        'shell-prose-intersections',
        0,
        measurements.lightDarkBalance.shellOrProseIntersectionCount,
        measurements.lightDarkBalance.shellOrProseIntersectionCount === 0,
      ),
    ]),
    anchor('repetition-frames', [
      predicate(
        'registered-population',
        '>0',
        measurements.repetitionAndFrames.registeredPopulationCount,
        measurements.repetitionAndFrames.registeredPopulationCount > 0,
      ),
      predicate(
        'adjacent-repeated-signatures',
        '<=3',
        measurements.repetitionAndFrames.maximumAdjacentRepeatedSignatures,
        measurements.repetitionAndFrames.maximumAdjacentRepeatedSignatures <=
          3,
      ),
      predicate(
        'redundant-nested-frames',
        0,
        measurements.repetitionAndFrames
          .redundantNestedFourSidedFrameCount,
        measurements.repetitionAndFrames
          .redundantNestedFourSidedFrameCount === 0,
      ),
      predicate(
        'maximum-frame-depth',
        '<=2',
        measurements.repetitionAndFrames.maximumFrameDepth,
        measurements.repetitionAndFrames.maximumFrameDepth <= 2,
      ),
      predicate(
        'unregistered-depth-two-count',
        0,
        measurements.repetitionAndFrames.unregisteredDepthTwoCount,
        measurements.repetitionAndFrames.unregisteredDepthTwoCount === 0,
      ),
    ]),
    anchor('palette-type', [
      predicate(
        'colour-parity',
        '100% and non-empty',
        {
          matching: measurements.paletteAndType.matchingColourCount,
          audited: measurements.paletteAndType.auditedColourCount,
        },
        measurements.paletteAndType.auditedColourCount > 0 &&
          measurements.paletteAndType.matchingColourCount ===
            measurements.paletteAndType.auditedColourCount,
      ),
      predicate(
        'type-role-parity',
        '100% and non-empty',
        {
          matching: measurements.paletteAndType.matchingTypeRoleCount,
          audited: measurements.paletteAndType.auditedTypeRoleCount,
        },
        measurements.paletteAndType.auditedTypeRoleCount > 0 &&
          measurements.paletteAndType.matchingTypeRoleCount ===
            measurements.paletteAndType.auditedTypeRoleCount,
      ),
      predicate(
        'unregistered-role-count',
        0,
        measurements.paletteAndType.unregisteredRoleCount,
        measurements.paletteAndType.unregisteredRoleCount === 0,
      ),
      predicate(
        'fallback-glyph-count',
        0,
        measurements.paletteAndType.fallbackGlyphCount,
        measurements.paletteAndType.fallbackGlyphCount === 0,
      ),
    ]),
    anchor('material-treatment', [
      predicate(
        'registered-representatives',
        '>0',
        material.registeredRepresentativeCount,
        material.registeredRepresentativeCount > 0,
      ),
      predicate(
        'deterministic-treatment',
        material.registeredRepresentativeCount,
        material.deterministicCount,
        material.deterministicCount ===
          material.registeredRepresentativeCount,
      ),
      predicate(
        'contrast-passing',
        material.registeredRepresentativeCount,
        material.contrastPassingCount,
        material.contrastPassingCount ===
          material.registeredRepresentativeCount,
      ),
      predicate(
        'external-provenance',
        material.externalRepresentativeCount,
        material.provenanceCompleteCount,
        material.provenanceCompleteCount ===
          material.externalRepresentativeCount,
      ),
      predicate(
        'prose-element-resolved',
        true,
        material.proseElementResolved,
        material.proseElementResolved,
      ),
      predicate(
        'prose-texture-intersections',
        0,
        material.proseTextureIntersectionCount,
        material.proseTextureIntersectionCount === 0,
      ),
    ]),
  ];
  return {
    rubricVersion: BRAND_V2_REFERENCE_RUBRIC.version,
    anchors,
    passed: anchors.every(({ passed }) => passed),
  };
}

export const referenceComparisonPayloadSchema = z
  .object({
    kind: z.literal('autonomous-reference-comparison'),
    rubricVersion: z.literal(1),
    comparisonMode: z.literal('feature-anchors-only'),
    contractLiteralOverridesApplied: z.literal(true),
    referenceIds: z.tuple([
      z.literal('library/brand-reference-board.jpeg'),
      z.literal('library/brand-reference-article.png'),
    ]),
    surfaceId: z.string().trim().min(1),
    screenshotPaths: z.array(z.string().trim().min(1)).min(1),
    anchors: z.array(referenceAnchorResultSchema).length(8),
    passed: z.boolean(),
  })
  .strict()
  .superRefine((payload, context) => {
    const expectedIds = anchorIdSchema.options;
    const actualIds = payload.anchors.map(({ id }) => id);
    if (
      new Set(actualIds).size !== expectedIds.length ||
      expectedIds.some((id) => !actualIds.includes(id))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Comparison payload must contain all rubric anchors once.',
      });
    }
    if (payload.passed !== payload.anchors.every(({ passed }) => passed)) {
      context.addIssue({
        code: 'custom',
        message: 'Comparison pass cannot average or hide a failed anchor.',
      });
    }
  });

export function parseReferenceComparisonPayload(input: unknown) {
  return referenceComparisonPayloadSchema.parse(input);
}
