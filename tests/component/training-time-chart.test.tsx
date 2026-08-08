import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TrainingTimeChart } from '@/components/interactive/training-time-chart';

function slider() {
  return screen.getByRole('slider', { name: /parallel environments/i });
}

function toggle() {
  return screen.getByRole('button', { name: /cpu single-core bottleneck/i });
}

function wallClock() {
  return screen.getByTestId('wallclock-readout').textContent ?? '';
}

function cpuShare() {
  const raw = screen.getByTestId('share-cpu').textContent ?? '0';
  return Number(raw.replace(/[^0-9.]/g, ''));
}

describe('TrainingTimeChart', () => {
  it('renders slider, readouts, breakdown, Rudin markers, toggle, and reset', () => {
    render(<TrainingTimeChart />);
    expect(slider()).toBeInTheDocument();
    expect(screen.getByTestId('envs-readout')).toHaveTextContent('4,096');
    expect(screen.getByTestId('wallclock-readout')).toBeInTheDocument();
    expect(screen.getByTestId('fps-readout')).toBeInTheDocument();
    expect(screen.getByTestId('iter-readout')).toBeInTheDocument();
    expect(screen.getByTestId('breakdown-sim')).toBeInTheDocument();
    expect(screen.getByTestId('breakdown-learn')).toBeInTheDocument();
    expect(screen.getByTestId('breakdown-cpu')).toBeInTheDocument();
    expect(screen.getByTestId('rudin-marker-flat')).toBeInTheDocument();
    expect(screen.getByTestId('rudin-marker-uneven')).toBeInTheDocument();
    expect(screen.getByText(/flat terrain/)).toBeInTheDocument();
    expect(screen.getByText(/uneven terrain/)).toBeInTheDocument();
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('defaults to 4,096 envs at roughly four minutes', () => {
    render(<TrainingTimeChart />);
    expect(wallClock()).toBe('4.0 min');
  });

  it('slider drives wall-clock from hours down to minutes', () => {
    render(<TrainingTimeChart />);
    fireEvent.change(slider(), { target: { value: '6' } });
    expect(screen.getByTestId('envs-readout')).toHaveTextContent('64');
    expect(wallClock()).toMatch(/h$/);
    fireEvent.change(slider(), { target: { value: '10' } });
    const mid = wallClock();
    expect(mid).toMatch(/min$/);
    fireEvent.change(slider(), { target: { value: '14' } });
    expect(screen.getByTestId('envs-readout')).toHaveTextContent('16,384');
    expect(wallClock()).toMatch(/min$/);
    expect(wallClock()).not.toBe(mid);
  });

  it('breakdown recomposes: CPU and transfer share falls as env count rises', () => {
    render(<TrainingTimeChart />);
    fireEvent.change(slider(), { target: { value: '6' } });
    const lowShare = cpuShare();
    fireEvent.change(slider(), { target: { value: '14' } });
    expect(cpuShare()).toBeLessThan(lowShare);
  });

  it('CPU toggle changes the readout, shows a reference curve, and explains the finding', async () => {
    const user = userEvent.setup();
    render(<TrainingTimeChart />);
    fireEvent.change(slider(), { target: { value: '14' } });
    const before = wallClock();
    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(wallClock()).not.toBe(before);
    expect(screen.getByTestId('cpu-explanation')).toHaveTextContent(/5090/);
    expect(screen.getByTestId('reference-curve')).toBeInTheDocument();
  });

  it('CPU toggle makes the high-end CPU share dominant', async () => {
    const user = userEvent.setup();
    render(<TrainingTimeChart />);
    fireEvent.change(slider(), { target: { value: '14' } });
    const normalShare = cpuShare();
    await user.click(toggle());
    expect(cpuShare()).toBeGreaterThan(normalShare);
    expect(cpuShare()).toBeGreaterThan(50);
  });

  it('reset restores default envs and clears the toggle', async () => {
    const user = userEvent.setup();
    render(<TrainingTimeChart />);
    fireEvent.change(slider(), { target: { value: '8' } });
    await user.click(toggle());
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('envs-readout')).toHaveTextContent('4,096');
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(wallClock()).toBe('4.0 min');
  });
});
