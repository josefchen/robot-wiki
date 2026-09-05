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
  expectedEpisodeSuccessReadout,
  featuredComponentDefaults,
  featuredInstrumentVerdicts,
  homeDesignBoundVerdicts,
  homeToolsEvidenceFingerprint,
  mountModelInputs,
  playgroundEntryVerdicts,
  progressCounterVerdicts,
  readHomeToolsEvidence,
  registeredProps,
  modulePageMounts,
  readoutPercent,
  requiredSweepWidths,
  responsiveOverflowVerdicts,
  type FeaturedComponentDefaults,
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
    sources: Array<{ id: string; component: string; sourcePath?: string }>;
    mounts: Array<{
      id: string;
      sourceId: string;
      route: string;
      ownerPath: string;
      props: string;
    }>;
  };
};

/** The registry row for the component home features. */
function featuredSourceId(): string {
  const home = REGISTRY.interactive.mounts.find(({ route }) => route === '/');
  if (!home) throw new Error('home registers no interactive mount');
  return home.sourceId;
}

/**
 * Every registered mount of the component home features, derived from the
 * interactive registry exactly as the sweep and the generator derive it.
 */
function featuredRegistrations(): FeaturedMountRegistration[] {
  const sourceId = featuredSourceId();
  return REGISTRY.interactive.mounts
    .filter((mount) => mount.sourceId === sourceId)
    .map(({ id, route, ownerPath, props }) => ({
      mountId: id,
      route,
      ownerPath,
      props,
    }));
}

/**
 * The component's own declared defaults, read from the file the registry
 * says declares them rather than restated here.
 */
function featuredComponent(): FeaturedComponentDefaults {
  const source = REGISTRY.interactive.sources.find(
    ({ id }) => id === featuredSourceId(),
  );
  if (!source?.sourcePath) {
    throw new Error('the featured interactive registers no source path');
  }
  return featuredComponentDefaults({
    component: source.component,
    path: source.sourcePath,
    text: readFileSync(join(ROOT, source.sourcePath), 'utf8'),
  });
}

const MOUNTS = featuredRegistrations();
const COMPONENT = featuredComponent();

/** The registration of one measured mount, by id. */
function registrationOf(mountId: string): FeaturedMountRegistration {
  const found = MOUNTS.find((mount) => mount.mountId === mountId);
  if (!found) throw new Error(`${mountId} is not a registered mount`);
  return found;
}

/**
 * The mount whose registration moves it off the component's canonical
 * default state, selected by the model rather than by the spelling of a
 * prop, so this fixture cannot drift back into reading a mount's own
 * declaration as a classification.
 */
