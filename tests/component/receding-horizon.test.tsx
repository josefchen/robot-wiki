import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecedingHorizon, cutPose, cycleOf, poseAt } from '@/components/interactive/receding-horizon';
import { PUNCH_FACE, ROW, feelerYAt, holeY, pileOffset, plannedMove, rowX } from '@/components/iso/figures/plan-tape-reader';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { commitDurationS, planChunks } from '@/lib/receding-horizon';

function predictedSlider() {
  return screen.getByRole('slider', { name: /predicted horizon/i });
}

function executedSlider() {
  return screen.getByRole('slider', { name: /executed horizon/i });
}

describe('RecedingHorizon', () => {
  it('renders both horizon sliders, the plan lanes, readouts, preset, and reset', () => {
    render(<RecedingHorizon />);
    expect(predictedSlider()).toBeInTheDocument();
    expect(executedSlider()).toBeInTheDocument();
    expect(predictedSlider()).toHaveAttribute('aria-label');
    expect(executedSlider()).toHaveAttribute('aria-label');
    expect(
      screen.getByRole('img', { name: /receding horizon/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('rh-replan-readout')).toBeInTheDocument();
    expect(screen.getByTestId('rh-commit-readout')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /diffusion policy: rethink every 0.8 seconds/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /never rethink/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('defaults to the published Diffusion Policy configuration T_p=16, T_a=8', () => {
    render(<RecedingHorizon />);
    expect(predictedSlider()).toHaveValue('16');
    expect(executedSlider()).toHaveValue('8');
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '1.25 times a second',
    );
    expect(screen.getByTestId('rh-commit-readout')).toHaveTextContent('0.8 s');
  });

  it('lowering T_a raises the replan rate and shortens the commitment', () => {
    render(<RecedingHorizon />);
    fireEvent.change(executedSlider(), { target: { value: '4' } });
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '2.5 times a second',
    );
    expect(screen.getByTestId('rh-commit-readout')).toHaveTextContent('0.4 s');
  });

  it('raising T_a toward T_p drops reactivity toward open-loop execution', () => {
    render(<RecedingHorizon />);
    fireEvent.change(executedSlider(), { target: { value: '16' } });
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '0.63 times a second',
    );
    expect(screen.getByTestId('rh-commit-readout')).toHaveTextContent('1.6 s');
  });

  it('clamps T_a to T_p when the predicted horizon drops below it', () => {
    render(<RecedingHorizon />);
    fireEvent.change(predictedSlider(), { target: { value: '4' } });
    expect(executedSlider()).toHaveValue('4');
    expect(screen.getByTestId('rh-commit-readout')).toHaveTextContent('0.4 s');
  });

  it('distinguishes committed actions from predicted ones in the plan', () => {
    render(<RecedingHorizon />);
    expect(screen.getAllByTestId('rh-committed').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('rh-predicted').length).toBeGreaterThan(0);
  });

  it('drops every unread tail whole into the bin, including the last plan', () => {
    const { container } = render(<RecedingHorizon />);
    // The drawing that replaced the lanes: the old outlined tails are now the
    // unread rows of tape each plan leaves, cut at the reader and binned.
    const tails = screen.getAllByTestId('rh-predicted');
    expect(tails).toHaveLength(4);
    // Every tail spans the same eight steps, so none is cut short.
    for (const tail of tails) expect(tail).toHaveAttribute('data-rows', '8');
    expect(tails.map((t) => t.getAttribute('data-plan'))).toEqual(['0', '1', '2', '3']);
    // The last plan's tail still lies on the gate, in its own moving group;
    // the three before it rest in the bin.
    expect(screen.getByTestId('rh-tail')).toContainElement(tails[3]);
    for (const tail of tails.slice(0, 3)) expect(screen.getByTestId('rh-tail')).not.toContainElement(tail);
    // The read rows of each plan are inked, eight a plan.
    for (const read of screen.getAllByTestId('rh-committed')) expect(read).toHaveAttribute('data-rows', '8');
    expect(screen.getByTestId('rh-ink')).toHaveAttribute('d', expect.stringMatching(/^M/));
    const stage = screen.getByRole('img', { name: /receding horizon/i });
    expect(stage).toHaveAttribute('aria-label', expect.stringContaining('the 8 unread rows drop into a bin'));
    expect(stage).toHaveAttribute('aria-label', expect.stringContaining('4 plans cover the 32-step window'));
    expect(container.querySelector('[data-readout]')).toHaveTextContent('plans 1.6 seconds ahead');
  });

  it('opens on the point: the last plan cut at the reader, with Run the reader', () => {
    render(<RecedingHorizon />);
    const run = screen.getByTestId('rh-run');
    expect(run).toHaveTextContent('Run the reader');
    // A secondary action carries no pressed state: its label says what it does next.
    expect(run).not.toHaveAttribute('aria-pressed');
    expect(screen.getByTestId('rh-card')).toBeInTheDocument();
    expect(screen.getByTestId('rh-feeler')).toBeInTheDocument();
  });

  it('the presets load named configurations', async () => {
    const user = userEvent.setup();
    render(<RecedingHorizon />);
    await user.click(screen.getByRole('button', { name: /never rethink/i }));
    expect(predictedSlider()).toHaveValue('32');
    expect(executedSlider()).toHaveValue('32');
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '0.31 times a second',
    );
    await user.click(
      screen.getByRole('button', { name: /diffusion policy: rethink every 0.8 seconds/i }),
    );
    expect(predictedSlider()).toHaveValue('16');
    expect(executedSlider()).toHaveValue('8');
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '1.25 times a second',
    );
  });

  it('reset restores the default configuration', async () => {
    const user = userEvent.setup();
    render(<RecedingHorizon />);
    fireEvent.change(executedSlider(), { target: { value: '2' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(predictedSlider()).toHaveValue('16');
    expect(executedSlider()).toHaveValue('8');
    expect(screen.getByTestId('rh-replan-readout')).toHaveTextContent(
      '1.25 times a second',
    );
  });
});

  it('derives the discarded-tail clause from the T_a to T_p gap', () => {
    const { container } = render(<RecedingHorizon />);
    const read = () =>
      container.querySelector('[data-chart-description]')?.textContent ?? '';
    // Default 16/8: every chunk carries an 8-step outlined tail.
    expect(read()).toMatch(/thrown away/);
    expect(read()).toMatch(/8-step tails/);
    // State 1: T_a raised to T_p; every tail is zero steps wide, so no
    // outlined tail exists to throw away and the clause must say so.
    fireEvent.change(executedSlider(), { target: { value: '16' } });
    expect(screen.queryAllByTestId('rh-predicted')).toHaveLength(0);
    expect(read()).not.toMatch(/thrown away/);
    expect(read()).toMatch(/open-loop/);
    // State 2: back below T_p, the discarded tails return.
    fireEvent.change(executedSlider(), { target: { value: '8' } });
    expect(read()).toMatch(/8-step tails/);
    expect(read()).toMatch(/thrown away/);
  });

describe('RecedingHorizon tape reader model', () => {
  it('reads a row as its centre passes the feeler, so the cut falls between read and unread rows', () => {
    // In the still pose the last read row sits just past the blade at x = 0,
    // the first unread row just before it.
    expect(rowX(7, 8)).toBeCloseTo(ROW / 2);
    expect(rowX(8, 8)).toBeCloseTo(-ROW / 2);
    // A strip is one row per planned step: the default plan is 16 rows.
    expect(rowX(0, 8) - rowX(15, 8)).toBeCloseTo(15 * ROW);
  });

  it('drives the feeler from the holes it reads', () => {
    for (const plan of [0, 1, 3]) {
      expect(feelerYAt(plan, 8, 8)).toBeCloseTo(holeY(plannedMove(plan, 7, 8)));
      expect(feelerYAt(plan, 8, 1)).toBeCloseTo(holeY(plannedMove(plan, 0, 8)));
    }
    expect(cutPose(3, 8).feelerY).toBeCloseTo(holeY(plannedMove(3, 7, 8)));
  });

  it('keeps every planned move on the tape, and lets the next plan rewrite the tail', () => {
    for (let plan = 0; plan < 8; plan++) {
      for (let step = 0; step < 32; step++) {
        const move = plannedMove(plan, step, 8);
        expect(move).toBeGreaterThanOrEqual(-1);
        expect(move).toBeLessThanOrEqual(1);
      }
    }
    // The next plan rewrites the tail: its first row differs from the old plan's ninth.
    expect(plannedMove(1, 0, 8)).not.toBeCloseTo(plannedMove(0, 8, 8), 3);
  });

  it('runs one plan per cycle: fed from the punch, read for T_a steps at a third of real speed, then cut and binned', () => {
    const c = cycleOf(8, 4);
    // Eight steps at ten a second, three times slower: 2.4 seconds on screen.
    expect(c.act).toBeCloseTo(commitDurationS(8) * 3);
    const start = poseAt(2, 16, 8, 0, 4);
    expect(start.read).toBe(0);
    // The strip starts with its leading row at the punch's slot.
    expect(start.card + 8 * ROW).toBeCloseTo(PUNCH_FACE);
    const halfway = poseAt(2, 16, 8, c.feed + c.act / 2, 4);
    expect(halfway.read).toBeCloseTo(4);
    const cut = poseAt(2, 16, 8, c.feed + c.act + 0.0001, 4);
    expect(cut.card).toBeCloseTo(0, 2);
    expect(cut.tail).toEqual([0, 0, 0]);
    // After the drop the tail lies where the bin's pile puts it.
    const binned = poseAt(2, 16, 8, c.feed + c.act + c.cut + c.push + c.drop, 4);
    const rest = pileOffset(2, 8);
    expect(binned.tail[0]).toBeCloseTo(rest[0]);
    expect(binned.tail[1]).toBeCloseTo(rest[1]);
    expect(binned.tail[2]).toBeCloseTo(rest[2]);
    // With nothing left over there is nothing to bin.
    expect(poseAt(2, 16, 16, 99, 2).tail).toEqual([0, 0, 0]);
  });

  it('plans as many chunks as the window holds, and bins one tail per plan', () => {
    expect(planChunks(16, 8, 32)).toHaveLength(4);
    render(<RecedingHorizon />);
    fireEvent.change(executedSlider(), { target: { value: '4' } });
    const tails = screen.getAllByTestId('rh-predicted');
    expect(tails).toHaveLength(8);
    for (const tail of tails) expect(tail).toHaveAttribute('data-rows', '12');
  });

  it('starts and stops the reader from the one run button', () => {
    render(<RecedingHorizon />);
    const run = screen.getByTestId('rh-run');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the reader');
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Run the reader');
    expect(screen.getAllByTestId('rh-predicted')).toHaveLength(4);
  });
});

describe('RecedingHorizon served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<RecedingHorizon />)}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/manipulation/diffusion-policy/');
    expect(figures).toEqual(['receding-horizon']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
