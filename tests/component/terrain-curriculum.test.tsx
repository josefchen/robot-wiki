import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import {
  DEFAULT_ROUND,
  LEVELS,
  MAX_ROUND,
  ROBOTS,
  ROUNDS,
  SLOTS,
  TerrainCurriculum,
  homesOf,
  planOf,
  pointsAt,
  tally,
} from '@/components/interactive/terrain-curriculum';
import { CROSS, HALF_Y, SLOTS_PER_BAY, STRIP, bayOf, bayX, cellOf, groundZ, pointOn, stepCm, tokenShift } from '@/components/iso/figures/terrain-training-table';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('TerrainCurriculum');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<TerrainCurriculum />, { wrapper: Wrapper });
const tokenAt = (container: HTMLElement, i: number) => container.querySelector(`[data-token="${i}"]`)!;

describe('TerrainCurriculum model', () => {
  it('moves every robot by one level at most, except a loop back from the top', () => {
    expect(ROUNDS[0].levels).toEqual(Array(ROBOTS).fill(1));
    for (let r = 1; r < ROUNDS.length; r++) {
      ROUNDS[r].levels.forEach((level, i) => {
        const before = ROUNDS[r - 1].levels[i];
        const move = ROUNDS[r].moves[i];
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(LEVELS);
        if (move === 'up') expect(level).toBe(before + 1);
        if (move === 'down') expect(level).toBe(before - 1);
        if (move === 'stay') expect(level).toBe(before);
        if (move === 'loop') expect(before).toBe(LEVELS);
      });
    }
    expect(tally(ROUNDS[DEFAULT_ROUND]).up).toBeGreaterThan(0);
    expect(ROUNDS.some((round) => tally(round).loop > 0)).toBe(true);
  });

  it('raises the step height evenly from 5 cm on the easiest bay to 20 cm on the hardest', () => {
    expect(stepCm(1)).toBe(5);
    expect(stepCm(LEVELS)).toBe(20);
    // The summit of every bay is three steps up, and the start deck is flat.
    for (let level = 2; level <= LEVELS; level++) expect(groundZ(bayX(level), HALF_Y)).toBeGreaterThan(groundZ(bayX(level - 1), HALF_Y));
    expect(groundZ(bayX(LEVELS), STRIP.y1 + 5)).toBe(groundZ(bayX(1), STRIP.y1 + 5));
  });

  it('gives every token its own slot on the start deck of its bay, in every round the reader can reach', () => {
    for (let r = DEFAULT_ROUND; r <= MAX_ROUND; r++) {
      const homes = homesOf(r);
      expect(new Set(homes.map(([x, y]) => `${x},${y}`)).size).toBe(ROBOTS);
      ROUNDS[r].levels.forEach((level, i) => {
        expect(SLOTS[r][i]).toBeLessThan(SLOTS_PER_BAY);
        expect(bayOf(homes[i][0])).toBe(level);
        expect(cellOf(homes[i])).toBe(`${level}-home`);
      });
    }
  });

  it('walks each token as far as the model says: across for those that move up, short of the summit for those that move down', () => {
    for (let r = DEFAULT_ROUND; r <= MAX_ROUND; r++) {
      const plan = planOf(r);
      const walked = pointsAt(r, 0.34);
      ROUNDS[r].moves.forEach((move, i) => {
        const [, y] = walked[i];
        if (move === 'up' || move === 'loop') expect(y).toBeLessThan(STRIP.y0);
        if (move === 'down') expect(y).toBeGreaterThan(HALF_Y);
        // Every path ends at the token's new home.
        expect(pointOn(plan[i], 1)).toEqual(homesOf(r)[i]);
        expect(pointOn(plan[i], 0)).toEqual(homesOf(r - 1)[i]);
      });
      // Tokens that move up walk the whole strip and ride the back shuttle one bay toward the hard end.
      ROUNDS[r].moves.forEach((move, i) => {
        if (move !== 'up') return;
        const [x0, y0] = homesOf(r - 1)[i];
        expect(walked[i]).toEqual([x0, y0 - CROSS]);
        expect(bayOf(pointsAt(r, 0.7)[i][0])).toBe(ROUNDS[r].levels[i]);
      });
    }
  });

  it('never lets two tokens of one bay pass through each other on the stairs', () => {
    for (let r = DEFAULT_ROUND; r <= MAX_ROUND; r++) {
      for (let u = 0; u <= 0.34; u += 0.02) {
        const points = pointsAt(r, u);
        for (let a = 0; a < ROBOTS; a++) for (let b = a + 1; b < ROBOTS; b++) {
          const [ax, ay] = points[a];
          const [bx, by] = points[b];
          expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThan(7.9);
        }
      }
    }
  });
});

