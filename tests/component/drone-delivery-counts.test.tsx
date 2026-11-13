import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { DroneDeliveryCounts } from '@/components/interactive/drone-delivery-counts';
import { DELIVERY_COUNTS, WALMART_NOVEMBER_2026, ZIPLINE_JANUARY_2026 } from '@/lib/drone-deliveries';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';

const records = widgetCitationRecords('DroneDeliveryCounts');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<DroneDeliveryCounts />, { wrapper: Wrapper });
const words = (text: string) => text.trim().split(/\s+/).length;

describe('DroneDeliveryCounts', () => {
  it('keeps each operator’s reported lower bound and wording exactly', () => {
    expect(DELIVERY_COUNTS.map((d) => [d.id, d.atLeast, d.readout, d.citationId])).toEqual([
      ['zipline', 3e6, 'more than 3 million', 'zipline-safety-facts'],
      ['wing', 1e6, 'well over 1 million', 'wing-walmart-2026'],
    ]);
    expect(ZIPLINE_JANUARY_2026).toBe(2e6);
    expect(WALMART_NOVEMBER_2026).toBe(2e6);
  });

  it('leads with the kicker, the takeaway headline and a caption under 25 words', () => {
    const { container } = renderFigure();
    const kicker = container.querySelector('[data-figure-kicker]')?.textContent ?? '';
    const heading = container.querySelector('[data-figure-title]')?.textContent ?? '';
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(kicker).toBe('Deliveries, as the companies report them');
    expect(heading).toBe('Zipline passed 3 million drone deliveries; Wing passed 1 million');
    expect(caption).toBe(
      "Each bar is a company's own lower bound; Walmart's 2 million overlap Wing's and Zipline's and are not added.",
    );
    expect(words(kicker)).toBeLessThanOrEqual(6);
    expect(words(heading)).toBeLessThanOrEqual(10);
    expect(words(caption)).toBeLessThanOrEqual(25);
    // One keyboard activation of the method fold reveals the complete table.
    expect(container.querySelector('details[data-figure-fold="method"]')).not.toHaveAttribute('open');
    expect(container.querySelector('details[data-chart-data]')).toHaveAttribute('open');
  });

  it('draws the two bars to scale from zero, Zipline in the accent', () => {
    renderFigure();
    const bar = (id: string) => screen.getByTestId(`drone-deliveries-${id}`).querySelector('rect')!;
    expect(Number(bar('zipline').getAttribute('width')) / Number(bar('wing').getAttribute('width'))).toBeCloseTo(3, 2);
    expect(bar('zipline').getAttribute('x')).toBe(bar('wing').getAttribute('x'));
    expect(bar('zipline')).toHaveAttribute('data-chart-role', 'highlight');
    expect(bar('wing')).toHaveAttribute('data-chart-role', 'measurement');
    expect([...document.querySelectorAll('[data-scene-readout]')].map((r) => r.textContent)).toEqual([
      'more than 3 million',
      'well over 1 million',
    ]);
  });

  it('describes the stage in a name shorter than its description and links every source', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Cumulative drone deliveries reported by Zipline and Wing/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('Zipline reports more than 3 million deliveries');
    expect(described).toHaveTextContent('because its providers include Wing and Zipline.');
    expect((stage.getAttribute('aria-label') ?? '').length).toBeLessThan(described?.textContent?.length ?? 0);
    const links = [...screen.getByTestId('drone-delivery-counts-source').querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(records.map((r) => r.url));
    expect(records.map((r) => r.id)).toEqual(['zipline-safety-facts', 'wing-walmart-2026', 'walmart-zipline-300-2026']);
  });
});

describe('DroneDeliveryCounts served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <DroneDeliveryCounts />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/adjacent/drones/');
    expect(figures).toEqual(['drone-delivery-counts']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});

describe('DroneDeliveryCounts series encoding (DI-VIZ-002/004)', () => {
  it('names every plotted series in the plot and tells each pair apart without colour', () => {
    const { container } = renderFigure();
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(DELIVERY_COUNTS.map((d) => d.id).sort());
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
