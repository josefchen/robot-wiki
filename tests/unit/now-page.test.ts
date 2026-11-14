import { describe, expect, it } from 'vitest';
import { DELIVERY_GAPS, DEVELOPMENTS, TRAJECTORIES } from '@/data/now';
import { NOW_ARGUMENTS, OPEN_QUESTIONS } from '@/data/now-debates';
import { CHART_DESCRIPTIONS } from '@/lib/chart-descriptions';
import { resolvedTrajectories, type ResolvedTrajectory } from '@/lib/now';
import {
  NOW_SECTIONS,
  directionCounts,
  endNote,
  figureSourceCount,
  formatDateSpan,
  formatStatedDate,
  gapSources,
  nowPageCounts,
  questionsWithArguments,
  sourceHost,
  standaloneArguments,
  stated,
  trajectoryDescription,
  trajectoryHeadline,
  trajectoryPositions,
  trajectorySources,
} from '@/lib/now-page';

const rows = resolvedTrajectories();
const row = (id: string) => rows.find((candidate) => candidate.id === id)!;

describe('trajectory positions', () => {
  it('puts the larger end at 100 and the other at its share of it, from zero', () => {
    expect(trajectoryPositions(row('da-vinci-installed-base'))).toEqual({
      earlier: (10_763 / 12_094) * 100,
      later: 100,
    });
    expect(trajectoryPositions(row('humanoid-control-gpu-hours'))).toEqual({
      earlier: 100,
      later: (3 / (128 * 7 * 24)) * 100,
    });
  });

  it('keeps every end on the track', () => {
    for (const trajectory of rows) {
      const { earlier, later } = trajectoryPositions(trajectory);
      for (const position of [earlier, later]) {
        expect(position, trajectory.id).toBeGreaterThanOrEqual(0);
        expect(position, trajectory.id).toBeLessThanOrEqual(100);
      }
      expect(Math.max(earlier, later), trajectory.id).toBe(100);
    }
  });

  it('puts both ends at zero when neither has a value', () => {
    const empty = { ...rows[0], earlier: { ...rows[0].earlier, value: 0 }, later: { ...rows[0].later, value: 0 } };
    expect(trajectoryPositions(empty as ResolvedTrajectory)).toEqual({ earlier: 0, later: 0 });
  });
});

describe('the figure headline and description', () => {
  it('counts directions from the rows', () => {
    const counts = directionCounts(rows);
    expect(counts.up + counts.down + counts.flat).toBe(TRAJECTORIES.length);
    expect(counts).toEqual({
      up: rows.filter((r) => r.later.value > r.earlier.value).length,
      down: rows.filter((r) => r.later.value < r.earlier.value).length,
      flat: 0,
    });
    expect(trajectoryHeadline(rows)).toBe(`${counts.up} of ${rows.length} measures rose and ${counts.down} fell`);
  });

  it('names a held measure only when one holds', () => {
    const held = [{ ...rows[0], direction: 'flat' as const }, ...rows.slice(1)];
    expect(trajectoryHeadline(held)).toContain(', 1 held and');
  });

  it('describes every row with both ends and their periods, and is the registered text', () => {
    const text = trajectoryDescription(rows);
    for (const trajectory of rows) {
      expect(text).toContain(
        `${trajectory.title}, ${trajectory.earlier.display} (${trajectory.earlier.period}) to ${trajectory.later.display} (${trajectory.later.period})`,
      );
    }
    expect(CHART_DESCRIPTIONS.find((entry) => entry.route === '/now/')?.text).toBe(text);
  });

  it('counts each source page once', () => {
    const urls = new Set(rows.flatMap((trajectory) => trajectorySources(trajectory).map((s) => s.sourceUrl)));
    expect(figureSourceCount(rows)).toBe(urls.size);
    for (const trajectory of rows) {
      const own = trajectorySources(trajectory).map((s) => s.sourceUrl);
      expect(new Set(own).size, trajectory.id).toBe(own.length);
      expect(own.length, trajectory.id).toBeGreaterThan(0);
    }
  });
});

describe('end notes and gap sources', () => {
  it('returns a stated end’s note, and null for an end without one', () => {
    for (const trajectory of TRAJECTORIES) {
      for (const which of ['earlier', 'later'] as const) {
        const end = trajectory[which];
        const expected = end.basis === 'stated' ? (end.note ?? null) : null;
        expect(endNote(trajectory.id, which), `${trajectory.id} ${which}`).toEqual(expected);
      }
    }
    expect(TRAJECTORIES.some((trajectory) => endNote(trajectory.id, 'later') !== null)).toBe(true);
    expect(endNote('no-such-row', 'later')).toBeNull();
  });

  it('counts an end note’s page among its row’s sources', () => {
    for (const trajectory of rows) {
      const urls = trajectorySources(trajectory).map((source) => source.sourceUrl);
      for (const which of ['earlier', 'later'] as const) {
        const note = endNote(trajectory.id, which);
        if (note) expect(urls, trajectory.id).toContain(note.sourceUrl);
      }
    }
  });

  it('lists a gap’s pages once each, the headline’s first', () => {
    for (const gap of DELIVERY_GAPS) {
      const urls = gapSources(gap).map((source) => source.sourceUrl);
      expect(urls[0], gap.id).toBe(gap.promised.sourceUrl);
      expect(urls, gap.id).toEqual([...new Set([gap.promised.sourceUrl, gap.delivered.sourceUrl])]);
    }
  });
});

describe('the debate rows', () => {
  it('shows a linked argument under its question and never as its own row', () => {
    const linked = questionsWithArguments().flatMap(({ argument }) => (argument ? [argument.id] : []));
    const own = standaloneArguments().map((argument) => argument.id);
    expect(linked.filter((id) => own.includes(id))).toEqual([]);
    expect(new Set([...linked, ...own])).toEqual(new Set(NOW_ARGUMENTS.map((argument) => argument.id)));
    expect(questionsWithArguments().map(({ question }) => question.rank)).toEqual(
      [...OPEN_QUESTIONS].map((question) => question.rank).sort((a, b) => a - b),
    );
  });
});

describe('formatting', () => {
  it('writes a date as precisely as its source states it', () => {
    expect(formatStatedDate('2026')).toBe('2026');
    expect(formatStatedDate('2026-11')).toBe('November 2026');
    expect(formatStatedDate('2026-11-08')).toBe('8 Nov 2026');
    expect(formatStatedDate('not disclosed')).toBe('not disclosed');
    expect(stated('2026-11')).toBe('2026-11');
    expect(stated('not disclosed')).toBeNull();
  });

  it('drops the first year from a span within one year', () => {
    expect(formatDateSpan('2026-10-15', '2026-11-14')).toBe('15 October and 14 November 2026');
    expect(formatDateSpan('2025-12-30', '2026-01-02')).toBe('30 December 2025 and 2 January 2026');
  });

  it('labels a source by its host', () => {
    expect(sourceHost('https://www.iso.org/standard/83498.html')).toBe('iso.org');
    expect(sourceHost('https://arxiv.org/abs/2611.09892')).toBe('arxiv.org');
  });
});

describe('page counts', () => {
  it('computes every count the leads state from the rows', () => {
    const counts = nowPageCounts();
    expect(counts.developments).toBe(DEVELOPMENTS.length);
    expect(counts.questions).toBe(OPEN_QUESTIONS.length);
    expect(counts.gaps).toBe(DELIVERY_GAPS.length);
    expect(counts.questionsWithArguments + counts.standaloneArguments).toBe(NOW_ARGUMENTS.length);
    expect(NOW_SECTIONS.map((section) => section.id)).toHaveLength(5);
  });
});
