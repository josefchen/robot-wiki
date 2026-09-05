import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FONT_PAYLOAD_SIGNATURES,
  TEKTUR_ASSERTION_MODES,
  TEKTUR_DELIVERY_EVIDENCE_PATH,
  classifyCapturedRequest,
  fontFamilyKey,
  measureTekturEvidence,
  nonFontPayloadFormat,
  tekturAssertionEvidence,
  type TekturDeliveryEvidence,
} from '../../lib/brand-v2-tektur-evidence';
import { FIRST_PARTY_TYPE_ROLES } from '../../data/type-roles';
import { TEKTUR_FONT_METADATA } from '../../data/tektur-font-metadata';

const ROOT = process.cwd();
const CSS = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
const COMMITTED = JSON.parse(
  readFileSync(join(ROOT, TEKTUR_DELIVERY_EVIDENCE_PATH), 'utf8'),
) as TekturDeliveryEvidence;

const clone = (): TekturDeliveryEvidence =>
  JSON.parse(JSON.stringify(COMMITTED)) as TekturDeliveryEvidence;

function measure(artifact: TekturDeliveryEvidence) {
  return measureTekturEvidence({ artifact, root: ROOT, css: CSS });
}

/**
 * A route that renders mathematics, so the scoped-exception clauses have a
 * non-empty population to be mutated against rather than being asserted
 * where no exception face is present.
 */
function mathRoute(artifact: TekturDeliveryEvidence): TekturDeliveryEvidence['familyObservations'][number] {
  const observation = artifact.familyObservations.find((candidate) =>
    candidate.heads.some(
      (head) =>
        /^katex_/i.test(head) && !candidate.headsOutsideMath.includes(head),
    ),
  );
  if (!observation) throw new Error('no swept route renders KaTeX faces');
  return observation;
}

function katexHead(
  observation: TekturDeliveryEvidence['familyObservations'][number],
): string {
  const head = observation.heads.find((candidate) =>
    /^katex_/i.test(candidate),
  );
  if (!head) throw new Error('observation resolves no KaTeX face');
  return head;
}

/** The captured request whose payload is the registered web binary. */
function registeredWebRequest(
  artifact: TekturDeliveryEvidence,
): TekturDeliveryEvidence['fontResources']['fontRequests'][number] {
  const row = artifact.fontResources.fontRequests.find(
    ({ sha256 }) => sha256 === TEKTUR_FONT_METADATA.web.sha256,
  );
  if (!row) throw new Error('the sweep captured no registered Tektur payload');
  return row;
}

/** The `@font-face` record that publishes the registered web binary. */
function aliasFace(
  artifact: TekturDeliveryEvidence,
): TekturDeliveryEvidence['fontFaces'][number] {
  const delivered = registeredWebRequest(artifact).url;
  const face = artifact.fontFaces.find(({ sources }) =>
    sources.includes(delivered),
  );
  if (!face) {
    throw new Error(`no @font-face declares ${delivered}`);
  }
  return face;
}

function facesFor(
  artifact: TekturDeliveryEvidence,
  family: string,
): TekturDeliveryEvidence['fontFaces'] {
  const faces = artifact.fontFaces.filter(
    (candidate) => fontFamilyKey(candidate.family) === fontFamilyKey(family),
  );
  if (faces.length === 0) {
    throw new Error(`the sweep observed no @font-face for ${family}`);
  }
  return faces;
}

