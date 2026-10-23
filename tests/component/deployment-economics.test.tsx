import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { DeploymentEconomics } from '../../components/interactive/deployment-economics';
import {
  DEFAULT_INPUTS,
  INPUT_RANGES,
  computeEconomics,
} from '../../lib/deployment-economics';
import { cellNumericToken, cellTokenInReadout } from '../e2e/helpers/table-agreement';
import { balanceOf, beamParts, discStack } from '../../components/iso/figures/payback-steelyard';

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
    const notes = document.querySelectorAll('[data-control-note]');
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

  it('carries both payback columns of the sampled table at the jam time the slider sets', () => {
    // VAL-EDU-023 clause (c), as chart-table-agreement.spec.ts probes it:
    // set the jam slider to a sampled row, then read the figure with the
    // table removed. Every numeric cell of that row must be there at the
    // precision the table prints.
    const { container } = mount();
    const table = container.querySelector('details[data-chart-data][data-chart-form="table"]')!;
    const rows = Array.from(table.querySelectorAll('tbody tr')).map((tr) => ({
      label: tr.querySelector('th')!.textContent!.trim(),
      cells: Array.from(tr.querySelectorAll('td')).map((td) => td.textContent!.trim()),
    }));
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      fireEvent.change(slider(/jam-clearing time/i), { target: { value: row.label } });
      const clone = container.querySelector('[data-figure-frame]')!.cloneNode(true) as Element;
      clone.querySelectorAll('details[data-chart-data]').forEach((d) => d.remove());
      const readout = (clone.textContent ?? '').replace(/\s+/g, ' ');
      for (const cell of row.cells.filter((c) => cellNumericToken(c) != null)) {
        expect(cellTokenInReadout(cell, readout), `${row.label} s: [${cell}] in [${readout.slice(0, 200)}]`).toBe(true);
      }
    }
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

  it('hangs the cell cost as slotted weights and rests the poise at the payback in months', () => {
    // Under reduced motion the poise goes straight to each new balance, so the drawing can be read at once.
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      const { container } = mount();
      const load = container.querySelector('[data-testid="cost-load"]')!;
      expect(Number(load.getAttribute('data-discs'))).toBe(discStack(DEFAULT_INPUTS.robotCost, DEFAULT_INPUTS.integrationMultiple).length);
      expect(Number(load.getAttribute('data-discs'))).toBe(10);
      const beam = container.querySelector('[data-testid="steelyard-beam"]')!;
      const index = () => beam.querySelector('[data-beam-line="index"]')!.getAttribute('d');
      expect(index()).toBe(beamParts(0, computeEconomics(DEFAULT_INPUTS).paybackMonths!).index);
      // A slower fix lightens a month of value: the poise's balance moves out along the arm.
      fireEvent.change(slider(/jam-clearing time/i), { target: { value: '300' } });
      fireEvent.change(slider(/per-pick success/i), { target: { value: '99' } });
      const out = computeEconomics({ ...DEFAULT_INPUTS, jamClearSeconds: 300, successRatePercent: 99 });
      expect(balanceOf(out.paybackMonths).poise).toBeCloseTo(17.3, 2);
      expect(screen.getByTestId('payback-months').textContent).toBe('17.3 months');
      expect(index()).toBe(beamParts(0, out.paybackMonths!).index);
      // More robot price adds discs to the hanger.
      fireEvent.change(slider(/robot cost/i), { target: { value: '120000' } });
      expect(Number(load.getAttribute('data-discs'))).toBe(discStack(120000, DEFAULT_INPUTS.integrationMultiple).length);
    } finally {
      window.matchMedia = original;
    }
  });

  it('draws no words: the steelyard carries no text, title, description or foreign object', () => {
    const { container } = mount();
    const svg = container.querySelector('svg.iso-svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect((svg.textContent ?? '').trim()).toBe('');
    // The hour plate's three bands fill the hour, in the shares its name announces.
    const shares = Array.from(svg.querySelectorAll('[data-breakdown-segment]')).map((g) => Number.parseFloat(g.getAttribute('data-share')!));
    expect(shares).toHaveLength(3);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 0);
    // The one lit part: the poise.
    expect(svg.querySelectorAll('[data-testid="steelyard-beam"] [data-lit]').length).toBeGreaterThan(0);
    expect(svg.querySelectorAll('[data-lit]').length).toBe(svg.querySelectorAll('[data-testid="steelyard-beam"] [data-lit]').length);
  });
});

describe('DeploymentEconomics series encoding (VAL-B2-VIZ-002/004)', () => {
  it('names every plotted series in the plot or the legend and tells each pair apart without colour', () => {
    const { container } = mount();
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(['economics-downtime', 'economics-jam-clearing', 'economics-productive']);
    const encodings = seriesEncodings(container);
    // Downtime is drawn as an outline beside the filled productive bar.
    expect(encodings['economics-downtime'].geometries).not.toEqual(encodings['economics-productive'].geometries);
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
