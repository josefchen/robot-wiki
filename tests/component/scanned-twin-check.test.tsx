import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { SIMS, ScannedTwinCheck } from '@/components/interactive/scanned-twin-check';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('ScannedTwinCheck');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<ScannedTwinCheck />, { wrapper: Wrapper });

describe('ScannedTwinCheck', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Real-to-sim evaluation');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('A scanned twin predicted the real robot only after tuning');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'A 3D-scanned lab predicted real robot success poorly, a correlation of 0.18, until tuning raised it to 0.844.',
    );
  });

  it("keeps Kadian and colleagues' two correlations", () => {
    expect(SIMS.map((s) => [s.correlation, s.text])).toEqual([
      [0.18, '0.18'],
      [0.844, '0.844'],
    ]);
  });

  it('opens on the scanned lab and moves the bar with the one preset row', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('twin-stage')).toHaveAttribute('data-correlation', '0.18');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('0.18: Sim scores barely predict real ones');
    expect(screen.getByTestId('twin-other')).toHaveTextContent('once tuned, 0.844');
    const tuned = screen.getByTestId('twin-sim-tuned');
    fireEvent.click(tuned);
    expect(tuned).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('twin-stage')).toHaveAttribute('data-correlation', '0.844');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('0.844: Sim scores now track real ones');
    expect(screen.getByTestId('twin-other')).toHaveTextContent('as scanned, 0.18');
  });

  it('describes the stage and links the paper', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /how well simulated success predicts real success/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      'correlated with success on the real robot at 0.18',
    );
    const links = [...screen.getByTestId('twin-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

describe('ScannedTwinCheck served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><ScannedTwinCheck /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/sim2real-transfer/');
    expect(figures).toEqual(['scanned-twin-check']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
