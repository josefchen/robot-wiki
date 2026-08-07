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
    expect(
      screen.getByRole('button', { name: /reset/i }),
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole('slider', { name: /episode length/i }),
    ).toHaveValue('30');
  });

  it('honors custom defaults', () => {
    render(<ReliabilityCompounding defaultPerStep={0.99} defaultSteps={30} />);
    // 0.99^30 = 73.97...%
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '74.0%',
    );
  });
});
