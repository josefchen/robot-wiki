import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CROSS_MOUNT_INPUT,
  FEATURED_INSTRUMENT_ANCHORS,
  HOME_TOOLS_EVIDENCE_PATH,
  HOME_TOOLS_VIEWPORT,
  accessibilityProfileVerdicts,
  crossMountVerdicts,
  expectedEpisodeSuccessPercent,
  featuredInstrumentVerdicts,
  homeDesignBoundVerdicts,
  homeToolsEvidenceFingerprint,
  playgroundEntryVerdicts,
  progressCounterVerdicts,
  readHomeToolsEvidence,
  readoutPercent,
  requiredSweepWidths,
  responsiveOverflowVerdicts,
  type HomeToolsEvidence,
} from '@/lib/brand-v2-home-tools-evidence';
import { progressCounterSurfaces } from '@/lib/home-populations';
import { so101DerivedFigures, so101Preview } from '@/lib/so101-kinematics';

const ROOT = process.cwd();

const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract/brand-v2-registries.json'), 'utf8'),
) as { routes: { public: Array<{ id: string; path: string }> } };

function fingerprint(): string {
  return homeToolsEvidenceFingerprint({
    root: ROOT,
    routeIds: REGISTRY.routes.public.map(({ id }) => id),
  });
}

function committed(): HomeToolsEvidence {
  return JSON.parse(
    readFileSync(join(ROOT, HOME_TOOLS_EVIDENCE_PATH), 'utf8'),
  ) as HomeToolsEvidence;
}

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(
  change: (evidence: HomeToolsEvidence) => void,
): HomeToolsEvidence {
  const copy = JSON.parse(JSON.stringify(committed())) as HomeToolsEvidence;
  change(copy);
  return copy;
}

function accept(evidence: HomeToolsEvidence): HomeToolsEvidence {
  return readHomeToolsEvidence({ artifact: evidence, fingerprint: fingerprint() });
}

