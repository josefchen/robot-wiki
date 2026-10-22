import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { devices, type Page } from '@playwright/test';
import { test, expect, brandV2Registry } from './brand-v2-static-fixture';
import { inOwnContext } from './helpers/per-route-context';
import {
  collectFocusStop,
  collectGlobalConvergence,
} from './helpers/global-convergence-collector';
import {
  FOCUS_TAB_STOPS,
  FRAME_ROWS,
  GLOBAL_CONVERGENCE_EVIDENCE_PATH,
  GLOBAL_CONVERGENCE_VERSION,
  GLOBAL_CONVERGENCE_VIEWPORTS,
  REPRESENTATIVE_SURFACES,
  ROUTE_ROW_PREDICATES,
  SOCIAL_ARTWORK_MANIFEST_PATH,
  SURFACE_FAMILIES,
  TYPE_POPULATIONS,
  VIEWPORT_PAIR_ROW,
  collectorInput,
  frameRowVerdicts,
  globalConvergenceEvidenceFingerprint,
  globalConvergenceVerdicts,
  readConvergenceRegistry,
  readGlobalConvergenceEvidence,
  readSocialArtwork,
  routeRowVerdicts,
  surfaceFamilyVerdicts,
  typePopulationVerdicts,
  viewportPairVerdicts,
  type GlobalConvergenceEvidence,
  type GlobalConvergenceObservation,
} from '../../lib/brand-v2-global-convergence-evidence';

const ROOT = process.cwd();
const REGISTRY = readConvergenceRegistry(ROOT);
const SOCIAL = readSocialArtwork(
  JSON.parse(readFileSync(join(ROOT, SOCIAL_ARTWORK_MANIFEST_PATH), 'utf8')),
  REGISTRY,
);

/**
 * The product-wide colour, component, spacing, type, grid and surface rows,
 * measured on every registered public route at each page-frame width.
 *
 * Each page is laid out by the browser at 375, 768 and 1440 px, read once by
 * the structural collector, then walked for thirty keyboard stops. The
 * readings are persisted and decided by the fail-closed reader in
 * `lib/brand-v2-global-convergence-evidence.ts`, so the enforcement
 * generator states results it did not invent.
 */

type PublicRoute = { id: string; path: string };
const routes = brandV2Registry.routes.public as PublicRoute[];

/** Pages measured at once, each in a context of its own. */
const SWEEP_CONTEXTS = 3;

const observations: GlobalConvergenceObservation[] = [];

