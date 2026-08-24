import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GaitDiagram } from '@/components/interactive/gait-diagram';

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function mockReducedMotionLive(initial: boolean) {
  let matches = initial;
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const addEventListener = vi.fn(
    (_type: string, handler: (event: { matches: boolean }) => void) => {
      listeners.add(handler);
    },
  );
  const removeEventListener = vi.fn(
    (_type: string, handler: (event: { matches: boolean }) => void) => {
      listeners.delete(handler);
    },
  );
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener,
    removeEventListener,
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    addEventListener,
    removeEventListener,
    setMatches(next: boolean) {
      matches = next;
      for (const listener of listeners) listener({ matches: next });
    },
  };
}

function gaitButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

function phaseText() {
  return screen.getByTestId('phase-readout').textContent ?? '';
}

function stanceText() {
  return screen.getByTestId('stance-readout').textContent ?? '';
}

describe('GaitDiagram', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the four-leg diagram, gait selector, playback controls, and readouts', () => {
    render(<GaitDiagram />);
    for (const row of ['row-lf', 'row-rf', 'row-lh', 'row-rh']) {
      expect(screen.getByTestId(row)).toBeInTheDocument();
    }
    expect(screen.getByTestId('playhead')).toBeInTheDocument();
    for (const name of [/walk/i, /trot/i, /bound/i, /pronk/i]) {
      expect(gaitButton(name)).toBeInTheDocument();
    }
    expect(gaitButton(/play gait cycle/i)).toBeInTheDocument();
    expect(gaitButton(/step forward/i)).toBeInTheDocument();
    expect(gaitButton(/step back/i)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /gait phase/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('duty-readout')).toBeInTheDocument();
    expect(screen.getByTestId('phase-readout')).toBeInTheDocument();
    expect(screen.getByTestId('phase-readout')).toHaveAttribute(
      'data-playback-cadence',
      'idle',
    );
    expect(screen.getByTestId('stance-readout')).toBeInTheDocument();
    expect(screen.getByTestId('support-readout')).toBeInTheDocument();
  });

  it('defaults to the walk at the start of the cycle', () => {
    render(<GaitDiagram />);
    expect(gaitButton(/walk/i)).toHaveAttribute('aria-pressed', 'true');
    expect(gaitButton(/trot/i)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('duty-readout')).toHaveTextContent('0.75');
    expect(phaseText()).toBe('0%');
    // At cycle start the walk has LH, RH, RF on the ground (LF just lifted).
    expect(stanceText()).toContain('LH');
    expect(screen.getByTestId('support-readout')).toHaveTextContent(
      /always 3 feet/i,
    );
  });

  it('trot shows diagonal pairs in phase and a 0.50 duty factor', async () => {
    const user = userEvent.setup();
    render(<GaitDiagram />);
    await user.click(gaitButton(/trot/i));
    expect(gaitButton(/trot/i)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('duty-readout')).toHaveTextContent('0.50');
    expect(stanceText()).toBe('LF + RH');
    expect(screen.getByTestId('support-readout')).toHaveTextContent(
      /2 feet at all times/i,
    );
  });

  it('switching gaits visibly changes the footfall pattern', async () => {
    const user = userEvent.setup();
    render(<GaitDiagram />);
    const walkRow = screen.getByTestId('row-lf').innerHTML;
    await user.click(gaitButton(/bound/i));
    const boundRow = screen.getByTestId('row-lf').innerHTML;
    expect(boundRow).not.toBe(walkRow);
    expect(screen.getByTestId('support-readout')).toHaveTextContent(
      /flight phase/i,
    );
    expect(screen.getByTestId('duty-readout')).toHaveTextContent('0.45');
  });

  it('stepping advances the phase deterministically on the 5% grid', async () => {
    const user = userEvent.setup();
    render(<GaitDiagram />);
    await user.click(gaitButton(/step forward/i));
    expect(phaseText()).toBe('5%');
    await user.click(gaitButton(/step forward/i));
    expect(phaseText()).toBe('10%');
    await user.click(gaitButton(/step back/i));
    expect(phaseText()).toBe('5%');
  });

  it('stepping past the end of the cycle wraps to the start', async () => {
    const user = userEvent.setup();
    render(<GaitDiagram />);
    for (let i = 0; i < 20; i++) {
      await user.click(gaitButton(/step forward/i));
    }
    expect(phaseText()).toBe('0%');
  });

  it('stepping the trot halfway swaps the diagonal pair', async () => {
    const user = userEvent.setup();
    render(<GaitDiagram />);
    await user.click(gaitButton(/trot/i));
    for (let i = 0; i < 10; i++) {
      await user.click(gaitButton(/step forward/i));
    }
    expect(phaseText()).toBe('50%');
    expect(stanceText()).toBe('RF + LH');
  });

  it('the phase slider scrubs the diagram directly', () => {
    render(<GaitDiagram />);
    fireEvent.change(screen.getByRole('slider', { name: /gait phase/i }), {
      target: { value: '25' },
    });
    expect(phaseText()).toBe('25%');
    expect(screen.getByTestId('playhead')).toBeInTheDocument();
  });

  it('play advances the cycle smoothly and pause stops it', () => {
    vi.useFakeTimers();
    render(<GaitDiagram />);
    fireEvent.click(gaitButton(/play gait cycle/i));
    expect(screen.getByTestId('phase-readout')).toHaveAttribute(
      'data-playback-cadence',
      'smooth',
    );
    expect(gaitButton(/pause gait cycle/i)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(210);
    });
    expect(phaseText()).toBe('4%');
    fireEvent.click(gaitButton(/pause gait cycle/i));
    expect(screen.getByTestId('phase-readout')).toHaveAttribute(
      'data-playback-cadence',
      'idle',
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(phaseText()).toBe('4%');
  });

  it('under reduced motion playback steps discretely on the step grid', () => {
    mockReducedMotion(true);
    vi.useFakeTimers();
    render(<GaitDiagram />);
    fireEvent.click(gaitButton(/play gait cycle/i));
    act(() => {
      vi.advanceTimersByTime(350);
    });
    // One discrete jump: straight to the next 10% mark, no smooth motion.
    expect(phaseText()).toBe('10%');
  });

  it('tracks reduced motion before playback and removes its listener on unmount', () => {
    vi.useFakeTimers();
    const media = mockReducedMotionLive(false);
    const { unmount } = render(<GaitDiagram />);
    act(() => {
      media.setMatches(true);
    });
    fireEvent.click(gaitButton(/play gait cycle/i));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(phaseText()).toBe('0%');
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(phaseText()).toBe('10%');
    unmount();
    expect(media.addEventListener).toHaveBeenCalledOnce();
    expect(media.removeEventListener).toHaveBeenCalledWith(
      'change',
      media.addEventListener.mock.calls[0][1],
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rebuilds playback at the coarse cadence when reduced motion changes mid-run', () => {
    vi.useFakeTimers();
    const media = mockReducedMotionLive(false);
    render(<GaitDiagram />);
    fireEvent.click(gaitButton(/play gait cycle/i));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(phaseText()).toBe('4%');
    act(() => {
      media.setMatches(true);
    });
    expect(screen.getByTestId('phase-readout')).toHaveAttribute(
      'data-playback-cadence',
      'coarse',
    );
    const frozen = phaseText();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(phaseText()).toBe(frozen);
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(phaseText()).toBe('14%');
  });

  it('samples the disclosure table on the rendered tick grid, endpoints included', async () => {
    // VAL-EDU-023 clause (a): the table must carry the plotted range's
    // endpoints, so it samples the rendered tick set [0, 0.25, 0.5, 0.75,
    // 1] exactly rather than a 20% grid that stops at 80%. Every cell
    // must be non-empty (VAL-EDU-028), and the closing 100% row must
    // equal phase 0 (the cycle wraps: 100% labels the same instant).
    const user = userEvent.setup();
    render(<GaitDiagram />);
    const details = screen.getByText('Footfall timing for the walk', { exact: false }).closest('div')!.querySelector('details[data-chart-data]') as HTMLElement;
    (details as HTMLDetailsElement).open = true;
    const rows = Array.from(details.querySelectorAll('tbody tr'));
    expect(rows.map((r) => r.querySelector('th')!.textContent)).toEqual([
      '0%', '25%', '50%', '75%', '100%',
    ]);
    for (const row of rows) {
      for (const cell of Array.from(row.querySelectorAll('th,td'))) {
        expect((cell.textContent ?? '').trim().length).toBeGreaterThan(0);
      }
    }
    // Walk: the quarter grid lands rows exactly on the footfall offsets
    // (LH 0, LF 0.25, RH 0.5, RF 0.75), so the strike column fires on
    // every row except the closing endpoint.
    const strikes = rows.map((r) => r.querySelectorAll('td')[1].textContent);
    expect(strikes).toEqual(['LH', 'LF', 'RH', 'RF', 'none']);
    // The closing 100% row carries phase 0's stance.
    expect(rows[4].querySelectorAll('td')[0].textContent).toBe(
      rows[0].querySelectorAll('td')[0].textContent,
    );
    // Pronk keeps every cell non-empty on the same grid (airborne at
    // mid-cycle prints "none", which is a value, not an empty cell).
    await user.click(gaitButton(/pronk/i));
    const pronkRows = Array.from(details.querySelectorAll('tbody tr'));
    expect(pronkRows.map((r) => r.querySelector('th')!.textContent)).toEqual([
      '0%', '25%', '50%', '75%', '100%',
    ]);
    for (const row of pronkRows) {
      for (const cell of Array.from(row.querySelectorAll('th,td'))) {
        expect((cell.textContent ?? '').trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('reset returns to the default gait and phase after interaction', async () => {
    const user = userEvent.setup();
    render(<GaitDiagram />);
    await user.click(gaitButton(/pronk/i));
    await user.click(gaitButton(/step forward/i));
    await user.click(gaitButton(/step forward/i));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(gaitButton(/walk/i)).toHaveAttribute('aria-pressed', 'true');
    expect(phaseText()).toBe('0%');
    expect(screen.getByTestId('duty-readout')).toHaveTextContent('0.75');
  });
});
