import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EurekaLoop } from '@/components/interactive/eureka-loop';
import { EUREKA_GENERATIONS } from '@/lib/eureka';

const runButton = () =>
  screen.getByRole('button', { name: /run next generation/i });

describe('EurekaLoop', () => {
  it('opens on generation 0 with proposed code, statistics, and a reflection', () => {
    render(<EurekaLoop />);
    expect(screen.getByTestId('generation-readout').textContent).toContain(
      'Generation 0',
    );
    expect(screen.getByTestId('eureka-code')).toBeInTheDocument();
    expect(screen.getByTestId('eureka-stats')).toBeInTheDocument();
    expect(screen.getByTestId('eureka-reflection')).toBeInTheDocument();
    expect(screen.getByTestId('fitness-readout')).toBeInTheDocument();
    expect(screen.queryByTestId('eureka-diff')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('running a generation shows a code diff with added and removed lines', async () => {
    const user = userEvent.setup();
    render(<EurekaLoop />);
    await user.click(runButton());
    expect(screen.getByTestId('generation-readout').textContent).toContain(
      'Generation 1',
    );
    const diff = screen.getByTestId('eureka-diff');
    expect(diff.querySelectorAll('[data-diff="add"]').length).toBeGreaterThan(
      0,
    );
    expect(
      diff.querySelectorAll('[data-diff="del"]').length +
        diff.querySelectorAll('[data-diff="same"]').length,
    ).toBeGreaterThan(0);
    // Reflection stays explicit at every generation.
    expect(screen.getByTestId('eureka-reflection').textContent).toBe(
      EUREKA_GENERATIONS[1].reflection,
    );
  });

  it('runs the full scripted loop and disables the run control at the end', async () => {
    const user = userEvent.setup();
    render(<EurekaLoop />);
    for (let i = 1; i < EUREKA_GENERATIONS.length; i += 1) {
      await user.click(runButton());
      expect(screen.getByTestId('generation-readout').textContent).toContain(
        `Generation ${i}`,
      );
    }
    expect(runButton()).toBeDisabled();
  });

  it('fitness readout tracks the current generation', async () => {
    const user = userEvent.setup();
    render(<EurekaLoop />);
    expect(screen.getByTestId('fitness-readout').textContent).toContain(
      EUREKA_GENERATIONS[0].fitness.toFixed(2),
    );
    await user.click(runButton());
    expect(screen.getByTestId('fitness-readout').textContent).toContain(
      EUREKA_GENERATIONS[1].fitness.toFixed(2),
    );
  });

  it('reset returns to generation 0', async () => {
    const user = userEvent.setup();
    render(<EurekaLoop />);
    await user.click(runButton());
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('generation-readout').textContent).toContain(
      'Generation 0',
    );
    expect(screen.queryByTestId('eureka-diff')).not.toBeInTheDocument();
  });
});