describe('brand-v2 Tektur delivery evidence', () => {
  it('accepts the committed sweep and measures every clause it certifies', () => {
    const measurements = measure(clone());

    expect(measurements.delivery.routes.length).toBe(
      measurements.occurrences.routes.length,
    );
    expect(measurements.routeStateCount).toBe(
      measurements.delivery.routes.length *
        measurements.delivery.viewports.length,
    );
    expect(measurements.families.approved.map(({ family }) => family).sort())
      .toEqual(FIRST_PARTY_TYPE_ROLES.map(({ family }) => family).sort());
    expect(measurements.families.observationsMeasured).toBe(
      measurements.routeStateCount,
    );
    expect(measurements.families.unapprovedHeadObservations).toBe(0);
    expect(
      measurements.families.scopedExceptions.some(
        ({ observations }) => observations > 0,
      ),
      'the scoped-exception bound must be observed non-vacuously',
    ).toBe(true);
    expect(Object.keys(measurements.roles).length).toBeGreaterThan(0);
    expect(measurements.binaries.web.format).toBe('WOFF2');
    expect(measurements.binaries.og.format).toBe('TTF');
    expect(measurements.rejections.undocumentedWebAxis).toMatch(
      /web axes mismatch: expected wdth,wght, received opsz,wdth,wght/,
    );
    expect(measurements.rejections.variableOgFont).toMatch(
      /OG TTF must be static, received axes wght/,
    );
    expect(measurements.rejections.uncoveredAssignedString).toMatch(
      /web cmap missing U\+10FFFF/,
    );
    expect(Object.keys(measurements.probes).length).toBe(
      Object.keys(measurements.cmap).length,
    );

    // Every assertion the generator routes here must produce a payload for
    // every member it claims; an assertion with no evidence shape would
    // otherwise fall through to the pending default and read as measured.
    for (const assertionId of Object.keys(TEKTUR_ASSERTION_MODES)) {
      expect(typeof TEKTUR_ASSERTION_MODES[assertionId]).toBe('string');
    }
    const displayEvidence = tekturAssertionEvidence({
      assertionId: 'VAL-B2-TYPE-001',
      populationSource: 'contract/brand-v2-registries.json#typeRoles',
      member: 'type:display',
      measurements,
    });
    expect(displayEvidence.observed.unapprovedFamilyHeads).toEqual([]);
    expect(displayEvidence.actual).toContain('tektur');
  });

  /**
   * The generator used to grant these nine assertions `passed` from a
   * membership set and fill each payload from registry and metadata fields,
   * so none of the mutations below could have failed anything. Each one is a
   * defect the row now has to reject.
   */
  it('rejects stale, truncated, and disagreeing Tektur evidence', () => {
    const stale = clone();
    stale.fingerprint = `${stale.fingerprint.slice(0, -1)}0`;
    expect(() => measure(stale)).toThrow(/stale/);

    const unversioned = clone();
    (unversioned as { version: number }).version = 2;
    expect(() => measure(unversioned)).toThrow(/Unsupported/);

    const droppedRoute = clone();
    droppedRoute.routes = droppedRoute.routes.slice(0, -1);
    expect(() => measure(droppedRoute)).toThrow(/swept the wrong routes/);

    const droppedWidth = clone();
    const width = droppedWidth.viewports[1].id;
    droppedWidth.roleObservations = droppedWidth.roleObservations.filter(
      (observation) => observation.viewportId !== width,
    );
    expect(() => measure(droppedWidth)).toThrow(
      /route x width observations|was not measured at/,
    );

    // The family scan is exact over the route x width cross product, so a
    // width dropped from it fails even though every route it still measured
    // resolves an approved family.
    const droppedFamilyWidth = clone();
    const familyWidth = droppedFamilyWidth.viewports[1].id;
    droppedFamilyWidth.familyObservations =
      droppedFamilyWidth.familyObservations.filter(
        (observation) => observation.viewportId !== familyWidth,
      );
    expect(() => measure(droppedFamilyWidth)).toThrow(
      /font-family observations; the derived population needs/,
    );

    const repeatedFamilyState = clone();
    repeatedFamilyState.familyObservations = [
      ...repeatedFamilyState.familyObservations.slice(0, -1),
      repeatedFamilyState.familyObservations[0],
    ];
    expect(() => measure(repeatedFamilyState)).toThrow(
      /repeats the font-family observation/,
    );

    const droppedFamilyRoute = clone();
    droppedFamilyRoute.familyObservations =
      droppedFamilyRoute.familyObservations.slice(0, -1);
    expect(() => measure(droppedFamilyRoute)).toThrow(
      /font-family observations; the derived population needs/,
    );

    const missingRole = clone();
    const withRoles = missingRole.roleObservations.find(
      (observation) => Object.keys(observation.roles).length > 1,
    );
    if (!withRoles) throw new Error('no route renders two Tektur roles');
    delete withRoles.roles[Object.keys(withRoles.roles)[0]];
    expect(() => measure(missingRole)).toThrow(/rendered the roles/);

    const driftedAxis = clone();
    driftedAxis.roleAxes[0].weight = '400';
    expect(() => measure(driftedAxis)).toThrow(/computed weight 400/);

    const droppedAxis = clone();
    droppedAxis.roleAxes = droppedAxis.roleAxes.slice(1);
    expect(() => measure(droppedAxis)).toThrow(/measured axes for/);

    // Both of these passed a `family.includes('tektur')` substring test.
    const lookalikeAxis = clone();
    lookalikeAxis.roleAxes[0].family = 'Tektur Clone, sans-serif';
    expect(() => measure(lookalikeAxis)).toThrow(
      /rather than the registered Tektur runtime family/,
    );

    const displacedHead = clone();
    displacedHead.roleAxes[0].family = 'Arial, tektur, sans-serif';
    expect(() => measure(displacedHead)).toThrow(
      /whose head is arial rather than the registered Tektur runtime family/,
    );

    const lookalikeWordmark = clone();
    lookalikeWordmark.delivery.wordmark.family = 'Tektur Clone, sans-serif';
    expect(() => measure(lookalikeWordmark)).toThrow(
      /the registry records wght/,
    );
  });

  it('rejects an unapproved or unscoped font family anywhere in the population', () => {
    // The defect this replaces: `font-family: Arial` on any unannotated
    // production surface left every Tektur row green because nothing
    // measured the families production typography actually resolves.
    const planted = clone();
    planted.familyObservations[0].heads.push('Arial');
    planted.familyObservations[0].headsOutsideMath.push('Arial');
    expect(() => measure(planted)).toThrow(
      /neither one of the 4 registered first-party families nor a scoped exception: Arial on/,
    );

    const unscoped = clone();
    const observation = mathRoute(unscoped);
    observation.headsOutsideMath.push(katexHead(observation));
    expect(() => measure(unscoped)).toThrow(
      /on an element outside \.katex, \.katex-display/,
    );

    const phantomScope = clone();
    mathRoute(phantomScope).headsOutsideMath.push('KaTeX_Phantom');
    expect(() => measure(phantomScope)).toThrow(
      /records katex_phantom outside rendered mathematics but records no element/,
    );

    // A registered family nothing resolves is a registration without a
    // referent, which is how a family could be "approved" and unused.
    const unusedFamily = clone();
    for (const entry of unusedFamily.familyObservations) {
      entry.heads = entry.heads.filter((head) => head !== 'Newsreader');
      entry.headsOutsideMath = entry.headsOutsideMath.filter(
        (head) => head !== 'Newsreader',
      );
    }
    expect(() => measure(unusedFamily)).toThrow(/has no referent/);

    // A sweep with no exception face at all would satisfy "never
    // substitutes" vacuously.
    const noExceptions = clone();
    for (const entry of noExceptions.familyObservations) {
      entry.heads = entry.heads.filter(
        (head) => !/^(?:katex_|math$)/i.test(head),
      );
      entry.headsOutsideMath = entry.headsOutsideMath.filter(
        (head) => !/^(?:katex_|math$)/i.test(head),
      );
    }
    expect(() => measure(noExceptions)).toThrow(/vacuous/);
  });

  /**
   * The head set replaced a per-head element tally that moved between
   * identical runs, and the tally was the only thing standing between a
   * font-family scan that stops matching the document and a green
   * reconciliation. These are the mutations that floor has to reject.
   */
  it('rejects a font-family scan that matched less than the document', () => {
    const empty = clone();
    empty.familyObservations[0].heads = [];
    empty.familyObservations[0].headsOutsideMath = [];
    expect(() => measure(empty)).toThrow(/resolved no font family/);

    const missingSchema = clone();
    (
      missingSchema.familyObservations[0] as { heads?: string[] }
    ).heads = undefined;
    expect(() => measure(missingSchema)).toThrow(
      /shape its reader requires.*familyObservations.0.heads/s,
    );

    const duplicated = clone();
    duplicated.familyObservations[0].heads = [
      ...duplicated.familyObservations[0].heads,
      duplicated.familyObservations[0].heads[0],
    ];
    expect(() => measure(duplicated)).toThrow(
      /records the same font-family head twice/,
    );

    // Every swept route renders at least one Tektur role, so a scan narrowed
    // to anything less than the whole document loses the display head.
    const narrowedScan = clone();
    for (const entry of narrowedScan.familyObservations) {
      entry.heads = entry.heads.filter((head) => !/tektur/i.test(head));
      entry.headsOutsideMath = entry.headsOutsideMath.filter(
        (head) => !/tektur/i.test(head),
      );
    }
    expect(() => measure(narrowedScan)).toThrow(
      /role, which computes the head tektur, but the font-family scan resolved only/,
    );
  });

  /**
   * The family reconciler used to strip a trailing ` Variable` from every
   * observed name so that the registered `Tektur Variable` would meet its
   * runtime family `tektur`. Any unapproved `<approved> Variable` family
   * therefore normalized onto an approved key and produced no failure, on
   * any production surface, even though the browser would fall back because
   * no face of that name is loaded. The rename is now an observation, not a
   * transformation.
   */
  it('rejects an unapproved family that differs from an approved one only by a Variable suffix', () => {
    const planted = clone();
    planted.familyObservations[0].heads.push('IBM Plex Sans Variable');
    planted.familyObservations[0].headsOutsideMath.push(
      'IBM Plex Sans Variable',
    );
    expect(() => measure(planted)).toThrow(
      /neither one of the 4 registered first-party families nor a scoped exception: IBM Plex Sans Variable on/,
    );

    const suffixed = clone();
    suffixed.familyObservations[1].heads.push('Newsreader Variable');
    suffixed.familyObservations[1].headsOutsideMath.push('Newsreader Variable');
    expect(() => measure(suffixed)).toThrow(
      /nor a scoped exception: Newsreader Variable on/,
    );
  });

  /**
   * The positive control for the same mechanism: the one legitimate rename
   * still resolves, and it resolves because the sweep saw the `@font-face`
   * that performs it load the registered payload.
   */
  it('accepts the registered Tektur runtime alias, and only on that evidence', () => {
    const measurements = measure(clone());
    const display = measurements.families.approved.find(
      ({ roleId }) => roleId === 'display',
    );
    expect(display?.family).toBe('Tektur Variable');
    expect(display?.alias?.binaryPath).toBe(TEKTUR_FONT_METADATA.web.path);
    expect(display?.alias?.binarySha256).toBe(TEKTUR_FONT_METADATA.web.sha256);
    expect(display?.runtimeFace).toBe(display?.alias?.runtimeKey);
    expect(display?.alias?.deliveredFrom.length).toBeGreaterThan(0);
    expect(display?.observations).toBeGreaterThan(0);
    // Exactly one alias: the other three families are published under their
    // registered names, so nothing else may be renamed.
    expect(
      measurements.families.approved
        .filter(({ alias }) => alias !== null)
        .map(({ roleId }) => roleId),
    ).toEqual(['display']);

    // Without the declaring face, the head the display role resolves is not
    // an approved family at all.
    const undeclared = clone();
    undeclared.fontFaces = undeclared.fontFaces.filter(
      (face) => face !== aliasFace(undeclared),
    );
    expect(() => measure(undeclared)).toThrow(
      /distinct @font-face families declare that payload \(none\)/,
    );

    // A second face claiming the same payload leaves the runtime family
    // ambiguous, so an added alias cannot approve a new name.
    const ambiguous = clone();
    ambiguous.fontFaces = [
      ...ambiguous.fontFaces,
      {
        family: '"IBM Plex Sans Variable"',
        sources: [...aliasFace(ambiguous).sources],
      },
    ];
    expect(() => measure(ambiguous)).toThrow(
      /2 distinct @font-face families declare that payload/,
    );

    // A declared face pointing somewhere else backs nothing.
    const detached = clone();
    aliasFace(detached).sources = ['/_next/static/media/not-delivered.woff2'];
    expect(() => measure(detached)).toThrow(
      /distinct @font-face families declare that payload \(none\)/,
    );

    // A registered family whose runtime name no face declares would resolve
    // to a fallback on every element that names it.
    const unloaded = clone();
    for (const face of facesFor(unloaded, 'Newsreader')) {
      face.family = 'Newsreader Unloaded';
    }
    expect(() => measure(unloaded)).toThrow(
      /which no observed @font-face declares, so every element naming it falls back/,
    );

    const unreadable = clone();
    unreadable.unreadableStyleSheets = ['https://cdn.example/theme.css'];
    expect(() => measure(unreadable)).toThrow(
      /could not read 1 stylesheet\(s\)/,
    );
  });

  /**
   * Font discovery used to accept a Resource Timing entry whose
   * `initiatorType` was `font` or whose URL ended in `.woff2`, `.ttf` or
   * `.otf`. The browser reports a CSS `@font-face` load with a `css`
   * initiator, so the extension was the only discriminator, and an
   * extensionless third-party URL matched neither branch: it was invisible
   * while the local WOFF2 requests kept the non-empty floor green. These are
   * the records that has to reject now.
   */
  /**
   * A URL is not an observation.
   *
   * The capture used to hold one record per URL and the reader used to treat
   * a repeated URL as a duplicate row, so two responses to one extensionless
   * URL could only ever be published as one fact — and the sweep resolved
   * that fact by unioning the two responses' signals, which let a supported
   * non-font container answer for an ambiguous payload that arrived later.
   * The row identity is now the whole observation, so the two transactions
   * survive as two rows and each has to re-derive as a font by itself, while
   * a genuinely repeated row is still rejected.
   */
  it('keeps two differing observations of one URL apart and still rejects a repeated row', () => {
    const base = clone();
    const [first] = base.fontResources.fontRequests;
    const differing = clone();
    differing.fontResources.fontRequests = [
      ...differing.fontResources.fontRequests,
      // Same path, a second delivery whose bytes are not the first's. Both
      // show a font on their own, so both are admissible.
      { ...first, sha256: 'a'.repeat(64) },
    ];
    expect(() => measure(differing)).not.toThrow();

    const repeated = clone();
    repeated.fontResources.fontRequests = [
      ...repeated.fontResources.fontRequests,
      { ...first },
    ];
    expect(() => measure(repeated)).toThrow(
      new RegExp(
        `repeats the font request ${first.url.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}`,
      ),
    );

    // Two observations of one URL are one same-origin path, not two: the
    // published set is a set.
    const shadowed = clone();
    shadowed.fontResources.fontRequests = [
      ...shadowed.fontResources.fontRequests,
      { ...first, contentTypes: ['application/octet-stream'] },
    ];
    expect(() => measure(shadowed)).not.toThrow();
  });

  it('rejects a third-party font request identified only by its payload', () => {
    const extensionless = clone();
    extensionless.fontResources.fontRequests = [
      ...extensionless.fontResources.fontRequests,
      {
        url: 'https://cdn.example/f?id=plex',
        origin: 'foreign',
        // Neither a font extension nor a font resource type nor a font
        // response type: only the four bytes that came back.
        resourceTypes: ['other'],
        contentTypes: ['application/octet-stream'],
        payloadSignature: '774f4632',
        sha256: 'f'.repeat(64),
      },
    ];
    expect(() => measure(extensionless)).toThrow(
      /came from another origin: https:\/\/cdn\.example\/f\?id=plex \(WOFF2 payload, served as application\/octet-stream\)/,
    );

    const declaredType = clone();
    declaredType.fontResources.fontRequests = [
      ...declaredType.fontResources.fontRequests,
      {
        url: 'https://fonts.gstatic.com/s/tektur/v1/asset',
        origin: 'foreign',
        resourceTypes: ['stylesheet'],
        contentTypes: ['font/woff2'],
        payloadSignature: '',
        sha256: 'e'.repeat(64),
      },
    ];
    expect(() => measure(declaredType)).toThrow(/came from another origin/);

    // A row recorded as a font resource that the record does not show to be
    // one: the artifact may not simply assert the classification.
    const unproven = clone();
    unproven.fontResources.fontRequests = [
      ...unproven.fontResources.fontRequests,
      {
        url: '/_next/static/media/mystery',
        origin: 'same',
        resourceTypes: ['other'],
        contentTypes: ['text/plain'],
        payloadSignature: 'deadbeef',
        sha256: 'd'.repeat(64),
      },
    ];
    expect(() => measure(unproven)).toThrow(
      /do not show a font|the captured requests are/,
    );

    const undecided = clone();
    undecided.fontResources.unclassifiedRequests = [
      'https://cdn.example/f?id=plex (foreign-origin, request types [other], response types [], payload unreadable: Error)',
    ];
    expect(() => measure(undecided)).toThrow(
      /could not classify 1 request\(s\), so it cannot claim they carried no font/,
    );

    const emptyCapture = clone();
    emptyCapture.fontResources.fontRequests = [];
    expect(() => measure(emptyCapture)).toThrow(
      /captured no font request at all|the captured requests are/,
    );
  });

  it('rejects a delivery record that hides a third-party request or a fallback glyph', () => {
    const foreign = clone();
    foreign.fontResources.foreignOrigin = [
      'https://fonts.gstatic.com/s/tektur/v1/tektur.woff2',
    ];
    expect(() => measure(foreign)).toThrow(/third-party font requests/);

    const mixing = clone();
    mixing.fontResources.observationsMixingForeignOrigin = 1;
    expect(() => measure(mixing)).toThrow(/requested a font from another origin/);

    // The published path set is derived from the captured rows, so a summary
    // edited on its own cannot disagree with the capture.
    const trimmedSummary = clone();
    trimmedSummary.fontResources.sameOriginPaths =
      trimmedSummary.fontResources.sameOriginPaths.slice(1);
    expect(() => measure(trimmedSummary)).toThrow(
      /lists the same-origin font paths/,
    );

    // Delivery of the registered binary is identified by payload checksum,
    // not by a `/_next/static/media/*.woff2` URL shape.
    const noBundle = clone();
    for (const row of noBundle.fontResources.fontRequests) {
      if (row.sha256 === TEKTUR_FONT_METADATA.web.sha256) {
        row.sha256 = 'a'.repeat(64);
      }
    }
    expect(() => measure(noBundle)).toThrow(
      /No captured same-origin font request delivered/,
    );

    const offBundle = clone();
    const bundled = registeredWebRequest(offBundle);
    const bundledFace = aliasFace(offBundle);
    bundledFace.sources = bundledFace.sources.map((source) =>
      source === bundled.url ? '/vendor/tektur.woff2' : source,
    );
    bundled.url = '/vendor/tektur.woff2';
    offBundle.fontResources.sameOriginPaths = [
      ...offBundle.fontResources.sameOriginPaths.filter(
        (path) => path !== registeredWebRequest(clone()).url,
      ),
      '/vendor/tektur.woff2',
    ].sort();
    expect(() => measure(offBundle)).toThrow(
      /none of it from the framework's bundled asset path/,
    );

    // The offline OG binary is caught by its bytes, so a renamed copy is the
    // same leak.
    const ogLeak = clone();
    ogLeak.fontResources.fontRequests = [
      ...ogLeak.fontResources.fontRequests,
      {
        url: '/_next/static/media/display-face',
        origin: 'same',
        resourceTypes: ['font'],
        contentTypes: ['font/ttf'],
        payloadSignature: '00010000',
        sha256: TEKTUR_FONT_METADATA.og.sha256,
      },
    ];
    ogLeak.fontResources.sameOriginPaths = [
      ...ogLeak.fontResources.sameOriginPaths,
      '/_next/static/media/display-face',
    ].sort();
    expect(() => measure(ogLeak)).toThrow(/requested the offline OG binary/);

    const noRequests = clone();
    noRequests.fontResources.observationsWithFontRequest = 0;
    expect(() => measure(noRequests)).toThrow(/route states requesting a font/);

    const driftedWordmark = clone();
    driftedWordmark.delivery.wordmark.weight = '400';
    expect(() => measure(driftedWordmark)).toThrow(/the registry records wght/);

    const fallbackGlyph = clone();
    fallbackGlyph.assignedStringProbes[0].fallbackAdvance =
      fallbackGlyph.assignedStringProbes[0].tekturAdvance;
    expect(() => measure(fallbackGlyph)).toThrow(
      /the same .* advance in Tektur and in the generic fallback/,
    );

    const unloadedGlyph = clone();
    unloadedGlyph.assignedStringProbes[1].loaded = false;
    expect(() => measure(unloadedGlyph)).toThrow(/is not fully loaded/);

    const shortProbes = clone();
    shortProbes.assignedStringProbes = shortProbes.assignedStringProbes.slice(
      0,
      -1,
    );
    expect(() => measure(shortProbes)).toThrow(/probed \d+ assigned strings/);
  });
});

