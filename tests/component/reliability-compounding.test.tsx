import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ReliabilityCompounding } from '@/components/interactive/reliability-compounding';

describe('ReliabilityCompounding', () => {
  it('renders both sliders, the readout, and a reset control', () => {
    render(<ReliabilityCompounding />);
    expect(
      screen.getByRole('slider', { name: /per-step success/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /episode length/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('episode-success-readout')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reset/i }),
    ).toBeInTheDocument();
  });

  it('anchors the default state to 95% over 30 steps', () => {
    render(<ReliabilityCompounding />);
    // 0.95^30 = 21.46...%
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '21.5%',
    );
  });

  it('updates the readout when the per-step slider moves', () => {
    render(<ReliabilityCompounding />);
    const slider = screen.getByRole('slider', { name: /per-step success/i });
    // 99.0% over 30 steps: 0.99^30 = 74.0%.
    fireEvent.change(slider, { target: { value: '99' } });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '74.0%',
    );
  });

  it('updates the readout when the horizon slider moves', () => {
    render(<ReliabilityCompounding />);
    const slider = screen.getByRole('slider', { name: /episode length/i });
    // 95% over 10 steps: 0.95^10 = 59.9%.
    fireEvent.change(slider, { target: { value: '10' } });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '59.9%',
    );
  });

  it('reset restores the default state', async () => {
    const user = userEvent.setup();
    render(<ReliabilityCompounding />);
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '10' },
    });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '21.5%',
    );
    expect(
      screen.getByRole('slider', { name: /episode length/i }),
    ).toHaveValue('30');
  });

  it('honors custom defaults', () => {
    render(<ReliabilityCompounding defaultPerStep={0.99} defaultSteps={30} />);
    // 0.99^30 = 73.97...%
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '74.0%',
    );
  });
});

