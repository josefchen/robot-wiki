import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { HARDWARE } from '@/data/hardware';
import { hardwareEntrySchema } from '@/data/schemas/hardware';
import { getCitation } from '@/data/citations';
import {
  DEFAULT_HARDWARE_FILTERS,
  filterHardware,
  formatPrice,
} from '@/lib/hardware';

/**
 * The hardware buyer's guide data contract (VAL-DATA-011 through
 * VAL-DATA-016): rows validate against the hardware schema, all five
 * hardware families appear with multiple entries, every price carries an
 * explicit as-of date, unknown figures stay null rather than invented, and
 * every row cites at least one registered source.
 */

const CATEGORIES = ['arm', 'humanoid', 'hand', 'sensor', 'compute'] as const;

describe('HARDWARE data', () => {
  it('validates against the hardware entry schema', () => {
    const parsed = z.array(hardwareEntrySchema).safeParse(HARDWARE);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      console.error(parsed.error.issues);
    }
  });

  it('has unique ids and external https urls', () => {
    const ids = HARDWARE.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of HARDWARE) {
      expect(entry.url).toMatch(/^https:\/\//);
    }
  });

  it('covers all five hardware families with multiple entries (VAL-DATA-013)', () => {
    for (const category of CATEGORIES) {
      const count = HARDWARE.filter((e) => e.category === category).length;
      expect(
        count,
        `category ${category} needs multiple entries, found ${count}`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('gives every row at least one source in the citation registry (VAL-DATA-014)', () => {
    for (const entry of HARDWARE) {
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const id of entry.sources) {
        expect(
          getCitation(id),
          `${entry.id} cites unregistered source ${id}`,
        ).toBeDefined();
      }
    }
  });

  it('attaches an as-of date to every listed price (VAL-DATA-012)', () => {
    for (const entry of HARDWARE) {
      if (entry.priceUsd !== null) {
        expect(
          entry.priceAsOf,
          `${entry.id} has a price without an as-of date`,
        ).not.toBeNull();
      } else {
        expect(
          entry.priceAsOf,
          `${entry.id} has an as-of date but no price`,
        ).toBeNull();
      }
    }
  });

  it('keeps price ranges consistent', () => {
    for (const entry of HARDWARE) {
      if (entry.priceMaxUsd !== null) {
        expect(entry.priceUsd).not.toBeNull();
        expect(
          entry.priceMaxUsd,
          `${entry.id}: max below min`,
        ).toBeGreaterThanOrEqual(entry.priceUsd as number);
      }
    }
  });

  it('honors the source-verified anchor values', () => {
    const g1 = HARDWARE.find((e) => e.id === 'unitree-g1');
    expect(g1?.priceUsd).toBe(13500);
    expect(g1?.dof).toBe(23);
    expect(g1?.availability).toBe('buy');

    const h2 = HARDWARE.find((e) => e.id === 'unitree-h2');
    expect(h2?.priceUsd).toBe(29900);
    expect(h2?.dof).toBe(31);

    const neo = HARDWARE.find((e) => e.id === '1x-neo');
    expect(neo?.priceUsd).toBe(20000);
    expect(neo?.availability).toBe('preorder');

    const leap = HARDWARE.find((e) => e.id === 'leap-hand');
    expect(leap?.priceUsd).toBe(2000);
    expect(leap?.dof).toBe(16);
    expect(leap?.priceAsOf).toBe('2023');

    const franka = HARDWARE.find((e) => e.id === 'franka-panda');
    expect(franka?.dof).toBe(7);
    expect(franka?.priceUsd).toBeNull();

    const atlas = HARDWARE.find((e) => e.id === 'atlas-electric');
    expect(atlas?.dof).toBe(56);
    expect(atlas?.priceUsd).toBeNull();
  });

  it('keeps unpublished figures null instead of guessed (VAL-DATA-015)', () => {
    // Tesla has released no Optimus 3 spec sheet or price.
    const optimus = HARDWARE.find((e) => e.id === 'tesla-optimus-3');
    expect(optimus?.priceUsd).toBeNull();
    expect(optimus?.dof).toBeNull();
    expect(optimus?.availability).toBe('closed');

    // Jetson Thor is orderable through partners but NVIDIA publishes no
    // module price.
    const thor = HARDWARE.find((e) => e.id === 'jetson-thor-t5000');
    expect(thor?.priceUsd).toBeNull();
    expect(thor?.availability).toBe('buy');

    // Boston Dynamics does not publish an Atlas price.
    expect(
      HARDWARE.find((e) => e.id === 'atlas-electric')?.priceUsd,
    ).toBeNull();
  });
});

describe('filterHardware', () => {
  it('returns everything under the default filters', () => {
    expect(filterHardware(HARDWARE, DEFAULT_HARDWARE_FILTERS)).toHaveLength(
      HARDWARE.length,
    );
  });

  it('filters each hardware family (VAL-DATA-013)', () => {
    const arms = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      category: 'arm',
    });
    expect(arms.every((e) => e.category === 'arm')).toBe(true);
    expect(arms.length).toBe(11);

    const humanoids = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      category: 'humanoid',
    });
    expect(humanoids.length).toBe(14);

    const hands = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      category: 'hand',
    });
    expect(hands.length).toBe(5);

    const sensors = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      category: 'sensor',
    });
    expect(sensors.length).toBe(4);

    const compute = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      category: 'compute',
    });
    expect(compute.length).toBe(6);
  });

  it('partitions listed prices into buckets and keeps unlisted out (VAL-DATA-012)', () => {
    const cheap = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      price: 'under-1k',
    });
    expect(cheap.map((e) => e.id).sort()).toEqual([
      'digit-fingertip',
      'gelsight-mini',
      'koch-v1-1',
      'so-101-self-build',
      'so-arm101-pro-assembled',
      'so-arm101-pro-unassembled',
    ]);

    const mid = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      price: '1k-10k',
    });
    expect(mid.map((e) => e.id).sort()).toEqual([
      'leap-hand',
      'noetix-bumi',
      'unitree-r1',
      'widowx-ai',
    ]);

    const research = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      price: '10k-25k',
    });
    expect(research.map((e) => e.id).sort()).toEqual([
      '1x-neo',
      'aloha-2',
      'engineai-se01',
      'limx-oli',
      'solo-ai',
      'stationary-ai',
      'unitree-g1',
    ]);

    const flagship = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      price: '25k-plus',
    });
    expect(flagship.map((e) => e.id).sort()).toEqual([
      'fourier-gr3',
      'mobile-ai',
      'reachy-2',
      'unitree-h2',
    ]);

    // Unlisted entries never match a numeric bucket (null-honesty).
    const unlisted = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      price: 'unlisted',
    });
    expect(unlisted).toHaveLength(19);
    expect(unlisted.every((e) => e.priceUsd === null)).toBe(true);
    for (const price of ['under-1k', '1k-10k', '10k-25k', '25k-plus'] as const) {
      const bucket = filterHardware(HARDWARE, {
        ...DEFAULT_HARDWARE_FILTERS,
        price,
      });
      expect(bucket.every((e) => e.priceUsd !== null)).toBe(true);
    }
  });

  it('partitions degrees of freedom into buckets', () => {
    const low = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      dof: 'under-10',
    });
    expect(low.map((e) => e.id).sort()).toEqual([
      'franka-panda',
      'koch-v1-1',
      'so-101-self-build',
      'so-arm101-pro-assembled',
      'so-arm101-pro-unassembled',
      'unitree-dex3-1',
      'widowx-ai',
    ]);

    const mid = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      dof: '10-30',
    });
    expect(mid.map((e) => e.id).sort()).toEqual([
      '1x-neo',
      'leap-hand',
      'neo-hand',
      'unitree-g1',
    ]);

    const high = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      dof: '30-plus',
    });
    expect(high.map((e) => e.id).sort()).toEqual([
      'agibot-a2',
      'atlas-electric',
      'ubtech-walker-s2',
      'unitree-h2',
    ]);

    const unknown = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      dof: 'unknown',
    });
    expect(unknown).toHaveLength(25);
    expect(unknown.every((e) => e.dof === null)).toBe(true);
  });

  it('filters by availability and composes with price (VAL-DATA-016)', () => {
    const buyable = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      availability: 'buy',
    });
    expect(buyable).toHaveLength(26);
    expect(buyable.every((e) => e.availability === 'buy')).toBe(true);

    const preorders = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      availability: 'preorder',
    });
    expect(preorders.map((e) => e.id).sort()).toEqual([
      '1x-neo',
      'neo-hand',
      'noetix-bumi',
    ]);

    const closed = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      availability: 'closed',
    });
    expect(closed.map((e) => e.id).sort()).toEqual([
      'figure-03',
      'figure-03-hand',
      'tesla-optimus-3',
    ]);

    // Composed: orderable hardware under $1k. The four entry arms plus
    // the two tactile sensors with published retail prices.
    const composed = filterHardware(HARDWARE, {
      ...DEFAULT_HARDWARE_FILTERS,
      availability: 'buy',
      price: 'under-1k',
    });
    expect(composed.map((e) => e.id).sort()).toEqual([
      'digit-fingertip',
      'gelsight-mini',
      'koch-v1-1',
      'so-101-self-build',
      'so-arm101-pro-assembled',
      'so-arm101-pro-unassembled',
    ]);
  });

  it('composes category, price, and DoF conjunctively', () => {
    const composed = filterHardware(HARDWARE, {
      category: 'arm',
      price: 'under-1k',
      dof: 'under-10',
      availability: 'all',
    });
    expect(composed.map((e) => e.id).sort()).toEqual([
      'koch-v1-1',
      'so-101-self-build',
      'so-arm101-pro-assembled',
      'so-arm101-pro-unassembled',
    ]);

    // Humanoids with a listed price in the $1k-$10k band.
    const humanoidMid = filterHardware(HARDWARE, {
      category: 'humanoid',
      price: '1k-10k',
      dof: 'all',
      availability: 'all',
    });
    expect(humanoidMid.map((e) => e.id).sort()).toEqual([
      'noetix-bumi',
      'unitree-r1',
    ]);
  });

  it('supports zero-result combinations', () => {
    // No compute row carries a listed price: NVIDIA publishes no Thor
    // module price and VLA-Perf quotes no card prices.
    expect(
      filterHardware(HARDWARE, {
        category: 'compute',
        price: 'under-1k',
        dof: 'all',
        availability: 'all',
      }),
    ).toHaveLength(0);
  });
});

describe('formatPrice', () => {
  it('formats single prices and ranges with grouping', () => {
    const solo = HARDWARE.find((e) => e.id === 'solo-ai');
    expect(formatPrice(solo as never)).toBe('$11,385');

    const aloha = HARDWARE.find((e) => e.id === 'aloha-2');
    expect(formatPrice(aloha as never)).toBe('$17,000-$32,000');

    const franka = HARDWARE.find((e) => e.id === 'franka-panda');
    expect(formatPrice(franka as never)).toBeNull();
  });
});