function reseededMount(): FeaturedMountRegistration {
  const found = MOUNTS.filter((mount) => {
    const inputs = mountModelInputs(mount, COMPONENT);
    return (
      inputs.steps !== COMPONENT.steps ||
      inputs.perStepPercent !== COMPONENT.perStepFraction * 100
    );
  });
  if (found.length !== 1) {
    throw new Error(
      `${found.length} registered mounts are seeded off the component default; this fixture assumes exactly one`,
    );
  }
  return found[0];
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
      crossMountVerdicts(evidence, MOUNTS, COMPONENT).flatMap(
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

  it('decides every registered mount, home included, on one set of clauses', () => {
    const evidence = accept(committed());
    const verdicts = crossMountVerdicts(evidence, MOUNTS, COMPONENT);
    expect(verdicts.map(({ id }) => id).sort()).toEqual(
      MOUNTS.map(({ mountId }) => mountId).sort(),
    );
    expect(
      verdicts.filter(({ observed }) => observed.isFeaturedHomeMount === true)
        .map(({ id }) => id),
    ).toEqual([evidence.featured.mountId]);
    // No row carries a field naming a class of mount, because there is no
    // longer a class of mount: every row records the same three readings.
    for (const verdict of verdicts) {
      expect(Object.keys(verdict.observed).sort()).toEqual([
        'configurationOverrides',
        'driven',
        'homeDriven',
        'initial',
        'isFeaturedHomeMount',
        'modelInputs',
        'modelPredictedReadout',
        'ownerPath',
        'pairedWithHomeAsModulePage',
        'registeredProps',
        'reset',
        'revealedByControls',
        'route',
      ]);
    }
  });

  it('fails a mount that drifts from the one home features', () => {
    const drifted = mutate((evidence) => {
      evidence.siblingMounts[0].drivenReadout = '77.7%';
    });
    const verdicts = crossMountVerdicts(accept(drifted), MOUNTS, COMPONENT);
    const failing = verdicts.filter(({ failures }) => failures.length > 0);
    expect(failing).toHaveLength(1);
    expect(failing[0].failures.join(' ')).toMatch(
      new RegExp(`${CROSS_MOUNT_INPUT.steps} steps`),
    );
  });

  it('fails home when it features a configured copy rather than the canonical one', () => {
    // Clause 1, and the real drift the deleted configuration clause was
    // groping for: the copy a reader meets first must be the component's own
    // default render, so home may override none of the parameters the
    // component gives a canonical value.
    const evidence = accept(committed());
    expect(COMPONENT.configurableParameters).toContain('defaultSteps');
    const homeRegistration = registrationOf(evidence.featured.mountId);
    expect(
      [...registeredProps(homeRegistration.props).keys()].filter((name) =>
        COMPONENT.configurableParameters.includes(name),
      ),
    ).toEqual([]);
    for (const planted of [
      'defaultSteps={14} className="mt-5" /',
      'descriptionVariant="evaluation" className="mt-5" /',
    ]) {
      expect(planted).not.toEqual(homeRegistration.props);
      const configured = MOUNTS.map((mount) =>
        mount.mountId === homeRegistration.mountId
          ? { ...mount, props: planted }
          : mount,
      );
      const failing = crossMountVerdicts(
        evidence,
        configured,
        COMPONENT,
      ).filter(({ failures }) => failures.length > 0);
      expect(failing.map(({ id }) => id), planted).toEqual([
        homeRegistration.mountId,
      ]);
      expect(failing[0].failures.join(' ')).toMatch(
        /is not the component's canonical default/,
      );
    }
  });

  it('holds the reseeded quiz to the model on exactly the terms every mount is held to', () => {
    // The mount that used to be exempt. It is registered with its own seed,
    // so the model predicts a different value for it — and it is required to
    // print that value, which is a requirement rather than an excuse.
    const evidence = accept(committed());
    const quiz = reseededMount();
    const verdict = crossMountVerdicts(evidence, MOUNTS, COMPONENT).find(
      ({ id }) => id === quiz.mountId,
    )!;
    expect(verdict.failures).toEqual([]);
    expect(verdict.observed.pairedWithHomeAsModulePage).toBe(true);
    expect(verdict.observed.modelPredictedReadout).toBe(
      expectedEpisodeSuccessReadout(mountModelInputs(quiz, COMPONENT)),
    );
    // Being behind a disclosure was once the whole criterion, and the round
    // that closed that replaced the visibility fact with a checked-in
    // approval. Neither decides anything now, and the disclosure is still
    // recorded so the reading stays legible.
    const gated = evidence.siblingMounts.find(
      ({ mountId }) => mountId === quiz.mountId,
    )!;
    expect(gated.revealedByControls.length).toBeGreaterThan(0);

    const fabricated = mutate((row) => {
      const mount = row.siblingMounts.find(
        ({ mountId }) => mountId === quiz.mountId,
      )!;
      mount.initialReadout = '90.0%';
      mount.resetReadout = '90.0%';
      mount.secondResetReadout = '90.0%';
    });
    const failing = crossMountVerdicts(
      accept(fabricated),
      MOUNTS,
      COMPONENT,
    ).filter(({ failures }) => failures.length > 0);
    expect(failing.map(({ id }) => id)).toEqual([quiz.mountId]);
    expect(failing[0].failures.join(' ')).toMatch(
      /opens 90.0% where the shared model predicts 48.8%/,
    );
  });

  it('predicts each mount from the component default its own props do not override', () => {
    // Clause 2's other input. The declared default is read from the
    // component's source, so moving it moves the value every mount that
    // inherits it has to print — and leaves the reseeded mount, which
    // overrides it, exactly where it was.
    const evidence = accept(committed());
    const quiz = reseededMount();
    const inheriting = MOUNTS.filter(
      ({ mountId }) => mountId !== quiz.mountId,
    ).map(({ mountId }) => mountId);
    expect(inheriting).toContain(evidence.featured.mountId);
    const moved = crossMountVerdicts(evidence, MOUNTS, {
      ...COMPONENT,
      steps: COMPONENT.steps - 1,
    }).filter(({ failures }) => failures.length > 0);
    expect(moved.map(({ id }) => id).sort()).toEqual([...inheriting].sort());
    expect(moved[0].failures.join(' ')).toMatch(
      /where its own registration and the component's declared defaults predict/,
    );

    const rescaled = crossMountVerdicts(evidence, MOUNTS, {
      ...COMPONENT,
      perStepFraction: COMPONENT.perStepFraction - 0.01,
    }).filter(({ failures }) => failures.length > 0);
    expect(rescaled.map(({ id }) => id).sort()).toEqual([...inheriting].sort());
  });

  it('fails a mount whose readout was never taken on the shared control values', () => {
    // Clause 3 compares readouts, which only means anything if the mounts
    // were driven to the same values. A mount whose slider clamped the
    // shared input is a mount that was never compared.
    const clamped = mutate((evidence) => {
      const steps = evidence.siblingMounts[0].drivenSliders.find(
        ({ accessibleName }) => /episode length/i.test(accessibleName),
      )!;
      steps.value = CROSS_MOUNT_INPUT.steps + 5;
    });
    const failing = crossMountVerdicts(
      accept(clamped),
      MOUNTS,
      COMPONENT,
    ).filter(({ failures }) => failures.length > 0);
    expect(failing).toHaveLength(1);
    expect(failing[0].failures.join(' ')).toMatch(
      /so its readout was never compared on the same inputs/,
    );
  });

  it('refuses a registry and a sweep that disagree about the population', () => {
    const evidence = accept(committed());
    // A registered mount nobody measured leaves a member of the population
    // undecided rather than absent.
    expect(() =>
      crossMountVerdicts(
        evidence,
        [
          ...MOUNTS,
          {
            mountId: 'mount:/nowhere/:ReliabilityCompounding:1',
            route: '/nowhere/',
            ownerPath: 'content/nowhere.mdx',
            props: '/',
          },
        ],
        COMPONENT,
      ),
    ).toThrow(/which the measured population does not contain/);
    // And a measured mount nobody registered has no derivation behind it.
    expect(() =>
      crossMountVerdicts(
        evidence,
        MOUNTS.filter(
          ({ mountId }) => mountId !== evidence.siblingMounts[0].mountId,
        ),
        COMPONENT,
      ),
    ).toThrow(/which the interactive registry does not register/);
    // Two registrations for one mount would read it against both.
    expect(() =>
      crossMountVerdicts(evidence, [...MOUNTS, MOUNTS[0]], COMPONENT),
    ).toThrow(/names one mount twice/);
    // The pair VAL-CROSS-015 quantifies over is derived, so a registry with
    // no module-page mount pairs home with nothing.
    expect(() =>
      crossMountVerdicts(
        evidence,
        MOUNTS.map((mount) => ({ ...mount, ownerPath: 'app/page.tsx' })),
        COMPONENT,
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
    const paired = crossMountVerdicts(evidence, MOUNTS, COMPONENT).filter(
      ({ observed }) => observed.pairedWithHomeAsModulePage === true,
    );
    expect(paired.map(({ id }) => id).sort()).toEqual(
      pages.map(({ mountId }) => mountId).sort(),
    );
  });

  it('reads the component defaults from the component, and refuses a source it cannot read', () => {
    const source = REGISTRY.interactive.sources.find(
      ({ id }) => id === featuredSourceId(),
    )!;
    const text = readFileSync(join(ROOT, source.sourcePath!), 'utf8');
    const declared = featuredComponentDefaults({
      component: source.component,
      path: source.sourcePath!,
      text,
    });
    // `className` carries no default, so it is not a configurable parameter
    // and home passing it is not a departure from the canonical render.
    expect(declared.configurableParameters).not.toContain('className');
    expect(declared.configurableParameters).toEqual(
      expect.arrayContaining(['defaultPerStep', 'defaultSteps']),
    );
    // The declared values are the file's, and the model reads them.
    const homeInputs = mountModelInputs(
      registrationOf(committed().featured.mountId),
      declared,
    );
    expect(homeInputs).toEqual({
      perStepPercent: declared.perStepFraction * 100,
      steps: declared.steps,
    });
    expect(expectedEpisodeSuccessReadout(homeInputs)).toBe(
      committed().featured.initialReadout,
    );

    const renamed = text.replace('defaultSteps = ', 'defaultLength = ');
    expect(renamed).not.toEqual(text);
    expect(() =>
      featuredComponentDefaults({
        component: source.component,
        path: source.sourcePath!,
        text: renamed,
      }),
    ).toThrow(/declares no default for .* defaultSteps/);

    const computed = text.replace(
      'defaultSteps = 30',
      'defaultSteps = someRuntimeValue()',
    );
    expect(computed).not.toEqual(text);
    expect(() =>
      featuredComponentDefaults({
        component: source.component,
        path: source.sourcePath!,
        text: computed,
      }),
    ).toThrow(/which is not a number the shared model can be computed from/);

    expect(() =>
      featuredComponentDefaults({
        component: 'NotAComponent',
        path: source.sourcePath!,
        text,
      }),
    ).toThrow(/exports no function NotAComponent/);
  });

  it('reads a mount\u2019s registered props as attributes rather than as text', () => {
    expect([...registeredProps('className="mt-5" /').entries()]).toEqual([
      ['className', 'mt-5'],
    ]);
    expect([
      ...registeredProps(
        'defaultPerStep={0.95} defaultSteps={14} descriptionVariant="prediction" className="mt-3" /',
      ).entries(),
    ]).toEqual([
      ['defaultPerStep', '0.95'],
      ['defaultSteps', '14'],
      ['descriptionVariant', 'prediction'],
      ['className', 'mt-3'],
    ]);
    // A `=` inside a value is not an attribute boundary, and an expression
    // holding braces is read whole.
    expect([
      ...registeredProps('title="a=b" render={{ a: 1 }} hidden /').entries(),
    ]).toEqual([
      ['title', 'a=b'],
      ['render', '{ a: 1 }'],
      ['hidden', ''],
    ]);
    // Props that cannot be enumerated are refused rather than read as none.
    expect(() => registeredProps('{...rest} /')).toThrow(
      /spread an expression/,
    );
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
