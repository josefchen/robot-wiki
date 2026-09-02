import { join } from 'node:path';
import { test, expect, brandV2Registry } from './brand-v2-static-fixture';
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
 * VAL-B2-SURF-010 wants source, registry, and rendered populations equal, so
 * the source literals are scanned too (lib/brand-v2-annotation-scan.ts): a
 * DOM sweep cannot see an ID only an unvisited route paints.
 */
const AUDITED_ROUTES = ['/', '/manipulation/action-chunking/'] as const;
const VIEWPORT = { width: 1440, height: 900 } as const;
const SOURCE_SCAN = scanAnnotationLiterals(join(process.cwd()));

const registeredSurfaceIds = new Set(
  brandV2Registry.surfaces.map(({ id }) => id),
);
const registeredControlIds = new Set(
  brandV2Registry.controls.map(({ id }) => id),
);

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

async function discover(
  page: import('@playwright/test').Page,
  base: string,
  route: string,
): Promise<PrimitiveDiscovery> {
  await page.setViewportSize({ ...VIEWPORT });
  await page.goto(`${base}${route}`);
  await page.waitForLoadState('networkidle');
  return page.evaluate(discoverBrandPrimitives);
}

test.describe('brand-v2 shared primitive registry', () => {
  test('VAL-B2-GRID-009 renders registered, aligned, pointer-inert devices', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/`);
    const devices = page.locator('[data-brand-device-id]');
    await expect(devices).not.toHaveCount(0);
    const registered = new Set(
      brandV2Registry.gridDevices.map(({ id }) => id),
    );
    const evidence = await devices.evaluateAll((nodes) =>
      nodes.map((node) => {
        const element = node as HTMLElement;
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
          id: element.dataset.brandDeviceId,
          pointerEvents: getComputedStyle(element).pointerEvents,
          ariaHidden: element.getAttribute('aria-hidden'),
          alignmentError:
            anchorRect === undefined
              ? Number.POSITIVE_INFINITY
              : Math.abs(
                  edge(rect, element.dataset.brandDeviceEdge ?? 'left') -
                    edge(
                      anchorRect,
                      element.dataset.brandAnchorEdge ?? 'left',
                    ),
                ),
        };
      }),
    );
    for (const entry of evidence) {
      expect(registered.has(entry.id ?? '')).toBe(true);
      expect(entry.pointerEvents).toBe('none');
      expect(entry.ariaHidden).toBe('true');
      expect(entry.alignmentError).toBeLessThanOrEqual(2);
    }
  });

  test('VAL-B2-SURF-010 source, registry and rendered surface populations are equal', async ({
    page,
    staticBase,
  }) => {
    expect(
      [...SOURCE_SCAN.surfaceIds].sort(),
      'surface IDs written in source must be exactly the registered set',
    ).toEqual([...registeredSurfaceIds].sort());
    expect(SOURCE_SCAN.modules.length).toBeGreaterThan(0);

    const rendered = new Set<string>();
    for (const route of AUDITED_ROUTES) {
      const { surfaces } = await discover(page, staticBase, route);
      expect(
        surfaces.length,
        `structural surface population on ${route} must be non-empty`,
      ).toBeGreaterThan(0);

      const unannotated = surfaces
        .filter(({ registeredId }) => registeredId === null)
        .map(describe);
      expect(
        unannotated,
        `surfaces rendered on ${route} without a registry ID`,
      ).toEqual([]);

      for (const surface of surfaces) {
        rendered.add(surface.registeredId ?? '');
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
    }
    // Every ID the audited routes paint must be registered; the reverse is
    // covered by the source scan, because a registered level can legitimately
    // belong to a route outside this sweep.
    expect([...rendered].sort().every((id) => registeredSurfaceIds.has(id))).toBe(
      true,
    );
  });

  test('VAL-B2-COMP-013 source, registry and rendered control populations reconcile', async ({
    page,
    staticBase,
  }) => {
    expect(
      [...SOURCE_SCAN.controlIds].sort(),
      'control IDs written in source must be exactly the registered set',
    ).toEqual([...registeredControlIds].sort());

    for (const row of brandV2Registry.controls) {
      const owners = (row as { ownerRouteOrMount?: unknown })
        .ownerRouteOrMount;
      expect(
        Array.isArray(owners) && owners.length > 0,
        `${row.id} must record concrete owner modules`,
      ).toBe(true);
      expect(
        [...(owners as string[])].sort(),
        `${row.id} owner modules must be exactly the modules that render it`,
      ).toEqual([...(SOURCE_SCAN.ownersById[row.id] ?? [])].sort());
    }

    for (const route of AUDITED_ROUTES) {
      const { controls } = await discover(page, staticBase, route);
      expect(
        controls.length,
        `structural control population on ${route} must be non-empty`,
      ).toBeGreaterThan(0);

      const unannotated = controls
        .filter(({ registeredId }) => registeredId === null)
        .map(describe);
      expect(
        unannotated,
        `controls rendered on ${route} without a registry ID`,
      ).toEqual([]);

      for (const control of controls) {
        const id = control.registeredId ?? '';
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
  });

  test('VAL-B2-COMP-014 undersized targets rely only on registered WCAG exceptions', async ({
    page,
    staticBase,
  }) => {
    const exercised = new Map<string, Set<string>>();
    for (const route of AUDITED_ROUTES) {
      const discovery = await discover(page, staticBase, route);
      const controls = discovery.controls;
      const measurable = controls.filter(({ visible }) => visible);
      expect(
        measurable.length,
        `target-size population on ${route} must be non-empty`,
      ).toBeGreaterThan(0);

      const offenders: string[] = [];
      for (const control of measurable) {
        const id = control.registeredId ?? '';
        // The geometry the probe applies and the minimum the registry
        // records have to be the same number, or the gate would be
        // measuring against something the registry never claimed.
        expect(
          discovery.minimumTargetPx,
          `${id} registry minimum must match the measured minimum`,
        ).toBe(minimumTargetPx(id));
        if (control.meetsMinimumTarget) continue;
        const satisfied = satisfiedExceptionKinds(control);
        if (satisfied.length === 0) {
          offenders.push(
            `${id} ${control.widthPx}x${control.heightPx} has no available SC 2.5.8 exception: ${describe(control)}`,
          );
          continue;
        }
        const recorded = recordedExceptions(id).map(({ kind }) => kind);
        const relied = satisfied.filter((kind) => recorded.includes(kind));
        if (relied.length === 0) {
          offenders.push(
            `${id} ${control.widthPx}x${control.heightPx} relies on an unregistered ${satisfied.join('/')} exception: ${describe(control)}`,
          );
          continue;
        }
        const seen = exercised.get(id) ?? new Set<string>();
        for (const kind of relied) seen.add(kind);
        exercised.set(id, seen);
      }
      expect(offenders, `target-size failures on ${route}`).toEqual([]);
    }

    // A recorded exception nobody needs is an unfalsifiable claim, so every
    // exception the audited routes can reach has to be exercised by a real
    // member.
    for (const row of brandV2Registry.controls) {
      if (!exercised.has(row.id)) continue;
      const kinds = exercised.get(row.id) ?? new Set<string>();
      for (const exception of recordedExceptions(row.id)) {
        expect(
          kinds.has(exception.kind),
          `${row.id} records a ${exception.kind} exception that no audited member uses`,
        ).toBe(true);
      }
    }
  });

  test('VAL-B2-COMP-009 focusable table scroll regions are named regions', async ({
    page,
    staticBase,
  }) => {
    for (const route of AUDITED_ROUTES) {
      await page.setViewportSize({ ...VIEWPORT });
      await page.goto(`${staticBase}${route}`);
      const evidence = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[tabindex="0"]')]
          .filter((node) => {
            const style = getComputedStyle(node);
            return (
              (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
              node.querySelector('table') !== null
            );
          })
          .map((node) => ({
            role: node.getAttribute('role'),
            named:
              (node.getAttribute('aria-label') ?? '').trim().length > 0 ||
              (node.getAttribute('aria-labelledby') ?? '')
                .split(/\s+/)
                .filter(Boolean)
                .every(
                  (id) =>
                    (document.getElementById(id)?.textContent ?? '').trim()
                      .length > 0,
                ),
            hasLabelSource:
              (node.getAttribute('aria-label') ?? '').trim().length > 0 ||
              (node.getAttribute('aria-labelledby') ?? '').trim().length > 0,
            outline: node.outerHTML.replace(/\s+/g, ' ').slice(0, 120),
          })),
      );
      expect(
        evidence.length,
        `focusable table scroll regions on ${route} must be non-empty`,
      ).toBeGreaterThan(0);
      const anonymous = evidence
        .filter((entry) => entry.role !== 'region' || !entry.hasLabelSource || !entry.named)
        .map((entry) => entry.outline);
      expect(
        anonymous,
        `focusable table scroll regions on ${route} without a role and name`,
      ).toEqual([]);
    }
  });
});
