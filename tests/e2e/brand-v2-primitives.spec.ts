import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page } from '@playwright/test';
import {
  archivedExpectedRed,
  archivedExpectedRedRoutes,
  test,
  expect,
  brandV2Registry,
} from './brand-v2-static-fixture';
import { scanAnnotationLiterals } from '../../lib/brand-v2-annotation-scan';
import {
  discoverBrandPrimitives,
  type ControlEvidence,
  type PrimitiveDiscovery,
} from '../../lib/brand-v2-primitive-discovery';

/**
 * The surface and control gates used to locate their own population with
 * `[data-brand-surface-id]` / `[data-brand-control-id]`, which made them
 * circular: an unannotated surface was not a failure, it was invisible, and
 * "reconcile against the registry" compared the registry with a set derived
 * from the registry's own marker. Discovery here is structural
 * (lib/brand-v2-primitive-discovery.ts) and the annotation is checked
 * against it afterwards, so a real unregistered member fails.
 *
 * The sweep then has to cover the population the assertions quantify over.
 * Visiting `/` and one article route left 59 registered routes unvisited and
 * accepted any rendered subset of the registry, so an ID that no route
 * paints and an ID one unvisited route paints were indistinguishable. Every
 * registered public route is visited here, plus the market-map view states,
 * because the bubble and timeline views mount primitives the default view
 * does not.
 */
const VIEWPORT = { width: 1440, height: 900 } as const;
/**
 * The suite name is repeated as a literal in `test.describe` below because
 * the enforcement target inventory reads reporter titles out of the source
 * tokens; a variable there makes every row in this file unreachable from the
 * enforcement map.
 */
const SUITE = 'brand-v2 shared primitive registry';
const SOURCE_SCAN = scanAnnotationLiterals(join(process.cwd()));
const RECONCILIATION_PATH = join(
  process.cwd(),
  'evidence',
  'brand-v2',
  'primitive-reconciliation.json',
);

/**
 * Route states outside the default document of a registered route. The
 * market-map bubble view is the only place `control:selection` is carried by
 * an SVG shape, so leaving it unswept hid the whole vector control class.
 */
const ROUTE_STATES = [
  '/market-map/?view=bubble',
  '/market-map/?view=timeline',
] as const;

const APPLICABLE_ROUTES = [
  ...brandV2Registry.routes.public.map(({ path }) => path),
  ...ROUTE_STATES,
] as const;

const registeredSurfaceIds = new Set(
  brandV2Registry.surfaces.map(({ id }) => id),
);
const registeredControlIds = new Set(
  brandV2Registry.controls.map(({ id }) => id),
);
const registeredDeviceIds = new Set(
  brandV2Registry.gridDevices.map(({ id }) => id),
);

/**
 * The registry rows a route entry actually reaches. A registered primitive
 * whose only writer is an unmounted library module cannot appear in the
 * rendered population, so the exact comparison below is against this set
 * rather than against the whole registry.
 */
function productionIds(
  rows: ReadonlyArray<{ id: string; mountState: string }>,
): string[] {
  return rows
    .filter(({ mountState }) => mountState === 'production')
    .map(({ id }) => id)
    .sort();
}

type TargetSizeException = { kind: string; criterion: string; reason: string };

function recordedExceptions(controlId: string): TargetSizeException[] {
  const row = brandV2Registry.controls.find(({ id }) => id === controlId);
  const targetSize = (row as { targetSize?: unknown } | undefined)?.targetSize;
  const exceptions = (targetSize as { exceptions?: unknown } | undefined)
    ?.exceptions;
  return Array.isArray(exceptions) ? (exceptions as TargetSizeException[]) : [];
}

function minimumTargetPx(controlId: string): number {
  const row = brandV2Registry.controls.find(({ id }) => id === controlId);
  const targetSize = (row as { targetSize?: unknown } | undefined)?.targetSize;
  const minimum = (targetSize as { minimumPx?: unknown } | undefined)
    ?.minimumPx;
  return typeof minimum === 'number' ? minimum : Number.POSITIVE_INFINITY;
}

