/**
 * Counts and groupings over data/maker-model-sources.ts. Pure and zod-free,
 * so a browser component can import it; pinned by
 * tests/unit/maker-model-sources.test.ts. Every headline on the Robots in 3D
 * page comes from here, never from a typed number.
 */
import type {
  MakerModelSource,
  MakerModelStatus,
} from '@/data/schemas/maker-model-source.ts';

/** Display order; the unit suite checks it equals the schema's enum. */
export const MAKER_MODEL_STATUS_ORDER: readonly MakerModelStatus[] = [
  'official',
  'restricted',
  'no-licence',
  'none-found',
];

export type MakerModelStatusCounts = Record<MakerModelStatus, number>;

/** Rows per status, every status present (zero when empty). */
export function countsByStatus(
  rows: readonly MakerModelSource[],
): MakerModelStatusCounts {
  const counts = Object.fromEntries(
    MAKER_MODEL_STATUS_ORDER.map((status) => [status, 0]),
  ) as MakerModelStatusCounts;
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

/** Rows with one status, in data order. */
export function rowsByStatus(
  rows: readonly MakerModelSource[],
  status: MakerModelStatus,
): MakerModelSource[] {
  return rows.filter((row) => row.status === status);
}
