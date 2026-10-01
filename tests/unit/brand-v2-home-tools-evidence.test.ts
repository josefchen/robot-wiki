import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CROSS_CONTEXT_CLAUSES,
  FEATURED_INSTRUMENT_ANCHORS,
  FEATURED_SCENE_MODELS,
  HOME_TOOLS_EVIDENCE_PATH,
  HOME_TOOLS_VIEWPORT,
  SCENE_KEY_SCRIPT,
  accessibilityProfileVerdicts,
  crossContextStates,
  crossMountVerdicts,
  featuredInstrumentVerdicts,
  homeDesignBoundVerdicts,
  homeToolsEvidenceFingerprint,
  progressCounterVerdicts,
  readHomeToolsEvidence,
  readoutPercent,
  requiredSweepWidths,
  responsiveOverflowVerdicts,
  sceneCanonicalRoute,
  toolsLineVerdicts,
  type HomeToolsEvidence,
} from '@/lib/brand-v2-home-tools-evidence';
import { homeCounts } from '@/lib/home-counts';
import { progressCounterSurfaces } from '@/lib/home-populations';

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

function failing(verdicts: Array<{ id: string; failures: string[] }>): string[] {
  return verdicts.filter(({ failures }) => failures.length > 0).map(({ id }) => id);
}

const surfaces = () =>
  progressCounterSurfaces({ citedSources: homeCounts().sources });

