import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { FlowMatchingTrajectory } from '@/components/interactive/flow-matching-trajectory';
import { ARM, P, SX, TOP, U } from '@/components/iso/figures/field-table';
import { iso, pathOf, translateAlong } from '@/components/iso/iso-kit';
import {
  MAX_STEPS,
  MIN_STEPS,
  endpointDispersion,
  generateFlowField,
  integrateFlow,
  transportVelocity,
} from '@/lib/flow-matching';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';

function slider() {
  return screen.getByRole('slider', { name: /integration steps/i });
}

function stepReadout() {
  return screen.getByTestId('fm-step-readout');
}

function dispersionReadout() {
  return screen.getByTestId('fm-dispersion-readout');
}

function dispersion() {
  return Number.parseFloat(dispersionReadout().textContent ?? '');
}

/** The followed sample, straight from the model: seeded sample 0. */
const FOLLOWED = generateFlowField().samples[0]!;
/** The ink the model says the stylus lays down with `steps` Euler hops, projected onto the plate's top. */
const modelInk = (steps: number) => pathOf(integrateFlow(FOLLOWED, steps).map((p) => iso([SX * p.x * U, p.y * U, TOP], P)));
const drawing = (container: HTMLElement) => container.querySelector('[data-anatomy-drawing] svg')!;

describe('FlowMatchingTrajectory', () => {
  it('renders the slider, step presets, readouts, and reset', () => {
    render(<FlowMatchingTrajectory />);
    expect(slider()).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-label');
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(stepReadout()).toBeInTheDocument();
    expect(dispersionReadout()).toBeInTheDocument();
  });

  it('names the steps slider starting with its visible label', () => {
    render(<FlowMatchingTrajectory />);
    const label = (slider() as HTMLInputElement).labels![0].cloneNode(true) as HTMLElement;
    label.querySelector('[data-figure-control-value]')?.remove();
    expect(label.textContent).toBe('Refining steps, any number');
    expect(slider().getAttribute('aria-label')).toMatch(/^Refining steps, any number: integration steps, currently \d+ of \d+$/);
  });

  it('spans 1 to 50 integration steps', () => {
    render(<FlowMatchingTrajectory />);
    expect(slider()).toHaveAttribute('min', String(MIN_STEPS));
    expect(slider()).toHaveAttribute('max', String(MAX_STEPS));
  });

  it('shows the vector field and the noise-to-action transport', () => {
    render(<FlowMatchingTrajectory />);
    expect(
      screen.getByRole('img', { name: /vector field/i }),
    ).toBeInTheDocument();
  });

  it('defaults to the pi0 configuration of 10 steps', () => {
    render(<FlowMatchingTrajectory />);
    expect(slider()).toHaveValue('10');
    expect(stepReadout()).toHaveTextContent('10');
  });

  it('tracks the slider in the step readout and updates the dispersion', () => {
    render(<FlowMatchingTrajectory />);
    const atDefault = dispersion();
    fireEvent.change(slider(), { target: { value: '1' } });
    expect(stepReadout()).toHaveTextContent(/\b1\b/);
    const atOne = dispersion();
    expect(atOne).toBeGreaterThan(atDefault);
    fireEvent.change(slider(), { target: { value: '50' } });
    expect(dispersion()).toBeLessThan(atDefault);
  });

  it('endpoint dispersion at 1 step is observably larger than at 5 steps', () => {
    render(<FlowMatchingTrajectory defaultSteps={1} />);
    const low = dispersion();
    fireEvent.change(slider(), { target: { value: '5' } });
    expect(dispersion()).toBeLessThan(low / 2);
  });

  it('step presets set the slider to the real configurations', async () => {
    const user = userEvent.setup();
    render(<FlowMatchingTrajectory />);
    await user.click(screen.getByRole('button', { name: /5 steps/i }));
    expect(slider()).toHaveValue('5');
    await user.click(screen.getByRole('button', { name: /50 steps/i }));
    expect(slider()).toHaveValue('50');
    await user.click(screen.getByRole('button', { name: /10 steps/i }));
    expect(slider()).toHaveValue('10');
  });

  it('marks the active preset with aria-pressed', async () => {
    const user = userEvent.setup();
    render(<FlowMatchingTrajectory defaultSteps={5} />);
    const preset = screen.getByRole('button', { name: /5 steps/i });
    expect(preset).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /10 steps/i }));
    expect(preset).toHaveAttribute('aria-pressed', 'false');
  });

  it('reset restores the default step count', async () => {
    const user = userEvent.setup();
    render(<FlowMatchingTrajectory />);
    fireEvent.change(slider(), { target: { value: '37' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('10');
  });

  it('labels the visualization as an illustrative model on the stage', () => {
    const { container } = render(<FlowMatchingTrajectory />);
    expect(container.querySelector('[data-figure-stage] [data-figure-status]')).toHaveTextContent(
      /illustrative/i,
    );
  });

  it('opens on ten steps with the one-jump ghost and the note on the landing point', () => {
    const { container } = render(<FlowMatchingTrajectory />);
    expect(screen.getByRole('button', { name: /10 steps \(π0\)/ })).toHaveAttribute('aria-pressed', 'true');
    // The ghost is the followed sample's one big jump, engraved on the plate from its start to where one Euler
    // step lands, with a miss mark there; the stage readout names it in words.
    const ghost = drawing(container).querySelector('[data-flow-ghost]')!;
    expect(ghost).not.toBeNull();
    expect(ghost.querySelector('.iso-line[data-tone="mid"]')).toHaveAttribute('d', modelInk(1));
    expect(ghost.querySelector('.iso-line[data-tone="red"]')).not.toBeNull();
    expect(container.querySelector('[data-figure-readout]')).toHaveTextContent(
      `one big jump misses by ${endpointDispersion(generateFlowField(), 1).toFixed(2)}`,
    );
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent(/10 small steps land/);
    expect(container.querySelector('[data-flow-field]')).toBeNull();
  });

  it('keeps the slider, the 50-step setting, the field and Reset in "Adjust more"', async () => {
    const user = userEvent.setup();
    const { container } = render(<FlowMatchingTrajectory />);
    const fold = container.querySelector('[data-figure-fold="adjust"]')!;
    expect(fold).not.toHaveAttribute('open');
    for (const control of [slider(), screen.getByRole('button', { name: /reset/i }), screen.getByRole('button', { name: /50 steps/i })]) {
      expect(fold.contains(control)).toBe(true);
    }
    await user.click(screen.getByRole('button', { name: /show the learned field/i }));
    expect(container.querySelectorAll('[data-flow-field]').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /1 step/i }));
    expect(container.querySelector('[data-flow-ghost]')).toBeNull();
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent(/One big jump/);
  });
});

