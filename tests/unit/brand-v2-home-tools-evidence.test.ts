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
  modulePageMounts,
  readoutPercent,
  requiredSweepWidths,
  responsiveOverflowVerdicts,
  type FeaturedMountRegistration,
  type HomeToolsEvidence,
} from '@/lib/brand-v2-home-tools-evidence';
import { progressCounterSurfaces } from '@/lib/home-populations';
import { so101DerivedFigures, so101Preview } from '@/lib/so101-kinematics';

const ROOT = process.cwd();

const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract/brand-v2-registries.json'), 'utf8'),
) as {
  routes: { public: Array<{ id: string; path: string }> };
  interactive: {
    mounts: Array<{
      id: string;
      sourceId: string;
      route: string;
      ownerPath: string;
      props: string;
    }>;
  };
};

/**
 * Every registered mount of the component home features, derived from the
 * interactive registry exactly as the sweep and the generator derive it.
 */
function featuredRegistrations(): FeaturedMountRegistration[] {
  const home = REGISTRY.interactive.mounts.find(({ route }) => route === '/');
  if (!home) throw new Error('home registers no interactive mount');
  return REGISTRY.interactive.mounts
    .filter(({ sourceId }) => sourceId === home.sourceId)
    .map(({ id, route, ownerPath, props }) => ({
      mountId: id,
      route,
      ownerPath,
      props,
    }));
}

const MOUNTS = featuredRegistrations();

