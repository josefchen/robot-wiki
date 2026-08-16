import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MotInsulation } from '@/components/interactive/mot-insulation';
import {
  LANGUAGE_SCORE_MAX,
  LANGUAGE_SCORE_MIN,
  LAYER_COUNT,
} from '@/lib/knowledge-insulation';

function passButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

function stopGradientToggle() {
  return screen.getByRole('button', { name: /stop gradient/i });
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

  it('starts on the insulated forward pass at full depth with the meter at its peak', () => {
    render(<MotInsulation />);
    expect(passButton(/forward pass/i)).toHaveAttribute('aria-pressed', 'true');
    expect(stopGradientToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('language-score')).toHaveTextContent(
      String(LANGUAGE_SCORE_MAX),
    );
    expect(screen.getByTestId('step-readout')).toHaveTextContent(
      `${LAYER_COUNT} / ${LAYER_COUNT}`,
    );
  });

  it('forward pass shows sideways attention arrows into the expert', () => {
    render(<MotInsulation />);
    expect(
      screen.getByTestId(`attention-${LAYER_COUNT - 1}`),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('gradient-barrier')).not.toBeInTheDocument();
  });

  it('backward pass with insulation shows the barrier and the FAST cross-entropy supervision', () => {
    render(<MotInsulation />);
    fireEvent.click(passButton(/backward pass/i));
    expect(passButton(/backward pass/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
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
    expect(passButton(/backward pass/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
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
    const shallow = Number(screen.getByTestId('language-score').textContent);
    fireEvent.change(slider, { target: { value: String(LAYER_COUNT) } });
    const deep = Number(screen.getByTestId('language-score').textContent);
    expect(deep).toBeLessThan(shallow);
    expect(shallow).toBeLessThan(LANGUAGE_SCORE_MAX);
  });

  it('reset restores the insulated forward pass at full depth', async () => {
    const user = userEvent.setup();
    render(<MotInsulation />);
    fireEvent.click(stopGradientToggle());
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(passButton(/forward pass/i)).toHaveAttribute('aria-pressed', 'true');
    expect(stopGradientToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('language-score')).toHaveTextContent(
      String(LANGUAGE_SCORE_MAX),
    );
    expect(screen.getByTestId('step-readout')).toHaveTextContent(
      `${LAYER_COUNT} / ${LAYER_COUNT}`,
    );
  });
});
