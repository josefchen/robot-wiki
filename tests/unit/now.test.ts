import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  DELIVERY_GAPS,
  DEVELOPMENTS,
  DEVELOPMENTS_FROM,
  NOW_AS_OF,
  TRAJECTORIES,
} from '@/data/now';
import {
  DEVELOPMENT_WHAT_MAX,
  deliveryGapSchema,
  developmentSchema,
  trajectorySchema,
  trajectoryUnitSchema,
  type Computation,
  type TrajectoryEnd,
} from '@/data/schemas/now';
import {
  DEVELOPMENT_AREAS,
  TRAJECTORY_UNIT_FORMATS,
  computeValue,
  developmentCountsByArea,
  developmentsNewestFirst,
  endSources,
  endValue,
  formatEnd,
  formatGapValue,
  latestDevelopments,
  resolvedTrajectories,
} from '@/lib/now';
import { homeCopyProblems } from '@/lib/home-copy';
import { findBannedVocabulary } from '@/lib/prose-lint';

/**
 * The Robotics now data contract: every row parses, every cited page is
 * https, every computed number is recomputed here from the stored inputs,
 * developments stay inside their window and read as one sentence, and no
 * text carries a dash.
 */

const ALL_RECORDS: unknown[] = [...TRAJECTORIES, ...DEVELOPMENTS, ...DELIVERY_GAPS];

/** Every string in a record, with the key it sits under. */
function strings(value: unknown, key = ''): Array<{ key: string; text: string }> {
  if (typeof value === 'string') return [{ key, text: value }];
  if (Array.isArray(value)) return value.flatMap((item) => strings(item, key));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([childKey, child]) => strings(child, childKey));
  }
  return [];
}

/** Keys that hold copy we write, as against quotes, URLs, titles and codes. */
const COPY_KEYS = new Set([
  'title',
  'measuredBy',
  'caveat',
  'label',
  'period',
  'text',
  'what',
  'means',
  'doesNotMean',
  'who',
  'unit',
]);

const DASHES = /[‒–—―−﹘﹣－]/;

/** The value recomputed here from a computation's stated inputs. */
function recompute(computation: Computation): number {
  switch (computation.kind) {
    case 'implied-by-growth':
      return computation.later.value * (100 / (100 + computation.growthPercent.value));
    case 'sum': {
      let total = 0;
      for (const part of computation.parts) total += part.value;
      return total;
    }
    case 'robot-share': {
      if (computation.parts.every((part) => part.robot)) return 100;
      let robot = 0;
      let all = 0;
      for (const part of computation.parts) {
        all += part.hours ?? Number.NaN;
        if (part.robot) robot += part.hours ?? Number.NaN;
      }
      return (100 * robot) / all;
    }
    case 'days-between': {
      const from = new Date(`${computation.from.date}T12:00:00Z`).getTime();
      const to = new Date(`${computation.to.date}T12:00:00Z`).getTime();
      return Math.round((to - from) / (24 * 60 * 60 * 1000));
    }
    case 'gpu-hours':
      return computation.gpus.value * computation.days.value * 24;
  }
}

const ends = (): Array<{ id: string; end: TrajectoryEnd }> =>
  TRAJECTORIES.flatMap((row) => [
    { id: `${row.id}.earlier`, end: row.earlier },
    { id: `${row.id}.later`, end: row.later },
    ...(row.alongside ?? []).map((end, index) => ({ id: `${row.id}.alongside.${index}`, end })),
  ]);

describe('Robotics now records', () => {
  it('parse against their schemas', () => {
    expect(z.array(trajectorySchema).safeParse(TRAJECTORIES).error).toBeUndefined();
    expect(z.array(developmentSchema).safeParse(DEVELOPMENTS).error).toBeUndefined();
    expect(z.array(deliveryGapSchema).safeParse(DELIVERY_GAPS).error).toBeUndefined();
  });

  it('keep every key unique across the three exports', () => {
    const ids = [...TRAJECTORIES, ...DEVELOPMENTS, ...DELIVERY_GAPS].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cite only https pages, each with a title, a source type and a quoted passage', () => {
    const urls = strings(ALL_RECORDS).filter(({ key }) => key === 'sourceUrl');
    expect(urls.length).toBeGreaterThan(0);
    for (const { text } of urls) expect(text, text).toMatch(/^https:\/\//);
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (!value || typeof value !== 'object') return;
      const record = value as Record<string, unknown>;
      if ('sourceUrl' in record) {
        expect(typeof record.sourceTitle, String(record.sourceUrl)).toBe('string');
        expect(['primary', 'reported'], String(record.sourceUrl)).toContain(record.sourceType);
        expect(String(record.wording ?? '').length, String(record.sourceUrl)).toBeGreaterThan(0);
      }
      Object.values(record).forEach(walk);
    };
    walk(ALL_RECORDS);
  });

  it('carry no dash character in any text, and no spaced hyphen in our own copy', () => {
    for (const { key, text } of strings(ALL_RECORDS)) {
      expect(DASHES.test(text), `${key}: ${text}`).toBe(false);
      if (COPY_KEYS.has(key)) expect(text.includes(' - '), `${key}: ${text}`).toBe(false);
    }
  });

  it('use none of the banned vocabulary in our own copy', () => {
    for (const { key, text } of strings(ALL_RECORDS)) {
      if (!COPY_KEYS.has(key)) continue;
      expect(findBannedVocabulary(text), `${key}: ${text}`).toEqual([]);
    }
  });
});

