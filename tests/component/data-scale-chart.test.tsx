import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DataScaleChart } from '@/components/interactive/data-scale-chart';

function slider() {
  return screen.getByRole('slider', { name: /teleoperation rigs/i });
}

function dedicatedToggle() {
  return screen.getByRole('button', { name: /full-time farm/i });
}

function droidToggle() {
  return screen.getByRole('button', { name: /part-time/i });
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
      'egoscale',
      'agibot',
    ]) {
      expect(screen.getByTestId(`robot-marker-${id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('llm-marker-gpt3')).toBeInTheDocument();
    expect(screen.getByTestId('llm-marker-llama3')).toBeInTheDocument();
    expect(screen.getByTestId('goal-line')).toBeInTheDocument();
    expect(screen.getByTestId('projection-marker')).toBeInTheDocument();
  });

  it('hours and tokens sit on separate rulers with numbers written out', () => {
    render(<DataScaleChart />);
    const ticks = screen
      .getAllByTestId(/^hours-tick-/)
      .map((el) => el.textContent);
    expect(ticks).toEqual(['100', '1,000', '10,000']);
    const tokenTicks = screen
      .getAllByTestId(/^token-tick-/)
      .map((el) => el.textContent);
    expect(tokenTicks).toEqual(['100 billion', '10 trillion']);
  });

  it('defaults to 15 full-time robots: 15,000 hours a year, 10,000-hour target in 8 months', () => {
    render(<DataScaleChart />);
    expect(hoursReadout()).toBe('15,000 hours a year');
    expect(oxeReadout()).toBe('8 months');
    expect(frontierReadout()).toBe('66.7 years');
  });

  it('slider drives readouts monotonically: more rigs, more hours, fewer years', () => {
    render(<DataScaleChart />);
    fireEvent.change(slider(), { target: { value: '100' } });
    expect(screen.getByTestId('rigs-readout')).toHaveTextContent('100');
    expect(hoursReadout()).toBe('100,000 hours a year');
    expect(oxeReadout()).toBe('1 month');
    expect(frontierReadout()).toBe('10.0 years');
    fireEvent.change(slider(), { target: { value: '1' } });
    expect(hoursReadout()).toBe('1,000 hours a year');
    expect(oxeReadout()).toBe('10.0 years');
    expect(frontierReadout()).toBe('1,000 years');
  });

  it('authored low-rate scenario uses 7 h per rig-year', async () => {
    const user = userEvent.setup();
    render(<DataScaleChart />);
    await user.click(droidToggle());
    expect(droidToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(dedicatedToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(hoursReadout()).toBe('105 hours a year');
    expect(oxeReadout()).toBe('95.2 years');
    expect(frontierReadout()).toBe('9,524 years');
    expect(screen.getByTestId('rate-explanation')).toHaveTextContent(/not a measured DROID productivity rate/);
  });

  it('slider and toggle compose: 50 hypothetical part-time robots project 350 hours a year', async () => {
    const user = userEvent.setup();
    render(<DataScaleChart />);
    await user.click(droidToggle());
    fireEvent.change(slider(), { target: { value: '50' } });
    expect(hoursReadout()).toBe('350 hours a year');
  });

  it('reset restores the default fleet and rate', async () => {
    const user = userEvent.setup();
    render(<DataScaleChart />);
    fireEvent.change(slider(), { target: { value: '250' } });
    await user.click(droidToggle());
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('rigs-readout')).toHaveTextContent('15');
    expect(hoursReadout()).toBe('15,000 hours a year');
    expect(dedicatedToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(droidToggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('exposes a live summary of the current projection', () => {
    render(<DataScaleChart />);
    const summary = screen.getByTestId('projection-summary');
    expect(summary).toHaveTextContent(/15 full-time robots/);
    expect(summary).toHaveTextContent(/15,000 hours a year/);
    fireEvent.change(slider(), { target: { value: '100' } });
    expect(summary).toHaveTextContent(/100 full-time robots/);
    expect(summary).toHaveTextContent(/100,000 hours a year/);
  });
});


describe('honest unknown and hypothetical chart states', () => {
  it('does not plot OXE and explains unknown duration with a source link', () => {
    const { container } = render(<DataScaleChart />);
    expect(screen.queryByTestId('robot-marker-oxe')).not.toBeInTheDocument();
    expect(screen.getByTestId('robot-marker-droid')).toHaveTextContent('350');
    const unknown = screen.getByTestId('oxe-duration-note');
    expect(unknown).toHaveTextContent('This chart supplies no hour estimate and does not plot OXE on the hours axis.');
    expect(unknown.querySelector('a')).toHaveAttribute('href', 'https://arxiv.org/html/2310.08864v9');
    expect(unknown.querySelector('a')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(unknown.querySelector('a')).toHaveAttribute('data-brand-control-id', 'control:link-focus');
    const row = screen.getByRole('row', { name: /OXE.*No hour estimate plotted/i });
    expect(row.querySelectorAll('td')[0]).toHaveTextContent(/No hour estimate plotted/i);
    expect(row.querySelectorAll('td')[0]).not.toHaveTextContent(/0 h|n\/a/);
    expect(container.querySelector('svg')?.outerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('keeps empirical attribution out of readouts, summary and accessible description', () => {
    render(<DataScaleChart />);
    expect(screen.getByTestId('projection-summary')).toHaveTextContent(/10,000 hours takes.*1,000,000 hours takes/i);
    // The projection is labelled as illustrative where the reader sees it.
    expect(screen.getByText('Illustrative: chosen collection rates, not a measured farm.')).toBeInTheDocument();
    expect(screen.getByTestId('rate-explanation')).toHaveTextContent(/targets.*authored hypothetical/i);
    expect(document.body.textContent).not.toMatch(/to OXE scale|100x OXE|DROID-measured|everything else is a published count/);
  });
  it('preserves prediction mount defaults and reset', async () => {
    const user = userEvent.setup();
    render(<DataScaleChart defaultRigs={10} defaultRate="droid-measured" />);
    expect(hoursReadout()).toBe('70 hours a year');
    expect(oxeReadout()).toBe('143 years');
    await user.click(dedicatedToggle());
    expect(hoursReadout()).toBe('10,000 hours a year');
    expect(oxeReadout()).toBe('1.0 year');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(hoursReadout()).toBe('70 hours a year');
    expect(oxeReadout()).toBe('143 years');
  });
});

describe('farm goal, dataset filter and the stage note', () => {
  it('names the years to the goal on the stage and resets every fold control', async () => {
    const user = userEvent.setup();
    const { container } = render(<DataScaleChart defaultRigs={10} defaultRate="droid-measured" />);
    const note = () => container.querySelector('[data-figure-annotation]')?.textContent ?? '';
    expect(note()).toBe('10 part-time robots: 143 yearsto reach 10,000 hours');
    await user.click(screen.getByTestId('collection-goal-one-million'));
    expect(note()).toBe('10 part-time robots: 14,286 yearsto reach 1,000,000 hours');
    await user.click(screen.getByTestId('dataset-kind-human-video'));
    expect(screen.getByTestId('robot-marker-droid')).toHaveAttribute('data-picked', 'false');
    expect(screen.getByTestId('robot-marker-egoscale')).toHaveAttribute('data-picked', 'true');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(note()).toBe('10 part-time robots: 143 yearsto reach 10,000 hours');
    expect(screen.getByTestId('robot-marker-droid')).toHaveAttribute('data-picked', 'true');
  });
});
