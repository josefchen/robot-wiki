import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { openSync, type Font } from 'fontkit';
import { TEKTUR_FONT_METADATA } from '../data/tektur-font-metadata.ts';
import {
  FIRST_PARTY_TYPE_ROLES,
  TEKTUR_ASSIGNED_STRINGS,
  TEKTUR_OG_ROLE_ID,
  TEKTUR_ROLE_INSTANCES,
  type TekturAssignedString,
} from '../data/type-roles.ts';
import { BRAND_V2_RESPONSIVE_VIEWPORTS } from './brand-v2-responsive-viewports.ts';
import {
  inspectOgRendererFonts,
  type OgRendererFontReport,
} from './og-renderer-font-inspection.ts';
import { OG_RENDERER_FACES } from './og-renderer-fonts.ts';
import { inspectTekturAssets } from './tektur-font-inspection.ts';
import {
  deriveTekturRoleOccurrences,
  type TekturRoleOccurrences,
} from './tektur-role-occurrences.ts';

/**
 * The measurements the nine Tektur assertions rest on, and the fail-closed
 * reader that decides whether they may grant a result.
 *
 * The enforcement generator used to declare all nine complete in a
 * `COMPLETED_TEKTUR_ASSERTIONS` set and then fill each payload from registry
 * and metadata fields. Nothing measured entered the record: a route-specific
 * axis defect, a runtime third-party font request, a renderer family
 * mutation or a cmap hole could coexist with freshly regenerated green
 * results, because the status came from membership in a hand-maintained set
 * rather than from an observation (mission rule R9a).
 *
 * Four measurements replace that declaration, and every one of them fails
 * closed:
 *
 * 1. The all-route browser sweep persisted in
 *    `evidence/brand-v2/tektur-delivery.json`: which role annotations
 *    rendered on every derived route at every declared width, the computed
 *    family and axes of each, the complete computed `font-family` head
 *    population of each document, the font resources each document
 *    requested, and a per-assigned-string glyph probe.
 * 2. `inspectTekturAssets`, opened here on the shipped binaries, for
 *    checksums, formats, axes, licence text and the static OG mapping.
 * 3. The same inspection re-run against in-memory mutants, so "rejects an
 *    undocumented axis" and "rejects a variable OG TTF" are observed
 *    rejections rather than restated prose.
 * 4. `inspectOgRendererFonts`, which walks the shipped card corpus and
 *    proves every painted run resolves to a registered static face.
 *
 * The browser sweep is the only half a node process cannot reproduce, so it
 * is the only half that is persisted; the rest is measured at read time
 * against the current tree and cannot go stale.
 */
export const TEKTUR_DELIVERY_EVIDENCE_PATH =
  'evidence/brand-v2/tektur-delivery.json';

/**
 * The scoped exceptions `VAL-B2-TYPE-001` allows beside the four first-party
 * families, as a closed vocabulary with a required scope.
 *
 * The assertion says these "never substitute for a first-party role", and an
 * OG renderer previously violated exactly that by painting
 * `KaTeX_Typewriter` for ordinary labels. So an exception family is
 * admissible only when every element resolving it sits inside rendered
 * mathematical content; one element outside that scope fails, rather than
 * being waved through as "a KaTeX font".
 */
export const SCOPED_FONT_FAMILY_EXCEPTIONS: ReadonlyArray<{
  id: string;
  pattern: RegExp;
  scope: string;
  reason: string;
}> = [
  {
    id: 'katex-math-face',
    pattern: /^katex_[a-z0-9]+$/,
    scope: '.katex, .katex-display',
    reason:
      'KaTeX typesets rendered mathematics with its own metric-specific faces',
  },
  {
    id: 'mathml-content-face',
    pattern: /^math$/,
    scope: '.katex, .katex-display',
    reason:
      'the MathML content element KaTeX emits for assistive technology carries the user-agent math face',
  },
];

export type TekturDeliveryEvidence = {
  version: number;
  fingerprint: string;
  viewports: Array<{ id: string; width: number; height: number }>;
  routes: string[];
  /** One entry per route x declared width: role id to element count. */
  roleObservations: Array<{
    route: string;
    viewportId: string;
    roles: Record<string, number>;
  }>;
  /**
   * The distinct computed axis tuples the sweep measured for each role. A
   * route or width that computed a different tuple contributes a second
   * entry for that role, which the reader rejects.
   */
  roleAxes: Array<{
    role: string;
    family: string;
    weight: string;
    stretch: string;
    variationSettings: string;
    elements: number;
  }>;
  /** Registered display classes rendered without a role annotation. */
  unannotatedDisplayClassUses: string[];
  /**
   * One entry per route x declared width: every computed `font-family` head
   * that document resolved over all of its elements, and which of those
   * heads at least one element outside rendered mathematics resolved.
   *
   * Head sets rather than per-head element tallies. The scan still walks
   * every element, so the population VAL-B2-TYPE-001 reconciles is
   * unchanged, but the tally itself is not reproducible: the Next.js client
   * runtime appends `<next-route-announcer>` and `<link>` preload/prefetch
   * hints of its own after hydration, on scheduler timing with no settled
   * state to wait for, and those nodes inherit the UI body family. Three
   * consecutive sweeps of an unchanged tree therefore recorded
   * `IBM Plex Sans` as 2139/2138/2138 on `/classical/control/` and
   * 469/464/464 on `/404/` while resolving an identical set of families
   * every time. The set is what the assertion quantifies over; the tally
   * was an exactly-compared number nothing asserted on.
   */
  familyObservations: Array<{
    route: string;
    viewportId: string;
    heads: string[];
    headsOutsideMath: string[];
  }>;
  /**
   * Every `@font-face` rule the swept documents declared, with each `url()`
   * source resolved to a same-origin path or an absolute foreign URL.
   *
   * This is what binds a runtime family name to a payload. `next/font/local`
   * publishes the registered `Tektur Variable` face under the runtime family
   * `tektur`, and the only honest way to accept that rename is to observe the
   * `@font-face` that performs it and confirm the bytes it loads are the
   * registered binary.
   */
  fontFaces: Array<{ family: string; sources: string[] }>;
  /**
   * Stylesheets whose rules the sweep could not read. A stylesheet the sweep
   * cannot read could declare any face at all, so a non-empty list fails.
   */
  unreadableStyleSheets: string[];
  fontResources: {
    sameOriginPaths: string[];
    foreignOrigin: string[];
    observationsWithFontRequest: number;
    observationsMixingForeignOrigin: number;
    /**
     * One row per distinct request the sweep classified as carrying a font
     * payload, with the evidence that classified it.
     *
     * This replaced a Resource Timing scan that accepted an entry when its
     * `initiatorType` was `font` or its URL ended in a font extension. In
     * this browser a CSS `@font-face` load is reported with a `css`
     * initiator — the sweep observed `initiatorType === 'font'` zero times
     * while resolving five to ten font requests per document — so the URL
     * suffix was doing all of the work, and
     * `https://cdn.example/f?id=plex` has no suffix. What a request is, is
     * decided here by the payload that arrived.
     */
    fontRequests: Array<{
      /** Same-origin as `pathname` + `search`; foreign as the absolute URL. */
      url: string;
      origin: 'same' | 'foreign';
      resourceTypes: string[];
      contentTypes: string[];
      /** The first four payload bytes, hex. */
      payloadSignature: string;
      sha256: string;
    }>;
    /**
     * Requests the sweep could not decide about: a foreign-origin request
     * with no readable payload, or any response whose payload and declared
     * type both leave it ambiguous. A non-empty list fails.
     */
    unclassifiedRequests: string[];
  };
  delivery: {
    route: string;
    viewportId: string;
    /** Each `--font-*` stack `app/globals.css` declares, as resolved. */
    stacks: Record<string, string>;
    wordmark: {
      role: string;
      family: string;
      weight: string;
      stretch: string;
      variationSettings: string;
    };
  };
  assignedStringProbes: Array<{
    id: string;
    loaded: boolean;
    tekturAdvance: number;
    fallbackAdvance: number;
  }>;
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * A CSS font-family name reduced to a comparison key, lexically and only
 * lexically.
 *
 * Surrounding whitespace and the one layer of quoting CSS serialization adds
 * are removed, and the name is case-folded, which is what CSS font matching
 * itself does to family names. Nothing else is removed. An earlier version
 * also stripped a trailing ` Variable` from every observed name so that the
 * registered `Tektur Variable` would meet its runtime family `tektur`; that
 * folded the unapproved `IBM Plex Sans Variable` onto the approved
 * `IBM Plex Sans` key too, and a fifth family with a ` Variable` suffix
 * anywhere in production passed as first-party. A runtime family name that
 * differs from its registered name is now admitted only by
 * `reconcileRuntimeFamilyAliases`, which requires an observed `@font-face`
 * loading the registered binary's bytes.
 */
export function fontFamilyKey(family: string): string {
  return family
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
    .toLowerCase();
}

/** The first family a CSS stack names, as a comparison key. */
export function fontFamilyHead(stack: string): string {
  return fontFamilyKey((stack.split(',')[0] ?? '').trim());
}

/**
 * The payload signatures a font file starts with, keyed by the first four
 * bytes in hex.
 *
 * `VAL-B2-TYPE-002` is a claim about font requests, and whether a request
 * carried a font is a fact about the bytes that came back. A URL with no
 * extension and a response type of `application/octet-stream` is still a
 * font if it starts with `wOF2`.
 */
export const FONT_PAYLOAD_SIGNATURES: Readonly<Record<string, string>> = {
  '774f4632': 'WOFF2',
  '774f4646': 'WOFF',
  '4f54544f': 'OpenType/CFF',
  '00010000': 'TrueType',
  '74727565': 'TrueType (true)',
  '74746366': 'TrueType collection',
};

const FONT_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'application/font-woff',
  'application/font-woff2',
  'application/font-sfnt',
  'application/vnd.ms-fontobject',
  'application/x-font-otf',
  'application/x-font-ttf',
  'application/x-font-woff',
]);

/** A response type that declares a font payload. */
export function isFontContentType(contentType: string): boolean {
  return (
    contentType.startsWith('font/') || FONT_CONTENT_TYPES.has(contentType)
  );
}

/**
 * Payload prefixes that positively identify a container which is not a font,
 * in hex.
 *
 * Deliberately the mirror of the font table rather than its complement. A
 * signature that matches nothing is the absence of a signal, so the negative
 * side needs its own positive identification, and only binary container
 * magics can supply one. A text-shaped body — an HTML error page, an XML
 * document, a plain-text notice — is exactly what a blocked, redirected or
 * failed font fetch answers with, so a text prefix says nothing about what
 * was requested and is deliberately absent here.
 */
