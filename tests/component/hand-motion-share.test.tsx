import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HandMotionShare } from '@/components/interactive/hand-motion-share';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { DRAW_SECONDS, RETURN_SECONDS } from '@/lib/hand-motion-share';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const still = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
const readout = () => screen.getByTestId('hand-motion-share-stage-frame').querySelector('[data-readout]');

describe('HandMotionShare', () => {
  it('draws the still pose: joint angles copied, the robot’s stroke straying from the check mark', () => {
    render(<HandMotionShare />);
    expect(screen.getByText("The hand's motion transfers between bodies; joint angles do not")).toBeInTheDocument();
    const drawing = screen.getByTestId('hand-motion-share-drawing');
    expect(drawing).toHaveAttribute('data-copy', 'joints');
    expect(drawing).toHaveAttribute('data-phase', 'done');
    expect(drawing).toHaveAttribute('data-stray', '6.8');
    expect(readout()).toHaveTextContent('Joint angles copied · strays 6.8 cm');
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject, tspan')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit part is the robot's ink.
    const lit = [...svg.querySelectorAll('[data-lit], [data-tone="lit"]')];
    expect(lit).toHaveLength(1);
    expect(lit[0]!.closest('[data-part]')).toHaveAttribute('data-part', 'strokes');
    expect(svg.getAttribute('aria-label')).toMatch(/straying up to 6.8 centimetres/);
    expect(screen.getByTestId('hand-motion-share-joints')).toHaveAttribute('aria-pressed', 'true');
  });

  it('describes the drawing with the method paragraph that explains the bench', () => {
    render(<HandMotionShare />);
    const svg = screen.getByTestId('hand-motion-share-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(/^The drawing is two easels on one bench\./);
  });

  it('sends the hand’s motion and the robot draws the same stroke; reduced motion jumps there', () => {
    still();
    render(<HandMotionShare />);
    fireEvent.click(screen.getByTestId('hand-motion-share-hand'));
    const drawing = screen.getByTestId('hand-motion-share-drawing');
    expect(drawing).toHaveAttribute('data-copy', 'hand');
    expect(drawing).toHaveAttribute('data-stray', '0');
    expect(drawing).toHaveAttribute('data-lever', '1');
    expect(readout()).toHaveTextContent("Hand's motion copied · same stroke");
    expect(drawing.querySelector('svg')!.getAttribute('aria-label')).toMatch(/its lit ink lies on the same check mark/);
  });

  it('draws the stroke only when asked, with no pressed state: pens back to the start, then both arms draw', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { unmount } = render(<HandMotionShare />);
    const run = screen.getByTestId('hand-motion-share-run');
    expect(run).not.toHaveAttribute('aria-pressed');
    expect(run).not.toHaveAttribute('disabled');
    expect(run).toHaveTextContent('Draw the stroke');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop drawing');
    const drawing = screen.getByTestId('hand-motion-share-drawing');
    await act(async () => {
      vi.advanceTimersByTime(RETURN_SECONDS * 500);
    });
    expect(drawing).toHaveAttribute('data-phase', 'return');
    expect(readout()).toHaveTextContent('Pens back to the start');
    await act(async () => {
      vi.advanceTimersByTime(RETURN_SECONDS * 500 + DRAW_SECONDS * 500);
    });
    expect(drawing).toHaveAttribute('data-phase', 'draw');
    const share = Number(drawing.getAttribute('data-share'));
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(1);
    expect(readout()).toHaveTextContent('Drawing · the robot copies live');
    await act(async () => {
      vi.advanceTimersByTime(DRAW_SECONDS * 1000);
    });
    expect(drawing).toHaveAttribute('data-phase', 'done');
    expect(readout()).toHaveTextContent('Joint angles copied · strays 6.8 cm');
    expect(run).toHaveTextContent('Draw the stroke');
    unmount();
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<HandMotionShare />);
    expect(html).toContain('data-figure-frame="hand-motion-share"');
    expect(html).toContain('Joint angles copied · strays 6.8 cm');
  });
});

describe('HandMotionShare served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<HandMotionShare />)}</main></body></html>`;

  it('passes the figure-system check and shows no symbol or bare unit in the main view', () => {
    const { figures, violations } = inspectFigureDocument(html, '/manipulation/cross-embodiment/');
    expect(figures).toEqual(['hand-motion-share']);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
