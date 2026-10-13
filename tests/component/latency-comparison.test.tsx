import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { LatencyComparison } from '@/components/interactive/latency-comparison';
import {
  CLEAR_X,
  LANE,
  POST_R,
  POST_Y,
  START_Y,
  STYLUS_R,
  TICK_RUN,
  actionAt,
  penX,
  poseAt,
  runOf,
} from '@/components/iso/figures/averaging-plotter';
import {
  HANDOFF_TICK,
  MAX_DELAY_MS,
  MODE_VALUE,
  ensembleCommitWeight,
  isValidModeAction,
  teActionAtHandoff,
  teHandoffTrace,
} from '@/lib/latency-chunking';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';

function slider() {
  return screen.getByRole('slider', { name: /inference delay/i });
}

describe('LatencyComparison', () => {
  it('renders the delay slider, both labeled traces, readouts, and reset', () => {
    render(<LatencyComparison />);
    expect(slider()).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-label');
    expect(screen.getAllByText(/temporal ensembling/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/real-time chunking/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('te-throughput-readout')).toBeInTheDocument();
    expect(screen.getByTestId('rtc-throughput-readout')).toBeInTheDocument();
    expect(screen.getByTestId('te-status-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('covers an injected delay range from 0 to at least 200 ms', () => {
    render(<LatencyComparison />);
    expect(slider()).toHaveAttribute('min', '0');
    const max = Number(slider().getAttribute('max'));
    expect(max).toBeGreaterThanOrEqual(200);
  });

  it('opens on the larger tested delay, where the averaged move fails', () => {
    render(<LatencyComparison />);
    expect(slider()).toHaveValue('200');
    expect(screen.getByTestId('te-throughput-readout')).toHaveTextContent('0%');
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(/fails/i);
    expect(screen.getByTestId('te-offmode-marker')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+0.2 second' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('the None preset shows both strategies at full throughput', async () => {
    const user = userEvent.setup();
    render(<LatencyComparison />);
    await user.click(screen.getByRole('button', { name: 'None' }));
    expect(slider()).toHaveValue('0');
    expect(screen.getByTestId('te-throughput-readout')).toHaveTextContent(
      '100%',
    );
    expect(screen.getByTestId('rtc-throughput-readout')).toHaveTextContent(
      '100%',
    );
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /works/i,
    );
  });

  it('temporal ensembling fails at 200 ms while real-time chunking holds', () => {
    render(<LatencyComparison defaultDelayMs={0} />);
    fireEvent.change(slider(), { target: { value: '200' } });
    expect(screen.getByTestId('te-throughput-readout')).toHaveTextContent('0%');
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /fails/i,
    );
    expect(screen.getByTestId('rtc-throughput-readout')).toHaveTextContent(
      '100%',
    );
  });

  it('marks the averaged action as off-mode once the ensemble fails', () => {
    render(<LatencyComparison defaultDelayMs={0} />);
    expect(screen.queryByTestId('te-offmode-marker')).not.toBeInTheDocument();
    fireEvent.change(slider(), { target: { value: '160' } });
    expect(screen.getByTestId('te-offmode-marker')).toBeInTheDocument();
  });

  it('reset restores the zero-delay state', async () => {
    const user = userEvent.setup();
    render(<LatencyComparison defaultDelayMs={0} />);
    fireEvent.change(slider(), { target: { value: '200' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('0');
    expect(screen.getByTestId('te-throughput-readout')).toHaveTextContent(
      '100%',
    );
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /works/i,
    );
  });

  it('reset restores the opening delay after a preset', async () => {
    const user = userEvent.setup();
    render(<LatencyComparison />);
    await user.click(screen.getByRole('button', { name: 'None' }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('200');
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(/fails/i);
  });

  it('labels the modeled curves as a qualitative model of published results', () => {
    render(<LatencyComparison />);
    expect(screen.getAllByText(/qualitative model/i).length).toBeGreaterThan(0);
  });

  it('honors a custom default delay', () => {
    render(<LatencyComparison defaultDelayMs={100} />);
    expect(slider()).toHaveValue('100');
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /fails/i,
    );
    expect(screen.getByRole('button', { name: '+0.1 second' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('names the TE status so mounts in different regimes describe differently', () => {
    const throughputText = (delay: number) => {
      const { container, unmount } = render(<LatencyComparison defaultDelayMs={delay} />);
      const text = container.querySelector('[data-chart-description]')?.textContent ?? '';
      unmount();
      return text;
    };
    const nominal = throughputText(0);
    const failed = throughputText(100);
    expect(nominal).toMatch(/temporal ensembling, marked nominal,/);
    expect(failed).toMatch(/temporal ensembling, marked failed,/);
    const key = (text: string) => text.toLowerCase().replace(/\d+/g, '#');
    expect(key(nominal)).not.toBe(key(failed));
  });

  it('describes both series roots with sampled tables and names the honesty markers', () => {
    const { container } = render(<LatencyComparison />);
    const descs = [...container.querySelectorAll('[data-chart-description]')];
    expect(descs).toHaveLength(2);
    expect(descs[0].textContent).toMatch(/protective stops at its \+100 and \+200 ms settings/i);
    expect(descs[0].textContent).toMatch(/not a universal latency threshold/i);
    expect(descs[1].textContent).toMatch(/post between the two plan grooves is drawn for illustration/i);
    expect(descs[1].textContent).toMatch(/modelled modes rather than measured actions/i);
    const tables = container.querySelectorAll('details[data-chart-data][data-chart-form="table"]');
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      const rows = table.querySelectorAll('tbody tr').length;
      expect(rows).toBeGreaterThanOrEqual(5);
      expect(rows).toBeLessThanOrEqual(10);
    }
  });

  it('draws the averaging plotter: pen on the beam at the averaged weight, ink from the trace', () => {
    const { container } = render(<LatencyComparison />);
    const figure = screen.getByRole('img', { name: /averaging plotter/i });
    expect(figure).toHaveAccessibleName(/weight averaging keeps on the plan under way, 0\.60/);
    expect(figure).toHaveAccessibleName(/heads into the post/);
    expect(screen.getByTestId('lc-pen')).toHaveAttribute('data-weight', ensembleCommitWeight(200).toFixed(2));
    // No words inside the drawing; the post, grooves and pen are machine parts, not plotted series.
    const svg = container.querySelector('[data-anatomy-drawing] svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.querySelectorAll('[data-series]')).toHaveLength(0);
    expect(svg.querySelectorAll('.iso-solid[data-lit]').length).toBeGreaterThan(0);
  });

  it('starts and stops the plotter from the one run button, with no pressed state', () => {
    render(<LatencyComparison />);
    const run = screen.getByTestId('lc-run');
    expect(run).toHaveTextContent('Run the plotter');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the plotter');
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Run the plotter');
    // A preset stops a run.
    fireEvent.click(run);
    fireEvent.click(screen.getByRole('button', { name: 'None' }));
    expect(run).toHaveTextContent('Run the plotter');
  });
});

describe('averaging plotter model', () => {
  it('puts the pen on the left groove for the plan under way and halfway for an even average', () => {
    expect(penX(MODE_VALUE)).toBeCloseTo(LANE);
    expect(penX(0)).toBe(0);
    expect(penX(-MODE_VALUE)).toBeCloseTo(-LANE);
  });

  it('reads the pen off the same hand-off trace the table samples', () => {
    for (const delay of [0, 60, 100, 160, 200, MAX_DELAY_MS]) {
      const trace = teHandoffTrace(delay);
      for (const point of trace) expect(actionAt(trace, point.tick)).toBeCloseTo(point.action);
      // Before the hand-off the pen rides the plan under way; after it settles on the averaged move.
      expect(penX(actionAt(trace, 0))).toBeCloseTo(LANE);
      expect(penX(actionAt(trace, 40))).toBeCloseTo(penX(teActionAtHandoff(delay)));
    }
  });

  it('meets the post exactly when the model calls the averaged move off both plans', () => {
    expect(POST_R + STYLUS_R).toBeCloseTo(CLEAR_X);
    for (let delay = 0; delay <= MAX_DELAY_MS; delay += 5) {
      const run = runOf(delay);
      expect(run.hits).toBe(!isValidModeAction(teActionAtHandoff(delay)));
    }
    // The flip sits between the two tested delays' neighbours, near 96 ms.
    expect(runOf(95).hits).toBe(false);
    expect(runOf(100).hits).toBe(true);
  });

  it('stops the stylus against the post, after the late plan has settled', () => {
    const run = runOf(200);
    const end = poseAt(run, run.endTick + 5);
    const contactY = START_Y - end.s;
    expect(Math.hypot(end.x, contactY - POST_Y)).toBeCloseTo(CLEAR_X, 6);
    expect(run.endTick).toBeGreaterThan(HANDOFF_TICK + 3);
    expect(end.s).toBeCloseTo(run.endTick * TICK_RUN);
    const free = runOf(0);
    expect(free.hits).toBe(false);
    expect(poseAt(free, 99).x).toBeCloseTo(LANE);
  });
});

describe('LatencyComparison served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<LatencyComparison />)}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/manipulation/action-chunking/');
    expect(figures).toEqual(['latency-comparison']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
