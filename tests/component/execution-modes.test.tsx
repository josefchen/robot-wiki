import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExecutionModes } from '@/components/interactive/execution-modes';
import {
  DEG_PER_STEP,
  GATE_X,
  LANES,
  RUN_SPAN,
  X_START,
  peakStep,
  stepAt,
  swingOf,
  travelAt,
  trolleyX,
} from '@/components/iso/figures/handoff-track';
import { HANDOFF_TICK, JERK_LIMIT, MAX_DELAY_MS, TRACE_TICKS, executedTrace, pauseTicks, peakDeltaV } from '@/lib/execution-modes';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';

function slider() {
  return screen.getByRole('slider', { name: /inference delay/i });
}

describe('ExecutionModes', () => {
  it('separates teaching traces from the RTC solver and physical jerk', () => {
    render(<ExecutionModes />);
    const note = screen.getByTestId('execution-assumption-note');
    expect(note).toHaveTextContent(/not an RTC solver or measured robot data/i);
    expect(note).toHaveTextContent(/arbitrary units/i);
    expect(note).toHaveTextContent(/discontinuity proxy, not physical jerk/i);
    expect(note).toHaveTextContent(/five-tick linear blend/i);
    expect(note).toHaveTextContent(
      /sine-shaped plan, delay-dependent offset, four-tick ramps and five-tick linear blend are teaching assumptions/i,
    );
    expect(note).toHaveTextContent(/do not reproduce its experiments or guarantee safety/i);
    for (const image of screen.getAllByRole('img')) {
      expect(image).toHaveAccessibleName(/discontinuity-proxy limit, not physical jerk/i);
    }
  });

  it('renders the three execution modes, the delay slider, readouts, and reset', () => {
    render(<ExecutionModes />);
    expect(screen.getByTestId('panel-synchronous')).toBeInTheDocument();
    expect(screen.getByTestId('panel-naive')).toBeInTheDocument();
    expect(screen.getByTestId('panel-rtc')).toBeInTheDocument();
    expect(slider()).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-label');
    expect(screen.getByTestId('dv-synchronous')).toBeInTheDocument();
    expect(screen.getByTestId('dv-naive')).toBeInTheDocument();
    expect(screen.getByTestId('dv-rtc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getAllByText(/0.30/).length).toBeGreaterThan(0);
  });

  it('names the delay slider starting with its visible label', () => {
    render(<ExecutionModes />);
    const label = (slider() as HTMLInputElement).labels![0].cloneNode(true) as HTMLElement;
    label.querySelector('[data-figure-control-value]')?.remove();
    expect(label.textContent).toBe('Inference delay, any value');
    expect(slider()).toHaveAttribute('aria-label', 'Inference delay, any value: inference delay in milliseconds, currently 200');
  });

  it('covers a delay range of 0 to 200 ms', () => {
    render(<ExecutionModes />);
    expect(slider()).toHaveAttribute('min', '0');
    expect(slider()).toHaveAttribute('max', '200');
  });

  it('opens on 0.2 second with the lurch note, in plain words', () => {
    const { container } = render(<ExecutionModes />);
    expect(slider()).toHaveValue('200');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Three ways to swap plans: pause, lurch, or blend',
    );
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Chunk hand-off');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'blending keeps it moving smoothly',
    );
    expect(screen.getByRole('button', { name: '0.2 second' })).toHaveAttribute('aria-pressed', 'true');
    const notes = container.querySelectorAll('[data-figure-annotation]');
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toBe('Sudden jump: the arm lurcheswhen the new plan takes over');
    expect(container.querySelector('[data-em-stopped]')).not.toBeNull();
    const adjust = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(adjust).toContainElement(slider());
    expect(adjust).toContainElement(screen.getByTestId('dv-naive'));
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
  });

  it('the None preset draws three matching lanes with no stop and no dip', async () => {
    const user = userEvent.setup();
    const { container } = render(<ExecutionModes />);
    await user.click(screen.getByRole('button', { name: 'None' }));
    expect(slider()).toHaveValue('0');
    // The sampled table holds the same numbers the lanes draw: each row's
    // three velocities agree.
    const rows = container.querySelectorAll('details[data-chart-data] tbody tr');
    expect(rows.length).toBe(6);
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')].map((td) => td.textContent);
      expect(new Set(cells).size).toBe(1);
    }
    expect(container.querySelector('[data-em-stopped]')).toBeNull();
    expect(container.querySelector('[data-figure-annotation]')?.textContent).toContain('all three match');
  });

  it('at zero delay all three toy modes stay within the proxy limit', () => {
    render(<ExecutionModes />);
    fireEvent.change(slider(), { target: { value: '0' } });
    expect(slider()).toHaveValue('0');
    expect(screen.getByTestId('verdict-synchronous')).toHaveTextContent(
      /within/i,
    );
    expect(screen.getByTestId('verdict-naive')).toHaveTextContent(/within/i);
    expect(screen.getByTestId('verdict-rtc')).toHaveTextContent(/within/i);
    expect(screen.getByTestId('pause-readout')).toHaveTextContent('0 ms');
  });

  it('at 100 ms the naive switch exceeds the proxy limit while the blended toy holds', () => {
    render(<ExecutionModes />);
    fireEvent.change(slider(), { target: { value: '100' } });
    const naiveDv = Number(
      screen.getByTestId('dv-naive').getAttribute('data-value'),
    );
    expect(naiveDv).toBeGreaterThan(0.3);
    expect(screen.getByTestId('verdict-naive')).toHaveTextContent(/exceeds/i);
    expect(screen.getByTestId('verdict-rtc')).toHaveTextContent(/within/i);
    expect(screen.getByTestId('verdict-synchronous')).toHaveTextContent(
      /within/i,
    );
  });

  it('at 200 ms the naive spike roughly doubles while the sync pause grows to 200 ms', () => {
    render(<ExecutionModes />);
    fireEvent.change(slider(), { target: { value: '200' } });
    const naiveDv = Number(
      screen.getByTestId('dv-naive').getAttribute('data-value'),
    );
    expect(naiveDv).toBeGreaterThan(1.0);
    const rtcDv = Number(
      screen.getByTestId('dv-rtc').getAttribute('data-value'),
    );
    expect(rtcDv).toBeLessThan(0.3);
    expect(screen.getByTestId('pause-readout')).toHaveTextContent('200 ms');
  });

  it('reset restores the 0.2 second opening state', async () => {
    const user = userEvent.setup();
    render(<ExecutionModes />);
    fireEvent.change(slider(), { target: { value: '0' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('200');
    expect(screen.getByTestId('verdict-naive')).toHaveTextContent(/exceeds/i);
  });

  it('renders a table-form chart description that names the pendulum gauges', () => {
    const { container } = render(<ExecutionModes />);
    const desc = container.querySelector('[data-chart-description]');
    expect(desc?.textContent).toMatch(/pendulum gauge keeps its largest step on a drag pointer/i);
    expect(desc?.textContent).toMatch(/velocity/i);
    const details = container.querySelector('details[data-chart-data]');
    expect(details).toHaveAttribute('data-chart-form', 'table');
    expect(details?.querySelectorAll('tbody tr').length).toBe(6);
    const before = desc?.textContent ?? '';
    fireEvent.change(slider(), { target: { value: '0' } });
    expect(container.querySelector('[data-chart-description]')?.textContent).not.toBe(
      before,
    );
  });

  it('gives the track a shorter name than the shared takeaway it is described by', () => {
    const { container } = render(<ExecutionModes />);
    const track = screen.getByRole('img', { name: /three-lane test track/i });
    const desc = container.querySelector('[data-chart-description]');
    expect(desc?.id).toBeTruthy();
    expect(track).toHaveAttribute('aria-describedby', desc?.id);
    expect(track.getAttribute('aria-label')!.length).toBeLessThan(
      (desc?.textContent ?? '').length,
    );
  });

  it('draws one lane per mode, each trolley with its drag pointer at its peak step', () => {
    const { container } = render(<ExecutionModes />);
    const svg = container.querySelector('[data-anatomy-drawing] svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.querySelectorAll('[data-series]')).toHaveLength(0);
    for (const mode of LANES) {
      const lane = screen.getByTestId(`panel-${mode}`);
      expect(lane).toHaveAttribute('data-peak-step', peakDeltaV(executedTrace(mode, 200)).toFixed(2));
      expect(lane.querySelector('[data-drag]')).not.toBeNull();
    }
    // Only the lurch goes over the limit at 0.2 second, and only it carries the outcome mark.
    expect(screen.getByTestId('spike-naive')).toBeInTheDocument();
    expect(screen.queryByTestId('spike-rtc')).not.toBeInTheDocument();
    expect(screen.queryByTestId('spike-synchronous')).not.toBeInTheDocument();
    expect(svg.querySelectorAll('.iso-solid[data-lit]')).toHaveLength(3);
  });

  it('starts and stops the track from the one run button, with no pressed state', () => {
    render(<ExecutionModes />);
    const run = screen.getByTestId('em-run');
    expect(run).toHaveTextContent('Run the track');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the track');
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Run the track');
    fireEvent.click(run);
    fireEvent.change(slider(), { target: { value: '100' } });
    expect(run).toHaveTextContent('Run the track');
  });
});

describe('hand-off track model', () => {
  it('moves each trolley by its commanded speed summed tick by tick', () => {
    for (const mode of LANES) {
      const trace = executedTrace(mode, 120);
      let sum = 0;
      for (let tick = 0; tick < TRACE_TICKS; tick++) {
        expect(travelAt(trace, tick)).toBeCloseTo(sum);
        sum += trace[tick].v;
      }
    }
    // The longest run, the lurch at the top delay, fills the lane.
    expect(trolleyX(executedTrace('naive', MAX_DELAY_MS), TRACE_TICKS - 1)).toBeCloseTo(X_START + RUN_SPAN);
  });

  it('puts the gate where every lane still runs the same plan', () => {
    for (const mode of LANES) {
      for (const delay of [0, 100, 200]) expect(trolleyX(executedTrace(mode, delay), HANDOFF_TICK)).toBeCloseTo(GATE_X);
    }
  });

  it('leaves the pausing trolley behind by its dead time, and only at a delay', () => {
    const at = (mode: 'synchronous' | 'rtc', delay: number) => trolleyX(executedTrace(mode, delay), TRACE_TICKS - 1);
    expect(at('synchronous', 0)).toBeCloseTo(at('rtc', 0));
    expect(pauseTicks(200)).toBe(10);
    expect(at('synchronous', 200)).toBeLessThan(at('rtc', 200) - 50);
  });

  it('swings the bob by the speed step of each tick, and keeps the largest on the drag pointer', () => {
    const trace = executedTrace('naive', 200);
    expect(stepAt(trace, HANDOFF_TICK + 0.5)).toBeCloseTo(trace[HANDOFF_TICK].v - trace[HANDOFF_TICK - 1].v);
    expect(Math.abs(peakStep(trace))).toBeCloseTo(peakDeltaV(trace));
    expect(Math.abs(swingOf(JERK_LIMIT))).toBeCloseTo((JERK_LIMIT * DEG_PER_STEP * Math.PI) / 180);
    // Speeding up swings the bob back, against the direction of travel.
    expect(swingOf(0.5)).toBeLessThan(0);
    for (const mode of LANES) {
      const over = Math.abs(peakStep(executedTrace(mode, 200))) > JERK_LIMIT;
      expect(over).toBe(mode === 'naive');
    }
  });
});

describe('ExecutionModes served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<ExecutionModes />)}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/manipulation/realtime-execution/');
    expect(figures).toEqual(['execution-modes']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
