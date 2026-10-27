import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { DatasetRunsHours } from '@/components/interactive/dataset-runs-hours';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { DATASET_RUNS_HOURS, runLengthInWords, secondsPerRun } from '@/lib/dataset-runs-hours';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('DatasetRunsHours');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<DatasetRunsHours />, { wrapper: Wrapper });

describe('DatasetRunsHours', () => {
  it('keeps every dataset total exactly as its paper prints it', () => {
    expect(DATASET_RUNS_HOURS.map((d) => [d.id, d.runs, d.hours, d.citationId])).toEqual([
      ['fineart', 40_543, 1_718, 'fineart-2026'],
      ['droid', 76_000, 350, 'droid-2024'],
      ['galaxea', 100_000, 500, 'galaxea-open-world-2025'],
      ['robomind', 107_000, 305.5, 'robomind-2024'],
      ['agibot', 1_001_552, 2_976.4, 'agibot-world-2025'],
    ]);
    expect(DATASET_RUNS_HOURS.some((d) => d.id.startsWith('bridge'))).toBe(false);
  });

  it('derives run lengths from the printed totals', () => {
    const lengths = Object.fromEntries(DATASET_RUNS_HOURS.map((d) => [d.id, Math.round(secondsPerRun(d))]));
    expect(lengths).toEqual({ fineart: 153, droid: 17, galaxea: 18, robomind: 10, agibot: 11 });
    expect(runLengthInWords(secondsPerRun(DATASET_RUNS_HOURS[0]))).toBe('2.5 minutes');
    expect(runLengthInWords(secondsPerRun(DATASET_RUNS_HOURS[4]))).toBe('11 seconds');
  });

  it('leads with the kicker, the takeaway headline and a caption under 25 words', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Five robot datasets');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Run counts and hours rank these datasets differently',
    );
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(caption).toBe(
      "AgiBot World has about 25 times FineART's runs but under twice its hours. FineART's runs average 2.5 minutes, the others under 20 seconds.",
    );
    expect(caption.split(/\s+/).length).toBeLessThanOrEqual(25);
  });

  it('plots one point per dataset, the long-run one in the accent, with the minute diagonal', () => {
    const { container } = renderFigure();
    for (const d of DATASET_RUNS_HOURS) {
      const point = screen.getByTestId(`dataset-point-${d.id}`);
      expect(point).toHaveAttribute('data-runs', String(d.runs));
      expect(point).toHaveTextContent(d.label);
    }
    expect(screen.getByTestId('dataset-point-fineart').querySelector('circle')).toHaveAttribute('data-chart-role', 'highlight');
    expect(screen.getByTestId('dataset-point-droid').querySelector('circle')).toHaveAttribute('data-chart-role', 'measurement');
    expect(screen.getByTestId('minute-diagonal')).toHaveTextContent('1 minute a run');
    // Run lengths live in the caption, not beside the points: stage text keeps
    // its CSS size on a phone, where a phrase there would cross the diagonal.
    expect(container.querySelectorAll('[data-scene-readout]')).toHaveLength(0);
    expect(screen.queryByTestId('hours-tick-100')).toBeNull();
    expect(screen.getAllByTestId(/^hours-tick-/).map((el) => el.textContent)).toEqual(['300', '1,000', '3,000']);
    expect(container.querySelector('svg')?.outerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('describes the stage in a name shorter than its description and links every paper', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Recorded runs against recorded hours/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('AgiBot World 1,001,552 runs and 2,976.4 hours');
    expect((stage.getAttribute('aria-label') ?? '').length).toBeLessThan(described?.textContent?.length ?? 0);
    const links = [...screen.getByTestId('dataset-runs-hours-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
    expect(links).toHaveLength(5);
    expect(screen.getByTestId('dataset-runs-hours-notes')).toHaveTextContent('DROID: 76k runs as printed, 350 hours');
  });
});

describe('DatasetRunsHours served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <DatasetRunsHours />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/data-hardware/datasets/');
    expect(figures).toEqual(['dataset-runs-hours']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