export const NON_FONT_PAYLOAD_SIGNATURES: Readonly<Record<string, string>> = {
  '0061736d': 'WebAssembly',
  '1f8b': 'gzip',
  '25504446': 'PDF',
  '47494638': 'GIF',
  '504b0304': 'ZIP',
  '52494646': 'RIFF (WebP/WAV/AVI)',
  '676c5446': 'glTF binary',
  '89504e47': 'PNG',
  ffd8ff: 'JPEG',
};

/**
 * The non-font container a payload signature identifies, or null when the
 * bytes identify nothing.
 */
export function nonFontPayloadFormat(signature: string | null): string | null {
  if (signature === null || signature in FONT_PAYLOAD_SIGNATURES) return null;
  const match = Object.entries(NON_FONT_PAYLOAD_SIGNATURES).find(([prefix]) =>
    signature.startsWith(prefix),
  );
  return match?.[1] ?? null;
}

/**
 * A response type that settles the question the other way. Deliberately a
 * closed list: anything outside it, including `application/octet-stream` and
 * a missing type, is ambiguous and cannot support a negative on its own.
 */
export function isDecidedNonFontContentType(contentType: string): boolean {
  if (contentType.length === 0 || isFontContentType(contentType)) return false;
  return (
    /^(?:text|image|video|audio|model)\//.test(contentType) ||
    /^application\/(?:javascript|x-javascript|ecmascript|json|xml|manifest\+json|wasm|pdf|zip|octet-stream\+dash\+xml)$/.test(
      contentType,
    )
  );
}

/**
 * One captured request, as the sweep observed it: what the browser said it
 * was fetching, what the response declared, and what the first four payload
 * bytes were when a body could be read.
 */
export type CapturedRequestObservation = {
  /** Playwright `request.resourceType()` values seen for this URL. */
  resourceTypes: readonly string[];
  /** Response `content-type` values, lower-cased with parameters removed. */
  contentTypes: readonly string[];
  /** The first four payload bytes in hex, or null when none was read. */
  payloadSignature: string | null;
  responded: boolean;
  origin: 'same' | 'foreign';
};

export type CapturedRequestClassification = {
  isFont: boolean;
  /** False leaves the request undecided, which fails closed upstream. */
  classified: boolean;
  basis: string;
};

/**
 * Decides whether a captured request carried a font, from three independent
 * positive signals in union.
 *
 * The three signals are the payload's own container signature, a response
 * type that declares a font, and the browser's font request destination.
 * Any one of them identifies a font; none of them is required. An earlier
 * version consulted the payload first and returned immediately whenever a
 * body had been read, so a readable response with an unrecognized signature
 * was a *decided* non-font before the response type or the request
 * destination was looked at. A prohibited third-party `@font-face` request
 * answered with a corrupt payload, an unsupported container or an HTML
 * error page was therefore dropped from the font rows and from the
 * fail-closed unclassified set at once, and disappeared.
 *
 * Readable bytes that match no known container are the absence of one
 * signal, not evidence of "not a font", and failing every positive signal is
 * not a negative either. A non-font is therefore identified as positively as
 * a font is: every observed response type lies in the closed non-font list,
 * or the payload matches a closed table of non-font container magics. An
 * extensionless foreign request answered with corrupt or unsupported bytes
 * under `application/octet-stream` satisfies neither and stays unclassified,
 * which fails, where it used to be a decided non-font and vanish from both
 * lists.
 */
export function classifyCapturedRequest(
  request: CapturedRequestObservation,
): CapturedRequestClassification {
  const { payloadSignature } = request;
  const signals: string[] = [];
  const payloadFormat =
    payloadSignature === null
      ? undefined
      : FONT_PAYLOAD_SIGNATURES[payloadSignature];
  if (payloadFormat !== undefined) {
    signals.push(`payload signature 0x${payloadSignature} (${payloadFormat})`);
  }
  const fontTypes = [...request.contentTypes].filter(isFontContentType).sort();
  if (fontTypes.length > 0) {
    signals.push(`response type ${fontTypes.join('/')}`);
  }
  if (request.resourceTypes.includes('font')) {
    signals.push('browser font request destination');
  }
  if (signals.length > 0) {
    return { isFont: true, classified: true, basis: signals.join(' + ') };
  }

  const contentTypes = [...request.contentTypes].sort();
  const negatives: string[] = [];
  if (
    contentTypes.length > 0 &&
    contentTypes.every(isDecidedNonFontContentType)
  ) {
    negatives.push(`response type ${contentTypes.join('/')}`);
  }
  const nonFontFormat = nonFontPayloadFormat(payloadSignature);
  if (nonFontFormat !== null) {
    negatives.push(
      `payload signature 0x${payloadSignature} (${nonFontFormat})`,
    );
  }
  if (negatives.length > 0) {
    return { isFont: false, classified: true, basis: negatives.join(' + ') };
  }
  // A request that produced no response body delivered no font. That is a
  // fact about the payload, not a guess from the URL, so a same-origin
  // aborted prefetch is decided rather than left ambiguous. A foreign-origin
  // request is not let through this way: VAL-B2-TYPE-002 forbids the
  // request, so one whose payload cannot be read stays unclassified.
  if (!request.responded && request.origin === 'same') {
    return { isFont: false, classified: true, basis: 'no response payload' };
  }
  return { isFont: false, classified: false, basis: 'undetermined' };
}

/**
 * The `--font-*` typography stacks `app/globals.css` declares.
 *
 * `VAL-B2-TYPE-001` seals the number of first-party role families, so the
 * stack population is derived from the stylesheet rather than retyped: a
 * fifth authored stack is a population change the reader has to see.
 */
export function deriveTypographyStackProperties(css: string): string[] {
  const properties = [
    ...new Set(
      [...css.matchAll(/^\s*--font-([a-z0-9-]+):/gm)].map(
        (match) => `--font-${match[1]}`,
      ),
    ),
  ].sort();
  if (properties.length === 0) {
    throw new Error('app/globals.css declares no --font-* typography stack');
  }
  return properties;
}

export function tekturDeliveryFingerprint(input: {
  root: string;
  css: string;
  occurrences?: TekturRoleOccurrences;
}): string {
  const occurrences =
    input.occurrences ?? deriveTekturRoleOccurrences({ root: input.root });
  return sha256(
    JSON.stringify({
      firstPartyRoles: FIRST_PARTY_TYPE_ROLES,
      roleInstances: TEKTUR_ROLE_INSTANCES,
      ogRoleId: TEKTUR_OG_ROLE_ID,
      assignedStrings: TEKTUR_ASSIGNED_STRINGS.map(({ id, text, targets }) => [
        id,
        text,
        [...targets],
      ]),
      viewports: BRAND_V2_RESPONSIVE_VIEWPORTS,
      rolesByRoute: occurrences.rolesByRoute,
      stacks: deriveTypographyStackProperties(input.css),
      exceptions: SCOPED_FONT_FAMILY_EXCEPTIONS.map(
        ({ id, pattern, scope }) => [id, pattern.source, scope],
      ),
      binaries: [
        TEKTUR_FONT_METADATA.web.sha256,
        TEKTUR_FONT_METADATA.og.sha256,
      ],
      rendererFaces: OG_RENDERER_FACES.map(({ faceId, family, sha256: hash }) => [
        faceId,
        family,
        hash,
      ]),
    }),
  );
}

/**
 * A registered first-party family published to the browser under a different
 * runtime name, and the observation that earns the rename.
 *
 * `next/font/local` emits `@font-face { font-family: tektur }` for the
 * registered `Tektur Variable`, so the sweep resolves the head `tektur` on
 * every display element. The alias is accepted because a swept document
 * declared that `@font-face`, its `src` was fetched same-origin, and the
 * payload hashed to the registered binary's checksum — not because a name
 * transformation happened to map one onto the other.
 */
export type TekturFamilyAlias = {
  roleId: string;
  registeredFamily: string;
  /** The runtime family name as the `@font-face` rule declares it. */
  runtimeFamily: string;
  runtimeKey: string;
  binaryPath: string;
  binarySha256: string;
  /** Same-origin request paths whose payload hashed to that checksum. */
  deliveredFrom: string[];
  /** The `@font-face` sources that declare the runtime family. */
  declaredBy: string[];
};

export type TekturFontRequestMeasurement = {
  url: string;
  origin: 'same' | 'foreign';
  resourceTypes: string[];
  contentTypes: string[];
  payloadSignature: string;
  payloadFormat: string;
  sha256: string;
};

export type TekturFontDeliveryMeasurement = {
  fontRequests: TekturFontRequestMeasurement[];
  sameOriginPaths: string[];
  foreignOrigin: string[];
  /** Same-origin paths whose payload is the registered web binary. */
  registeredWebBinaryPaths: string[];
  frameworkBundledPaths: string[];
  observationsWithFontRequest: number;
  observationsMixingForeignOrigin: number;
  unclassifiedRequests: string[];
};

export type TekturFamilyMember = {
  roleId: string;
  family: string;
  runtimeFace: string;
  /** The alias observation, when the runtime name is not the registered one. */
  alias: TekturFamilyAlias | null;
  heads: string[];
  /** Route x width documents that resolved this family on some element. */
  observations: number;
  routes: string[];
  stackProperties: string[];
  rendererFaceId: string | null;
};

export type TekturFamilyReconciliation = {
  aliases: TekturFamilyAlias[];
  approved: TekturFamilyMember[];
  scopedExceptions: Array<{
    id: string;
    reason: string;
    scope: string;
    heads: string[];
    /**
     * Route x width documents resolving each of this exception's heads,
     * summed over those heads, so a seven-face KaTeX exception counts each
     * face it actually painted.
     */
    observations: number;
    routes: number;
  }>;
  stacks: Record<string, { stack: string; head: string; roleId: string }>;
  routesMeasured: number;
  observationsMeasured: number;
  /** Every distinct head the sweep resolved, normalized and sorted. */
  distinctHeads: string[];
  /**
   * Empty and zero on every reconciliation that returns, because the
   * reconciliation throws on the first sweep that resolved an unapproved
   * head rather than reporting one. They are carried so the emitted
   * evidence states the quantity the assertion turns on instead of leaving
   * "0 unapproved" as prose.
   */
  unapprovedHeads: string[];
  unapprovedHeadObservations: number;
};

