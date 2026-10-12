import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import {
  ActuatorGap,
  OUTCOME,
  STILL_AT,
  benchAt,
  command,
  meanGapPercent,
  realMotor,
  runReadout,
  simulatedMotor,
  stillReadout,
} from '@/components/interactive/actuator-gap';
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

  it('drives the bench and its readout from the same model', () => {
    // The still moment is the real crank's widest swing: the ideal twin sits on the target, the real crank past it.
    const ideal = benchAt(STILL_AT, 0);
    expect(ideal.twin).toBe(1);
    expect(ideal.real).toBeGreaterThan(1.15);
    const learned = benchAt(STILL_AT, 1);
    expect(Math.abs(learned.twin - learned.real)).toBeLessThan(0.02);
    expect(stillReadout('ideal')).toBe(`Ideal motor · ${meanGapPercent(0)}% average gap · ${OUTCOME.ideal}`);
    expect(stillReadout('learned')).toBe(`Learned motor · ${meanGapPercent(1)}% average gap · ${OUTCOME.learned}`);
    expect(runReadout(ideal.real, ideal.twin)).toBe(`simulated 100% · real ${Math.round(ideal.real * 100)}% of the move`);
  });

  it('opens on the ideal model, its outcome in the readout, and switches with the one preset row', () => {
    const { container } = renderFigure();
    const stage = screen.getByTestId('actuator-stage');
    expect(stage).toHaveAttribute('data-outcome', 'falls');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('Ideal motor · 10% average gap · falls at its first step');
    // The real drive turns through its spring; the simulator's twin crank is the one lit part.
    expect(screen.getByTestId('actuator-spring').querySelectorAll('path')).toHaveLength(2);
    expect(screen.getByTestId('actuator-simulated').querySelector('.iso-solid[data-lit]')).not.toBeNull();
    expect(screen.getByTestId('actuator-real').querySelector('.iso-solid[data-lit]')).toBeNull();
    expect(screen.getByTestId('actuator-traces').querySelectorAll('path')).toHaveLength(3);
    expect(screen.getByTestId('actuator-cartridge')).not.toHaveAttribute('data-seated');
    const learned = screen.getByTestId('actuator-model-learned');
    fireEvent.click(learned);
    expect(learned).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('actuator-simulated')).toHaveAttribute('data-model', 'learned');
    expect(stage).toHaveAttribute('data-outcome', 'walks');
    expect(screen.getByTestId('actuator-cartridge')).toHaveAttribute('data-seated');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('Learned motor · 1% average gap · walks');
    expect(screen.getByRole('img', { name: /follows the real curve.*walks on the real robot/ })).toBeInTheDocument();
  });

  it('starts and stops the bench from a reader control, never on its own', () => {
    renderFigure();
    const run = screen.getByTestId('actuator-run');
    expect(run).toHaveTextContent('Run the bench');
    // A secondary action carries no pressed state: its label says what it does next.
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the bench');
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Run the bench');
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
