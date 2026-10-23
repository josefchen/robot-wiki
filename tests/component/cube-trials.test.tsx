import { fireEvent, render, screen } from '@testing-library/react';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { CubeTrials, SENSING, SUBGOALS, TRIALS } from '@/components/interactive/cube-trials';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('CubeTrials');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<CubeTrials />, { wrapper: Wrapper });

describe('CubeTrials', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Sim-trained dexterity');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('The cube-solving hand finished at most 2 of 10 trials');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "OpenAI's sim-trained hand finished a fixed Rubik's cube scramble in 2 of 10 trials with a sensor cube, 0 with vision.",
    );
  });

  it("keeps the paper's counts", () => {
    expect([TRIALS, SUBGOALS]).toEqual([10, 43]);
    expect(SENSING.map((s) => [s.id, s.solved])).toEqual([
      ['sensor', 2],
      ['vision', 0],
    ]);
  });

  it('opens on the sensor cube and empties the tally with the one preset row', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('cube-stage')).toHaveAttribute('data-solved', '2');
    expect(container.querySelectorAll('[data-trial]')).toHaveLength(10);
    expect(container.querySelectorAll('[data-trial][data-solved]')).toHaveLength(2);
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('2 of 10 trials finished the scramble');
    const vision = screen.getByTestId('cube-sensing-vision');
    fireEvent.click(vision);
    expect(vision).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('cube-stage')).toHaveAttribute('data-solved', '0');
    expect(container.querySelectorAll('[data-trial][data-solved]')).toHaveLength(0);
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('0 of 10 trials finished the scramble');
  });

  it('describes the stage and links the paper', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Ten squares, one per trial/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      'completed the fixed 43-subgoal scramble in 2 of 10 trials',
    );
    const links = [...screen.getByTestId('cube-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

describe('CubeTrials served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><CubeTrials /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/why-rl-locomotion/');
    expect(figures).toEqual(['cube-trials']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});

describe('CubeTrials series encoding (VAL-B2-VIZ-002/004)', () => {
  it('names every plotted series in the plot or the legend and tells each pair apart without colour', () => {
    const { container } = renderFigure();
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(['trials']);
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
