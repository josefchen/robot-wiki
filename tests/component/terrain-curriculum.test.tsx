import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { DEFAULT_ROUND, LEVELS, ROBOTS, ROUNDS, TerrainCurriculum, tally } from '@/components/interactive/terrain-curriculum';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('TerrainCurriculum');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<TerrainCurriculum />, { wrapper: Wrapper });

describe('TerrainCurriculum', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Terrain curriculum');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Robots that cope get harder ground; strugglers get easier');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'Robots that cross their patch move to harder ground; those covering under half move back.',
    );
  });

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

  it('opens after a few rounds and runs one more with the button, or starts over', () => {
    renderFigure();
    const stage = screen.getByTestId('curriculum-stage');
    expect(stage).toHaveAttribute('data-round', String(DEFAULT_ROUND));
    fireEvent.click(screen.getByRole('button', { name: 'Run a training round' }));
    expect(stage).toHaveAttribute('data-round', String(DEFAULT_ROUND + 1));
    const { up, down } = tally(ROUNDS[DEFAULT_ROUND + 1]);
    expect(screen.getByTestId('curriculum-live')).toHaveTextContent(`Round ${DEFAULT_ROUND + 1}: ${up} moved up, ${down} moved down`);
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(stage).toHaveAttribute('data-round', '0');
    expect(screen.getByTestId('curriculum-live')).toHaveTextContent('every robot starts on the easiest ground');
  });

  it('describes the stage and links the paper', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /simulated robots spread over 8 terrain levels/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent('covered under half the commanded distance');
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
});
