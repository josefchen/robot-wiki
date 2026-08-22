import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { DeploymentEconomics } from '../../components/interactive/deployment-economics';
import {
  DEFAULT_INPUTS,
  INPUT_RANGES,
  computeEconomics,
} from '../../lib/deployment-economics';

function mount() {
  return render(<DeploymentEconomics />);
}

/** The native range-input contract this component pins: its programmatic
 * props reflect the model's bounds, which is what the e2e setSlider
 * helper relies on. Arrow-key movement is asserted in e2e, not jsdom. */
function slider(name: RegExp): HTMLInputElement {
  return screen.getByRole('slider', { name }) as HTMLInputElement;
}

afterEach(cleanup);

describe('DeploymentEconomics component', () => {
  it('renders all seven controls, the readouts, and reset', () => {
    mount();
    for (const label of [
      /robot cost/i,
      /integration multiple/i,
      /cycle time/i,
      /uptime/i,
      /per-pick success/i,
      /jam-clearing time/i,
      /displaced wage/i,
    ]) {
      expect(screen.getByRole('slider', { name: label })).toBeTruthy();
    }
    expect(screen.getByTestId('cost-per-pick')).toBeTruthy();
    expect(screen.getByTestId('payback-months')).toBeTruthy();
    expect(screen.getByTestId('payback-verdict')).toBeTruthy();
    expect(screen.getByRole('button', { name: /reset/i })).toBeTruthy();
  });

  it('defaults match the model and every default is labelled', () => {
    mount();
    const d = DEFAULT_INPUTS;
    const labels: Array<[RegExp, number]> = [
      [/robot cost/i, d.robotCost],
      [/integration multiple/i, d.integrationMultiple],
      [/cycle time/i, d.cycleTimeSeconds],
      [/uptime/i, d.uptimePercent],
      [/per-pick success/i, d.successRatePercent],
      [/jam-clearing time/i, d.jamClearSeconds],
      [/displaced wage/i, d.wageUsdPerHour],
    ];
    for (const [name, value] of labels) {
      expect(slider(name).value).toBe(String(value));
    }
    // Seven sourcing notes, each naming its input's default a source or an
    // assumption (VAL-DATA-034).
    const notes = document.querySelectorAll('p.text-\\[11px\\].leading-snug');
    const noteTexts = Array.from(notes).map((n) => n.textContent ?? '');
    expect(
      noteTexts.filter((t) => /assumption|sourced/i.test(t)).length,
    ).toBeGreaterThanOrEqual(7);
  });

  it('readouts agree with the pure model at the defaults', () => {
    mount();
    const out = computeEconomics(DEFAULT_INPUTS);
    expect(screen.getByTestId('cost-per-pick').textContent).toBe(
      out.costPerPickUsd.toFixed(3),
    );
    expect(screen.getByTestId('payback-months').textContent).toBe(
      `${out.paybackMonths!.toFixed(1)} months`,
    );
    expect(screen.getByTestId('payback-verdict').textContent).toMatch(
      /inside 24 months/i,
    );
  });

  it('changing the success input moves the payback readout', () => {
    // jsdom does not implement native range arrow-key stepping (keyboard
    // movement is asserted in e2e with the shared setSlider helper), so
    // this drives the input's change event the way React sees it.
    mount();
    const s = slider(/per-pick success/i);
    const before = screen.getByTestId('payback-months').textContent;
    fireEvent.change(s, {
      target: { value: String(DEFAULT_INPUTS.successRatePercent - 0.9) },
    });
    const after = screen.getByTestId('payback-months').textContent;
    expect(after).not.toBe(before);
  });

  it('reset restores every input after moves', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(slider(/jam-clearing time/i));
    await user.type(slider(/jam-clearing time/i), '{ArrowRight}');
    await user.click(slider(/cycle time/i));
    await user.type(slider(/cycle time/i), '{ArrowRight}');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider(/jam-clearing time/i).value).toBe(
      String(DEFAULT_INPUTS.jamClearSeconds),
    );
    expect(slider(/cycle time/i).value).toBe(
      String(DEFAULT_INPUTS.cycleTimeSeconds),
    );
  });

  it('slider programmatic bounds match the model ranges', () => {
    mount();
    expect(slider(/jam-clearing time/i).min).toBe(
      String(INPUT_RANGES.jamClearSeconds.min),
    );
    expect(slider(/jam-clearing time/i).max).toBe(
      String(INPUT_RANGES.jamClearSeconds.max),
    );
    expect(slider(/per-pick success/i).max).toBe(
      String(INPUT_RANGES.successRatePercent.max),
    );
  });

  it('time breakdown shares are announced and non-negative', () => {
    mount();
    const bar = screen.getByTestId('time-breakdown');
    expect(bar.getAttribute('aria-label')).toMatch(/productive/i);
    expect(bar.getAttribute('aria-label')).toMatch(/jam clearing/i);
    expect(bar.getAttribute('aria-label')).toMatch(/downtime/i);
    for (const id of [
      'breakdown-productive',
      'breakdown-jams',
      'breakdown-downtime',
    ]) {
      const text = screen.getByTestId(id).textContent ?? '';
      const seconds = Number.parseFloat(text.replace(/.* ([\d.]+) s$/, '$1'));
      expect(Number.isFinite(seconds)).toBe(true);
      expect(seconds).toBeGreaterThanOrEqual(0);
    }
  });
});
