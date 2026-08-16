import { describe, expect, it } from 'vitest';
import {
  TIMELINE_ARROW_KEYS,
  stepTimeline,
  type TimelineArrowKey,
  type TimelineRow,
} from '@/lib/market-map';

/**
 * Roving-tabindex movement for the funding timeline (tab-stop parity with
 * the bubble view's stepMark). The timeline is one tab stop; ArrowUp and
 * ArrowDown move between rows in visual order, which is chronological
 * order (date, then company name): the sort timelineEvents already
 * renders. Pure position logic, no DOM, so it is unit-testable; the e2e
 * spec proves the keyboard behavior in a real browser.
 */

function row(id: string, date: string): TimelineRow {
  return { id, date };
}

describe('stepTimeline', () => {
  const rows = [
    row('early', '2023-01-01'),
    row('mid-a', '2024-01-01'),
    row('mid-b', '2024-06-01'),
    row('late', '2025-09-16'),
  ];

  it('exposes the two arrow keys it serves', () => {
    expect([...TIMELINE_ARROW_KEYS]).toEqual(['ArrowUp', 'ArrowDown']);
  });

  it('moves down to the next row in chronological order', () => {
    expect(stepTimeline(rows, 'early', 'ArrowDown')).toBe('mid-a');
    expect(stepTimeline(rows, 'mid-a', 'ArrowDown')).toBe('mid-b');
    expect(stepTimeline(rows, 'mid-b', 'ArrowDown')).toBe('late');
  });

  it('moves up to the previous row in chronological order', () => {
    expect(stepTimeline(rows, 'late', 'ArrowUp')).toBe('mid-b');
    expect(stepTimeline(rows, 'mid-b', 'ArrowUp')).toBe('mid-a');
    expect(stepTimeline(rows, 'mid-a', 'ArrowUp')).toBe('early');
  });

  it('wraps at the ends of the list like a radio group', () => {
    expect(stepTimeline(rows, 'late', 'ArrowDown')).toBe('early');
    expect(stepTimeline(rows, 'early', 'ArrowUp')).toBe('late');
  });

  it('walks the full list from the first row and back', () => {
    const visited: string[] = ['early'];
    let current = 'early';
    for (let i = 0; i < 3; i += 1) {
      current = stepTimeline(rows, current, 'ArrowDown');
      visited.push(current);
    }
    expect(visited).toEqual(['early', 'mid-a', 'mid-b', 'late']);
    expect(stepTimeline(rows, current, 'ArrowDown')).toBe('early');
  });

  it('follows render order, not the date value, when dates tie', () => {
    // timelineEvents sorts same-date events by company name, so visual
    // order is the sort order. Rows arriving in that order move by
    // position: mid-a then mid-b, regardless of equal dates upstream.
    const tied = [row('first', '2024-01-01'), row('second', '2024-01-01')];
    expect(stepTimeline(tied, 'first', 'ArrowDown')).toBe('second');
    expect(stepTimeline(tied, 'second', 'ArrowUp')).toBe('first');
  });

  it('follows render order even when the caller passes unsorted rows', () => {
    // The rows are rendered in sorted order, but the function must not
    // depend on the caller having sorted them: movement is positional in
    // the array the view renders, which is the order the reader sees.
    const unsorted = [
      row('z-late', '2025-09-16'),
      row('a-early', '2023-01-01'),
      row('m-mid', '2024-06-01'),
    ];
    expect(stepTimeline(unsorted, 'z-late', 'ArrowDown')).toBe('a-early');
    expect(stepTimeline(unsorted, 'a-early', 'ArrowUp')).toBe('z-late');
  });

  it('returns the current id for an unknown id or key', () => {
    expect(stepTimeline(rows, 'ghost', 'ArrowDown')).toBe('ghost');
    expect(stepTimeline(rows, 'early', 'ArrowLeft' as TimelineArrowKey)).toBe(
      'early',
    );
    expect(stepTimeline(rows, 'early', 'Enter' as TimelineArrowKey)).toBe(
      'early',
    );
    expect(stepTimeline(rows, 'early', ' ' as TimelineArrowKey)).toBe('early');
  });

  it('returns the only row unchanged', () => {
    expect(stepTimeline([row('solo', '2023-05-05')], 'solo', 'ArrowDown')).toBe(
      'solo',
    );
    expect(stepTimeline([row('solo', '2023-05-05')], 'solo', 'ArrowUp')).toBe(
      'solo',
    );
  });

  it('visits every row on a full sweep from the first', () => {
    const five = [
      row('r1', '2023-02-02'),
      row('r2', '2023-03-03'),
      row('r3', '2024-04-04'),
      row('r4', '2025-05-05'),
      row('r5', '2026-06-06'),
    ];
    const visited: string[] = ['r1'];
    let current = 'r1';
    for (let i = 0; i < 4; i += 1) {
      current = stepTimeline(five, current, 'ArrowDown');
      visited.push(current);
    }
    expect(visited).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
  });
});