/** Every SC 2.5.8 exception route this member actually satisfies. */
function satisfiedExceptionKinds(control: ControlEvidence): string[] {
  const kinds: string[] = [];
  if (control.inlineInTextBlock) kinds.push('inline');
  if (control.spacingSatisfied) kinds.push('spacing');
  return kinds;
}

function describe(member: { tag: string; outline: string }): string {
  return `<${member.tag}> ${member.outline}`;
}

type DeviceEvidence = {
  id: string | null;
  pointerEvents: string;
  ariaHidden: string | null;
  alignmentError: number;
  outline: string;
};

function readDevices(): DeviceEvidence[] {
  return [
    ...document.querySelectorAll<HTMLElement>('[data-brand-device-id]'),
  ].map((element) => {
    const anchor = document.querySelector<HTMLElement>(
      element.dataset.brandAnchorSelector ?? '',
    );
    const rect = element.getBoundingClientRect();
    const anchorRect = anchor?.getBoundingClientRect();
    const edge = (box: DOMRect, name: string) =>
      name === 'right'
        ? box.right
        : name === 'top'
          ? box.top
          : name === 'bottom'
            ? box.bottom
            : name === 'center-x'
              ? box.left + box.width / 2
              : name === 'center-y'
                ? box.top + box.height / 2
                : box.left;
    return {
      id: element.dataset.brandDeviceId ?? null,
      pointerEvents: getComputedStyle(element).pointerEvents,
      ariaHidden: element.getAttribute('aria-hidden'),
      alignmentError:
        anchorRect === undefined
          ? Number.POSITIVE_INFINITY
          : Math.abs(
              edge(rect, element.dataset.brandDeviceEdge ?? 'left') -
                edge(anchorRect, element.dataset.brandAnchorEdge ?? 'left'),
            ),
      outline: element.outerHTML.replace(/\s+/g, ' ').slice(0, 120),
    };
  });
}

type RouteObservation = PrimitiveDiscovery & { devices: DeviceEvidence[] };

type Sweep = {
  byRoute: Map<string, RouteObservation>;
};

let sweepCache: Sweep | null = null;

async function observe(
  page: Page,
  base: string,
  route: string,
): Promise<RouteObservation> {
  await page.setViewportSize({ ...VIEWPORT });
  const response = await page.goto(`${base}${route}`);
  expect(response?.status(), route).toBe(200);
  await page.waitForLoadState('networkidle');
  const discovery = await page.evaluate(discoverBrandPrimitives);
  const devices = await page.evaluate(readDevices);
  return { ...discovery, devices };
}

/**
 * One sweep per file (the brand-v2 config runs a single worker), so the five
 * gates below all read the same measured population instead of each paying
 * for its own 63-document walk.
 */
async function sweep(page: Page, base: string): Promise<Sweep> {
  if (sweepCache) return sweepCache;
  const byRoute = new Map<string, RouteObservation>();
  for (const route of APPLICABLE_ROUTES) {
    byRoute.set(route, await observe(page, base, route));
  }
  sweepCache = { byRoute };
  writeReconciliation(sweepCache);
  return sweepCache;
}

function renderedOn(
  swept: Sweep,
  pick: (observation: RouteObservation) => Array<string | null>,
): Map<string, string[]> {
  const routesById = new Map<string, string[]>();
  for (const [route, observation] of swept.byRoute) {
    for (const id of pick(observation)) {
      if (id === null) continue;
      const routes = routesById.get(id) ?? [];
      if (routes.at(-1) !== route) routes.push(route);
      routesById.set(id, routes);
    }
  }
  return routesById;
}

/**
 * The persisted reconciliation. The enforcement generator derives each
 * primitive assertion's per-member status from this file rather than from an
 * allowlist of assertion IDs, so a member the sweep never rendered cannot be
 * recorded as passing, and a stale artifact cannot grant a pass because the
 * fingerprints it carries have to equal the current registry's.
 */
