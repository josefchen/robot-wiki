import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { HandEyePoses, tighterThanMinimum } from '@/components/interactive/hand-eye-poses';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

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

  it('opens at the minimum: three poses, just enough to solve, with an uncertainty ring', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('hand-eye-readout')).toHaveTextContent('3 poses: just enough to solve');
    expect(screen.getByTestId('hand-eye-ring')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-camera-mark="pose"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-camera-mark="current"]')).toHaveLength(1);
  });

  it('drives the pose count from the one slider, with no ring below three poses', () => {
    const { container } = renderFigure();
    const slider = screen.getByRole('slider', { name: /Camera poses/ });
    fireEvent.change(slider, { target: { value: '2' } });
    expect(screen.queryByTestId('hand-eye-ring')).toBeNull();
    expect(screen.getByTestId('hand-eye-readout')).toHaveTextContent('2 poses: too few to solve');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('Too few poses');
    fireEvent.change(slider, { target: { value: '15' } });
    expect(slider).toHaveAttribute('aria-valuetext', '15 poses: 3.6 times tighter than with 3');
    expect(container.querySelectorAll('[data-camera-mark="pose"]')).toHaveLength(14);
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('the ring barely shrinks');
  });

  it('links the minimum and the plateau to their sources and describes the stage', () => {
    renderFigure();
    const hrefs = Array.from(screen.getByTestId('hand-eye-source').querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(records.map((r) => r.url));
    const stage = screen.getByRole('img', { name: /calibration target/ });
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