/** The registration of one measured mount, by id. */
function registrationOf(mountId: string): FeaturedMountRegistration {
  const found = MOUNTS.find((mount) => mount.mountId === mountId);
  if (!found) throw new Error(`${mountId} is not a registered mount`);
  return found;
}

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
      crossMountVerdicts(evidence, MOUNTS).flatMap(
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
    const verdicts = crossMountVerdicts(accept(drifted), MOUNTS);
    expect(verdicts.filter(({ failures }) => failures.length > 0)).toHaveLength(
      1,
    );
    expect(verdicts[0].failures.join(' ')).toMatch(
      new RegExp(`${CROSS_MOUNT_INPUT.steps} steps`),
    );
  });

  it('fails a mount that inherits the component default yet opens elsewhere', () => {
    const home = committed().featured;
    const homeSteps = home.initialSliders.find(({ accessibleName }) =>
      /episode length/i.test(accessibleName),
    )!.value;
    const inheriting = MOUNTS.find(
      (mount) =>
        mount.mountId !== home.mountId &&
        !/(?:^|\s)default[A-Z]/.test(mount.props),
    )!;
    const drifted = mutate((evidence) => {
      // A mount whose registration passes no `default*` prop renders the
      // component's one default state, so it is claiming to open where home
      // opens. Reseeded to a shorter episode, it no longer does.
      const sibling = evidence.siblingMounts.find(
        ({ mountId }) => mountId === inheriting.mountId,
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
    const failing = crossMountVerdicts(accept(drifted), MOUNTS).filter(
      ({ failures }) => failures.length > 0,
    );
    expect(failing.map(({ id }) => id)).toEqual([inheriting.mountId]);
    const reported = failing[0].failures.join(' ');
    expect(reported).toMatch(
      /registers no default state of its own and opens at 95% per step over 14 steps/,
    );
    expect(reported).toContain(`where home opens at 95% over ${homeSteps}`);
  });

  it('holds a registered seed to the model without forcing home defaults on it', () => {
    // A commit-to-reveal panel is registered with its own default state, so
    // it is not claiming to open where home opens. Nothing exempts it from
    // the model: it still has to print what the shared model computes from
    // the inputs it was actually seeded with.
    const evidence = accept(committed());
    const seeded = MOUNTS.find((mount) =>
      /(?:^|\s)default[A-Z]/.test(mount.props),
    )!;
    const verdict = crossMountVerdicts(evidence, MOUNTS).find(
      ({ id }) => id === seeded.mountId,
    )!;
    expect(verdict.failures).toEqual([]);
    expect(verdict.observed.registersOwnDefaultState).toBe(true);
    expect(verdict.observed.initialStateComparedToHome).toBe(false);
    expect(verdict.observed.pairedWithHomeAsModulePage).toBe(true);

    const fabricated = mutate((row) => {
      const mount = row.siblingMounts.find(
        ({ mountId }) => mountId === seeded.mountId,
      )!;
      mount.initialReadout = '90.0%';
      mount.resetReadout = '90.0%';
      mount.secondResetReadout = '90.0%';
    });
    const failing = crossMountVerdicts(accept(fabricated), MOUNTS).filter(
      ({ failures }) => failures.length > 0,
    );
    expect(failing).toHaveLength(1);
    expect(failing[0].failures.join(' ')).toMatch(
      /opens reading 90.0% where the shared model predicts/,
    );
  });

  it('reads the seed off the registration rather than off a visibility fact or an approval', () => {
    // The input that used to pass, and then the input that used to be
    // needed. Being behind a disclosure was once the whole criterion, and
    // the round that closed that replaced the visibility fact with a
    // checked-in approval granting one mount an exception to the criterion.
    // Neither exists now: whether a mount seeds itself is read off the props
    // it is registered with, so a mount that reseeds itself while
    // registering no default fails and no declaration can excuse one.
    const evidence = accept(committed());
    const seeded = registrationOf(
      MOUNTS.find((mount) => /(?:^|\s)default[A-Z]/.test(mount.props))!.mountId,
    );
    const gated = evidence.siblingMounts.find(
      ({ mountId }) => mountId === seeded.mountId,
    )!;
    expect(gated.revealedByControls.length).toBeGreaterThan(0);
    const stripped = MOUNTS.map((mount) =>
      mount.mountId === seeded.mountId
        ? { ...mount, props: 'className="mt-3" /' }
        : mount,
    );
    const failing = crossMountVerdicts(evidence, stripped).filter(
      ({ failures }) => failures.length > 0,
    );
    expect(failing.map(({ id }) => id)).toEqual([seeded.mountId]);
    expect(failing[0].failures.join(' ')).toMatch(
      /registers no default state of its own and opens at 95% per step over 14 steps/,
    );

    // And the mirror: a registration that seeds a mount which opens exactly
    // where home opens is a seed that changes nothing a reader meets.
    const inheriting = MOUNTS.find(
      (mount) =>
        mount.mountId !== evidence.featured.mountId &&
        !/(?:^|\s)default[A-Z]/.test(mount.props),
    )!;
    const overSeeded = MOUNTS.map((mount) =>
      mount.mountId === inheriting.mountId
        ? { ...mount, props: `defaultSteps={30} ${mount.props}` }
        : mount,
    );
    const inert = crossMountVerdicts(evidence, overSeeded).filter(
      ({ failures }) => failures.length > 0,
    );
    expect(inert.map(({ id }) => id)).toEqual([inheriting.mountId]);
    expect(inert[0].failures.join(' ')).toMatch(
      /opens exactly where home opens, so the registered seed changes nothing/,
    );
  });

  it('refuses a registry and a sweep that disagree about the population', () => {
    const evidence = accept(committed());
    // A registered mount nobody measured leaves a member of the population
    // undecided rather than absent.
    expect(() =>
      crossMountVerdicts(evidence, [
        ...MOUNTS,
        {
          mountId: 'mount:/nowhere/:ReliabilityCompounding:1',
          route: '/nowhere/',
          ownerPath: 'content/nowhere.mdx',
          props: '/',
        },
      ]),
    ).toThrow(/which the measured population does not contain/);
    // And a measured mount nobody registered has no derivation behind it.
    expect(() =>
      crossMountVerdicts(
        evidence,
        MOUNTS.filter(
          ({ mountId }) => mountId !== evidence.siblingMounts[0].mountId,
        ),
      ),
    ).toThrow(/which the interactive registry does not register/);
    // The pair VAL-CROSS-015 quantifies over is derived, so a registry with
    // no module-page mount pairs home with nothing.
    expect(() =>
      crossMountVerdicts(
        evidence,
        MOUNTS.map((mount) => ({ ...mount, ownerPath: 'app/page.tsx' })),
      ),
    ).toThrow(/registered on no module page/);
  });

  it('pairs home with every module page the featured interactive is mounted on', () => {
    const pages = modulePageMounts(MOUNTS);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.every(({ ownerPath }) => ownerPath.startsWith('content/'))).toBe(
      true,
    );
    // The home half is the one mount a route module owns rather than a
    // content module, and it is home.
    expect(
      MOUNTS.filter(({ ownerPath }) => !ownerPath.startsWith('content/')).map(
        ({ route }) => route,
      ),
    ).toEqual(['/']);
    const evidence = accept(committed());
    const paired = crossMountVerdicts(evidence, MOUNTS).filter(
      ({ observed }) => observed.pairedWithHomeAsModulePage === true,
    );
    expect(paired.map(({ id }) => id).sort()).toEqual(
      pages.map(({ mountId }) => mountId).sort(),
    );
  });

  it('refuses a population where every sibling seeds its own default state', () => {
    const evidence = accept(committed());
    expect(
      crossMountVerdicts(
        evidence,
        MOUNTS.map((mount) =>
          mount.mountId === evidence.featured.mountId
            ? mount
            : { ...mount, props: `defaultSteps={14} ${mount.props}` },
        ),
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
