import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RrtExplorer } from '@/components/interactive/rrt-explorer';
import { RRT_SCENE, buildRrt } from '@/lib/rrt';

const RESULT = buildRrt(RRT_SCENE);
const TOTAL = RESULT.nodes.length - 1;
const GOAL_ITERATION = RESULT.goalNodeId ?? 0;

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

function mockReducedMotionLive(initial: boolean) {
  let matches = initial;
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const addEventListener = vi.fn(
    (_type: string, handler: (event: { matches: boolean }) => void) => {
      listeners.add(handler);
    },
  );
  const removeEventListener = vi.fn(
    (_type: string, handler: (event: { matches: boolean }) => void) => {
      listeners.delete(handler);
    },
  );
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener,
    removeEventListener,
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    addEventListener,
    removeEventListener,
    setMatches(next: boolean) {
      matches = next;
      for (const listener of listeners) listener({ matches: next });
    },
  };
}

function iterationText() {
  return screen.getByTestId('rrt-iteration-readout').textContent ?? '';
}

function nodeText() {
  return screen.getByTestId('rrt-node-readout').textContent ?? '';
}

function edgeCount() {
  return screen.getByTestId('rrt-tree').querySelectorAll('line').length;
}

describe('RrtExplorer', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the scene, controls, and readouts in the initial state', () => {
    render(<RrtExplorer />);
    expect(screen.getByTestId('rrt-scene')).toBeInTheDocument();
    expect(screen.getByTestId('rrt-start')).toBeInTheDocument();
    expect(screen.getByTestId('rrt-goal')).toBeInTheDocument();
    expect(
      screen.getAllByTestId(/^rrt-obstacle/).length,
    ).toBe(RRT_SCENE.obstacles.length);
    expect(
      screen.getByRole('button', { name: /run the exploration/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /step forward/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reset/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /exploration iteration/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('rrt-iteration-readout')).toBeInTheDocument();
    expect(screen.getByTestId('rrt-node-readout')).toBeInTheDocument();
    expect(screen.getByTestId('rrt-status-readout')).toBeInTheDocument();
    // The SVG is labeled for assistive tech.
    expect(screen.getByTestId('rrt-scene')).toHaveAttribute('role', 'img');
    expect(screen.getByTestId('rrt-scene')).toHaveAttribute('aria-label');
  });

  it('starts with only the start node visible and no path', () => {
    render(<RrtExplorer />);
    expect(iterationText()).toBe(`0 / ${TOTAL}`);
    expect(nodeText()).toBe('1');
    expect(edgeCount()).toBe(0);
    expect(screen.queryByTestId('rrt-path')).toBeNull();
    expect(screen.getByTestId('rrt-status-readout')).toHaveTextContent(
      /not started/i,
    );
  });

  it('stepping forward grows the tree one iteration at a time', async () => {
    const user = userEvent.setup();
    render(<RrtExplorer />);
    const step = screen.getByRole('button', { name: /step forward/i });
    await user.click(step);
    expect(iterationText()).toBe(`1 / ${TOTAL}`);
    expect(nodeText()).toBe('2');
    expect(edgeCount()).toBe(1);
    await user.click(step);
    await user.click(step);
    expect(iterationText()).toBe(`3 / ${TOTAL}`);
    expect(edgeCount()).toBe(3);
    expect(screen.getByTestId('rrt-status-readout')).toHaveTextContent(
      /exploring/i,
    );
  });

  it('the slider scrubs the growth directly', () => {
    render(<RrtExplorer />);
    fireEvent.change(
      screen.getByRole('slider', { name: /exploration iteration/i }),
      { target: { value: '40' } },
    );
    expect(iterationText()).toBe(`40 / ${TOTAL}`);
    expect(nodeText()).toBe('41');
    expect(edgeCount()).toBe(40);
  });

  it('running advances the tree on an interval and pause halts it', () => {
    vi.useFakeTimers();
    render(<RrtExplorer />);
    fireEvent.click(screen.getByRole('button', { name: /run the exploration/i }));
    expect(
      screen.getByRole('button', { name: /pause the exploration/i }),
    ).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const grown = Number.parseInt(nodeText(), 10);
    expect(grown).toBeGreaterThan(1);
    fireEvent.click(
      screen.getByRole('button', { name: /pause the exploration/i }),
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(Number.parseInt(nodeText(), 10)).toBe(grown);
  });

  it('under reduced motion, running advances in discrete jumps', () => {
    mockReducedMotion(true);
    vi.useFakeTimers();
    render(<RrtExplorer />);
    fireEvent.click(screen.getByRole('button', { name: /run the exploration/i }));
    act(() => {
      vi.advanceTimersByTime(700);
    });
    const after = Number.parseInt(nodeText(), 10);
    // Two slow ticks of 25 nodes each, not smooth per-frame growth.
    expect(after).toBe(51);
  });

  it('tracks reduced motion before playback and removes its listener on unmount', () => {
    vi.useFakeTimers();
    const media = mockReducedMotionLive(false);
    const { unmount } = render(<RrtExplorer />);
    act(() => {
      media.setMatches(true);
    });
    fireEvent.click(screen.getByRole('button', { name: /run the exploration/i }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(iterationText()).toBe(`0 / ${TOTAL}`);
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(iterationText()).toBe(`25 / ${TOTAL}`);
    unmount();
    expect(media.addEventListener).toHaveBeenCalledOnce();
    expect(media.removeEventListener).toHaveBeenCalledWith(
      'change',
      media.addEventListener.mock.calls[0][1],
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rebuilds playback at the coarse cadence when reduced motion changes mid-run', () => {
    vi.useFakeTimers();
    const media = mockReducedMotionLive(false);
    render(<RrtExplorer />);
    const readout = screen.getByTestId('rrt-iteration-readout');
    fireEvent.click(screen.getByRole('button', { name: /run the exploration/i }));
    expect(readout).toHaveAttribute('data-playback-cadence', 'smooth');
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(iterationText()).toBe(`12 / ${TOTAL}`);
    act(() => {
      media.setMatches(true);
    });
    expect(readout).toHaveAttribute('data-playback-cadence', 'coarse');
    const frozen = iterationText();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(iterationText()).toBe(frozen);
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(iterationText()).toBe(`37 / ${TOTAL}`);
  });

  it('scrubbing past the goal iteration highlights the path and reports its length', () => {
    render(<RrtExplorer />);
    fireEvent.change(
      screen.getByRole('slider', { name: /exploration iteration/i }),
      { target: { value: String(TOTAL) } },
    );
    expect(screen.getByTestId('rrt-status-readout')).toHaveTextContent(
      new RegExp(`goal reached at iteration ${GOAL_ITERATION}`, 'i'),
    );
    const path = screen.getByTestId('rrt-path');
    expect(path).toBeInTheDocument();
    // The path is a visible signal-blue polyline through start and goal.
    expect(path.tagName.toLowerCase()).toBe('polyline');
    expect(screen.getByTestId('rrt-path-readout')).toHaveTextContent(
      /^\d+\.\d units$/,
    );
  });

  it('running to completion stops on its own at the final iteration', () => {
    vi.useFakeTimers();
    render(<RrtExplorer />);
    fireEvent.click(screen.getByRole('button', { name: /run the exploration/i }));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(iterationText()).toBe(`${TOTAL} / ${TOTAL}`);
    expect(screen.getByTestId('rrt-path')).toBeInTheDocument();
  });

  it('reset returns the scene to its initial state', async () => {
    const user = userEvent.setup();
    render(<RrtExplorer />);
    await user.click(screen.getByRole('button', { name: /step forward/i }));
    await user.click(screen.getByRole('button', { name: /step forward/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(iterationText()).toBe(`0 / ${TOTAL}`);
    expect(nodeText()).toBe('1');
    expect(edgeCount()).toBe(0);
    expect(screen.queryByTestId('rrt-path')).toBeNull();
  });

  it('clamps stepping at the final iteration', async () => {
    const user = userEvent.setup();
    render(<RrtExplorer />);
    fireEvent.change(
      screen.getByRole('slider', { name: /exploration iteration/i }),
      { target: { value: String(TOTAL) } },
    );
    const step = screen.getByRole('button', { name: /step forward/i });
    expect(step).toBeDisabled();
    await user.click(step);
    expect(iterationText()).toBe(`${TOTAL} / ${TOTAL}`);
  });
});

  it('derives the path clause from whether the goal is reached', () => {
    const { container } = render(<RrtExplorer />);
    const read = () =>
      container.querySelector('[data-chart-description]')?.textContent ?? '';
    // Before the goal: the length genuinely does not exist yet.
    expect(read()).toMatch(/n\/a/);
    expect(read()).toMatch(/until a branch first reaches the goal/);
    // Scrub to the end: a path exists, so the sentence must report its
    // length without asserting the length is still pending.
    fireEvent.change(
      screen.getByRole('slider', { name: /exploration iteration/i }),
      { target: { value: String(TOTAL) } },
    );
    expect(screen.getByTestId('rrt-path')).toBeInTheDocument();
    expect(read()).not.toMatch(/n\/a/);
    expect(read()).not.toMatch(/until a branch first reaches the goal/);
    const lengthText = screen.getByTestId('rrt-path-readout').textContent ?? '';
    expect(read()).toContain(lengthText.split(' ')[0]);
  });
