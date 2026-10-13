import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import {
  PATHS,
  TrajectoryStitching,
  carOn,
  pathUpTo,
  reachesGoal,
  runReadout,
  stillReadout,
  stretchOf,
  throwOf,
} from '@/components/interactive/trajectory-stitching';
import { CAR_END_GAP, GOAL, RUN_1_END, START, TOE_CLOSED, TOE_X, signalAt, toesAt } from '@/components/iso/figures/junction-layout';
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

  it('runs the car on the layout from the same routes the model judges', () => {
    // Both routes leave the robot's platform; copying ends at run 1's buffer stop, joining at the goal.
    expect(PATHS.join[0]).toEqual(START);
    expect(PATHS.copy.at(-1)).toEqual(RUN_1_END);
    expect(PATHS.join.at(-1)).toEqual(GOAL);
    // The car stops a car's half length and a gap short of each end, on the route it was given.
    for (const learner of ['copy', 'join'] as const) {
      const end = carOn(learner, 1).centre;
      const last = PATHS[learner].at(-1)!;
      expect(Math.hypot(end[0] - last[0], end[1] - last[1])).toBeCloseTo(CAR_END_GAP, 0);
      const start = carOn(learner, 0).centre;
      expect(Math.hypot(start[0] - START[0], start[1] - START[1])).toBeCloseTo(CAR_END_GAP, 0);
    }
    // The routes are one track until the parting turnout's toe, then go their own ways.
    expect(carOn('copy', 0.3).centre).toEqual(carOn('join', 0.3).centre);
    expect(carOn('copy', 0.9).centre[1]).toBeGreaterThan(30);
    expect(carOn('join', 0.9).centre[1]).toBeLessThan(-30);
    expect(stretchOf('join', -TOE_X - 1)).toBe('on run 1');
    expect(stretchOf('join', 0)).toBe('where the runs meet');
    expect(stretchOf('join', TOE_X + 1)).toBe('on run 2');
    expect(stretchOf('copy', TOE_X + 1)).toBe('on run 1');
  });

  it('words the readout from the same instant as the drawing', () => {
    expect(stillReadout('join')).toBe('Join useful pieces · reaches the goal');
    expect(stillReadout('copy')).toBe('Copy one run · stops short of the goal');
    expect(runReadout('join', 0.9)).toBe('on run 2 · 90% of the way');
    expect(runReadout('copy', 0.9)).toBe('on run 1 · 90% of the way');
    expect(runReadout('join', 0.1)).toBe('on run 1 · 10% of the way');
    // The lever throws the points for joining and leaves them for copying; the signal clears the set route.
    expect(throwOf('join')).toBe(1);
    expect(throwOf('copy')).toBe(0);
    expect(toesAt(throwOf('copy')).back).toBeCloseTo(-TOE_CLOSED);
    expect(toesAt(throwOf('join')).front).toBeCloseTo(TOE_CLOSED);
    expect(toesAt(1).back - toesAt(0).back).toBeCloseTo(toesAt(1).front - toesAt(0).front);
    expect(signalAt(1)[0]).not.toEqual(signalAt(0)[0]);
    expect(signalAt(1)[1]).not.toEqual(signalAt(0)[1]);
  });

  it('opens on the finished joined run and switches with the one preset row', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('stitching-path')).toHaveAttribute('data-learner', 'join');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('Join useful pieces · reaches the goal');
    expect(screen.getByTestId('stitching-stage')).toHaveAttribute('data-outcome', 'reaches');
    // The car is the one lit part.
    expect(container.querySelectorAll('[data-part="car"] .iso-solid[data-lit]')).toHaveLength(2);
    expect(container.querySelectorAll('.iso-solid[data-lit]')).toHaveLength(2);
    const copy = screen.getByTestId('stitching-learner-copy');
    fireEvent.click(copy);
    expect(copy).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('stitching-path')).toHaveAttribute('data-learner', 'copy');
    expect(screen.getByTestId('stitching-stage')).toHaveAttribute('data-outcome', 'short');
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
