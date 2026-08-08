import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RecedingHorizon } from '@/components/interactive/receding-horizon';

function predictedSlider() {
  return screen.getByRole('slider', { name: /predicted horizon/i });
}

function executedSlider() {
  return screen.getByRole('slider', { name: /executed horizon/i });
}

describe('RecedingHorizon', () => {
  it('renders both horizon sliders, the plan lanes, readouts, preset, and reset', () => {
    render(<RecedingHorizon />);
    expect(predictedSlider()).toBeInTheDocument();
    expect(executedSlider()).toBeInTheDocument();
    expect(predictedSlider()).toHaveAttribute('aria-label');
    expect(executedSlider()).toHaveAttribute('aria-label');
    expect(
      screen.getByRole('img', { name: /receding horizon/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('rh-replan-readout')).toBeInTheDocument();
    expect(screen.getByTestId('rh-commit-readout')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /diffusion policy \(16\/8\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open-loop/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('defaults to the published Diffusion Policy configuration T_p=16, T_a=8', () => {
    render(<RecedingHorizon />);
    expect(predictedSlider()).toHaveValue('16');
    expect(executedSlider()).toHaveValue('8');
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '1.25 Hz',
    );
    expect(screen.getByTestId('rh-commit-readout')).toHaveTextContent('0.8 s');
  });

  it('lowering T_a raises the replan rate and shortens the commitment', () => {
    render(<RecedingHorizon />);
    fireEvent.change(executedSlider(), { target: { value: '4' } });
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '2.5 Hz',
    );
    expect(screen.getByTestId('rh-commit-readout')).toHaveTextContent('0.4 s');
  });

  it('raising T_a toward T_p drops reactivity toward open-loop execution', () => {
    render(<RecedingHorizon />);
    fireEvent.change(executedSlider(), { target: { value: '16' } });
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '0.63 Hz',
    );
    expect(screen.getByTestId('rh-commit-readout')).toHaveTextContent('1.6 s');
  });

  it('clamps T_a to T_p when the predicted horizon drops below it', () => {
    render(<RecedingHorizon />);
    fireEvent.change(predictedSlider(), { target: { value: '4' } });
    expect(executedSlider()).toHaveValue('4');
    expect(screen.getByTestId('rh-commit-readout')).toHaveTextContent('0.4 s');
  });

  it('distinguishes committed actions from predicted ones in the plan', () => {
    render(<RecedingHorizon />);
    expect(screen.getAllByTestId('rh-committed').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('rh-predicted').length).toBeGreaterThan(0);
  });

  it('the presets load named configurations', async () => {
    const user = userEvent.setup();
    render(<RecedingHorizon />);
    await user.click(screen.getByRole('button', { name: /open-loop/i }));
    expect(predictedSlider()).toHaveValue('32');
    expect(executedSlider()).toHaveValue('32');
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '0.31 Hz',
    );
    await user.click(
      screen.getByRole('button', { name: /diffusion policy \(16\/8\)/i }),
    );
    expect(predictedSlider()).toHaveValue('16');
    expect(executedSlider()).toHaveValue('8');
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '1.25 Hz',
    );
  });

  it('reset restores the default configuration', async () => {
    const user = userEvent.setup();
    render(<RecedingHorizon />);
    fireEvent.change(executedSlider(), { target: { value: '2' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(predictedSlider()).toHaveValue('16');
    expect(executedSlider()).toHaveValue('8');
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '1.25 Hz',
    );
  });
});
