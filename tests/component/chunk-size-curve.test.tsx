import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ChunkSizeCurve } from '@/components/interactive/chunk-size-curve';

describe('ChunkSizeCurve', () => {
  it('renders the slider, chart, readouts, and reset control', () => {
    render(<ChunkSizeCurve />);
    const slider = screen.getByRole('slider', { name: /chunk size/i });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-label');
    expect(screen.getByRole('img', { name: /success rate/i })).toBeInTheDocument();
    expect(screen.getByTestId('chunk-success-readout')).toBeInTheDocument();
    expect(screen.getByTestId('chunk-decisions-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('defaults to k=100 and the published 44% anchor', () => {
    render(<ChunkSizeCurve />);
    expect(screen.getByRole('slider', { name: /chunk size/i })).toHaveValue(
      '100',
    );
    expect(screen.getByTestId('chunk-success-readout')).toHaveTextContent(
      '44%',
    );
    expect(
      screen.getByTestId('chunk-decisions-readout'),
    ).toHaveTextContent('4');
  });

  it('updates both readouts when the slider moves', () => {
    render(<ChunkSizeCurve />);
    fireEvent.change(screen.getByRole('slider', { name: /chunk size/i }), {
      target: { value: '1' },
    });
    expect(screen.getByTestId('chunk-success-readout')).toHaveTextContent(
      '1%',
    );
    expect(
      screen.getByTestId('chunk-decisions-readout'),
    ).toHaveTextContent('400');
  });

  it('shows the taper past k=100', () => {
    render(<ChunkSizeCurve />);
    fireEvent.change(screen.getByRole('slider', { name: /chunk size/i }), {
      target: { value: '400' },
    });
    const readout = screen.getByTestId('chunk-success-readout').textContent;
    const value = Number(readout?.replace(/[^0-9.]/g, ''));
    expect(value).toBeGreaterThan(15);
    expect(value).toBeLessThan(44);
  });

  it('marks the interpolated region as not measured', () => {
    render(<ChunkSizeCurve />);
    expect(screen.getByText(/interpolat/i)).toBeInTheDocument();
  });

  it('reset restores the default state', async () => {
    const user = userEvent.setup();
    render(<ChunkSizeCurve />);
    fireEvent.change(screen.getByRole('slider', { name: /chunk size/i }), {
      target: { value: '1' },
    });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByRole('slider', { name: /chunk size/i })).toHaveValue(
      '100',
    );
    expect(screen.getByTestId('chunk-success-readout')).toHaveTextContent(
      '44%',
    );
  });

  it('honors custom defaults', () => {
    render(<ChunkSizeCurve defaultChunkSize={50} />);
    expect(screen.getByRole('slider', { name: /chunk size/i })).toHaveValue(
      '50',
    );
    expect(
      screen.getByTestId('chunk-decisions-readout'),
    ).toHaveTextContent('8');
  });
});
