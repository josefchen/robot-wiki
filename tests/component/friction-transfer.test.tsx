import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FrictionTransfer } from '@/components/interactive/friction-transfer';

function realMuSlider() {
  return screen.getByRole('slider', { name: /real robot friction/i });
}

function rangeSlider() {
  return screen.getByRole('slider', { name: /randomization half-width/i });
}

function readout(id: string) {
  return screen.getByTestId(id).textContent ?? '';
}

describe('FrictionTransfer', () => {
  it('renders both curves, the DR band, the real-robot line, readouts, and reset', () => {
    render(<FrictionTransfer />);
    expect(realMuSlider()).toBeInTheDocument();
    expect(rangeSlider()).toBeInTheDocument();
    expect(screen.getByTestId('point-curve')).toBeInTheDocument();
    expect(screen.getByTestId('dr-curve')).toBeInTheDocument();
    expect(screen.getByTestId('dr-band')).toBeInTheDocument();
    expect(screen.getByTestId('real-line')).toBeInTheDocument();
    expect(screen.getByTestId('real-mu-readout')).toBeInTheDocument();
    expect(screen.getByTestId('point-readout')).toBeInTheDocument();
    expect(screen.getByTestId('dr-readout')).toBeInTheDocument();
    expect(screen.getByTestId('delta-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('defaults to the training friction with the point policy ahead', () => {
    render(<FrictionTransfer />);
    expect(readout('real-mu-readout')).toBe('0.80');
    expect(readout('point-readout')).toBe('97%');
    expect(readout('dr-readout')).toBe('74%');
    expect(readout('delta-readout')).toMatch(/point \+\d+ pts/);
  });

  it('moving the real-robot line far off the training friction flips the winner to DR', () => {
    render(<FrictionTransfer />);
    fireEvent.change(realMuSlider(), { target: { value: '35' } });
    expect(readout('real-mu-readout')).toBe('0.35');
    expect(readout('point-readout')).toBe('0%');
    expect(readout('delta-readout')).toMatch(/DR \+\d+ pts/);
  });

  it('widening the randomization range lowers the DR peak readout', () => {
    render(<FrictionTransfer />);
    const before = readout('dr-readout');
    fireEvent.change(rangeSlider(), { target: { value: '65' } });
    const after = readout('dr-readout');
    expect(after).not.toBe(before);
    expect(Number(after.replace('%', ''))).toBeLessThan(
      Number(before.replace('%', '')),
    );
    expect(screen.getByTestId('dr-peak-label')).toBeInTheDocument();
  });

  it('reset restores the default line position and range', async () => {
    const user = userEvent.setup();
    render(<FrictionTransfer />);
    fireEvent.change(realMuSlider(), { target: { value: '120' } });
    fireEvent.change(rangeSlider(), { target: { value: '65' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(readout('real-mu-readout')).toBe('0.80');
    expect(readout('point-readout')).toBe('97%');
    expect(readout('dr-readout')).toBe('74%');
  });
});