describe('FlowMatchingTrajectory field table', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps words out of the drawing and lights one part, the ink', () => {
    const { container } = render(<FlowMatchingTrajectory />);
    const svg = drawing(container);
    expect(svg.textContent).toBe('');
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    const lit = svg.querySelectorAll('[data-tone="lit"], .iso-solid[data-lit]');
    expect(lit).toHaveLength(1);
    expect(lit[0]!.closest('[data-flow-focus]')).not.toBeNull();
    // The two pockets (the good moves) are in the plain structure ink.
    const pockets = svg.querySelectorAll('[data-flow-mode]');
    expect(pockets).toHaveLength(2);
    for (const pocket of pockets) expect(pocket.querySelector('.iso-line')).toHaveAttribute('data-tone', 'mid');
    // Green and red appear only as outcome marks: the landing and the one big jump's miss.
    for (const mark of svg.querySelectorAll('[data-tone="green"], [data-tone="red"]')) {
      expect(mark.closest('[data-flow-outcome], [data-flow-ghost]')).not.toBeNull();
    }
  });

  it('inks the followed sample\'s Euler path at every preset, stylus at its landing', async () => {
    const user = userEvent.setup();
    const { container } = render(<FlowMatchingTrajectory />);
    for (const [name, steps] of [[/^1 step$/, 1], [/^5 steps/, 5], [/^10 steps/, 10]] as const) {
      await user.click(screen.getByRole('button', { name }));
      const ink = screen.getByTestId('fm-ink');
      expect(ink).toHaveAttribute('data-hops', String(steps));
      expect(ink.querySelector('.iso-line[data-tone="lit"]')).toHaveAttribute('d', modelInk(steps));
      expect(ink.querySelectorAll('[data-hop]')).toHaveLength(steps + 1);
      const landing = integrateFlow(FOLLOWED, steps)[steps]!;
      // The stylus is built at (ARM, 0): the trucks carry it along x, the carriage along y, to the landing.
      expect(screen.getByTestId('fm-gantry')).toHaveAttribute('transform', translateAlong(P, [SX * landing.x * U - ARM, 0, 0]));
      expect(screen.getByTestId('fm-stylus')).toHaveAttribute('transform', translateAlong(P, [0, landing.y * U, 0]));
      // One vane per hop, each turned to the velocity that hop's Euler step reads.
      const readings = container.querySelectorAll('[data-flow-reading]');
      expect(readings).toHaveLength(steps);
      readings.forEach((reading, hop) => {
        const v = transportVelocity(FOLLOWED, hop / steps);
        expect(reading).toHaveAttribute('data-angle', Math.atan2(v.y, SX * v.x).toFixed(4));
      });
      // One bead slid over per hop: one pass of the model each.
      expect(container.querySelectorAll('[data-bead][data-spent]')).toHaveLength(steps);
      // One hop lands outside its pocket; five and ten land in it.
      expect(container.querySelector('[data-flow-outcome]')).toHaveAttribute('data-flow-outcome', steps === 1 ? 'missed' : 'in-pocket');
    }
  });

  it('reads the outcome in plain words, with the test ids on the numbers', () => {
    const field = generateFlowField();
    const { container } = render(<FlowMatchingTrajectory defaultSteps={5} />);
    expect(container.querySelector('[data-figure-readout]')).toHaveTextContent(
      `5 steps · on average lands ${endpointDispersion(field, 5).toFixed(2)} from a good move · one big jump misses by ${endpointDispersion(field, 1).toFixed(2)}`,
    );
    expect(dispersionReadout()).toHaveTextContent(endpointDispersion(field, 5).toFixed(2));
    expect(stepReadout()).toHaveTextContent('5 steps');
  });

  it('starts and stops the stylus from the one run button, with no pressed state', () => {
    render(<FlowMatchingTrajectory />);
    const run = screen.getByTestId('fm-run');
    expect(run).toHaveAttribute('data-brand-control-id', 'control:secondary-action');
    expect(run).toHaveTextContent('Run the stylus');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the stylus');
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Run the stylus');
    // A preset stops a run.
    fireEvent.click(run);
    fireEvent.click(screen.getByRole('button', { name: /^5 steps/ }));
    expect(run).toHaveTextContent('Run the stylus');
  });

  it('plays the hops one by one, a vane and a bead each, and comes to rest on the landing', () => {
    const queue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => queue.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    let clock = performance.now();
    const advance = (frames: number) =>
      act(() => {
        for (let frame = 0; frame < frames && queue.length; frame++) queue.shift()!((clock += 32));
      });
    const { container } = render(<FlowMatchingTrajectory defaultSteps={5} />);
    fireEvent.click(screen.getByTestId('fm-run'));
    // The run starts from the random start: no ink, no vane read, no bead spent.
    expect(screen.getByTestId('fm-ink').querySelector('.iso-line')).toHaveAttribute('d', '');
    expect(container.querySelectorAll('[data-bead][data-spent]')).toHaveLength(0);
    advance(40);
    const phase = container.querySelector('[data-fm-phase]')!.textContent ?? '';
    const hop = Number(phase.match(/^hop (\d) of 5/)?.[1]);
    expect(hop).toBeGreaterThan(1);
    expect(hop).toBeLessThan(5);
    expect(container.querySelectorAll('[data-flow-reading]:not([display="none"])')).toHaveLength(hop);
    expect(container.querySelectorAll('[data-bead][data-spent]')).toHaveLength(hop - 1);
    advance(400);
    expect(screen.getByTestId('fm-run')).toHaveTextContent('Run the stylus');
    expect(container.querySelector('[data-fm-phase]')).toHaveTextContent('');
    expect(screen.getByTestId('fm-ink').querySelector('.iso-line')).toHaveAttribute('d', modelInk(5));
    expect(container.querySelectorAll('[data-bead][data-spent]')).toHaveLength(5);
  });

  it('keeps the still pose under reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    render(<FlowMatchingTrajectory />);
    fireEvent.click(screen.getByTestId('fm-run'));
    expect(screen.getByTestId('fm-run')).toHaveTextContent('Run the stylus');
    expect(screen.getByTestId('fm-ink').querySelector('.iso-line')).toHaveAttribute('d', modelInk(10));
  });
});

describe('FlowMatchingTrajectory served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<FlowMatchingTrajectory />)}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/manipulation/pi-line/');
    expect(figures).toEqual(['flow-matching-trajectory']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
