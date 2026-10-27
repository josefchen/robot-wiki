import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { SafetyRulesTimeline } from '@/components/interactive/safety-rules-timeline';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { SAFETY_RULES, SAFETY_RULE_SOURCES, fractionalYear } from '@/lib/safety-rules-timeline';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';

const records = widgetCitationRecords('SafetyRulesTimeline');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<SafetyRulesTimeline />, { wrapper: Wrapper });
const words = (text: string) => text.trim().split(/\s+/).length;

describe('SafetyRulesTimeline', () => {
  it('keeps each rule’s date from its own record', () => {
    expect(SAFETY_RULES.map((r) => [r.id, r.date, r.citationIds])).toEqual([
      ['iso-10218', '2025-02-05', ['iso-10218-1-2025', 'iso-10218-2-2025']],
      ['r15-06', '2025-10-29', ['a3-r1506-2025-store']],
      ['iso-25785-1', '2026-07-08', ['iso-cd-25785-1']],
      ['eu-machinery-regulation', '2027-01-20', ['eu-machinery-regulation-2023']],
      ['eu-ai-act', '2028-08-02', ['eu-ai-act-framework-2026']],
    ]);
    expect(SAFETY_RULES.map((r) => r.dateText)).toEqual([
      '5 February 2025',
      '29 October 2025',
      '8 July 2026',
      '20 January 2027',
      '2 August 2028',
    ]);
    expect(fractionalYear('2027-01-01')).toBe(2027);
  });

  it('leads with the kicker, the takeaway headline and a caption under 25 words', () => {
    const { container } = renderFigure();
    const kicker = container.querySelector('[data-figure-kicker]')?.textContent ?? '';
    const heading = container.querySelector('[data-figure-title]')?.textContent ?? '';
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(kicker).toBe('Robot safety rules by date');
    expect(heading).toBe('Industrial standards landed in 2025; EU law applies from 2027');
    expect(caption).toBe(
      'Standards are dated by publication, the humanoid draft by the close of comments, and the two EU laws by the day they apply.',
    );
    expect(words(kicker)).toBeLessThanOrEqual(6);
    expect(words(heading)).toBeLessThanOrEqual(10);
    expect(words(caption)).toBeLessThanOrEqual(25);
  });

  it('places the dots in date order with the Machinery Regulation in the accent', () => {
    renderFigure();
    const cx = (id: string) =>
      Number(screen.getByTestId(`safety-rule-${id}`).querySelector('circle')?.getAttribute('cx'));
    const order = SAFETY_RULES.map((r) => cx(r.id));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(screen.getByTestId('safety-rule-eu-machinery-regulation').querySelector('circle')).toHaveAttribute(
      'data-chart-role',
      'highlight',
    );
    for (const id of ['iso-10218', 'r15-06', 'iso-25785-1', 'eu-ai-act']) {
      expect(screen.getByTestId(`safety-rule-${id}`).querySelector('circle')).toHaveAttribute(
        'data-chart-role',
        'measurement',
      );
    }
    expect(screen.getByTestId('safety-rule-eu-machinery-regulation')).toHaveTextContent('20 January 2027');
    expect(screen.getByTestId('safety-rule-eu-ai-act')).toHaveTextContent('2 August 2028');
    expect(screen.getByTestId('safety-rule-undated-next-stage')).toHaveTextContent('next stage not dated');
    expect(document.querySelectorAll('[data-scene-readout]')).toHaveLength(2);
  });

  it('describes the stage in a name shorter than its description and links every rule’s record', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Timeline of robot safety standards/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('closed its comment period on 8 July 2026, with no date yet for its next stage');
    expect(described).toHaveTextContent('applies from 20 January 2027');
    expect((stage.getAttribute('aria-label') ?? '').length).toBeLessThan(described?.textContent?.length ?? 0);
    const links = [...screen.getByTestId('safety-rules-timeline-source').querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(SAFETY_RULE_SOURCES.map((id) => records.find((r) => r.id === id)?.url));
    expect(links).toHaveLength(6);
  });
});

describe('SafetyRulesTimeline served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <SafetyRulesTimeline />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/frontier/safety-and-assurance/');
    expect(figures).toEqual(['safety-rules-timeline']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});

describe('SafetyRulesTimeline series encoding (VAL-B2-VIZ-002/004)', () => {
  it('names every plotted series in the plot and tells each pair apart without colour', () => {
    const { container } = renderFigure();
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(SAFETY_RULES.map((r) => r.id).sort());
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