export type TekturRoleMeasurement = {
  role: string;
  cssClass: string;
  wght: number;
  wdth: number;
  family: string;
  weight: string;
  stretch: string;
  variationSettings: string;
  elements: number;
  routes: string[];
  viewportsMeasured: number;
  definedIn: readonly string[];
  sourceOccurrences: number;
};

export type TekturBinaryMeasurement = {
  path: string;
  sha256: string;
  format: string;
  subset: string;
  fullName: string;
  variationAxes: Record<string, { min: number; default: number; max: number }>;
  usWeightClass: number | null;
  usWidthClass: number | null;
  licensePath: string;
  licenseIdentifier: string;
  upstreamRepositoryUrl: string;
  upstreamRevision: string;
};

export type TekturInspectionRejections = {
  undocumentedWebAxis: string;
  variableOgFont: string;
  uncoveredAssignedString: string;
};

export type TekturCmapCoverage = {
  id: string;
  targets: string[];
  characters: number;
  codePoints: number;
  webCovered: number;
  ogCovered: number;
};

export type TekturMeasurements = {
  delivery: TekturDeliveryEvidence;
  occurrences: TekturRoleOccurrences;
  fontDelivery: TekturFontDeliveryMeasurement;
  families: TekturFamilyReconciliation;
  roles: Record<string, TekturRoleMeasurement>;
  binaries: { web: TekturBinaryMeasurement; og: TekturBinaryMeasurement };
  rejections: TekturInspectionRejections;
  cmap: Record<string, TekturCmapCoverage>;
  probes: Record<string, TekturDeliveryEvidence['assignedStringProbes'][number]>;
  ogRenderer: OgRendererFontReport;
  routeStateCount: number;
};

function sortedKeys(counts: Record<string, number>): string[] {
  return Object.keys(counts).sort();
}

function requirePositiveCounts(
  counts: Record<string, number>,
  label: string,
): void {
  for (const [key, count] of Object.entries(counts)) {
    if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0) {
      throw new Error(`${label} records ${key} as ${String(count)}`);
    }
  }
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${label} is not a list of strings`);
  }
  return value as string[];
}

/**
 * Reconciles the font requests the sweep captured against
 * `VAL-B2-TYPE-002`'s claim that the Tektur faces are locally or framework
 * bundled and that no runtime route produces a third-party font request.
 *
 * Every row has to re-derive as a font from what the record says arrived, the
 * origin split has to agree with the rows rather than being a separate
 * assertion, the registered binary has to be identified by its checksum
 * rather than by a `/_next/static/media/*.woff2` path shape, and any request
 * the sweep could not decide about is a failure.
 */
function reconcileFontResources(
  artifact: TekturDeliveryEvidence,
  routeStateCount: number,
): TekturFontDeliveryMeasurement {
  const resources = artifact.fontResources;
  if (resources === null || typeof resources !== 'object') {
    throw new Error('Tektur delivery evidence records no font resources');
  }
  const unclassified = requireStringArray(
    resources.unclassifiedRequests,
    'Tektur delivery evidence unclassifiedRequests',
  );
  if (unclassified.length > 0) {
    throw new Error(
      `The sweep could not classify ${unclassified.length} request(s), so it cannot claim they carried no font: ${[
        ...unclassified,
      ]
        .sort()
        .join('; ')}`,
    );
  }
  if (!Array.isArray(resources.fontRequests)) {
    throw new Error(
      'Tektur delivery evidence records no captured font requests',
    );
  }
  const seen = new Set<string>();
  const fontRequests: TekturFontRequestMeasurement[] = resources.fontRequests
    .map((row) => {
      if (row === null || typeof row !== 'object') {
        throw new Error('Tektur delivery evidence records a malformed font request');
      }
      if (typeof row.url !== 'string' || row.url.length === 0) {
        throw new Error('A captured font request records no URL');
      }
      if (seen.has(row.url)) {
        throw new Error(
          `Tektur delivery evidence repeats the font request ${row.url}`,
        );
      }
      seen.add(row.url);
      if (row.origin !== 'same' && row.origin !== 'foreign') {
        throw new Error(
          `${row.url} records the origin ${String(row.origin)}, which is neither same nor foreign`,
        );
      }
      const resourceTypes = requireStringArray(
        row.resourceTypes,
        `${row.url} resourceTypes`,
      );
      if (resourceTypes.length === 0) {
        throw new Error(`${row.url} records no request resource type`);
      }
      const contentTypes = requireStringArray(
        row.contentTypes,
        `${row.url} contentTypes`,
      );
      if (typeof row.sha256 !== 'string' || !SHA256_PATTERN.test(row.sha256)) {
        throw new Error(
          `${row.url} records the payload checksum ${String(row.sha256)}`,
        );
      }
      const payloadFormat = FONT_PAYLOAD_SIGNATURES[row.payloadSignature];
      // The recorded row has to prove itself: a request is reported as a font
      // resource only when its payload signature, its response type or the
      // browser's own request destination says so. Otherwise the artifact
      // would be asserting the classification instead of evidencing it.
      const byPayload = payloadFormat !== undefined;
      const byContentType = contentTypes.some(isFontContentType);
      const byDestination = resourceTypes.includes('font');
      if (!byPayload && !byContentType && !byDestination) {
        throw new Error(
          `${row.url} is recorded as a font request, but its payload signature ${String(row.payloadSignature)}, response types [${contentTypes.join(', ')}] and request types [${resourceTypes.join(', ')}] do not show a font`,
        );
      }
      return {
        url: row.url,
        origin: row.origin,
        resourceTypes: [...resourceTypes].sort(),
        contentTypes: [...contentTypes].sort(),
        payloadSignature: row.payloadSignature,
        payloadFormat: payloadFormat ?? 'unrecognized',
        sha256: row.sha256,
      };
    })
    .sort((left, right) => left.url.localeCompare(right.url));
  if (fontRequests.length === 0) {
    throw new Error(
      'Tektur delivery evidence captured no font request at all, so the delivery claim is vacuous',
    );
  }

  const foreign = fontRequests.filter(({ origin }) => origin === 'foreign');
  if (foreign.length > 0) {
    throw new Error(
      `${foreign.length} runtime font request(s) came from another origin: ${foreign
        .map(
          (row) =>
            `${row.url} (${row.payloadFormat} payload, served as ${row.contentTypes.join('/') || 'no declared type'})`,
        )
        .join('; ')}`,
    );
  }
  const sameOriginPaths = fontRequests
    .filter(({ origin }) => origin === 'same')
    .map(({ url }) => url)
    .sort();
  // The two published sets are derived from the rows rather than recorded
  // beside them, so a hand-edited summary cannot disagree with the capture.
  const recordedSameOrigin = requireStringArray(
    resources.sameOriginPaths,
    'Tektur delivery evidence sameOriginPaths',
  );
  if ([...recordedSameOrigin].sort().join('|') !== sameOriginPaths.join('|')) {
    throw new Error(
      `Tektur delivery evidence lists the same-origin font paths [${[...recordedSameOrigin].sort().join(', ')}]; the captured requests are [${sameOriginPaths.join(', ')}]`,
    );
  }
  const recordedForeign = requireStringArray(
    resources.foreignOrigin,
    'Tektur delivery evidence foreignOrigin',
  );
  if (recordedForeign.length > 0) {
    throw new Error(
      `Tektur delivery evidence records third-party font requests: ${recordedForeign.join(', ')}`,
    );
  }

  const registeredWebBinaryPaths = fontRequests
    .filter(({ sha256 }) => sha256 === TEKTUR_FONT_METADATA.web.sha256)
    .map(({ url }) => url);
  if (registeredWebBinaryPaths.length === 0) {
    throw new Error(
      `No captured same-origin font request delivered the registered ${TEKTUR_FONT_METADATA.web.path} payload (${TEKTUR_FONT_METADATA.web.sha256}); the sweep fetched ${sameOriginPaths.join(', ')}`,
    );
  }
  const frameworkBundledPaths = registeredWebBinaryPaths.filter((path) =>
    path.startsWith('/_next/static/'),
  );
  if (frameworkBundledPaths.length === 0) {
    throw new Error(
      `The registered Tektur binary was delivered from ${registeredWebBinaryPaths.join(', ')}, none of it from the framework's bundled asset path`,
    );
  }
  // The offline OG binary is identified by its bytes first: a renamed copy
  // served from a runtime route is the same leak. The file name is a second
  // trigger, not the test.
  const ogFileName = TEKTUR_FONT_METADATA.og.path.split('/').at(-1) as string;
  const ogLeaks = fontRequests.filter(
    (row) =>
      row.sha256 === TEKTUR_FONT_METADATA.og.sha256 ||
      row.url.includes(ogFileName),
  );
  if (ogLeaks.length > 0) {
    throw new Error(
      `A runtime route requested the offline OG binary (${TEKTUR_FONT_METADATA.og.sha256}): ${ogLeaks
        .map(({ url, sha256 }) => `${url} -> ${sha256}`)
        .join(', ')}`,
    );
  }

  if (resources.observationsMixingForeignOrigin !== 0) {
    throw new Error(
      `${resources.observationsMixingForeignOrigin} swept route states requested a font from another origin`,
    );
  }
  if (
    !(resources.observationsWithFontRequest > 0) ||
    resources.observationsWithFontRequest > routeStateCount
  ) {
    throw new Error(
      `Tektur delivery evidence records ${resources.observationsWithFontRequest} of ${routeStateCount} route states requesting a font resource`,
    );
  }

  return {
    fontRequests,
    sameOriginPaths,
    foreignOrigin: [],
    registeredWebBinaryPaths,
    frameworkBundledPaths,
    observationsWithFontRequest: resources.observationsWithFontRequest,
    observationsMixingForeignOrigin: resources.observationsMixingForeignOrigin,
    unclassifiedRequests: unclassified,
  };
}

/**
 * Derives the runtime family names the registered first-party binaries are
 * actually published under.
 *
 * The only admissible rename is one the sweep watched happen: a declared
 * `@font-face`, a same-origin fetch of its `src`, and a payload whose
 * checksum is the registered binary's. `OG_RENDERER_FACES` is where a
 * vendored family is bound to one of the four first-party roles, so the role
 * an alias belongs to is read from there rather than inferred from the name.
 * Two faces claiming the same payload, or none, both fail: an alias is an
 * observation, and there is no way to declare one into existence.
 */
