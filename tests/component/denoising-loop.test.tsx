import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DenoisingLoop } from '@/components/interactive/denoising-loop';

function slider() {
  return screen.getByRole('slider', { name: /denoising step/i });
}

function stepReadout() {
  return screen.getByTestId('denoise-step-readout');
}

function dispersionReadout() {
  return screen.getByTestId('denoise-dispersion-readout');
}

describe('DenoisingLoop', () => {
  it('renders the step slider, step buttons, readouts, and reset', () => {
    render(<DenoisingLoop />);
    expect(slider()).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-label');
    expect(
      screen.getByRole('button', { name: /step forward/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /step back/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /action space/i }),
    ).toBeInTheDocument();
    expect(stepReadout()).toBeInTheDocument();
    expect(dispersionReadout()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('defaults to step 0: pure Gaussian noise, maximum dispersion', () => {
    render(<DenoisingLoop />);
    expect(slider()).toHaveValue('0');
    expect(stepReadout()).toHaveTextContent('step 0 of 10');
    expect(stepReadout()).toHaveTextContent(/noise/i);
  });

  it('spans the full DDIM schedule (0 to 10 steps)', () => {
    render(<DenoisingLoop />);
    expect(slider()).toHaveAttribute('min', '0');
    expect(slider()).toHaveAttribute('max', '10');
  });

  it('converges the sample cloud as steps advance', () => {
    render(<DenoisingLoop />);
    const initial = Number(
      dispersionReadout().textContent?.replace(/[^0-9.]/g, ''),
    );
    fireEvent.change(slider(), { target: { value: '10' } });
    expect(stepReadout()).toHaveTextContent('step 10 of 10');
    const final = Number(
      dispersionReadout().textContent?.replace(/[^0-9.]/g, ''),
    );
    expect(final).toBeLessThan(initial / 2);
  });

  it('shows progressive convergence at intermediate steps', () => {
    render(<DenoisingLoop />);
    const at = (v: string) => {
      fireEvent.change(slider(), { target: { value: v } });
      return Number(
        dispersionReadout().textContent?.replace(/[^0-9.]/g, ''),
      );
    };
    const d0 = at('0');
    const d5 = at('5');
    const d10 = at('10');
    expect(d5).toBeLessThan(d0);
    expect(d10).toBeLessThan(d5);
  });

  it('step buttons move one step at a time', async () => {
    const user = userEvent.setup();
    render(<DenoisingLoop />);
    await user.click(screen.getByRole('button', { name: /step forward/i }));
    expect(stepReadout()).toHaveTextContent('step 1 of 10');
    await user.click(screen.getByRole('button', { name: /step forward/i }));
    expect(stepReadout()).toHaveTextContent('step 2 of 10');
    await user.click(screen.getByRole('button', { name: /step back/i }));
    expect(stepReadout()).toHaveTextContent('step 1 of 10');
  });

  it('step buttons clamp at the schedule endpoints', () => {
    render(<DenoisingLoop />);
    expect(
      screen.getByRole('button', { name: /step back/i }),
    ).toBeDisabled();
    fireEvent.change(slider(), { target: { value: '10' } });
    expect(
      screen.getByRole('button', { name: /step forward/i }),
    ).toBeDisabled();
  });

  it('marks the cloud as converged on the modes at the final step', () => {
    render(<DenoisingLoop />);
    fireEvent.change(slider(), { target: { value: '10' } });
    expect(stepReadout()).toHaveTextContent(/converged/i);
  });

  it('reset returns to step 0', async () => {
    const user = userEvent.setup();
    render(<DenoisingLoop />);
    fireEvent.change(slider(), { target: { value: '7' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('0');
    expect(stepReadout()).toHaveTextContent('step 0 of 10');
  });

  it('labels the visualization as an illustrative model', () => {
    render(<DenoisingLoop />);
    expect(screen.getByText(/illustrative/i)).toBeInTheDocument();
  });
});
