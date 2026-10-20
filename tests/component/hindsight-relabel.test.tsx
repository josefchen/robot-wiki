import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
const still = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

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

  it('draws a table with no words and one lit part, the goal ring', () => {
    renderFigure();
    const svg = screen.getByTestId('her-stage');
    expect(svg.querySelectorAll('text, title, desc, foreignObject, tspan')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    const lit = [...svg.querySelectorAll('[data-lit], [data-tone="lit"]')];
    expect(lit).toHaveLength(2);
    expect(lit.map((part) => part.closest('[data-part]')?.getAttribute('data-part')).sort()).toEqual(['ringBack', 'ringFront']);
    expect(screen.getByTestId('her-goal-ring')).toBeInTheDocument();
  });

  it('carries the ring to the puck, then raises the flag; reduced motion jumps there', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { unmount } = renderFigure();
    const svg = screen.getByTestId('her-stage');
    expect(svg).toHaveAttribute('data-share', '0');
    expect(svg).toHaveAttribute('data-flag', '0');
    fireEvent.click(screen.getByTestId('her-goal-reached'));
    await act(async () => {
      vi.advanceTimersByTime(450);
    });
    const mid = Number(svg.getAttribute('data-share'));
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(svg).toHaveAttribute('data-flag', '0');
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(svg).toHaveAttribute('data-share', '1');
    expect(svg).toHaveAttribute('data-flag', '1');
    // Back to the given goal: the flag drops before the ring leaves the puck.
    fireEvent.click(screen.getByTestId('her-goal-given'));
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(Number(svg.getAttribute('data-flag'))).toBeLessThan(1);
    expect(svg).toHaveAttribute('data-share', '1');
    unmount();
    vi.useRealTimers();
    still();
    renderFigure();
    fireEvent.click(screen.getByTestId('her-goal-reached'));
    expect(screen.getByTestId('her-stage')).toHaveAttribute('data-share', '1');
    expect(screen.getByTestId('her-stage')).toHaveAttribute('data-flag', '1');
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
