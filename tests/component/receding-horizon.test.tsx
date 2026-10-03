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
      screen.getByRole('button', { name: /diffusion policy: rethink every 0.8 seconds/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /never rethink/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('defaults to the published Diffusion Policy configuration T_p=16, T_a=8', () => {
    render(<RecedingHorizon />);
    expect(predictedSlider()).toHaveValue('16');
    expect(executedSlider()).toHaveValue('8');
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '1.25 times a second',
    );
    expect(screen.getByTestId('rh-commit-readout')).toHaveTextContent('0.8 s');
  });

  it('lowering T_a raises the replan rate and shortens the commitment', () => {
    render(<RecedingHorizon />);
    fireEvent.change(executedSlider(), { target: { value: '4' } });
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '2.5 times a second',
    );
    expect(screen.getByTestId('rh-commit-readout')).toHaveTextContent('0.4 s');
  });

  it('raising T_a toward T_p drops reactivity toward open-loop execution', () => {
    render(<RecedingHorizon />);
    fireEvent.change(executedSlider(), { target: { value: '16' } });
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '0.63 times a second',
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

  it('draws every dashed tail whole, including the last plan', () => {
    const { container } = render(<RecedingHorizon />);
    const svg = container.querySelector('svg[role="img"]')!;
    const right = Number(svg.getAttribute('viewBox')!.split(' ')[2]);
    const tails = screen.getAllByTestId('rh-predicted');
    expect(tails).toHaveLength(4);
    const widths = tails.map((t) => Number(t.getAttribute('width')));
    // Every tail spans the same eight steps, so none is cut at the edge.
    for (const w of widths) expect(w).toBeCloseTo(widths[0], 1);
    const last = tails[3];
    expect(Number(last.getAttribute('x')) + Number(last.getAttribute('width'))).toBeLessThanOrEqual(right);
    expect(screen.getByText('Thrown away: the robot replans')).toBeInTheDocument();
    expect(screen.getByText('3.2')).toBeInTheDocument();
    expect(screen.getByText('seconds')).toBeInTheDocument();
  });

  it('the presets load named configurations', async () => {
    const user = userEvent.setup();
    render(<RecedingHorizon />);
    await user.click(screen.getByRole('button', { name: /never rethink/i }));
    expect(predictedSlider()).toHaveValue('32');
    expect(executedSlider()).toHaveValue('32');
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '0.31 times a second',
    );
    await user.click(
      screen.getByRole('button', { name: /diffusion policy: rethink every 0.8 seconds/i }),
    );
    expect(predictedSlider()).toHaveValue('16');
    expect(executedSlider()).toHaveValue('8');
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '1.25 times a second',
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
      '1.25 times a second',
    );
  });
});

  it('derives the discarded-tail clause from the T_a to T_p gap', () => {
    const { container } = render(<RecedingHorizon />);
    const read = () =>
      container.querySelector('[data-chart-description]')?.textContent ?? '';
    // Default 16/8: every chunk carries an 8-step outlined tail.
    expect(read()).toMatch(/thrown away/);
    expect(read()).toMatch(/8-step tails/);
    // State 1: T_a raised to T_p; every tail is zero steps wide, so no
    // outlined tail exists to throw away and the clause must say so.
    fireEvent.change(executedSlider(), { target: { value: '16' } });
    expect(screen.queryAllByTestId('rh-predicted')).toHaveLength(0);
    expect(read()).not.toMatch(/thrown away/);
    expect(read()).toMatch(/open-loop/);
    // State 2: back below T_p, the discarded tails return.
    fireEvent.change(executedSlider(), { target: { value: '8' } });
    expect(read()).toMatch(/8-step tails/);
    expect(read()).toMatch(/thrown away/);
  });
