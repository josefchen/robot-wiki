import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SampleEfficiencyLedger, durationWords, stepWords } from '@/components/interactive/sample-efficiency-ledger';
import { ANCHORS, BUDGET_SPEC, FLEET_SPEC } from '@/lib/sample-efficiency';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('SampleEfficiencyLedger');

function slider(name: RegExp) {
  return screen.getByRole('slider', { name });
}

const readout = (id: string) =>
  screen.getByTestId(id).textContent?.trim() ?? '';

describe('SampleEfficiencyLedger', () => {
  it('renders the budget slider, the three sources, the fleet slider and reset', () => {
    render(<SampleEfficiencyLedger />);
    // Each slider's accessible name starts with the label printed above it.
    expect(slider(/^How much practice: the environment-step budget, currently /)).toBeInTheDocument();
    expect(slider(/^Real robots sharing the work, currently /)).toBeInTheDocument();
    expect(screen.getByText('How much practice')).toBeInTheDocument();
    expect(screen.getByText('Real robots sharing the work')).toBeInTheDocument();
    for (const id of ['sim', 'robot', 'fleet']) {
      expect(screen.getByTestId(`sample-source-${id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('sample-wallclock-readout')).toBeInTheDocument();
    expect(screen.getByTestId('sample-verdict-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('draws a visibly labelled mark for every registered anchor', () => {
    render(<SampleEfficiencyLedger />);
    for (const anchor of ANCHORS) {
      const mark = screen.getByTestId(`sample-anchor-${anchor.id}`);
      expect(mark).toHaveTextContent(anchor.label);
    }
  });

  it('labels the measured region and the modelled region separately', () => {
    render(<SampleEfficiencyLedger />);
    expect(screen.getByTestId('sample-measured-label')).toHaveTextContent(
      /paper-reported durations and bounds/i,
    );
    expect(screen.getByTestId('sample-modelled-label')).toHaveTextContent(
      /modelled/i,
    );
    expect(screen.getByTestId('sample-modelled-label')).toHaveTextContent(
      /not measured/i,
    );
  });

  it('separates model assumptions from paper measurements and an evaluation cap', () => {
    render(<SampleEfficiencyLedger />);
    const label = screen.getByTestId('sample-simplification-label');
    expect(label).toHaveTextContent(/perfect parallelism/i);
    expect(label).toHaveTextContent(/not a measured mean/i);
    expect(label).toHaveTextContent(/Robot-hours are not parallel wall time/i);
    expect(label).toHaveTextContent(/bands do not rule algorithms in or out/i);
    expect(label).not.toHaveTextContent(/ran at about 4\.0/i);
    expect(label).toHaveTextContent(/editorial thresholds/i);
  });

  it('changes the wall-clock and the verdict when the source switches to one robot', async () => {
    const user = userEvent.setup();
    render(<SampleEfficiencyLedger />);
    const simClock = readout('sample-wallclock-readout');
    const simVerdict = readout('sample-verdict-readout');

    await user.click(screen.getByTestId('sample-source-robot'));

    expect(readout('sample-wallclock-readout')).not.toBe(simClock);
    expect(readout('sample-verdict-readout')).not.toBe(simVerdict);
    // The slowdown readout is what carries the factor of ten as text.
    expect(readout('sample-slowdown-readout')).toMatch(/^[\d,]+x$/);
  });

  it('moves the wall-clock readout as the budget slider moves', () => {
    render(<SampleEfficiencyLedger />);
    const before = readout('sample-wallclock-readout');
    fireEvent.change(slider(/environment-step budget/i), {
      target: { value: String(BUDGET_SPEC.max) },
    });
    expect(readout('sample-wallclock-readout')).not.toBe(before);
    expect(readout('sample-budget-value')).toMatch(/steps$/);
  });

  it('shortens the fleet lane as the fleet grows', async () => {
    const user = userEvent.setup();
    render(<SampleEfficiencyLedger />);
    await user.click(screen.getByTestId('sample-source-fleet'));
    const small = readout('sample-wallclock-readout');
    fireEvent.change(slider(/real robots sharing the work/i), {
      target: { value: String(FLEET_SPEC.max) },
    });
    expect(readout('sample-wallclock-readout')).not.toBe(small);
    expect(readout('sample-fleet-value')).toBe(String(FLEET_SPEC.max));
  });

  it('exposes a native range input so arrow keys step it in a real browser', () => {
    render(<SampleEfficiencyLedger />);
    const budget = slider(/environment-step budget/i);
    expect(budget.tagName).toBe('INPUT');
    expect(budget).toHaveAttribute('type', 'range');
    expect(budget).toHaveAttribute('step', String(BUDGET_SPEC.step));
  });

  it('reset restores the default budget and the default data source', async () => {
    const user = userEvent.setup();
    render(<SampleEfficiencyLedger />);
    const opening = {
      clock: readout('sample-wallclock-readout'),
      budget: readout('sample-budget-value'),
      fleet: readout('sample-fleet-value'),
    };
    expect(screen.getByTestId('sample-source-sim')).toBeChecked();

    fireEvent.change(slider(/environment-step budget/i), {
      target: { value: '9.5' },
    });
    fireEvent.change(slider(/real robots sharing the work/i), { target: { value: '42' } });
    await user.click(screen.getByTestId('sample-source-robot'));
    expect(readout('sample-budget-value')).not.toBe(opening.budget);

    await user.click(screen.getByRole('button', { name: /reset/i }));

    expect(readout('sample-budget-value')).toBe(opening.budget);
    expect(readout('sample-fleet-value')).toBe(opening.fleet);
    expect(readout('sample-wallclock-readout')).toBe(opening.clock);
    expect(screen.getByTestId('sample-source-sim')).toBeChecked();
    expect(screen.getByTestId('sample-source-robot')).not.toBeChecked();
  });

  it('renders a chart description whose table covers all three sources', () => {
    render(<SampleEfficiencyLedger />);
    const description = screen.getByTestId('sample-chart');
    const describedBy = description.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      /environment steps/i,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
  it('says the same practice in words on the stage: minutes in simulation, months on one robot', () => {
    const { container } = render(<SampleEfficiencyLedger />);
    const note = container.querySelector('[data-figure-annotation]')?.textContent ?? '';
    expect(note).toBe('Same practice: about 21 minutes in simulation,about 2.7 months on one robot');
    expect(readout('sample-budget-value')).toBe('158 million steps');
    const lanes = [...container.querySelectorAll('[data-series="modelled-lanes"] text')].map((t) => t.textContent);
    expect(lanes).toEqual(['In simulation: 21 minutes', 'One real robot: 2.7 months', '7 real robots: 12 days']);
  });

  it('writes durations and step counts in words', () => {
    expect(durationWords(45)).toBe('45 seconds');
    expect(durationWords(60)).toBe('1 minute');
    expect(durationWords(3 * 3600)).toBe('3 hours');
    expect(durationWords(40 * 86_400)).toBe('40 days');
    expect(durationWords(3 * 365.25 * 86_400)).toBe('3 years');
    expect(stepWords(1e5)).toBe('100 thousand steps');
    expect(stepWords(2.5e9)).toBe('2.5 billion steps');
  });
});