describe('ReliabilityCompounding with full-range bounds', () => {
  function renderFullRange() {
    return render(
      <ReliabilityCompounding minPerStepPercent={0} maxPerStepPercent={100} />,
    );
  }

  it('exposes the boundary-capable 0-100 slider range', () => {
    renderFullRange();
    const perStep = screen.getByRole('slider', { name: /per-step success/i });
    expect(perStep).toHaveAttribute('min', '0');
    expect(perStep).toHaveAttribute('max', '100');
  });

  it('anchors 95% over 30 steps to about 21%', () => {
    renderFullRange();
    // 0.95^30 = 21.46...%
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '21.5%',
    );
  });

  it('moves the readout monotonically with the per-step slider', () => {
    renderFullRange();
    const slider = screen.getByRole('slider', { name: /per-step success/i });
    const readout = screen.getByTestId('episode-success-readout');
    fireEvent.change(slider, { target: { value: '99' } });
    expect(readout).toHaveTextContent('74.0%');
    fireEvent.change(slider, { target: { value: '90' } });
    // 0.9^30 = 4.24...%
    expect(readout).toHaveTextContent('4.2%');
    fireEvent.change(slider, { target: { value: '95' } });
    expect(readout).toHaveTextContent('21.5%');
  });

  it('tracks the horizon control: 95% over 60 steps reads about 4.6%', () => {
    renderFullRange();
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '60' },
    });
    // 0.95^60 = 4.61...%
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '4.6%',
    );
  });

  it('reads 0.0% at per-step 0% for every horizon', () => {
    renderFullRange();
    fireEvent.change(screen.getByRole('slider', { name: /per-step success/i }), {
      target: { value: '0' },
    });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '0.0%',
    );
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '100' },
    });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '0.0%',
    );
  });

  it('reads 100.0% at per-step 100% for every horizon', () => {
    renderFullRange();
    fireEvent.change(screen.getByRole('slider', { name: /per-step success/i }), {
      target: { value: '100' },
    });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '100.0%',
    );
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '1' },
    });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '100.0%',
    );
  });

  it('reads the per-step value itself at N=1', () => {
    renderFullRange();
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '1' },
    });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '95.0%',
    );
    fireEvent.change(screen.getByRole('slider', { name: /per-step success/i }), {
      target: { value: '73.4' },
    });
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '73.4%',
    );
  });

  it('never renders NaN or an out-of-range readout at control extremes', () => {
    renderFullRange();
    const readout = screen.getByTestId('episode-success-readout');
    const perStep = screen.getByRole('slider', { name: /per-step success/i });
    const horizon = screen.getByRole('slider', { name: /episode length/i });
    const extremes: Array<[string, string]> = [
      ['0', '1'],
      ['0', '100'],
      ['100', '1'],
      ['100', '100'],
      ['50', '1'],
      ['0.1', '100'],
    ];
    for (const [p, n] of extremes) {
      fireEvent.change(perStep, { target: { value: p } });
      fireEvent.change(horizon, { target: { value: n } });
      const text = readout.textContent ?? '';
      expect(text).not.toContain('NaN');
      const value = Number.parseFloat(text);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('reset restores the anchor state after boundary exploration', async () => {
    const user = userEvent.setup();
    renderFullRange();
    fireEvent.change(screen.getByRole('slider', { name: /per-step success/i }), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), {
      target: { value: '100' },
    });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('episode-success-readout')).toHaveTextContent(
      '21.5%',
    );
    expect(
      screen.getByRole('slider', { name: /per-step success/i }),
    ).toHaveValue('95');
    expect(
      screen.getByRole('slider', { name: /episode length/i }),
    ).toHaveValue('30');
  });

  it('keeps the job length beside the presets on a mount without a preset set', () => {
    const { container } = render(<ReliabilityCompounding />);
    const fold = container.querySelector('[data-figure-fold="adjust"]')!;
    const ranges = [...container.querySelectorAll('input[type="range"]')];
    expect(ranges.map((input) => input.id.endsWith('-rc-steps'))).toEqual([true, false]);
    expect(fold.contains(ranges[0])).toBe(false);
    expect(fold.contains(ranges[1])).toBe(true);
  });

  it('moves the job length after the per-step slider on a mount with a preset set', () => {
    // The per-step presets fix the 30-step job, so the first slider a reader
    // (or a chart-description check) reaches is the per-step one, and the
    // description follows it and returns to its default text on reset.
    const { container } = render(
      <ReliabilityCompounding presets="per-step-thresholds" descriptionVariant="reliability" />,
    );
    const fold = container.querySelector('[data-figure-fold="adjust"]')!;
    const ranges = [...container.querySelectorAll('input[type="range"]')];
    expect(ranges.map((input) => input.id.endsWith('-rc-per-step'))).toEqual([true, false]);
    expect(ranges.every((input) => fold.contains(input))).toBe(true);
    const description = () =>
      container.querySelector('[data-chart-description]')?.textContent ?? '';
    const initial = description();
    expect(initial).toContain('95.0 percent per-step policy yields 21.5% episode success at 30 steps');
    expect(initial).toMatch(/ In the drawing, 21 of 100 marbles reach the finish tray\.$/);
    fireEvent.change(ranges[0], { target: { value: '90' } });
    expect(description()).toContain('90.0 percent per-step policy yields 4.2% episode success at 30 steps');
    expect(description()).toMatch(/ In the drawing, 4 of 100 marbles reach the finish tray\.$/);
    fireEvent.change(ranges[0], { target: { value: '95' } });
    expect(description()).toBe(initial);
  });

  it('counts the finish tray in every description variant, as the drawing labels it', () => {
    for (const variant of ['home', 'prediction', 'evaluation', 'reliability'] as const) {
      const { container, unmount } = render(<ReliabilityCompounding descriptionVariant={variant} defaultSteps={14} />);
      const finished = container.querySelector('[data-testid="finish-tray"]')!.getAttribute('data-marbles');
      expect(finished).toBe('49');
      const label = screen.getByRole('img', { name: /marble run/ }).getAttribute('aria-label');
      expect(label).toContain(`${finished} of 100 marbles reach the finish tray`);
      const description = container.querySelector('[data-chart-description]')?.textContent ?? '';
      expect(description).toContain('48.8%');
      expect(description).toMatch(new RegExp(`\\. In the drawing, ${finished} of 100 marbles reach the finish tray\\.$`));
      unmount();
    }
  });
});