describe('home tools evidence', () => {
  it('accepts the committed sweep for the tree it was measured against', () => {
    const evidence = accept(committed());
    expect(evidence.route).toBe('/');
    expect(evidence.viewport).toBe(HOME_TOOLS_VIEWPORT.id);
    expect(featuredInstrumentVerdicts(evidence).map(({ id }) => id)).toEqual([
      ...FEATURED_INSTRUMENT_ANCHORS,
    ]);
    for (const verdicts of [
      featuredInstrumentVerdicts(evidence),
      crossMountVerdicts(evidence),
      toolsLineVerdicts(evidence),
      accessibilityProfileVerdicts(evidence),
      homeDesignBoundVerdicts(evidence),
      progressCounterVerdicts(evidence, surfaces()),
    ]) {
      expect(verdicts.flatMap(({ failures }) => failures)).toEqual([]);
    }
  });

  it('measures every public route at every declared width', () => {
    const evidence = accept(committed());
    const widths = requiredSweepWidths();
    expect(widths.length).toBeGreaterThanOrEqual(4);
    const verdicts = responsiveOverflowVerdicts(evidence, REGISTRY.routes.public);
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
        artifact: { ...committed(), version: 1 },
        fingerprint: current,
      }),
    ).toThrow(/version 1 is not 2/);
    expect(() =>
      readHomeToolsEvidence({ artifact: committed(), fingerprint: 'other' }),
    ).toThrow(/stale/);
    expect(() => accept(mutate((e) => (e.route = '/playground/')))).toThrow(
      /covers \/playground\//,
    );
    expect(() => accept(mutate((e) => (e.viewport = '375x812')))).toThrow(
      /swept at 375x812/,
    );
    expect(() => accept(mutate((e) => (e.featured.sceneId = '')))).toThrow(
      /no featured scene/,
    );
    expect(() =>
      accept(
        mutate((e) => {
          e.featured.sceneId = 'invented-scene';
          e.moduleScene.sceneId = 'invented-scene';
        }),
      ),
    ).toThrow(/which the scene registry does not register/);
    expect(() =>
      accept(mutate((e) => (e.moduleScene.route = '/frontier/'))),
    ).toThrow(/would compare the wrong pair/);
    expect(() =>
      accept(mutate((e) => (e.moduleScene.steps = e.moduleScene.steps.slice(1)))),
    ).toThrow(/not the declared key script/);
    expect(() => accept(mutate((e) => (e.toolsLine.links = [])))).toThrow(
      /no link in the tools line/,
    );
    expect(() => accept(mutate((e) => (e.responsive = [])))).toThrow(
      /no responsive measurement/,
    );
    expect(() => accept(mutate((e) => (e.accessibility = [])))).toThrow(
      /no accessibility profile/,
    );
    expect(() => accept(mutate((e) => (e.progressCounters = [])))).toThrow(
      /swept no route for progress counters/,
    );
  }, 30_000);

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
    expect(failing(verdicts)).toEqual(['route:/']);
    expect(verdicts.flatMap(({ failures }) => failures).join(' ')).toMatch(
      /not the declared/,
    );

    const overflowed = mutate((evidence) => {
      const row = evidence.responsive.find((entry) => entry.route === '/')!;
      row.documentScrollWidthPx = row.documentClientWidthPx + 17;
    });
    expect(
      failing(responsiveOverflowVerdicts(accept(overflowed), REGISTRY.routes.public)),
    ).toEqual(['route:/']);

    expect(() => responsiveOverflowVerdicts(accept(committed()), [])).toThrow(
      /quantify over nothing/,
    );
  });

  it('features exactly one registered scene and reads its article from the scene registry', () => {
    const evidence = accept(committed());
    expect(evidence.featured.sceneCount).toBe(1);
    expect(evidence.moduleScene.route).toBe(
      sceneCanonicalRoute(evidence.featured.sceneId),
    );
    expect(evidence.featured.componentModule).toBe(
      `components/motion/scenes/${evidence.featured.sceneId}.tsx`,
    );
    expect(evidence.featured.steps.map(({ key }) => key)).toEqual([
      ...SCENE_KEY_SCRIPT,
    ]);
    expect(
      failing(featuredInstrumentVerdicts(accept(mutate((e) => (e.featured.sceneCount = 2))))),
    ).toEqual(['anchor:featured-one-registered-scene']);
  });
  it('fails a scene that autoplays, stops stepping, stops resetting, or sinks below the fold', () => {
    const planted = (change: (evidence: HomeToolsEvidence) => void) =>
      failing(featuredInstrumentVerdicts(accept(mutate(change))));

    expect(planted((e) => (e.featured.idleFrameRequests = 3))).toEqual([
      'anchor:featured-no-autoplay',
    ]);
    expect(planted((e) => (e.featured.playingFrameRequests = 0))).toEqual([
      'anchor:featured-plays-on-activation',
    ]);
    expect(planted((e) => (e.featured.posterMarkCount = 0))).toEqual([
      'anchor:featured-poster-at-first-paint',
    ]);
    expect(planted((e) => (e.featured.playerMountedAtFirstPaint = true))).toEqual([
      'anchor:featured-poster-at-first-paint',
    ]);
    expect(planted((e) => (e.featured.graphicTag = 'img'))).toEqual([
      'anchor:featured-live-graphic',
    ]);
    expect(planted((e) => (e.featured.describedByText = null))).toEqual([
      'anchor:featured-live-graphic',
    ]);
    expect(planted((e) => (e.featured.posterControls = []))).toEqual([
      'anchor:featured-numeric-readout',
    ]);
    expect(planted((e) => (e.featured.graphicTopPx = 1201))).toEqual([
      'anchor:featured-reachable-in-one-scroll',
    ]);
    expect(planted((e) => (e.featured.focusOutlineWidthPx = 0))).toEqual([
      'anchor:featured-visible-focus',
    ]);
    expect(planted((e) => (e.featured.claimText = 'Featured scene.'))).toEqual([
      'anchor:featured-claim-and-current-state',
    ]);
    // A reset that lands on another model-consistent still: only the reset
    // anchor can tell it from the poster.
    expect(
      planted((e) => {
        e.featured.resetReadout = e.featured.steps[0].readout;
        e.featured.resetCaption = e.featured.steps[0].caption;
      }),
    ).toEqual(['anchor:featured-deterministic-reset']);
    // Keys that never move the still: the stills stay model-consistent, so
    // only operability fails.
    expect(
      planted((e) => {
        for (const step of e.featured.steps) {
          step.readout = e.featured.posterReadout;
          step.caption = e.featured.posterCaption;
        }
      }),
    ).toEqual(['anchor:featured-keyboard-operable']);
  }, 30_000);

  it('checks every printed still against the scene model instead of trusting it', () => {
    const model = FEATURED_SCENE_MODELS['reliability-threshold'];
    const status = 'Illustrative model: all 30 decisions succeed independently at the same rate.';
    expect(model('beat 1 / 4 conditional rate 95.0% episode 21.5%', status)).toBeNull();
    expect(model('beat 3 / 4 conditional rate 99.9% episode 97.0%', status)).toBeNull();
    expect(model('beat 2 / 4 conditional rate 99.0% episode 70.0%', status)).toMatch(
      /compounds to 74\.0%/,
    );
    expect(model('beat 2 / 4 conditional rate 99.0% episode 74.0%', 'A toy model.')).toMatch(
      /states no decision horizon/,
    );
    expect(model('beat 2 / 4', status)).toMatch(/prints no conditional rate/);
    expect(readoutPercent('episode 35.8%')).toBe(35.8);
    expect(readoutPercent('no number here')).toBeNull();

    const fabricated = featuredInstrumentVerdicts(
      accept(
        mutate((e) => {
          e.featured.steps[2].readout = e.featured.steps[2].readout.replace(
            /episode \d+(?:\.\d+)?%/,
            'episode 42.0%',
          );
        }),
      ),
    );
    expect(failing(fabricated)).toEqual(['anchor:featured-no-fabricated-telemetry']);

    // A featured scene nobody wrote a model for is unchecked, and fails.
    const evidence = accept(committed());
    const unmodelled = featuredInstrumentVerdicts({
      ...evidence,
      featured: { ...evidence.featured, sceneId: 'tactile-slip' },
    });
    expect(failing(unmodelled)).toEqual(['anchor:featured-no-fabricated-telemetry']);
    expect(unmodelled.flatMap(({ failures }) => failures).join(' ')).toMatch(
      /no independent model is declared for tactile-slip/,
    );
  });
  it('compares home with the scene article still against still', () => {
    const evidence = accept(committed());
    const rows = crossContextStates(evidence);
    expect(rows.map(({ state }) => state)).toEqual([
      'poster',
      'status line',
      ...SCENE_KEY_SCRIPT.map((key, index) => `step ${index + 1} (${key})`),
      'reset',
      'second reset',
    ]);
    expect(rows.every(({ agrees }) => agrees)).toBe(true);
    // The article copy moves with the keys too: agreement is not two stills
    // that never changed.
    expect(new Set(evidence.moduleScene.steps.map(({ readout }) => readout)).size).toBeGreaterThan(1);
    expect(crossMountVerdicts(evidence).map(({ id }) => id)).toEqual(
      Object.values(CROSS_CONTEXT_CLAUSES),
    );
  });

  it('fails the clause each drift belongs to and only that clause', () => {
    const planted = (change: (evidence: HomeToolsEvidence) => void) =>
      failing(crossMountVerdicts(accept(mutate(change))));

    expect(
      planted((e) => (e.moduleScene.steps[3].caption = 'A different caption.')),
    ).toEqual([CROSS_CONTEXT_CLAUSES.sharedInputsSharedReadout]);
    expect(
      planted((e) => {
        e.moduleScene.posterReadout = e.moduleScene.steps[0].readout;
        e.moduleScene.resetReadout = e.moduleScene.posterReadout;
        e.moduleScene.secondResetReadout = e.moduleScene.posterReadout;
      }),
    ).toEqual([CROSS_CONTEXT_CLAUSES.identicalResetState]);
    expect(
      planted((e) => (e.moduleScene.statusLine = 'A separate calculator on home tests other rates.')),
    ).toEqual([CROSS_CONTEXT_CLAUSES.identicalResetState]);
    // Reset drifting in one context only: that context no longer returns to
    // its own poster, and the two contexts no longer agree.
    const drifted = crossMountVerdicts(
      accept(mutate((e) => (e.moduleScene.resetReadout = e.moduleScene.steps[0].readout))),
    );
    expect(failing(drifted)).toEqual([CROSS_CONTEXT_CLAUSES.identicalResetState]);
    expect(drifted.flatMap(({ failures }) => failures).join(' ')).toMatch(
      /rather than its own poster/,
    );
    expect(
      planted((e) => (e.featured.componentModule = 'components/home/reliability-copy.tsx')),
    ).toEqual([CROSS_CONTEXT_CLAUSES.sameComponent]);
    expect(planted((e) => (e.moduleScene.componentModule = null))).toEqual([
      CROSS_CONTEXT_CLAUSES.sameComponent,
    ]);
  });

  it('fails a tools line that grows a preview, a card, a second line or a renamed link', () => {
    const planted = (change: (evidence: HomeToolsEvidence) => void) =>
      failing(toolsLineVerdicts(accept(mutate(change))));

    const evidence = accept(committed());
    expect(evidence.toolsLine.links.map(({ path }) => path)).toEqual([
      '/playground/',
      '/market-map/',
    ]);
    expect(planted((e) => e.toolsLine.graphics.push('svg'))).toEqual([
      'anchor:tools-line-plain',
    ]);
    expect(planted((e) => (e.toolsLine.boxedDescendants = 2))).toEqual([
      'anchor:tools-line-plain',
    ]);
    expect(planted((e) => e.toolsLine.renderedNumbers.push(6))).toEqual([
      'anchor:tools-line-plain',
    ]);
    expect(planted((e) => (e.toolsLine.links[1].topPx += 30))).toEqual([
      'anchor:tools-line-plain',
    ]);
    expect(
      planted((e) =>
        e.toolsLine.links.push({ text: 'Glossary', path: '/glossary/', topPx: e.toolsLine.links[0].topPx }),
      ),
    ).toEqual(['anchor:tools-line-plain']);
    expect(planted((e) => (e.toolsLine.links[0].text = 'Try the arm'))).toEqual([
      'anchor:tools-line-playground-link',
    ]);
    expect(
      planted((e) => (e.toolsLine.links = e.toolsLine.links.filter(({ path }) => path !== '/market-map/'))),
    ).toEqual(['anchor:tools-line-market-map-link']);
  });
  it('fails a design bound and only the bound that moved', () => {
    const planted = (change: (evidence: HomeToolsEvidence) => void) =>
      failing(homeDesignBoundVerdicts(accept(mutate(change))));
    expect(
      planted((e) => {
        e.designBounds.microLabels = Array.from({ length: 6 }, (_, index) => ({
          text: `LABEL ${index}`,
          fontSizePx: 11,
          family: 'IBM Plex Mono',
        }));
      }),
    ).toEqual(['bound:home-micro-labels']);
    // Home mounts no chart now; one added later is measured, not excused.
    expect(committed().designBounds.chartDisclosureSummaries).toEqual([]);
    expect(
      planted((e) =>
        e.designBounds.chartDisclosureSummaries.push({
          text: 'Chart data',
          textTransform: 'none',
          letterSpacing: 'normal',
          fontSizePx: 13,
          borderTopWidthPx: 1,
          borderBottomWidthPx: 0,
        }),
      ),
    ).toEqual(['bound:home-chart-disclosure-summary']);
    expect(
      planted((e) => e.designBounds.axeViolationIds.push('color-contrast')),
    ).toEqual(['bound:home-zero-axe-and-console']);
    expect(planted((e) => (e.designBounds.borderedBoxCount = 7))).toEqual([
      'bound:home-bordered-boxes',
    ]);
  });

  it('fails a surface that prints an authoring counter or a count the registry denies', () => {
    const planted = mutate((evidence) => {
      evidence.progressCounters[0].matches.push('3 of 12 articles');
      evidence.progressCounters[1].reconciledCounts.push({
        memberId: `count:${evidence.progressCounters[1].route}:articles`,
        text: '99 articles',
        expected: 6,
        actual: 99,
      });
    });
    const verdicts = progressCounterVerdicts(accept(planted), surfaces());
    const failed = verdicts.filter(({ failures }) => failures.length > 0);
    expect(failed).toHaveLength(2);
    expect(failed[0].failures.join(' ')).toMatch(/3 of 12 articles/);
    expect(failed[1].failures.join(' ')).toMatch(/registry holds 6/);
    expect(() => progressCounterVerdicts(accept(committed()), [])).toThrow(
      /quantify over nothing/,
    );
  });

  it('fails a surface whose reconciliation set is empty rather than clean', () => {
    const emptied = mutate((evidence) => {
      const row = evidence.progressCounters.find(({ route }) => route === '/a-z/');
      if (!row) throw new Error('the sweep no longer visits /a-z/');
      row.unreconciledCounts = row.reconciledCounts.map(({ text }) => text);
      row.reconciledCounts = [];
    });
    const failures = progressCounterVerdicts(accept(emptied), surfaces()).flatMap(
      ({ failures: rows }) => rows,
    );
    expect(failures.join(' ')).toMatch(
      /\/a-z\/ reconciled no printed count against the registries, leaving "/,
    );
    for (const row of committed().progressCounters) {
      expect(row.reconciledCounts.length, row.route).toBeGreaterThan(0);
    }
  });

  it('fails a surface that prints any count no expectation explains', () => {
    expect(
      progressCounterVerdicts(accept(committed()), surfaces()).flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);
    const planted = mutate((evidence) => {
      const row = evidence.progressCounters.find(({ route }) => route === '/a-z/')!;
      row.unreconciledCounts = ['84 citations'];
    });
    const verdicts = progressCounterVerdicts(accept(planted), surfaces());
    expect(failing(verdicts)).toEqual(['route:/a-z/']);
    expect(verdicts.flatMap(({ failures }) => failures).join(' ')).toMatch(
      /prints "84 citations", which no declared expectation explains/,
    );
  });
  it('requires each declared count member on its own', () => {
    // Home prints three registry totals and the A-Z index two. One of them
    // reconciling used to be enough for a surface, which left the others
    // unmeasured.
    const population = surfaces();
    expect(
      population
        .filter(({ countExpectations }) =>
          countExpectations.some(({ required }) => required),
        )
        .map(({ id }) => id),
    ).toEqual(['route:/', 'route:/a-z/', 'route:/glossary/']);
    expect(
      population.find(({ id }) => id === 'route:/')!.countExpectations.map(({ memberId }) => memberId),
    ).toEqual(['count:/:articles', 'count:/:sources', 'count:/:glossary-terms']);
    for (const [route, memberId] of [
      ['/', 'count:/:articles'],
      ['/', 'count:/:sources'],
      ['/', 'count:/:glossary-terms'],
      ['/a-z/', 'count:/a-z/:articles'],
      ['/a-z/', 'count:/a-z/:glossary-terms'],
    ] as const) {
      const dropped = mutate((evidence) => {
        const row = evidence.progressCounters.find((entry) => entry.route === route)!;
        row.reconciledCounts = row.reconciledCounts.filter(
          (count) => count.memberId !== memberId,
        );
      });
      const verdicts = progressCounterVerdicts(accept(dropped), population);
      expect(failing(verdicts), memberId).toEqual([`route:${route}`]);
      expect(verdicts.flatMap(({ failures }) => failures).join(' ')).toContain(
        `"${memberId}" (`,
      );
    }
  });

  it('holds the home source total to the distinct sources published pages cite', () => {
    const home = committed().progressCounters.find(({ route }) => route === '/')!;
    const sources = home.reconciledCounts.find(({ memberId }) => memberId === 'count:/:sources')!;
    expect(sources.actual).toBe(homeCounts().sources);
    const inflated = progressCounterVerdicts(
      accept(
        mutate((evidence) => {
          const row = evidence.progressCounters.find(({ route }) => route === '/')!;
          const count = row.reconciledCounts.find(({ memberId }) => memberId === 'count:/:sources')!;
          count.actual += 1;
        }),
      ),
      surfaces(),
    );
    expect(failing(inflated)).toEqual(['route:/']);
    expect(inflated.flatMap(({ failures }) => failures).join(' ')).toMatch(
      /where the registry holds \d+/,
    );
  });

  it('refuses a reconciliation that names no member or the wrong value', () => {
    const unnamed = mutate((evidence) => {
      const row = evidence.progressCounters[0];
      row.reconciledCounts[0] = { ...row.reconciledCounts[0], memberId: '' };
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
      progressCounterVerdicts(accept(invented), surfaces())
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
      progressCounterVerdicts(accept(restated), surfaces())
        .flatMap(({ failures }) => failures)
        .join(' '),
    ).toMatch(/where the registry holds \d+ published articles/);
  });

  it('fails an accessibility profile that measured nothing', () => {
    const planted = mutate((evidence) => {
      evidence.accessibility[0].measuredMembers = 0;
    });
    const verdicts = accessibilityProfileVerdicts(accept(planted));
    expect(failing(verdicts)).toHaveLength(1);
    expect(verdicts.flatMap(({ failures }) => failures).join(' ')).toMatch(
      /measured no member/,
    );
  });
});
