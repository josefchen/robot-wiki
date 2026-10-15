import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { HandEyePoses, MAX_POSES, irisGap, tighterThanMinimum } from '@/components/interactive/hand-eye-poses';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { GEOMETRY, IRIS_OPEN_GAP, armDrawing, armFor, pegsFor, poseDirection } from '@/components/iso/figures/hand-eye-bench';

const records = widgetCitationRecords('HandEyePoses');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<HandEyePoses />, { wrapper: Wrapper });

describe('HandEyePoses', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Hand-eye calibration');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Three poses solve it; twelve pin it down');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'More poses shrink the doubt about where the wrist camera sits, until about 12.',
    );
  });

  it('tightens with the square root of the motions beyond the three-pose minimum', () => {
    expect(tighterThanMinimum(2)).toBe(0);
    expect(tighterThanMinimum(3)).toBe(1);
    expect(tighterThanMinimum(12)).toBeCloseTo(Math.sqrt(10));
  });

  it('opens at the minimum: three poses, just enough to solve, three pegs and the iris closing', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('hand-eye-readout')).toHaveTextContent('3 poses: just enough to solve');
    expect(screen.getByTestId('hand-eye-ring')).not.toHaveAttribute('data-open');
    expect(screen.getByTestId('hand-eye-ring')).toHaveAttribute('data-gap', irisGap(3).toFixed(3));
    expect(container.querySelectorAll('[data-peg]')).toHaveLength(3);
    expect(container.querySelector('[data-anatomy-hint]')).toHaveTextContent('Iris: the doubt about where the camera sits');
  });

  it('drives the pose count from the one slider: no iris below three poses, barely closing past twelve', () => {
    const { container } = renderFigure();
    const slider = screen.getByRole('slider', { name: /Camera poses/ });
    fireEvent.change(slider, { target: { value: '2' } });
    expect(screen.getByTestId('hand-eye-ring')).toHaveAttribute('data-open', '');
    expect(screen.getByTestId('hand-eye-readout')).toHaveTextContent('2 poses: too few to solve');
    expect(container.querySelector('[data-anatomy-hint]')).toHaveTextContent('Too few poses');
    fireEvent.change(slider, { target: { value: '15' } });
    expect(slider).toHaveAttribute('aria-valuetext', '15 poses: 3.6 times tighter than with 3');
    expect(container.querySelectorAll('[data-peg]')).toHaveLength(15);
    expect(container.querySelector('[data-anatomy-hint]')).toHaveTextContent('the iris barely closes');
    const drawing = screen.getByTestId('hand-eye-stage');
    expect(drawing.querySelector('text, title, desc, foreignObject')).toBeNull();
    expect(drawing.textContent).toBe('');
  });

  it('swings the arm to the chosen pose and closes the iris to its gap, ending on the drawing of that pose', async () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    renderFigure();
    const slider = screen.getByRole('slider', { name: /Camera poses/ });
    fireEvent.change(slider, { target: { value: '12' } });
    const blades = () => screen.getByTestId('hand-eye-blades').getAttribute('d');
    const target = armDrawing(armFor(poseDirection(11)), irisGap(12)).pieces.find((piece) => piece.kind === 'fill' && piece.paint === 'blades');
    await waitFor(() => expect(blades()).toBe(target && 'd' in target ? target.d : ''), { timeout: 3000 });
    expect(screen.getByTestId('hand-eye-ring')).toHaveAttribute('data-gap', irisGap(12).toFixed(3));
    expect(screen.queryByRole('button', { name: /pose/i })).toBeNull();
  });

  it('links the minimum and the plateau to their sources and describes the stage', () => {
    renderFigure();
    const hrefs = Array.from(screen.getByTestId('hand-eye-source').querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(records.map((r) => r.url));
    const stage = screen.getByRole('img', { name: /checkerboard on the bench/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      'plateaus after about 12 or 15 samples',
    );
  });
});

describe('HandEyePoses served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <HandEyePoses />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/calibration/');
    expect(figures).toEqual(['hand-eye-poses']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});

describe('HandEyePoses bench model', () => {
  it('points the camera at the board from every pose, within the arm\'s reach, and spreads the turns over two axes', () => {
    const { TARGET, SHOULDER, LINKS, WRIST_RANGE } = GEOMETRY;
    const axes = new Set<string>();
    for (let i = 0; i < MAX_POSES; i++) {
      const look = poseDirection(i);
      const arm = armFor(look);
      // The wrist sits on the ray out of the board's centre, so the camera on it looks at that centre.
      const toWrist = arm.wrist.map((v, k) => v - TARGET[k]!);
      const length = Math.hypot(...toWrist);
      expect(length).toBeCloseTo(WRIST_RANGE, 6);
      toWrist.forEach((v, k) => expect(v / length).toBeCloseTo(look[k]!, 6));
      // Both links keep their lengths: the arm really reaches the wrist.
      expect(Math.hypot(...arm.elbow.map((v, k) => v - SHOULDER[k]!))).toBeCloseTo(LINKS[0], 6);
      expect(Math.hypot(...arm.wrist.map((v, k) => v - arm.elbow[k]!))).toBeCloseTo(LINKS[1], 6);
      axes.add(look[2].toFixed(2));
    }
    // The poses tilt by different amounts as well as turning round the board: turns about non-parallel axes.
    expect(axes.size).toBeGreaterThanOrEqual(3);
  });

  it('opens the iris fully below the minimum and closes it with the square root of the motions beyond it', () => {
    expect(irisGap(1)).toBe(IRIS_OPEN_GAP);
    expect(irisGap(2)).toBe(IRIS_OPEN_GAP);
    expect(irisGap(3)).toBeLessThan(IRIS_OPEN_GAP);
    for (const n of [4, 6, 12, 15, 20]) expect(irisGap(n) * tighterThanMinimum(n)).toBeCloseTo(irisGap(3), 9);
    // Past about a dozen poses it barely closes: the last eight poses close it less than the fourth pose alone.
    expect(irisGap(12) - irisGap(20)).toBeLessThan(irisGap(3) - irisGap(4));
    expect(pegsFor(7)).toHaveLength(7);
    expect(pegsFor(7).filter((peg) => peg.newest)).toHaveLength(1);
  });
});