describe('ReliabilityCompounding drawn as a marble run', () => {
  const finishedOf = (container: HTMLElement) =>
    Number(container.querySelector('[data-testid="finish-tray"]')!.getAttribute('data-marbles'));
  const rejectedOf = (container: HTMLElement) =>
    Number(container.querySelector('[data-testid="reject-tray"]')!.getAttribute('data-marbles'));

  it('arms one trapdoor per step and fills the finish tray with the readout in whole jobs', () => {
    const { container } = render(<ReliabilityCompounding minPerStepPercent={0} maxPerStepPercent={100} />);
    const armed = () => container.querySelectorAll('[data-gate="armed"]').length;
    const pinned = () => container.querySelectorAll('[data-gate="pinned"]').length;
    expect(armed()).toBe(30);
    expect(pinned()).toBe(70);
    // 0.95^30 = 21.5%: 21 of 100 marbles finish, 79 drop.
    expect(finishedOf(container)).toBe(21);
    expect(rejectedOf(container)).toBe(79);
    const cases: Array<[string, string, number]> = [['99', '30', 74], ['95', '14', 49], ['95', '100', 1], ['99.9', '30', 97], ['0', '1', 0], ['100', '100', 100]];
    for (const [p, n, finished] of cases) {
      fireEvent.change(screen.getByRole('slider', { name: /per-step success/i }), { target: { value: p } });
      fireEvent.change(screen.getByRole('slider', { name: /episode length/i }), { target: { value: n } });
      expect(armed(), `${p}% over ${n}`).toBe(Number(n));
      expect(finishedOf(container), `${p}% over ${n}`).toBe(finished);
      expect(finishedOf(container) + rejectedOf(container)).toBe(100);
      // The marbles drawn in each tray are the counts.
      expect(container.querySelectorAll('[data-testid="finish-tray"] > g')).toHaveLength(finished);
      expect(container.querySelectorAll('[data-testid="reject-tray"] > g')).toHaveLength(100 - finished);
    }
  });

  it('keeps both mounts on one board: 49 of 100 at 14 steps, 21 at the 30-step preset', () => {
    const evaluation = render(<ReliabilityCompounding defaultPerStep={0.95} defaultSteps={14} minPerStepPercent={0} maxPerStepPercent={100} descriptionVariant="evaluation" />);
    expect(finishedOf(evaluation.container)).toBe(49);
    expect(evaluation.container.querySelectorAll('[data-gate="armed"]')).toHaveLength(14);
    evaluation.unmount();
    const reliability = render(<ReliabilityCompounding minPerStepPercent={0} maxPerStepPercent={100} presets="per-step-thresholds" descriptionVariant="reliability" />);
    fireEvent.click(screen.getByRole('button', { name: '99 in 100' }));
    expect(finishedOf(reliability.container)).toBe(74);
    fireEvent.click(screen.getByRole('button', { name: '999 in 1,000' }));
    expect(finishedOf(reliability.container)).toBe(97);
  });

  it('draws no words: the board carries no text, title, description or foreign object', () => {
    const { container } = render(<ReliabilityCompounding />);
    const svg = container.querySelector('svg.iso-svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect((svg.textContent ?? '').trim()).toBe('');
    // The one lit part: the finished jobs' marbles.
    expect(svg.querySelectorAll('[data-testid="finish-tray"] [data-lit]')).toHaveLength(21);
    expect(svg.querySelectorAll('[data-testid="reject-tray"] [data-lit]')).toHaveLength(0);
  });

  it('starts a run from a labelled button with no pressed state, and stops it', () => {
    render(<ReliabilityCompounding />);
    const button = screen.getByTestId('marble-run');
    expect(button).toHaveTextContent('Roll the marbles');
    expect(button).toHaveAttribute('data-brand-control-id', 'control:secondary-action');
    expect(button).not.toHaveAttribute('aria-pressed');
    fireEvent.click(button);
    expect(button).toHaveTextContent('Stop the run');
    expect(button).not.toHaveAttribute('aria-pressed');
    fireEvent.click(button);
    expect(button).toHaveTextContent('Roll the marbles');
    // A setting changed mid-run starts the run again on the new board; Reset ends it.
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: '99 in 100' }));
    expect(button).toHaveTextContent('Stop the run');
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(button).toHaveTextContent('Roll the marbles');
  });

  it('under reduced motion a run shows its end, which is the still pose', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      const { container } = render(<ReliabilityCompounding />);
      fireEvent.click(screen.getByTestId('marble-run'));
      expect(screen.getByTestId('marble-run')).toHaveTextContent('Roll the marbles');
      expect(finishedOf(container)).toBe(21);
    } finally {
      window.matchMedia = original;
    }
  });
});
