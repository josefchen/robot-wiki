import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { RealRobotRlGains } from '@/components/interactive/real-robot-rl-gains';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { GAIN_STUDIES, gainPoints } from '@/lib/real-robot-rl-gains';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('RealRobotRlGains');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<RealRobotRlGains />, { wrapper: Wrapper });

describe('RealRobotRlGains', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Offline-to-online improvement');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Online RL raised real-robot success in every study',
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'In each study, RL after offline training raised real-robot success by 22 to 52 percentage points.',
    );
  });

  it('keeps the four cited before and after rates exactly', () => {
    expect(GAIN_STUDIES.map((s) => [s.method, s.before, s.after])).toEqual([
      ['RankQ', 43.1, 88.9],
      ['SCORE', 37.8, 89.9],
      ['PA-RL', 40, 70],
      ['BORA', 60.8, 82.5],
    ]);
    expect(GAIN_STUDIES.map(gainPoints)).toEqual([45.8, 52.1, 30, 21.7]);
  });

  it('opens on the after state with the largest gain marked, and moves every row with the one toggle', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('rl-gains-row-score')).toHaveAttribute('data-value', '89.9');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('+52 points');
    const before = screen.getByTestId('rl-gains-phase-before');
    fireEvent.click(before);
    expect(before).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('rl-gains-row-score')).toHaveAttribute('data-value', '37.8');
    expect(screen.getByTestId('rl-gains-row-bora')).toHaveAttribute('data-value', '60.8');
    expect(container.querySelector('[data-figure-annotation]')).toBeNull();
    expect(screen.getByRole('img', { name: /before reinforcement learning: Cube stacking, 43.1%/ })).toBeInTheDocument();
  });

  it('describes the stage and links every study', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Real-robot success in four studies after/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('SCORE 89.9%');
    const links = [...screen.getByTestId('rl-gains-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
    expect(links).toHaveLength(4);
  });
});

describe('RealRobotRlGains served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <RealRobotRlGains />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/offline-rl/');
    expect(figures).toEqual(['real-robot-rl-gains']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