function reconcileRuntimeFamilyAliases(
  artifact: TekturDeliveryEvidence,
  delivery: TekturFontDeliveryMeasurement,
): TekturFamilyAlias[] {
  const unreadable = requireStringArray(
    artifact.unreadableStyleSheets,
    'Tektur delivery evidence unreadableStyleSheets',
  );
  if (unreadable.length > 0) {
    throw new Error(
      `The sweep could not read ${unreadable.length} stylesheet(s), which could declare any font face: ${unreadable.sort().join(', ')}`,
    );
  }
  if (!Array.isArray(artifact.fontFaces) || artifact.fontFaces.length === 0) {
    throw new Error(
      'Tektur delivery evidence records no @font-face declarations, so no runtime family name is backed by a payload',
    );
  }
  const faces = artifact.fontFaces.map((face, index) => {
    if (typeof face?.family !== 'string' || face.family.trim().length === 0) {
      throw new Error(`@font-face record ${index} declares no family`);
    }
    return {
      family: face.family,
      key: fontFamilyKey(face.family),
      sources: requireStringArray(
        face.sources,
        `@font-face ${face.family} sources`,
      ),
    };
  });

  const ogFace = OG_RENDERER_FACES.find(
    ({ sha256 }) => sha256 === TEKTUR_FONT_METADATA.og.sha256,
  );
  if (!ogFace) {
    throw new Error(
      'No registered Open Graph renderer face carries the Tektur checksum, so no first-party role owns the Tektur binaries',
    );
  }
  const role = FIRST_PARTY_TYPE_ROLES.find(({ id }) => id === ogFace.roleId);
  if (!role) {
    throw new Error(
      `The Open Graph face ${ogFace.faceId} serves the role ${ogFace.roleId}, which is not a registered first-party role`,
    );
  }

  const aliases: TekturFamilyAlias[] = [];
  for (const binary of [
    {
      roleId: role.id,
      registeredFamily: role.family,
      path: TEKTUR_FONT_METADATA.web.path,
      sha256: TEKTUR_FONT_METADATA.web.sha256,
    },
  ]) {
    const deliveredFrom = delivery.fontRequests
      .filter((row) => row.origin === 'same' && row.sha256 === binary.sha256)
      .map(({ url }) => url)
      .sort();
    if (deliveredFrom.length === 0) {
      throw new Error(
        `No same-origin font request delivered ${binary.path} (${binary.sha256}), so nothing backs the runtime family it is published under`,
      );
    }
    const declaring = faces.filter((face) =>
      face.sources.some((source) => deliveredFrom.includes(source)),
    );
    const keys = [...new Set(declaring.map(({ key }) => key))].sort();
    if (keys.length !== 1) {
      throw new Error(
        `${deliveredFrom.join(', ')} delivered ${binary.path}; ${keys.length} distinct @font-face families declare that payload (${keys.join(', ') || 'none'}), so the runtime family of the registered ${binary.registeredFamily} is not determined`,
      );
    }
    aliases.push({
      roleId: binary.roleId,
      registeredFamily: binary.registeredFamily,
      runtimeFamily: declaring[0].family,
      runtimeKey: keys[0],
      binaryPath: binary.path,
      binarySha256: binary.sha256,
      deliveredFrom,
      declaredBy: [
        ...new Set(declaring.flatMap(({ sources }) => sources)),
      ].sort(),
    });
  }
  if (aliases.length === 0) {
    throw new Error(
      'No runtime family alias was derived, so the alias mechanism accepted a rename nothing observed',
    );
  }
  return aliases;
}

/**
 * The runtime family names the registered first-party binaries are published
 * under, derived from the captured payloads and the observed `@font-face`
 * declarations alone.
 *
 * Exported so the browser sweep can compare the family its role annotations
 * computed against the same derivation the reader will apply, instead of
 * asking whether the resolved family "contains tektur".
 */
export function measureRuntimeFamilyAliases(
  artifact: TekturDeliveryEvidence,
): TekturFamilyAlias[] {
  const routeStateCount =
    (Array.isArray(artifact.routes) ? artifact.routes.length : 0) *
    BRAND_V2_RESPONSIVE_VIEWPORTS.length;
  return reconcileRuntimeFamilyAliases(
    artifact,
    reconcileFontResources(artifact, routeStateCount),
  );
}

/**
 * Reconciles the measured `font-family` population against the four
 * registered first-party families.
 *
 * `VAL-B2-TYPE-001` previously rested on the four registry rows, the two OG
 * renderer faces and the six annotated display roles, none of which is the
 * population the assertion quantifies over. A fifth family on an
 * unannotated production surface was therefore not a failure, it was
 * invisible. The population here is every computed head every swept document
 * resolved, so an unapproved family fails and a registered family nothing
 * renders fails too.
 */
function reconcileFamilies(
  artifact: TekturDeliveryEvidence,
  css: string,
  occurrences: TekturRoleOccurrences,
  roles: Record<string, TekturRoleMeasurement>,
  aliases: readonly TekturFamilyAlias[],
): TekturFamilyReconciliation {
  const stackProperties = deriveTypographyStackProperties(css);
  if (stackProperties.length !== FIRST_PARTY_TYPE_ROLES.length) {
    throw new Error(
      `app/globals.css declares ${stackProperties.length} --font-* stacks (${stackProperties.join(', ')}); the registry seals ${FIRST_PARTY_TYPE_ROLES.length} first-party role families`,
    );
  }
  const aliasByRole = new Map(aliases.map((alias) => [alias.roleId, alias]));
  const declaredFaceKeys = new Set(
    (artifact.fontFaces ?? []).map(({ family }) => fontFamilyKey(family)),
  );
  // One approved key per role: the runtime name the family is published
  // under. The registered name is not separately approved, because a
  // production declaration of a name no `@font-face` loads resolves to a
  // fallback face, which is the defect and not the compliance.
  const roleByFace = new Map<string, (typeof FIRST_PARTY_TYPE_ROLES)[number]>();
  for (const role of FIRST_PARTY_TYPE_ROLES) {
    const alias = aliasByRole.get(role.id);
    const key = alias?.runtimeKey ?? fontFamilyKey(role.family);
    if (roleByFace.has(key)) {
      throw new Error(
        `Two registered first-party roles resolve to the runtime family ${key}`,
      );
    }
    if (!declaredFaceKeys.has(key)) {
      throw new Error(
        `The ${role.id} family ${role.family} is published as ${key}, which no observed @font-face declares, so every element naming it falls back`,
      );
    }
    roleByFace.set(key, role);
  }
  if (roleByFace.size !== FIRST_PARTY_TYPE_ROLES.length) {
    throw new Error('Two registered first-party roles name the same family');
  }

  const recordedStacks = artifact.delivery?.stacks;
  if (recordedStacks === null || typeof recordedStacks !== 'object') {
    throw new Error(
      'Tektur delivery evidence records no resolved typography stacks',
    );
  }
  if (Object.keys(recordedStacks).sort().join('|') !== stackProperties.join('|')) {
    throw new Error(
      `Tektur delivery evidence resolved ${Object.keys(recordedStacks).sort().join(', ')}; app/globals.css declares ${stackProperties.join(', ')}`,
    );
  }
  const stacks: TekturFamilyReconciliation['stacks'] = {};
  const stackPropertiesByRole = new Map<string, string[]>();
  for (const property of stackProperties) {
    const stack = recordedStacks[property];
    if (typeof stack !== 'string' || stack.trim().length === 0) {
      throw new Error(`${property} resolved to ${String(stack)} in the sweep`);
    }
    const head = fontFamilyHead(stack);
    const role = roleByFace.get(head);
    if (!role) {
      throw new Error(
        `${property} resolves to the family ${head}, which no registered first-party role declares`,
      );
    }
    stacks[property] = { stack, head, roleId: role.id };
    stackPropertiesByRole.set(role.id, [
      ...(stackPropertiesByRole.get(role.id) ?? []),
      property,
    ]);
  }
  const stackedRoles = new Set(
    Object.values(stacks).map(({ roleId }) => roleId),
  );
  if (stackedRoles.size !== FIRST_PARTY_TYPE_ROLES.length) {
    throw new Error(
      `The declared typography stacks cover ${stackedRoles.size} of the ${FIRST_PARTY_TYPE_ROLES.length} registered first-party role families`,
    );
  }

  const observationsByHead = new Map<string, number>();
  const routesByHead = new Map<string, Set<string>>();
  const exceptionObservationsByHead = new Map<string, number>();
  const unapproved = new Map<string, Set<string>>();
  const substituting: string[] = [];
  let observationsMeasured = 0;
  for (const observation of artifact.familyObservations) {
    const where = `${observation.route} @${observation.viewportId}`;
    observationsMeasured += 1;
    const heads = observation.heads.map(fontFamilyKey);
    if (new Set(heads).size !== heads.length) {
      throw new Error(`${where} records the same font-family head twice`);
    }
    if (heads.length === 0) {
      throw new Error(`${where} resolved no font family`);
    }
    const outside = new Set(observation.headsOutsideMath.map(fontFamilyKey));
    for (const head of outside) {
      if (!heads.includes(head)) {
        throw new Error(
          `${where} records ${head} outside rendered mathematics but records no element resolving it`,
        );
      }
    }
    // The per-document non-emptiness floor. A `document.querySelectorAll`
    // that stops matching the whole document no longer shows up as a
    // shrinking element tally, so the floor is tied to an independently
    // derived fact instead: this route's role annotations come from the
    // occurrence derivation, their computed family from the measured axes,
    // and a scan narrow enough to miss them fails here rather than
    // reconciling a smaller population successfully.
    for (const role of occurrences.rolesByRoute[observation.route] ?? []) {
      const required = fontFamilyHead(roles[role].family);
      if (!heads.includes(required)) {
        throw new Error(
          `${where} renders the ${role} role, which computes the head ${required}, but the font-family scan resolved only [${heads.join(', ')}]`,
        );
      }
    }
    observation.heads.forEach((rawHead, index) => {
      const head = heads[index];
      observationsByHead.set(head, (observationsByHead.get(head) ?? 0) + 1);
      routesByHead.set(
        head,
        (routesByHead.get(head) ?? new Set()).add(observation.route),
      );
      if (roleByFace.has(head)) return;
      const exception = SCOPED_FONT_FAMILY_EXCEPTIONS.find(({ pattern }) =>
        pattern.test(head),
      );
      if (!exception) {
        unapproved.set(rawHead, (unapproved.get(rawHead) ?? new Set()).add(where));
        return;
      }
      if (outside.has(head)) {
        substituting.push(
          `${where} resolves the scoped exception family ${rawHead} on an element outside ${exception.scope}`,
        );
        return;
      }
      exceptionObservationsByHead.set(
        head,
        (exceptionObservationsByHead.get(head) ?? 0) + 1,
      );
    });
  }
  if (unapproved.size > 0) {
    throw new Error(
      `The sweep resolved ${unapproved.size} font family/families that are neither one of the ${FIRST_PARTY_TYPE_ROLES.length} registered first-party families nor a scoped exception: ${[
        ...unapproved,
      ]
        .map(([head, states]) => `${head} on ${[...states].sort().join(', ')}`)
        .join('; ')}`,
    );
  }
  if (substituting.length > 0) {
    throw new Error(
      `${substituting.length} document(s) let a scoped exception substitute for a first-party role: ${substituting.sort().join('; ')}`,
    );
  }
  if (observationsMeasured === 0) {
    throw new Error('The measured font-family population is empty');
  }

  const approved: TekturFamilyMember[] = FIRST_PARTY_TYPE_ROLES.map((role) => {
    const alias = aliasByRole.get(role.id) ?? null;
    const face = alias?.runtimeKey ?? fontFamilyKey(role.family);
    const observations = observationsByHead.get(face) ?? 0;
    if (observations === 0) {
      throw new Error(
        `No swept document resolves the registered ${role.id} family ${role.family}${alias ? ` (published as ${alias.runtimeFamily})` : ''}, so the registration has no referent`,
      );
    }
    return {
      roleId: role.id,
      family: role.family,
      runtimeFace: face,
      alias,
      heads: [face],
      observations,
      routes: [...(routesByHead.get(face) ?? [])].sort(),
      stackProperties: stackPropertiesByRole.get(role.id) ?? [],
      rendererFaceId:
        OG_RENDERER_FACES.find(({ roleId }) => roleId === role.id)?.faceId ??
        null,
    };
  });

  const scopedExceptions = SCOPED_FONT_FAMILY_EXCEPTIONS.map((exception) => {
    const heads = [...exceptionObservationsByHead.keys()]
      .filter((head) => exception.pattern.test(head))
      .sort();
    return {
      id: exception.id,
      reason: exception.reason,
      scope: exception.scope,
      heads,
      observations: heads.reduce(
        (total, head) => total + (exceptionObservationsByHead.get(head) ?? 0),
        0,
      ),
      routes: new Set(
        heads.flatMap((head) => [...(routesByHead.get(head) ?? [])]),
      ).size,
    };
  });
  // A sweep that resolved no exception family at all would prove the
  // exception is bounded only vacuously, so the bound is asserted against a
  // non-empty observed population.
  if (scopedExceptions.every(({ observations }) => observations === 0)) {
    throw new Error(
      'The sweep observed no scoped exception family, so the exception bound is vacuous',
    );
  }

  return {
    aliases: [...aliases],
    approved,
    scopedExceptions,
    stacks,
    routesMeasured: new Set(
      artifact.familyObservations.map(({ route }) => route),
    ).size,
    observationsMeasured,
    distinctHeads: [...observationsByHead.keys()].sort(),
    unapprovedHeads: [...unapproved.keys()].sort(),
    unapprovedHeadObservations: [...unapproved.values()].reduce(
      (total, states) => total + states.size,
      0,
    ),
  };
}

