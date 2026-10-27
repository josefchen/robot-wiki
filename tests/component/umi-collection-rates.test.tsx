import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { UmiCollectionRates } from '@/components/interactive/umi-collection-rates';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { UMI_COLLECTION_RATES } from '@/lib/umi-collection-rates';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('UmiCollectionRates');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<UmiCollectionRates />, { wrapper: Wrapper });

describe('UmiCollectionRates', () => {
  it('keeps the project site’s three rates exactly', () => {
    expect(UMI_COLLECTION_RATES.map((r) => [r.id, r.perHour])).toEqual([
      ['bare-hand', 231],
      ['umi', 111],
      ['spacemouse', 35],
    ]);
  });

  it('leads with the kicker, the takeaway headline and a caption under 25 words', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Demonstrations per hour');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Holding the gripper was three times faster than teleoperation',
    );
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(caption).toBe(
      "On one cup-arrangement task, UMI's gripper recorded 111 demonstrations an hour: about half the bare hand's 231, and over three times teleoperation's 35.",
    );
    expect(caption.split(/\s+/).length).toBeLessThanOrEqual(25);
  });

  it('draws one bar per method, longest for the bare hand, UMI in the accent', () => {
    renderFigure();
    const width = (id: string) => Number(screen.getByTestId(`umi-rate-${id}`).querySelector('rect')?.getAttribute('width'));
    expect(width('bare-hand')).toBeGreaterThan(width('umi'));
    expect(width('umi')).toBeGreaterThan(width('spacemouse'));
    expect(width('bare-hand') / width('spacemouse')).toBeCloseTo(231 / 35, 1);
    expect(screen.getByTestId('umi-rate-umi').querySelector('rect')).toHaveAttribute('data-chart-role', 'highlight');
    expect(screen.getByTestId('umi-rate-spacemouse').querySelector('rect')).toHaveAttribute('data-chart-role', 'measurement');
    expect(screen.getByTestId('umi-rate-umi')).toHaveTextContent('UMI handheld gripper111');
  });

  it('describes the stage in a name shorter than its description and links the project site', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Demonstrations per hour by bare hand/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('48 percent of bare-hand speed and 3.2 times the teleoperation rate');
    expect((stage.getAttribute('aria-label') ?? '').length).toBeLessThan(described?.textContent?.length ?? 0);
    const links = [...screen.getByTestId('umi-collection-rates-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['https://umi-gripper.github.io/']);
  });
});

describe('UmiCollectionRates served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <UmiCollectionRates />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/data-hardware/teleop-rigs/');
    expect(figures).toEqual(['umi-collection-rates']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