describe('home tools evidence', () => {
  it('accepts the committed sweep for the tree it was measured against', () => {
    const evidence = accept(committed());
    expect(evidence.route).toBe('/');
    expect(evidence.viewport).toBe(HOME_TOOLS_VIEWPORT.id);
    expect(
      featuredInstrumentVerdicts(evidence).map(({ id }) => id),
    ).toEqual([...FEATURED_INSTRUMENT_ANCHORS]);
    expect(
      featuredInstrumentVerdicts(evidence).flatMap(({ failures }) => failures),
    ).toEqual([]);
    expect(
      crossMountVerdicts(evidence).flatMap(({ failures }) => failures),
    ).toEqual([]);
    expect(
      accessibilityProfileVerdicts(evidence).flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);
    expect(
      homeDesignBoundVerdicts(evidence).flatMap(({ failures }) => failures),
    ).toEqual([]);
    expect(
      progressCounterVerdicts(evidence, progressCounterSurfaces()).flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);
  });

  it('measures every public route at every declared width', () => {
    const evidence = accept(committed());
    const widths = requiredSweepWidths();
    expect(widths.length).toBeGreaterThanOrEqual(4);
    const verdicts = responsiveOverflowVerdicts(
      evidence,
      REGISTRY.routes.public,
    );
    expect(verdicts).toHaveLength(REGISTRY.routes.public.length);
    expect(verdicts.flatMap(({ failures }) => failures)).toEqual([]);
    expect(evidence.responsive).toHaveLength(
      REGISTRY.routes.public.length * widths.length,
    );
  });

  it('refuses stale, incomplete, and unmeasured home tool evidence', () => {
    const current = fingerprint();
    expect(() =>
      readHomeToolsEvidence({ artifact: null, fingerprint: current }),
    ).toThrow(/not an object/);
    expect(() =>
      readHomeToolsEvidence({
        artifact: { ...committed(), version: 2 },
        fingerprint: current,
      }),
    ).toThrow(/version 2 is not 1/);
    expect(() =>
      readHomeToolsEvidence({ artifact: committed(), fingerprint: 'other' }),
    ).toThrow(/stale/);
    expect(() => accept(mutate((e) => (e.route = '/playground/')))).toThrow(
      /covers \/playground\//,
    );
    expect(() => accept(mutate((e) => (e.viewport = '375x812')))).toThrow(
      /swept at 375x812/,
    );
    expect(() => accept(mutate((e) => (e.responsive = [])))).toThrow(
      /no responsive measurement/,
    );
    expect(() => accept(mutate((e) => (e.siblingMounts = [])))).toThrow(
      /no sibling mount/,
    );
    expect(() =>
      accept(mutate((e) => (e.playground.graphics = []))),
    ).toThrow(/no graphic in the playground/);
    expect(() => accept(mutate((e) => (e.accessibility = [])))).toThrow(
      /no accessibility profile/,
    );
    expect(() => accept(mutate((e) => (e.progressCounters = [])))).toThrow(
      /swept no route for progress counters/,
    );
  });

  it('fails a route the sweep left at fewer than the declared widths', () => {
    const widths = requiredSweepWidths();
    const dropped = mutate((evidence) => {
      evidence.responsive = evidence.responsive.filter(
        (row) => !(row.route === '/' && row.width === widths[0]),
      );
    });
    const verdicts = responsiveOverflowVerdicts(
      accept(dropped),
      REGISTRY.routes.public,
    );
    const failing = verdicts.filter(({ failures }) => failures.length > 0);
    expect(failing.map(({ id }) => id)).toEqual(['route:/']);
    expect(failing[0].failures.join(' ')).toMatch(/not the declared/);

    const overflowed = mutate((evidence) => {
      const row = evidence.responsive.find((entry) => entry.route === '/')!;
      row.documentScrollWidthPx = row.documentClientWidthPx + 17;
    });
    expect(
      responsiveOverflowVerdicts(accept(overflowed), REGISTRY.routes.public)
        .filter(({ failures }) => failures.length > 0)
        .map(({ id }) => id),
    ).toEqual(['route:/']);

    expect(() => responsiveOverflowVerdicts(accept(committed()), [])).toThrow(
      /quantify over nothing/,
    );
  });

  it('fails an instrument that stops computing, resetting, or being reachable', () => {
    const failing = (change: (evidence: HomeToolsEvidence) => void) =>
      featuredInstrumentVerdicts(accept(mutate(change)))
        .filter(({ failures }) => failures.length > 0)
        .map(({ id }) => id);

    expect(failing((e) => (e.featured.graphicTopPx = 1201))).toEqual([
      'anchor:featured-reachable-in-one-scroll',
    ]);
    expect(failing((e) => (e.featured.resetReadout = '1.0%'))).toEqual([
      'anchor:featured-deterministic-reset',
    ]);
    expect(failing((e) => (e.featured.focusOutlineWidthPx = 0))).toEqual([
      'anchor:featured-visible-focus',
    ]);
    expect(failing((e) => (e.featured.drivenReadout = '42.0%'))).toEqual([
      'anchor:featured-no-fabricated-telemetry',
    ]);
    expect(
      failing((e) => (e.featured.keyboardDrivenReadout = e.featured.initialReadout)),
    ).toEqual(['anchor:featured-keyboard-operable']);
  });

  it('fails a mount that drifts from the one home features', () => {
    const drifted = mutate((evidence) => {
      evidence.siblingMounts[0].drivenReadout = '77.7%';
    });
    const verdicts = crossMountVerdicts(accept(drifted));
    expect(verdicts.filter(({ failures }) => failures.length > 0)).toHaveLength(
      1,
    );
    expect(verdicts[0].failures.join(' ')).toMatch(
      new RegExp(`${CROSS_MOUNT_INPUT.steps} steps`),
    );
  });

  it('fails a corresponding mount that opens on different state from home', () => {
    const home = committed().featured;
    const drifted = mutate((evidence) => {
      // A sibling nobody has to unlock is a second presentation of the same
      // instrument: it reseeds itself to a shorter episode, which is a
      // different starting state and a different reset for the same tool.
      const sibling = evidence.siblingMounts.find(
        (mount) => mount.revealedByControls.length === 0,
      )!;
      for (const sliders of [sibling.initialSliders, sibling.resetSliders]) {
        const steps = sliders.find(({ accessibleName }) =>
          /episode length/i.test(accessibleName),
        )!;
        steps.value = 14;
      }
      sibling.initialReadout = '48.8%';
      sibling.resetReadout = '48.8%';
      sibling.secondResetReadout = '48.8%';
    });
    const failing = crossMountVerdicts(accept(drifted)).filter(
      ({ failures }) => failures.length > 0,
    );
    expect(failing).toHaveLength(1);
    const reported = failing[0].failures.join(' ');
    expect(reported).toMatch(/opens at 95% per step over 14 steps/);
    expect(reported).toContain(`where home opens reading ${home.initialReadout}`);
  });

  it('holds a disclosure-gated seed to the model without forcing home defaults on it', () => {
    // A commit-to-reveal panel seeds the instrument to the figure its own
    // prose commits to, so it is exempt from opening on home's defaults.
    // The exemption is not a hole: the seed still has to print what the
    // shared model computes from the inputs it was seeded with.
    const seeded = mutate((evidence) => {
      const mount = evidence.siblingMounts[0];
      mount.revealedByControls = ['Read the reasoning'];
      const steps = mount.initialSliders.find(({ accessibleName }) =>
        /episode length/i.test(accessibleName),
      )!;
      steps.value = 14;
      mount.initialReadout = '48.8%';
      mount.resetReadout = '48.8%';
      mount.secondResetReadout = '48.8%';
      const resetSteps = mount.resetSliders.find(({ accessibleName }) =>
        /episode length/i.test(accessibleName),
      )!;
      resetSteps.value = 14;
    });
    expect(
      crossMountVerdicts(accept(seeded)).flatMap(({ failures }) => failures),
    ).toEqual([]);
    expect(
      crossMountVerdicts(accept(seeded))[0].observed.initialStateComparedToHome,
    ).toBe(false);

    const fabricated = mutate((evidence) => {
      const mount = evidence.siblingMounts[0];
      mount.revealedByControls = ['Read the reasoning'];
      mount.initialReadout = '90.0%';
      mount.resetReadout = '90.0%';
      mount.secondResetReadout = '90.0%';
    });
    const failing = crossMountVerdicts(accept(fabricated)).filter(
      ({ failures }) => failures.length > 0,
    );
    expect(failing).toHaveLength(1);
    expect(failing[0].failures.join(' ')).toMatch(
      /opens reading 90.0% where the shared model predicts/,
    );
  });

  it('refuses a population where every sibling has been exempted', () => {
    const allGated = mutate((evidence) => {
      for (const mount of evidence.siblingMounts) {
        mount.revealedByControls = ['Read the reasoning'];
      }
    });
    expect(
      crossMountVerdicts(accept(allGated))
        .flatMap(({ failures }) => failures)
        .join(' '),
    ).toMatch(/no mount is left to compare/);
  });

  it('checks the readout home opens on against the model too', () => {
    // Reset follows the planted opening state, so the mount stays
    // internally consistent and only the model comparison can fail.
    const fabricated = mutate((evidence) => {
      evidence.featured.initialReadout = '99.9%';
      evidence.featured.resetReadout = '99.9%';
      evidence.featured.secondResetReadout = '99.9%';
    });
    expect(
      featuredInstrumentVerdicts(accept(fabricated))
        .filter(({ failures }) => failures.length > 0)
        .map(({ id }) => id),
    ).toEqual(['anchor:featured-no-fabricated-telemetry']);
  });

  it('fails a preview that stops being bound to the shipped model', () => {
    const evidence = accept(committed());
    const preview = so101Preview();
    const figures = so101DerivedFigures(preview.chain);
    const numbers = [
      preview.chain.length,
      preview.geometry.scaleBar.labelMm,
      figures.reachMm,
      figures.wristHeightMm,
      figures.widestTravelDeg,
      figures.narrowestTravelDeg,
      ...preview.chain.flatMap((joint) => [
        joint.lowerDeg,
        joint.upperDeg,
        joint.travelDeg,
      ]),
    ];
    expect(
      playgroundEntryVerdicts(evidence, {
        description: preview.description,
        numbers,
      }).flatMap(({ failures }) => failures),
    ).toEqual([]);
    expect(
      playgroundEntryVerdicts(evidence, {
        description: 'An arm, drawn for illustration.',
        numbers,
      })
        .filter(({ failures }) => failures.length > 0)
        .map(({ id }) => id),
    ).toEqual(['anchor:playground-entry-textual-alternative']);
  });

  it('recomputes the readout the instrument prints instead of trusting it', () => {
    expect(expectedEpisodeSuccessPercent(95, 20)).toBeCloseTo(35.85, 2);
    expect(expectedEpisodeSuccessPercent(100, 30)).toBe(100);
    expect(readoutPercent('35.8%')).toBe(35.8);
    expect(readoutPercent('no number here')).toBeNull();
  });

  it('fails a design bound and only the bound that moved', () => {
    const failing = (change: (evidence: HomeToolsEvidence) => void) =>
      homeDesignBoundVerdicts(accept(mutate(change)))
        .filter(({ failures }) => failures.length > 0)
        .map(({ id }) => id);
    expect(
      failing((e) => {
        e.designBounds.microLabels = Array.from({ length: 6 }, (_, index) => ({
          text: `LABEL ${index}`,
          fontSizePx: 11,
          family: 'IBM Plex Mono',
        }));
      }),
    ).toEqual(['bound:home-micro-labels']);
    expect(
      failing((e) => (e.designBounds.chartDisclosureSummary!.borderTopWidthPx = 1)),
    ).toEqual(['bound:home-chart-disclosure-summary']);
    expect(
      failing((e) => e.designBounds.axeViolationIds.push('color-contrast')),
    ).toEqual(['bound:home-zero-axe-and-console']);
  });

  it('fails a surface that prints an authoring counter or a count the registry denies', () => {
    const surfaces = progressCounterSurfaces();
    const planted = mutate((evidence) => {
      evidence.progressCounters[0].matches.push('3 of 12 articles');
      evidence.progressCounters[1].reconciledCounts.push({
        text: '99 articles',
        expected: 6,
        actual: 99,
      });
    });
    const verdicts = progressCounterVerdicts(accept(planted), surfaces);
    const failing = verdicts.filter(({ failures }) => failures.length > 0);
    expect(failing).toHaveLength(2);
    expect(failing[0].failures.join(' ')).toMatch(/3 of 12 articles/);
    expect(failing[1].failures.join(' ')).toMatch(/registry holds 6/);
    expect(() => progressCounterVerdicts(accept(committed()), [])).toThrow(
      /quantify over nothing/,
    );
  });

  it('fails an accessibility profile that measured nothing', () => {
    const planted = mutate((evidence) => {
      evidence.accessibility[0].measuredMembers = 0;
    });
    const failing = accessibilityProfileVerdicts(accept(planted)).filter(
      ({ failures }) => failures.length > 0,
    );
    expect(failing).toHaveLength(1);
    expect(failing[0].failures.join(' ')).toMatch(/measured no member/);
  });
});
