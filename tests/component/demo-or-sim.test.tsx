import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { DemoOrSim, RECIPES, needsContactModel } from '@/components/interactive/demo-or-sim';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('DemoOrSim');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<DemoOrSim />, { wrapper: Wrapper });

describe('DemoOrSim', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Two training recipes');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Real demonstrations need no contact model');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "A policy trained in simulation inherits its contact model's errors; one copied from real demonstrations needs none.",
    );
  });

  it('needs a contact model only for the simulation recipe, and keeps both examples', () => {
    expect(RECIPES.map((r) => [r.id, needsContactModel(r.id)])).toEqual([
      ['sim', true],
      ['demo', false],
    ]);
    expect(RECIPES[0].example.join(' ')).toContain('under 4 minutes');
    expect(RECIPES[1].example.join(' ')).toContain('80 to 90% of the time after 10 minutes of demonstrations');
  });

  it('opens on the simulation recipe and drops the carried error with the one preset row', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('recipe-stage')).toHaveAttribute('data-contact-model', 'yes');
    expect(screen.getByTestId('recipe-contact')).toHaveTextContent('contact: approximate');
    expect(screen.getByTestId('recipe-carry')).toHaveTextContent('its errors reach the robot');
    const demo = screen.getByTestId('recipe-demo');
    fireEvent.click(demo);
    expect(demo).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('recipe-stage')).toHaveAttribute('data-contact-model', 'no');
    expect(screen.getByTestId('recipe-contact')).toHaveTextContent('contact: real, recorded');
    expect(screen.getByTestId('recipe-carry')).not.toHaveTextContent('its errors reach the robot');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('Real contact, so no contact model to get wrong');
  });

  it('describes the stage and links all three sources', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Three steps from training to the real robot/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      'learns against an approximate contact model whose errors reach the real robot',
    );
    const links = [...screen.getByTestId('recipe-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

describe('DemoOrSim served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><DemoOrSim /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/why-rl-locomotion/');
    expect(figures).toEqual(['demo-or-sim']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
