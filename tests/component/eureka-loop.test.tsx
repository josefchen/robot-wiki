import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EurekaLoop } from '@/components/interactive/eureka-loop';
import { EUREKA_GENERATIONS } from '@/lib/eureka';
import { CARD_RULES } from '@/components/iso/figures/reward-writing-loop';

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

  it('draws the loop as a bench with no words: each round\'s card, its run on the ribbon and its robot', async () => {
    // Reduced motion: each round is drawn at its end at once, so the drawing can be read straight after a click.
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'), media: query, onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      const user = userEvent.setup();
      const { container } = render(<EurekaLoop />);
      const stage = screen.getByTestId('eureka-stage');
      const notches = () => ((stage.querySelector('[data-part="card"] .iso-edge')?.getAttribute('d') ?? '').match(/L/g) ?? []).length + 1;
      const strokes = () => ((stage.querySelector('[data-part="ink"]')?.getAttribute('d') ?? '').match(/M/g) ?? []).length;
      const hatch = () => stage.querySelector('[data-part="robot-body"] > path')?.getAttribute('d') ?? '';
      for (let round = 0; round < EUREKA_GENERATIONS.length; round++) {
        if (round > 0) await user.click(nextButton());
        // No words in the drawing, and one lit part: the card with the round's rules.
        expect(stage.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
        expect(stage.textContent).toBe('');
        const lit = stage.querySelectorAll('[data-lit]');
        expect(lit).toHaveLength(1);
        expect(lit[0]!.closest('[data-part="card"]')).not.toBeNull();
        // The card's outline: four corners, then four points for each notch, one notch for each rule in the code.
        expect(notches()).toBe(4 + 4 * CARD_RULES[round]!.length);
        // The ribbon holds one run of ink for each round so far.
        expect(strokes()).toBe(round + 1);
        expect(outcome(container)).toBe(['falls', 'stands', 'walks'][round]);
        expect(stage.getAttribute('aria-label')).toContain(`Round ${round + 1} of 3`);
        // On its back after the fall, its back turned away: no hatch; standing and trotting, the hatch shows.
        if (round === 0) expect(hatch()).toBe('');
        else expect(hatch()).not.toBe('');
      }
    } finally {
      window.matchMedia = matchMedia;
    }
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
    // Unavailable at the last round but still focusable, so the last press keeps keyboard focus.
    expect(nextButton()).toHaveAttribute('aria-disabled', 'true');
    expect(nextButton()).toHaveFocus();
    const last = screen.getByTestId('generation-readout').textContent;
    await user.click(nextButton());
    expect(screen.getByTestId('generation-readout').textContent).toBe(last);
    expect(outcome(container)).toBe('walks');
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
