import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

/**
 * The declarations behind the one exemption `VAL-CROSS-015` allows: a mount
 * of a shared instrument that deliberately opens on its own seeded
 * configuration rather than on the one home opens with.
 *
 * The exemption itself is right and was established by measurement. One
 * mount of `ReliabilityCompounding` sits inside a commit-to-reveal quiz
 * whose published answer text states the figure the instrument opens on, so
 * forcing home's defaults onto it would make that prose false. What was
 * wrong was the criterion: the reader exempted any mount the sweep had to
 * open a disclosure to reach. Visibility is not the reason. It is a
 * property that happens to be true of this mount today, and it hands the
 * exemption free of charge to any future mount that happens to sit behind a
 * `<details>`.
 *
 * So the reason is declared instead, by an entry nobody can write from
 * inside the component:
 *
 * - a mount that opens on a different configuration from home fails unless a
 *   declaration names it, so the exemption is granted deliberately;
 * - a declaration whose seeded configuration is not the configuration the
 *   mount was measured opening on fails, so a declaration cannot cover a
 *   drift it does not describe;
 * - a declaration naming a mount that is not in the population fails, so the
 *   registry cannot carry approvals for instruments nobody renders;
 * - and the caller keeps the floor that fails the whole population when
 *   declarations swallow every member, because an assertion every member is
 *   exempt from asserts nothing.
 *
 * A declared mount is exempt from opening on home's state and from nothing
 * else: it still has to print what the shared model computes from the inputs
 * it was seeded with, and it still has to agree with home once both are
 * driven to the same inputs.
 */
export const SEEDED_MOUNT_REGISTRY_PATH =
  'contract/brand-v2-seeded-mount-registry.json';

const seededMountSchema = z.object({
  /** The interactive registry mount id this declaration is about. */
  mountId: z.string().min(1),
  route: z.string().regex(/^\/[\w/-]*$/),
  /** The configuration this mount deliberately opens on. */
  seededInputs: z.object({
    perStepPercent: z.number(),
    steps: z.number().int().positive(),
  }),
  /** Why this mount may not open on the shared default. */
  reason: z.string().min(24),
  /** Who answers for the divergence. */
  owner: z.string().min(1),
});

export const seededMountRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  mounts: z.array(seededMountSchema).min(1),
});

export type SeededMountDeclaration = z.infer<typeof seededMountSchema>;

export function readSeededMountRegistry(
  root: string,
): SeededMountDeclaration[] {
  const registry = seededMountRegistrySchema.parse(
    JSON.parse(readFileSync(join(root, SEEDED_MOUNT_REGISTRY_PATH), 'utf8')),
  );
  const ids = registry.mounts.map(({ mountId }) => mountId);
  const duplicated = [
    ...new Set(ids.filter((id, index) => ids.indexOf(id) !== index)),
  ].sort();
  if (duplicated.length > 0) {
    throw new Error(
      `${SEEDED_MOUNT_REGISTRY_PATH} declares ${duplicated.join(', ')} more than once, so one mount carries two reasons`,
    );
  }
  return [...registry.mounts].sort((left, right) =>
    left.mountId.localeCompare(right.mountId),
  );
}
