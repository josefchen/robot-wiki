import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeltaFrame } from '@/components/interactive/delta-frame';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { MOVE_SECONDS, RETURN_SECONDS, REPLAY_SECONDS, readoutFor, valueTextFor } from '@/lib/delta-frame';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const still = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
const readout = () => screen.getByTestId('delta-frame-stage-frame').querySelector('[data-readout]');

describe('DeltaFrame', () => {
  it('draws the still pose: the tool turned 60 degrees, the move read in the table’s frame, a whole move off the stroke', () => {
    render(<DeltaFrame />);
    expect(screen.getByText('Read in the wrong frame, the same move misses')).toBeInTheDocument();
    const drawing = screen.getByTestId('delta-frame-drawing');
    expect(drawing).toHaveAttribute('data-frame', 'table');
    expect(drawing).toHaveAttribute('data-angle', '60');
    expect(drawing).toHaveAttribute('data-gap', '5');
    expect(readout()).toHaveTextContent('60 degrees · table frame · 5 cm off');
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject, tspan')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit part is the replay's ink.
    const lit = [...svg.querySelectorAll('[data-lit], [data-tone="lit"]')];
    expect(lit).toHaveLength(1);
    expect(lit[0]!.closest('[data-part]')).toHaveAttribute('data-part', 'ink');
    expect(svg.getAttribute('aria-label')).toMatch(/read in the table's frame, running along the rails and ending 5 centimetres off it/);
    expect(screen.getByTestId('delta-frame-table')).toHaveAttribute('aria-pressed', 'true');
  });

  it('describes the drawing with the method paragraph that explains the plotter', () => {
    render(<DeltaFrame />);
    const svg = screen.getByTestId('delta-frame-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(/^The drawing is a pen plotter\./);
  });

  it('turns the tool from the slider, in words: square to the table the two frames agree', () => {
    still();
    render(<DeltaFrame />);
    const slider = screen.getByRole('slider', { name: 'Tool turned' });
    expect(slider).toHaveValue('60');
    expect(slider).toHaveAttribute('aria-valuetext', valueTextFor('table', 60));
    fireEvent.change(slider, { target: { value: '0' } });
    const drawing = screen.getByTestId('delta-frame-drawing');
    expect(drawing).toHaveAttribute('data-gap', '0');
    expect(readout()).toHaveTextContent(readoutFor('table', 0));
    fireEvent.change(slider, { target: { value: '90' } });
    expect(drawing).toHaveAttribute('data-gap', '7.1');
    expect(slider).toHaveAttribute('aria-valuetext', 'Tool turned 90 degrees; read in the table frame, the replay lands 7.1 cm off the stroke');
    expect(screen.getByTestId('delta-frame-angle')).toHaveTextContent('90 degrees');
  });

  it('reads the move in the tool’s frame and lands on the stroke; reduced motion jumps there', () => {
    still();
    render(<DeltaFrame />);
    fireEvent.click(screen.getByTestId('delta-frame-tool'));
    const drawing = screen.getByTestId('delta-frame-drawing');
    expect(drawing).toHaveAttribute('data-frame', 'tool');
    expect(drawing).toHaveAttribute('data-gap', '0');
    expect(drawing).toHaveAttribute('data-phase', 'done');
    expect(readout()).toHaveTextContent('60 degrees · tool frame · on the stroke');
  });

  it('replays the move only when asked, with no pressed state: back to the start, then the ink, then the arm parks', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { unmount } = render(<DeltaFrame />);
    const run = screen.getByTestId('delta-frame-run');
    expect(run).not.toHaveAttribute('aria-pressed');
    expect(run).not.toHaveAttribute('disabled');
    expect(run).toHaveTextContent('Replay the move');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the replay');
    const drawing = screen.getByTestId('delta-frame-drawing');
    await act(async () => {
      vi.advanceTimersByTime(RETURN_SECONDS * 500);
    });
    expect(drawing).toHaveAttribute('data-phase', 'return');
    expect(readout()).toHaveTextContent('Pen back to the start');
    await act(async () => {
      vi.advanceTimersByTime(RETURN_SECONDS * 500 + 900);
    });
    expect(drawing).toHaveAttribute('data-phase', 'move');
    expect(readout()).toHaveTextContent('Replaying 5 cm forward');
    // The move made, the pen lifts and the arm parks; the readout already says the result.
    await act(async () => {
      vi.advanceTimersByTime((RETURN_SECONDS + MOVE_SECONDS) * 1000 - (RETURN_SECONDS * 1000 + 900) + 500);
    });
    expect(drawing).toHaveAttribute('data-phase', 'park');
    expect(readout()).toHaveTextContent('60 degrees · table frame · 5 cm off');
    await act(async () => {
      vi.advanceTimersByTime(REPLAY_SECONDS * 1000);
    });
    expect(drawing).toHaveAttribute('data-phase', 'done');
    expect(readout()).toHaveTextContent('60 degrees · table frame · 5 cm off');
    expect(run).toHaveTextContent('Replay the move');
    unmount();
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<DeltaFrame />);
    expect(html).toContain('data-figure-frame="delta-frame"');
    expect(html).toContain('60 degrees · table frame · 5 cm off');
  });
});

describe('DeltaFrame served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<DeltaFrame />)}</main></body></html>`;

  it('passes the figure-system check and shows no symbol or bare unit in the main view', () => {
    const { figures, violations } = inspectFigureDocument(html, '/manipulation/robot-learning-roadmap/');
    expect(figures).toEqual(['delta-frame']);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
