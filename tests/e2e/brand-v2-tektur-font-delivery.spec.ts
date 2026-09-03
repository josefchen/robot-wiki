import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page } from '@playwright/test';
import { brandV2Registry, expect, test } from './brand-v2-static-fixture';
import {
  FIRST_PARTY_TYPE_ROLES,
  TEKTUR_ASSIGNED_STRINGS,
  TEKTUR_OG_ROLE_ID,
  TEKTUR_ROLE_INSTANCES,
  type TekturRoleInstance,
} from '../../data/type-roles';
import { BRAND_V2_RESPONSIVE_VIEWPORTS } from '../../lib/brand-v2-responsive-viewports';
import {
  FONT_PAYLOAD_SIGNATURES,
  SCOPED_FONT_FAMILY_EXCEPTIONS,
  TEKTUR_DELIVERY_EVIDENCE_PATH,
  deriveTypographyStackProperties,
  fontFamilyHead,
  fontFamilyKey,
  isDecidedNonFontContentType,
  isFontContentType,
  measureRuntimeFamilyAliases,
  measureTekturEvidence,
  tekturDeliveryFingerprint,
  type TekturDeliveryEvidence,
} from '../../lib/brand-v2-tektur-evidence';
import { TEKTUR_FONT_METADATA } from '../../data/tektur-font-metadata';
import { deriveTekturRoleOccurrences } from '../../lib/tektur-role-occurrences';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * VAL-B2-TYPE-015 requires the rendered axis values to match the registry
 * "at every declared viewport", so the sweep is the canonical width
 * population derived from the declaring documents. Retyping a subset here is
 * how a width-specific role override escapes the gate entirely.
 */
const VIEWPORTS = BRAND_V2_RESPONSIVE_VIEWPORTS;

/**
 * The route population is derived from source, not chosen by the registry
 * being tested. A hand-typed `routes` array named three shell routes while
 * `app/layout.tsx` mounts the shell on all 62, and one article while the
 * shared template renders `article-h1` on all 47, so every genuine
 * occurrence outside the list went unmeasured.
 */
const OCCURRENCES = deriveTekturRoleOccurrences();
const SWEPT_ROUTES = OCCURRENCES.routes.map(({ route }) => route);
const NOT_FOUND_ROUTE = brandV2Registry.routes.notFound.path;
const REGISTERED_ROLE_IDS = TEKTUR_ROLE_INSTANCES.map(({ id }) => id);
const REGISTERED_CLASSES = TEKTUR_ROLE_INSTANCES.map(
  ({ cssClass }) => cssClass,
);
const ROOT = process.cwd();
const CSS = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
const STACK_PROPERTIES = deriveTypographyStackProperties(CSS);
const MATH_SCOPE = SCOPED_FONT_FAMILY_EXCEPTIONS[0].scope;

type RoleOccurrence = {
  role: string;
  family: string;
  weight: string;
  stretch: string;
  variationSettings: string;
  text: string;
};

type RouteMeasurement = {
  /** Every role annotation present, registered or not. */
  occurrences: RoleOccurrence[];
  /** Elements carrying a registered display class but no role annotation. */
  unannotatedClassUses: string[];
  /**
   * Every computed `font-family` head the document resolved, and which of
   * them at least one element outside rendered mathematics resolved.
   * VAL-B2-TYPE-001 quantifies over the families production typography
   * uses, so the scan still walks every element rather than only the
   * annotated display roles: a fifth family on an unannotated surface has
   * to be a failure, not an invisible one.
   *
   * Sets rather than element tallies, because the tally is not
   * reproducible. The Next.js client runtime appends nodes of its own after
   * hydration — `<next-route-announcer>` in the body and `<link>` preload
   * and prefetch hints in the head — on scheduler timing this sweep cannot
   * observe a settled state for. They inherit the UI body family, so they
   * moved the IBM Plex Sans tally between identical runs while never
   * changing which families were resolved.
   */
  familyHeads: string[];
  headsOutsideMath: string[];
  /**
   * Every `@font-face` rule the document declares, with each `url()` source
   * resolved against its stylesheet, plus any stylesheet whose rules could
   * not be read.
   */
  fontFaces: Array<{ family: string; sources: string[] }>;
  unreadableStyleSheets: string[];
};

