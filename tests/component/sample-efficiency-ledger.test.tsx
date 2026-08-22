import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SampleEfficiencyLedger } from '@/components/interactive/sample-efficiency-ledger';
import { ANCHORS, BUDGET_SPEC, FLEET_SPEC } from '@/lib/sample-efficiency';

function slider(name: RegExp) {
  return screen.getByRole('slider', { name });
}

const readout = (id: string) =>
  screen.getByTestId(id).textContent?.trim() ?? '';

describe('SampleEfficiencyLedger', () => {
  it('renders the budget slider, the three sources, the fleet slider and reset', () => {
    render(<SampleEfficiencyLedger />);
    expect(slider(/environment-step budget/i)).toBeInTheDocument();
    expect(slider(/robots in the fleet/i)).toBeInTheDocument();
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
      /measured/i,
    );
    expect(screen.getByTestId('sample-modelled-label')).toHaveTextContent(
      /modelled/i,
    );
    expect(screen.getByTestId('sample-modelled-label')).toHaveTextContent(
      /not measured/i,
    );
  });

  it('discloses that fleet scaling is optimistic, with the measured counter-figure', () => {
    render(<SampleEfficiencyLedger />);
    const label = screen.getByTestId('sample-simplification-label');
    expect(label).toHaveTextContent(/perfect parallelism/i);
    expect(label).toHaveTextContent(/per robot-second/i);
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
    fireEvent.change(slider(/robots in the fleet/i), {
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
    fireEvent.change(slider(/robots in the fleet/i), { target: { value: '42' } });
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
});