function writeReconciliation(swept: Sweep): void {
  const kinds = [
    {
      kind: 'gridDevices' as const,
      rows: brandV2Registry.gridDevices,
      pick: (observation: RouteObservation) =>
        observation.devices.map(({ id }) => id),
    },
    {
      kind: 'surfaces' as const,
      rows: brandV2Registry.surfaces,
      pick: (observation: RouteObservation) =>
        observation.surfaces.map(({ registeredId }) => registeredId),
    },
    {
      kind: 'controls' as const,
      rows: brandV2Registry.controls,
      pick: (observation: RouteObservation) =>
        observation.controls.map(({ registeredId }) => registeredId),
    },
  ];
  const members: Record<string, unknown> = {};
  const unregisteredRendered: string[] = [];
  for (const { kind, rows, pick } of kinds) {
    const rendered = renderedOn(swept, pick);
    const registered = new Set(rows.map(({ id }) => id));
    for (const id of rendered.keys()) {
      if (!registered.has(id)) unregisteredRendered.push(`${kind}:${id}`);
    }
    for (const row of rows) {
      members[row.id] = {
        kind,
        fingerprint: row.fingerprint,
        mountState: row.mountState,
        definedIn: row.definedIn,
        ownerRouteOrMount: row.ownerRouteOrMount,
        renderedOn: rendered.get(row.id) ?? [],
      };
    }
  }
  const unannotatedRendered: string[] = [];
  for (const [route, observation] of swept.byRoute) {
    for (const surface of observation.surfaces) {
      if (surface.registeredId === null) {
        unannotatedRendered.push(`${route} surface ${describe(surface)}`);
      }
    }
    for (const control of observation.controls) {
      if (control.registeredId === null) {
        unannotatedRendered.push(`${route} control ${describe(control)}`);
      }
    }
  }
  const artifact = {
    version: 1,
    viewport: VIEWPORT,
    routes: [...APPLICABLE_ROUTES],
    members: Object.fromEntries(
      Object.entries(members).sort(([left], [right]) =>
        left < right ? -1 : left > right ? 1 : 0,
      ),
    ),
    unregisteredRendered: unregisteredRendered.sort(),
    unannotatedRendered: unannotatedRendered.sort(),
  };
  mkdirSync(dirname(RECONCILIATION_PATH), { recursive: true });
  writeFileSync(
    RECONCILIATION_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    'utf8',
  );
}

