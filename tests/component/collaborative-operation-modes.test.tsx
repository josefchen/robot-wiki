import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CollaborativeOperationModes } from '@/components/interactive/collaborative-operation-modes';
import { cellRun } from '@/components/iso/figures/cobot-cell';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { TRANSIENT_CONTACT_LIMIT_LABEL } from '@/lib/force-limits';
import { MODES, peakContactForceN, protectiveSeparationM, separationTerms } from '@/lib/safety-modes';

const readout = (id: string) => screen.getByTestId(id).textContent?.trim() ?? '';
const stageReadout = (container: HTMLElement) => container.querySelector('[data-readout]')?.textContent?.trim() ?? '';

const originalMatchMedia = window.matchMedia;
function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

function robotSlider() {
  return screen.getByRole('slider', { name: /robot speed/i });
}

function humanSlider() {
  // The walking-speed slider sits in the closed "Adjust more" fold.
  return screen.getByRole('slider', { name: /operator approach speed/i, hidden: true });
}

describe('CollaborativeOperationModes', () => {
  it('states the exact slider range without rendered prose dashes', () => {
    const { container } = render(<CollaborativeOperationModes />);
    expect(container).toHaveTextContent('both sliders choosing 0 to 2 m/s in 0.05 m/s steps');
    expect(container.textContent).not.toMatch(/[–—]/);
    for (const slider of [robotSlider(), humanSlider()]) {
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '2');
      expect(slider).toHaveAttribute('step', '0.05');
    }
  });
  it('renders a button per mode, both sliders and a reset control', () => {
    render(<CollaborativeOperationModes />);
    for (const mode of MODES) {
      expect(screen.getByTestId(`mode-${mode.id}`)).toBeInTheDocument();
    }
    expect(robotSlider()).toBeInTheDocument();
    expect(humanSlider()).toBeInTheDocument();
    const reset = screen.getByRole('button', { name: /reset/i, hidden: true });
    expect(reset.closest('details')).not.toBeNull();
    expect(humanSlider().closest('details')).not.toBeNull();
    expect(robotSlider().closest('details')).toBeNull();
  });

  it('leads with a plain claim, plain mode names and a robot-speed slider with worded ends', () => {
    render(<CollaborativeOperationModes />);
    expect(screen.getByText('A faster robot needs a bigger gap from people')).toBeInTheDocument();
    for (const label of [
      'Stops when you step in',
      'You guide it by hand',
      'Keeps its distance',
      'Gentle enough to bump',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText('1 metre a second, a slow walk')).toBeInTheDocument();
    expect(screen.getByText('slow')).toBeInTheDocument();
    expect(screen.getByText('fast')).toBeInTheDocument();
    expect(screen.getByText('illustrative')).toHaveAttribute('data-figure-status');
  });

  it('splits the gap into its four parts in words and draws the zone to its edge', () => {
    const { container } = render(<CollaborativeOperationModes />);
    const bar = screen.getByTestId('gap-bar');
    expect(bar).toHaveTextContent('You walk in while it reacts: 0.32 metres');
    expect(bar).toHaveTextContent('It keeps moving: 0.10 metres');
    expect(bar).toHaveTextContent('Braking: 0.05 metres');
    expect(bar).toHaveTextContent('Safety margin: 0.95 metres');
    expect(screen.getByTestId('scanner-zone')).toHaveAttribute('data-metres', '1.42');
    expect(screen.getByTestId('gap-riders')).toHaveAttribute('data-terms', '0.10 0.05 0.95 0.32');
    expect(stageReadout(container)).toBe('needs 1.42 m, you stand at 1.60 m');
    expect(screen.getByTestId('safety-plain-readout')).toHaveTextContent(
      'At this speed the robot needs a gap of about 1.4 metres; you are 1.6 metres away, so it keeps working.',
    );
  });

  it('compares a bump with the safe limit in words under the gentle mode', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    await user.click(screen.getByRole('button', { name: 'Gentle enough to bump' }));
    expect(screen.getByTestId('force-bar')).toHaveTextContent(
      'Bump: about 316 newtons. Safe limit (the gauge’s long mark): 255 newtons.',
    );
    expect(readout('force-limited-speed')).toBe('0.81 m/s');
    fireEvent.change(robotSlider(), { target: { value: '0.5' } });
    expect(screen.getByTestId('safety-plain-readout')).toHaveTextContent(
      'A bump at this speed stays under the safe limit, so the robot may touch you.',
    );
  });

  it('opens on speed and separation monitoring with a live separation readout', () => {
    render(<CollaborativeOperationModes />);
    expect(screen.getByTestId('mode-speed-separation')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(readout('separation-readout')).toBe('1.42 m');
    expect(screen.queryByTestId('force-readout')).not.toBeInTheDocument();
  });

  it('shows the four composed terms of the separation equation', () => {
    render(<CollaborativeOperationModes />);
    expect(readout('term-human')).toBe('0.32 m');
    expect(readout('term-reaction')).toBe('0.10 m');
    expect(readout('term-braking')).toBe('0.05 m');
    expect(readout('term-margin')).toBe('0.95 m');
  });

  it('increases the separation readout strictly as the robot speed rises', () => {
    render(<CollaborativeOperationModes />);
    const seen: number[] = [];
    for (const v of ['0.25', '0.75', '1.25', '1.75']) {
      fireEvent.change(robotSlider(), { target: { value: v } });
      seen.push(Number.parseFloat(readout('separation-readout')));
    }
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i]!).toBeGreaterThan(seen[i - 1]!);
    }
  });

  it('increases the separation readout as the operator approaches faster', () => {
    render(<CollaborativeOperationModes />);
    fireEvent.change(humanSlider(), { target: { value: '0.5' } });
    const slow = Number.parseFloat(readout('separation-readout'));
    fireEvent.change(humanSlider(), { target: { value: '2' } });
    expect(Number.parseFloat(readout('separation-readout'))).toBeGreaterThan(slow);
  });

  it('replaces the separation readout with a force readout and a labelled limit', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    await user.click(screen.getByTestId('mode-power-force'));
    expect(screen.queryByTestId('separation-readout')).not.toBeInTheDocument();
    expect(screen.getByTestId('force-readout')).toBeInTheDocument();
    expect(readout('force-limit-readout')).toBe('255 N');
  });

  it('renders the force limit label from the shared module verbatim', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    await user.click(screen.getByTestId('mode-power-force'));
    expect(readout('force-limit-label')).toBe(TRANSIENT_CONTACT_LIMIT_LABEL);
  });

  it('states a constraint rather than a number for the two procedural modes', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    for (const id of ['monitored-stop', 'hand-guiding'] as const) {
      await user.click(screen.getByTestId(`mode-${id}`));
      expect(screen.queryByTestId('separation-readout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('force-readout')).not.toBeInTheDocument();
      expect(readout('stated-readout')).toMatch(/no distance or force budget/i);
    }
  });

  it('gives each mode its own explanatory constraint sentence', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    const seen = new Set<string>();
    for (const mode of MODES) {
      await user.click(screen.getByTestId(`mode-${mode.id}`));
      const text = readout('mode-constraint');
      expect(text).toContain(mode.name);
      seen.add(text);
    }
    expect(seen.size).toBe(MODES.length);
  });

  it('lights the stop lamp once the separation distance overruns the cell', () => {
    const { container } = render(<CollaborativeOperationModes />);
    expect(screen.getByTestId('stack-light')).toHaveAttribute('data-lamp', 'run');
    fireEvent.change(robotSlider(), { target: { value: '2' } });
    expect(screen.getByTestId('stack-light')).toHaveAttribute('data-lamp', 'stop');
    expect(stageReadout(container)).toBe('needs 1.83 m, you stand at 1.60 m');
  });

  it('names which modes the current settings satisfy', () => {
    render(<CollaborativeOperationModes />);
    const atDefault = readout('mode-verdict');
    expect(atDefault).toMatch(/contact-force limit/i);
    fireEvent.change(robotSlider(), { target: { value: '2' } });
    fireEvent.change(humanSlider(), { target: { value: '2' } });
    expect(readout('mode-verdict')).toMatch(/Neither continuous-motion mode/i);
  });

  it('restores the default mode and both speeds on reset', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    await user.click(screen.getByTestId('mode-power-force'));
    fireEvent.change(robotSlider(), { target: { value: '1.75' } });
    fireEvent.change(humanSlider(), { target: { value: '0.5' } });
    await user.click(screen.getByRole('button', { name: /reset/i, hidden: true }));
    expect(screen.getByTestId('mode-speed-separation')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(robotSlider()).toHaveValue('1');
    expect(humanSlider()).toHaveValue('1.6');
    expect(readout('separation-readout')).toBe('1.42 m');
  });

  it('exposes the chart description and a described SVG root', () => {
    const { container } = render(<CollaborativeOperationModes />);
    const svg = container.querySelector('svg[role="img"][aria-describedby]');
    expect(svg).not.toBeNull();
    const describedBy = svg!.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)?.textContent ?? '').toMatch(
      /protective separation distance/i,
    );
  });

  it('reads every drawn number from the safety model as the settings change', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    for (const [robot, human] of [['0.25', '1.6'], ['1.75', '0.5'], ['2', '2']] as const) {
      fireEvent.change(robotSlider(), { target: { value: robot } });
      fireEvent.change(humanSlider(), { target: { value: human } });
      const terms = separationTerms(Number(robot), Number(human));
      expect(screen.getByTestId('scanner-zone')).toHaveAttribute(
        'data-metres',
        protectiveSeparationM(Number(robot), Number(human)).toFixed(2),
      );
      expect(screen.getByTestId('gap-riders')).toHaveAttribute(
        'data-terms',
        [terms.robotReactionM, terms.brakingM, terms.marginM, terms.humanTravelM].map((m) => m.toFixed(2)).join(' '),
      );
    }
    await user.click(screen.getByTestId('mode-power-force'));
    expect(screen.queryByTestId('scanner-zone')).not.toBeInTheDocument();
    expect(screen.getByTestId('bump-gauge')).toHaveAttribute('data-newtons', String(Math.round(peakContactForceN(2))));
  });

  it('hands each mode’s guard to one lit part of the cell', async () => {
    const user = userEvent.setup();
    const { container } = render(<CollaborativeOperationModes />);
    const lit = () => container.querySelectorAll('svg [data-lit], svg .iso-line[data-tone="lit"]');
    expect(screen.getByTestId('scanner-zone').querySelectorAll('[data-lit], [data-tone="lit"]').length).toBe(lit().length);
    await user.click(screen.getByTestId('mode-hand-guiding'));
    expect(screen.queryByTestId('scanner-zone')).not.toBeInTheDocument();
    expect(screen.getByTestId('cobot-arm').querySelectorAll('[data-lit]')).toHaveLength(lit().length);
    await user.click(screen.getByTestId('mode-power-force'));
    expect(screen.getByTestId('bump-gauge').querySelectorAll('[data-tone="lit"]')).toHaveLength(lit().length);
    await user.click(screen.getByTestId('mode-monitored-stop'));
    expect(screen.getByTestId('scanner-zone')).toHaveAttribute('data-metres', '1.98');
    expect(screen.getByTestId('stack-light')).toHaveAttribute('data-lamp', 'stop');
  });

  it('runs the cell from a reader control without a pressed state, and stops on demand', async () => {
    const user = userEvent.setup();
    render(<CollaborativeOperationModes />);
    const run = screen.getByTestId('cell-run');
    expect(run).toHaveTextContent('Run the cell');
    expect(run).not.toHaveAttribute('aria-pressed');
    await user.click(run);
    expect(run).toHaveTextContent('Stop the run');
    expect(run).not.toHaveAttribute('aria-pressed');
    await user.click(run);
    expect(run).toHaveTextContent('Run the cell');
  });

  it('under reduced motion jumps a separation run to its end: stopped with the margin left', async () => {
    mockReducedMotion(true);
    const user = userEvent.setup();
    const { container } = render(<CollaborativeOperationModes />);
    await act(async () => {
      await user.click(screen.getByTestId('cell-run'));
    });
    const end = cellRun('speed-separation', 1, 1.6);
    expect(end.trigger?.gapM.toFixed(2)).toBe('0.95');
    expect(stageReadout(container)).toBe('stopped, 0.95 m left between you');
    expect(screen.getByTestId('stack-light')).toHaveAttribute('data-lamp', 'stop');
  });

  it('draws no words inside the drawing', () => {
    const { container } = render(<CollaborativeOperationModes />);
    const svg = container.querySelector('svg[role="img"]')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject, tspan')).toHaveLength(0);
  });
});

describe('CollaborativeOperationModes served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<CollaborativeOperationModes />)}</main></body></html>`;

  it('passes the figure-system check and shows no symbol or bare unit in the main view', () => {
    const { figures, violations } = inspectFigureDocument(html, '/frontier/safety-and-assurance/');
    expect(figures).toEqual(['collaborative-operation-modes']);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
