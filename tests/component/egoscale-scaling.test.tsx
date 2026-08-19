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
  return screen.getByRole('slider', { name: /extrapolation horizon/i });
}

function setHorizon(hours: number) {
  fireEvent.change(slider(), {
    target: { value: String(hoursToSlider(hours)) },
  });
}

describe('EgoScaleScaling', () => {
  it('renders the slider, reset, readouts, and chart with the band visible by default', () => {
    render(<EgoScaleScaling />);
    expect(slider()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('100k h');
    expect(screen.getByTestId('uncertainty-band')).toBeInTheDocument();
    expect(screen.getByTestId('solved-bar')).toBeInTheDocument();
    expect(screen.getByTestId('loss-readout')).toBeInTheDocument();
    expect(screen.getByTestId('completion-readout')).toBeInTheDocument();
    // Five measured scales on each series.
    expect(screen.getAllByTestId(/^loss-point-/).length).toBe(5);
    expect(screen.getAllByTestId(/^completion-point-/).length).toBe(5);
  });

  it('defaults to the 100k horizon with both scenario projections shown', () => {
    render(<EgoScaleScaling />);
    // Law holds: 0.024 - 0.003 * ln(100) = 0.0102; plateau: 0.0150.
    expect(screen.getByTestId('loss-readout')).toHaveTextContent('0.0102');
    expect(screen.getByTestId('loss-readout')).toHaveTextContent('0.0150');
    // Completion fit at 100k: 0.89, still below the 0.90 solved bar.
    expect(screen.getByTestId('completion-readout')).toHaveTextContent('0.89');
    expect(screen.getByTestId('completion-readout')).toHaveTextContent(
      /below the solved bar/i,
    );
  });

  it('hides the band and dashed extrapolation at the measured-range boundary', () => {
    render(<EgoScaleScaling />);
    fireEvent.change(slider(), { target: { value: String(SLIDER_MIN) } });
    expect(screen.queryByTestId('uncertainty-band')).not.toBeInTheDocument();
    expect(screen.queryByTestId('extrapolated-loss-law')).not.toBeInTheDocument();
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('20k h');
    expect(screen.getByTestId('projection-summary')).toHaveTextContent(
      /measured range/i,
    );
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
    expect(screen.getByTestId('completion-readout')).toHaveTextContent(
      /below the solved bar/i,
    );
    setHorizon(200_000);
    expect(screen.getByTestId('completion-readout')).toHaveTextContent('0.97');
    expect(screen.getByTestId('completion-readout')).toHaveTextContent(
      /past the solved bar/i,
    );
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

  it('resets to the default horizon', async () => {
    const user = userEvent.setup();
    render(<EgoScaleScaling />);
    fireEvent.change(slider(), { target: { value: String(SLIDER_MAX) } });
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('1M h');
    expect(screen.getByTestId('impossible-note')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('100k h');
    expect(screen.queryByTestId('impossible-note')).not.toBeInTheDocument();
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

  it('states the validation-loss caveat in the accompanying text', () => {
    render(<EgoScaleScaling />);
    const caveat = screen.getByTestId('scaling-caveat');
    expect(caveat).toHaveTextContent(/validation loss/i);
    expect(caveat).toHaveTextContent(/not a confidence interval/i);
    expect(caveat).toHaveTextContent(/real-world success rate/i);
  });

  it('honors a custom initial horizon', () => {
    render(<EgoScaleScaling defaultHorizonHours={250_000} />);
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('250k h');
    // Deep in the extrapolated region the fit is past 100% and flagged.
    expect(screen.getByTestId('completion-readout')).toHaveTextContent(
      /impossible/i,
    );
  });

  it('reset returns to the custom initial horizon, not the stock default', async () => {
    const user = userEvent.setup();
    render(<EgoScaleScaling defaultHorizonHours={250_000} />);
    setHorizon(1_000_000);
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('1M h');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('250k h');
  });

  it('syncs a changed initial horizon to state during render', () => {
    const { rerender } = render(<EgoScaleScaling defaultHorizonHours={250_000} />);
    rerender(<EgoScaleScaling />);
    expect(screen.getByTestId('horizon-readout')).toHaveTextContent('100k h');
  });
});
