import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExcavatorPractice, readoutFor } from '@/components/interactive/excavator-practice';
import { boardMarks, needleAt } from '@/components/iso/figures/practice-excavator';
import { ENSEMBLE_MEMBERS, PRACTICE, RUN_SECONDS, STILL_S, practiceOf } from '@/lib/excavator-practice';

afterEach(() => {
  vi.unstubAllGlobals();
});

const reduceMotion = () =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));

describe('ExcavatorPractice', () => {
  it('draws the still pose: 20 minutes, five guesses ahead of the ink, the dial on 20, no words in the drawing', () => {
    render(<ExcavatorPractice />);
    expect(screen.getByText('An excavator learned its own arm in 20 minutes')).toBeInTheDocument();
    const drawing = screen.getByTestId('excavator-drawing');
    expect(drawing).toHaveAttribute('data-minutes', '20');
    expect(drawing).toHaveAttribute('data-s', String(STILL_S));
    expect(drawing).toHaveAttribute('data-guesses', String(ENSEMBLE_MEMBERS));
    const stage = screen.getByTestId('excavator-stage-frame');
    expect(stage.querySelector('[data-readout]')).toHaveTextContent('20 minutes · matches earlier controllers');
    expect(stage).toHaveTextContent(/illustrative/);
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The ink is the drawing's one lit part; no solid is lit.
    expect(svg.querySelectorAll('[data-lit]')).toHaveLength(0);
    expect(svg.querySelectorAll('[data-tone="lit"]')).toHaveLength(1);
    expect(svg.querySelector('[data-ink]')!.getAttribute('d')).toBe(boardMarks(practiceOf('twenty'), STILL_S).ink);
    expect(svg.querySelectorAll('[data-guess]')).toHaveLength(ENSEMBLE_MEMBERS);
    expect(svg.querySelector('[data-needle]')!.getAttribute('d')).toBe(needleAt(20));
    expect(svg.getAttribute('aria-label')).toMatch(/reads 20 minutes of practice, against a band at the 100 to 150 minutes/);
  });

  it('describes the drawing with the method paragraph that explains the excavator', () => {
    render(<ExcavatorPractice />);
    const svg = screen.getByTestId('excavator-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      /^The drawing is that loop on a practice yard\./,
    );
  });

  it('reads out in words from the model', () => {
    for (const practice of PRACTICE) expect(readoutFor(practice, 0.4, false)).toBe(practice.reads);
    expect(readoutFor(practiceOf('three'), 0.4, true)).toBe('3 minutes · tracing, 40% of the path');
    for (const practice of PRACTICE) expect(practice.reads).not.toMatch(/[=<>±√∑]/);
  });

  it('picks the minutes of practice from a labelled group, jumping there under reduced motion', () => {
    reduceMotion();
    render(<ExcavatorPractice />);
    const group = screen.getByRole('group', { name: 'Minutes of practice on the machine' });
    expect(group).toBeInTheDocument();
    const three = screen.getByTestId('excavator-practice-three');
    expect(three).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(three);
    expect(three).toHaveAttribute('aria-pressed', 'true');
    const drawing = screen.getByTestId('excavator-drawing');
    expect(drawing).toHaveAttribute('data-minutes', '3');
    expect(screen.getByTestId('excavator-stage-frame').querySelector('[data-readout]')).toHaveTextContent('3 minutes · large misses');
    expect(drawing.querySelector('[data-needle]')!.getAttribute('d')).toBe(needleAt(3));
    expect(drawing.querySelector('[data-ink]')!.getAttribute('d')).toBe(boardMarks(practiceOf('three'), STILL_S).ink);
  });

  it('eases to a new preset when motion is allowed', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<ExcavatorPractice />);
      fireEvent.click(screen.getByTestId('excavator-practice-forty'));
      const drawing = screen.getByTestId('excavator-drawing');
      expect(drawing).toHaveAttribute('data-settled', 'false');
      await act(async () => {
        vi.advanceTimersByTime(800);
      });
      expect(drawing).toHaveAttribute('data-minutes', '40');
      expect(drawing).toHaveAttribute('data-settled', 'true');
    } finally {
      vi.useRealTimers();
    }
  });

  it('traces the path only when asked, with no pressed state, and jumps to the end under reduced motion', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<ExcavatorPractice />);
      const run = screen.getByTestId('excavator-run');
      expect(run).not.toHaveAttribute('aria-pressed');
      expect(run).toHaveTextContent('Trace the path');
      fireEvent.click(run);
      expect(run).toHaveTextContent('Stop the arm');
      expect(run).not.toHaveAttribute('aria-pressed');
      await act(async () => {
        vi.advanceTimersByTime((RUN_SECONDS * 1000) / 2);
      });
      const drawing = screen.getByTestId('excavator-drawing');
      expect(Number(drawing.getAttribute('data-s'))).toBeGreaterThan(0.3);
      expect(Number(drawing.getAttribute('data-s'))).toBeLessThan(0.7);
      expect(screen.getByTestId('excavator-stage-frame').querySelector('[data-readout]')).toHaveTextContent(/tracing, \d+% of the path/);
      await act(async () => {
        vi.advanceTimersByTime(RUN_SECONDS * 1000);
      });
      expect(drawing).toHaveAttribute('data-s', '1');
      expect(drawing).toHaveAttribute('data-guesses', '0');
      expect(run).toHaveTextContent('Trace the path');
    } finally {
      vi.useRealTimers();
    }
    reduceMotion();
    const { container } = render(<ExcavatorPractice />);
    fireEvent.click(container.querySelector('[data-testid="excavator-run"]')!);
    expect(container.querySelector('[data-testid="excavator-drawing"]')).toHaveAttribute('data-s', '1');
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<ExcavatorPractice />);
    expect(html).toContain('data-figure-frame="excavator-practice"');
    expect(html).toContain('20 minutes · matches earlier controllers');
    expect(html).toContain('Learning a model from its own moves');
  });
});
