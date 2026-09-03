import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page } from '@playwright/test';
import { brandV2Registry, expect, test } from './brand-v2-static-fixture';
import {
  FIRST_PARTY_TYPE_ROLES,
  TEKTUR_ASSIGNED_STRINGS,
  TEKTUR_OG_ROLE_ID,
  TEKTUR_ROLE_INSTANCES,
  type TekturRoleInstance,
} from '../../data/type-roles';
import { BRAND_V2_RESPONSIVE_VIEWPORTS } from '../../lib/brand-v2-responsive-viewports';
import {
  SCOPED_FONT_FAMILY_EXCEPTIONS,
  TEKTUR_DELIVERY_EVIDENCE_PATH,
  deriveTypographyStackProperties,
  measureTekturEvidence,
  normalizeFontFamilyName,
  tekturDeliveryFingerprint,
  type TekturDeliveryEvidence,
} from '../../lib/brand-v2-tektur-evidence';
import { deriveTekturRoleOccurrences } from '../../lib/tektur-role-occurrences';
import { readFileSync } from 'node:fs';

/**
 * VAL-B2-TYPE-015 requires the rendered axis values to match the registry
 * "at every declared viewport", so the sweep is the canonical width
 * population derived from the declaring documents. Retyping a subset here is
 * how a width-specific role override escapes the gate entirely.
 */
const VIEWPORTS = BRAND_V2_RESPONSIVE_VIEWPORTS;

/**
 * The route population is derived from source, not chosen by the registry
 * being tested. A hand-typed `routes` array named three shell routes while
 * `app/layout.tsx` mounts the shell on all 62, and one article while the
 * shared template renders `article-h1` on all 47, so every genuine
 * occurrence outside the list went unmeasured.
 */
const OCCURRENCES = deriveTekturRoleOccurrences();
const SWEPT_ROUTES = OCCURRENCES.routes.map(({ route }) => route);
const NOT_FOUND_ROUTE = brandV2Registry.routes.notFound.path;
const REGISTERED_ROLE_IDS = TEKTUR_ROLE_INSTANCES.map(({ id }) => id);
const REGISTERED_CLASSES = TEKTUR_ROLE_INSTANCES.map(
  ({ cssClass }) => cssClass,
);
const ROOT = process.cwd();
const CSS = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
const STACK_PROPERTIES = deriveTypographyStackProperties(CSS);
const MATH_SCOPE = SCOPED_FONT_FAMILY_EXCEPTIONS[0].scope;

type RoleOccurrence = {
  role: string;
  family: string;
  weight: string;
  stretch: string;
  variationSettings: string;
  text: string;
};

type RouteMeasurement = {
  /** Every role annotation present, registered or not. */
  occurrences: RoleOccurrence[];
  /** Elements carrying a registered display class but no role annotation. */
  unannotatedClassUses: string[];
  /**
   * Every computed `font-family` head the document resolved, and which of
   * them at least one element outside rendered mathematics resolved.
   * VAL-B2-TYPE-001 quantifies over the families production typography
   * uses, so the scan still walks every element rather than only the
   * annotated display roles: a fifth family on an unannotated surface has
   * to be a failure, not an invisible one.
   *
   * Sets rather than element tallies, because the tally is not
   * reproducible. The Next.js client runtime appends nodes of its own after
   * hydration — `<next-route-announcer>` in the body and `<link>` preload
   * and prefetch hints in the head — on scheduler timing this sweep cannot
   * observe a settled state for. They inherit the UI body family, so they
   * moved the IBM Plex Sans tally between identical runs while never
   * changing which families were resolved.
   */
  familyHeads: string[];
  headsOutsideMath: string[];
  /** Font resources the document requested, split by origin. */
  sameOriginFontPaths: string[];
  foreignOriginFontUrls: string[];
};