/**
 * The capture-side classifier, which decides what reaches `fontRequests` and
 * `unclassifiedRequests` in the first place.
 *
 * A reader that rejects a third-party font row can only reject rows it is
 * given. The defect these gates exist for: the classifier consulted the
 * payload first and returned as soon as a body had been read, so a readable
 * response whose signature it did not recognize was a *decided* non-font
 * before the response type or the browser's font destination was consulted.
 * A prohibited third-party `@font-face` request answered with a corrupt
 * payload, an unsupported container or an error page was omitted from both
 * lists and vanished.
 */
describe('brand-v2 captured request classification', () => {
  const corrupt = '3c21646f'; // `<!do`, a readable payload in no font table
  const base = {
    resourceTypes: ['other'],
    contentTypes: [] as string[],
    payloadSignature: null as string | null,
    responded: true,
    origin: 'foreign' as const,
  };

  it('treats each of the three positive signals as independently sufficient', () => {
    expect(corrupt in FONT_PAYLOAD_SIGNATURES).toBe(false);

    const byDestination = classifyCapturedRequest({
      ...base,
      resourceTypes: ['font'],
      contentTypes: ['application/octet-stream'],
      payloadSignature: corrupt,
    });
    expect(byDestination.isFont).toBe(true);
    expect(byDestination.classified).toBe(true);
    expect(byDestination.basis).toBe('browser font request destination');

    const byContentType = classifyCapturedRequest({
      ...base,
      resourceTypes: ['fetch'],
      contentTypes: ['font/woff2'],
      payloadSignature: corrupt,
    });
    expect(byContentType.isFont).toBe(true);
    expect(byContentType.basis).toBe('response type font/woff2');

    const byPayload = classifyCapturedRequest({
      ...base,
      resourceTypes: ['fetch'],
      contentTypes: ['application/octet-stream'],
      payloadSignature: '774f4632',
    });
    expect(byPayload.isFont).toBe(true);
    expect(byPayload.basis).toBe('payload signature 0x774f4632 (WOFF2)');

    // An error page answering an @font-face request is still a font request.
    const errorPayload = classifyCapturedRequest({
      ...base,
      resourceTypes: ['font'],
      contentTypes: ['text/html'],
      payloadSignature: corrupt,
    });
    expect(errorPayload.isFont).toBe(true);
    expect(errorPayload.basis).toBe('browser font request destination');

    // And the union reports every signal that fired, not just the first.
    const all = classifyCapturedRequest({
      ...base,
      resourceTypes: ['font'],
      contentTypes: ['font/woff2'],
      payloadSignature: '774f4632',
    });
    expect(all.basis).toBe(
      'payload signature 0x774f4632 (WOFF2) + response type font/woff2 + browser font request destination',
    );
  });

  it('decides a non-font only from a supported negative signal', () => {
    // A container magic that is positively something else. The signature
    // table is the mirror of the font one, so this is an identification
    // rather than a failure to match.
    const identifiedContainer = classifyCapturedRequest({
      ...base,
      resourceTypes: ['image'],
      contentTypes: ['application/octet-stream'],
      payloadSignature: '47494638',
    });
    expect(identifiedContainer.isFont).toBe(false);
    expect(identifiedContainer.classified).toBe(true);
    expect(identifiedContainer.basis).toBe(
      'payload signature 0x47494638 (GIF)',
    );

    const declaredNonFont = classifyCapturedRequest({
      ...base,
      resourceTypes: ['document'],
      contentTypes: ['text/html'],
    });
    expect(declaredNonFont).toEqual({
      isFont: false,
      classified: true,
      basis: 'response type text/html',
    });

    const abortedSameOrigin = classifyCapturedRequest({
      ...base,
      origin: 'same',
      resourceTypes: ['fetch'],
      responded: false,
    });
    expect(abortedSameOrigin).toEqual({
      isFont: false,
      classified: true,
      basis: 'no response payload',
    });
  });

  it('leaves an undecidable request unclassified so it fails closed', () => {
    const unreadable = classifyCapturedRequest({
      ...base,
      resourceTypes: ['fetch'],
      responded: false,
    });
    expect(unreadable.classified).toBe(false);
    expect(unreadable.isFont).toBe(false);

    // The case this gate exists for, and the one an earlier expectation here
    // locked in the wrong way round: an extensionless foreign request whose
    // body arrives corrupt or in an unsupported container, under a type that
    // settles nothing and to a destination that is not `font`. No positive
    // signal fired, and no negative one did either.
    const corruptUnderAmbiguousType = classifyCapturedRequest({
      ...base,
      resourceTypes: ['fetch'],
      contentTypes: ['application/octet-stream'],
      payloadSignature: corrupt,
    });
    expect(corruptUnderAmbiguousType.classified).toBe(false);
    expect(corruptUnderAmbiguousType.isFont).toBe(false);
    expect(nonFontPayloadFormat(corrupt)).toBeNull();

    // Same shape with no declared type at all, and with bytes that are not
    // even text: a truncated or unsupported font container.
    const unsupportedContainer = classifyCapturedRequest({
      ...base,
      resourceTypes: ['other'],
      payloadSignature: 'deadbeef',
    });
    expect(unsupportedContainer.classified).toBe(false);

    // A recognized non-font container under the same ambiguous type is
    // decided, so the negative branch is reachable and this is not a rule
    // that makes every unrecognized byte string unclassified by accident.
    expect(
      classifyCapturedRequest({
        ...base,
        resourceTypes: ['fetch'],
        contentTypes: ['application/octet-stream'],
        payloadSignature: '0061736d',
      }).classified,
    ).toBe(true);

    const ambiguousType = classifyCapturedRequest({
      ...base,
      resourceTypes: ['other'],
      contentTypes: ['application/octet-stream'],
    });
    expect(ambiguousType.classified).toBe(false);

    // A mixed set is only decided when every observed type settles it.
    const mixed = classifyCapturedRequest({
      ...base,
      resourceTypes: ['other'],
      contentTypes: ['text/html', 'application/octet-stream'],
    });
    expect(mixed.classified).toBe(false);

    // And the reader refuses an artifact carrying an undecided request, so
    // "unclassified" is a failure rather than a note.
    const undecided = clone();
    undecided.fontResources.unclassifiedRequests = [
      'https://cdn.example/f (foreign-origin, request types [other], response types [])',
    ];
    expect(() => measure(undecided)).toThrow(/could not classify 1 request/);
  });
});
