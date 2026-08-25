import { describe, expect, it } from 'vitest';
import {
  BRAND_V2_REFERENCE_RUBRIC,
  evaluateReferenceFeatures,
  parseReferenceComparisonPayload,
  reconcileResponsiveDeviceCounts,
  type ReferenceFeatureMeasurements,
} from '@/lib/brand-v2-reference-rubric';

function passingMeasurements(): ReferenceFeatureMeasurements {
  return {
    surfaceKind: 'home',
    viewport: { width: 1440, height: 900 },
    identity: {
      publicName: 'Robot Wiki',
      descriptor: 'Citation-first encyclopedia of modern robot learning.',
      descriptorRequired: true,
      webDisplayFamily: 'Tektur Variable',
      ogStaticRoleMatched: true,
      alternateSymbolCount: 0,
      v1IdentityCount: 0,
    },
    hierarchy: {
      primarySizePx: 96,
      supportingSizePx: 60,
      bodySizePx: 20,
      primaryLineCount: 2,
    },
    gridAndDevices: {
      registeredCount: 2,
      unregisteredCount: 0,
      maximumAlignmentErrorPx: 2,
      missingPurposeCount: 0,
      missingOwnerCount: 0,
      maximumDominantMotifsPerSection: 1,
      mobileDeviceCount: 0,
      desktopDeviceCount: 2,
      obscuringCount: 0,
      inputInterceptingCount: 0,
    },
    lightDarkBalance: {
      bodyIsLight: true,
      shellIsLight: true,
      proseIsLight: true,
      darkNonActionAreaPx2: 300_000,
      firstViewportAreaPx2: 1_296_000,
      unregisteredDarkSurfaceCount: 0,
      shellOrProseIntersectionCount: 0,
    },
    repetitionAndFrames: {
      registeredPopulationCount: 2,
      maximumAdjacentRepeatedSignatures: 3,
      redundantNestedFourSidedFrameCount: 0,
      maximumFrameDepth: 2,
      unregisteredDepthTwoCount: 0,
    },
    paletteAndType: {
      auditedColourCount: 7,
      matchingColourCount: 7,
      auditedTypeRoleCount: 30,
      matchingTypeRoleCount: 30,
      unregisteredRoleCount: 0,
      fallbackGlyphCount: 0,
    },
    materialTreatment: {
      registeredRepresentativeCount: 1,
      deterministicCount: 1,
      contrastPassingCount: 1,
      provenanceCompleteCount: 1,
      externalRepresentativeCount: 1,
      proseElementResolved: true,
      proseTextureIntersectionCount: 0,
    },
  };
}