function measureDocument(input: {
  classes: string[];
  mathScope: string;
}): RouteMeasurement {
  const occurrences = [
    ...document.querySelectorAll<HTMLElement>('[data-tektur-role]'),
  ].map((element) => {
    const style = getComputedStyle(element);
    return {
      role: element.getAttribute('data-tektur-role') ?? '',
      family: style.fontFamily,
      weight: style.fontWeight,
      stretch: style.fontStretch,
      variationSettings: style.fontVariationSettings,
      text: (element.textContent ?? '').trim().slice(0, 40),
    };
  });
  const unannotatedClassUses = input.classes.flatMap((cssClass) =>
    [...document.querySelectorAll<HTMLElement>(`.${cssClass}`)]
      .filter(
        (element) => (element.getAttribute('data-tektur-role') ?? '') === '',
      )
      .map((element) => `${cssClass}:${element.tagName.toLowerCase()}`),
  );

  const familyHeads = new Set<string>();
  const headsOutsideMath = new Set<string>();
  for (const element of document.querySelectorAll('*')) {
    const stack = getComputedStyle(element).fontFamily;
    const head = (stack.split(',')[0] ?? '')
      .trim()
      .replace(/^["']|["']$/g, '');
    familyHeads.add(head);
    if (!element.closest(input.mathScope)) headsOutsideMath.add(head);
  }

  const sameOrigin = new Set<string>();
  const foreign = new Set<string>();
  for (const entry of performance.getEntriesByType('resource')) {
    const timing = entry as PerformanceResourceTiming;
    if (
      timing.initiatorType !== 'font' &&
      !/\.(?:woff2?|ttf|otf)(?:$|\?)/i.test(entry.name)
    ) {
      continue;
    }
    const url = new URL(entry.name);
    // The static fixture serves from an OS-assigned port, so the origin is
    // dropped from same-origin paths: a port in a committed artifact would
    // churn on every run.
    if (url.origin === location.origin) sameOrigin.add(`${url.pathname}${url.search}`);
    else foreign.add(entry.name);
  }

  return {
    occurrences,
    unannotatedClassUses,
    familyHeads: [...familyHeads].sort(),
    headsOutsideMath: [...headsOutsideMath].sort(),
    sameOriginFontPaths: [...sameOrigin].sort(),
    foreignOriginFontUrls: [...foreign].sort(),
  };
}

type DeliveryProbe = {
  stacks: Record<string, string>;
  wordmark: {
    family: string;
    weight: string;
    stretch: string;
    variationSettings: string;
  };
  assignedStrings: Array<{
    id: string;
    loaded: boolean;
    tekturAdvance: number;
    fallbackAdvance: number;
  }>;
  tekturFamily: string;
  resources: string[];
  origin: string;
};

function measureDelivery(input: {
  stackProperties: string[];
  assignedStrings: Array<{ id: string; text: string }>;
}): DeliveryProbe {
  const rootStyle = getComputedStyle(document.documentElement);
  const family = rootStyle.getPropertyValue('--font-tektur').trim();
  // Measured on the page's own wordmark rather than an injected probe: a
  // span this test creates and styles proves only that the test can set a
  // font-family.
  const wordmarkElement = document.querySelector<HTMLElement>(
    '[data-tektur-role="home-wordmark"]',
  );
  if (!wordmarkElement) throw new Error('home wordmark Tektur role missing');
  const wordmarkStyle = getComputedStyle(wordmarkElement);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas context unavailable');
  const round = (value: number): number => Math.round(value * 100) / 100;
  const assignedStrings = input.assignedStrings.map(({ id, text }) => {
    context.font = `600 32px ${family}`;
    const tekturAdvance = round(context.measureText(text).width);
    context.font = '600 32px monospace';
    const fallbackAdvance = round(context.measureText(text).width);
    return {
      id,
      loaded: document.fonts.check(`600 32px ${family}`, text),
      tekturAdvance,
      fallbackAdvance,
    };
  });

  return {
    stacks: Object.fromEntries(
      input.stackProperties.map((property) => [
        property,
        rootStyle.getPropertyValue(property).trim(),
      ]),
    ),
    wordmark: {
      family: wordmarkStyle.fontFamily,
      weight: wordmarkStyle.fontWeight,
      stretch: wordmarkStyle.fontStretch,
      variationSettings: wordmarkStyle.fontVariationSettings,
    },
    assignedStrings,
    tekturFamily: family,
    resources: performance
      .getEntriesByType('resource')
      .filter(
        (entry) =>
          (entry as PerformanceResourceTiming).initiatorType === 'font' ||
          /\.(?:woff2?|ttf|otf)(?:$|\?)/i.test(entry.name),
      )
      .map(({ name }) => name),
    origin: location.origin,
  };
}

type Sweep = {
  measured: Map<string, RouteMeasurement>;
  delivery: DeliveryProbe;
  deliveryRoute: string;
  deliveryViewportId: string;
};

const sweepKey = (route: string, viewportId: string): string =>
  `${route} @${viewportId}`;

let sweepCache: Sweep | null = null;

/**
 * One sweep per file. The viewport is set before navigation rather than
 * resized afterwards, so a component that decides what to render from the
 * width it mounted at is measured at that width instead of being resized
 * into a state it never renders in production.
 */
async function sweep(page: Page, base: string): Promise<Sweep> {
  if (sweepCache) return sweepCache;
  const measured = new Map<string, RouteMeasurement>();
  for (const route of SWEPT_ROUTES) {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      const response = await page.goto(`${base}${route}`);
      expect(
        response?.status(),
        `${route} @${viewport.id} did not serve its document`,
        // The export writes the not-found document to `404/index.html` as
        // well, so every swept route resolves to a real 200 document.
      ).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      measured.set(
        sweepKey(route, viewport.id),
        await page.evaluate(measureDocument, {
          classes: REGISTERED_CLASSES,
          mathScope: MATH_SCOPE,
        }),
      );
    }
  }
  // Font delivery is not width-dependent, so the resource, stack and glyph
  // probes run at a single viewport — the widest declared one, taken from
  // the derived population rather than retyped.
  const widest = VIEWPORTS.at(-1);
  expect(widest, 'declared viewport population').toBeDefined();
  await page.setViewportSize({
    width: widest?.width ?? 0,
    height: widest?.height ?? 0,
  });
  await page.goto(`${base}/`);
  await page.evaluate(() => document.fonts.ready);
  const delivery = await page.evaluate(measureDelivery, {
    stackProperties: STACK_PROPERTIES,
    assignedStrings: TEKTUR_ASSIGNED_STRINGS.map(({ id, text }) => ({
      id,
      text,
    })),
  });
  sweepCache = {
    measured,
    delivery,
    deliveryRoute: '/',
    deliveryViewportId: widest?.id ?? '',
  };
  return sweepCache;
}

/**
 * Builds the persisted artifact out of the sweep.
 *
 * The nine Tektur assertions used to take their `passed` status from a
 * hand-maintained `COMPLETED_TEKTUR_ASSERTIONS` set in the enforcement
 * generator, so a route-specific axis defect, a third-party font request or
 * a cmap hole could coexist with freshly regenerated green evidence. This is
 * the measurement that replaces the declaration.
 */
function buildArtifact(result: Sweep): TekturDeliveryEvidence {
  const roleObservations: TekturDeliveryEvidence['roleObservations'] = [];
  const axisTuples = new Map<
    string,
    TekturDeliveryEvidence['roleAxes'][number]
  >();
  const unannotated = new Set<string>();
  const familyObservations: TekturDeliveryEvidence['familyObservations'] = [];

  for (const route of SWEPT_ROUTES) {
    const perWidth = VIEWPORTS.map((viewport) => {
      const observation = result.measured.get(sweepKey(route, viewport.id));
      if (!observation) {
        throw new Error(`${route} @${viewport.id} was not measured`);
      }
      return { viewport, observation };
    });
    for (const { viewport, observation } of perWidth) {
      const roles: Record<string, number> = {};
      for (const occurrence of observation.occurrences) {
        roles[occurrence.role] = (roles[occurrence.role] ?? 0) + 1;
        const key = [
          occurrence.role,
          occurrence.family,
          occurrence.weight,
          occurrence.stretch,
          occurrence.variationSettings,
        ].join('|');
        const existing = axisTuples.get(key);
        axisTuples.set(key, {
          role: occurrence.role,
          family: occurrence.family,
          weight: occurrence.weight,
          stretch: occurrence.stretch,
          variationSettings: occurrence.variationSettings,
          elements: (existing?.elements ?? 0) + 1,
        });
      }
      roleObservations.push({ route, viewportId: viewport.id, roles });
      for (const use of observation.unannotatedClassUses) {
        unannotated.add(`${route} @${viewport.id}: ${use}`);
      }
      // One entry per declared width rather than a union over them: a
      // component that only mounts below a breakpoint resolves families no
      // desktop-width document contains, and the width it appeared at is
      // part of the record instead of being summed away.
      familyObservations.push({
        route,
        viewportId: viewport.id,
        heads: observation.familyHeads,
        headsOutsideMath: observation.headsOutsideMath,
      });
    }
  }

  const sameOrigin = new Set<string>();
  const foreign = new Set<string>();
  let withFontRequest = 0;
  let mixingForeign = 0;
  for (const observation of result.measured.values()) {
    for (const path of observation.sameOriginFontPaths) sameOrigin.add(path);
    for (const url of observation.foreignOriginFontUrls) foreign.add(url);
    if (
      observation.sameOriginFontPaths.length +
        observation.foreignOriginFontUrls.length >
      0
    ) {
      withFontRequest += 1;
    }
    if (observation.foreignOriginFontUrls.length > 0) mixingForeign += 1;
  }

  return {
    version: 1,
    fingerprint: tekturDeliveryFingerprint({
      root: ROOT,
      css: CSS,
      occurrences: OCCURRENCES,
    }),
    viewports: VIEWPORTS,
    routes: SWEPT_ROUTES,
    roleObservations,
    roleAxes: [...axisTuples.values()].sort((left, right) =>
      left.role === right.role
        ? left.family.localeCompare(right.family)
        : left.role.localeCompare(right.role),
    ),
    unannotatedDisplayClassUses: [...unannotated].sort(),
    familyObservations,
    fontResources: {
      sameOriginPaths: [...sameOrigin].sort(),
      foreignOrigin: [...foreign].sort(),
      observationsWithFontRequest: withFontRequest,
      observationsMixingForeignOrigin: mixingForeign,
    },
    delivery: {
      route: result.deliveryRoute,
      viewportId: result.deliveryViewportId,
      stacks: result.delivery.stacks,
      wordmark: {
        role: TEKTUR_OG_ROLE_ID,
        family: result.delivery.wordmark.family,
        weight: result.delivery.wordmark.weight,
        stretch: result.delivery.wordmark.stretch,
        variationSettings: result.delivery.wordmark.variationSettings,
      },
    },
    assignedStringProbes: result.delivery.assignedStrings,
  };
}

test.describe('Tektur role population', () => {
  test('renders the derived role occurrences with registry axes on every public route at every declared viewport (VAL-B2-TYPE-015)', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    expect(VIEWPORTS.length, 'declared viewport population').toBeGreaterThan(1);
    expect(SWEPT_ROUTES.length, 'derived route population').toBeGreaterThan(1);

    const registered = new Map<string, TekturRoleInstance>(
      TEKTUR_ROLE_INSTANCES.map((instance) => [instance.id, instance]),
    );
    const result = await sweep(page, staticBase);
    const measured = result.measured;
    // The sweep has to have visited the whole cross product; a route or a
    // width dropped from the loop would otherwise reduce the population
    // silently, which is the defect this gate exists to prevent.
    expect(measured.size, 'route x viewport observations').toBe(
      SWEPT_ROUTES.length * VIEWPORTS.length,
    );

    const failures: string[] = [];
    const observedRoutesByRole = new Map<string, Set<string>>();
    let occurrenceCount = 0;
    for (const { route, roles: expectedRoles } of OCCURRENCES.routes) {
      const perViewportCounts = new Set<number>();
      for (const viewport of VIEWPORTS) {
        const where = `${route} @${viewport.id}`;
        const observation = measured.get(sweepKey(route, viewport.id));
        if (!observation) {
          failures.push(`${where}: not measured`);
          continue;
        }
        occurrenceCount += observation.occurrences.length;
        perViewportCounts.add(observation.occurrences.length);

        const observedRoles = [
          ...new Set(observation.occurrences.map(({ role }) => role)),
        ].sort();
        if (observedRoles.join(',') !== expectedRoles.join(',')) {
          failures.push(
            `${where}: renders roles [${observedRoles.join(', ')}], source derives [${expectedRoles.join(', ')}]`,
          );
        }
        for (const use of observation.unannotatedClassUses) {
          failures.push(
            `${where}: display class without a role annotation (${use})`,
          );
        }

        observation.occurrences.forEach((occurrence, index) => {
          const routes = observedRoutesByRole.get(occurrence.role) ?? new Set();
          routes.add(route);
          observedRoutesByRole.set(occurrence.role, routes);

          const at = `${where}: ${occurrence.role}[${index}] "${occurrence.text}"`;
          const instance = registered.get(occurrence.role);
          if (!instance) {
            failures.push(`${at} is not a registered role`);
            return;
          }
          if (!occurrence.family.toLowerCase().includes('tektur')) {
            failures.push(`${at} resolves ${occurrence.family}, not Tektur`);
          }
          if (occurrence.weight !== String(instance.wght)) {
            failures.push(
              `${at} computes weight ${occurrence.weight}, registry says ${instance.wght}`,
            );
          }
          if (occurrence.stretch !== `${instance.wdth}%`) {
            failures.push(
              `${at} computes stretch ${occurrence.stretch}, registry says ${instance.wdth}%`,
            );
          }
          if (!occurrence.variationSettings.includes(`"wght" ${instance.wght}`)) {
            failures.push(
              `${at} carries ${occurrence.variationSettings}, registry says "wght" ${instance.wght}`,
            );
          }
          if (!occurrence.variationSettings.includes(`"wdth" ${instance.wdth}`)) {
            failures.push(
              `${at} carries ${occurrence.variationSettings}, registry says "wdth" ${instance.wdth}`,
            );
          }
        });
      }
      // Nothing in the shipped shell renders a different number of role
      // occurrences at a different width; the annotations live in the static
      // document and responsive behaviour is CSS. A width-dependent count is
      // a client component swapping markup, which the per-width role sets
      // above would only catch if the swap removed the last occurrence.
      if (perViewportCounts.size > 1) {
        failures.push(
          `${route}: role occurrence count varies by width (${[...perViewportCounts].join(', ')})`,
        );
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
    expect(occurrenceCount, 'measured role occurrences').toBeGreaterThan(0);

    // Exact in both directions, per role: a role that stops rendering on a
    // subset of the routes source says render it fails here even though every
    // route it still renders on passes.
    for (const role of REGISTERED_ROLE_IDS) {
      expect(
        [...(observedRoutesByRole.get(role) ?? [])].sort(),
        `routes rendering ${role} must equal the routes source derives`,
      ).toEqual([...(OCCURRENCES.routesByRole[role] ?? [])].sort());
    }

    const artifact = buildArtifact(result);
    const artifactPath = join(ROOT, TEKTUR_DELIVERY_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
    // Fails here rather than in the enforcement generator if the artifact
    // this run just wrote would not satisfy the reader that has to accept it.
    const measurements = measureTekturEvidence({
      artifact,
      root: ROOT,
      css: CSS,
    });
    expect(
      Object.keys(measurements.roles).sort(),
      'every registered role must carry a measurement',
    ).toEqual([...REGISTERED_ROLE_IDS].sort());
  });

  test('registers exactly the roles first-party source writes, each reaching a public route', () => {
    expect(
      [...REGISTERED_ROLE_IDS].sort(),
      'registered roles must be exactly the roles source writes',
    ).toEqual([...OCCURRENCES.writtenRoles].sort());
    expect(
      [...SWEPT_ROUTES].sort(),
      'the swept routes must be exactly the registered public destinations plus 404',
    ).toEqual(
      [
        ...brandV2Registry.routes.public.map(({ path }) => path),
        NOT_FOUND_ROUTE,
      ].sort(),
    );
    for (const instance of TEKTUR_ROLE_INSTANCES) {
      expect(
        [...instance.definedIn].sort(),
        `${instance.id} definedIn must be exactly the modules that write it`,
      ).toEqual([...(OCCURRENCES.writerModulesByRole[instance.id] ?? [])].sort());
      expect(
        OCCURRENCES.routesByRole[instance.id] ?? [],
        `${instance.id} must be reachable from at least one route entry`,
      ).not.toEqual([]);
    }
  });
});

test.describe('Tektur web typography population', () => {
  /**
   * VAL-B2-TYPE-001's population is every family production typography
   * resolves, not the four registry rows: an unauthorized fifth family on an
   * unannotated surface has to fail rather than go unmeasured. The scoped
   * KaTeX and MathML exceptions are enumerated and each one is required to
   * stay inside rendered mathematics, because the assertion says an
   * exception "never substitutes for a first-party role".
   */
  test('resolves exactly the four registered first-party families on every route, with bounded scoped exceptions (VAL-B2-TYPE-001)', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    const result = await sweep(page, staticBase);
    const measurements = measureTekturEvidence({
      artifact: buildArtifact(result),
      root: ROOT,
      css: CSS,
    });

    expect(
      measurements.families.approved.map(({ family }) => family).sort(),
      'measured first-party families',
    ).toEqual(FIRST_PARTY_TYPE_ROLES.map(({ family }) => family).sort());
    expect(
      measurements.families.routesMeasured,
      'routes whose complete font-family population was measured',
    ).toBe(SWEPT_ROUTES.length);
    expect(
      measurements.families.observationsMeasured,
      'route x width documents whose complete font-family population was measured',
    ).toBe(SWEPT_ROUTES.length * VIEWPORTS.length);
    expect(
      measurements.families.unapprovedHeadObservations,
      'documents resolving a font family that is neither first-party nor a scoped exception',
    ).toBe(0);
    for (const member of measurements.families.approved) {
      expect(
        member.observations,
        `${member.family} documents resolving it`,
      ).toBeGreaterThan(0);
    }

    const approvedFaces = new Set(
      FIRST_PARTY_TYPE_ROLES.map(({ family }) =>
        normalizeFontFamilyName(family),
      ),
    );
    const exceptionHeads = new Set(
      measurements.families.scopedExceptions.flatMap(({ heads }) => heads),
    );
    // Exact in both directions over the measured population: every head is
    // an approved family or an enumerated exception, and nothing else.
    const heads = new Set(
      measurements.delivery.familyObservations.flatMap((observation) =>
        observation.heads.map(normalizeFontFamilyName),
      ),
    );
    expect([...heads].sort(), 'every resolved font-family head').toEqual(
      [...new Set([...approvedFaces, ...exceptionHeads])].sort(),
    );
    expect(exceptionHeads.size, 'observed scoped exception faces')
      .toBeGreaterThan(0);
    for (const exception of measurements.families.scopedExceptions) {
      for (const head of exception.heads) {
        expect(approvedFaces.has(head), `${head} must not be first-party`).toBe(
          false,
        );
      }
    }
  });
});

test.describe('Tektur web delivery', () => {
  test('loads the local variable face without a third-party request or glyph fallback', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    const { delivery } = await sweep(page, staticBase);

    expect(delivery.tekturFamily.toLowerCase()).toContain('tektur');
    expect(delivery.wordmark.family.toLowerCase()).toContain('tektur');
    expect(delivery.wordmark.weight).toBe('600');
    expect(delivery.wordmark.stretch).toBe('100%');
    expect(delivery.wordmark.variationSettings).toContain('"wght" 600');
    expect(delivery.wordmark.variationSettings).toContain('"wdth" 100');
    expect(
      Object.keys(delivery.stacks).sort(),
      'the declared typography stacks must all resolve',
    ).toEqual([...STACK_PROPERTIES].sort());
    for (const property of STACK_PROPERTIES) {
      expect(delivery.stacks[property], property).not.toBe('');
    }

    expect(
      delivery.assignedStrings.length,
      'assigned strings probed for per-glyph fallback',
    ).toBe(TEKTUR_ASSIGNED_STRINGS.length);
    for (const probe of delivery.assignedStrings) {
      expect(probe.loaded, `${probe.id} loaded`).toBe(true);
      expect(probe.tekturAdvance, `${probe.id} Tektur advance`).toBeGreaterThan(
        0,
      );
      expect(
        probe.tekturAdvance,
        `${probe.id} must not measure the generic fallback advance`,
      ).not.toBe(probe.fallbackAdvance);
    }

    expect(delivery.resources.length).toBeGreaterThan(0);
    expect(delivery.resources).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/_next\/static\/media\/.+\.woff2(?:$|\?)/i),
      ]),
    );
    expect(
      delivery.resources.every(
        (url) => new URL(url).origin === delivery.origin,
      ),
    ).toBe(true);
    expect(delivery.resources).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/fonts\.(?:googleapis|gstatic)\.com/i),
        expect.stringMatching(/Tektur-SemiBold\.ttf/i),
      ]),
    );
  });
});
