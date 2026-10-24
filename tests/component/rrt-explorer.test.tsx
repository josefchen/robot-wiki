import { act, fireEvent, render, screen } from '@testing-library/react';
import { seriesEncodingViolations, seriesEncodings, seriesNames } from '../helpers/series-encoding';
import userEvent from '@testing-library/user-event';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RrtExplorer, readoutFor } from '@/components/interactive/rrt-explorer';
import { CELL, P, PARK, BOARD_Z, inkPoint, standingParts, gantryParts } from '@/components/iso/figures/rrt-plotter';
import { depthOf, iso } from '@/components/iso/iso-kit';
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
    // Read afresh: the readout is written anew each time the growth starts or stops.
    const readout = () => screen.getByTestId('rrt-iteration-readout');
    fireEvent.click(screen.getByRole('button', { name: /grow the tree/i }));
    expect(readout()).toHaveAttribute('data-playback-cadence', 'smooth');
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(iterationText()).toBe(`12 / ${TOTAL}`);
    act(() => {
      media.setMatches(true);
    });
    expect(readout()).toHaveAttribute('data-playback-cadence', 'coarse');
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
    // The path is inked in the lit pen, one line from the start peg to the goal.
    const ink = path.querySelector('path.iso-line[data-tone="lit"]')!;
    const points = [...ink.getAttribute('d')!.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const near = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.15;
    expect(near(points[0], inkPoint(RRT_SCENE.start))).toBe(true);
    expect(near(points[points.length - 1], inkPoint(RESULT.path[RESULT.path.length - 1]))).toBe(true);
    expect(points).toHaveLength(RESULT.path.length);
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

  it('keeps its live readout quiet while the tree grows and polite once it stops', () => {
    vi.useFakeTimers();
    render(<RrtExplorer />);
    const live = () => screen.getByTestId('rrt-node-readout').closest('[data-figure-readout]');
    expect(live()).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(screen.getByRole('button', { name: /grow the tree/i }));
    expect(live()).toHaveAttribute('aria-live', 'off');
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(iterationText()).toBe(`${TOTAL} / ${TOTAL}`);
    expect(live()).toHaveAttribute('aria-live', 'polite');
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

  it('points its one stage note at the path, the newest branch, or the start, where the pen stands', () => {
    const { container } = render(<RrtExplorer />);
    const hint = () => container.querySelector('[data-anatomy-hint]')?.textContent;
    const pen = () => screen.getByTestId('rrt-pen').getAttribute('data-at')!.split(' ').map(Number);
    const at = (p: { x: number; y: number }) => [Number(p.x.toFixed(2)), Number(p.y.toFixed(2))];
    expect(hint()).toBe('Lit: the first branch to reach the goal');
    // With the path inked, the gantry parks past the map's right edge so the whole path shows.
    expect(pen()).toEqual(at(PARK));
    expect(PARK.x).toBeGreaterThan(RRT_SCENE.width);
    fireEvent.change(screen.getByRole('slider', { name: /exploration iteration/i }), { target: { value: '40' } });
    expect(hint()).toBe('New branches reach toward random spots, so they fill open space first');
    expect(pen()).toEqual(at(RESULT.nodes[40]));
    toStart();
    expect(hint()).toBe('The tree grows from the start');
    expect(pen()).toEqual(at(RRT_SCENE.start));
  });

  it('reads the growth in plain words on the stage', () => {
    const { container } = render(<RrtExplorer />);
    expect(container.querySelector('[data-readout]')?.textContent).toBe(`${TOTAL} branches · path found`);
    fireEvent.change(screen.getByRole('slider', { name: /exploration iteration/i }), { target: { value: '1' } });
    expect(container.querySelector('[data-readout]')?.textContent).toBe('1 branch · still exploring');
    expect(readoutFor(0, false)).toBe('No branches yet');
  });

  it('clamps stepping at the final iteration', async () => {
    const user = userEvent.setup();
    render(<RrtExplorer />);
    fireEvent.change(
      screen.getByRole('slider', { name: /exploration iteration/i }),
      { target: { value: String(TOTAL - 1) } },
    );
    const step = screen.getByRole('button', { name: /step forward/i });
    expect(step).not.toHaveAttribute('aria-disabled');
    await user.click(step);
    expect(iterationText()).toBe(`${TOTAL} / ${TOTAL}`);
    // Unavailable at the end but still focusable, so the last step keeps keyboard focus.
    expect(step).toHaveAttribute('aria-disabled', 'true');
    expect(step).toHaveFocus();
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

describe('planning plotter model', () => {
  it('stands every block where the scene puts its obstacle, one board cell per planning unit', () => {
    const pieces = standingParts(RRT_SCENE.start);
    expect(pieces.filter(({ id }) => id.startsWith('obstacle-'))).toHaveLength(RRT_SCENE.obstacles.length);
    expect(pieces.map(({ id }) => id)).toEqual(expect.arrayContaining(['start', 'goal', 'pen-nib']));
    // A branch's ink runs on the board's face between its two nodes.
    const edge = RESULT.nodes[10];
    const parent = RESULT.nodes[edge.parent];
    expect(inkPoint(edge)).toEqual(iso([edge.x * CELL, edge.y * CELL, BOARD_Z], P));
    expect(inkPoint(parent)).toEqual(iso([parent.x * CELL, parent.y * CELL, BOARD_Z], P));
  });

  it("paints the pen's nib after every block in front of which it stands, and before the rest", () => {
    for (const node of [RESULT.nodes[40], RESULT.nodes[200], RRT_SCENE.start, RESULT.path[RESULT.path.length - 1]]) {
      const pieces = standingParts(node);
      const nib = pieces.findIndex(({ id }) => id === 'pen-nib');
      const depth = depthOf([node.x * CELL, node.y * CELL, 0], P);
      for (const [k, piece] of pieces.entries()) {
        if (!piece.id.startsWith('obstacle-')) continue;
        const o = RRT_SCENE.obstacles[Number(piece.id.slice(9))];
        const centre = o.kind === 'circle' ? [o.x, o.y] : [o.x + o.w / 2, o.y + o.h / 2];
        const blockDepth = depthOf([centre[0] * CELL, centre[1] * CELL, 0], P);
        // A block whose centre is well in front of the nib paints after it, one well behind before it.
        if (blockDepth > depth + 60) expect(k).toBeGreaterThan(nib);
        if (blockDepth < depth - 60) expect(k).toBeLessThan(nib);
      }
    }
  });

  it('carries the pen head over the nib on the gantry', () => {
    const node = RESULT.nodes[120];
    const parts = gantryParts(node);
    expect(parts.length).toBeGreaterThan(8);
    expect(parts.some((part) => part.kind === 'solid' && part.lit)).toBe(false);
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
    // The tree, the path and the goal are named in words by the key, the hint and the readout under the drawing, never by text in it.
    expect(lines.some((line) => line.includes('Thin lines: the tree'))).toBe(true);
    expect(lines.some((line) => line.includes('Lit: the first branch to reach the goal'))).toBe(true);
    expect(lines.some((line) => line.includes(`${TOTAL} branches · path found`))).toBe(true);
    expect(lines.some((line) => /units|iteration|nodes/.test(line))).toBe(false);
    const svg = frame.querySelector('svg.iso-svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
  });
});

describe('RrtExplorer series encoding (VAL-B2-VIZ-002/004)', () => {
  beforeEach(() => mockReducedMotion(false));

  it('names every plotted series in the plot or the legend and tells each pair apart without colour', () => {
    const { container } = render(<RrtExplorer />);
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(['rrt-tree']);
    // The drawing carries no words, so the tree is named by the unboxed key under it.
    expect(seriesNames(container)).toEqual({ 'rrt-tree': ['Thin lines: the tree'] });
    expect(container.querySelector('[data-anatomy-keys] [data-legend-series="rrt-tree"]')?.closest('[data-figure-stage]')).not.toBeNull();
    // Visible text tied to each series names it; no series vouches for itself with a marker attribute.
    expect(container.querySelector('[data-series-labelled]')).toBeNull();
    expect(seriesEncodingViolations(container)).toEqual([]);
    // The key names the tree at every stage of its growth, not only at settle.
    fireEvent.change(screen.getByRole('slider', { name: /exploration iteration/i }), { target: { value: '1' } });
    expect(seriesNames(container)).toEqual({ 'rrt-tree': ['Thin lines: the tree'] });
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
