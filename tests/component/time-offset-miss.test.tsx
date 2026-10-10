import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { TimeOffsetMiss, gapMm } from '@/components/interactive/time-offset-miss';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('TimeOffsetMiss');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<TimeOffsetMiss />, { wrapper: Wrapper });

describe('TimeOffsetMiss', () => {
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

  it('opens on the point: a dashed photographed arm 27.5 mm behind the real one', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('time-offset-ghost')).toHaveAttribute('data-arm', 'ghost');
    expect(screen.getByTestId('time-offset-arm')).toHaveAttribute('data-arm', 'solid');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('27.5 mm behind');
  });

  it('drives the gap from the one labelled speed slider', () => {
    const { container } = renderFigure();
    const slider = screen.getByRole('slider', { name: /Hand speed/ });
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('27.5 millimetres behind'));
    fireEvent.change(slider, { target: { value: '100' } });
    expect(screen.getByTestId('time-offset-speed')).toHaveTextContent('100 cm a second');
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('55 millimetres behind'));
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('55 mm behind');
    fireEvent.change(slider, { target: { value: '0' } });
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('Standing still: no gap');
    expect(screen.queryByTestId('time-offset-motion')).toBeNull();
  });

  it('names the stage and links the measured delay to its source', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /robot arm moving its hand to the right/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('27.5 mm behind the real one');
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
