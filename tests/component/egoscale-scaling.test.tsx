import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EgoScaleScaling } from '@/components/interactive/egoscale-scaling';
import {
  SLIDER_MAX,
  SLIDER_MIN,
  hoursToSlider,
} from '@/lib/egoscale-law';

function slider() {
  return screen.getByRole('slider', { name: /hours of video/i, hidden: true });
}

function setHorizon(hours: number) {
  fireEvent.change(slider(), {
    target: { value: String(hoursToSlider(hours)) },
  });
}

/** The paper's own loss panel and both scenario bands sit behind a toggle in "Adjust more". */
function showLaw() {
  fireEvent.click(screen.getByRole('button', { name: /show the paper.s error measure/i, hidden: true }));
}

describe('EgoScaleScaling', () => {
  it('renders the presets, slider, reset, readouts, and chart, with the band one toggle away', () => {
    const { container } = render(<EgoScaleScaling />);
    expect(screen.getByRole('group', { name: 'How much video?' })).toBeInTheDocument();
    expect(slider()).toBeInTheDocument();
    expect(container.querySelector('[data-figure-fold="adjust"]')).toContainElement(slider());
    expect(screen.getByRole('button', { name: /reset/i, hidden: true })).toBeInTheDocument();
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('100k h');
    expect(screen.queryByTestId('uncertainty-band')).not.toBeInTheDocument();
    showLaw();
    expect(screen.getByTestId('uncertainty-band')).toBeInTheDocument();
    expect(screen.getByTestId('completion-band')).toBeInTheDocument();
    expect(screen.getByTestId('solved-bar')).toBeInTheDocument();
    expect(screen.getByTestId('loss-readout')).toBeInTheDocument();
    expect(screen.getByTestId('completion-readout')).toBeInTheDocument();
    // Five measured scales on each series.
    expect(screen.getAllByTestId(/^loss-point-/).length).toBe(5);
    expect(screen.getAllByTestId(/^completion-point-/).length).toBe(5);
  });

  it('defaults to the 100k horizon with both scenario projections shown', () => {
    render(<EgoScaleScaling />);
    expect(screen.getByTestId('egoscale-preset-five')).toHaveAttribute('aria-pressed', 'true');
    // Law holds: 0.024 - 0.003 * ln(100) = 0.0102; plateau: 0.0150.
    expect(screen.getByTestId('loss-readout')).toHaveTextContent('0.0102');
    expect(screen.getByTestId('loss-readout')).toHaveTextContent('0.0150');
    // Completion fit at 100k: 0.89, still below the 0.90 solved bar.
    expect(screen.getByTestId('completion-fit-readout')).toHaveTextContent('0.89');
    expect(screen.getByTestId('completion-fit-readout')).toHaveTextContent(
      /below the solved bar/i,
    );
    // The stage readout says the same value in plain words.
    expect(screen.getByTestId('completion-readout')).toHaveTextContent('0.89, or 89%');
    expect(screen.getByTestId('completion-readout')).toHaveTextContent(
      /still below the bar for solved/i,
    );
  });

  it('hides the band and dashed extrapolation at the measured-range boundary', () => {
    render(<EgoScaleScaling />);
    showLaw();
    fireEvent.click(screen.getByTestId('egoscale-preset-measured'));
    expect(slider()).toHaveValue(String(SLIDER_MIN));
    expect(screen.queryByTestId('uncertainty-band')).not.toBeInTheDocument();
    expect(screen.queryByTestId('extrapolated-loss-law')).not.toBeInTheDocument();
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('20k h');
    expect(screen.getByTestId('projection-summary')).toHaveTextContent(
      /the most the study measured/i,
    );
    expect(screen.getByTestId('completion-readout')).toHaveTextContent('71% of each task (a score of 0.71)');
  });

  it('projects both scenarios at the 1M-hour maximum and flags the impossible completion', () => {
    render(<EgoScaleScaling />);
    fireEvent.change(slider(), { target: { value: String(SLIDER_MAX) } });
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('1M h');
    // Law holds: 0.024 - 0.003 * ln(1000) = 0.0033; plateau unchanged.
    expect(screen.getByTestId('loss-readout')).toHaveTextContent('0.0033');
    expect(screen.getByTestId('loss-readout')).toHaveTextContent('0.0150');
    // The completion fit exceeds 1.0, which is impossible.
    expect(screen.getByTestId('impossible-note')).toBeInTheDocument();
    expect(screen.getByTestId('projection-summary')).toHaveTextContent(
      /impossible/i,
    );
  });

  it('crosses the solved bar between 100k and 200k hours', () => {
    render(<EgoScaleScaling />);
    expect(screen.getByTestId('completion-fit-readout')).toHaveTextContent(
      /below the solved bar/i,
    );
    setHorizon(200_000);
    expect(screen.getByTestId('completion-fit-readout')).toHaveTextContent('0.97');
    expect(screen.getByTestId('completion-fit-readout')).toHaveTextContent(
      /past the solved bar/i,
    );
    expect(screen.getByTestId('completion-readout')).toHaveTextContent('0.97, or 97%, past the bar for solved');
  });

  it('moves between the three presets and leaves them all unpressed off-preset', () => {
    render(<EgoScaleScaling />);
    fireEvent.click(screen.getByTestId('egoscale-preset-twelve'));
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('250k h');
    expect(screen.getByTestId('egoscale-preset-twelve')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('impossible-note')).toHaveTextContent(/would pass 100%/);
    setHorizon(500_000);
    for (const id of ['measured', 'five', 'twelve']) {
      expect(screen.getByTestId(`egoscale-preset-${id}`)).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('uses a native range input, which browsers operate by keyboard', () => {
    // jsdom does not implement native range arrow-key stepping, so actual
    // key-driven movement is asserted in tests/e2e/generalization.spec.ts
    // against a real browser; here we pin the contract that the control is
    // a focusable native slider with the full range reachable.
    render(<EgoScaleScaling />);
    const control = slider();
    expect(control.tagName).toBe('INPUT');
    expect(control).toHaveAttribute('type', 'range');
    expect(control).toHaveAttribute('min', String(SLIDER_MIN));
    expect(control).toHaveAttribute('max', String(SLIDER_MAX));
    control.focus();
    expect(document.activeElement).toBe(control);
  });

  it('resets to the default horizon and hides the law panel again', async () => {
    const user = userEvent.setup();
    render(<EgoScaleScaling />);
    showLaw();
    fireEvent.change(slider(), { target: { value: String(SLIDER_MAX) } });
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('1M h');
    expect(screen.getByTestId('impossible-note')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reset/i, hidden: true }));
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('100k h');
    expect(screen.queryByTestId('impossible-note')).not.toBeInTheDocument();
    expect(screen.queryByTestId('measured-loss-law')).not.toBeInTheDocument();
  });

  it('exposes an accessible chart description that tracks the horizon', () => {
    render(<EgoScaleScaling />);
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('aria-label', expect.stringContaining('100k'));
    setHorizon(1_000_000);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('1M'),
    );
  });

  it('states the validation-loss caveat and the band status in "How this was made"', () => {
    const { container } = render(<EgoScaleScaling />);
    const method = container.querySelector('[data-figure-fold="method"]');
    const caveat = screen.getByTestId('scaling-caveat');
    expect(method).toContainElement(caveat);
    expect(caveat).toHaveTextContent(/validation loss/i);
    expect(caveat).toHaveTextContent(/real-world success rate/i);
    expect(method).toHaveTextContent(/not a confidence interval/i);
    // The completion fit is this wiki's own fit, not the paper's law.
    expect(screen.getByTestId('scaling-legend')).toHaveTextContent(
      'editorial completion fit (Robot Wiki, R² = 0.96)',
    );
  });

  it('honors a custom initial horizon', () => {
    render(<EgoScaleScaling defaultHorizonHours={250_000} />);
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('250k h');
    // Deep in the extrapolated region the fit is past 100% and flagged,
    // with the 1.00 score the prediction step's hint names.
    expect(screen.getByTestId('completion-readout')).toHaveTextContent(
      /impossible/i,
    );
    expect(screen.getByTestId('projection-summary')).toHaveTextContent(
      'At 250k hours a straight line would pass 100% (a score of 1.00), which is impossible.',
    );
  });

  it('reset returns to the custom initial horizon, not the stock default', async () => {
    const user = userEvent.setup();
    render(<EgoScaleScaling defaultHorizonHours={250_000} />);
    setHorizon(1_000_000);
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('1M h');
    await user.click(screen.getByRole('button', { name: /reset/i, hidden: true }));
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('250k h');
  });

  it('syncs a changed initial horizon to state during render', () => {
    const { rerender } = render(<EgoScaleScaling defaultHorizonHours={250_000} />);
    rerender(<EgoScaleScaling />);
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('100k h');
  });
});
