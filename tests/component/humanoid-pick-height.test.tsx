import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { INSERTION_RATE, PICK_RATES, HumanoidPickHeight } from '@/components/interactive/humanoid-pick-height';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('HumanoidPickHeight');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<HumanoidPickHeight />, { wrapper: Wrapper });

describe('HumanoidPickHeight', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Whole-body picking');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Lower objects are harder for a whole-body humanoid',
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "Gemini Robotics 2's humanoid succeeded on 76% of shelf picks but 46% of floor picks.",
    );
  });

  it('reads the published rates from the shared Gemini Robotics 2 rows', () => {
    expect(PICK_RATES).toEqual({ shelf: 76.3, table: 68.4, floor: 45.7 });
    expect(INSERTION_RATE).toBe(89.6);
  });

  it('opens on the floor pick with every bar in view, and moves with the one preset row', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('pick-bar-floor')).toHaveAttribute('data-chosen', 'yes');
    expect(container.querySelectorAll('[data-testid^="pick-bar-"]')).toHaveLength(3);
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('45.7% from the floor');
    const shelf = screen.getByTestId('pick-height-place-shelf');
    fireEvent.click(shelf);
    expect(shelf).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('pick-bar-shelf')).toHaveAttribute('data-chosen', 'yes');
    expect(screen.getByTestId('pick-object-shelf')).toHaveAttribute('data-chosen', 'yes');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('76.3% from a shelf');
    expect(screen.getByRole('img', { name: /reaching for an object from a shelf/ })).toBeInTheDocument();
  });

  it('describes the stage and links the source', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /humanoid robot reaching/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('45.7% of whole-body picks from the floor');
    expect(screen.getByTestId('pick-height-source').querySelector('a')).toHaveAttribute('href', records[0].url);
  });
});

describe('HumanoidPickHeight served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <HumanoidPickHeight />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/humanoid-wbc/');
    expect(figures).toEqual(['humanoid-pick-height']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
