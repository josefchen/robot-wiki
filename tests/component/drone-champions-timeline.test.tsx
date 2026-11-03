import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { DroneChampionsTimeline } from '@/components/interactive/drone-champions-timeline';
import { CHART_STROKE } from '@/components/motion/chart';
import { RACING_CONTESTS, SWIFT_RACES, SWIFT_WINS, yearOf } from '@/lib/drone-racing-champions';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';

const records = widgetCitationRecords('DroneChampionsTimeline');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<DroneChampionsTimeline />, { wrapper: Wrapper });
const words = (text: string) => text.trim().split(/\s+/).length;

describe('DroneChampionsTimeline', () => {
  it('keeps each contest’s month, result and outcome as its source reports them', () => {
    expect(RACING_CONTESTS.map((c) => [c.id, c.year, c.month, c.outcome, c.readout])).toEqual([
      ['swift-2023', 2023, 8, 'ai-won', 'won 15 of 25 races'],
      ['monorace-2025', 2025, 4, 'ai-won', 'beat three champions'],
      ['a2rl-2026', 2026, 1, 'human-won', 'lost the decider at 4 to 4'],
    ]);
    // Swift's three head-to-head records in Nature: 5 of 9, 4 of 7 and 6 of 9.
    expect([SWIFT_WINS, SWIFT_RACES]).toEqual([15, 25]);
  });

  it('leads with the kicker, the takeaway headline and a caption under 25 words', () => {
    const { container } = renderFigure();
    const kicker = container.querySelector('[data-figure-kicker]')?.textContent ?? '';
    const heading = container.querySelector('[data-figure-title]')?.textContent ?? '';
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(kicker).toBe('AI against human racing champions');
    expect(heading).toBe('Drones won twice; a gate collision decided the 2026 final');
    expect(caption).toBe(
      'Dots mark drone wins over human champions in 2023 and 2025; the cross marks the 2026 loss after hitting a gate in the decider.',
    );
    expect(words(kicker)).toBeLessThanOrEqual(6);
    expect(words(heading)).toBeLessThanOrEqual(10);
    expect(words(caption)).toBeLessThanOrEqual(25);
    // One keyboard activation of the method fold reveals the complete table.
    expect(container.querySelector('details[data-figure-fold="method"]')).not.toHaveAttribute('open');
    expect(container.querySelector('details[data-chart-data]')).toHaveAttribute('open');
  });

  it('orders the contests in time, AI wins as dots and the 2026 loss as an accent cross', () => {
    renderFigure();
    const mark = (id: string) => screen.getByTestId(`drone-champions-${id}`).querySelector('[data-chart-mark]')!;
    expect(mark('swift-2023').getAttribute('data-chart-mark')).toBe('dot');
    expect(mark('monorace-2025').getAttribute('data-chart-mark')).toBe('dot');
    expect(mark('a2rl-2026').getAttribute('data-chart-mark')).toBe('cross');
    expect(mark('a2rl-2026')).toHaveAttribute('data-chart-role', 'highlight');
    expect(mark('swift-2023')).toHaveAttribute('data-chart-role', 'measurement');
    expect(mark('monorace-2025')).toHaveAttribute('data-chart-role', 'measurement');
    const x = (id: string) => Number(mark(id).getAttribute('cx'));
    const swiftX = x('swift-2023');
    const monoX = x('monorace-2025');
    // Equal time sits at equal distance: the Swift-to-MonoRace gap scales with the months between them.
    const crossPath = mark('a2rl-2026').getAttribute('d') ?? '';
    const crossX = Number(/^M([\d.]+)/.exec(crossPath)?.[1]) + CHART_STROKE.markerRadius;
    const [swift, mono, a2rl] = RACING_CONTESTS.map(yearOf);
    expect((crossX - monoX) / (monoX - swiftX)).toBeCloseTo((a2rl - mono) / (mono - swift), 1);
    expect(document.querySelectorAll('[data-scene-readout]')).toHaveLength(3);
  });

  it('describes the stage in a name shorter than its description and links every source', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Three races between autonomous drones and human champions/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('won 15 of 25 races against three champions in its own lab');
    expect(described).toHaveTextContent('the drone struck a gate in the deciding race and could not recover.');
    expect((stage.getAttribute('aria-label') ?? '').length).toBeLessThan(described?.textContent?.length ?? 0);
    const links = [...screen.getByTestId('drone-champions-timeline-source').querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(records.map((r) => r.url));
    expect(records.map((r) => r.id)).toEqual([
      'swift-drone-racing-2023',
      'monorace-2026',
      'tudelft-a2rl-2025',
      'a2rl-2026-final',
    ]);
  });
});

describe('DroneChampionsTimeline served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <DroneChampionsTimeline />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/adjacent/drones/');
    expect(figures).toEqual(['drone-champions-timeline']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});

describe('DroneChampionsTimeline series encoding (VAL-B2-VIZ-002/004)', () => {
  it('names every plotted series in the plot and tells each pair apart without colour', () => {
    const { container } = renderFigure();
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(RACING_CONTESTS.map((c) => c.id).sort());
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