async function measure(
  page: Page,
  staticBase: string,
  route: PublicRoute,
  viewport: (typeof GLOBAL_CONVERGENCE_VIEWPORTS)[number],
): Promise<GlobalConvergenceObservation> {
  const input = collectorInput(viewport.frame, REGISTRY);
  const response = await page.goto(`${staticBase}${route.path}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Layout that settles after fonts (balanced headings, sticky rails) is
  // read where it lands.
  await page.waitForTimeout(300);
  // The playground creates its WebGL canvas, and only then makes it a
  // keyboard stop, some time after load; walk the page once it has. The
  // explainer stage shows a "Loading…" status while its scene loads, which
  // would read as content one width has and another lacks.
  await page.waitForFunction(
    () =>
      document.querySelector('[data-playground-state="loading"]') === null &&
      (document.querySelector('[data-playground-state="ready"]') === null ||
        document.querySelector('.pg-stage canvas[tabindex="0"]') !== null) &&
      [...document.querySelectorAll<HTMLElement>('[data-explainers] [data-x="status"]')].every(
        (status) => status.hidden || status.textContent !== 'Loading…',
      ),
    undefined,
    { timeout: 60_000 },
  );
  const collected = await page.evaluate(collectGlobalConvergence, input);
  const focus: GlobalConvergenceObservation['focus'] = [];
  for (let stop = 0; stop < FOCUS_TAB_STOPS; stop += 1) {
    await page.keyboard.press('Tab');
    focus.push(await page.evaluate(collectFocusStop, { exemptions: input.exemptions }));
  }
  return {
    routeId: route.id,
    route: route.path,
    viewport: viewport.id,
    status: response?.status() ?? 0,
    page: collected,
    focus,
  };
}

test.describe('brand-v2 global type, colour, spacing and component convergence', () => {
  test.describe.configure({ mode: 'serial' });

  test('every public route is read at each page-frame width', async ({ browser, staticBase }) => {
    test.setTimeout(1_800_000);
    expect(routes.length, 'public route population').toBeGreaterThan(0);
    const queue = GLOBAL_CONVERGENCE_VIEWPORTS.flatMap((viewport) =>
      routes.map((route) => ({ route, viewport })),
    );
    const sweep = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const { route, viewport } = job;
        const observation = await inOwnContext(
          browser,
          (page) => measure(page, staticBase, route, viewport),
          {
            ...devices['Desktop Chrome'],
            viewport: { width: viewport.width, height: viewport.height },
          },
        );
        expect(observation.status, `${route.path} at ${viewport.id}`).toBe(200);
        observations.push(observation);
      }
    };
    await Promise.all(Array.from({ length: SWEEP_CONTEXTS }, sweep));
    expect(observations).toHaveLength(routes.length * GLOBAL_CONVERGENCE_VIEWPORTS.length);
  });

  /** The artifact the sweep assembles, under a given fingerprint. */
  const assemble = (fingerprint: string): GlobalConvergenceEvidence => ({
    version: GLOBAL_CONVERGENCE_VERSION,
    fingerprint,
    viewports: GLOBAL_CONVERGENCE_VIEWPORTS.map(({ id }) => id),
    routeIds: routes.map(({ id }) => id),
    observations: [...observations].sort(
      (a, b) =>
        routes.findIndex(({ id }) => id === a.routeId) - routes.findIndex(({ id }) => id === b.routeId) ||
        GLOBAL_CONVERGENCE_VIEWPORTS.findIndex(({ id }) => id === a.viewport) -
          GLOBAL_CONVERGENCE_VIEWPORTS.findIndex(({ id }) => id === b.viewport),
    ),
  });

  test('the measured evidence grants every global convergence result', async () => {
    const routeIds = routes.map(({ id }) => id);
    const artifact = assemble(globalConvergenceEvidenceFingerprint({ root: ROOT, routeIds }));
    const measured = readGlobalConvergenceEvidence({
      artifact,
      fingerprint: artifact.fingerprint,
      routeIds,
    });

    const verdicts = globalConvergenceVerdicts(measured, SOCIAL);
    for (const [assertionId, members] of Object.entries(verdicts)) {
      const failures = [...members.values()].flatMap(({ id, failures: list }) =>
        list.map((failure) => `${id}: ${failure}`),
      );
      expect(failures, assertionId).toEqual([]);
    }
    for (const assertionId of Object.keys(ROUTE_ROW_PREDICATES)) {
      expect([...verdicts[assertionId].keys()].sort(), assertionId).toEqual([...routeIds].sort());
    }
    for (const assertionId of FRAME_ROWS) {
      expect([...verdicts[assertionId].keys()], assertionId).toEqual(
        GLOBAL_CONVERGENCE_VIEWPORTS.map(({ frame }) => frame),
      );
    }
    expect([...verdicts[VIEWPORT_PAIR_ROW].keys()].sort()).toEqual([...routeIds].sort());
    expect([...verdicts['VAL-B2-GRID-002'].keys()]).toEqual([...SURFACE_FAMILIES]);
    expect([...verdicts['VAL-B2-SURF-011'].keys()]).toEqual([...REPRESENTATIVE_SURFACES]);

    const artifactPath = join(ROOT, GLOBAL_CONVERGENCE_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });

  /**
   * The plant proof, on the corpus just measured: a defect planted on one
   * route has to fail that route under exactly the rows that own its
   * predicate, a planted frame defect has to fail only its frame, and a
   * planted type tuple only its population, a planted width difference only
   * its route and a planted surface defect only its surface; otherwise these
   * rows are one boolean wearing thirty-six names.
   */
  test('the global verdicts fail independently when their subjects are broken', async () => {
    const routeIds = routes.map(({ id }) => id);
    const measured = readGlobalConvergenceEvidence({
      artifact: assemble('planted'),
      fingerprint: 'planted',
      routeIds,
    });
    const plant = (change: (planted: GlobalConvergenceEvidence) => void) => {
      const copy = JSON.parse(JSON.stringify(measured)) as GlobalConvergenceEvidence;
      change(copy);
      return copy;
    };
    const failing = (verdicts: Map<string, { failures: string[] }>) =>
      [...verdicts.entries()].filter(([, { failures }]) => failures.length > 0).map(([id]) => id);
    // The last registered route: a route a hand-picked sample would skip.
    const target = routes[routes.length - 1];
    const at = (evidence: GlobalConvergenceEvidence, viewport: string) =>
      evidence.observations.find((row) => row.routeId === target.id && row.viewport === viewport)!;

    const predicates = [...new Set(Object.values(ROUTE_ROW_PREDICATES).flat())].filter(
      (predicate) => predicate !== 'focus-ring',
    );
    for (const predicate of predicates) {
      const planted = plant((e) =>
        at(e, '1440x900').page.findings.push({
          predicate,
          element: 'div[data-planted]',
          detail: 'planted',
          exemption: null,
        }),
      );
      for (const [assertionId, owned] of Object.entries(ROUTE_ROW_PREDICATES)) {
        expect(failing(routeRowVerdicts(planted, assertionId)), `${predicate} under ${assertionId}`).toEqual(
          owned.includes(predicate) ? [target.id] : [],
        );
      }
    }
    const blueRing = plant((e) => {
      const stop = at(e, '375x812').focus.find(Boolean)!;
      stop.exemption = null;
      stop.outlineColour = 'rgb(36, 95, 255)';
    });
    expect(failing(routeRowVerdicts(blueRing, 'VAL-B2-COL-006'))).toEqual([target.id]);

    const frameCases: Array<[string, (e: GlobalConvergenceEvidence) => void, string[]]> = [
      [
        'an unregistered 7 px margin',
        (e) =>
          at(e, '375x812').page.offLadderSpacing.push({
            valuePx: 7,
            property: 'marginTop',
            count: 1,
            element: 'div[data-planted]',
            exemption: null,
          }),
        ['VAL-B2-SPACE-001', 'VAL-B2-SPACE-005', 'VAL-B2-GRID-001'],
      ],
      [
        'a block off every line of its frame',
        (e) =>
          at(e, '375x812').page.findings.push({
            predicate: 'composition-offgrid',
            element: 'section[data-planted]',
            detail: 'planted',
            exemption: null,
          }),
        ['VAL-B2-GRID-001'],
      ],
      [
        'text 8 px from the edge',
        (e) =>
          at(e, '375x812').page.findings.push({
            predicate: 'inline-padding',
            element: 'p[data-planted]',
            detail: 'planted',
            exemption: null,
          }),
        ['VAL-B2-SPACE-002'],
      ],
      [
        'a section 40 px under the last block',
        (e) => at(e, '375x812').page.sectionGaps.push({ element: 'h2[data-planted]', gapPx: 40, exemption: null }),
        ['VAL-B2-SPACE-003'],
      ],
      [
        'a 1100 px paragraph',
        (e) => (at(e, '375x812').page.frame.widestParagraphPx = 1100),
        ['VAL-B2-SPACE-004'],
      ],
      [
        'an h1 no frame owns',
        (e) => (at(e, '375x812').page.frame.owners = []),
        ['VAL-B2-SPACE-005'],
      ],
      [
        'a heading broken inside a word',
        (e) =>
          at(e, '375x812').page.findings.push({
            predicate: 'broken-word',
            element: 'h1[data-planted]',
            detail: 'planted',
            exemption: null,
          }),
        ['VAL-B2-SPACE-006'],
      ],
      [
        'a focused control under an overlay',
        (e) => {
          const stop = at(e, '375x812').focus.find(Boolean)!;
          stop.exemption = null;
          stop.obscuredBy = 'div.planted-overlay';
        },
        ['VAL-B2-SPACE-006'],
      ],
    ];
    for (const [label, change, rows] of frameCases) {
      const planted = plant(change);
      for (const assertionId of FRAME_ROWS) {
        expect(failing(frameRowVerdicts(planted, assertionId)), `${label} under ${assertionId}`).toEqual(
          rows.includes(assertionId) ? ['frame:mobile'] : [],
        );
      }
    }

    for (const population of Object.keys(TYPE_POPULATIONS)) {
      const planted = plant((e) => {
        const row = at(e, '1440x900');
        row.page.typeTuples.push({
          population,
          family: 'Tektur',
          weight: 400,
          sizePx: 16,
          lineHeightRatio: 1.5,
          trackingEm: 0,
          transform: 'none',
          parentSizeRatio: 1,
          maxLineWidthPx: 100,
          count: 1,
          element: 'span[data-planted]',
          text: 'planted',
          exemption: null,
        });
      });
      expect(failing(typePopulationVerdicts(planted)), population).toEqual([population]);
    }

    // A phone reading with more devices, or less content, than the desktop
    // reading fails that route alone.
    const crowded = plant((e) => {
      const phone = at(e, '375x812').page;
      phone.counts.registeredDevices = (at(e, '1440x900').page.counts.registeredDevices ?? 0) + 1;
    });
    expect(failing(viewportPairVerdicts(crowded))).toEqual([target.id]);
    const lost = plant((e) => (at(e, '768x1024').page.content.digest = '00000000'));
    expect(failing(viewportPairVerdicts(lost))).toEqual([target.id]);

    // A surface-family defect fails its own surface and no other.
    const home = routes.find(({ path }) => path === '/')!;
    const bare = plant((e) => {
      const row = e.observations.find((o) => o.routeId === home.id && o.viewport === '375x812')!;
      row.page.counts.alignedDevices = 0;
      row.page.counts.materialSurfaces = 0;
    });
    expect(failing(surfaceFamilyVerdicts(bare, 'VAL-B2-GRID-002', SOCIAL))).toEqual(['home', 'shell']);
    expect(failing(surfaceFamilyVerdicts(bare, 'VAL-B2-SURF-011', SOCIAL))).toEqual(['home']);
    const strayCard = { ...SOCIAL, cards: SOCIAL.cards.map((card, i) => (i === 0 ? { ...card, devices: [] } : card)) };
    expect(failing(surfaceFamilyVerdicts(measured, 'VAL-B2-GRID-002', strayCard))).toEqual(['social-artwork']);
    const unstable = {
      ...SOCIAL,
      cards: SOCIAL.cards.map((card, i) =>
        i === 0 ? { ...card, pixels: { ...card.pixels, secondRenderSha256: 'planted' } } : card,
      ),
    };
    expect(failing(surfaceFamilyVerdicts(measured, 'VAL-B2-SURF-011', unstable))).toEqual(['social-artwork']);

    // Omitted, extra and empty evidence is refused before any verdict.
    expect(() =>
      readGlobalConvergenceEvidence({
        artifact: plant((e) => {
          e.routeIds = e.routeIds.filter((id) => id !== target.id);
          e.observations = e.observations.filter((row) => row.routeId !== target.id);
        }),
        fingerprint: 'planted',
        routeIds,
      }),
    ).toThrow(/dropped: route:/);
    expect(() =>
      readGlobalConvergenceEvidence({
        artifact: plant((e) => e.observations.splice(e.observations.indexOf(at(e, '768x1024')), 1)),
        fingerprint: 'planted',
        routeIds,
      }),
    ).toThrow(/missing 1 route\/viewport reading/);
    expect(() =>
      readGlobalConvergenceEvidence({ artifact: assemble('planted'), fingerprint: 'current', routeIds }),
    ).toThrow(/stale/);
    expect(() =>
      readGlobalConvergenceEvidence({
        artifact: plant((e) => {
          for (const row of e.observations) row.page.counts.primaryActions = 0;
        }),
        fingerprint: 'planted',
        routeIds,
      }),
    ).toThrow(/no primaryActions anywhere/);
  });
});
