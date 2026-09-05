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
import { readSeededMountRegistry } from '@/lib/brand-v2-seeded-mounts';
import { progressCounterSurfaces } from '@/lib/home-populations';
import { so101DerivedFigures, so101Preview } from '@/lib/so101-kinematics';

const ROOT = process.cwd();
const SEEDED_MOUNTS = readSeededMountRegistry(ROOT);

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
      crossMountVerdicts(evidence, SEEDED_MOUNTS).flatMap(
        ({ failures }) => failures,
      ),
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
    const verdicts = crossMountVerdicts(accept(drifted), SEEDED_MOUNTS);
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
      const declared = new Set(SEEDED_MOUNTS.map(({ mountId }) => mountId));
      const sibling = evidence.siblingMounts.find(
        (mount) => !declared.has(mount.mountId),
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
    const failing = crossMountVerdicts(accept(drifted), SEEDED_MOUNTS).filter(
      ({ failures }) => failures.length > 0,
    );
    expect(failing).toHaveLength(1);
    const reported = failing[0].failures.join(' ');
    expect(reported).toMatch(/opens at 95% per step over 14 steps/);
    expect(reported).toContain(`where home opens reading ${home.initialReadout}`);
  });

  it('holds a declared seed to the model without forcing home defaults on it', () => {
    // A commit-to-reveal panel seeds the instrument to the figure its own
    // published prose commits to, so it is exempt from opening on home's
    // defaults. The exemption is not a hole: the seed still has to print
    // what the shared model computes from the inputs it was seeded with.
    const evidence = accept(committed());
    const declaration = SEEDED_MOUNTS[0];
    const verdict = crossMountVerdicts(evidence, SEEDED_MOUNTS).find(
      ({ id }) => id === declaration.mountId,
    )!;
    expect(verdict.failures).toEqual([]);
    expect(verdict.observed.initialStateComparedToHome).toBe(false);
    expect(verdict.observed.seedDeclaration).toEqual({
      seededInputs: declaration.seededInputs,
      reason: declaration.reason,
      owner: declaration.owner,
    });

    const fabricated = mutate((row) => {
      const mount = row.siblingMounts.find(
        ({ mountId }) => mountId === declaration.mountId,
      )!;
      mount.initialReadout = '90.0%';
      mount.resetReadout = '90.0%';
      mount.secondResetReadout = '90.0%';
    });
    const failing = crossMountVerdicts(accept(fabricated), SEEDED_MOUNTS).filter(
      ({ failures }) => failures.length > 0,
    );
    expect(failing).toHaveLength(1);
    expect(failing[0].failures.join(' ')).toMatch(
      /opens reading 90.0% where the shared model predicts/,
    );
  });

  it('grants the seeded-state exemption by declaration and not by visibility', () => {
    // The input that used to pass. Being behind a disclosure was the whole
    // criterion, so a mount that reseeded itself and happened to sit inside
    // a `<details>` was exempt from opening on home's state for a reason
    // nobody had stated. Undeclared, the same mount now fails.
    const evidence = accept(committed());
    const declaration = SEEDED_MOUNTS[0];
    const gated = evidence.siblingMounts.find(
      ({ mountId }) => mountId === declaration.mountId,
    )!;
    expect(gated.revealedByControls.length).toBeGreaterThan(0);
    const undeclared = crossMountVerdicts(evidence, []).filter(
      ({ failures }) => failures.length > 0,
    );
    expect(undeclared.map(({ id }) => id)).toEqual([declaration.mountId]);
    expect(undeclared[0].failures.join(' ')).toMatch(
      /opens at 95% per step over 14 steps/,
    );

    // A declaration that does not describe the configuration the mount was
    // measured opening on cannot carry it either.
    const misdeclared = crossMountVerdicts(evidence, [
      {
        ...declaration,
        seededInputs: { ...declaration.seededInputs, steps: 30 },
      },
    ]);
    expect(
      misdeclared.filter(({ failures }) => failures.length > 0).map(({ id }) => id),
    ).toEqual([declaration.mountId]);
    expect(misdeclared.flatMap(({ failures }) => failures).join(' ')).toMatch(
      /declares a seed of 95% per step over 30 steps and opens at 95% over 14/,
    );

    // A declaration on the wrong route is equally not about this mount.
    expect(
      crossMountVerdicts(evidence, [
        { ...declaration, route: '/frontier/reliability-gap/' },
      ])
        .flatMap(({ failures }) => failures)
        .join(' '),
    ).toMatch(/places .* on \/frontier\/reliability-gap\//);

    // And a declaration for a mount nobody renders refuses outright.
    expect(() =>
      crossMountVerdicts(evidence, [
        { ...declaration, mountId: 'mount:/nowhere/:ReliabilityCompounding:1' },
      ]),
    ).toThrow(/which the measured population does not contain/);
  });

  it('refuses a population where every sibling has been exempted', () => {
    const evidence = accept(committed());
    const declaration = SEEDED_MOUNTS[0];
    expect(
      crossMountVerdicts(
        evidence,
        evidence.siblingMounts.map((mount) => ({
          ...declaration,
          mountId: mount.mountId,
          route: mount.route,
        })),
      )
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
        memberId: `count:${evidence.progressCounters[1].route}:articles`,
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

  it('fails a surface whose reconciliation set is empty rather than clean', () => {
    // The input that used to pass: `/a-z/` and `/glossary/` printed totals
    // the derivation could not express, every row was filtered out, and the
    // loop over an empty list reported a pass on a surface where nothing had
    // been reconciled against anything.
    const surfaces = progressCounterSurfaces();
    const emptied = mutate((evidence) => {
      const row = evidence.progressCounters.find(
        ({ route }) => route === '/a-z/',
      );
      if (!row) throw new Error('the sweep no longer visits /a-z/');
      row.unreconciledCounts = row.reconciledCounts.map(({ text }) => text);
      row.reconciledCounts = [];
    });
    const failures = progressCounterVerdicts(accept(emptied), surfaces).flatMap(
      ({ failures: rows }) => rows,
    );
    expect(failures.join(' ')).toMatch(
      /\/a-z\/ reconciled no printed count against the registries, leaving "/,
    );
    // The committed sweep reconciles at least one printed total on every
    // surface, so the floor is met by measurement rather than by exemption.
    for (const row of committed().progressCounters) {
      expect(row.reconciledCounts.length, row.route).toBeGreaterThan(0);
    }
  });

  it('fails a surface that prints any count no expectation explains', () => {
    // The input that used to pass: one printed total reconciled, a second
    // one the derivation could not express was moved to unreconciledCounts,
    // and the surface passed with an unchecked number on a shipped page.
    const surfaces = progressCounterSurfaces();
    expect(
      progressCounterVerdicts(accept(committed()), surfaces).flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);
    const planted = mutate((evidence) => {
      const row = evidence.progressCounters.find(
        ({ route }) => route === '/a-z/',
      )!;
      row.unreconciledCounts = ['84 citations'];
    });
    const failing = progressCounterVerdicts(accept(planted), surfaces).filter(
      ({ failures }) => failures.length > 0,
    );
    expect(failing.map(({ id }) => id)).toEqual(['route:/a-z/']);
    expect(failing[0].failures.join(' ')).toMatch(
      /prints "84 citations", which no declared expectation explains/,
    );
  });

  it('requires each declared count member on its own', () => {
    // `/a-z/` prints the published corpus and the whole glossary. One of
    // them reconciling used to be enough for the surface, which left the
    // other total unmeasured.
    const surfaces = progressCounterSurfaces();
    const required = surfaces
      .filter(({ countExpectations }) =>
        countExpectations.some(({ required: isRequired }) => isRequired),
      )
      .map(({ id }) => id);
    expect(required).toEqual(['route:/a-z/', 'route:/glossary/']);
    for (const memberId of [
      'count:/a-z/:articles',
      'count:/a-z/:glossary-terms',
    ]) {
      const dropped = mutate((evidence) => {
        const row = evidence.progressCounters.find(
          ({ route }) => route === '/a-z/',
        )!;
        row.reconciledCounts = row.reconciledCounts.filter(
          (count) => count.memberId !== memberId,
        );
      });
      const failing = progressCounterVerdicts(accept(dropped), surfaces).filter(
        ({ failures }) => failures.length > 0,
      );
      expect(failing.map(({ id }) => id), memberId).toEqual(['route:/a-z/']);
      expect(failing[0].failures.join(' ')).toContain(
        `"${memberId}" (`,
      );
    }
  });

  it('refuses a reconciliation that names no member or the wrong value', () => {
    const surfaces = progressCounterSurfaces();
    const unnamed = mutate((evidence) => {
      const row = evidence.progressCounters[0];
      row.reconciledCounts[0] = {
        ...row.reconciledCounts[0],
        memberId: '',
      };
    });
    expect(() => accept(unnamed)).toThrow(/no named expectation member/);

    const invented = mutate((evidence) => {
      const row = evidence.progressCounters[0];
      row.reconciledCounts[0] = {
        ...row.reconciledCounts[0],
        memberId: 'count:/:citations',
      };
    });
    expect(
      progressCounterVerdicts(accept(invented), surfaces)
        .flatMap(({ failures }) => failures)
        .join(' '),
    ).toMatch(/against "count:\/:citations", which this surface does not declare/);

    const restated = mutate((evidence) => {
      const row = evidence.progressCounters[0];
      row.reconciledCounts[0] = {
        ...row.reconciledCounts[0],
        expected: row.reconciledCounts[0].actual + 1,
      };
    });
    expect(
      progressCounterVerdicts(accept(restated), surfaces)
        .flatMap(({ failures }) => failures)
        .join(' '),
    ).toMatch(/where the registry holds \d+ companies/);
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
