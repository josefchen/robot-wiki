import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NoiseOrEdit } from '@/components/interactive/noise-or-edit';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { LEARNED_EDIT, RAISE_SECONDS, SEARCH_SECONDS, runSeconds } from '@/lib/noise-or-edit';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const still = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
const readout = () => screen.getByTestId('noise-or-edit-stage-frame').querySelector('[data-readout]');

describe('NoiseOrEdit', () => {
  it('draws the still pose: the best noise only, the peg down on the strip short of the hole', () => {
    render(<NoiseOrEdit />);
    expect(screen.getByText('Steering the noise finds only actions the policy already makes')).toBeInTheDocument();
    const drawing = screen.getByTestId('noise-or-edit-drawing');
    expect(drawing).toHaveAttribute('data-mode', 'noise');
    expect(drawing).toHaveAttribute('data-deg', '0');
    expect(drawing).toHaveAttribute('data-edit', '0');
    expect(drawing).toHaveAttribute('data-landed', 'short');
    expect(readout()).toHaveTextContent('Steered noise only · peg lands short');
    expect(screen.getByTestId('noise-or-edit-stage-frame')).toHaveTextContent(/Schematic: an illustrative cam, hole and edit/);
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject, tspan')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit part is the peg, in the peg's group.
    const lit = [...svg.querySelectorAll('[data-lit], [data-tone="lit"]')];
    expect(lit.length).toBeGreaterThanOrEqual(1);
    for (const node of lit) expect(node.closest('[data-part]')).toHaveAttribute('data-part', 'peg');
    expect(svg.getAttribute('aria-label')).toMatch(/the peg has dropped onto the strip, short of the hole/);
    expect(screen.getByTestId('noise-or-edit-noise')).toHaveAttribute('aria-pressed', 'true');
  });

  it('describes the drawing with the method paragraph that explains the bench', () => {
    render(<NoiseOrEdit />);
    const svg = screen.getByTestId('noise-or-edit-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(/^The drawing is that difference on a cam bench\./);
  });

  it('adds the edit and drops the peg in the hole; reduced motion jumps there', () => {
    still();
    render(<NoiseOrEdit />);
    fireEvent.click(screen.getByTestId('noise-or-edit-edit'));
    const drawing = screen.getByTestId('noise-or-edit-drawing');
    expect(screen.getByTestId('noise-or-edit-edit')).toHaveAttribute('aria-pressed', 'true');
    expect(drawing).toHaveAttribute('data-edit', String(LEARNED_EDIT));
    expect(drawing).toHaveAttribute('data-landed', 'in');
    expect(readout()).toHaveTextContent('Noise and an edit · peg in the hole');
    expect(drawing.querySelector('svg')!.getAttribute('aria-label')).toMatch(/the peg has dropped into the hole/);
    fireEvent.click(screen.getByTestId('noise-or-edit-noise'));
    expect(drawing).toHaveAttribute('data-edit', '0');
    expect(drawing).toHaveAttribute('data-landed', 'short');
  });

  it('eases a switch: the peg rises, the edit turns, the peg drops into the hole', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<NoiseOrEdit />);
    fireEvent.click(screen.getByTestId('noise-or-edit-edit'));
    const drawing = screen.getByTestId('noise-or-edit-drawing');
    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    const edit = Number(drawing.getAttribute('data-edit'));
    expect(edit).toBeGreaterThan(0);
    expect(edit).toBeLessThan(LEARNED_EDIT);
    expect(drawing).toHaveAttribute('data-landed', 'moving');
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(drawing).toHaveAttribute('data-landed', 'in');
  });

  it('runs the search only when asked, with no pressed state: the dial turns once round and the peg stays on the strip', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { unmount } = render(<NoiseOrEdit />);
    const run = screen.getByTestId('noise-or-edit-run');
    expect(run).not.toHaveAttribute('aria-pressed');
    expect(run).not.toHaveAttribute('disabled');
    expect(run).toHaveTextContent('Run the search');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the search');
    expect(run).not.toHaveAttribute('aria-pressed');
    const drawing = screen.getByTestId('noise-or-edit-drawing');
    await act(async () => {
      vi.advanceTimersByTime((RAISE_SECONDS + SEARCH_SECONDS / 2) * 1000);
    });
    expect(drawing).toHaveAttribute('data-phase', 'search');
    expect(Number(drawing.getAttribute('data-deg'))).toBeGreaterThan(90);
    expect(readout()).toHaveTextContent('Any noise · the peg stays on the strip');
    await act(async () => {
      vi.advanceTimersByTime(runSeconds('noise') * 1000 + 500);
    });
    expect(drawing).toHaveAttribute('data-phase', 'done');
    expect(drawing).toHaveAttribute('data-landed', 'short');
    expect(run).toHaveTextContent('Run the search');
    unmount();
    vi.useRealTimers();
    still();
    render(<NoiseOrEdit />);
    fireEvent.click(screen.getByTestId('noise-or-edit-edit'));
    fireEvent.click(screen.getByTestId('noise-or-edit-run'));
    expect(screen.getByTestId('noise-or-edit-drawing')).toHaveAttribute('data-landed', 'in');
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<NoiseOrEdit />);
    expect(html).toContain('data-figure-frame="noise-or-edit"');
    expect(html).toContain('Steered noise only · peg lands short');
  });
});

describe('NoiseOrEdit served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<NoiseOrEdit />)}</main></body></html>`;

  it('passes the figure-system check and shows no symbol or bare unit in the main view', () => {
    const { figures, violations } = inspectFigureDocument(html, '/manipulation/rl-finetuning/');
    expect(figures).toEqual(['noise-or-edit']);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
