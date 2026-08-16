import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ReliabilityCompounding } from '@/components/interactive/reliability-compounding';

describe('ReliabilityCompounding', () => {
  it('renders both sliders, the readout, and a reset control', () => {
    render(<ReliabilityCompounding />);
    expect(
      screen.getByRole('slider', { name: /per-step success/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /episode length/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('episode-success-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('anchors the default state to 95% over 30 steps', () => {
    render(<ReliabilityCompounding />);
    // 0.95^30 = 21.46...%
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '21.5%',
    );
  });

  it('updates the readout when the per-step slider moves', () => {
    render(<ReliabilityCompounding />);
    const slider = screen.getByRole('slider', { name: /per-step success/i });
    // 99.0% over 30 steps: 0.99^30 = 74.0%.
    fireEvent.change(slider, { target: { value: '99' } });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '74.0%',
    );
  });

  it('updates the readout when the horizon slider moves', () => {
    render(<ReliabilityCompounding />);
    const slider = screen.getByRole('slider', { name: /episode length/i });
    // 95% over 10 steps: 0.95^10 = 59.9%.
    fireEvent.change(slider, { target: { value: '10' } });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '59.9%',
    );
  });

  it('reset restores the default state', async () => {
    const user = userEvent.setup();
    render(<ReliabilityCompounding />);
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '10' },
    });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '21.5%',
    );
    expect(screen.getByRole('slider', { name: /episode length/i })).toHaveValue(
      '30',
    );
  });

  it('honors custom defaults', () => {
    render(<ReliabilityCompounding defaultPerStep={0.99} defaultSteps={30} />);
    // 0.99^30 = 73.97...%
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '74.0%',
    );
  });
});

describe('ReliabilityCompounding with full-range bounds', () => {
  function renderFullRange() {
    return render(
      <ReliabilityCompounding minPerStepPercent={0} maxPerStepPercent={100} />,
    );
  }

  it('exposes the boundary-capable 0-100 slider range', () => {
    renderFullRange();
    const perStep = screen.getByRole('slider', { name: /per-step success/i });
    expect(perStep).toHaveAttribute('min', '0');
    expect(perStep).toHaveAttribute('max', '100');
  });

  it('anchors 95% over 30 steps to about 21%', () => {
    renderFullRange();
    // 0.95^30 = 21.46...%
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '21.5%',
    );
  });

  it('moves the readout monotonically with the per-step slider', () => {
    renderFullRange();
    const slider = screen.getByRole('slider', { name: /per-step success/i });
    const readout = screen.getByTestId('episode-success-readout');
    fireEvent.change(slider, { target: { value: '99' } });
    expect(readout).toHaveTextContent('74.0%');
    fireEvent.change(slider, { target: { value: '90' } });
    // 0.9^30 = 4.24...%
    expect(readout).toHaveTextContent('4.2%');
    fireEvent.change(slider, { target: { value: '95' } });
    expect(readout).toHaveTextContent('21.5%');
  });

  it('tracks the horizon control: 95% over 60 steps reads about 4.6%', () => {
    renderFullRange();
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '60' },
    });
    // 0.95^60 = 4.61...%
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '4.6%',
    );
  });

  it('reads 0.0% at per-step 0% for every horizon', () => {
    renderFullRange();
    fireEvent.change(
      screen.getByRole('slider', { name: /per-step success/i }),
      {
        target: { value: '0' },
      },
    );
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '0.0%',
    );
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '100' },
    });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '0.0%',
    );
  });

  it('reads 100.0% at per-step 100% for every horizon', () => {
    renderFullRange();
    fireEvent.change(
      screen.getByRole('slider', { name: /per-step success/i }),
      {
        target: { value: '100' },
      },
    );
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '100.0%',
    );
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '1' },
    });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '100.0%',
    );
  });

  it('reads the per-step value itself at N=1', () => {
    renderFullRange();
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '1' },
    });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '95.0%',
    );
    fireEvent.change(
      screen.getByRole('slider', { name: /per-step success/i }),
      {
        target: { value: '73.4' },
      },
    );
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '73.4%',
    );
  });

  it('never renders NaN or an out-of-range readout at control extremes', () => {
    renderFullRange();
    const readout = screen.getByTestId('episode-success-readout');
    const perStep = screen.getByRole('slider', { name: /per-step success/i });
    const horizon = screen.getByRole('slider', { name: /episode length/i });
    const extremes: Array<[string, string]> = [
      ['0', '1'],
      ['0', '100'],
      ['100', '1'],
      ['100', '100'],
      ['50', '1'],
      ['0.1', '100'],
    ];
    for (const [p, n] of extremes) {
      fireEvent.change(perStep, { target: { value: p } });
      fireEvent.change(horizon, { target: { value: n } });
      const text = readout.textContent ?? '';
      expect(text).not.toContain('NaN');
      const value = Number.parseFloat(text);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('reset restores the anchor state after boundary exploration', async () => {
    const user = userEvent.setup();
    renderFullRange();
    fireEvent.change(
      screen.getByRole('slider', { name: /per-step success/i }),
      {
        target: { value: '0' },
      },
    );
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '100' },
    });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '21.5%',
    );
    expect(
      screen.getByRole('slider', { name: /per-step success/i }),
    ).toHaveValue('95');
    expect(screen.getByRole('slider', { name: /episode length/i })).toHaveValue(
      '30',
    );
  });
});
