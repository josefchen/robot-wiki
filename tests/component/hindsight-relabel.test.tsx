import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { HindsightRelabel, reward } from '@/components/interactive/hindsight-relabel';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('HindsightRelabel');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<HindsightRelabel />, { wrapper: Wrapper });

describe('HindsightRelabel', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Hindsight experience replay');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Relabelled with where it ended, a miss still teaches');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'Hindsight experience replay relabels a missed push with where the puck stopped, turning reward 0 into a success.',
    );
  });

  it('recomputes the sparse reward for the goal the push is judged against', () => {
    expect(reward('given')).toBe(0);
    expect(reward('reached')).toBe(1);
  });

  it('opens on the given goal and relabels with the one preset row', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('her-stage')).toHaveAttribute('data-reward', '0');
    expect(screen.getByTestId('her-reward')).toHaveTextContent('reward 0');
    expect(screen.queryByTestId('her-given-goal')).toBeNull();
    const reached = screen.getByTestId('her-goal-reached');
    fireEvent.click(reached);
    expect(reached).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('her-stage')).toHaveAttribute('data-goal', 'reached');
    expect(screen.getByTestId('her-reward')).toHaveTextContent('reward 1');
    expect(screen.getByTestId('her-given-goal')).toBeInTheDocument();
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('Same push, new goal: reward 1, a success');
    expect(screen.getByRole('img', { name: /the spot where the puck ended, the push earns a reward of 1/ })).toBeInTheDocument();
  });

  it('describes the stage and links the paper', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /pushed a puck/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent('earns a reward of 0');
    const links = [...screen.getByTestId('her-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

describe('HindsightRelabel served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><HindsightRelabel /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/rl-for-robotics/');
    expect(figures).toEqual(['hindsight-relabel']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
