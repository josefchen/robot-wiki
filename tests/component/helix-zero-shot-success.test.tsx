import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { HelixZeroShotSuccess } from '@/components/interactive/helix-zero-shot-success';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { HELIX_ZERO_SHOT, SOLVED_BAR_PERCENT } from '@/lib/helix-zero-shot';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';

const records = widgetCitationRecords('HelixZeroShotSuccess');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<HelixZeroShotSuccess />, { wrapper: Wrapper });
const words = (text: string) => text.trim().split(/\s+/).length;

describe('HelixZeroShotSuccess', () => {
  it('keeps Figure’s two zero-shot rates and the article’s bar exactly', () => {
    expect(HELIX_ZERO_SHOT.map((r) => [r.id, r.successPercent])).toEqual([
      ['from-scratch', 9],
      ['index-pretrained', 56],
    ]);
    expect(SOLVED_BAR_PERCENT).toBe(90);
  });

  it('leads with the kicker, the takeaway headline and a caption under 25 words', () => {
    const { container } = renderFigure();
    const kicker = container.querySelector('[data-figure-kicker]')?.textContent ?? '';
    const heading = container.querySelector('[data-figure-title]')?.textContent ?? '';
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(kicker).toBe('Zero-shot success in 30 homes');
    expect(heading).toBe('Helix 2.5 reached 56% in unseen homes, short of 90%');
    expect(caption).toBe(
      "Figure's blind trials on three whole-body tasks, no partial credit. The 90% line is this article's bar for solved.",
    );
    expect(words(kicker)).toBeLessThanOrEqual(6);
    expect(words(heading)).toBeLessThanOrEqual(10);
    expect(words(caption)).toBeLessThanOrEqual(25);
  });

  it('draws the two bars to scale, Helix 2.5 in the accent, against a dashed 90% reference', () => {
    renderFigure();
    const width = (id: string) =>
      Number(screen.getByTestId(`helix-zero-shot-${id}`).querySelector('rect')?.getAttribute('width'));
    expect(width('index-pretrained') / width('from-scratch')).toBeCloseTo(56 / 9, 1);
    expect(screen.getByTestId('helix-zero-shot-index-pretrained').querySelector('rect')).toHaveAttribute(
      'data-chart-role',
      'highlight',
    );
    expect(screen.getByTestId('helix-zero-shot-from-scratch').querySelector('rect')).toHaveAttribute(
      'data-chart-role',
      'measurement',
    );
    const bar = screen.getByTestId('helix-solved-bar');
    expect(bar.querySelector('line')).toHaveAttribute('data-chart-role', 'reference');
    expect(bar.querySelector('line')?.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(bar).toHaveTextContent('bar for solved, 90%');
    expect(screen.getByTestId('helix-zero-shot-gap')).toHaveTextContent('34 points short');
    expect(document.querySelectorAll('[data-scene-readout]')).toHaveLength(2);
  });

  it('describes the stage in a name shorter than its description and links the Helix 2.5 post', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Zero-shot success in unseen homes/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('9% for a policy trained from scratch and 56% for Helix 2.5');
    expect(described).toHaveTextContent('Figure published no trial counts.');
    expect((stage.getAttribute('aria-label') ?? '').length).toBeLessThan(described?.textContent?.length ?? 0);
    const links = [...screen.getByTestId('helix-zero-shot-success-source').querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual([records[0].url]);
    expect(records.map((r) => r.id)).toEqual(['helix-2-5-2026']);
  });
});

describe('HelixZeroShotSuccess served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <HelixZeroShotSuccess />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/frontier/generalization/');
    expect(figures).toEqual(['helix-zero-shot-success']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});

describe('HelixZeroShotSuccess series encoding (VAL-B2-VIZ-002/004)', () => {
  it('names every plotted series in the plot and tells each pair apart without colour', () => {
    const { container } = renderFigure();
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(HELIX_ZERO_SHOT.map((r) => r.id).sort());
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