describe('brand-v2 reference-feature rubric', () => {
  it('checks in the sealed literals and rejects cross-composition pixel scoring', () => {
    expect(BRAND_V2_REFERENCE_RUBRIC.version).toBe(1);
    expect(BRAND_V2_REFERENCE_RUBRIC.contractLiterals).toMatchObject({
      publicIdentity: 'Robot Wiki',
      descriptor: 'Citation-first encyclopedia of modern robot learning.',
      highlight: '#C6FF19',
      signal: '#245FFF',
    });
    expect(BRAND_V2_REFERENCE_RUBRIC.comparisonPolicy).toEqual({
      crossComposition: 'feature-anchors-only',
      deterministicSameInput: 'pixel-or-byte-equality-allowed',
      averaging: 'prohibited',
    });
  });

  it('passes only when every applicable anchor passes independently', () => {
    const report = evaluateReferenceFeatures(passingMeasurements());
    expect(report.passed).toBe(true);
    expect(report.anchors).toHaveLength(8);
    expect(report.anchors.every(({ passed }) => passed)).toBe(true);

    const failing = passingMeasurements();
    failing.hierarchy.primarySizePx = 89;
    const failedReport = evaluateReferenceFeatures(failing);
    expect(failedReport.passed).toBe(false);
    expect(
      failedReport.anchors.find(({ id }) => id === 'hierarchy'),
    ).toMatchObject({ passed: false });
    expect(
      failedReport.anchors.filter(({ passed }) => !passed),
    ).toHaveLength(1);
  });

  it('applies the surface-specific dark-area threshold without averaging it away', () => {
    const home = passingMeasurements();
    home.lightDarkBalance.darkNonActionAreaPx2 =
      home.lightDarkBalance.firstViewportAreaPx2 * 0.41;
    expect(
      evaluateReferenceFeatures(home).anchors.find(
        ({ id }) => id === 'light-dark-balance',
      )?.passed,
    ).toBe(false);

    const playground = passingMeasurements();
    playground.surfaceKind = 'playground';
    playground.lightDarkBalance.darkNonActionAreaPx2 =
      playground.lightDarkBalance.firstViewportAreaPx2 * 0.74;
    expect(
      evaluateReferenceFeatures(playground).anchors.find(
        ({ id }) => id === 'light-dark-balance',
      )?.passed,
    ).toBe(true);
  });

  it('requires registry-backed qualitative predicates', () => {
    const measurements = passingMeasurements();
    measurements.gridAndDevices.missingPurposeCount = 1;
    measurements.materialTreatment.provenanceCompleteCount = 0;
    const report = evaluateReferenceFeatures(measurements);
    expect(
      report.anchors.find(({ id }) => id === 'purposeful-devices')?.passed,
    ).toBe(false);
    expect(
      report.anchors.find(({ id }) => id === 'material-treatment')?.passed,
    ).toBe(false);
  });

  it('fails repetition and frames when its annotated population is empty', () => {
    const measurements = passingMeasurements();
    measurements.repetitionAndFrames.registeredPopulationCount = 0;
    const anchor = evaluateReferenceFeatures(measurements).anchors.find(
      ({ id }) => id === 'repetition-frames',
    );
    expect(anchor?.passed).toBe(false);
    expect(
      anchor?.predicates.find(({ id }) => id === 'registered-population'),
    ).toMatchObject({ expected: '>0', actual: 0, passed: false });
  });

  it('reconciles responsive device counts from two live viewport measurements', () => {
    const desktop = passingMeasurements();
    desktop.viewport.width = 1440;
    desktop.gridAndDevices.registeredCount = 2;
    desktop.gridAndDevices.mobileDeviceCount = 2;
    desktop.gridAndDevices.desktopDeviceCount = 2;

    const mobile = passingMeasurements();
    mobile.viewport.width = 375;
    mobile.gridAndDevices.registeredCount = 3;
    mobile.gridAndDevices.mobileDeviceCount = 3;
    mobile.gridAndDevices.desktopDeviceCount = 3;

    const reconciled = reconcileResponsiveDeviceCounts(desktop, mobile);
    expect(reconciled.gridAndDevices).toMatchObject({
      mobileDeviceCount: 3,
      desktopDeviceCount: 2,
    });
    expect(
      evaluateReferenceFeatures(reconciled).anchors
        .find(({ id }) => id === 'purposeful-devices')
        ?.predicates.find(({ id }) => id === 'mobile-device-count'),
    ).toMatchObject({
      actual: { mobile: 3, desktop: 2 },
      passed: false,
    });
  });

  it('requires every audited type-role element to match its registered family', () => {
    const oneMismatch = passingMeasurements();
    oneMismatch.paletteAndType.matchingTypeRoleCount = 29;
    expect(
      evaluateReferenceFeatures(oneMismatch).anchors.find(
        ({ id }) => id === 'palette-type',
      )?.passed,
    ).toBe(false);

    const emptyPopulation = passingMeasurements();
    emptyPopulation.paletteAndType.auditedTypeRoleCount = 0;
    emptyPopulation.paletteAndType.matchingTypeRoleCount = 0;
    expect(
      evaluateReferenceFeatures(emptyPopulation).anchors.find(
        ({ id }) => id === 'palette-type',
      )?.passed,
    ).toBe(false);
  });

  it('fails material treatment for prose intersections and unresolved declared prose', () => {
    const intersection = passingMeasurements();
    intersection.materialTreatment.proseTextureIntersectionCount = 1;
    expect(
      evaluateReferenceFeatures(intersection).anchors.find(
        ({ id }) => id === 'material-treatment',
      )?.passed,
    ).toBe(false);

    const missingProse = passingMeasurements();
    missingProse.materialTreatment.proseElementResolved = false;
    expect(
      evaluateReferenceFeatures(missingProse).anchors.find(
        ({ id }) => id === 'material-treatment',
      )?.predicates.find(({ id }) => id === 'prose-element-resolved'),
    ).toMatchObject({ actual: false, passed: false });
  });

  it('rejects averaged, incomplete, or raw-pixel autonomous comparison payloads', () => {
    const report = evaluateReferenceFeatures(passingMeasurements());
    const payload = {
      kind: 'autonomous-reference-comparison',
      rubricVersion: 1,
      comparisonMode: 'feature-anchors-only',
      contractLiteralOverridesApplied: true,
      referenceIds: [
        'library/brand-reference-board.jpeg',
        'library/brand-reference-article.png',
      ],
      surfaceId: 'B2-EV-001',
      screenshotPaths: ['/tmp/home.png'],
      anchors: report.anchors,
      passed: true,
    };
    expect(parseReferenceComparisonPayload(payload)).toEqual(payload);
    expect(() =>
      parseReferenceComparisonPayload({
        ...payload,
        comparisonMode: 'raw-pixel-similarity',
      }),
    ).toThrow();
    expect(() =>
      parseReferenceComparisonPayload({
        ...payload,
        score: 0.97,
      }),
    ).toThrow();
    expect(() =>
      parseReferenceComparisonPayload({
        ...payload,
        anchors: payload.anchors.slice(1),
      }),
    ).toThrow();
  });
});
