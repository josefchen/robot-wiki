import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
import {
  MILESTONES,
  MILESTONE_STATUSES,
  filterMilestones,
  milestoneSchema,
} from '@/lib/bear-case';

const EXPECTED_IDS = [
  'unseen-homes-policy',
  'ten-thousand-unit-deployment',
  'open-benchmark',
  'broad-rl-reliability',
  'tactile-foundation-model',
  'sim-to-real-contact',
  'cost-per-task-parity',
  'data-scaling-law',
];

describe('bear-case milestones data', () => {
  it('contains exactly the eight watchlist milestones, in presentation order', () => {
    expect(MILESTONES.map((m) => m.id)).toEqual(EXPECTED_IDS);
  });

  it('gives every milestone all four required fields, non-empty', () => {
    for (const milestone of MILESTONES) {
      expect(milestone.whyItMatters.trim().length).toBeGreaterThan(0);
      expect(milestone.statusDetail.trim().length).toBeGreaterThan(0);
      expect(milestone.howWeKnow.trim().length).toBeGreaterThan(0);
      expect(milestone.citationIds.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('uses only the three defined status values', () => {
    for (const milestone of MILESTONES) {
      expect(MILESTONE_STATUSES).toContain(milestone.status);
    }
  });

  it('has no milestone already met: the watchlist is forward-looking', () => {
    // As of writing, every milestone is unmet or partial; the "met" filter
    // deliberately renders an empty state. If a milestone is ever met, this
    // test and the empty-state copy need revisiting.
    expect(MILESTONES.some((m) => m.status === 'met')).toBe(false);
    expect(MILESTONES.some((m) => m.status === 'not-met')).toBe(true);
    expect(MILESTONES.some((m) => m.status === 'partial')).toBe(true);
  });

  it('resolves every citation id used anywhere in the data', () => {
    for (const milestone of MILESTONES) {
      for (const id of milestone.citationIds) {
        expect(
          getCitation(id),
          `milestone ${milestone.id} cites unknown id "${id}"`,
        ).toBeDefined();
      }
    }
  });

  it('keeps the row-level name compact enough for a table cell', () => {
    for (const milestone of MILESTONES) {
      expect(milestone.name.length).toBeLessThanOrEqual(48);
    }
  });
});

describe('filterMilestones', () => {
  it('returns the full set for "all"', () => {
    expect(filterMilestones(MILESTONES, 'all')).toEqual(MILESTONES);
  });

  it('returns only matching rows for a status filter', () => {
    const partial = filterMilestones(MILESTONES, 'partial');
    expect(partial.length).toBeGreaterThan(0);
    for (const milestone of partial) {
      expect(milestone.status).toBe('partial');
    }
    expect(partial.length).toBeLessThan(MILESTONES.length);
  });

  it('returns an empty array when no row has the status', () => {
    expect(filterMilestones(MILESTONES, 'met')).toEqual([]);
  });
});

describe('milestoneSchema (the build-time completeness gate)', () => {
  const valid = MILESTONES[0] ?? {
    id: 'x',
    name: 'x',
    whyItMatters: 'x',
    status: 'partial' as const,
    statusDetail: 'x',
    howWeKnow: 'x',
    citationIds: ['pi05-2025'],
  };

  it('accepts the shipped rows', () => {
    for (const milestone of MILESTONES) {
      expect(milestoneSchema.safeParse(milestone).success).toBe(true);
    }
  });

  it('rejects a row with an empty why-it-matters', () => {
    expect(
      milestoneSchema.safeParse({ ...valid, whyItMatters: '' }).success,
    ).toBe(false);
  });

  it('rejects a row with an empty status detail', () => {
    expect(
      milestoneSchema.safeParse({ ...valid, statusDetail: '' }).success,
    ).toBe(false);
  });

  it('rejects a row with an empty how-we-know', () => {
    expect(milestoneSchema.safeParse({ ...valid, howWeKnow: '' }).success).toBe(
      false,
    );
  });

  it('rejects a row with an unknown status', () => {
    expect(
      milestoneSchema.safeParse({ ...valid, status: 'unknown' }).success,
    ).toBe(false);
  });

  it('rejects a row with no citation', () => {
    expect(
      milestoneSchema.safeParse({ ...valid, citationIds: [] }).success,
    ).toBe(false);
  });
});