describe('TerrainCurriculum', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Terrain curriculum');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Robots that cope get harder ground; strugglers get easier');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'Robots that cross their patch move to harder ground, and those that cover less than half of it move back.',
    );
  });

  it('draws the table as a machine: twenty tokens on the start deck, the movers-up lit, no words in the drawing', () => {
    const { container } = renderFigure();
    const tokens = container.querySelectorAll('[data-token]');
    expect(tokens).toHaveLength(ROBOTS);
    const homes = homesOf(DEFAULT_ROUND);
    ROUNDS[DEFAULT_ROUND].moves.forEach((move, i) => {
      const token = tokenAt(container, i);
      expect(token.getAttribute('transform')).toBe(tokenShift(homes[i]));
      expect(token.getAttribute('data-move')).toBe(move);
      expect(token.closest('[data-tokens]')).toHaveAttribute('data-tokens', cellOf(homes[i]));
      // At rest every token stands on the start deck of the bay of its level.
      expect(cellOf(homes[i])).toBe(`${ROUNDS[DEFAULT_ROUND].levels[i]}-home`);
      expect(token.querySelectorAll('.iso-solid[data-lit]').length > 0).toBe(move === 'up');
    });
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
    expect(container.querySelector('[data-readout]')).toHaveTextContent(`Round ${DEFAULT_ROUND}: ${tally(ROUNDS[DEFAULT_ROUND]).up} moved up`);
  });

  it('opens after a few rounds and runs one more with the button, or goes back to the opening round', () => {
    const { container } = renderFigure();
    const stage = screen.getByTestId('curriculum-stage');
    expect(stage).toHaveAttribute('data-round', String(DEFAULT_ROUND));
    fireEvent.click(screen.getByRole('button', { name: 'Run a training round' }));
    expect(stage).toHaveAttribute('data-round', String(DEFAULT_ROUND + 1));
    const { up, down } = tally(ROUNDS[DEFAULT_ROUND + 1]);
    expect(screen.getByTestId('curriculum-live')).toHaveTextContent(`Round ${DEFAULT_ROUND + 1}: ${up} moved up, ${down} moved down`);
    expect(container.querySelector('[data-readout]')).toHaveTextContent(`Round ${DEFAULT_ROUND + 1}: ${up} moved up, ${down} moved down`);
    // Without motion the round is drawn finished: every token at its new home, the new movers-up lit.
    const homes = homesOf(DEFAULT_ROUND + 1);
    ROUNDS[DEFAULT_ROUND + 1].moves.forEach((move, i) => {
      expect(tokenAt(container, i).getAttribute('transform')).toBe(tokenShift(homes[i]));
      expect(tokenAt(container, i).closest('[data-tokens]')).toHaveAttribute('data-tokens', `${ROUNDS[DEFAULT_ROUND + 1].levels[i]}-home`);
      expect(tokenAt(container, i).querySelectorAll('.iso-solid[data-lit]').length > 0).toBe(move === 'up');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(stage).toHaveAttribute('data-round', String(DEFAULT_ROUND));
    const opening = tally(ROUNDS[DEFAULT_ROUND]);
    expect(screen.getByTestId('curriculum-live')).toHaveTextContent(`Round ${DEFAULT_ROUND}: ${opening.up} moved up, ${opening.down} moved down`);
  });

  it('restores the exact opening state with its reset, after several rounds', async () => {
    const { container } = renderFigure();
    const opening = container.innerHTML;
    const reset = screen.getByTestId('curriculum-reset');
    // The reset keeps its registered identity and the instruments' shared name.
    expect(reset).toHaveAttribute('data-instrument-reset');
    expect(reset).toHaveAttribute('data-brand-control-id', 'control:secondary-action');
    expect(reset).toHaveAccessibleName('Reset');
    const run = screen.getByRole('button', { name: 'Run a training round' });
    for (let i = 0; i < 3; i += 1) fireEvent.click(run);
    expect(container.innerHTML).not.toBe(opening);
    fireEvent.click(reset);
    expect(container.innerHTML).toBe(opening);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });
    expect(container.innerHTML).toBe(opening);
    fireEvent.click(run);
    expect(screen.getByTestId('curriculum-stage')).toHaveAttribute('data-round', String(DEFAULT_ROUND + 1));
  });

  it('keeps focus on the round button once the last round has run', () => {
    renderFigure();
    const stage = screen.getByTestId('curriculum-stage');
    const run = screen.getByRole('button', { name: 'Run a training round' });
    run.focus();
    for (let i = 0; i < ROUNDS.length && run.getAttribute('aria-disabled') !== 'true'; i += 1) {
      fireEvent.click(run);
    }
    expect(stage).toHaveAttribute('data-round', String(ROUNDS.length - 1));
    // Unavailable after the last round but still focusable, so the last press keeps keyboard focus.
    expect(run).toHaveAttribute('aria-disabled', 'true');
    expect(run).toHaveFocus();
    fireEvent.click(run);
    expect(stage).toHaveAttribute('data-round', String(ROUNDS.length - 1));
  });

  it('describes the drawing and links the paper', () => {
    renderFigure();
    const drawing = screen.getByRole('img', { name: /terrain training table: eight bays of stairs/ });
    expect(drawing.getAttribute('aria-label')).toMatch(new RegExp(`after round ${DEFAULT_ROUND} there are`));
    expect(document.getElementById(drawing.getAttribute('aria-describedby') ?? '')).toHaveTextContent('covered under half the commanded distance');
    expect(screen.getByTestId('curriculum-source').querySelector('a')).toHaveAttribute('href', records[0].url);
  });
});

describe('TerrainCurriculum served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><TerrainCurriculum /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/legged-locomotion/');
    expect(figures).toEqual(['terrain-curriculum']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
  it('serves the opening round with every token drawn', () => {
    const document = new JSDOM(html).window.document;
    expect(document.querySelectorAll('[data-token]')).toHaveLength(ROBOTS);
  });
});
