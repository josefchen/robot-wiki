import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { PATHS, TrajectoryStitching, pathUpTo, reachesGoal } from '@/components/interactive/trajectory-stitching';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('TrajectoryStitching');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<TrajectoryStitching />, { wrapper: Wrapper });

describe('TrajectoryStitching', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Trajectory stitching');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Offline RL joins two old runs into one success',
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'Neither recorded run reaches the goal from here; offline RL joins their useful halves, copying cannot.',
    );
  });

  it('only the joined path reaches the goal, and both leave the same start', () => {
    expect(reachesGoal('join')).toBe(true);
    expect(reachesGoal('copy')).toBe(false);
    expect(PATHS.copy[0]).toEqual(PATHS.join[0]);
  });

  it('cuts a path by length and keeps the whole path at the end', () => {
    expect(pathUpTo(PATHS.join, 1)).toEqual(PATHS.join);
    for (const point of pathUpTo(PATHS.join, 0)) expect(point).toEqual(PATHS.join[0]);
    expect(pathUpTo(PATHS.join, 0.5).length).toBeLessThan(PATHS.join.length);
  });

  it('opens on the finished joined path and switches with the one preset row', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('stitching-path')).toHaveAttribute('data-learner', 'join');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent(/Reaches the goal by\s*joining two runs/);
    const copy = screen.getByTestId('stitching-learner-copy');
    fireEvent.click(copy);
    expect(copy).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('stitching-path')).toHaveAttribute('data-learner', 'copy');
    expect(screen.getByRole('img', { name: /copies run 1 and stops short of the goal/ })).toBeInTheDocument();
  });

  it('names the stage and links both sources', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /map with two recorded runs/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('follows run 2 to the goal');
    const links = [...screen.getByTestId('stitching-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

describe('TrajectoryStitching served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <TrajectoryStitching />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/offline-rl/');
    expect(figures).toEqual(['trajectory-stitching']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
