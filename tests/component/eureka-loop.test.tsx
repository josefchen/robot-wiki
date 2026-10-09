import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EurekaLoop } from '@/components/interactive/eureka-loop';
import { EUREKA_GENERATIONS } from '@/lib/eureka';

const nextButton = () => screen.getByRole('button', { name: /next round/i });
const outcome = (container: HTMLElement) =>
  container.querySelector('[data-outcome]')?.getAttribute('data-outcome');

describe('EurekaLoop', () => {
  it('opens on round 1 with the robot, the plain-words round and the method behind it', () => {
    const { container } = render(<EurekaLoop />);
    expect(screen.getByTestId('round-readout').textContent).toBe('Round 1 of 3');
    expect(outcome(container)).toBe('falls');
    expect(screen.getByTestId('eureka-rules').textContent).toBe('Points for speed, and nothing else.');
    expect(screen.getByTestId('eureka-results').textContent).toContain('2.8 metres a second');
    expect(screen.getByTestId('generation-readout').textContent).toContain('Generation 0');
    expect(screen.getByTestId('eureka-code')).toBeInTheDocument();
    expect(screen.getByTestId('eureka-stats')).toBeInTheDocument();
    expect(screen.getByTestId('eureka-reflection')).toBeInTheDocument();
    expect(screen.getByTestId('fitness-readout')).toBeInTheDocument();
    expect(screen.queryByTestId('eureka-diff')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('draws all three rounds at once, this round at full ink and the first robot fallen on its back', async () => {
    const user = userEvent.setup();
    const { container } = render(<EurekaLoop />);
    const rounds = [...container.querySelectorAll('[data-round]')].map((round) => round.textContent);
    expect(rounds).toEqual(['Round 1falls', 'Round 2never walks', 'Round 3walks']);
    expect(screen.getByTestId('eureka-robot').getAttribute('transform')).toMatch(/scale\(1 -1\)/);
    expect(container.querySelector('[data-figure-annotation]')?.textContent).toMatch(/runs too fast and falls/);
    // The arrow drops straight down between the raised feet onto the fallen robot's belly,
    // in the first column, above the ground line at 130.
    const [tipX, tipY] = (container.querySelector('[data-annotation-pointer] polygon')?.getAttribute('points') ?? '')
      .split(' ')[0]
      .split(',')
      .map(Number);
    expect(Math.abs(tipX - 56)).toBeLessThan(3);
    expect(tipY).toBeGreaterThan(84);
    expect(tipY).toBeLessThan(110);
    // No rings at the hips or knees: the bend in each leg shows the knee, and the eye is the only circle.
    expect(screen.getByTestId('eureka-robot').querySelectorAll('[data-dog-foot]')).toHaveLength(4);
    expect(screen.getByTestId('eureka-robot').querySelectorAll('circle')).toHaveLength(1);
    await user.click(nextButton());
    expect(container.querySelector('[data-round="2"]')).toHaveAttribute('data-outcome', 'stands');
    expect(container.querySelector('[data-round="1"]')).not.toHaveAttribute('data-outcome');
    expect(container.querySelector('[data-figure-annotation]')?.textContent).toMatch(/stands still/);
  });

  it('the next round shows a code diff with added and removed lines', async () => {
    const user = userEvent.setup();
    const { container } = render(<EurekaLoop />);
    await user.click(nextButton());
    expect(screen.getByTestId('round-readout').textContent).toBe('Round 2 of 3');
    expect(outcome(container)).toBe('stands');
    expect(screen.getByTestId('generation-readout').textContent).toContain('Generation 1');
    const diff = screen.getByTestId('eureka-diff');
    expect(diff.querySelectorAll('[data-diff="add"]').length).toBeGreaterThan(0);
    expect(
      diff.querySelectorAll('[data-diff="del"]').length + diff.querySelectorAll('[data-diff="same"]').length,
    ).toBeGreaterThan(0);
    // Reflection stays explicit at every generation.
    expect(screen.getByTestId('eureka-reflection').textContent).toBe(EUREKA_GENERATIONS[1].reflection);
  });

  it('runs the full scripted loop and disables the next-round control at the end', async () => {
    const user = userEvent.setup();
    const { container } = render(<EurekaLoop />);
    for (let i = 1; i < EUREKA_GENERATIONS.length; i += 1) {
      await user.click(nextButton());
      expect(screen.getByTestId('generation-readout').textContent).toContain(`Generation ${i}`);
    }
    expect(outcome(container)).toBe('walks');
    // The time at the target speed sits with the statistics in "How this was made".
    expect(screen.getByTestId('eureka-results').textContent).not.toContain('target speed');
    expect(screen.getByTestId('eureka-stats').textContent).toContain('time at target speed81%');
    expect(nextButton()).toBeDisabled();
  });

  it('fitness readout tracks the current generation', async () => {
    const user = userEvent.setup();
    render(<EurekaLoop />);
    expect(screen.getByTestId('fitness-readout').textContent).toContain(EUREKA_GENERATIONS[0].fitness.toFixed(2));
    await user.click(nextButton());
    expect(screen.getByTestId('fitness-readout').textContent).toContain(EUREKA_GENERATIONS[1].fitness.toFixed(2));
  });

  it('reset returns to round 1', async () => {
    const user = userEvent.setup();
    const { container } = render(<EurekaLoop />);
    await user.click(nextButton());
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('round-readout').textContent).toBe('Round 1 of 3');
    expect(screen.getByTestId('generation-readout').textContent).toContain('Generation 0');
    expect(outcome(container)).toBe('falls');
    expect(screen.queryByTestId('eureka-diff')).not.toBeInTheDocument();
  });
});
