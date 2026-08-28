import { test, expect, brandV2Registry } from './brand-v2-static-fixture';

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

  test('VAL-B2-SURF-010 renders registered surface variants without glass or glow', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/manipulation/action-chunking/`);
    const surfaces = page.locator('[data-brand-surface-id]');
    await expect(surfaces).not.toHaveCount(0);
    const registered = new Set(brandV2Registry.surfaces.map(({ id }) => id));
    const evidence = await surfaces.evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return {
          id: (node as HTMLElement).dataset.brandSurfaceId,
          backdropFilter: style.backdropFilter,
          filter: style.filter,
          boxShadow: style.boxShadow,
        };
      }),
    );
    for (const entry of evidence) {
      expect(registered.has(entry.id ?? '')).toBe(true);
      expect(entry.backdropFilter).toBe('none');
      expect(entry.filter).toBe('none');
      expect(entry.boxShadow).not.toMatch(/#[0-9a-f]{3,8}|rgb\(36,\s*95,\s*255\)/i);
    }
  });

  test('VAL-B2-COMP-013 keeps persistent ARIA scoped to persistent state', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/manipulation/action-chunking/`);
    const controls = page.locator('[data-brand-control-id]');
    await expect(controls).not.toHaveCount(0);
    const registered = new Set(brandV2Registry.controls.map(({ id }) => id));
    const evidence = await controls.evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: (node as HTMLElement).dataset.brandControlId,
        pressed: node.getAttribute('aria-pressed'),
        selected: node.getAttribute('aria-selected'),
        current: node.getAttribute('aria-current'),
      })),
    );
    for (const entry of evidence) {
      expect(registered.has(entry.id ?? '')).toBe(true);
      if (entry.id !== 'control:selection' && entry.id !== 'control:segmented') {
        expect(entry.pressed).toBeNull();
        expect(entry.selected).toBeNull();
      }
      if (entry.id !== 'control:link-focus') {
        expect(entry.current).toBeNull();
      }
    }
  });
});
