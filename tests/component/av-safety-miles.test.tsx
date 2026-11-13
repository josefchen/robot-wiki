import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { AvSafetyMiles } from '@/components/interactive/av-safety-miles';
import { FLEET_YEARS, SAFETY_BENCHMARKS, failureFreeMiles } from '@/lib/av-safety-miles';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';

const records = widgetCitationRecords('AvSafetyMiles');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<AvSafetyMiles />, { wrapper: Wrapper });
const words = (text: string) => text.trim().split(/\s+/).length;

describe('AvSafetyMiles', () => {
  it('keeps RAND Table 1 row 1 exactly, and Equation 2 reproduces each printed value', () => {
    expect(SAFETY_BENCHMARKS.map((b) => [b.id, b.per100MillionMiles, b.printedMiles, b.printedText])).toEqual([
      ['fatalities', 1.09, 275e6, '275 million'],
      ['injuries', 77, 3.9e6, '3.9 million'],
      ['crashes', 190, 1.6e6, '1.6 million'],
    ]);
    for (const benchmark of SAFETY_BENCHMARKS) {
      const miles = failureFreeMiles(benchmark.per100MillionMiles);
      expect(Math.abs(miles - benchmark.printedMiles) / benchmark.printedMiles).toBeLessThan(0.02);
    }
    expect(FLEET_YEARS).toBe(12.5);
    // 100 cars at 25 miles an hour, around the clock: the report's fleet.
    expect(275e6 / (100 * 25 * 24 * 365)).toBeCloseTo(12.5, 0);
  });

  it('leads with the kicker, the takeaway headline and a caption under 25 words', () => {
    const { container } = renderFigure();
    const kicker = container.querySelector('[data-figure-kicker]')?.textContent ?? '';
    const heading = container.querySelector('[data-figure-title]')?.textContent ?? '';
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(kicker).toBe('Miles needed to prove safety');
    expect(heading).toBe('Matching human drivers takes 275 million miles without a death');
    expect(caption).toBe(
      "Driving 275 million miles without a death would show, at 95% confidence, that a fleet's death rate is no higher than US human drivers'.",
    );
    expect(words(kicker)).toBeLessThanOrEqual(6);
    expect(words(heading)).toBeLessThanOrEqual(10);
    expect(words(caption)).toBeLessThanOrEqual(25);
    const confidence = screen.getByTestId('av-confidence-summary');
    expect(confidence).toHaveTextContent("No higher than the study's US human-driver benchmark");
    expect(confidence.closest('details')).toBeNull();
    expect(screen.getByTestId('av-confidence-summary')).toHaveTextContent('275 million miles 0 deaths');
    expect(screen.getByTestId('av-confidence-summary')).toHaveTextContent('95% confidence');
    expect(screen.getByTestId('av-confidence-summary').closest('details')).toBeNull();
    expect(screen.getByTestId('av-confidence-summary').compareDocumentPosition(screen.getByTestId('av-safety-miles-stage')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('av-confidence-coverage')).toHaveTextContent('The true fatality rate remains unknown. In the long run, at least 95 out of 100 upper bounds from studies of the same design would reach or exceed it.');
    expect(screen.getByTestId('av-upper-limit')).toHaveTextContent('About 1.09 deaths per 100 million miles');
    expect(screen.getByTestId('av-upper-limit').querySelector('dt')).toHaveTextContent('Calculated upper bound for this hypothetical run');
    expect(screen.getByTestId('av-upper-limit')).toHaveTextContent("No higher than the study's US human-driver benchmark");
    expect(screen.getByTestId('av-confidence-coverage').previousElementSibling?.textContent).toBe("No higher than the study's US human-driver benchmark");
    expect(screen.getByTestId('av-required-run')).toHaveTextContent(/^Required fleet run at 95% confidence\s*275 million miles 0 deaths$/);
    expect(screen.getByTestId('av-rare-event-explanation')).toHaveTextContent("Under the study's per-mile model, a fleet at the US benchmark rate would finish this many miles without a death only about 1 time in 20. A higher fatality rate makes that result still less likely.");
    expect(screen.getByTestId('av-rare-event-explanation').closest('details')).toHaveAttribute('data-figure-fold', 'method');
    expect(screen.getByTestId('av-model-assumptions')).toHaveTextContent('hypothetical test with a fixed distance and zero deaths');
    expect(screen.getByTestId('av-model-assumptions')).toHaveTextContent('independent miles with the same failure probability on every mile');
    expect(screen.getByTestId('av-model-assumptions')).toHaveTextContent('2013 US benchmark includes all motor vehicles');
    expect(screen.getByTestId('av-confidence-coverage').closest('details')).toBeNull();
    expect(screen.getByTestId('av-confidence-coverage')).toBeVisible();
    expect(screen.getByTestId('av-upper-limit')).toContainElement(screen.getByTestId('av-confidence-coverage'));
    // One keyboard activation of the method fold reveals the complete table.
    expect(container.querySelector('details[data-figure-fold="method"]')).not.toHaveAttribute('open');
    expect(container.querySelector('details[data-chart-data]')).toHaveAttribute('open');
    const method = container.querySelector('details[data-figure-fold="method"]')!;
    fireEvent.click(method.querySelector('summary')!);
    expect(method).toHaveAttribute('open');
    expect(screen.getByTestId('av-rare-event-explanation')).toBeVisible();
  });

  it('places each benchmark on the ten-times ruler, deaths in the accent with the fleet note', () => {
    renderFigure();
    const x = (id: string) =>
      Number(screen.getByTestId(`av-safety-miles-${id}`).querySelector('[data-chart-role]')?.getAttribute('cx'));
    // Equal ratios sit equal distances apart on a log ruler.
    const perDecade = (x('fatalities') - x('crashes')) / Math.log10(275e6 / 1.6e6);
    expect((x('injuries') - x('crashes')) / perDecade).toBeCloseTo(Math.log10(3.9e6 / 1.6e6), 1);
    expect(screen.getByTestId('av-safety-miles-fatalities').querySelector('[data-chart-role]')).toHaveAttribute(
      'data-chart-role',
      'highlight',
    );
    for (const id of ['injuries', 'crashes']) {
      expect(screen.getByTestId(`av-safety-miles-${id}`).querySelector('[data-chart-role]')).toHaveAttribute(
        'data-chart-role',
        'measurement',
      );
    }
    expect(screen.getByTestId('av-safety-miles-fleet-years')).toHaveTextContent(
      'about 12.5 years for 100 cars driving nonstop',
    );
    expect([...document.querySelectorAll('[data-scene-readout]')].map((r) => r.textContent)).toEqual([
      '275 million; no death',
      '3.9 million; no reported injury',
      '1.6 million; no reported crash',
    ]);
  });

  it('describes the stage in a name shorter than its description and links the RAND report', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Failure-free miles needed/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('275 million miles against 1.09 deaths per 100 million miles');
    expect(described).toHaveTextContent('These are lower bounds that assume perfect driving.');
    expect((stage.getAttribute('aria-label') ?? '').length).toBeLessThan(described?.textContent?.length ?? 0);
    const links = [...screen.getByTestId('av-safety-miles-source').querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(records.map((r) => r.url));
    expect(records.map((r) => r.id)).toEqual(['kalra-paddock-2016']);
  });
});

describe('AvSafetyMiles served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <AvSafetyMiles />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/adjacent/autonomous-vehicles/');
    expect(figures).toEqual(['av-safety-miles']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});

describe('AvSafetyMiles series encoding (DI-VIZ-002/004)', () => {
  it('names every plotted series in the plot and tells each pair apart without colour', () => {
    const { container } = renderFigure();
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(SAFETY_BENCHMARKS.map((b) => b.id).sort());
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