function reconcileRoles(
  artifact: TekturDeliveryEvidence,
  occurrences: TekturRoleOccurrences,
  tekturRuntimeKey: string,
): Record<string, TekturRoleMeasurement> {
  const viewportIds = BRAND_V2_RESPONSIVE_VIEWPORTS.map(({ id }) => id);
  const registered = new Map(
    TEKTUR_ROLE_INSTANCES.map((instance) => [instance.id, instance]),
  );
  if (
    [...registered.keys()].sort().join('|') !==
    [...occurrences.writtenRoles].sort().join('|')
  ) {
    throw new Error(
      `The registry registers ${[...registered.keys()].sort().join(', ')}; first-party source writes ${occurrences.writtenRoles.join(', ')}`,
    );
  }

  const seen = new Set<string>();
  const elementsByRole = new Map<string, number>();
  const routesByRole = new Map<string, Set<string>>();
  const rolesByRouteWidth = new Map<string, string>();
  for (const observation of artifact.roleObservations) {
    const key = `${observation.route} @${observation.viewportId}`;
    if (seen.has(key)) {
      throw new Error(`Tektur delivery evidence repeats the observation ${key}`);
    }
    seen.add(key);
    if (!viewportIds.includes(observation.viewportId)) {
      throw new Error(
        `Tektur delivery evidence measured ${key} at an undeclared width`,
      );
    }
    const expected = occurrences.rolesByRoute[observation.route];
    if (!expected) {
      throw new Error(
        `Tektur delivery evidence measured ${key}, which the derived route population does not contain`,
      );
    }
    requirePositiveCounts(observation.roles, key);
    const measured = sortedKeys(observation.roles);
    if (measured.join('|') !== [...expected].sort().join('|')) {
      throw new Error(
        `${key} rendered the roles [${measured.join(', ')}]; the annotation writers and the used-import graph derive [${expected.join(', ')}]`,
      );
    }
    rolesByRouteWidth.set(
      key,
      measured.map((role) => `${role}=${observation.roles[role]}`).join(','),
    );
    for (const [role, elements] of Object.entries(observation.roles)) {
      elementsByRole.set(role, (elementsByRole.get(role) ?? 0) + elements);
      routesByRole.set(
        role,
        (routesByRole.get(role) ?? new Set()).add(observation.route),
      );
    }
  }
  const requiredObservations =
    artifact.routes.length * BRAND_V2_RESPONSIVE_VIEWPORTS.length;
  if (seen.size !== requiredObservations) {
    throw new Error(
      `Tektur delivery evidence carries ${seen.size} route x width observations; the derived population needs ${requiredObservations}`,
    );
  }
  for (const route of artifact.routes) {
    const signatures = new Set(
      viewportIds.map((viewportId) => {
        const signature = rolesByRouteWidth.get(`${route} @${viewportId}`);
        if (signature === undefined) {
          throw new Error(`${route} was not measured at ${viewportId}`);
        }
        return signature;
      }),
    );
    // Role annotations live in the static document and responsive behaviour
    // is CSS, so a width-dependent count is a client component swapping
    // markup rather than a layout difference.
    if (signatures.size > 1) {
      throw new Error(
        `${route} renders a width-dependent role population (${[...signatures].join(' | ')})`,
      );
    }
  }

  if (!Array.isArray(artifact.roleAxes)) {
    throw new Error('Tektur delivery evidence records no measured role axes');
  }
  const axisByRole = new Map<string, TekturDeliveryEvidence['roleAxes'][number]>();
  for (const axis of artifact.roleAxes) {
    if (axisByRole.has(axis.role)) {
      throw new Error(
        `Tektur delivery evidence measured two different axis tuples for ${axis.role}: ${JSON.stringify(axisByRole.get(axis.role))} and ${JSON.stringify(axis)}`,
      );
    }
    axisByRole.set(axis.role, axis);
  }
  if (
    [...axisByRole.keys()].sort().join('|') !==
    [...registered.keys()].sort().join('|')
  ) {
    throw new Error(
      `Tektur delivery evidence measured axes for ${[...axisByRole.keys()].sort().join(', ')}; the registry registers ${[...registered.keys()].sort().join(', ')}`,
    );
  }

  const measurements: Record<string, TekturRoleMeasurement> = {};
  for (const [role, instance] of registered) {
    const axis = axisByRole.get(role) as TekturDeliveryEvidence['roleAxes'][number];
    // Head equality, not a substring test: `includes('tektur')` accepted
    // `Tektur Clone` or a stack whose head is something else entirely as
    // long as the string appeared anywhere in the resolved family list.
    if (fontFamilyHead(axis.family) !== tekturRuntimeKey) {
      throw new Error(
        `${role} computed the family ${axis.family}, whose head is ${fontFamilyHead(axis.family)} rather than the registered Tektur runtime family ${tekturRuntimeKey}`,
      );
    }
    if (axis.weight !== String(instance.wght)) {
      throw new Error(
        `${role} computed weight ${axis.weight}; the registry records ${instance.wght}`,
      );
    }
    if (axis.stretch !== `${instance.wdth}%`) {
      throw new Error(
        `${role} computed stretch ${axis.stretch}; the registry records ${instance.wdth}%`,
      );
    }
    for (const [tag, value] of [
      ['wght', instance.wght],
      ['wdth', instance.wdth],
    ] as const) {
      if (!axis.variationSettings.includes(`"${tag}" ${value}`)) {
        throw new Error(
          `${role} carries ${axis.variationSettings}; the registry records "${tag}" ${value}`,
        );
      }
    }
    const elements = elementsByRole.get(role) ?? 0;
    if (axis.elements !== elements) {
      throw new Error(
        `Tektur delivery evidence attributes ${axis.elements} elements to ${role}; its per-route observations total ${elements}`,
      );
    }
    if (elements === 0) {
      throw new Error(`${role} rendered on no swept route state`);
    }
    const routes = [...(routesByRole.get(role) ?? [])].sort();
    const derivedRoutes = [...(occurrences.routesByRole[role] ?? [])].sort();
    if (routes.join('|') !== derivedRoutes.join('|')) {
      throw new Error(
        `${role} rendered on [${routes.join(', ')}]; source derives [${derivedRoutes.join(', ')}]`,
      );
    }
    if (
      [...instance.definedIn].sort().join('|') !==
      [...(occurrences.writerModulesByRole[role] ?? [])].sort().join('|')
    ) {
      throw new Error(
        `${role} records definedIn ${JSON.stringify(instance.definedIn)}; the modules that write it are ${JSON.stringify(occurrences.writerModulesByRole[role] ?? [])}`,
      );
    }
    measurements[role] = {
      role,
      cssClass: instance.cssClass,
      wght: instance.wght,
      wdth: instance.wdth,
      family: axis.family,
      weight: axis.weight,
      stretch: axis.stretch,
      variationSettings: axis.variationSettings,
      elements,
      routes,
      viewportsMeasured: BRAND_V2_RESPONSIVE_VIEWPORTS.length,
      definedIn: instance.definedIn,
      sourceOccurrences: occurrences.writers
        .filter((writer) => writer.role === role)
        .reduce((total, writer) => total + writer.occurrences, 0),
    };
  }
  return measurements;
}

function resolveAsset(root: string, path: string): string {
  return isAbsolute(path) ? path : join(root, path);
}

