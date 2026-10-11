import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { ActuatorGap, command, meanGapPercent, realMotor, simulatedMotor } from '@/components/interactive/actuator-gap';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('ActuatorGap');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<ActuatorGap />, { wrapper: Wrapper });

describe('ActuatorGap', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Actuator network');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Simulated motors must respond like the real ones');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "A policy trained with ideal simulated motors fell at ANYmal's first step; a learned motor model let it walk.",
    );
  });

  it('models an instant ideal motor, a late springy real one and a learned model close to it', () => {
    expect(simulatedMotor(0.12, 0)).toBe(command(0.12));
    expect(realMotor(0.12)).toBe(0);
    expect(Math.max(...Array.from({ length: 101 }, (_, k) => realMotor(k / 100)))).toBeGreaterThan(1);
    expect(meanGapPercent(0)).toBeGreaterThan(5 * meanGapPercent(1));
  });

  it('opens on the ideal model and the fallen robot, and switches with the one preset row', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('actuator-robot')).toHaveAttribute('data-outcome', 'falls');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('Simulated motor: instant');
    const learned = screen.getByTestId('actuator-model-learned');
    fireEvent.click(learned);
    expect(learned).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('actuator-simulated')).toHaveAttribute('data-model', 'learned');
    expect(screen.getByTestId('actuator-robot')).toHaveAttribute('data-outcome', 'walks');
    expect(screen.getByRole('img', { name: /follows the real curve.*walks on the real robot/ })).toBeInTheDocument();
  });

  it('describes the stage and links the paper', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /joint is told to move/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent('fails to take a single step');
    expect(screen.getByTestId('actuator-source').querySelector('a')).toHaveAttribute('href', records[0].url);
  });
});

describe('ActuatorGap served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><ActuatorGap /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/legged-locomotion/');
    expect(figures).toEqual(['actuator-gap']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
