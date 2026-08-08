import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FlowMatchingTrajectory } from '@/components/interactive/flow-matching-trajectory';
import { MAX_STEPS, MIN_STEPS } from '@/lib/flow-matching';

function slider() {
  return screen.getByRole('slider', { name: /integration steps/i });
}

function stepReadout() {
  return screen.getByTestId('fm-step-readout');
}

function dispersionReadout() {
  return screen.getByTestId('fm-dispersion-readout');
}

function dispersion() {
  return Number.parseFloat(dispersionReadout().textContent ?? '');
}

describe('FlowMatchingTrajectory', () => {
  it('renders the slider, step presets, readouts, and reset', () => {
    render(<FlowMatchingTrajectory />);
    expect(slider()).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-label');
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(stepReadout()).toBeInTheDocument();
    expect(dispersionReadout()).toBeInTheDocument();
  });

  it('spans 1 to 50 integration steps', () => {
    render(<FlowMatchingTrajectory />);
    expect(slider()).toHaveAttribute('min', String(MIN_STEPS));
    expect(slider()).toHaveAttribute('max', String(MAX_STEPS));
  });

  it('shows the vector field and the noise-to-action transport', () => {
    render(<FlowMatchingTrajectory />);
    expect(
      screen.getByRole('img', { name: /vector field/i }),
    ).toBeInTheDocument();
  });

  it('defaults to the pi0 configuration of 10 steps', () => {
    render(<FlowMatchingTrajectory />);
    expect(slider()).toHaveValue('10');
    expect(stepReadout()).toHaveTextContent('10');
  });

  it('tracks the slider in the step readout and updates the dispersion', () => {
    render(<FlowMatchingTrajectory />);
    const atDefault = dispersion();
    fireEvent.change(slider(), { target: { value: '1' } });
    expect(stepReadout()).toHaveTextContent(/\b1\b/);
    const atOne = dispersion();
    expect(atOne).toBeGreaterThan(atDefault);
    fireEvent.change(slider(), { target: { value: '50' } });
    expect(dispersion()).toBeLessThan(atDefault);
  });

  it('endpoint dispersion at 1 step is observably larger than at 5 steps', () => {
    render(<FlowMatchingTrajectory defaultSteps={1} />);
    const low = dispersion();
    fireEvent.change(slider(), { target: { value: '5' } });
    expect(dispersion()).toBeLessThan(low / 2);
  });

  it('step presets set the slider to the real configurations', async () => {
    const user = userEvent.setup();
    render(<FlowMatchingTrajectory />);
    await user.click(screen.getByRole('button', { name: /5 steps/i }));
    expect(slider()).toHaveValue('5');
    await user.click(screen.getByRole('button', { name: /50 steps/i }));
    expect(slider()).toHaveValue('50');
    await user.click(screen.getByRole('button', { name: /10 steps/i }));
    expect(slider()).toHaveValue('10');
  });

  it('marks the active preset with aria-pressed', async () => {
    const user = userEvent.setup();
    render(<FlowMatchingTrajectory defaultSteps={5} />);
    const preset = screen.getByRole('button', { name: /5 steps/i });
    expect(preset).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /10 steps/i }));
    expect(preset).toHaveAttribute('aria-pressed', 'false');
  });

  it('reset restores the default step count', async () => {
    const user = userEvent.setup();
    render(<FlowMatchingTrajectory />);
    fireEvent.change(slider(), { target: { value: '37' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('10');
  });

  it('labels the visualization as an illustrative model', () => {
    render(<FlowMatchingTrajectory />);
    expect(screen.getByText(/illustrative/i)).toBeInTheDocument();
  });
});
