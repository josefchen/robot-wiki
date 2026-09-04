import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page, Request } from '@playwright/test';
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
  classifyCapturedRequest,
  deriveTypographyStackProperties,
  fontFamilyHead,
  fontFamilyKey,
  isDecidedNonFontContentType,
  isFontContentType,
  measureRuntimeFamilyAliases,
  measureTekturEvidence,
  tekturDeliveryFingerprint,
  type CapturedRequestClassification,
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
 * What the sweep learned about one network transaction, from the network
 * rather than from its spelling.
 *
 * VAL-B2-TYPE-002 is a claim about font requests, and the previous discovery
 * accepted a Resource Timing entry whose `initiatorType` was `font` or whose
 * URL ended in a font extension. In this browser a CSS `@font-face` load is
 * reported with a `css` initiator — measured: zero entries with
 * `initiatorType === 'font'` while five to ten fonts loaded per document —
 * so the extension was the whole test, and `https://cdn.example/f?id=plex`
 * has no extension. A request is a font here when the payload that arrived
 * is one.
 *
 * Identity is the request, never the URL. While the capture kept one record
 * per URL it unioned the observations of separate transactions and retained
 * only the first readable body, so two fetches of one extensionless foreign
 * URL — a recognized PNG, then corrupt bytes under
 * `application/octet-stream` — combined into a *supported* non-font: the
 * ambiguous second transaction reached neither `fontRequests` nor the
 * fail-closed unclassified set, and disappeared. Each transaction carries
 * its own destination, declared type and payload, is classified alone, and
 * is aggregated only afterwards.
 */
type CapturedTransaction = {
  /** Capture order; two transactions to one URL stay distinguishable. */
  ordinal: number;
  url: string;
  /** Same-origin as `pathname` + `search`; foreign as the absolute URL. */
  key: string;
  origin: 'same' | 'foreign';
  /** The browser's declared destination for this request. */
  resourceType: string;
  /** This response's `content-type`, or null when none arrived. */
  contentType: string | null;
  payloadSignature: string | null;
  sha256: string | null;
  responded: boolean;
  bodyError: string | null;
};

type ClassifiedTransaction = CapturedRequestClassification & {
  transaction: CapturedTransaction;
};

/**
 * The classification decision itself lives in
 * `lib/brand-v2-tektur-evidence.ts` so that the union of the three positive
 * signals is falsifiable under Vitest, one signal at a time, instead of
 * only inside a 248-document browser sweep.
 *
 * The union it computes is over the signals of a single transaction — its
 * payload, its declared type, its destination — which is what makes it a
 * union rather than a merge of separate answers.
 */
function classifyTransaction(
  transaction: CapturedTransaction,
): ClassifiedTransaction {
  return {
    transaction,
    ...classifyCapturedRequest({
      resourceTypes: [transaction.resourceType],
      contentTypes:
        transaction.contentType === null ? [] : [transaction.contentType],
      payloadSignature: transaction.payloadSignature,
      responded: transaction.responded,
      origin: transaction.origin,
    }),
  };
}

