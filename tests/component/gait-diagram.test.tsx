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
    expect(gaitButton(/pause gait cycle/i)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(210);
    });
    expect(phaseText()).toBe('4%');
    fireEvent.click(gaitButton(/pause gait cycle/i));
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