describe('TRAJECTORIES', () => {
  it('holds ten rows, each with two dated ends in order', () => {
    expect(TRAJECTORIES).toHaveLength(10);
    for (const row of TRAJECTORIES) {
      expect(row.earlier.date < row.later.date, row.id).toBe(true);
      expect(row.later.date <= NOW_AS_OF, row.id).toBe(true);
    }
  });

  it('gives every end at least one source of its own', () => {
    for (const { id, end } of ends()) {
      expect(endSources(end).length, id).toBeGreaterThan(0);
    }
  });

  it('computes every computed end to the value recomputed from its stored inputs', () => {
    const computed = ends().filter(({ end }) => end.basis === 'computed');
    expect(computed.length).toBeGreaterThan(0);
    for (const { id, end } of computed) {
      if (end.basis !== 'computed') continue;
      const expected = recompute(end.computation);
      expect(Number.isFinite(expected), id).toBe(true);
      expect(endValue(end), id).toBeCloseTo(expected, 9);
      expect(computeValue(end.computation), id).toBeCloseTo(expected, 9);
    }
  });

  it('marks the humanoid shipment row reported and its earlier end implied', () => {
    const row = TRAJECTORIES.find((r) => r.id === 'humanoid-shipments');
    expect(row?.later.basis).toBe('stated');
    expect(row?.earlier.basis).toBe('computed');
    expect(row?.earlier.label.toLowerCase()).toContain('implied');
    for (const source of row ? [...endSources(row.earlier), ...endSources(row.later)] : []) {
      expect(source.sourceType).toBe('reported');
    }
    expect(row && formatEnd(row, row.earlier)).toMatch(/^about /);
  });

  it('keeps the GPU-hours ratio in the paper words, not as a computed multiple', () => {
    const row = TRAJECTORIES.find((r) => r.id === 'humanoid-control-gpu-hours');
    expect(row?.earlier.basis).toBe('computed');
    expect(row?.later.basis).toBe('stated');
    expect(row?.ratio?.text).toContain('more than 1000x');
    expect(row?.ratio?.wording).toContain('1000');
  });

  it('marks RoboLab-120 as simulation and matches each rate to its episodes', () => {
    const row = TRAJECTORIES.find((r) => r.id === 'robolab-120-success');
    expect(row?.simulation).toBe(true);
    expect(row?.title.toLowerCase()).toContain('simulation');
    const stated = [row?.earlier, row?.later, ...(row?.alongside ?? [])];
    for (const end of stated) {
      expect(end?.basis).toBe('stated');
      if (end?.basis !== 'stated' || !end.episodes) throw new Error('RoboLab ends need episodes');
      const rate = Math.round((1000 * end.episodes.successes) / end.episodes.total) / 10;
      expect(end.value, end.label).toBe(rate);
    }
  });

  it("keeps Alphabet's own words for each Waymo end and says no newer figure exists", () => {
    const row = TRAJECTORIES.find((r) => r.id === 'waymo-weekly-rides');
    expect(row?.earlier.label.toLowerCase()).toContain('paid');
    expect(row?.later.label.toLowerCase()).toContain('fully autonomous');
    expect(row?.later.label.toLowerCase()).not.toContain('paid');
    expect(row?.note?.text.toLowerCase()).toContain('no newer');
  });

  it("keeps the AMP1 end's paper date and notes the leaderboard's own submission date", () => {
    const end = TRAJECTORIES.find((r) => r.id === 'robolab-120-success')?.later;
    if (end?.basis !== 'stated') throw new Error('AMP1 end must be stated');
    expect(end.date).toBe(end.dateSource?.wording.includes('6 Nov 2026') ? '2026-11-06' : 'unexpected');
    expect(end.note?.sourceUrl).toBe(end.sourceUrl);
    expect(end.note?.wording).toContain('Submitted Oct 15, 2026');
  });

  it('formats every unit and every end', () => {
    for (const unit of trajectoryUnitSchema.options) {
      expect(typeof TRAJECTORY_UNIT_FORMATS[unit], unit).toBe('function');
    }
    for (const row of resolvedTrajectories()) {
      expect(row.earlier.display.length, row.id).toBeGreaterThan(0);
      expect(row.later.display.length, row.id).toBeGreaterThan(0);
      expect(['up', 'down', 'flat']).toContain(row.direction);
    }
  });
});