function measureDocument(input: {
  classes: string[];
  mathScope: string;
}): RouteMeasurement {
  const occurrences = [
    ...document.querySelectorAll<HTMLElement>('[data-tektur-role]'),
  ].map((element) => {
    const style = getComputedStyle(element);
    return {
      role: element.getAttribute('data-tektur-role') ?? '',
      family: style.fontFamily,
      weight: style.fontWeight,
      stretch: style.fontStretch,
      variationSettings: style.fontVariationSettings,
      text: (element.textContent ?? '').trim().slice(0, 40),
    };
  });
  const unannotatedClassUses = input.classes.flatMap((cssClass) =>
    [...document.querySelectorAll<HTMLElement>(`.${cssClass}`)]
      .filter(
        (element) => (element.getAttribute('data-tektur-role') ?? '') === '',
      )
      .map((element) => `${cssClass}:${element.tagName.toLowerCase()}`),
  );

  const familyHeads = new Set<string>();
  const headsOutsideMath = new Set<string>();
  for (const element of document.querySelectorAll('*')) {
    const stack = getComputedStyle(element).fontFamily;
    // Recorded as measured apart from the quoting CSS serialization adds.
    // The quote characters are escapes for the reason given below, where the
    // same constraint applies to the `src` matcher.
    const head = (stack.split(',')[0] ?? '')
      .trim()
      .replace(/^[\x22\x27]|[\x22\x27]$/g, '');
    familyHeads.add(head);
    if (!element.closest(input.mathScope)) headsOutsideMath.add(head);
  }

  // `@font-face` rules are what bind a runtime family name to a payload, so
  // they are measured rather than assumed: `next/font/local` publishes the
  // registered `Tektur Variable` under the runtime family `tektur`, and the
  // reader will only accept that rename if a rule declares it and the bytes
  // its `src` delivered are the registered binary's.
  const fontFaces: Array<{ family: string; sources: string[] }> = [];
  const unreadableStyleSheets: string[] = [];
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      unreadableStyleSheets.push(sheet.href ?? '(inline stylesheet)');
      continue;
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const sources = [
        ...rule.style
          .getPropertyValue('src')
          // The quotes and the closing parenthesis are written as escapes
          // because `lib/brand-v2-test-inventory.ts` tokenizes this file to
          // collect the test titles the enforcement map targets, and it has
          // no regex-literal state: a literal quote here opens a string it
          // never closes, and an unbalanced `)` ends the enclosing
          // `describe` early, which silently moves or drops titles.
          .matchAll(
            /url\((?:\x22([^\x22]*)\x22|\x27([^\x27]*)\x27|([^\x29]*))\)/g,
          ),
      ]
        .map((match) => (match[1] ?? match[2] ?? match[3] ?? '').trim())
        .filter((value) => value.length > 0)
        .map((value) => {
          const url = new URL(value, sheet.href ?? location.href);
          // The static fixture serves from an OS-assigned port, so the
          // origin is dropped from same-origin paths: a port in a committed
          // artifact would churn on every run.
          return url.origin === location.origin
            ? `${url.pathname}${url.search}`
            : url.href;
        });
      fontFaces.push({
        family: rule.style.getPropertyValue('font-family'),
        sources,
      });
    }
  }

  return {
    occurrences,
    unannotatedClassUses,
    familyHeads: [...familyHeads].sort(),
    headsOutsideMath: [...headsOutsideMath].sort(),
    fontFaces,
    unreadableStyleSheets,
  };
}

/**
 * What the sweep learned about one request URL, from the network rather than
 * from its spelling.
 *
 * VAL-B2-TYPE-002 is a claim about font requests, and the previous discovery
 * accepted a Resource Timing entry whose `initiatorType` was `font` or whose
 * URL ended in a font extension. In this browser a CSS `@font-face` load is
 * reported with a `css` initiator — measured: zero entries with
 * `initiatorType === 'font'` while five to ten fonts loaded per document —
 * so the extension was the whole test, and `https://cdn.example/f?id=plex`
 * has no extension. A request is a font here when the payload that arrived
 * is one.
 */
type CapturedRequest = {
  url: string;
  /** Same-origin as `pathname` + `search`; foreign as the absolute URL. */
  key: string;
  origin: 'same' | 'foreign';
  resourceTypes: Set<string>;
  contentTypes: Set<string>;
  payloadSignature: string | null;
  sha256: string | null;
  responded: boolean;
  bodyError: string | null;
};

type ClassifiedRequest = {
  request: CapturedRequest;
  isFont: boolean;
  classified: boolean;
  basis: string;
};

function classifyRequest(request: CapturedRequest): ClassifiedRequest {
  const { payloadSignature } = request;
  if (payloadSignature !== null) {
    return {
      request,
      isFont: payloadSignature in FONT_PAYLOAD_SIGNATURES,
      classified: true,
      basis: `payload signature 0x${payloadSignature}`,
    };
  }
  if ([...request.contentTypes].some(isFontContentType)) {
    return { request, isFont: true, classified: true, basis: 'response type' };
  }
  if (request.resourceTypes.has('font')) {
    return {
      request,
      isFont: true,
      classified: true,
      basis: 'browser font request destination',
    };
  }
  const contentTypes = [...request.contentTypes];
  if (
    contentTypes.length > 0 &&
    contentTypes.every(isDecidedNonFontContentType)
  ) {
    return {
      request,
      isFont: false,
      classified: true,
      basis: `response type ${contentTypes.join('/')}`,
    };
  }
  // A request that produced no response body delivered no font. That is a
  // fact about the payload, not a guess from the URL, so a same-origin
  // aborted prefetch is decided rather than left ambiguous. A foreign-origin
  // request is not let through this way: VAL-B2-TYPE-002 forbids the
  // request, so one whose payload cannot be read stays unclassified.
  if (!request.responded && request.origin === 'same') {
    return {
      request,
      isFont: false,
      classified: true,
      basis: 'no response payload',
    };
  }
  return { request, isFont: false, classified: false, basis: 'undetermined' };
}

type RequestCapture = {
  /** Observation key to the request URLs captured while it was navigated. */
  byObservation: Map<string, Set<string>>;
  requests: Map<string, CapturedRequest>;
  /** Opens the bucket every subsequent request is attributed to. */
  open: (observationKey: string) => void;
  settled: () => Promise<void>;
};

