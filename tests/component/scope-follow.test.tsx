import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CAMERA_MODES, ScopeFollow, readoutFor } from '@/components/interactive/scope-follow';
import { PEGS, STILL_POSE, STILL_TIP, TASK_PEGS, TASK_SECONDS, inView } from '@/components/iso/figures/lap-trainer';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const reduceMotion = () =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));

describe('ScopeFollow', () => {
  it('reads out in words, from the same rule that moves the scope', () => {
    expect(readoutFor('follow', true)).toBe('Follows the tip · tip in view · Level 1');
    expect(readoutFor('placed', false)).toBe('Held still · tip out of view · Level 0');
    expect(CAMERA_MODES.map((mode) => mode.label)).toEqual(['Surgeon places it', 'Follows the tip']);
    expect(inView(STILL_POSE.aim, STILL_POSE.tip)).toBe(true);
  });

  it('draws the still pose: following on, the lit pool round the tip, no words in the drawing', () => {
    render(<ScopeFollow />);
    expect(screen.getByText('At Level 1 the robot takes over only the camera')).toBeInTheDocument();
    const drawing = screen.getByTestId('scope-drawing');
    expect(drawing).toHaveAttribute('data-mode', 'follow');
    expect(drawing).toHaveAttribute('data-seen', 'yes');
    expect(drawing).toHaveAttribute('data-tip', `${STILL_TIP[0]},${STILL_TIP[1]}`);
    const stage = screen.getByTestId('scope-stage-frame');
    expect(stage.querySelector('[data-readout]')).toHaveTextContent('Follows the tip · tip in view · Level 1');
    expect(stage).toHaveTextContent(/Schematic/);
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit part is the scope's pool of light on the board.
    expect(svg.querySelectorAll('[data-lit]')).toHaveLength(0);
    expect(svg.querySelectorAll('[data-tone="lit"]')).toHaveLength(1);
    expect(svg.querySelector('[data-part="pool"] [data-tone="lit"]')).not.toBeNull();
    expect(svg.getAttribute('aria-label')).toMatch(/keeps the scope aimed at the right instrument tip/);
  });

  it('describes the drawing with the method paragraph that explains the trainer', () => {
    render(<ScopeFollow />);
    const svg = screen.getByTestId('scope-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      /^The drawing is a box trainer on a bench\. Two instruments, the surgeon's hands, enter through ports/,
    );
  });

  it('holds the scope still when the surgeon places it, and the drill takes the tip out of view and back', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<ScopeFollow />);
    const placed = screen.getByTestId('scope-mode-placed');
    fireEvent.click(placed);
    expect(placed).toHaveAttribute('aria-pressed', 'true');
    const drawing = screen.getByTestId('scope-drawing');
    const aim = drawing.getAttribute('data-aim');
    expect(screen.getByTestId('scope-stage-frame').querySelector('[data-readout]')).toHaveTextContent('Held still · tip in view · Level 0');
    const run = screen.getByTestId('scope-run');
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the drill');
    expect(run).not.toHaveAttribute('aria-pressed');
    // Halfway through the second move the tip is between pegs, far from the held view.
    await act(async () => {
      vi.advanceTimersByTime(2600);
    });
    expect(drawing).toHaveAttribute('data-seen', 'no');
    expect(drawing.getAttribute('data-aim')).toBe(aim);
    expect(screen.getByTestId('scope-stage-frame').querySelector('[data-readout]')).toHaveTextContent('Held still · tip out of view · Level 0');
    await act(async () => {
      vi.advanceTimersByTime(TASK_SECONDS * 1000);
    });
    // The drill ends back on the peg it started from, inside the held view, and the run button keeps no pressed state.
    expect(run).toHaveTextContent('Run the drill');
    expect(drawing).toHaveAttribute('data-tip', `${STILL_TIP[0]},${STILL_TIP[1]}`);
    expect(drawing).toHaveAttribute('data-seen', 'yes');
    expect(drawing.getAttribute('data-aim')).toBe(aim);
  });

  it('ends a followed drill on the very pose it started from', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { container } = render(<ScopeFollow />);
    const drawing = screen.getByTestId('scope-drawing');
    const before = container.innerHTML;
    fireEvent.click(screen.getByTestId('scope-run'));
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(container.innerHTML).not.toBe(before);
    await act(async () => {
      vi.advanceTimersByTime(TASK_SECONDS * 1000 + 3000);
    });
    expect(screen.getByTestId('scope-run')).toHaveTextContent('Run the drill');
    expect(drawing).toHaveAttribute('data-aim', `${STILL_POSE.aim[0]},${STILL_POSE.aim[1]}`);
    expect(container.innerHTML).toBe(before);
  });

  it('stops the drill mid-run back on the frame it started from, under both motion settings and in both camera modes', async () => {
    for (const calm of [false, true]) {
      for (const mode of ['follow', 'placed'] as const) {
        vi.unstubAllGlobals();
        if (calm) reduceMotion();
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
        const { container, unmount } = render(<ScopeFollow />);
        fireEvent.click(screen.getByTestId(`scope-mode-${mode}`));
        await act(async () => {
          vi.advanceTimersByTime(3000);
        });
        const before = container.innerHTML;
        const drawing = screen.getByTestId('scope-drawing');
        const start = { tip: drawing.getAttribute('data-tip'), aim: drawing.getAttribute('data-aim') };
        const run = screen.getByTestId('scope-run');
        fireEvent.click(run);
        await act(async () => {
          vi.advanceTimersByTime((TASK_SECONDS * 1000) / 2);
        });
        // Mid-drill the tip is away from where it started.
        expect(drawing.getAttribute('data-tip'), `${mode}, calm ${calm}`).not.toBe(start.tip);
        fireEvent.click(run);
        expect(run).toHaveTextContent('Run the drill');
        expect(drawing).toHaveAttribute('data-tip', start.tip!);
        expect(drawing).toHaveAttribute('data-aim', start.aim!);
        await act(async () => {
          vi.advanceTimersByTime(3000);
        });
        expect(container.innerHTML, `${mode}, calm ${calm}`).toBe(before);
        unmount();
        vi.useRealTimers();
      }
    }
  });

  it('follows the tip through the drill when following is on', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<ScopeFollow />);
    fireEvent.click(screen.getByTestId('scope-run'));
    const drawing = screen.getByTestId('scope-drawing');
    for (let step = 0; step < 16; step++) {
      await act(async () => {
        vi.advanceTimersByTime(400);
      });
      expect(drawing).toHaveAttribute('data-seen', 'yes');
    }
    // Switching to "Surgeon places it" mid-drill freezes the scope where it is.
    fireEvent.click(screen.getByTestId('scope-mode-placed'));
    const aim = drawing.getAttribute('data-aim');
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(drawing.getAttribute('data-aim')).toBe(aim);
  });

  it('jumps under reduced motion: the drill steps peg to peg and back, following straight onto the tip', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    reduceMotion();
    const { container } = render(<ScopeFollow />);
    const before = container.innerHTML;
    const drawing = screen.getByTestId('scope-drawing');
    const stops = [STILL_TIP, ...TASK_PEGS.map((index) => PEGS[index]!), STILL_TIP].map(([x, y]) => `${x},${y}`);
    fireEvent.click(screen.getByTestId('scope-run'));
    expect(screen.getByTestId('scope-run')).toHaveTextContent('Stop the drill');
    const visited: string[] = [];
    for (let elapsed = 0; elapsed < TASK_SECONDS * 1000 + 500; elapsed += 100) {
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      const tip = drawing.getAttribute('data-tip')!;
      // Every frame shows a stop, never a tip between two, and the scope sits right on it.
      expect(stops).toContain(tip);
      expect(drawing).toHaveAttribute('data-aim', tip);
      if (visited.at(-1) !== tip) visited.push(tip);
    }
    expect(visited).toEqual(stops);
    expect(screen.getByTestId('scope-run')).toHaveTextContent('Run the drill');
    expect(container.innerHTML).toBe(before);
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<ScopeFollow />);
    expect(html).toContain('data-figure-frame="scope-follow"');
    expect(html).toContain('Follows the tip · tip in view · Level 1');
  });
});