type RequestCapture = {
  /** Observation key to the transactions captured while it was navigated. */
  byObservation: Map<string, Set<number>>;
  transactions: Map<number, CapturedTransaction>;
  /** Opens the bucket every subsequent transaction is attributed to. */
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
 * Every transaction that qualifies is read; a body is never skipped because
 * an earlier request to the same URL already produced one.
 */
function captureRequests(page: Page, origin: string): RequestCapture {
  const transactions = new Map<number, CapturedTransaction>();
  const byRequest = new Map<Request, number>();
  const byObservation = new Map<string, Set<number>>();
  const bodies: Array<Promise<void>> = [];
  let current = 'setup';
  let ordinal = 0;

  const mint = (request: Request): CapturedTransaction => {
    const parsed = new URL(request.url());
    ordinal += 1;
    const created: CapturedTransaction = {
      ordinal,
      url: request.url(),
      key:
        parsed.origin === origin
          ? `${parsed.pathname}${parsed.search}`
          : request.url(),
      origin: parsed.origin === origin ? 'same' : 'foreign',
      resourceType: request.resourceType(),
      contentType: null,
      payloadSignature: null,
      sha256: null,
      responded: false,
      bodyError: null,
    };
    transactions.set(ordinal, created);
    return created;
  };

  const record = (request: Request): CapturedTransaction => {
    const existing = byRequest.get(request);
    if (existing !== undefined) {
      return transactions.get(existing) as CapturedTransaction;
    }
    const created = mint(request);
    byRequest.set(request, created.ordinal);
    return created;
  };

  const attribute = (transaction: CapturedTransaction): void => {
    const bucket = byObservation.get(current) ?? new Set<number>();
    bucket.add(transaction.ordinal);
    byObservation.set(current, bucket);
  };

  page.on('request', (request) => {
    if (!/^https?:/.test(request.url())) return;
    attribute(record(request));
  });
  page.on('response', (response) => {
    const request = response.request();
    if (!/^https?:/.test(request.url())) return;
    let captured = record(request);
    if (captured.responded) {
      // A second response on one request would overwrite the first's
      // observations, which is the merge this capture exists to avoid.
      captured = mint(request);
      attribute(captured);
    }
    captured.responded = true;
    const contentType = (response.headers()['content-type'] ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    captured.contentType = contentType;
    const undecided =
      captured.origin === 'foreign' ||
      captured.resourceType === 'font' ||
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
    transactions,
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
};

/**
 * Classifies every captured transaction and attributes the font ones to the
 * observations they were made from.
 *
 * Takes the capture rather than the whole sweep so the planted-request gate
 * below can summarize its own capture without fabricating 248 documents.
 */
function summarizeFontRequests(result: {
  capture: RequestCapture;
  deliveryKey: string;
}): FontRequestSummary {
  const classified = new Map<number, ClassifiedTransaction>();
  for (const [key, transaction] of result.capture.transactions) {
    classified.set(key, classifyTransaction(transaction));
  }
  const describe = ({ transaction }: ClassifiedTransaction): string =>
    `${transaction.url} (transaction ${transaction.ordinal}, ${transaction.origin}-origin, request type ${transaction.resourceType}, response type ${transaction.contentType ?? 'none'}${
      transaction.bodyError === null
        ? ''
        : `, payload unreadable: ${transaction.bodyError}`
    })`;
  const undecided = [...classified.values()]
    .filter(({ classified: decided }) => !decided)
    .map(describe);
  let observationsWithFontRequest = 0;
  let observationsMixingForeignOrigin = 0;
  for (const [key, ordinals] of result.capture.byObservation) {
    if (key === result.deliveryKey) continue;
    const fonts = [...ordinals].filter(
      (entry) => classified.get(entry)?.isFont === true,
    );
    if (fonts.length > 0) observationsWithFontRequest += 1;
    if (
      fonts.some(
        (entry) => classified.get(entry)?.transaction.origin === 'foreign',
      )
    ) {
      observationsMixingForeignOrigin += 1;
    }
  }
  // One row per distinct observation, not per transaction: the sweep runs
  // with the HTTP cache disabled, so each document fetches the same faces
  // again and 248 identical rows would be 248 copies of one fact. A
  // transaction that observed something different — other bytes, another
  // declared type, another destination — keeps its own row rather than
  // being folded into the first one's.
  const rows = new Map<
    string,
    TekturDeliveryEvidence['fontResources']['fontRequests'][number]
  >();
  const fonts = [...classified.values()].filter(({ isFont }) => isFont);
  // A body read that never completed is a missing observation, not a
  // conflicting one. Navigating away cancels the reads still in flight, so
  // at 248 documents most fetches of a face end that way; the transaction
  // carries no signal of its own and must not borrow a sibling's checksum,
  // which is the merge this summary exists to avoid. It is dropped only
  // when some transaction to the same URL was read, and is otherwise
  // unclassified: a font nobody could read supports no delivery claim.
  const readUrls = new Set(
    fonts
      .filter(({ transaction }) => transaction.sha256 !== null)
      .map(({ transaction }) => transaction.url),
  );
  const unreadable: string[] = [];
  for (const font of fonts) {
    const { transaction } = font;
    if (transaction.sha256 === null) {
      if (!readUrls.has(transaction.url)) unreadable.push(describe(font));
      continue;
    }
    const row = {
      url: transaction.key,
      origin: transaction.origin,
      resourceTypes: [transaction.resourceType],
      contentTypes:
        transaction.contentType === null ? [] : [transaction.contentType],
      payloadSignature: transaction.payloadSignature ?? '',
      sha256: transaction.sha256,
    };
    rows.set(JSON.stringify(row), row);
  }
  const unclassified = [...undecided, ...unreadable].sort();
  const fontRows = [...rows.entries()]
    .sort(([leftKey, left], [rightKey, right]) =>
      left.url === right.url
        ? leftKey.localeCompare(rightKey)
        : left.url.localeCompare(right.url),
    )
    .map(([, row]) => row);
  const paths = (origin: 'same' | 'foreign'): string[] =>
    [
      ...new Set(
        fontRows.filter((row) => row.origin === origin).map(({ url }) => url),
      ),
    ].sort();
  return {
    rows: fontRows,
    unclassified,
    observationsWithFontRequest,
    observationsMixingForeignOrigin,
    foreignOrigin: paths('foreign'),
    sameOriginPaths: paths('same'),
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
      .map((ordinal) => result.capture.transactions.get(ordinal))
      .filter((transaction) => transaction !== undefined)
      .map((transaction) => classifyTransaction(transaction))
      .filter(({ isFont }) => isFont);
    expect(
      deliveryFonts.length,
      'the delivery navigation must fetch at least one font',
    ).toBeGreaterThan(0);
    expect(
      deliveryFonts
        .filter(({ transaction }) => transaction.origin === 'foreign')
        .map(({ transaction }) => transaction.url),
      'the delivery navigation must fetch no third-party font',
    ).toEqual([]);
    // Identified by payload, not by the shape of a URL: the registered
    // binary is the one whose bytes hash to the checksum its metadata
    // records, delivered from the framework's bundled asset path.
    expect(
      deliveryFonts
        .filter(
          ({ transaction }) =>
            transaction.sha256 === TEKTUR_FONT_METADATA.web.sha256,
        )
        .map(({ transaction }) => transaction.key)
        .filter((key) => key.startsWith('/_next/static/')),
      'the registered Tektur payload must be delivered from /_next/static/',
    ).not.toEqual([]);
    expect(
      deliveryFonts
        .filter(
          ({ transaction }) =>
            transaction.sha256 === TEKTUR_FONT_METADATA.og.sha256,
        )
        .map(({ transaction }) => transaction.key),
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
    const classified = [...result.capture.transactions.values()].map(
      classifyTransaction,
    );
    expect(
      classified.length,
      'network transactions captured across the sweep',
    ).toBeGreaterThan(0);
    expect(
      classified
        .filter(({ classified: decided }) => !decided)
        .map(
          ({ transaction }) =>
            `${transaction.url} [${transaction.resourceType}] [${transaction.contentType ?? 'no declared type'}]`,
        ),
      'every transaction must be decided from its payload or its declared type',
    ).toEqual([]);

    const fonts = classified.filter(({ isFont }) => isFont);
    expect(fonts.length, 'font requests captured').toBeGreaterThan(0);
    expect(
      fonts
        .filter(({ transaction }) => transaction.origin === 'foreign')
        .map(
          ({ transaction, basis }) =>
            `${transaction.url} is a font by ${basis}, served as ${transaction.contentType ?? 'no declared type'}`,
        ),
      'no swept document may request a font from another origin',
    ).toEqual([]);
    // Non-vacuity for the payload path itself: if nothing were ever decided
    // from its bytes, the content check would be unexercised and the suite
    // would be back to trusting the URL.
    const byPayload = fonts.filter(({ transaction }) =>
      transaction.payloadSignature === null
        ? false
        : transaction.payloadSignature in FONT_PAYLOAD_SIGNATURES,
    );
    expect(
      byPayload.length,
      'font transactions confirmed by their payload signature',
    ).toBeGreaterThan(0);
    for (const { transaction } of byPayload) {
      expect(
        transaction.payloadSignature,
        `${transaction.url} must record four payload bytes`,
      ).toMatch(/^[0-9a-f]{8}$/);
      expect(
        transaction.sha256,
        `${transaction.url} must record its payload checksum`,
      ).toMatch(/^[0-9a-f]{64}$/);
    }
    // The vocabulary itself has to be able to say no; a classifier whose
    // non-font branch is unreachable is not classifying.
    expect(isFontContentType('font/woff2')).toBe(true);
    expect(isFontContentType('application/octet-stream')).toBe(false);
    expect(isDecidedNonFontContentType('application/octet-stream')).toBe(false);
    expect(isDecidedNonFontContentType('text/html')).toBe(true);
  });

  /**
   * The falsification gate for the classifier, run against real Chromium
   * request destinations and real response payloads rather than a
   * hand-built record.
   *
   * Seven third-party requests are planted on a page of the site's own
   * export: three that a real prohibited `@font-face` or font fetch would
   * produce with bytes that are *not* a usable font container, one carrying
   * a genuine WOFF2 payload under a neutral response type, one whose payload
   * never arrives at all, one fetched with an unsupported container under
   * `application/octet-stream` and no font destination, and one
   * extensionless URL fetched twice that answers a recognized PNG first and
   * an unidentifiable payload second. The first four have to reach
   * `fontRequests` and the foreign-origin list; the rest have to reach
   * `unclassifiedRequests`, whose non-emptiness the delivery reader rejects.
   *
   * Before the union fix, the three corrupt-payload plants were decided
   * non-fonts the moment their bytes were readable, so they appeared in
   * neither list and a prohibited third-party font request left no trace.
   * The sixth plant is the same erasure one step further in: no positive
   * signal fired for it, but neither did any negative one, and an
   * unrecognized payload was still being read as "not a font". The seventh
   * is that erasure across transactions: while the capture kept one record
   * per URL, the PNG supplied a conclusive negative that also answered for
   * the later ambiguous response, and the second transaction reached
   * neither list.
   */
  test('catches a corrupt third-party font payload by response type or request destination, and leaves an unreadable or unidentifiable one unclassified (VAL-B2-TYPE-002)', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(120_000);
    const foreign = 'https://cdn.plant.invalid';
    const plants = {
      typeAndDestination: `${foreign}/face-a`,
      destinationOnly: `${foreign}/face-b`,
      typeOnly: `${foreign}/fetched-a`,
      payloadOnly: `${foreign}/fetched-b`,
      unreadable: `${foreign}/aborted`,
      unidentifiable: `${foreign}/fetched-c`,
      conflicting: `${foreign}/fetched-d`,
    };
    // Not a font container in any format the signature table knows, and
    // deliberately long enough to be a plausible response body.
    const corrupt = Buffer.from(`<!doctype html>${'x'.repeat(64)}`);
    // Bytes that identify nothing at all: neither a font container nor one
    // of the containers that can support a negative.
    const unidentifiable = Buffer.concat([
      Buffer.from([0xde, 0xad, 0xbe, 0xef]),
      Buffer.from('truncated container'),
    ]);
    const woff2 = Buffer.concat([
      Buffer.from([0x77, 0x4f, 0x46, 0x32]),
      Buffer.from('truncated wOF2 payload'),
    ]);
    // A container the signature table supports a negative for, which is
    // what makes the first response to the conflicting plant conclusive.
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      Buffer.from([0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('truncated PNG'),
    ]);
    const cors = { 'access-control-allow-origin': '*' };
    let conflictingServed = 0;
    await page.route(`${foreign}/**`, async (route) => {
      const url = route.request().url();
      if (url === plants.unreadable) {
        await route.abort('failed');
        return;
      }
      const font = url === plants.typeAndDestination || url === plants.typeOnly;
      const body =
        url === plants.payloadOnly
          ? woff2
          : url === plants.unidentifiable
            ? unidentifiable
            : url === plants.conflicting
              ? ((conflictingServed += 1), conflictingServed === 1
                  ? png
                  : unidentifiable)
              : corrupt;
      await route.fulfill({
        status: 200,
        headers: {
          ...cors,
          'content-type': font ? 'font/woff2' : 'application/octet-stream',
        },
        body,
      });
    });

    const capture = captureRequests(page, staticBase);
    capture.open('planted third-party requests');
    await page.goto(`${staticBase}/`);
    await page.evaluate(async (urls) => {
      const style = document.createElement('style');
      style.textContent = [
        `@font-face { font-family: plant-a; src: url("${urls.typeAndDestination}"); }`,
        `@font-face { font-family: plant-b; src: url("${urls.destinationOnly}"); }`,
      ].join('\n');
      document.head.append(style);
      await Promise.allSettled([
        document.fonts.load('16px plant-a'),
        document.fonts.load('16px plant-b'),
        fetch(urls.typeOnly),
        fetch(urls.payloadOnly),
        fetch(urls.unreadable),
        fetch(urls.unidentifiable),
      ]);
      // Sequential and uncached, so the two answers to one URL are two
      // network transactions in a known order.
      await fetch(urls.conflicting, { cache: 'no-store' }).catch(() => {});
      await fetch(urls.conflicting, { cache: 'no-store' }).catch(() => {});
    }, plants);
    await capture.settled();

    const transactionsFor = (url: string): ClassifiedTransaction[] =>
      [...capture.transactions.values()]
        .filter((transaction) => transaction.url === url)
        .sort((left, right) => left.ordinal - right.ordinal)
        .map(classifyTransaction);
    const classify = (url: string): ClassifiedTransaction => {
      const found = transactionsFor(url);
      expect(found.length, `${url} was requested ${found.length} time(s)`).toBe(
        1,
      );
      return found[0];
    };

    const byTypeAndDestination = classify(plants.typeAndDestination);
    const byDestination = classify(plants.destinationOnly);
    const byType = classify(plants.typeOnly);
    const byPayloadSignature = classify(plants.payloadOnly);
    const undecidable = classify(plants.unreadable);
    const unidentified = classify(plants.unidentifiable);

    // The premise of the regression: the three corrupt plants delivered a
    // readable body whose signature is in no font container table, which is
    // exactly the state the classifier used to call a decided non-font.
    for (const { transaction } of [
      byTypeAndDestination,
      byDestination,
      byType,
    ]) {
      expect(
        transaction.payloadSignature,
        `${transaction.url} must have delivered readable bytes`,
      ).toMatch(/^[0-9a-f]{8}$/);
      expect(
        (transaction.payloadSignature ?? '') in FONT_PAYLOAD_SIGNATURES,
        `${transaction.url} must carry no recognized font signature`,
      ).toBe(false);
    }

    expect(
      byTypeAndDestination.transaction.resourceType,
      'an @font-face load must arrive with the browser font destination',
    ).toBe('font');
    expect(byTypeAndDestination.isFont, 'font by type and destination').toBe(
      true,
    );
    expect(byTypeAndDestination.basis).toContain('response type font/woff2');
    expect(byTypeAndDestination.basis).toContain(
      'browser font request destination',
    );

    // Each signal alone is sufficient.
    expect(byDestination.isFont, 'font by request destination alone').toBe(
      true,
    );
    expect(byDestination.basis).toBe('browser font request destination');
    expect(byType.isFont, 'font by response type alone').toBe(true);
    expect(byType.basis).toBe('response type font/woff2');
    expect(byType.transaction.resourceType).not.toBe('font');
    expect(byPayloadSignature.isFont, 'font by payload signature alone').toBe(
      true,
    );
    expect(byPayloadSignature.basis).toContain('payload signature 0x774f4632');
    expect(byPayloadSignature.transaction.contentType).toBe(
      'application/octet-stream',
    );

    expect(
      undecidable.classified,
      'a foreign request with no readable payload must stay undecided',
    ).toBe(false);

    // The readable-but-unidentifiable plant: bytes arrived, no positive
    // signal fired, and nothing supports a negative either.
    expect(
      unidentified.transaction.payloadSignature,
      `${plants.unidentifiable} must have delivered readable bytes`,
    ).toBe('deadbeef');
    expect(unidentified.transaction.resourceType).not.toBe('font');
    expect(unidentified.transaction.contentType).toBe(
      'application/octet-stream',
    );
    expect(
      unidentified.classified,
      'an unrecognized payload under an ambiguous type must stay undecided',
    ).toBe(false);

    // The conflicting plant: one URL, two transactions, and the conclusive
    // negative of the first must not answer for the second.
    const conflicting = transactionsFor(plants.conflicting);
    expect(
      conflicting.length,
      'the conflicting plant must be captured as two separate transactions',
    ).toBe(2);
    const [firstAnswer, secondAnswer] = conflicting;
    expect(
      firstAnswer.transaction.payloadSignature,
      'the first answer must be the recognized non-font container',
    ).toBe('89504e47');
    expect(
      firstAnswer.classified,
      'a supported non-font container decides its own transaction',
    ).toBe(true);
    expect(firstAnswer.isFont).toBe(false);
    expect(
      secondAnswer.transaction.payloadSignature,
      'the second answer must have been read rather than skipped',
    ).toBe('deadbeef');
    expect(
      secondAnswer.transaction.contentType,
      'the second answer must arrive under the ambiguous type',
    ).toBe('application/octet-stream');
    expect(
      secondAnswer.classified,
      'the second answer supports no verdict of its own and must stay undecided',
    ).toBe(false);

    const summary = summarizeFontRequests({
      capture,
      deliveryKey: 'not this capture',
    });
    expect(
      summary.foreignOrigin.sort(),
      'every planted third-party font must reach the foreign-origin rows',
    ).toEqual(
      [
        plants.typeAndDestination,
        plants.destinationOnly,
        plants.typeOnly,
        plants.payloadOnly,
      ].sort(),
    );
    expect(
      summary.unclassified
        .map((entry) => entry.split(' (')[0])
        .filter((url) => url.startsWith(foreign))
        .sort(),
      'every undecidable plant must reach the fail-closed unclassified set',
    ).toEqual(
      [plants.unreadable, plants.unidentifiable, plants.conflicting].sort(),
    );
    // The undecided transaction is named by its ordinal, so the decided
    // answer to the same URL cannot be mistaken for it.
    expect(
      summary.unclassified.filter((entry) =>
        entry.startsWith(
          `${plants.conflicting} (transaction ${secondAnswer.transaction.ordinal},`,
        ),
      ),
      'the ambiguous transaction must be identified apart from the decided one',
    ).toHaveLength(1);
    expect(
      summary.unclassified.some((entry) =>
        entry.startsWith(
          `${plants.conflicting} (transaction ${firstAnswer.transaction.ordinal},`,
        ),
      ),
      'the decided transaction must not be reported as unclassified',
    ).toBe(false);
    expect(
      summary.observationsMixingForeignOrigin,
      'the planted observation must be recorded as mixing a foreign origin',
    ).toBe(1);
    // This summary is exactly the shape the sweep writes to
    // `fontResources`, and a non-empty `unclassifiedRequests` is fatal to
    // the reader — falsified per-request in
    // `tests/unit/brand-v2-tektur-evidence.test.ts`. The erased transaction
    // therefore cannot be published as a clean delivery record.
  });
});
