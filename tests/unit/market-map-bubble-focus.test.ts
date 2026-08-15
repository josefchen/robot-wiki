import { describe, expect, it } from 'vitest';
import {
  BUBBLE_ARROW_KEYS,
  stepMark,
  type BubbleArrowKey,
  type BubbleMarkPosition,
} from '@/lib/market-map';

/**
 * Roving-tabindex arrow movement for the bubble view (accessibility
 * hardening of /market-map). The marks form one tab stop; Arrow keys move
 * between them spatially: left/right step along the founding-year axis,
 * up/down along the funding axis. Ranking is primary-axis-first: the
 * nearest mark along the pressed axis wins, perpendicular distance breaks
 * ties. Pure geometry, no DOM, so it is unit-testable; the e2e spec proves
 * the keyboard behavior in a real browser.
 */

function mark(id: string, cx: number, cy: number): BubbleMarkPosition {
  return { id, cx, cy };
}

describe('stepMark', () => {
  // x grows right (founding year), y grows down (SVG): up = smaller cy.
  const marks = [
    mark('a', 10, 100),
    mark('b', 40, 60),
    mark('c', 90, 140),
    mark('d', 120, 20),
  ];

  it('exposes the four arrow keys it serves', () => {
    expect([...BUBBLE_ARROW_KEYS]).toEqual([
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
    ]);
  });

  it('moves right to the nearest mark with a greater x', () => {
    expect(stepMark(marks, 'a', 'ArrowRight')).toBe('b');
    expect(stepMark(marks, 'b', 'ArrowRight')).toBe('c');
    expect(stepMark(marks, 'c', 'ArrowRight')).toBe('d');
  });

  it('moves left to the nearest mark with a smaller x', () => {
    expect(stepMark(marks, 'd', 'ArrowLeft')).toBe('c');
    expect(stepMark(marks, 'c', 'ArrowLeft')).toBe('b');
    expect(stepMark(marks, 'b', 'ArrowLeft')).toBe('a');
  });

  it('moves up to the nearest mark with a smaller y', () => {
    // y grows downward in SVG: up = smaller cy. From c(90,140) the
    // nearest mark above is a(cy=100, delta 40), not b(cy=60, delta 80).
    expect(stepMark(marks, 'c', 'ArrowUp')).toBe('a');
    expect(stepMark(marks, 'a', 'ArrowUp')).toBe('b');
  });

  it('moves down to the nearest mark with a greater y', () => {
    expect(stepMark(marks, 'd', 'ArrowDown')).toBe('b');
    expect(stepMark(marks, 'b', 'ArrowDown')).toBe('a');
  });

  it('wraps to the far end of the axis at the extremes', () => {
    // a is the leftmost mark: left wraps to the rightmost, d.
    expect(stepMark(marks, 'a', 'ArrowLeft')).toBe('d');
    expect(stepMark(marks, 'd', 'ArrowRight')).toBe('a');
    // d is the topmost mark: up wraps to the bottommost, c.
    expect(stepMark(marks, 'd', 'ArrowUp')).toBe('c');
    // a has c below it, so down is a normal move, not a wrap.
    expect(stepMark(marks, 'a', 'ArrowDown')).toBe('c');
  });

  it('prefers the nearest mark along the pressed axis', () => {
    const spread = [
      mark('start', 100, 100),
      mark('near', 130, 95),
      mark('far', 200, 90),
    ];
    expect(stepMark(spread, 'start', 'ArrowRight')).toBe('near');
    expect(stepMark(spread, 'start', 'ArrowUp')).toBe('near');
    // Left of start there is nothing, so the move wraps to the far end
    // of the x axis, which is the rightmost mark.
    expect(stepMark(spread, 'start', 'ArrowLeft')).toBe('far');
  });

  it('breaks equal-axis ties by perpendicular distance, then id', () => {
    const tied = [
      mark('start', 100, 100),
      mark('same-x-near', 130, 90),
      mark('same-x-far', 130, 40),
    ];
    expect(stepMark(tied, 'start', 'ArrowRight')).toBe('same-x-near');
    // Fully tied marks resolve deterministically by id.
    const flat = [
      mark('start', 100, 100),
      mark('z-twin', 130, 100),
      mark('a-twin', 130, 100),
    ];
    const forward = stepMark(flat, 'start', 'ArrowRight');
    expect(['z-twin', 'a-twin']).toContain(forward);
    expect(stepMark([flat[2], flat[0], flat[1]], 'start', 'ArrowRight')).toBe(
      forward,
    );
  });

  it('returns the current id for an unknown id or key', () => {
    expect(stepMark(marks, 'ghost', 'ArrowRight')).toBe('ghost');
    expect(stepMark(marks, 'a', 'Enter' as BubbleArrowKey)).toBe('a');
    expect(stepMark(marks, 'a', 'a' as BubbleArrowKey)).toBe('a');
    expect(stepMark(marks, 'a', 'Spacebar' as BubbleArrowKey)).toBe('a');
  });

  it('returns the only mark unchanged', () => {
    expect(stepMark([mark('solo', 5, 5)], 'solo', 'ArrowRight')).toBe('solo');
    expect(stepMark([mark('solo', 5, 5)], 'solo', 'ArrowUp')).toBe('solo');
  });

  it('is independent of input order', () => {
    // Plotted marks arrive in data order, not spatial order; movement must
    // not depend on that order.
    const ordered = [
      mark('p1', 20, 200),
      mark('p2', 60, 150),
      mark('p3', 100, 100),
      mark('p4', 140, 50),
    ];
    const shuffled = [ordered[2], ordered[0], ordered[3], ordered[1]];
    for (const key of BUBBLE_ARROW_KEYS as readonly BubbleArrowKey[]) {
      for (const from of ordered) {
        expect(stepMark(shuffled, from.id, key)).toBe(
          stepMark(ordered, from.id, key),
        );
      }
    }
  });

  it('visits every mark on a horizontal sweep from the leftmost', () => {
    const line = [
      mark('left', 10, 50),
      mark('mid', 60, 50),
      mark('right', 110, 50),
    ];
    const visited: string[] = ['left'];
    let current = 'left';
    for (let i = 0; i < 2; i += 1) {
      current = stepMark(line, current, 'ArrowRight');
      visited.push(current);
    }
    expect(visited).toEqual(['left', 'mid', 'right']);
    expect(stepMark(line, current, 'ArrowRight')).toBe('left');
  });
});
