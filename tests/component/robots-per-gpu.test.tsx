import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { COUNTS, RobotsPerGpu } from '@/components/interactive/robots-per-gpu';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('RobotsPerGpu');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<RobotsPerGpu />, { wrapper: Wrapper });

describe('RobotsPerGpu', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Massively parallel simulation');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('One graphics chip trains thousands of robots at once');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "On one graphics chip, Rudin's team simulated 16,384 robots at once, against 128 typical of CPU simulators.",
    );
  });

  it("keeps Rudin and colleagues' three counts", () => {
    expect(COUNTS.map((c) => c.robots)).toEqual([128, 4096, 16384]);
  });

  it('opens on the full GPU grid and empties it to one square with the one preset row', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('robots-stage')).toHaveAttribute('data-squares', '128');
    expect(container.querySelectorAll('[data-square]')).toHaveLength(128);
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('16,384 robots: 128 times the CPU-era count');
    const cpu = screen.getByTestId('robots-count-cpu');
    fireEvent.click(cpu);
    expect(cpu).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('robots-stage')).toHaveAttribute('data-squares', '1');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('128 robots: the CPU-era count');
    fireEvent.click(screen.getByTestId('robots-count-policy'));
    expect(screen.getByRole('img', { name: /4,096 robots fill 32 of the 128 squares/ })).toBeInTheDocument();
  });

  it('describes the stage and links both sources', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /grid of squares/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent('128 times the 128 typical of CPU simulators');
    const links = [...screen.getByTestId('robots-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

describe('RobotsPerGpu served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><RobotsPerGpu /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/parallel-sim-rl/');
    expect(figures).toEqual(['robots-per-gpu']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
