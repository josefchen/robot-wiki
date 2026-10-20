import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoopClosure } from '@/components/interactive/loop-closure';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { CLOSE_SECONDS, OPENING_DRIFT, readoutFor, valueTextFor } from '@/lib/loop-closure';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const still = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
const readout = () => screen.getByTestId('lc-stage').querySelector('[data-readout]');
const slider = () => screen.getByRole('slider', { name: 'How far each turn is off' });

describe('LoopClosure', () => {
  it('draws the still pose: the chain swung wide and the lit bar off the start post', () => {
    render(<LoopClosure />);
    expect(screen.getByText('Recognising the start pulls the drifted map back into shape')).toBeInTheDocument();
    const drawing = screen.getByTestId('lc-drawing');
    expect(drawing).toHaveAttribute('data-drift', String(OPENING_DRIFT));
    expect(drawing).toHaveAttribute('data-share', '0');
    expect(readout()).toHaveTextContent('Drift 1.5 degrees a leg · the bar misses the start by 2.6 m');
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject, tspan')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit assembly is the camera's view of the start: the bar and its socket, in the chain's slot.
    const lit = [...svg.querySelectorAll('[data-lit], [data-tone="lit"]')];
    expect(lit).toHaveLength(2);
    for (const part of lit) expect(part.closest('[data-part]')).toHaveAttribute('data-part', 'chain');
    expect(svg.getAttribute('aria-label')).toMatch(/misses the start post by 2\.6 m/);
  });

  it('describes the drawing with the method paragraph that explains the table', () => {
    render(<LoopClosure />);
    const svg = screen.getByTestId('lc-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(/^The drawing is a chain-map table\./);
  });

  it('closes and opens the loop at once under reduced motion, in words', () => {
    still();
    render(<LoopClosure />);
    const button = screen.getByTestId('lc-close');
    expect(button).not.toHaveAttribute('aria-pressed');
    expect(button).toHaveTextContent('Close the loop');
    fireEvent.click(button);
    const drawing = screen.getByTestId('lc-drawing');
    expect(drawing).toHaveAttribute('data-share', '1');
    expect(button).toHaveTextContent('Open the loop');
    expect(readout()).toHaveTextContent('Closed · 14 joints share 21 degrees · worst pose 0.12 m off');
    expect(slider()).toHaveAttribute('aria-valuetext', valueTextFor(1.5, true));
    expect(drawing.querySelector('svg')!.getAttribute('aria-label')).toMatch(/the loop is closed: the lit bar's socket sits on the start post/);
    fireEvent.change(slider(), { target: { value: '0.5' } });
    expect(drawing).toHaveAttribute('data-drift', '0.5');
    expect(drawing).toHaveAttribute('data-share', '1');
    expect(readout()).toHaveTextContent(readoutFor(0.5, true));
    fireEvent.click(button);
    expect(drawing).toHaveAttribute('data-share', '0');
    expect(readout()).toHaveTextContent('Drift 0.5 degrees a leg · the bar misses the start by 0.8 m');
    expect(slider()).toHaveAttribute('aria-valuetext', valueTextFor(0.5, false));
    expect(screen.getByTestId('lc-drift')).toHaveTextContent('0.5 degrees');
  });

  it('eases the chain shut over the close, saying how far the bar has still to go', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<LoopClosure />);
    fireEvent.click(screen.getByTestId('lc-close'));
    const drawing = screen.getByTestId('lc-drawing');
    await act(async () => {
      vi.advanceTimersByTime((CLOSE_SECONDS * 1000) / 2);
    });
    const mid = Number(drawing.getAttribute('data-share'));
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.8);
    expect(readout()?.textContent).toMatch(/^Closing · the bar \d\.\d m from the start$/);
    await act(async () => {
      vi.advanceTimersByTime(CLOSE_SECONDS * 1000);
    });
    expect(drawing).toHaveAttribute('data-share', '1');
    expect(readout()).toHaveTextContent(readoutFor(OPENING_DRIFT, true));
  });

  it('eases the chain to a new drift', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<LoopClosure />);
    fireEvent.change(slider(), { target: { value: '0.5' } });
    const drawing = screen.getByTestId('lc-drawing');
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    const mid = Number(drawing.getAttribute('data-drift'));
    expect(mid).toBeLessThan(1.5);
    expect(mid).toBeGreaterThan(0.5);
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(drawing).toHaveAttribute('data-drift', '0.5');
    expect(readout()).toHaveTextContent(readoutFor(0.5, false));
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<LoopClosure />);
    expect(html).toContain('data-figure-frame="loop-closure"');
    expect(html).toContain('Drift 1.5 degrees a leg · the bar misses the start by 2.6 m');
  });
});

describe('LoopClosure served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<LoopClosure />)}</main></body></html>`;

  it('passes the figure-system check and shows no symbol or bare unit in the main view', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/scene-representation/');
    expect(figures).toEqual(['loop-closure']);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
