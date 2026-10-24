import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { CAMERA_DELAY_S, REST_X, TimeOffsetMiss, gapMm, handAt } from '@/components/interactive/time-offset-miss';
import { TRAVEL } from '@/components/iso/figures/time-offset-bench';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('TimeOffsetMiss');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<TimeOffsetMiss />, { wrapper: Wrapper });

describe('TimeOffsetMiss', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Time calibration');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Fast arms turn camera delay into big misses',
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'A late photo shows the hand where it was, so faster hands mean bigger misses.',
    );
  });

  it('computes the gap as speed times the measured 55 ms camera delay', () => {
    expect(gapMm(50)).toBeCloseTo(27.5);
    expect(gapMm(100)).toBeCloseTo(55);
    expect(gapMm(0)).toBe(0);
  });

  it('drives the beam from the same model: the spot is where the gripper was 55 ms earlier', () => {
    const v = 500; // 50 cm a second, in mm a second
    expect(handAt(0, v)).toBeCloseTo(REST_X);
    // Mid-stroke, moving right, the spot trails by exactly speed times delay.
    expect(handAt(0, v) - handAt(-CAMERA_DELAY_S, v)).toBeCloseTo(gapMm(50));
    // The gripper turns round at the ends of its travel.
    const toEnd = (TRAVEL - REST_X) / v;
    expect(handAt(toEnd, v)).toBeCloseTo(TRAVEL);
    expect(handAt(toEnd + 0.1, v)).toBeCloseTo(TRAVEL - 50);
    expect(handAt(3, 0)).toBe(REST_X);
  });

  it('opens on the point: the gripper mid-stroke and the photo 27.5 mm behind', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('time-offset-hand')).toBeInTheDocument();
    expect(screen.getByTestId('time-offset-spot')).toBeInTheDocument();
    expect(screen.getByTestId('time-offset-beam')).toHaveAttribute('d', expect.stringMatching(/^M/));
    expect(container.querySelector('[data-readout]')).toHaveTextContent('photo 27.5 mm behind');
    expect(screen.getByTestId('time-offset-run')).toHaveTextContent('Run the bench');
    // A secondary action carries no pressed state: its label says what it does next.
    expect(screen.getByTestId('time-offset-run')).not.toHaveAttribute('aria-pressed');
  });

  it('drives the gap from the one labelled speed slider', () => {
    const { container } = renderFigure();
    const slider = screen.getByRole('slider', { name: /Hand speed/ });
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('27.5 millimetres behind'));
    fireEvent.change(slider, { target: { value: '100' } });
    expect(screen.getByTestId('time-offset-speed')).toHaveTextContent('100 cm a second');
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('55 millimetres behind'));
    expect(container.querySelector('[data-readout]')).toHaveTextContent('photo 55 mm behind');
    fireEvent.change(slider, { target: { value: '0' } });
    expect(container.querySelector('[data-readout]')).toHaveTextContent('Standing still: no gap');
  });

  it('stops the running bench back in the still pose it opened on', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { container } = renderFigure();
    const drawing = () => container.querySelector('[data-anatomy-stage] svg')!.innerHTML;
    const readout = () => container.querySelector('[data-readout]')!.textContent;
    const still = { drawing: drawing(), readout: readout() };
    fireEvent.click(screen.getByTestId('time-offset-run'));
    expect(screen.getByTestId('time-offset-run')).toHaveTextContent('Stop the bench');
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(drawing()).not.toBe(still.drawing);
    fireEvent.click(screen.getByTestId('time-offset-run'));
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('time-offset-run')).toHaveTextContent('Run the bench');
    expect(drawing()).toBe(still.drawing);
    expect(readout()).toBe(still.readout);
  });

  it('names the stage and links the measured delay to its source', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /gripper on a rail over a ruler/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent("27.5 mm behind the gripper's pointer");
    const link = screen.getByTestId('time-offset-source').querySelector('a');
    expect(link).toHaveAttribute('href', records[0].url);
  });
});

describe('TimeOffsetMiss served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <TimeOffsetMiss />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/calibration/');
    expect(figures).toEqual(['time-offset-miss']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
