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

  it('opens on the practice floor, where the one-floor robot wins', () => {
    const { container } = render(<FrictionTransfer />);
    expect(readout('real-mu-readout')).toBe('0.80');
    expect(readout('point-readout')).toBe('97%');
    expect(readout('dr-readout')).toBe('74%');
    expect(readout('delta-readout')).toMatch(/point \+\d+ pts/);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'One-floor robot wins on its floor; many-floor robot copes widely',
    );
    // The headline names the robots the way the legend and the note do, and the axis says what the share counts.
    expect(container.querySelector('[data-legend-series="point-policy"]')).toHaveTextContent('one-floor robot');
    expect(container.querySelector('[data-scene-axis]')).toHaveTextContent('tries without a fall');
    const note = container.querySelectorAll('[data-figure-annotation]');
    expect(note).toHaveLength(1);
    expect(note[0]).toHaveTextContent(/Real floor same as the practice floor:\s*the one-floor robot wins, 97% against 74%/);
    // The real floor is the one slider in view, its setting read as one phrase;
    // the range of practice floors and Reset sit in Adjust more.
    const controls = container.querySelector('[data-figure-controls]')!;
    const adjust = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(controls).toContainElement(realMuSlider());
    expect(adjust).not.toContainElement(realMuSlider());
    expect(controls).toHaveTextContent('Real floor: same as the practice floor');
    expect(adjust).toContainElement(rangeSlider());
    expect(adjust).toHaveTextContent('a middling spread');
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
    // One legend entry names the many-floor robot's line and its shaded range together.
    expect(screen.getByTestId('dr-band')).toHaveAttribute('data-series', 'dr-policy');
    expect(container.querySelector('[data-legend-series="dr-policy"]')).toHaveTextContent(
      'many-floor robot, practised on the shaded floors',
    );
    expect(container.querySelector('[data-legend-series="training-range"]')).toBeNull();
  });

  it('labels each dot with its robot\'s chance on the real floor and keeps the method note in the fold', () => {
    const { container } = render(<FrictionTransfer />);
    const values = () => [...screen.getByTestId('real-floor-values').querySelectorAll('text')].map((t) => t.textContent);
    expect(values()).toEqual(['97%', '74%']);
    fireEvent.change(realMuSlider(), { target: { value: '35' } });
    expect(values()).toEqual([readout('point-readout'), readout('dr-readout')]);
    // The authored-formula note lives in "How this was made", not on a source line under the caption.
    expect(container.querySelector('[data-figure-source]')).toBeNull();
    expect(screen.getByTestId('ft-explanation')).toHaveTextContent('authored formulas');
  });

  it('on the training friction itself the point policy is ahead', () => {
    render(<FrictionTransfer />);
    fireEvent.change(realMuSlider(), { target: { value: '80' } });
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

  it('renders a table-form chart description that names the assumed range and its shaded band', () => {
    const { container } = render(<FrictionTransfer />);
    const desc = container.querySelector('[data-chart-description]');
    expect(desc?.textContent).toMatch(/assumed DR half-width is 0.35/i);
    expect(desc?.textContent).toMatch(/not a confidence interval/i);
    expect(desc?.textContent).toMatch(/shaded band marks an assumed range/i);
    const details = container.querySelector('details[data-chart-data]');
    expect(details).toHaveAttribute('data-chart-form', 'table');
    const rows = details?.querySelectorAll('tbody tr').length ?? 0;
    expect(rows).toBeGreaterThanOrEqual(5);
    expect(rows).toBeLessThanOrEqual(10);
    const before = desc?.textContent ?? '';
    fireEvent.change(realMuSlider(), { target: { value: '50' } });
    expect(container.querySelector('[data-chart-description]')?.textContent).not.toBe(
      before,
    );
  });

  it('does not confuse being inside the assumed training band with the point curve winning', () => {
    render(<FrictionTransfer />);
    fireEvent.change(realMuSlider(), { target: { value: '110' } });
    expect(readout('delta-readout')).toMatch(/DR \+\d+ pts/);
    expect(screen.getByTestId('ft-explanation')).not.toHaveTextContent('point-trained policy wins');
    expect(screen.getByTestId('ft-explanation')).toHaveTextContent('local assumptions');
  });

  it('discloses authored formulas and restores the prediction mount defaults', () => {
    render(<FrictionTransfer defaultRange={0.65} />);
    expect(screen.getByTestId('ft-explanation')).toHaveTextContent('authored');
    expect(readout('dr-readout')).toBe('57%');
    fireEvent.change(realMuSlider(), { target: { value: '20' } });
    fireEvent.change(rangeSlider(), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(readout('real-mu-readout')).toBe('0.80');
    expect(readout('point-readout')).toBe('97%');
    expect(readout('dr-readout')).toBe('57%');
  });

  it('names the width regime so both article mounts describe differently after digit normalisation', () => {
    const descriptionText = (props: { defaultRange?: number }) => {
      const { container, unmount } = render(<FrictionTransfer {...props} />);
      const text = container.querySelector('[data-chart-description]')?.textContent ?? '';
      unmount();
      return text;
    };
    const ordinary = descriptionText({});
    const wide = descriptionText({ defaultRange: 0.65 });
    expect(ordinary).toMatch(/band is marked ordinary at the selected half-width/);
    expect(wide).toMatch(/band is marked wide at the selected half-width/);
    const key = (text: string) => text.toLowerCase().replace(/\d+/g, '#');
    expect(key(ordinary)).not.toBe(key(wide));
  });
});