function fontFacts(
  root: string,
  side: 'web' | 'og',
): TekturBinaryMeasurement {
  const metadata = TEKTUR_FONT_METADATA[side];
  const path = resolveAsset(root, metadata.path);
  const font = openSync(path);
  const os2 = font['OS/2'];
  return {
    path: metadata.path,
    sha256: createHash('sha256')
      .update(readFileSync(path))
      .digest('hex'),
    format: font.type,
    subset: metadata.subset,
    fullName: font.fullName,
    variationAxes: Object.fromEntries(
      Object.entries(font.variationAxes).map(([tag, axis]) => [
        tag,
        { min: axis.min, default: axis.default, max: axis.max },
      ]),
    ),
    usWeightClass: os2?.usWeightClass ?? null,
    usWidthClass: os2?.usWidthClass ?? null,
    licensePath: TEKTUR_FONT_METADATA.license.path,
    licenseIdentifier: TEKTUR_FONT_METADATA.license.id,
    upstreamRepositoryUrl: TEKTUR_FONT_METADATA.upstream.repositoryUrl,
    upstreamRevision: TEKTUR_FONT_METADATA.upstream.revision,
  };
}

/** Opens both shipped binaries and records what the inspection measured. */
export function measureTekturBinaries(root: string): {
  web: TekturBinaryMeasurement;
  og: TekturBinaryMeasurement;
} {
  const report = inspectTekturAssets({ root });
  if (!report.ok) {
    throw new Error(
      `Tektur asset inspection failed: ${report.failures.join('; ')}`,
    );
  }
  const measured = { web: fontFacts(root, 'web'), og: fontFacts(root, 'og') };
  for (const side of ['web', 'og'] as const) {
    if (measured[side].sha256 !== TEKTUR_FONT_METADATA[side].sha256) {
      throw new Error(
        `The ${side} Tektur binary hashes to ${measured[side].sha256}; its metadata records ${TEKTUR_FONT_METADATA[side].sha256}`,
      );
    }
  }
  return measured;
}

function mutatedFont(font: Font, variationAxes: Font['variationAxes']): Font {
  return {
    type: font.type,
    familyName: font.familyName,
    subfamilyName: font.subfamilyName,
    fullName: font.fullName,
    postscriptName: font.postscriptName,
    variationAxes,
    characterSet: font.characterSet,
    hasGlyphForCodePoint: font.hasGlyphForCodePoint.bind(font),
    'OS/2': font['OS/2'],
  } as Font;
}

function requireRejection(
  failures: readonly string[],
  needle: string | RegExp,
  what: string,
): string {
  const matched = failures.find((failure) =>
    typeof needle === 'string' ? failure === needle : needle.test(failure),
  );
  if (matched === undefined) {
    throw new Error(
      `Tektur asset inspection did not reject ${what}: it reported ${failures.join('; ') || 'nothing'}`,
    );
  }
  return matched;
}

/**
 * Re-runs the inspection against in-memory mutants, so `VAL-B2-TYPE-014`'s
 * rejection clauses are recorded as observed rejections. Restating "the
 * inspection rejects an undocumented axis" beside the assertion would prove
 * nothing about whether it does.
 */
export function measureTekturInspectionRejections(
  root: string,
): TekturInspectionRejections {
  // The mutation target is the exact resolved metadata path, not "the file
  // with the .woff2 suffix": a suffix test would silently mutate nothing if
  // the vendored format changed, and an inspection that rejects nothing is
  // indistinguishable from one that was never given a defect.
  const webBinary = resolveAsset(root, TEKTUR_FONT_METADATA.web.path);
  const ogBinary = resolveAsset(root, TEKTUR_FONT_METADATA.og.path);
  const extraAxis = inspectTekturAssets({
    root,
    openFont(path) {
      const font = openSync(path);
      if (path !== webBinary) return font;
      return mutatedFont(font, {
        ...font.variationAxes,
        opsz: { name: 'Optical size', min: 12, default: 14, max: 72 },
      });
    },
  });
  const variableOg = inspectTekturAssets({
    root,
    openFont(path) {
      const font = openSync(path);
      if (path !== ogBinary) return font;
      return mutatedFont(font, {
        wght: { name: 'Weight', min: 400, default: 600, max: 900 },
      });
    },
  });
  const uncovered = inspectTekturAssets({
    root,
    assignedStrings: [
      { id: 'mutation:missing-glyph', text: '\u{10ffff}', targets: ['web', 'og'] },
    ],
  });
  return {
    undocumentedWebAxis: requireRejection(
      extraAxis.failures,
      /^web axes mismatch: /,
      'an undocumented variable axis on the web binary',
    ),
    variableOgFont: requireRejection(
      variableOg.failures,
      /^OG TTF must be static/,
      'a variable OG TTF',
    ),
    uncoveredAssignedString: requireRejection(
      uncovered.failures,
      /^web cmap missing /,
      'an assigned string outside the cmap',
    ),
  };
}

/** Per-assigned-string cmap coverage, measured with fontkit. */
export function measureAssignedStringCmapCoverage(
  root: string,
  assigned: readonly TekturAssignedString[] = TEKTUR_ASSIGNED_STRINGS,
): Record<string, TekturCmapCoverage> {
  if (assigned.length === 0) {
    throw new Error('The assigned-string population is empty');
  }
  const web = openSync(resolveAsset(root, TEKTUR_FONT_METADATA.web.path));
  const og = openSync(resolveAsset(root, TEKTUR_FONT_METADATA.og.path));
  const coverage: Record<string, TekturCmapCoverage> = {};
  for (const entry of assigned) {
    const codePoints = new Set(
      [...entry.text].map((character) => character.codePointAt(0) ?? 0),
    );
    if (codePoints.size === 0) {
      throw new Error(`Assigned string ${entry.id} addresses no code point`);
    }
    const covered = (font: Font): number =>
      [...codePoints].filter((codePoint) =>
        font.hasGlyphForCodePoint(codePoint),
      ).length;
    const measurement: TekturCmapCoverage = {
      id: entry.id,
      targets: [...entry.targets].sort(),
      characters: [...entry.text].length,
      codePoints: codePoints.size,
      webCovered: covered(web),
      ogCovered: covered(og),
    };
    for (const target of measurement.targets) {
      const observed =
        target === 'web' ? measurement.webCovered : measurement.ogCovered;
      if (observed !== measurement.codePoints) {
        throw new Error(
          `${entry.id} addresses ${measurement.codePoints} code points; the ${target} cmap covers ${observed}`,
        );
      }
    }
    coverage[entry.id] = measurement;
  }
  return coverage;
}

/**
 * Reads the persisted browser sweep and re-measures everything a node
 * process can, refusing to return a weaker claim. Every population is
 * compared with one derived from the current tree: the routes from the
 * annotation writers and the used-import graph, the widths from the
 * declaring documents, the roles from the registry, the families from the
 * registered first-party roles, and the assigned strings from their own
 * derivation.
 */
