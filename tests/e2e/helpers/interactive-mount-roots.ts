import { expect, type Locator, type Page } from '@playwright/test';
import { PLAIN_TABLE_SOURCES } from '../../../lib/brand-v2-interactive-captures';

/**
 * Where each production mount of an interactive renders on its route.
 *
 * Registered exploratory labs share the instrument-frame primitive with the
 * paused motion scenes and clips, which own separate contracts, so those are
 * excluded. A plain prose table is not a figure and has no frame: its root is
 * the block around the shared table region no frame contains.
 */
export const MOUNT_FRAME_SELECTOR =
  'main [data-brand-module-signature="instrument-frame"]:not([data-motion-scene]):not([data-motion-clip])';
export const UNFRAMED_TABLE_REGION =
  'main [data-brand-frame-interior-registered="table"]:not([data-brand-module-signature="instrument-frame"] *)';

/**
 * The marker `InstrumentReset` renders. Resets are found by it, never by
 * their label: a reset may read "Start over" or carry a longer accessible
 * name.
 */
export const RESET_MARKER = '[data-instrument-reset]';

export { PLAIN_TABLE_SOURCES };

export type MountIdentity = { id: string; sourceId: string; component: string; ordinal: number };

/** `ros2-interfaces` and `egoscale-scaling` name `Ros2Interfaces` and `EgoScaleScaling`. */
const frameName = (value: string) => value.replace(/-/g, '').toLowerCase();

/**
 * Each mount's root on its route, returned in the order the mounts are
 * given. A framed mount binds to the frame whose `data-figure-frame` names
 * its component, the `ordinal`-th such frame in document order; the registry
 * lists a route's mounts by component name, not by position, so binding by
 * index would hand a mount its neighbour's frame. A plain-table mount binds
 * to the block around the next unframed table region. Every frame is bound
 * exactly once, so no mount can borrow another's markup.
 */
export async function mountRoots(
  page: Page,
  route: string,
  mounts: readonly MountIdentity[],
): Promise<Locator[]> {
  const plainCount = mounts.filter((mount) => PLAIN_TABLE_SOURCES.has(mount.sourceId)).length;
  const frames = page.locator(MOUNT_FRAME_SELECTOR);
  const regions = page.locator(UNFRAMED_TABLE_REGION);
  const frameIds = await frames.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-figure-frame')),
  );
  expect(
    frameIds.length,
    `${route} renders one instrument frame per framed registry mount (${mounts.length - plainCount})`,
  ).toBe(mounts.length - plainCount);
  if (plainCount > 0) {
    expect(
      await regions.count(),
      `${route} renders one unframed table per plain-table mount (${plainCount})`,
    ).toBe(plainCount);
  }
  const bound = new Set<number>();
  let regionIndex = 0;
  const roots = mounts.map((mount) => {
    if (PLAIN_TABLE_SOURCES.has(mount.sourceId)) return regions.nth(regionIndex++).locator('xpath=..');
    const matching = frameIds.flatMap((id, index) =>
      id !== null && frameName(id) === frameName(mount.component) ? [index] : [],
    );
    const index = matching[mount.ordinal - 1];
    expect(index, `${mount.id} binds to the frame that names ${mount.component} (${route} frames: ${frameIds.join(', ')})`).toBeDefined();
    bound.add(index);
    return frames.nth(index);
  });
  expect(bound.size, `${route} binds every frame to exactly one mount`).toBe(frameIds.length);
  return roots;
}