/**
 * Attaches request/response capture to the page.
 *
 * A response body is read whenever the answer could matter: always for a
 * foreign origin, and same-origin whenever the browser called it a font, the
 * response declared a font type, or the declared type is outside the closed
 * list of types that settle the question. Bodies for the site's own scripts,
 * styles, images and documents are not fetched, and misreading one of those
 * as a non-font cannot manufacture a same-origin claim: the assertion is
 * that every font request is same-origin, and their origin is not in doubt.
 */
function captureRequests(page: Page, origin: string): RequestCapture {
  const requests = new Map<string, CapturedRequest>();
  const byObservation = new Map<string, Set<string>>();
  const bodies: Array<Promise<void>> = [];
  let current = 'setup';

  const record = (url: string): CapturedRequest => {
    const existing = requests.get(url);
    if (existing) return existing;
    const parsed = new URL(url);
    const created: CapturedRequest = {
      url,
      key:
        parsed.origin === origin ? `${parsed.pathname}${parsed.search}` : url,
      origin: parsed.origin === origin ? 'same' : 'foreign',
      resourceTypes: new Set(),
      contentTypes: new Set(),
      payloadSignature: null,
      sha256: null,
      responded: false,
      bodyError: null,
    };
    requests.set(url, created);
    return created;
  };

  page.on('request', (request) => {
    const url = request.url();
    if (!/^https?:/.test(url)) return;
    record(url).resourceTypes.add(request.resourceType());
    const bucket = byObservation.get(current) ?? new Set<string>();
    bucket.add(url);
    byObservation.set(current, bucket);
  });
  page.on('response', (response) => {
    const url = response.url();
    if (!/^https?:/.test(url)) return;
    const captured = record(url);
    captured.responded = true;
    const contentType = (response.headers()['content-type'] ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    captured.contentTypes.add(contentType);
    if (captured.sha256 !== null) return;
    const undecided =
      captured.origin === 'foreign' ||
      response.request().resourceType() === 'font' ||
      isFontContentType(contentType) ||
      !isDecidedNonFontContentType(contentType);
    if (!undecided) return;
    // Started inside the handler so the read is issued while the payload is
    // still retained, and awaited later.
    bodies.push(
      response
        .body()
        .then((buffer) => {
          captured.payloadSignature = buffer
            .subarray(0, 4)
            .toString('hex')
            .padEnd(8, '0');
          captured.sha256 = createHash('sha256').update(buffer).digest('hex');
        })
        .catch((error: unknown) => {
          captured.bodyError = String(error).split('\n')[0];
        }),
    );
  });

  return {
    byObservation,
    requests,
    open: (observationKey: string) => {
      current = observationKey;
      if (!byObservation.has(observationKey)) {
        byObservation.set(observationKey, new Set());
      }
    },
    settled: async () => {
      await Promise.all(bodies);
    },
  };
}

type DeliveryProbe = {
  stacks: Record<string, string>;
  wordmark: {
    family: string;
    weight: string;
    stretch: string;
    variationSettings: string;
  };
  assignedStrings: Array<{
    id: string;
    loaded: boolean;
    tekturAdvance: number;
    fallbackAdvance: number;
  }>;
  tekturFamily: string;
};

function measureDelivery(input: {
  stackProperties: string[];
  assignedStrings: Array<{ id: string; text: string }>;
}): DeliveryProbe {
  const rootStyle = getComputedStyle(document.documentElement);
  const family = rootStyle.getPropertyValue('--font-tektur').trim();
  // Measured on the page's own wordmark rather than an injected probe: a
  // span this test creates and styles proves only that the test can set a
  // font-family.
  const wordmarkElement = document.querySelector<HTMLElement>(
    '[data-tektur-role="home-wordmark"]',
  );
  if (!wordmarkElement) throw new Error('home wordmark Tektur role missing');
  const wordmarkStyle = getComputedStyle(wordmarkElement);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas context unavailable');
  const round = (value: number): number => Math.round(value * 100) / 100;
  const assignedStrings = input.assignedStrings.map(({ id, text }) => {
    context.font = `600 32px ${family}`;
    const tekturAdvance = round(context.measureText(text).width);
    context.font = '600 32px monospace';
    const fallbackAdvance = round(context.measureText(text).width);
    return {
      id,
      loaded: document.fonts.check(`600 32px ${family}`, text),
      tekturAdvance,
      fallbackAdvance,
    };
  });

  return {
    stacks: Object.fromEntries(
      input.stackProperties.map((property) => [
        property,
        rootStyle.getPropertyValue(property).trim(),
      ]),
    ),
    wordmark: {
      family: wordmarkStyle.fontFamily,
      weight: wordmarkStyle.fontWeight,
      stretch: wordmarkStyle.fontStretch,
      variationSettings: wordmarkStyle.fontVariationSettings,
    },
    assignedStrings,
    tekturFamily: family,
  };
}

type Sweep = {
  measured: Map<string, RouteMeasurement>;
  delivery: DeliveryProbe;
  deliveryRoute: string;
  deliveryViewportId: string;
  deliveryKey: string;
  capture: RequestCapture;
};

const sweepKey = (route: string, viewportId: string): string =>
  `${route} @${viewportId}`;

let sweepCache: Sweep | null = null;

/**
 * One sweep per file. The viewport is set before navigation rather than
 * resized afterwards, so a component that decides what to render from the
 * width it mounted at is measured at that width instead of being resized
 * into a state it never renders in production.
 */
async function sweep(page: Page, base: string): Promise<Sweep> {
  if (sweepCache) return sweepCache;
  const capture = captureRequests(page, base);
  // Whether a document requested a font has to be a fact about the document,
  // not about what the browser happened to keep from an earlier one. With the
  // cache live, a font served from memory produces no request event and the
  // per-observation count becomes a cache-timing artifact — the same class of
  // non-determinism that the per-head element tally was removed for.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const measured = new Map<string, RouteMeasurement>();
  for (const route of SWEPT_ROUTES) {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      const key = sweepKey(route, viewport.id);
      capture.open(key);
      const response = await page.goto(`${base}${route}`);
      expect(
        response?.status(),
        `${route} @${viewport.id} did not serve its document`,
        // The export writes the not-found document to `404/index.html` as
        // well, so every swept route resolves to a real 200 document.
      ).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      measured.set(
        key,
        await page.evaluate(measureDocument, {
          classes: REGISTERED_CLASSES,
          mathScope: MATH_SCOPE,
        }),
      );
    }
  }
  // Font delivery is not width-dependent, so the stack and glyph probes run
  // at a single viewport — the widest declared one, taken from the derived
  // population rather than retyped.
  const widest = VIEWPORTS.at(-1);
  expect(widest, 'declared viewport population').toBeDefined();
  await page.setViewportSize({
    width: widest?.width ?? 0,
    height: widest?.height ?? 0,
  });
  const deliveryKey = 'delivery probe @/';
  capture.open(deliveryKey);
  await page.goto(`${base}/`);
  await page.evaluate(() => document.fonts.ready);
  const delivery = await page.evaluate(measureDelivery, {
    stackProperties: STACK_PROPERTIES,
    assignedStrings: TEKTUR_ASSIGNED_STRINGS.map(({ id, text }) => ({
      id,
      text,
    })),
  });
  await capture.settled();
  sweepCache = {
    measured,
    delivery,
    deliveryRoute: '/',
    deliveryViewportId: widest?.id ?? '',
    deliveryKey,
    capture,
  };
  return sweepCache;
}