export function measureTekturEvidence(input: {
  artifact: unknown;
  root: string;
  css: string;
}): TekturMeasurements {
  const artifact = input.artifact as TekturDeliveryEvidence;
  if (artifact === null || typeof artifact !== 'object') {
    throw new Error('Tektur delivery evidence is not an object');
  }
  if (artifact.version !== 1) {
    throw new Error('Unsupported Tektur delivery evidence version');
  }
  const occurrences = deriveTekturRoleOccurrences({ root: input.root });
  const fingerprint = tekturDeliveryFingerprint({ ...input, occurrences });
  if (artifact.fingerprint !== fingerprint) {
    throw new Error(
      `Tektur delivery evidence is stale: it was measured against ${artifact.fingerprint} and the current registry, routes, widths and binaries hash to ${fingerprint}; re-run npm run test:brand-v2`,
    );
  }
  if (
    JSON.stringify(artifact.viewports) !==
    JSON.stringify(BRAND_V2_RESPONSIVE_VIEWPORTS)
  ) {
    throw new Error(
      `Tektur delivery evidence swept ${JSON.stringify(artifact.viewports)}; the declaring documents derive ${JSON.stringify(BRAND_V2_RESPONSIVE_VIEWPORTS)}`,
    );
  }
  const derivedRoutes = occurrences.routes.map(({ route }) => route);
  if (!Array.isArray(artifact.routes)) {
    throw new Error('Tektur delivery evidence records no swept routes');
  }
  const visited = [...new Set(artifact.routes)].sort();
  const required = [...derivedRoutes].sort();
  if (visited.length !== artifact.routes.length) {
    throw new Error('Tektur delivery evidence repeats a swept route');
  }
  if (visited.join('|') !== required.join('|')) {
    const missing = required.filter((route) => !visited.includes(route));
    const extra = visited.filter((route) => !required.includes(route));
    throw new Error(
      `Tektur delivery evidence swept the wrong routes; missing ${
        missing.join(', ') || 'none'
      } and unexpected ${extra.join(', ') || 'none'}; re-run npm run test:brand-v2`,
    );
  }

  if (
    !Array.isArray(artifact.unannotatedDisplayClassUses) ||
    artifact.unannotatedDisplayClassUses.length > 0
  ) {
    throw new Error(
      `Tektur delivery evidence records display classes without a role annotation: ${
        (artifact.unannotatedDisplayClassUses ?? []).join(', ') || 'unreadable'
      }`,
    );
  }
  if (!Array.isArray(artifact.familyObservations)) {
    throw new Error(
      'Tektur delivery evidence records no font-family observations',
    );
  }
  const declaredWidths = BRAND_V2_RESPONSIVE_VIEWPORTS.map(({ id }) => id);
  const familyStates = new Set<string>();
  for (const observation of artifact.familyObservations) {
    const key = `${observation.route} @${observation.viewportId}`;
    if (familyStates.has(key)) {
      throw new Error(
        `Tektur delivery evidence repeats the font-family observation ${key}`,
      );
    }
    familyStates.add(key);
    if (!required.includes(observation.route)) {
      throw new Error(
        `Tektur delivery evidence measured font families on ${key}, which the derived route population does not contain`,
      );
    }
    if (!declaredWidths.includes(observation.viewportId)) {
      throw new Error(
        `Tektur delivery evidence measured font families on ${key} at an undeclared width`,
      );
    }
    if (
      !Array.isArray(observation.heads) ||
      !Array.isArray(observation.headsOutsideMath)
    ) {
      throw new Error(
        `Tektur delivery evidence records no font-family head set for ${key}`,
      );
    }
  }
  // Exact over the cross product, not per route: a width dropped from the
  // family scan would otherwise leave a complete-looking route list.
  const requiredFamilyStates = required.length * declaredWidths.length;
  if (familyStates.size !== requiredFamilyStates) {
    throw new Error(
      `Tektur delivery evidence carries ${familyStates.size} font-family observations; the derived population needs ${requiredFamilyStates}; re-run npm run test:brand-v2`,
    );
  }

  const routeStateCount =
    artifact.routes.length * BRAND_V2_RESPONSIVE_VIEWPORTS.length;
  // Requests first, because the family reconciliation now depends on them:
  // the runtime family name a registered binary is published under is read
  // off an observed `@font-face` whose payload the capture identified.
  const fontDelivery = reconcileFontResources(artifact, routeStateCount);
  const aliases = reconcileRuntimeFamilyAliases(artifact, fontDelivery);
  const tekturAlias = aliases.find(
    ({ binarySha256 }) => binarySha256 === TEKTUR_FONT_METADATA.web.sha256,
  );
  if (!tekturAlias) {
    throw new Error(
      'No observed @font-face publishes the registered Tektur web binary',
    );
  }
  const tekturRuntimeKey = tekturAlias.runtimeKey;
  const roles = reconcileRoles(artifact, occurrences, tekturRuntimeKey);
  const families = reconcileFamilies(
    artifact,
    input.css,
    occurrences,
    roles,
    aliases,
  );

  const delivery = artifact.delivery;
  if (!required.includes(delivery?.route)) {
    throw new Error(
      `Tektur delivery evidence measured delivery on ${String(delivery?.route)}, which is not a swept route`,
    );
  }
  if (
    !BRAND_V2_RESPONSIVE_VIEWPORTS.some(({ id }) => id === delivery.viewportId)
  ) {
    throw new Error(
      `Tektur delivery evidence measured delivery at the undeclared width ${String(delivery.viewportId)}`,
    );
  }
  const wordmark = delivery.wordmark;
  if (wordmark?.role !== TEKTUR_OG_ROLE_ID) {
    throw new Error(
      `Tektur delivery evidence measured the wordmark role ${String(wordmark?.role)}; the registry maps the OG face to ${TEKTUR_OG_ROLE_ID}`,
    );
  }
  const wordmarkInstance = TEKTUR_ROLE_INSTANCES.find(
    ({ id }) => id === TEKTUR_OG_ROLE_ID,
  );
  if (!wordmarkInstance) {
    throw new Error(`${TEKTUR_OG_ROLE_ID} is not a registered role instance`);
  }
  if (
    fontFamilyHead(wordmark.family) !== tekturRuntimeKey ||
    wordmark.weight !== String(wordmarkInstance.wght) ||
    wordmark.stretch !== `${wordmarkInstance.wdth}%` ||
    !wordmark.variationSettings.includes(`"wght" ${wordmarkInstance.wght}`) ||
    !wordmark.variationSettings.includes(`"wdth" ${wordmarkInstance.wdth}`)
  ) {
    throw new Error(
      `The measured ${TEKTUR_OG_ROLE_ID} computes ${JSON.stringify(wordmark)}; the registry records wght ${wordmarkInstance.wght} / wdth ${wordmarkInstance.wdth}`,
    );
  }

  const cmap = measureAssignedStringCmapCoverage(input.root);
  if (!Array.isArray(artifact.assignedStringProbes)) {
    throw new Error('Tektur delivery evidence records no glyph probes');
  }
  const probes: TekturMeasurements['probes'] = {};
  for (const probe of artifact.assignedStringProbes) {
    if (probes[probe.id]) {
      throw new Error(
        `Tektur delivery evidence repeats the glyph probe ${probe.id}`,
      );
    }
    probes[probe.id] = probe;
  }
  if (
    Object.keys(probes).sort().join('|') !== Object.keys(cmap).sort().join('|')
  ) {
    throw new Error(
      `Tektur delivery evidence probed ${Object.keys(probes).length} assigned strings; the derived population has ${Object.keys(cmap).length}`,
    );
  }
  for (const [id, probe] of Object.entries(probes)) {
    if (probe.loaded !== true) {
      throw new Error(
        `The glyph probe for ${id} reports the assigned string is not fully loaded in the Tektur face`,
      );
    }
    if (!(probe.tekturAdvance > 0)) {
      throw new Error(
        `The glyph probe for ${id} measured a ${probe.tekturAdvance}px Tektur advance`,
      );
    }
    if (probe.tekturAdvance === probe.fallbackAdvance) {
      throw new Error(
        `The glyph probe for ${id} measured the same ${probe.tekturAdvance}px advance in Tektur and in the generic fallback, so per-glyph fallback cannot be ruled out`,
      );
    }
  }

  const ogRenderer = inspectOgRendererFonts({ root: input.root });
  if (!ogRenderer.ok) {
    throw new Error(
      `The Open Graph renderer font walk failed: ${ogRenderer.failures.join('; ')}`,
    );
  }

  return {
    delivery: artifact,
    occurrences,
    fontDelivery,
    families,
    roles,
    binaries: measureTekturBinaries(input.root),
    rejections: measureTekturInspectionRejections(input.root),
    cmap,
    probes,
    ogRenderer,
    routeStateCount,
  };
}

export function readTekturDeliveryEvidence(input: {
  artifact: unknown;
  root: string;
  css: string;
}): TekturDeliveryEvidence {
  return measureTekturEvidence(input).delivery;
}

/* ------------------------------------------------------------------ */
/* Per-assertion, per-member evidence, read out of those measurements. */
/* ------------------------------------------------------------------ */

/**
 * The nine Tektur assertions and the evidence envelope each one's measured
 * payload belongs in. An assertion whose predicate includes a runtime clause
 * carries a browser-state payload because that is where the deciding
 * observation was made; the three that are entirely about the checked-in
 * binaries and their metadata stay machine-inspection rows.
 */
export const TEKTUR_ASSERTION_MODES: Readonly<
  Record<string, 'browser-state' | 'automated-machine'>
> = {
  'VAL-B2-TYPE-001': 'browser-state',
  'VAL-B2-TYPE-002': 'browser-state',
  'VAL-B2-TYPE-011': 'browser-state',
  'VAL-B2-TYPE-012': 'browser-state',
  'VAL-B2-TYPE-013': 'automated-machine',
  'VAL-B2-TYPE-014': 'automated-machine',
  'VAL-B2-TYPE-015': 'browser-state',
  'VAL-B2-TYPE-016': 'automated-machine',
  'VAL-B2-TYPE-017': 'browser-state',
};

export type TekturAssertionEvidence = {
  actual: string;
  observed: Record<string, unknown>;
  sourcePath: string;
  tool: string;
};

const BROWSER_TOOL =
  'Playwright brand-v2 Tektur sweep (evidence/brand-v2/tektur-delivery.json)';
const BINARY_TOOL = 'fontkit inspection of the checked-in binaries';

function binaryFor(
  measurements: TekturMeasurements,
  member: string,
): { side: 'web' | 'og'; facts: TekturBinaryMeasurement } {
  if (member === 'tektur:web-woff2') {
    return { side: 'web', facts: measurements.binaries.web };
  }
  if (member === 'tektur:og-ttf') {
    return { side: 'og', facts: measurements.binaries.og };
  }
  throw new Error(`${member} is not a measured Tektur binary`);
}

/**
 * The same-origin paths that delivered the registered web binary, identified
 * by payload checksum. Previously a `/_next/static/media/*.woff2` path
 * match, which certified "framework bundled" from the shape of a URL.
 */
function bundledWoff2Paths(measurements: TekturMeasurements): string[] {
  return measurements.fontDelivery.frameworkBundledPaths;
}

