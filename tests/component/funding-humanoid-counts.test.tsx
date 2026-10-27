import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { FundingHumanoidCounts } from '@/components/interactive/funding-humanoid-counts';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { FUNDING_BY_YEAR, HUMANOID_COUNTS } from '@/lib/funding-humanoid-counts';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { seriesEncodingViolations, seriesEncodings, seriesNames } from '../helpers/series-encoding';

const records = widgetCitationRecords('FundingHumanoidCounts');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<FundingHumanoidCounts />, { wrapper: Wrapper });
const words = (text: string) => text.trim().split(/\s+/).length;

describe('FundingHumanoidCounts', () => {
  it('keeps the Crunchbase chart and the two trackers’ counts exactly', () => {
    expect(FUNDING_BY_YEAR.map((r) => [r.year, r.billionsUsd, Boolean(r.partial)])).toEqual([
      [2020, 5.8, false],
      [2021, 14.1, false],
      [2022, 9, false],
      [2023, 7, false],
      [2024, 8.4, false],
      [2025, 15, false],
      [2026, 18.8, true],
    ]);
    expect(HUMANOID_COUNTS.map((c) => [c.id, c.units, c.counter, c.citationId])).toEqual([
      ['ifr-2025', 7000, 'IFR', 'ifr-service-robots-2026'],
      ['sag-first-half-2025', 5100, 'SAG', 'sag-humanoid-shipments-2026'],
      ['sag-first-half-2026', 19100, 'SAG', 'sag-humanoid-shipments-2026'],
    ]);
  });

  it('leads with the kicker, the takeaway headline and a caption under 25 words', () => {
    const { container } = renderFigure();
    const kicker = container.querySelector('[data-figure-kicker]')?.textContent ?? '';
    const heading = container.querySelector('[data-figure-title]')?.textContent ?? '';
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(kicker).toBe('Robotics funding and humanoid counts');
    expect(heading).toBe('Startups raised a record while humanoids shipped in the thousands');
    expect(caption).toBe(
      'Crunchbase counts all robotics startups, and 2026 runs to 22 June. IFR counts full-size humanoids sold; SAG counts humanoids shipped.',
    );
    expect(words(kicker)).toBeLessThanOrEqual(6);
    expect(words(heading)).toBeLessThanOrEqual(10);
    expect(words(caption)).toBeLessThanOrEqual(25);
  });

  it('draws funding bars to scale with the partial year in the accent', () => {
    renderFigure();
    const width = (testId: string) =>
      Number(screen.getByTestId(testId).querySelector('rect')?.getAttribute('width'));
    expect(width('funding-2026') / width('funding-2020')).toBeCloseTo(18.8 / 5.8, 1);
    expect(width('funding-2025')).toBeGreaterThan(width('funding-2021'));
    expect(screen.getByTestId('funding-2026').querySelector('rect')).toHaveAttribute('data-chart-role', 'highlight');
    for (const year of [2020, 2021, 2022, 2023, 2024, 2025]) {
      expect(screen.getByTestId(`funding-${year}`).querySelector('rect')).toHaveAttribute('data-chart-role', 'measurement');
    }
    // The partial year is named in words inside the plot, so it does not
    // rest on the accent alone (VAL-B2-VIZ-002).
    const partial = screen.getByTestId('funding-2026').querySelector('[data-scene-readout]');
    expect(partial).toHaveTextContent('$18.8B to 22 June');
    expect(partial).toHaveAttribute('data-series-label-for', 'funding-partial-year');
    expect(screen.getByText('Raised by robotics startups').closest('text')).toHaveAttribute(
      'data-series-label-for',
      'funding funding-partial-year',
    );
  });

  it('draws each humanoid count as its own row, named by its counter', () => {
    renderFigure();
    const width = (id: string) =>
      Number(screen.getByTestId(`humanoids-${id}`).querySelector('rect')?.getAttribute('width'));
    expect(width('sag-first-half-2026') / width('sag-first-half-2025')).toBeCloseTo(19100 / 5100, 1);
    expect(width('ifr-2025') / width('sag-first-half-2025')).toBeCloseTo(7000 / 5100, 1);
    expect(screen.getByTestId('humanoids-ifr-2025')).toHaveTextContent('Full-size humanoids sold in 2025 (IFR)about 7,000');
    expect(screen.getByTestId('humanoids-sag-first-half-2026')).toHaveTextContent('about 19,100');
    for (const id of ['ifr-2025', 'sag-first-half-2025', 'sag-first-half-2026']) {
      expect(screen.getByTestId(`humanoids-${id}`).querySelector('rect')).toHaveAttribute('data-chart-role', 'measurement');
    }
    const readouts = document.querySelectorAll('[data-scene-readout]');
    expect(readouts.length).toBeLessThanOrEqual(3);
  });

  it('describes the stage in a name shorter than its description and links the three sources', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Robotics startup funding by year/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('a record 15 in 2025, then 18.8 in 2026 to 22 June');
    expect(described).toHaveTextContent('The funding covers every robotics startup, not only humanoid makers.');
    expect((stage.getAttribute('aria-label') ?? '').length).toBeLessThan(described?.textContent?.length ?? 0);
    const links = [...screen.getByTestId('funding-humanoid-counts-source').querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual([
      'https://news.crunchbase.com/robotics/startup-venture-funding-surges-2026-data/',
      'https://ifr.org/ifr-press-releases/news/global-sales-of-professional-service-robots-surge-24-percent',
      records.find((r) => r.id === 'sag-humanoid-shipments-2026')?.url,
    ]);
  });
});

describe('FundingHumanoidCounts served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <FundingHumanoidCounts />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/frontier/bear-case/');
    expect(figures).toEqual(['funding-humanoid-counts']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});

describe('FundingHumanoidCounts series encoding (VAL-B2-VIZ-002/004)', () => {
  it('names every plotted series in the plot and tells each pair apart without colour', () => {
    const { container } = renderFigure();
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(['funding', 'funding-partial-year', 'ifr', 'sag']);
    // The partial year shares the full years' bar geometry, so words in the
    // plot, not the accent, mark it.
    expect(seriesNames(container)['funding-partial-year']).toEqual(['Raised by robotics startups', '$18.8B to 22 June']);
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
