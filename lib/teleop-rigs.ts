/**
 * Helpers for the teleop-rig comparison matrix
 * (components/interactive/teleop-rig-matrix.tsx). Pure and unit-tested in
 * tests/unit/teleop-rigs.test.ts.
 *
 * The matrix compares four rig families across four dimensions. Ratings
 * (data quality, throughput, embodiment gap) share a low/medium/high enum
 * whose direction differs per dimension; each cell note states what the
 * rating means, so sorting uses the rank only.
 */
import type { RigRating, TeleopRig } from '@/data/schemas/teleop-rig.ts';

/** The four comparison dimensions, in table column order after rig/cost. */
export type TeleopRigField =
  | 'cost'
  | 'dataQuality'
  | 'throughput'
  | 'embodimentGap';

export const RIG_FIELDS: Array<{
  id: TeleopRigField;
  label: string;
  /** What the dimension measures; rendered as the group legend. */
  legend: string;
}> = [
  {
    id: 'cost',
    label: 'Cost',
    legend:
      'Representative rig cost in USD from cited sources. Not disclosed when no source publishes a system cost.',
  },
  {
    id: 'dataQuality',
    label: 'Data quality',
    legend:
      'How faithfully the recorded demonstrations map onto robot execution: matched kinematics rates high, retargeted or robot-free recording rates lower.',
  },
  {
    id: 'throughput',
    label: 'Throughput',
    legend:
      'How cheaply demonstration volume scales with more collectors: hardware cost and setup per additional operator.',
  },
  {
    id: 'embodimentGap',
    label: 'Embodiment gap',
    legend:
      'How far the recorded motion is from what the robot executes. Low means collected on the robot body itself; high means human motion remapped through a retargeting layer.',
  },
];

export const RATING_RANK: Record<RigRating, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

/** Sort accessor used by the table: USD for cost, rating rank otherwise. */
export function rigSortValue(rig: TeleopRig, field: TeleopRigField): number | null {
  if (field === 'cost') return rig.costUsd;
  return RATING_RANK[rig[field]];
}

/** The per-rig detail paragraph for a highlighted dimension. */
export function rigDetail(rig: TeleopRig, field: TeleopRigField): string {
  return rig.details[field];
}