export function tekturAssertionEvidence(input: {
  assertionId: string;
  populationSource: string;
  member: string;
  measurements: TekturMeasurements;
}): TekturAssertionEvidence {
  const { assertionId, member, measurements } = input;
  const { delivery, families, roles, cmap, probes, ogRenderer } = measurements;
  const sweptStates = `${measurements.routeStateCount} route states (${delivery.routes.length} routes x ${delivery.viewports.length} declared widths)`;

  if (assertionId === 'VAL-B2-TYPE-001') {
    // The enforcement population namespaces the registry rows as
    // `type:<role>`; the role registry itself keys them by the bare role.
    const roleId = member.replace(/^type:/, '');
    const family = families.approved.find(
      (candidate) => candidate.roleId === roleId,
    );
    if (!family) {
      throw new Error(
        `${assertionId}: ${member} is not a registered first-party type role`,
      );
    }
    return {
      sourcePath: TEKTUR_DELIVERY_EVIDENCE_PATH,
      tool: `${BROWSER_TOOL} + satori card walk`,
      actual: `${family.family} resolves as the computed head "${family.runtimeFace}"${
        family.alias
          ? ` (the runtime family an observed @font-face declares for the ${family.alias.binarySha256} payload delivered from ${family.alias.deliveredFrom.join(', ')})`
          : ''
      } on ${family.routes.length} of ${families.routesMeasured} swept routes, in ${family.observations} of ${families.observationsMeasured} route x width documents; walking every element of those documents resolved ${families.distinctHeads.length} distinct font-family heads, of which ${families.unapprovedHeads.length} were neither one of the ${families.approved.length} registered first-party families nor a scoped exception (${families.unapprovedHeadObservations} such documents), and every exception head appeared only inside rendered mathematics`,
      observed: {
        role: roleId,
        family: family.family,
        runtimeFace: family.runtimeFace,
        runtimeFamilyAlias: family.alias
          ? {
              declaredFamily: family.alias.runtimeFamily,
              declaredBy: family.alias.declaredBy,
              backedByBinary: family.alias.binaryPath,
              payloadSha256: family.alias.binarySha256,
              deliveredFrom: family.alias.deliveredFrom,
            }
          : null,
        declaredStacks: family.stackProperties.map(
          (property) => `${property}: ${families.stacks[property].stack}`,
        ),
        observationsResolvingFamily: family.observations,
        routesResolvingFamily: family.routes.length,
        routesMeasured: families.routesMeasured,
        observationsMeasured: families.observationsMeasured,
        distinctHeadsMeasured: families.distinctHeads,
        approvedFamilies: families.approved.map(({ family: name }) => name),
        scopedExceptions: families.scopedExceptions,
        unapprovedFamilyHeads: families.unapprovedHeads,
        unapprovedHeadObservations: families.unapprovedHeadObservations,
        ogRendererFaceId: family.rendererFaceId,
        ogRendererFamiliesPainted: ogRenderer.familiesPainted,
      },
    };
  }

  if (assertionId === 'VAL-B2-TYPE-002') {
    const { side, facts } = binaryFor(measurements, member);
    const bundled = bundledWoff2Paths(measurements);
    return {
      sourcePath: TEKTUR_DELIVERY_EVIDENCE_PATH,
      tool: `${BROWSER_TOOL} + ${BINARY_TOOL}`,
      actual:
        side === 'web'
          ? `the checked-in ${facts.format} is delivered from ${bundled.length} framework-bundled same-origin path(s) whose payload hashes to ${facts.sha256}, and the ${measurements.fontDelivery.fontRequests.length} font request(s) the sweep captured over ${sweptStates} are all same-origin with no request left unclassified`
          : `the checked-in ${facts.format} is consumed only by the offline card renderer: none of the ${measurements.fontDelivery.fontRequests.length} font payloads captured over ${sweptStates} hashes to ${facts.sha256}, and none came from another origin`,
      observed: {
        binary: member,
        path: facts.path,
        sha256: facts.sha256,
        format: facts.format,
        bundledSameOriginPaths: side === 'web' ? bundled : [],
        requestedByRuntimeRoute: false,
        // Classification of each captured request, so the row states what
        // made a request a font: the payload signature, the response type,
        // and the browser's request destination.
        capturedFontRequests: measurements.fontDelivery.fontRequests,
        unclassifiedRequests: measurements.fontDelivery.unclassifiedRequests,
        thirdPartyFontRequests: measurements.fontDelivery.foreignOrigin,
        routeStatesSwept: measurements.routeStateCount,
        routeStatesRequestingAFont:
          delivery.fontResources.observationsWithFontRequest,
      },
    };
  }

  if (assertionId === 'VAL-B2-TYPE-011') {
    const { facts } = binaryFor(measurements, member);
    const bundled = bundledWoff2Paths(measurements);
    return {
      sourcePath: TEKTUR_DELIVERY_EVIDENCE_PATH,
      tool: `${BINARY_TOOL} + ${BROWSER_TOOL}`,
      actual: `the ${facts.subset}-subset ${facts.format} exposes exactly ${Object.keys(facts.variationAxes).sort().join(' and ')}, is served from ${bundled.join(', ')}, and ${sweptStates} produced no third-party font request`,
      observed: {
        binary: member,
        path: facts.path,
        sha256: facts.sha256,
        format: facts.format,
        subset: facts.subset,
        measuredVariationAxes: facts.variationAxes,
        declaredVariationAxes: TEKTUR_FONT_METADATA.web.axes,
        nextFontLocalDelivery: bundled,
        thirdPartyFontRequests: delivery.fontResources.foreignOrigin,
        routeStatesSwept: measurements.routeStateCount,
      },
    };
  }

  if (assertionId === 'VAL-B2-TYPE-012') {
    const { facts } = binaryFor(measurements, member);
    const fileName = facts.path.split('/').at(-1) as string;
    const rendererFace = OG_RENDERER_FACES.find(
      ({ path }) => path === facts.path,
    );
    return {
      sourcePath: TEKTUR_DELIVERY_EVIDENCE_PATH,
      tool: `${BINARY_TOOL} + ${BROWSER_TOOL}`,
      actual: `the static ${facts.format} carries no variation axis, is registered with the offline renderer as ${rendererFace?.faceId ?? 'no face'}, and ${sweptStates} requested ${fileName} on none of them`,
      observed: {
        binary: member,
        path: facts.path,
        sha256: facts.sha256,
        format: facts.format,
        measuredVariationAxes: facts.variationAxes,
        usWeightClass: facts.usWeightClass,
        usWidthClass: facts.usWidthClass,
        consumedByRendererFaceId: rendererFace?.faceId ?? null,
        requestedByRuntimeRoute: false,
        sameOriginFontPathsObserved:
          delivery.fontResources.sameOriginPaths,
        routeStatesSwept: measurements.routeStateCount,
      },
    };
  }

  if (assertionId === 'VAL-B2-TYPE-013') {
    const { side, facts } = binaryFor(measurements, member);
    return {
      sourcePath: 'assets/fonts/tektur/metadata.json',
      tool: BINARY_TOOL,
      actual: `${facts.path} records the ${facts.licenseIdentifier} licence text at ${facts.licensePath}, upstream revision ${facts.upstreamRevision}, the ${facts.sha256} checksum this run recomputed, format ${facts.format}, subset ${facts.subset}, and ${
        side === 'web'
          ? 'the wght/wdth ranges and defaults the binary exposes'
          : `the static style ${TEKTUR_FONT_METADATA.og.style} at weight ${TEKTUR_FONT_METADATA.og.weight}`
      }`,
      observed: {
        binary: member,
        path: facts.path,
        sha256: facts.sha256,
        format: facts.format,
        subset: facts.subset,
        licensePath: facts.licensePath,
        licenseIdentifier: facts.licenseIdentifier,
        upstreamRepositoryUrl: facts.upstreamRepositoryUrl,
        upstreamRevision: facts.upstreamRevision,
        retrieved: TEKTUR_FONT_METADATA.upstream.retrieved,
        ...(side === 'web'
          ? {
              measuredVariationAxes: facts.variationAxes,
              declaredVariationAxes: TEKTUR_FONT_METADATA.web.axes,
            }
          : {
              style: TEKTUR_FONT_METADATA.og.style,
              weight: TEKTUR_FONT_METADATA.og.weight,
              usWeightClass: facts.usWeightClass,
              usWidthClass: facts.usWidthClass,
            }),
      },
    };
  }

  if (assertionId === 'VAL-B2-TYPE-014') {
    const { side, facts } = binaryFor(measurements, member);
    const rejection =
      side === 'web'
        ? measurements.rejections.undocumentedWebAxis
        : measurements.rejections.variableOgFont;
    return {
      sourcePath: 'lib/tektur-font-inspection.ts',
      tool: `${BINARY_TOOL} re-run against an in-memory mutant`,
      actual: `the inspection recomputed ${facts.path}'s checksum as ${facts.sha256}, measured format ${facts.format} and axes [${Object.keys(facts.variationAxes).sort().join(', ') || 'none'}], recorded wdth as "${TEKTUR_FONT_METADATA.axisLabels.wdth}", and rejected the mutant with "${rejection}"`,
      observed: {
        binary: member,
        path: facts.path,
        recomputedSha256: facts.sha256,
        metadataSha256: TEKTUR_FONT_METADATA[side].sha256,
        measuredFormat: facts.format,
        measuredVariationAxisTags: Object.keys(facts.variationAxes).sort(),
        axisLabels: TEKTUR_FONT_METADATA.axisLabels,
        observedRejection: rejection,
      },
    };
  }

  if (assertionId === 'VAL-B2-TYPE-015') {
    const roleId = member.replace(/^type-instance:/, '');
    const measurement = roles[roleId];
    if (!measurement) {
      throw new Error(
        `${assertionId}: ${member} has no measured role occurrence`,
      );
    }
    return {
      sourcePath: TEKTUR_DELIVERY_EVIDENCE_PATH,
      tool: BROWSER_TOOL,
      actual: `${roleId} computes ${measurement.family} at weight ${measurement.weight}, stretch ${measurement.stretch} and ${measurement.variationSettings} on ${measurement.elements} elements across ${measurement.routes.length} routes at all ${measurement.viewportsMeasured} declared widths, matching the registry's wght ${measurement.wght} / wdth ${measurement.wdth}`,
      observed: {
        role: roleId,
        cssClass: measurement.cssClass,
        registeredWght: measurement.wght,
        registeredWdth: measurement.wdth,
        computedFamily: measurement.family,
        computedWeight: measurement.weight,
        computedStretch: measurement.stretch,
        computedVariationSettings: measurement.variationSettings,
        elementsMeasured: measurement.elements,
        routesRendered: measurement.routes.length,
        widthsMeasured: measurement.viewportsMeasured,
        definedIn: measurement.definedIn,
        sourceOccurrences: measurement.sourceOccurrences,
      },
    };
  }

  if (assertionId === 'VAL-B2-TYPE-016') {
    const facts = measurements.binaries.og;
    const instance = TEKTUR_ROLE_INSTANCES.find(
      ({ id }) => id === TEKTUR_FONT_METADATA.og.mappedRoleId,
    );
    if (!instance) {
      throw new Error(
        `${assertionId}: ${TEKTUR_FONT_METADATA.og.mappedRoleId} is not a registered role instance`,
      );
    }
    if (member !== `og-static-mapping:${instance.id}`) {
      throw new Error(`${assertionId}: ${member} is not the mapped OG role`);
    }
    return {
      sourcePath: 'assets/fonts/tektur/metadata.json',
      tool: BINARY_TOOL,
      actual: `${facts.path} maps to the registered ${instance.id} instance and the binary measures usWeightClass ${String(facts.usWeightClass)} / usWidthClass ${String(facts.usWidthClass)} with no variation axis, matching that role's wght ${instance.wght} / wdth ${instance.wdth}`,
      observed: {
        mappedRoleId: TEKTUR_FONT_METADATA.og.mappedRoleId,
        registryOgRoleId: TEKTUR_OG_ROLE_ID,
        staticPath: facts.path,
        registeredWght: instance.wght,
        registeredWdth: instance.wdth,
        measuredUsWeightClass: facts.usWeightClass,
        measuredUsWidthClass: facts.usWidthClass,
        measuredVariationAxisTags: Object.keys(facts.variationAxes).sort(),
        rendererFaceId:
          OG_RENDERER_FACES.find(({ path }) => path === facts.path)?.faceId ??
          null,
      },
    };
  }

  if (assertionId === 'VAL-B2-TYPE-017') {
    const stringId = member.replace(/^assigned-string:/, '');
    const coverage = cmap[stringId];
    const probe = probes[stringId];
    if (!coverage || !probe) {
      throw new Error(
        `${assertionId}: ${member} has no measured cmap coverage or glyph probe`,
      );
    }
    return {
      sourcePath: TEKTUR_DELIVERY_EVIDENCE_PATH,
      tool: `${BINARY_TOOL} + ${BROWSER_TOOL}`,
      actual: `${stringId} addresses ${coverage.codePoints} distinct code points across ${coverage.characters} characters, all covered by the ${coverage.targets.join(' and ')} cmap, and the glyph probe measured a ${probe.tekturAdvance}px Tektur advance against ${probe.fallbackAdvance}px in the generic fallback with the face fully loaded`,
      observed: {
        assignedString: stringId,
        targets: coverage.targets,
        characters: coverage.characters,
        codePoints: coverage.codePoints,
        webCmapCovered: coverage.webCovered,
        ogCmapCovered: coverage.ogCovered,
        glyphProbeLoaded: probe.loaded,
        tekturAdvance: probe.tekturAdvance,
        fallbackAdvance: probe.fallbackAdvance,
        observedCmapRejection: measurements.rejections.uncoveredAssignedString,
      },
    };
  }

  throw new Error(`${assertionId} has no measured Tektur evidence shape`);
}
