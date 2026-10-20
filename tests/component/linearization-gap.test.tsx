import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LinearizationGap } from '@/components/interactive/linearization-gap';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { OPENING_SPREAD, SWING_SECONDS, readoutFor, valueTextFor } from '@/lib/linearization-gap';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const still = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
const readout = () => screen.getByTestId('lg-stage').querySelector('[data-readout]');
const slider = () => screen.getByRole('slider', { name: 'How uncertain the guess is' });

describe('LinearizationGap', () => {
  it('draws the still pose: the arm at the edge of the spread, the groove fallen away below the rule', () => {
    render(<LinearizationGap />);
    expect(screen.getByText('A straight line fits the curve only near the guess')).toBeInTheDocument();
    const drawing = screen.getByTestId('lg-drawing');
    expect(drawing).toHaveAttribute('data-spread', String(OPENING_SPREAD));
    expect(drawing).toHaveAttribute('data-angle', String(OPENING_SPREAD));
    expect(readout()).toHaveTextContent('Spread 30 degrees · 6.8 cm off at the edge');
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject, tspan')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit assembly is the gauge on the cursor: its plunger down to the arm's tip, and its needle.
    const lit = [...svg.querySelectorAll('[data-lit], [data-tone="lit"]')];
    expect(lit.length).toBeGreaterThan(0);
    for (const part of lit) expect(part.closest('[data-part]')).toHaveAttribute('data-part', 'cursor');
    expect(svg.getAttribute('aria-label')).toMatch(/At 30 degrees either side of the guess, a dial gauge on the rule reads 6\.8 centimetres between the rule and the arc/);
  });

  it('describes the drawing with the method paragraph that explains the stand', () => {
    render(<LinearizationGap />);
    const svg = screen.getByTestId('lg-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(/^The drawing is a tangent-rule stand\./);
  });

  it('sets the spread from the slider, in words, and the stops and arm jump there under reduced motion', () => {
    still();
    render(<LinearizationGap />);
    expect(slider()).toHaveValue(String(OPENING_SPREAD));
    fireEvent.change(slider(), { target: { value: '15' } });
    const drawing = screen.getByTestId('lg-drawing');
    expect(drawing).toHaveAttribute('data-spread', '15');
    expect(drawing).toHaveAttribute('data-angle', '15');
    expect(readout()).toHaveTextContent(readoutFor(15));
    expect(slider()).toHaveAttribute('aria-valuetext', valueTextFor(15));
    expect(slider()).toHaveAttribute('aria-valuetext', 'Spread 15 degrees either side of the guess; at the edge the straight line is 1.7 cm off the arc');
    expect(screen.getByTestId('lg-spread')).toHaveTextContent('15 degrees');
    fireEvent.change(slider(), { target: { value: '40' } });
    expect(drawing).toHaveAttribute('data-spread', '40');
    expect(readout()).toHaveTextContent('Spread 40 degrees · 12.0 cm off at the edge');
  });

  it('eases the stops to a new spread', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<LinearizationGap />);
    fireEvent.change(slider(), { target: { value: '10' } });
    const drawing = screen.getByTestId('lg-drawing');
    await act(async () => {
      vi.advanceTimersByTime(80);
    });
    const mid = Number(drawing.getAttribute('data-spread'));
    expect(mid).toBeLessThan(30);
    expect(mid).toBeGreaterThan(10);
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(drawing).toHaveAttribute('data-spread', '10');
    expect(drawing).toHaveAttribute('data-angle', '10');
  });

  it('swings the arm only when asked, with no pressed state, across the spread and back to the + stop', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<LinearizationGap />);
    const swing = screen.getByTestId('lg-swing');
    expect(swing).not.toHaveAttribute('aria-pressed');
    expect(swing).not.toHaveAttribute('disabled');
    expect(swing).toHaveTextContent('Swing the arm');
    fireEvent.click(swing);
    expect(swing).toHaveTextContent('Stop the arm');
    const drawing = screen.getByTestId('lg-drawing');
    await act(async () => {
      vi.advanceTimersByTime((SWING_SECONDS * 1000) / 2);
    });
    expect(Number(drawing.getAttribute('data-angle'))).toBeLessThan(-25);
    await act(async () => {
      vi.advanceTimersByTime(SWING_SECONDS * 1000);
    });
    expect(drawing).toHaveAttribute('data-angle', String(OPENING_SPREAD));
    expect(swing).toHaveTextContent('Swing the arm');
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<LinearizationGap />);
    expect(html).toContain('data-figure-frame="linearization-gap"');
    expect(html).toContain('Spread 30 degrees · 6.8 cm off at the edge');
  });
});

describe('LinearizationGap served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<LinearizationGap />)}</main></body></html>`;

  it('passes the figure-system check and shows no symbol or bare unit in the main view', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/state-estimation/');
    expect(figures).toEqual(['linearization-gap']);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
