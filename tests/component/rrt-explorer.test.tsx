import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RrtExplorer } from '@/components/interactive/rrt-explorer';
import { ANNOTATION_ARROW } from '@/components/motion/chart';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits, mainViewText } from '@/lib/figure-main-view';
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

function toStart() {
  fireEvent.change(
    screen.getByRole('slider', { name: /exploration iteration/i }),
    { target: { value: '0' } },
  );
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
      screen.getByRole('button', { name: /grow the tree/i }),
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

  it('opens on the finished tree with the found path lit', () => {
    render(<RrtExplorer />);
    expect(iterationText()).toBe(`${TOTAL} / ${TOTAL}`);
    expect(nodeText()).toBe(String(TOTAL + 1));
    expect(edgeCount()).toBe(TOTAL);
    expect(screen.getByTestId('rrt-path')).toBeInTheDocument();
    expect(screen.getByTestId('rrt-status-readout')).toHaveTextContent(
      new RegExp(`goal reached at iteration ${GOAL_ITERATION}`, 'i'),
    );
  });

  it('scrubbed to the start, only the start node shows and there is no path', () => {
    render(<RrtExplorer />);
    toStart();
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
    toStart();
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
    fireEvent.click(screen.getByRole('button', { name: /grow the tree/i }));
    expect(
      screen.getByRole('button', { name: /pause the growth/i }),
    ).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const grown = Number.parseInt(nodeText(), 10);
    expect(grown).toBeGreaterThan(1);
    fireEvent.click(
      screen.getByRole('button', { name: /pause the growth/i }),
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
    fireEvent.click(screen.getByRole('button', { name: /grow the tree/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /grow the tree/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /grow the tree/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /grow the tree/i }));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(iterationText()).toBe(`${TOTAL} / ${TOTAL}`);
    expect(screen.getByTestId('rrt-path')).toBeInTheDocument();
  });

  it('reset returns the scene to its opening state, the finished tree', async () => {
    const user = userEvent.setup();
    render(<RrtExplorer />);
    toStart();
    await user.click(screen.getByRole('button', { name: /step forward/i }));
    await user.click(screen.getByRole('button', { name: /step forward/i }));
    expect(iterationText()).toBe(`2 / ${TOTAL}`);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(iterationText()).toBe(`${TOTAL} / ${TOTAL}`);
    expect(nodeText()).toBe(String(TOTAL + 1));
    expect(edgeCount()).toBe(TOTAL);
    expect(screen.getByTestId('rrt-path')).toBeInTheDocument();
  });

  it('growing from the finished tree replays the growth from the start', () => {
    vi.useFakeTimers();
    render(<RrtExplorer />);
    fireEvent.click(screen.getByRole('button', { name: /grow the tree/i }));
    expect(iterationText()).toBe(`0 / ${TOTAL}`);
    expect(screen.queryByTestId('rrt-path')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(iterationText()).toBe(`6 / ${TOTAL}`);
    // The smooth replay takes under six seconds and ends on the lit path.
    act(() => {
      vi.advanceTimersByTime(4_700);
    });
    expect(iterationText()).toBe(`${TOTAL} / ${TOTAL}`);
    expect(screen.getByTestId('rrt-path')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grow the tree/i })).toBeEnabled();
  });

  it('points its one stage note at the path, the newest branch, or the start', () => {
    const { container } = render(<RrtExplorer />);
    const notes = () => container.querySelectorAll('[data-figure-annotation]');
    const note = () => [...notes()[0].querySelectorAll('tspan')].map((t) => t.textContent).join(' ');
    // The arrowhead's tip stops ANNOTATION_ARROW.gap short of the point the note names.
    const gapTo = (target: number[]) => {
      const points = notes()[0].querySelector('[data-annotation-pointer="arrow"] polygon')!.getAttribute('points')!;
      const [tx, ty] = points.split(' ')[0].split(',').map(Number);
      return Math.hypot(tx - target[0], ty - target[1]);
    };
    const stage = (p: { x: number; y: number }) => [Number((10 + p.x * 3.2).toFixed(2)), Number((44 + p.y * 3.2).toFixed(2))];
    expect(notes()).toHaveLength(1);
    expect(note()).toBe('The first branch to reach the goal becomes the path');
    const top = RESULT.path.reduce((a, p) => (p.y < a.y ? p : a));
    expect(gapTo(stage(top))).toBeCloseTo(ANNOTATION_ARROW.gap, 5);
    fireEvent.change(screen.getByRole('slider', { name: /exploration iteration/i }), { target: { value: '40' } });
    expect(note()).toBe('New branches reach toward random spots, so they fill open space first');
    expect(gapTo(stage(RESULT.nodes[40]))).toBeCloseTo(ANNOTATION_ARROW.gap, 5);
    toStart();
    expect(note()).toBe('The tree grows from the start');
    expect(gapTo(stage(RRT_SCENE.start))).toBeCloseTo(ANNOTATION_ARROW.gap, 5);
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
    toStart();
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

const foldOf = (container: HTMLElement, kind: 'adjust' | 'method') =>
  container.querySelector(`details[data-figure-fold="${kind}"]`) as HTMLElement;

describe('RrtExplorer main view', () => {
  beforeEach(() => mockReducedMotion(false));

  it('leads with the kicker, the takeaway headline, a status line and a one-sentence caption', () => {
    const { container } = render(<RrtExplorer />);
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Rapidly-exploring random tree (RRT)');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Random branches feel their way around obstacles to the goal',
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "Rather than check every route, the robot's search grows random branches into open space until one reaches the goal.",
    );
    expect(container.querySelector('[data-figure-status]')).toHaveTextContent(
      'Illustrative: one run on a made-up map',
    );
  });

  it('shows the grow button and the growth slider, and keeps the rest in the folds', () => {
    const { container } = render(<RrtExplorer />);
    const adjust = foldOf(container, 'adjust');
    const controls = container.querySelector('[data-figure-controls]') as HTMLElement;
    const visible = Array.from(controls.querySelectorAll('input, button')).filter((el) => !adjust.contains(el));
    expect(visible).toEqual([screen.getByTestId('rrt-grow'), screen.getByRole('slider', { name: /^How far the search has grown: / })]);
    expect(controls).toHaveTextContent('Grow the treeHow far the search has grownbeginningpath found');
    expect(adjust).toContainElement(screen.getByRole('button', { name: 'Step forward' }));
    expect(adjust).toContainElement(screen.getByRole('button', { name: 'Reset' }));
    for (const id of ['rrt-iteration-readout', 'rrt-node-readout', 'rrt-status-readout', 'rrt-path-readout']) {
      expect(adjust).toContainElement(screen.getByTestId(id));
    }
    const method = foldOf(container, 'method');
    expect(method).toHaveTextContent('Each sampling attempt selects the goal with probability 1.5%');
    expect(method).toHaveTextContent('Each accepted step grows from the tree node nearest a random sample');
    expect(method).toHaveTextContent(`first reaches the goal at iteration ${GOAL_ITERATION}`);
    expect(method).toContainElement(container.querySelector('[data-chart-description]') as HTMLElement);
  });
});

describe('RrtExplorer served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<RrtExplorer />)}</main></body></html>`;

  it('serves the finished tree and passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/motion-planning/');
    expect(figures).toEqual(['rrt-explorer']);
    expect(violations.map(formatViolation)).toEqual([]);
    expect(html).toContain('data-testid="rrt-path"');
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
    const { lines } = mainViewText(frame);
    expect(lines).toContain('Start');
    expect(lines).toContain('Goal area');
    expect(lines.some((line) => /units|iteration|nodes/.test(line))).toBe(false);
  });
});
