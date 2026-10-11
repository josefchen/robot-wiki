import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import {
  CAUTION_MAX,
  OfflineValueOverreach,
  RETURN_AT,
  chosen,
  guess,
  isTried,
  realResult,
} from '@/components/interactive/offline-value-overreach';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('OfflineValueOverreach');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<OfflineValueOverreach />, { wrapper: Wrapper });

describe('OfflineValueOverreach', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Distributional shift');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Recorded data alone overrates untried actions',
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "Marking down untried actions keeps an offline learner's choice where its data can vouch for it.",
    );
  });

  it('models a guess that matches the data inside the tried range and overrates outside it', () => {
    expect(guess(0.45, 0)).toBeCloseTo(realResult(0.45));
    expect(guess(1, 0)).toBeGreaterThan(realResult(0.45));
    expect(realResult(1)).toBeLessThan(0.2);
    expect(isTried(chosen(0))).toBe(false);
    expect(isTried(chosen(1))).toBe(true);
    expect(RETURN_AT).toBeGreaterThan(0);
    expect(RETURN_AT).toBeLessThan(CAUTION_MAX);
    expect(isTried(chosen((RETURN_AT - 1) / CAUTION_MAX))).toBe(false);
  });

  it('opens on the point: with no caution the learner picks an untried squeeze', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('overreach-choice')).toHaveAttribute('data-tried', 'no');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('Picks an untried squeeze');
  });

  it('drives the choice from the one labelled caution slider', () => {
    const { container } = renderFigure();
    const slider = screen.getByRole('slider', { name: /Caution about untried actions/ });
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('a squeeze nobody tried'));
    fireEvent.change(slider, { target: { value: String(RETURN_AT) } });
    expect(screen.getByTestId('overreach-caution')).toHaveTextContent(`${RETURN_AT} of ${CAUTION_MAX}`);
    expect(screen.getByTestId('overreach-choice')).toHaveAttribute('data-tried', 'yes');
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('the best squeeze it tried'));
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('Picks the best tried squeeze');
    fireEvent.change(slider, { target: { value: String(CAUTION_MAX) } });
    expect(screen.getByTestId('overreach-caution')).toHaveTextContent('strong');
  });

  it('names the stage and links both sources', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /learner's guess of how well each grip works/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('outside the tried range');
    const links = [...screen.getByTestId('overreach-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

describe('OfflineValueOverreach served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <OfflineValueOverreach />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/offline-rl/');
    expect(figures).toEqual(['offline-value-overreach']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