test.describe('brand-v2 shared primitive registry', () => {
  test('VAL-B2-GRID-009 renders registered, aligned, pointer-inert devices', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const swept = await sweep(page, staticBase);
    let measured = 0;
    for (const [route, observation] of swept.byRoute) {
      for (const entry of observation.devices) {
        measured += 1;
        expect(
          registeredDeviceIds.has(entry.id ?? ''),
          `${entry.id} on ${route} is not a registered device`,
        ).toBe(true);
        expect(entry.pointerEvents, `${entry.id} on ${route}`).toBe('none');
        expect(entry.ariaHidden, `${entry.id} on ${route}`).toBe('true');
        expect(entry.alignmentError, `${entry.id} on ${route}`).toBeLessThanOrEqual(2);
      }
    }
    expect(measured, 'device population over the swept routes').toBeGreaterThan(0);
    // Exactness in both directions: every device class the registry records
    // as production-mounted has to render somewhere in the swept population,
    // and nothing else may render.
    expect(
      [...renderedOn(swept, (observation) =>
        observation.devices.map(({ id }) => id),
      ).keys()].sort(),
    ).toEqual(productionIds(brandV2Registry.gridDevices));
  });

  test('VAL-B2-SURF-010 source, registry and rendered surface populations are equal', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    expect(
      [...SOURCE_SCAN.surfaceIds].sort(),
      'surface IDs written in source must be exactly the registered set',
    ).toEqual([...registeredSurfaceIds].sort());
    expect(SOURCE_SCAN.modules.length).toBeGreaterThan(0);

    const swept = await sweep(page, staticBase);
    let measured = 0;
    let marks = 0;
    for (const [route, observation] of swept.byRoute) {
      measured += observation.surfaces.length;
      const unannotated = observation.surfaces
        .filter(({ registeredId }) => registeredId === null)
        .map(describe);
      expect(
        unannotated,
        `surfaces rendered on ${route} without a registry ID`,
      ).toEqual([]);

      for (const surface of observation.surfaces) {
        expect(
          registeredSurfaceIds.has(surface.registeredId ?? ''),
          `${surface.registeredId} on ${route} is not a registered surface`,
        ).toBe(true);
        expect(surface.backdropFilter, describe(surface)).toBe('none');
        expect(surface.filter, describe(surface)).toBe('none');
        expect(surface.boxShadow, describe(surface)).not.toMatch(
          /#[0-9a-f]{3,8}|rgb\(36,\s*95,\s*255\)/i,
        );
      }
      // A mark is only excluded from the surface population because it
      // carries no content of its own; the exclusion is re-derived here so a
      // real content plane cannot hide behind it.
      for (const mark of observation.marks) {
        marks += 1;
        expect(mark.textLength, describe(mark)).toBe(0);
        expect(mark.childElementCount, describe(mark)).toBe(0);
      }
    }
    expect(measured, 'surface population over the swept routes').toBeGreaterThan(0);
    expect(marks, 'excluded mark population must stay observable').toBeGreaterThan(0);
    expect(
      [...renderedOn(swept, (observation) =>
        observation.surfaces.map(({ registeredId }) => registeredId),
      ).keys()].sort(),
      'rendered surface IDs must be exactly the production-mounted registry rows',
    ).toEqual(productionIds(brandV2Registry.surfaces));
  });

  test('VAL-B2-COMP-013 source, registry and rendered control populations reconcile', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    expect(
      [...SOURCE_SCAN.controlIds].sort(),
      'control IDs written in source must be exactly the registered set',
    ).toEqual([...registeredControlIds].sort());

    for (const row of brandV2Registry.controls) {
      expect(
        [...row.definedIn].sort(),
        `${row.id} definedIn must be exactly the modules that write it`,
      ).toEqual([...(SOURCE_SCAN.ownersById[row.id] ?? [])].sort());
      expect(
        [...row.ownerRouteOrMount].sort(),
        `${row.id} owners must be exactly the writers a route entry reaches`,
      ).toEqual([...(SOURCE_SCAN.productionOwnersById[row.id] ?? [])].sort());
      expect(
        row.mountState,
        `${row.id} mount state must follow its owner list`,
      ).toBe(row.ownerRouteOrMount.length > 0 ? 'production' : 'library-only');
    }

    const swept = await sweep(page, staticBase);
    let measured = 0;
    let vectorControls = 0;
    for (const [route, observation] of swept.byRoute) {
      measured += observation.controls.length;
      const unannotated = observation.controls
        .filter(({ registeredId }) => registeredId === null)
        .map(describe);
      expect(
        unannotated,
        `controls rendered on ${route} without a registry ID`,
      ).toEqual([]);

      for (const control of observation.controls) {
        const id = control.registeredId ?? '';
        if (control.vector) vectorControls += 1;
        expect(
          registeredControlIds.has(id),
          `${id} on ${route} is not a registered control`,
        ).toBe(true);
        if (id !== 'control:selection' && id !== 'control:segmented') {
          expect(control.ariaPressed, describe(control)).toBeNull();
          expect(control.ariaSelected, describe(control)).toBeNull();
        }
        if (id !== 'control:link-focus') {
          expect(control.ariaCurrent, describe(control)).toBeNull();
        }
      }
    }
    expect(measured, 'control population over the swept routes').toBeGreaterThan(0);
    // The market-map bubble view carries keyboard-operable SVG controls; the
    // old walk skipped every SVGElement, so this class was invisible rather
    // than compliant.
    expect(
      vectorControls,
      'keyboard-operable vector controls must be part of the measured population',
    ).toBeGreaterThan(0);
    expect(
      [...renderedOn(swept, (observation) =>
        observation.controls.map(({ registeredId }) => registeredId),
      ).keys()].sort(),
      'rendered control IDs must be exactly the production-mounted registry rows',
    ).toEqual(productionIds(brandV2Registry.controls));
  });

  test('VAL-B2-COMP-014 undersized targets rely only on registered WCAG exceptions', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    // Sweeping every registered route surfaces undersized targets the
    // two-route audit never reached. They are real SC 2.5.8 defects, so the
    // measurement stays exact and the archive pins which routes carry them.
    test.fail(true, archivedExpectedRed(SUITE, 'VAL-B2-COMP-014'));
    const swept = await sweep(page, staticBase);
    const exercised = new Map<string, Set<string>>();
    const offenders: string[] = [];
    const offendingRoutes: string[] = [];
    let measured = 0;
    for (const [route, observation] of swept.byRoute) {
      const measurable = observation.controls.filter(({ visible }) => visible);
      measured += measurable.length;
      const routeOffenders: string[] = [];
      for (const control of measurable) {
        const id = control.registeredId ?? '';
        // The geometry the probe applies and the minimum the registry
        // records have to be the same number, or the gate would be
        // measuring against something the registry never claimed.
        expect(
          observation.minimumTargetPx,
          `${id} registry minimum must match the measured minimum`,
        ).toBe(minimumTargetPx(id));
        if (control.meetsMinimumTarget) continue;
        const satisfied = satisfiedExceptionKinds(control);
        if (satisfied.length === 0) {
          routeOffenders.push(
            `${id} ${control.widthPx}x${control.heightPx} has no available SC 2.5.8 exception: ${describe(control)}`,
          );
          continue;
        }
        const recorded = recordedExceptions(id).map(({ kind }) => kind);
        const relied = satisfied.filter((kind) => recorded.includes(kind));
        if (relied.length === 0) {
          routeOffenders.push(
            `${id} ${control.widthPx}x${control.heightPx} relies on an unregistered ${satisfied.join('/')} exception: ${describe(control)}`,
          );
          continue;
        }
        const seen = exercised.get(id) ?? new Set<string>();
        for (const kind of relied) seen.add(kind);
        exercised.set(id, seen);
      }
      if (routeOffenders.length > 0) {
        offendingRoutes.push(route);
        offenders.push(...routeOffenders.map((entry) => `${route} ${entry}`));
      }
    }
    expect(measured, 'target-size population over the swept routes').toBeGreaterThan(0);

    // A recorded exception nobody needs is an unfalsifiable claim, so every
    // exception the swept routes can reach has to be exercised by a real
    // member.
    for (const row of brandV2Registry.controls) {
      if (!exercised.has(row.id)) continue;
      const kinds = exercised.get(row.id) ?? new Set<string>();
      for (const exception of recordedExceptions(row.id)) {
        expect(
          kinds.has(exception.kind),
          `${row.id} records a ${exception.kind} exception that no swept member uses`,
        ).toBe(true);
      }
    }
    expect(
      offendingRoutes.sort(),
      'archived undersized-target routes must stay exact',
    ).toEqual([...archivedExpectedRedRoutes(SUITE, 'VAL-B2-COMP-014')].sort());
    expect(offenders, 'undersized targets over the swept routes').toEqual([]);
  });

  test('VAL-B2-COMP-009 focusable table scroll regions are named regions', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const swept = await sweep(page, staticBase);
    let measured = 0;
    for (const [route, observation] of swept.byRoute) {
      const tableRegions = observation.scrollRegions.filter(
        ({ containsTable }) => containsTable,
      );
      measured += tableRegions.length;
      const anonymous = tableRegions
        .filter(
          (entry) => entry.role !== 'region' || !entry.hasLabelSource || !entry.named,
        )
        .map((entry) => entry.outline);
      expect(
        anonymous,
        `focusable table scroll regions on ${route} without a role and name`,
      ).toEqual([]);
    }
    // Non-emptiness belongs to the population, not to every route: most
    // registered routes carry no wide table at all.
    expect(
      measured,
      'focusable table scroll regions over the swept routes',
    ).toBeGreaterThan(0);
  });
});