describe('DEVELOPMENTS', () => {
  it('holds at most 16 rows, all inside the window', () => {
    expect(DEVELOPMENTS.length).toBeLessThanOrEqual(16);
    for (const row of DEVELOPMENTS) {
      expect(row.date >= DEVELOPMENTS_FROM && row.date <= NOW_AS_OF, row.id).toBe(true);
    }
  });

  it('gives each a single sentence of 110 characters or fewer that home can show', () => {
    expect(DEVELOPMENT_WHAT_MAX).toBe(110);
    for (const row of DEVELOPMENTS) {
      expect(row.what.length, row.what).toBeLessThanOrEqual(110);
      expect(row.what, row.id).toMatch(/^[A-Z].*\.$/);
      expect(row.what.slice(0, -1), row.what).not.toMatch(/[.!?](\s|$)/);
      expect(homeCopyProblems(row.what), row.what).toEqual([]);
    }
  });

  it('is stored newest first, and the helper sorts the same way', () => {
    for (let index = 1; index < DEVELOPMENTS.length; index += 1) {
      expect(DEVELOPMENTS[index].date <= DEVELOPMENTS[index - 1].date, DEVELOPMENTS[index].id).toBe(true);
    }
    const sorted = developmentsNewestFirst();
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index].date <= sorted[index - 1].date).toBe(true);
    }
    const shuffled = [...DEVELOPMENTS].reverse();
    expect(developmentsNewestFirst(shuffled).map((row) => row.date)).toEqual(sorted.map((row) => row.date));
  });

  it('balances the areas: four or more each for models, deployments and policy, two or fewer for money', () => {
    const counts = developmentCountsByArea();
    expect(counts.models).toBeGreaterThanOrEqual(4);
    expect(counts.deployments).toBeGreaterThanOrEqual(4);
    expect(counts.policy).toBeGreaterThanOrEqual(4);
    expect(counts.money).toBeLessThanOrEqual(2);
    const total = DEVELOPMENT_AREAS.reduce((sum, area) => sum + counts[area], 0);
    expect(total).toBe(DEVELOPMENTS.length);
  });

  it('never offers a reported row to the home page', () => {
    expect(DEVELOPMENTS.some((row) => row.sourceType === 'reported')).toBe(true);
    for (const count of [0, 1, 4, DEVELOPMENTS.length + 5]) {
      const rows = latestDevelopments(count);
      expect(rows.length).toBeLessThanOrEqual(count);
      for (const row of rows) expect(row.sourceType, row.id).toBe('primary');
    }
    const primary = DEVELOPMENTS.filter((row) => row.sourceType === 'primary').length;
    expect(latestDevelopments(DEVELOPMENTS.length)).toHaveLength(primary);
    expect(latestDevelopments(4)).toEqual(developmentsNewestFirst().filter((r) => r.sourceType === 'primary').slice(0, 4));
  });

  it('says simulation wherever a simulation benchmark score appears', () => {
    for (const row of DEVELOPMENTS) {
      const text = `${row.what} ${row.means} ${row.doesNotMean}`;
      if (/RoboLab|RoboDojo|LIBERO/.test(text)) {
        expect(/simulat/i.test(text), row.id).toBe(true);
      }
    }
  });
});

describe('DELIVERY_GAPS', () => {
  it('holds ten to fourteen rows, including a promise that was exceeded', () => {
    expect(DELIVERY_GAPS.length).toBeGreaterThanOrEqual(10);
    expect(DELIVERY_GAPS.length).toBeLessThanOrEqual(14);
    const ubtech = DELIVERY_GAPS.find((row) => row.id === 'ubtech-walker-s2');
    expect(ubtech?.promised.value).not.toBeNull();
    expect(ubtech?.delivered.value).not.toBeNull();
    expect((ubtech?.delivered.value ?? 0) > (ubtech?.promised.value ?? 0)).toBe(true);
  });

  it('labels every number with what it counts', () => {
    for (const row of DELIVERY_GAPS) {
      for (const key of ['promised', 'delivered'] as const) {
        const side = row[key];
        if (side.value === null) {
          expect(formatGapValue(row, key), row.id).toBe(side.countKind === 'milestone' ? 'n/a' : 'not disclosed');
          continue;
        }
        expect(side.countKind, row.id).toBeDefined();
        expect(side.countKind, row.id).not.toBe('milestone');
        expect(formatGapValue(row, key), row.id).toMatch(/\d/);
      }
    }
    const agility = DELIVERY_GAPS.find((row) => row.id === 'agility-digit-5');
    expect(agility && formatGapValue(agility, 'promised')).toMatch(/^more than \$/);
  });

  it('dates both sides no later than the as-of date', () => {
    for (const row of DELIVERY_GAPS) {
      expect(row.delivered.asOf <= NOW_AS_OF, row.id).toBe(true);
      expect(row.promised.said <= NOW_AS_OF, row.id).toBe(true);
    }
  });
});
