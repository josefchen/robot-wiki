import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DataScaleChart } from '@/components/interactive/data-scale-chart';

function slider() {
  return screen.getByRole('slider', { name: /teleoperation rigs/i });
}

function dedicatedToggle() {
  return screen.getByRole('button', { name: /dedicated farm/i });
}

function droidToggle() {
  return screen.getByRole('button', { name: /droid-measured/i });
}

function hoursReadout() {
  return screen.getByTestId('hours-readout').textContent ?? '';
}

function oxeReadout() {
  return screen.getByTestId('oxe-years-readout').textContent ?? '';
}

function frontierReadout() {
  return screen.getByTestId('frontier-years-readout').textContent ?? '';
}

describe('DataScaleChart', () => {
  it('renders slider, toggles, reset, readouts, and every data marker', () => {
    render(<DataScaleChart />);
    expect(slider()).toBeInTheDocument();
    expect(dedicatedToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(droidToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('rigs-readout')).toHaveTextContent('15');
    expect(screen.getByTestId('hours-readout')).toBeInTheDocument();
    expect(screen.getByTestId('oxe-years-readout')).toBeInTheDocument();
    expect(screen.getByTestId('frontier-years-readout')).toBeInTheDocument();
    for (const id of [
      'droid',
      'egodex',
      'tri-lbm',
      'ego4d',
      'oxe',
      'egoscale',
      'agibot',
    ]) {
      expect(screen.getByTestId(`robot-marker-${id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('llm-marker-gpt3')).toBeInTheDocument();
    expect(screen.getByTestId('llm-marker-llama3')).toBeInTheDocument();
    expect(screen.getByTestId('gap-line')).toBeInTheDocument();
    expect(screen.getByTestId('projection-marker')).toBeInTheDocument();
  });

  it('axes use log-spaced power-of-ten tick labels', () => {
    render(<DataScaleChart />);
    const ticks = screen.getAllByTestId(/^x-tick-/).map((el) => el.textContent);
    expect(ticks).toEqual(['10⁰', '10¹', '10²', '10³', '10⁴', '10⁵', '10⁶']);
    const yTicks = screen
      .getAllByTestId(/^y-tick-/)
      .map((el) => el.textContent);
    expect(yTicks).toEqual(['10⁹', '10¹⁰', '10¹¹', '10¹²', '10¹³', '10¹⁴']);
  });

  it('defaults to 15 dedicated rigs: 15,000 h/yr, OXE scale in 8 mo', () => {
    render(<DataScaleChart />);
    expect(hoursReadout()).toBe('15,000 h/yr');
    expect(oxeReadout()).toBe('8 mo');
    expect(frontierReadout()).toBe('66.7 yr');
  });

  it('slider drives readouts monotonically: more rigs, more hours, fewer years', () => {
    render(<DataScaleChart />);
    fireEvent.change(slider(), { target: { value: '100' } });
    expect(screen.getByTestId('rigs-readout')).toHaveTextContent('100');
    expect(hoursReadout()).toBe('100,000 h/yr');
    expect(oxeReadout()).toBe('1 mo');
    expect(frontierReadout()).toBe('10.0 yr');
    fireEvent.change(slider(), { target: { value: '1' } });
    expect(hoursReadout()).toBe('1,000 h/yr');
    expect(oxeReadout()).toBe('10.0 yr');
    expect(frontierReadout()).toBe('1,000 yr');
  });

  it('DROID-measured rate drops throughput to the published 7 h per collector-year', async () => {
    const user = userEvent.setup();
    render(<DataScaleChart />);
    await user.click(droidToggle());
    expect(droidToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(dedicatedToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(hoursReadout()).toBe('105 h/yr');
    expect(oxeReadout()).toBe('95.2 yr');
    expect(frontierReadout()).toBe('9,524 yr');
    expect(screen.getByTestId('rate-explanation')).toHaveTextContent(/DROID/);
  });

  it('slider and toggle compose: 50 DROID-rate collectors reproduce 350 h/yr', async () => {
    const user = userEvent.setup();
    render(<DataScaleChart />);
    await user.click(droidToggle());
    fireEvent.change(slider(), { target: { value: '50' } });
    expect(hoursReadout()).toBe('350 h/yr');
  });

  it('reset restores the default fleet and rate', async () => {
    const user = userEvent.setup();
    render(<DataScaleChart />);
    fireEvent.change(slider(), { target: { value: '250' } });
    await user.click(droidToggle());
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('rigs-readout')).toHaveTextContent('15');
    expect(hoursReadout()).toBe('15,000 h/yr');
    expect(dedicatedToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(droidToggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('exposes a live summary of the current projection', () => {
    render(<DataScaleChart />);
    const summary = screen.getByTestId('projection-summary');
    expect(summary).toHaveTextContent(/15 rigs/);
    expect(summary).toHaveTextContent(/15,000 h\/yr/);
    fireEvent.change(slider(), { target: { value: '100' } });
    expect(summary).toHaveTextContent(/100 rigs/);
    expect(summary).toHaveTextContent(/100,000 h\/yr/);
  });
});