type FontRequestSummary = {
  rows: TekturDeliveryEvidence['fontResources']['fontRequests'];
  unclassified: string[];
  observationsWithFontRequest: number;
  observationsMixingForeignOrigin: number;
  foreignOrigin: string[];
  sameOriginPaths: string[];
  fontUrlsByObservation: Map<string, string[]>;
};

/**
 * Classifies every captured request and attributes the font ones to the
 * observations they were made from.
 */
function summarizeFontRequests(result: Sweep): FontRequestSummary {
  const classified = new Map<string, ClassifiedRequest>();
  for (const [url, request] of result.capture.requests) {
    classified.set(url, classifyRequest(request));
  }
  const unclassified = [...classified.values()]
    .filter(({ classified: decided }) => !decided)
    .map(
      ({ request }) =>
        `${request.url} (${request.origin}-origin, request types [${[...request.resourceTypes].sort().join(', ')}], response types [${[...request.contentTypes].sort().join(', ')}]${
          request.bodyError === null ? '' : `, payload unreadable: ${request.bodyError}`
        })`,
    )
    .sort();
  const fontUrlsByObservation = new Map<string, string[]>();
  let observationsWithFontRequest = 0;
  let observationsMixingForeignOrigin = 0;
  for (const [key, urls] of result.capture.byObservation) {
    if (key === result.deliveryKey) continue;
    const fontUrls = [...urls].filter(
      (url) => classified.get(url)?.isFont === true,
    );
    fontUrlsByObservation.set(key, fontUrls.sort());
    if (fontUrls.length > 0) observationsWithFontRequest += 1;
    if (
      fontUrls.some((url) => classified.get(url)?.request.origin === 'foreign')
    ) {
      observationsMixingForeignOrigin += 1;
    }
  }
  const fontRows = [...classified.values()]
    .filter(({ isFont }) => isFont)
    .map(({ request }) => ({
      url: request.key,
      origin: request.origin,
      resourceTypes: [...request.resourceTypes].sort(),
      contentTypes: [...request.contentTypes].sort(),
      payloadSignature: request.payloadSignature ?? '',
      sha256: request.sha256 ?? '',
    }))
    .sort((left, right) => left.url.localeCompare(right.url));
  return {
    rows: fontRows,
    unclassified,
    observationsWithFontRequest,
    observationsMixingForeignOrigin,
    foreignOrigin: fontRows
      .filter(({ origin }) => origin === 'foreign')
      .map(({ url }) => url)
      .sort(),
    sameOriginPaths: fontRows
      .filter(({ origin }) => origin === 'same')
      .map(({ url }) => url)
      .sort(),
    fontUrlsByObservation,
  };
}

/**
 * Builds the persisted artifact out of the sweep.
 *
 * The nine Tektur assertions used to take their `passed` status from a
 * hand-maintained `COMPLETED_TEKTUR_ASSERTIONS` set in the enforcement
 * generator, so a route-specific axis defect, a third-party font request or
 * a cmap hole could coexist with freshly regenerated green evidence. This is
 * the measurement that replaces the declaration.
 */
