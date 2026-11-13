import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { SpaceLatencyLadder } from '@/components/interactive/space-latency-ladder';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import {
  DELAY_ROWS,
  GEO_ROUND_TRIP_SECONDS,
  MARS_AVERAGE_ROUND_TRIP_MINUTES,
  MARS_ONE_WAY_MINUTES,
  MONOCULAR_SECONDS,
} from '@/lib/space-latency';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';

const records = widgetCitationRecords('SpaceLatencyLadder');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<SpaceLatencyLadder />, { wrapper: Wrapper });
const words = (text: string) => text.trim().split(/\s+/).length;

describe('SpaceLatencyLadder', () => {
  it('keeps Falanga’s camera bounds and JPL’s light times exactly', () => {
    expect(DELAY_ROWS.map((r) => [r.id, r.lowSeconds, r.highSeconds, r.readout, r.citationId])).toEqual([
      ['drone-camera', 0.017, 0.07, '17 to 70 milliseconds', 'falanga-latency-2019'],
      ['moon-round-trip', 2.5, 2.5, '2.5 seconds', 'jpl-ipn-pnt-2024'],
      ['mars-round-trip', 480, 2400, '8 to 40 minutes', 'jpl-ipn-pnt-2024'],
    ]);
    expect(MARS_ONE_WAY_MINUTES).toEqual([4, 20]);
    expect(GEO_ROUND_TRIP_SECONDS).toBe(0.24);
    expect(MONOCULAR_SECONDS).toEqual([0.026, 0.04]);
    // JPL's printed 25-minute average round trip falls inside the doubled one-way range.
    expect(MARS_AVERAGE_ROUND_TRIP_MINUTES * 60).toBeGreaterThan(480);
    expect(MARS_AVERAGE_ROUND_TRIP_MINUTES * 60).toBeLessThan(2400);
  });

  it('leads with the kicker, the takeaway headline and a caption under 25 words', () => {
    const { container } = renderFigure();
    const kicker = container.querySelector('[data-figure-kicker]')?.textContent ?? '';
    const heading = container.querySelector('[data-figure-title]')?.textContent ?? '';
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(kicker).toBe('Delays a robot works within');
    expect(heading).toBe('Signals to Mars and back take 8 to 40 minutes');
    expect(caption).toBe(
      'A Mars rover waits thousands of times longer for Earth than a drone waits for its camera, so it must act alone.',
    );
    expect(words(kicker)).toBeLessThanOrEqual(6);
    expect(words(heading)).toBeLessThanOrEqual(10);
    expect(words(caption)).toBeLessThanOrEqual(25);
    const delay = screen.getByText('A signal to Mars and back takes 8 to 40 minutes');
    expect(delay.closest('details')).toBeNull();
    expect(delay.parentElement).toHaveTextContent("A drone's camera reacts in hundredths of a second.");
    expect(delay.parentElement).toHaveTextContent('a rover must act on its own');
    // One keyboard activation of the method fold reveals the complete table.
    expect(container.querySelector('details[data-figure-fold="method"]')).not.toHaveAttribute('open');
    expect(container.querySelector('details[data-chart-data]')).toHaveAttribute('open');
  });

  it('draws ranges as bars and the Moon as a dot on one log ruler, Mars in the accent', () => {
    renderFigure();
    const mark = (id: string) => screen.getByTestId(`space-latency-${id}`).querySelector('[data-chart-mark]');
    const camera = mark('drone-camera')!;
    const moon = mark('moon-round-trip')!;
    const mars = mark('mars-round-trip')!;
    expect(camera.getAttribute('data-chart-mark')).toBe('bar');
    expect(moon.getAttribute('data-chart-mark')).toBe('dot');
    expect(mars.getAttribute('data-chart-mark')).toBe('bar');
    expect(mars).toHaveAttribute('data-chart-role', 'highlight');
    expect(camera).toHaveAttribute('data-chart-role', 'measurement');
    expect(moon).toHaveAttribute('data-chart-role', 'measurement');
    // On a log ruler a bar's width is the log of its range: Mars spans log10(5), the camera log10(70/17).
    const width = (el: Element) => Number(el.getAttribute('width'));
    expect(width(mars) / width(camera)).toBeCloseTo(Math.log10(5) / Math.log10(70 / 17), 2);
    expect(screen.getByTestId('space-latency-mars-note')).toHaveTextContent('8 to 40 minutes round trip: rover acts on its own');
    expect([...document.querySelectorAll('[data-scene-readout]')].map((r) => r.textContent)).toEqual([
      '17 to 70 milliseconds',
      '2.5 seconds',
      '8 to 40 minutes',
    ]);
  });

  it('describes the stage in a name shorter than its description and links both sources', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Drone camera delay against round trips/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent("to Mars and back 8 to 40 minutes, twice JPL's one-way 4 to 20 minutes");
    expect(described).toHaveTextContent('rules out driving a rover from Earth');
    expect((stage.getAttribute('aria-label') ?? '').length).toBeLessThan(described?.textContent?.length ?? 0);
    const links = [...screen.getByTestId('space-latency-ladder-source').querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(records.map((r) => r.url));
    expect(records.map((r) => r.id)).toEqual(['falanga-latency-2019', 'jpl-ipn-pnt-2024']);
  });
});

describe('SpaceLatencyLadder served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <SpaceLatencyLadder />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/adjacent/space/');
    expect(figures).toEqual(['space-latency-ladder']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});

describe('SpaceLatencyLadder series encoding (DI-VIZ-002/004)', () => {
  it('names every plotted series in the plot and tells each pair apart without colour', () => {
    const { container } = renderFigure();
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(DELAY_ROWS.map((r) => r.id).sort());
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
