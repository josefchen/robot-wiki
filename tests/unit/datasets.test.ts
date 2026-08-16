import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DATASETS } from '@/data/datasets';
import { datasetSchema } from '@/data/schemas/dataset';
import { getCitation } from '@/data/citations';
import { DEFAULT_DATASET_FILTERS, filterDatasets } from '@/lib/datasets';

/**
 * The datasets data contract (VAL-DATA-005 through VAL-DATA-010): rows
 * validate against the dataset schema, every row carries at least one
 * citation-registry source, the five named dataset families are present,
 * and unknown figures stay null rather than invented.
 */

const REQUIRED_IDS = [
  'open-x-embodiment',
  'droid',
  'bridgedata-v2',
  'agibot-world',
  'robomind',
];

describe('DATASETS data', () => {
  it('validates against the dataset schema', () => {
    const parsed = z.array(datasetSchema).safeParse(DATASETS);
    expect(parsed.success).toBe(true);
  });

  it('covers the five dataset families VAL-DATA-007 requires', () => {
    const ids = new Set(DATASETS.map((d) => d.id));
    for (const id of REQUIRED_IDS) {
      expect(ids.has(id), `missing dataset row: ${id}`).toBe(true);
    }
  });

  it('gives every row at least one source in the citation registry', () => {
    for (const dataset of DATASETS) {
      expect(dataset.sources.length).toBeGreaterThan(0);
      for (const id of dataset.sources) {
        expect(
          getCitation(id),
          `${dataset.id} cites unregistered source ${id}`,
        ).toBeDefined();
      }
    }
  });

  it('gives every row an external https url', () => {
    for (const dataset of DATASETS) {
      expect(dataset.url).toMatch(/^https:\/\//);
    }
  });

  it('keeps unpublished AgiBot World 2026 figures null instead of guessed', () => {
    const row = DATASETS.find((d) => d.id === 'agibot-world-2026');
    expect(row, 'missing AgiBot World 2026 row').toBeDefined();
    // The release README publishes a total file size (13.2 TB) but no
    // episode, hour, or task counts; those cells must stay null.
    expect(row?.episodes).toBeNull();
    expect(row?.hours).toBeNull();
    expect(row?.tasks).toBeNull();
  });

  it('keeps unpublished hour counts null for OXE and BridgeData V2', () => {
    expect(
      DATASETS.find((d) => d.id === 'open-x-embodiment')?.hours,
    ).toBeNull();
    expect(DATASETS.find((d) => d.id === 'bridgedata-v2')?.hours).toBeNull();
  });

  it('honors the source-verified anchor values', () => {
    const oxe = DATASETS.find((d) => d.id === 'open-x-embodiment');
    expect(oxe?.episodes).toBe(1000000);
    expect(oxe?.tasks).toBe(160266);
    expect(oxe?.embodimentCount).toBe(22);

    const droid = DATASETS.find((d) => d.id === 'droid');
    expect(droid?.episodes).toBe(76000);
    expect(droid?.hours).toBe(350);
    expect(droid?.tasks).toBe(86);
    expect(droid?.scenes).toBe(564);

    const bridge = DATASETS.find((d) => d.id === 'bridgedata-v2');
    expect(bridge?.episodes).toBe(60096);
    expect(bridge?.tasks).toBe(13);
    expect(bridge?.scenes).toBe(24);

    const agibot = DATASETS.find((d) => d.id === 'agibot-world');
    expect(agibot?.episodes).toBe(1003672);
    expect(agibot?.tasks).toBe(217);

    const robomind = DATASETS.find((d) => d.id === 'robomind');
    expect(robomind?.episodes).toBe(107000);
    expect(robomind?.tasks).toBe(479);
    expect(robomind?.embodimentCount).toBe(4);
  });
});

describe('filterDatasets', () => {
  it('returns everything under the default filters', () => {
    expect(filterDatasets(DATASETS, DEFAULT_DATASET_FILTERS)).toHaveLength(
      DATASETS.length,
    );
  });

  it('partitions episodes into the size buckets (VAL-DATA-008)', () => {
    const small = filterDatasets(DATASETS, {
      ...DEFAULT_DATASET_FILTERS,
      size: 'under-100k',
    });
    expect(small.map((d) => d.id).sort()).toEqual(['bridgedata-v2', 'droid']);

    const mid = filterDatasets(DATASETS, {
      ...DEFAULT_DATASET_FILTERS,
      size: '100k-1m',
    });
    expect(mid.map((d) => d.id)).toEqual(['robomind']);

    const large = filterDatasets(DATASETS, {
      ...DEFAULT_DATASET_FILTERS,
      size: '1m-plus',
    });
    expect(large.map((d) => d.id).sort()).toEqual([
      'agibot-world',
      'open-x-embodiment',
    ]);

    // Unknown sizes only match the unknown bucket, never a numeric one.
    const unknown = filterDatasets(DATASETS, {
      ...DEFAULT_DATASET_FILTERS,
      size: 'unknown',
    });
    expect(unknown.map((d) => d.id)).toEqual(['agibot-world-2026']);
  });

  it('filters single versus multi platform collections (VAL-DATA-008)', () => {
    const single = filterDatasets(DATASETS, {
      ...DEFAULT_DATASET_FILTERS,
      embodiment: 'single',
    });
    const singleIds = new Set(single.map((d) => d.id));
    expect(singleIds.has('open-x-embodiment')).toBe(false);
    expect(singleIds.has('robomind')).toBe(false);
    expect(singleIds.has('droid')).toBe(true);
    expect(singleIds.has('bridgedata-v2')).toBe(true);

    const multi = filterDatasets(DATASETS, {
      ...DEFAULT_DATASET_FILTERS,
      embodiment: 'multi',
    });
    expect(multi.map((d) => d.id).sort()).toEqual([
      'open-x-embodiment',
      'robomind',
    ]);
  });

  it('partitions task counts into the task buckets (VAL-DATA-008)', () => {
    const few = filterDatasets(DATASETS, {
      ...DEFAULT_DATASET_FILTERS,
      tasks: 'under-100',
    });
    expect(few.map((d) => d.id).sort()).toEqual(['bridgedata-v2', 'droid']);

    const many = filterDatasets(DATASETS, {
      ...DEFAULT_DATASET_FILTERS,
      tasks: '100-1k',
    });
    expect(many.map((d) => d.id).sort()).toEqual(['agibot-world', 'robomind']);

    const most = filterDatasets(DATASETS, {
      ...DEFAULT_DATASET_FILTERS,
      tasks: '1k-plus',
    });
    expect(most.map((d) => d.id)).toEqual(['open-x-embodiment']);
  });

  it('composes filters conjunctively', () => {
    const composed = filterDatasets(DATASETS, {
      size: 'under-100k',
      embodiment: 'single',
      tasks: 'under-100',
    });
    expect(composed.map((d) => d.id).sort()).toEqual([
      'bridgedata-v2',
      'droid',
    ]);
  });

  it('supports zero-result combinations', () => {
    // RoboMIND is the only 100k-1M dataset, and it is multi-platform.
    expect(
      filterDatasets(DATASETS, {
        ...DEFAULT_DATASET_FILTERS,
        size: '100k-1m',
        embodiment: 'single',
      }),
    ).toHaveLength(0);
  });
});