function buildArtifact(result: Sweep): TekturDeliveryEvidence {
  const roleObservations: TekturDeliveryEvidence['roleObservations'] = [];
  const axisTuples = new Map<
    string,
    TekturDeliveryEvidence['roleAxes'][number]
  >();
  const unannotated = new Set<string>();
  const familyObservations: TekturDeliveryEvidence['familyObservations'] = [];

  for (const route of SWEPT_ROUTES) {
    const perWidth = VIEWPORTS.map((viewport) => {
      const observation = result.measured.get(sweepKey(route, viewport.id));
      if (!observation) {
        throw new Error(`${route} @${viewport.id} was not measured`);
      }
      return { viewport, observation };
    });
    for (const { viewport, observation } of perWidth) {
      const roles: Record<string, number> = {};
      for (const occurrence of observation.occurrences) {
        roles[occurrence.role] = (roles[occurrence.role] ?? 0) + 1;
        const key = [
          occurrence.role,
          occurrence.family,
          occurrence.weight,
          occurrence.stretch,
          occurrence.variationSettings,
        ].join('|');
        const existing = axisTuples.get(key);
        axisTuples.set(key, {
          role: occurrence.role,
          family: occurrence.family,
          weight: occurrence.weight,
          stretch: occurrence.stretch,
          variationSettings: occurrence.variationSettings,
          elements: (existing?.elements ?? 0) + 1,
        });
      }
      roleObservations.push({ route, viewportId: viewport.id, roles });
      for (const use of observation.unannotatedClassUses) {
        unannotated.add(`${route} @${viewport.id}: ${use}`);
      }
      // One entry per declared width rather than a union over them: a
      // component that only mounts below a breakpoint resolves families no
      // desktop-width document contains, and the width it appeared at is
      // part of the record instead of being summed away.
      familyObservations.push({
        route,
        viewportId: viewport.id,
        heads: observation.familyHeads,
        headsOutsideMath: observation.headsOutsideMath,
      });
    }
  }

  const requests = summarizeFontRequests(result);
  // Union over the sweep, deduplicated on family plus resolved sources: the
  // same stylesheet is parsed on every route, and the reader needs the set of
  // faces the site declares, not 248 copies of it.
  const fontFaces = new Map<string, { family: string; sources: string[] }>();
  const unreadableStyleSheets = new Set<string>();
  for (const observation of result.measured.values()) {
    for (const face of observation.fontFaces) {
      fontFaces.set(`${face.family}|${face.sources.join(' ')}`, face);
    }
    for (const sheet of observation.unreadableStyleSheets) {
      unreadableStyleSheets.add(sheet);
    }
  }

  return {
    version: 1,
    fingerprint: tekturDeliveryFingerprint({
      root: ROOT,
      css: CSS,
      occurrences: OCCURRENCES,
    }),
    viewports: VIEWPORTS,
    routes: SWEPT_ROUTES,
    roleObservations,
    roleAxes: [...axisTuples.values()].sort((left, right) =>
      left.role === right.role
        ? left.family.localeCompare(right.family)
        : left.role.localeCompare(right.role),
    ),
    unannotatedDisplayClassUses: [...unannotated].sort(),
    familyObservations,
    fontFaces: [...fontFaces.values()].sort((left, right) =>
      left.family === right.family
        ? left.sources.join(' ').localeCompare(right.sources.join(' '))
        : left.family.localeCompare(right.family),
    ),
    unreadableStyleSheets: [...unreadableStyleSheets].sort(),
    fontResources: {
      sameOriginPaths: requests.sameOriginPaths,
      foreignOrigin: requests.foreignOrigin,
      observationsWithFontRequest: requests.observationsWithFontRequest,
      observationsMixingForeignOrigin:
        requests.observationsMixingForeignOrigin,
      fontRequests: requests.rows,
      unclassifiedRequests: requests.unclassified,
    },
    delivery: {
      route: result.deliveryRoute,
      viewportId: result.deliveryViewportId,
      stacks: result.delivery.stacks,
      wordmark: {
        role: TEKTUR_OG_ROLE_ID,
        family: result.delivery.wordmark.family,
        weight: result.delivery.wordmark.weight,
        stretch: result.delivery.wordmark.stretch,
        variationSettings: result.delivery.wordmark.variationSettings,
      },
    },
    assignedStringProbes: result.delivery.assignedStrings,
  };
}

