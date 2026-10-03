import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MotInsulation } from '@/components/interactive/mot-insulation';
import {
  LANGUAGE_SCORE_MAX,
  LANGUAGE_SCORE_MIN,
  LAYER_COUNT,
} from '@/lib/knowledge-insulation';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('MotInsulation');

function passButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

function stopGradientToggle() {
  return screen.getByRole('button', { name: /protect language skills/i });
}

describe('MotInsulation', () => {
  it('renders the pass controls, stop-gradient toggle, layer slider, readouts, and reset', () => {
    render(<MotInsulation />);
    expect(passButton(/forward pass/i)).toBeInTheDocument();
    expect(passButton(/backward pass/i)).toBeInTheDocument();
    expect(stopGradientToggle()).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('language-score')).toBeInTheDocument();
    expect(screen.getByTestId('speedup-readout')).toHaveTextContent('7.5');
    expect(screen.getByTestId('mot-diagram')).toBeInTheDocument();
  });

  it('starts on the insulated backward pass at full depth, with the wall and its note in view', () => {
    const { container } = render(<MotInsulation />);
    expect(passButton(/backward pass/i)).toHaveAttribute('aria-pressed', 'true');
    expect(stopGradientToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(stopGradientToggle()).toHaveTextContent('Protect language skills: On');
    expect(screen.getByTestId('gradient-barrier')).toBeInTheDocument();
    expect(screen.getByTestId('language-score')).toHaveTextContent(
      String(LANGUAGE_SCORE_MAX),
    );
    expect(screen.getByTestId('step-readout')).toHaveTextContent(
      `${LAYER_COUNT} / ${LAYER_COUNT}`,
    );
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Shield the language brain while teaching the robot to move',
    );
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Knowledge insulation');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'training needed 7.5 times fewer steps than π0',
    );
    const notes = container.querySelectorAll('[data-figure-annotation]');
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toBe(
      "Movement lessons stop here, so theycan't overwrite what the model knows",
    );
    const diagram = screen.getByTestId('mot-diagram');
    expect(diagram).toHaveTextContent('Understands words');
    expect(diagram).toHaveTextContent('Moves the arm');
    // The score is labelled illustrative where it is shown.
    expect(screen.getByTestId('language-score').closest('.basis-full')).toHaveTextContent(
      /illustrative, not measured/,
    );
  });

  it('keeps the depth slider, pass buttons and Reset in Adjust more; method holds the measured result', () => {
    const { container } = render(<MotInsulation />);
    const adjust = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(adjust).toContainElement(screen.getByRole('slider'));
    expect(adjust).toContainElement(passButton(/forward pass/i));
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
    expect(adjust).not.toContainElement(stopGradientToggle());
    const method = container.querySelector('details[data-figure-fold="method"]')!;
    expect(method).toContainElement(screen.getByTestId('speedup-readout'));
    expect(method).toHaveTextContent('2B language-model backbone and a 300M flow-matching action expert');
    expect(method).toHaveTextContent('FAST action tokens');
  });

  it('forward pass shows sideways attention arrows into the expert', () => {
    render(<MotInsulation />);
    fireEvent.click(passButton(/forward pass/i));
    expect(
      screen.getByTestId(`attention-${LAYER_COUNT - 1}`),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('gradient-barrier')).not.toBeInTheDocument();
  });

  it('backward pass with insulation shows the barrier and the FAST cross-entropy supervision', () => {
    render(<MotInsulation />);
    fireEvent.click(passButton(/forward pass/i));
    fireEvent.click(passButton(/backward pass/i));
    expect(passButton(/backward pass/i)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('gradient-barrier')).toBeInTheDocument();
    expect(screen.getByTestId('fast-loss-label')).toBeInTheDocument();
    expect(screen.getByTestId('language-score')).toHaveTextContent(
      String(LANGUAGE_SCORE_MAX),
    );
    expect(screen.queryByTestId(/gradient-cross-/)).not.toBeInTheDocument();
  });

  it('toggling the stop-gradient off switches to the backward view with crossing gradients and a dropping meter', () => {
    render(<MotInsulation />);
    fireEvent.click(stopGradientToggle());
    expect(stopGradientToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(passButton(/backward pass/i)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('gradient-barrier')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fast-loss-label')).not.toBeInTheDocument();
    expect(screen.getByTestId('gradient-cross-0')).toBeInTheDocument();
    // At full depth the uninsulated gradient has corrupted the whole stack.
    expect(screen.getByTestId('language-score')).toHaveTextContent(
      String(LANGUAGE_SCORE_MIN),
    );
  });

  it('meter falls as the uninsulated backward pass steps deeper', () => {
    render(<MotInsulation />);
    fireEvent.click(stopGradientToggle());
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '2' } });
    const shallow = Number(
      screen.getByTestId('language-score').textContent,
    );
    fireEvent.change(slider, { target: { value: String(LAYER_COUNT) } });
    const deep = Number(screen.getByTestId('language-score').textContent);
    expect(deep).toBeLessThan(shallow);
    expect(shallow).toBeLessThan(LANGUAGE_SCORE_MAX);
  });

  it('reset restores the insulated backward pass at full depth', async () => {
    const user = userEvent.setup();
    render(<MotInsulation />);
    fireEvent.click(stopGradientToggle());
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(passButton(/backward pass/i)).toHaveAttribute('aria-pressed', 'true');
    expect(stopGradientToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('language-score')).toHaveTextContent(
      String(LANGUAGE_SCORE_MAX),
    );
    expect(screen.getByTestId('step-readout')).toHaveTextContent(
      `${LAYER_COUNT} / ${LAYER_COUNT}`,
    );
  });
});
