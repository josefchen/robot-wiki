import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TEKTUR_ASSERTION_MODES,
  TEKTUR_DELIVERY_EVIDENCE_PATH,
  measureTekturEvidence,
  tekturAssertionEvidence,
  type TekturDeliveryEvidence,
} from '../../lib/brand-v2-tektur-evidence';
import { FIRST_PARTY_TYPE_ROLES } from '../../data/type-roles';

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
      /records no font-family head set/,
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

  it('rejects a delivery record that hides a third-party request or a fallback glyph', () => {
    const foreign = clone();
    foreign.fontResources.foreignOrigin = [
      'https://fonts.gstatic.com/s/tektur/v1/tektur.woff2',
    ];
    expect(() => measure(foreign)).toThrow(/third-party font requests/);

    const mixing = clone();
    mixing.fontResources.observationsMixingForeignOrigin = 1;
    expect(() => measure(mixing)).toThrow(/requested a font from another origin/);

    const noBundle = clone();
    noBundle.fontResources.sameOriginPaths =
      noBundle.fontResources.sameOriginPaths.filter(
        (path) => !/\.woff2$/i.test(path),
      );
    expect(() => measure(noBundle)).toThrow(
      /none is a framework-bundled WOFF2|no same-origin font resource/,
    );

    const ogLeak = clone();
    ogLeak.fontResources.sameOriginPaths = [
      ...ogLeak.fontResources.sameOriginPaths,
      '/_next/static/media/Tektur-SemiBold.ttf',
    ];
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