test.describe('Tektur role population', () => {
  test('renders the derived role occurrences with registry axes on every public route at every declared viewport (VAL-B2-TYPE-015)', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    expect(VIEWPORTS.length, 'declared viewport population').toBeGreaterThan(1);
    expect(SWEPT_ROUTES.length, 'derived route population').toBeGreaterThan(1);

    const registered = new Map<string, TekturRoleInstance>(
      TEKTUR_ROLE_INSTANCES.map((instance) => [instance.id, instance]),
    );
    const result = await sweep(page, staticBase);
    const artifact = buildArtifact(result);
    // The family every role annotation has to compute is the runtime family
    // the registered binary is actually published under, derived from the
    // `@font-face` that declares it and the payload checksum that backs it.
    // `family.includes('tektur')` accepted any stack mentioning the word.
    const tekturAlias = measureRuntimeFamilyAliases(artifact).find(
      ({ binarySha256 }) => binarySha256 === TEKTUR_FONT_METADATA.web.sha256,
    );
    expect(
      tekturAlias,
      'an observed @font-face must publish the registered Tektur payload',
    ).toBeDefined();
    const tekturRuntimeKey = tekturAlias?.runtimeKey ?? '';
    const measured = result.measured;
    // The sweep has to have visited the whole cross product; a route or a
    // width dropped from the loop would otherwise reduce the population
    // silently, which is the defect this gate exists to prevent.
    expect(measured.size, 'route x viewport observations').toBe(
      SWEPT_ROUTES.length * VIEWPORTS.length,
    );

    const failures: string[] = [];
    const observedRoutesByRole = new Map<string, Set<string>>();
    let occurrenceCount = 0;
    for (const { route, roles: expectedRoles } of OCCURRENCES.routes) {
      const perViewportCounts = new Set<number>();
      for (const viewport of VIEWPORTS) {
        const where = `${route} @${viewport.id}`;
        const observation = measured.get(sweepKey(route, viewport.id));
        if (!observation) {
          failures.push(`${where}: not measured`);
          continue;
        }
        occurrenceCount += observation.occurrences.length;
        perViewportCounts.add(observation.occurrences.length);

        const observedRoles = [
          ...new Set(observation.occurrences.map(({ role }) => role)),
        ].sort();
        if (observedRoles.join(',') !== expectedRoles.join(',')) {
          failures.push(
            `${where}: renders roles [${observedRoles.join(', ')}], source derives [${expectedRoles.join(', ')}]`,
          );
        }
        for (const use of observation.unannotatedClassUses) {
          failures.push(
            `${where}: display class without a role annotation (${use})`,
          );
        }

        observation.occurrences.forEach((occurrence, index) => {
          const routes = observedRoutesByRole.get(occurrence.role) ?? new Set();
          routes.add(route);
          observedRoutesByRole.set(occurrence.role, routes);

          const at = `${where}: ${occurrence.role}[${index}] "${occurrence.text}"`;
          const instance = registered.get(occurrence.role);
          if (!instance) {
            failures.push(`${at} is not a registered role`);
            return;
          }
          if (fontFamilyHead(occurrence.family) !== tekturRuntimeKey) {
            failures.push(
              `${at} resolves ${occurrence.family}, whose head is ${fontFamilyHead(occurrence.family)} rather than the registered Tektur runtime family ${tekturRuntimeKey}`,
            );
          }
          if (occurrence.weight !== String(instance.wght)) {
            failures.push(
              `${at} computes weight ${occurrence.weight}, registry says ${instance.wght}`,
            );
          }
          if (occurrence.stretch !== `${instance.wdth}%`) {
            failures.push(
              `${at} computes stretch ${occurrence.stretch}, registry says ${instance.wdth}%`,
            );
          }
          if (!occurrence.variationSettings.includes(`"wght" ${instance.wght}`)) {
            failures.push(
              `${at} carries ${occurrence.variationSettings}, registry says "wght" ${instance.wght}`,
            );
          }
          if (!occurrence.variationSettings.includes(`"wdth" ${instance.wdth}`)) {
            failures.push(
              `${at} carries ${occurrence.variationSettings}, registry says "wdth" ${instance.wdth}`,
            );
          }
        });
      }
      // Nothing in the shipped shell renders a different number of role
      // occurrences at a different width; the annotations live in the static
      // document and responsive behaviour is CSS. A width-dependent count is
      // a client component swapping markup, which the per-width role sets
      // above would only catch if the swap removed the last occurrence.
      if (perViewportCounts.size > 1) {
        failures.push(
          `${route}: role occurrence count varies by width (${[...perViewportCounts].join(', ')})`,
        );
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
    expect(occurrenceCount, 'measured role occurrences').toBeGreaterThan(0);

    // Exact in both directions, per role: a role that stops rendering on a
    // subset of the routes source says render it fails here even though every
    // route it still renders on passes.
    for (const role of REGISTERED_ROLE_IDS) {
      expect(
        [...(observedRoutesByRole.get(role) ?? [])].sort(),
        `routes rendering ${role} must equal the routes source derives`,
      ).toEqual([...(OCCURRENCES.routesByRole[role] ?? [])].sort());
    }

    const artifactPath = join(ROOT, TEKTUR_DELIVERY_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
    // Fails here rather than in the enforcement generator if the artifact
    // this run just wrote would not satisfy the reader that has to accept it.
    const measurements = measureTekturEvidence({
      artifact,
      root: ROOT,
      css: CSS,
    });
    expect(
      Object.keys(measurements.roles).sort(),
      'every registered role must carry a measurement',
    ).toEqual([...REGISTERED_ROLE_IDS].sort());
  });

  test('registers exactly the roles first-party source writes, each reaching a public route', () => {
    expect(
      [...REGISTERED_ROLE_IDS].sort(),
      'registered roles must be exactly the roles source writes',
    ).toEqual([...OCCURRENCES.writtenRoles].sort());
    expect(
      [...SWEPT_ROUTES].sort(),
      'the swept routes must be exactly the registered public destinations plus 404',
    ).toEqual(
      [
        ...brandV2Registry.routes.public.map(({ path }) => path),
        NOT_FOUND_ROUTE,
      ].sort(),
    );
    for (const instance of TEKTUR_ROLE_INSTANCES) {
      expect(
        [...instance.definedIn].sort(),
        `${instance.id} definedIn must be exactly the modules that write it`,
      ).toEqual([...(OCCURRENCES.writerModulesByRole[instance.id] ?? [])].sort());
      expect(
        OCCURRENCES.routesByRole[instance.id] ?? [],
        `${instance.id} must be reachable from at least one route entry`,
      ).not.toEqual([]);
    }
  });
});

test.describe('Tektur web typography population', () => {
  /**
   * VAL-B2-TYPE-001's population is every family production typography
   * resolves, not the four registry rows: an unauthorized fifth family on an
   * unannotated surface has to fail rather than go unmeasured. The scoped
   * KaTeX and MathML exceptions are enumerated and each one is required to
   * stay inside rendered mathematics, because the assertion says an
   * exception "never substitutes for a first-party role".
   */
  test('resolves exactly the four registered first-party families on every route, with bounded scoped exceptions (VAL-B2-TYPE-001)', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    const result = await sweep(page, staticBase);
    const measurements = measureTekturEvidence({
      artifact: buildArtifact(result),
      root: ROOT,
      css: CSS,
    });

    expect(
      measurements.families.approved.map(({ family }) => family).sort(),
      'measured first-party families',
    ).toEqual(FIRST_PARTY_TYPE_ROLES.map(({ family }) => family).sort());
    expect(
      measurements.families.routesMeasured,
      'routes whose complete font-family population was measured',
    ).toBe(SWEPT_ROUTES.length);
    expect(
      measurements.families.observationsMeasured,
      'route x width documents whose complete font-family population was measured',
    ).toBe(SWEPT_ROUTES.length * VIEWPORTS.length);
    expect(
      measurements.families.unapprovedHeadObservations,
      'documents resolving a font family that is neither first-party nor a scoped exception',
    ).toBe(0);
    for (const member of measurements.families.approved) {
      expect(
        member.observations,
        `${member.family} documents resolving it`,
      ).toBeGreaterThan(0);
    }

    // The approved keys are the runtime families the registered binaries are
    // published under, one per role, each backed by an observed `@font-face`.
    // Deriving them from the registry names instead would have to fold
    // `Tektur Variable` onto `tektur` by a name transformation, and the
    // transformation that did it also folded `IBM Plex Sans Variable` onto
    // the approved `IBM Plex Sans`.
    const approvedFaces = new Set(
      measurements.families.approved.map(({ runtimeFace }) => runtimeFace),
    );
    expect(
      approvedFaces.size,
      'one runtime family key per registered first-party role',
    ).toBe(FIRST_PARTY_TYPE_ROLES.length);
    const aliased = measurements.families.approved.filter(
      ({ alias }) => alias !== null,
    );
    expect(
      aliased.length,
      'at least one runtime family alias must be observed, or the alias path is untested',
    ).toBeGreaterThan(0);
    for (const member of aliased) {
      expect(
        member.alias?.binarySha256,
        `${member.family} alias must be backed by a registered binary payload`,
      ).toBe(TEKTUR_FONT_METADATA.web.sha256);
      expect(
        member.alias?.deliveredFrom.length,
        `${member.family} alias must be backed by a same-origin delivery`,
      ).toBeGreaterThan(0);
    }
    const exceptionHeads = new Set(
      measurements.families.scopedExceptions.flatMap(({ heads }) => heads),
    );
    // Exact in both directions over the measured population: every head is
    // an approved family or an enumerated exception, and nothing else.
    const heads = new Set(
      measurements.delivery.familyObservations.flatMap((observation) =>
        observation.heads.map(fontFamilyKey),
      ),
    );
    expect([...heads].sort(), 'every resolved font-family head').toEqual(
      [...new Set([...approvedFaces, ...exceptionHeads])].sort(),
    );
    expect(exceptionHeads.size, 'observed scoped exception faces')
      .toBeGreaterThan(0);
    for (const exception of measurements.families.scopedExceptions) {
      for (const head of exception.heads) {
        expect(approvedFaces.has(head), `${head} must not be first-party`).toBe(
          false,
        );
      }
    }
  });
});

test.describe('Tektur web delivery', () => {
  test('loads the local variable face without a third-party request or glyph fallback', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    const result = await sweep(page, staticBase);
    const { delivery } = result;
    const tekturRuntimeKey =
      measureRuntimeFamilyAliases(buildArtifact(result)).find(
        ({ binarySha256 }) => binarySha256 === TEKTUR_FONT_METADATA.web.sha256,
      )?.runtimeKey ?? '';

    expect(fontFamilyHead(delivery.tekturFamily)).toBe(tekturRuntimeKey);
    expect(fontFamilyHead(delivery.wordmark.family)).toBe(tekturRuntimeKey);
    expect(delivery.wordmark.weight).toBe('600');
    expect(delivery.wordmark.stretch).toBe('100%');
    expect(delivery.wordmark.variationSettings).toContain('"wght" 600');
    expect(delivery.wordmark.variationSettings).toContain('"wdth" 100');
    expect(
      Object.keys(delivery.stacks).sort(),
      'the declared typography stacks must all resolve',
    ).toEqual([...STACK_PROPERTIES].sort());
    for (const property of STACK_PROPERTIES) {
      expect(delivery.stacks[property], property).not.toBe('');
    }

    expect(
      delivery.assignedStrings.length,
      'assigned strings probed for per-glyph fallback',
    ).toBe(TEKTUR_ASSIGNED_STRINGS.length);
    for (const probe of delivery.assignedStrings) {
      expect(probe.loaded, `${probe.id} loaded`).toBe(true);
      expect(probe.tekturAdvance, `${probe.id} Tektur advance`).toBeGreaterThan(
        0,
      );
      expect(
        probe.tekturAdvance,
        `${probe.id} must not measure the generic fallback advance`,
      ).not.toBe(probe.fallbackAdvance);
    }

    const deliveryFonts = [
      ...(result.capture.byObservation.get(result.deliveryKey) ?? []),
    ]
      .map((url) => result.capture.requests.get(url))
      .filter((request) => request !== undefined)
      .map((request) => classifyRequest(request))
      .filter(({ isFont }) => isFont);
    expect(
      deliveryFonts.length,
      'the delivery navigation must fetch at least one font',
    ).toBeGreaterThan(0);
    expect(
      deliveryFonts
        .filter(({ request }) => request.origin === 'foreign')
        .map(({ request }) => request.url),
      'the delivery navigation must fetch no third-party font',
    ).toEqual([]);
    // Identified by payload, not by the shape of a URL: the registered
    // binary is the one whose bytes hash to the checksum its metadata
    // records, delivered from the framework's bundled asset path.
    expect(
      deliveryFonts
        .filter(
          ({ request }) => request.sha256 === TEKTUR_FONT_METADATA.web.sha256,
        )
        .map(({ request }) => request.key)
        .filter((key) => key.startsWith('/_next/static/')),
      'the registered Tektur payload must be delivered from /_next/static/',
    ).not.toEqual([]);
    expect(
      deliveryFonts
        .filter(
          ({ request }) => request.sha256 === TEKTUR_FONT_METADATA.og.sha256,
        )
        .map(({ request }) => request.key),
      'no runtime route may request the offline OG payload',
    ).toEqual([]);
  });

  /**
   * VAL-B2-TYPE-002's third-party clause, enforced over the requests the
   * browser actually made.
   *
   * This replaced a Resource Timing filter that accepted an entry whose
   * `initiatorType` was `font` or whose URL ended in `.woff2`, `.ttf` or
   * `.otf`. Both halves were evadable: this browser reports a CSS
   * `@font-face` load with a `css` initiator, so the extension was the whole
   * discriminator, and a third-party URL such as
   * `https://cdn.example/f?id=plex` has none. Every request is decided from
   * the payload that arrived and its declared type, and a request that
   * cannot be decided fails instead of passing.
   */
  test('classifies every captured request from its payload and admits no third-party font (VAL-B2-TYPE-002)', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    const result = await sweep(page, staticBase);
    const classified = [...result.capture.requests.values()].map(
      classifyRequest,
    );
    expect(
      classified.length,
      'requests captured across the sweep',
    ).toBeGreaterThan(0);
    expect(
      classified
        .filter(({ classified: decided }) => !decided)
        .map(
          ({ request }) =>
            `${request.url} [${[...request.resourceTypes].sort().join(', ')}] [${[...request.contentTypes].sort().join(', ')}]`,
        ),
      'every request must be decided from its payload or its declared type',
    ).toEqual([]);

    const fonts = classified.filter(({ isFont }) => isFont);
    expect(fonts.length, 'font requests captured').toBeGreaterThan(0);
    expect(
      fonts
        .filter(({ request }) => request.origin === 'foreign')
        .map(
          ({ request, basis }) =>
            `${request.url} is a font by ${basis}, served as ${[...request.contentTypes].join('/') || 'no declared type'}`,
        ),
      'no swept document may request a font from another origin',
    ).toEqual([]);
    // Non-vacuity for the payload path itself: if nothing were ever decided
    // from its bytes, the content check would be unexercised and the suite
    // would be back to trusting the URL.
    const byPayload = fonts.filter(({ request }) =>
      request.payloadSignature === null
        ? false
        : request.payloadSignature in FONT_PAYLOAD_SIGNATURES,
    );
    expect(
      byPayload.length,
      'font requests confirmed by their payload signature',
    ).toBeGreaterThan(0);
    for (const { request } of byPayload) {
      expect(
        request.payloadSignature,
        `${request.url} must record four payload bytes`,
      ).toMatch(/^[0-9a-f]{8}$/);
      expect(
        request.sha256,
        `${request.url} must record its payload checksum`,
      ).toMatch(/^[0-9a-f]{64}$/);
    }
    // The vocabulary itself has to be able to say no; a classifier whose
    // non-font branch is unreachable is not classifying.
    expect(isFontContentType('font/woff2')).toBe(true);
    expect(isFontContentType('application/octet-stream')).toBe(false);
    expect(isDecidedNonFontContentType('application/octet-stream')).toBe(false);
    expect(isDecidedNonFontContentType('text/html')).toBe(true);
  });
});
