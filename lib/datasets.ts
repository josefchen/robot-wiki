/**
 * Filter logic for the dataset comparison table
 * (components/interactive/dataset-table.tsx). Pure and unit-tested in
 * tests/unit/datasets.test.ts.
 *
 * Buckets are conjunctive and null-honest: a row with an unpublished figure
 * (null) never matches a numeric bucket, only the explicit "unknown" option.
 */
import type { Dataset } from '@/data/schemas/dataset.ts';

export type SizeFilter = 'all' | 'under-100k' | '100k-1m' | '1m-plus' | 'unknown';
export type EmbodimentFilter = 'all' | 'single' | 'multi';
export type TaskFilter = 'all' | 'under-100' | '100-1k' | '1k-plus' | 'unknown';

export interface DatasetFilters {
  /** Bucket on the reported episode count. */
  size: SizeFilter;
  /** Single-platform collection versus multi-platform pool. */
  embodiment: EmbodimentFilter;
  /** Bucket on the reported task/skill count. */
  tasks: TaskFilter;
}

export const DEFAULT_DATASET_FILTERS: DatasetFilters = {
  size: 'all',
  embodiment: 'all',
  tasks: 'all',
};

function matchesSize(dataset: Dataset, size: SizeFilter): boolean {
  if (size === 'all') return true;
  if (size === 'unknown') return dataset.episodes === null;
  if (dataset.episodes === null) return false;
  switch (size) {
    case 'under-100k':
      return dataset.episodes < 100_000;
    case '100k-1m':
      return dataset.episodes >= 100_000 && dataset.episodes < 1_000_000;
    case '1m-plus':
      return dataset.episodes >= 1_000_000;
  }
}

function matchesEmbodiment(
  dataset: Dataset,
  embodiment: EmbodimentFilter,
): boolean {
  if (embodiment === 'all') return true;
  return embodiment === 'single'
    ? dataset.embodimentCount === 1
    : dataset.embodimentCount > 1;
}

function matchesTasks(dataset: Dataset, tasks: TaskFilter): boolean {
  if (tasks === 'all') return true;
  if (tasks === 'unknown') return dataset.tasks === null;
  if (dataset.tasks === null) return false;
  switch (tasks) {
    case 'under-100':
      return dataset.tasks < 100;
    case '100-1k':
      return dataset.tasks >= 100 && dataset.tasks < 1_000;
    case '1k-plus':
      return dataset.tasks >= 1_000;
  }
}

/** Conjunctive filtering: every active filter must match. */
export function filterDatasets(
  datasets: readonly Dataset[],
  filters: DatasetFilters,
): Dataset[] {
  return datasets.filter(
    (dataset) =>
      matchesSize(dataset, filters.size) &&
      matchesEmbodiment(dataset, filters.embodiment) &&
      matchesTasks(dataset, filters.tasks),
  );
}
