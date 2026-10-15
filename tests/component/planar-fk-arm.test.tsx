import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanarFkArm, SHOULDER_RANGE_DEG, readoutFor } from '@/components/interactive/planar-fk-arm';
import {
  LAYERS,
  P,
  PAPER_Z,
  PARTS,
  UNIT,
  armParts,
  dialTicks,
  ghostFor,
  inkFor,
  jointsOf,
  paperPoint,
} from '@/components/iso/figures/arm-plotting-table';
import { iso } from '@/components/iso/iso-kit';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits, symbolHits } from '@/lib/figure-main-view';
import {
  DEFAULT_ANGLES_DEG,
  LINK_LENGTHS,
  planarForwardKinematics,
} from '@/lib/planar-fk';

/** The first point of every subpath in a path's d. */
const starts = (d: string) => [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
const near = (a: number[], b: number[], tol = 0.15) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= tol;
const OPENING_GHOST = [DEFAULT_ANGLES_DEG[0] - 40, DEFAULT_ANGLES_DEG[1], DEFAULT_ANGLES_DEG[2]];

/** Reduced motion on: the arm jumps to each pose. */
function stillMotion() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce'), media: query, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false,
  }));
}

describe('arm plotting table model', () => {
  it('stands every joint and the pen where forward kinematics puts them, in link lengths on the table', () => {
    for (const angles of [[...DEFAULT_ANGLES_DEG], [95, -10, -5], [30, -20, -10], [100, -140, -60], [0, 180, -180]]) {
      const { pivots, effector } = planarForwardKinematics(LINK_LENGTHS, angles);
      const joints = jointsOf(angles);
      [...pivots, effector].forEach((p, k) => {
        expect(joints[k][0]).toBeCloseTo(p.x * UNIT, 9);
        expect(joints[k][1]).toBeCloseTo(p.y * UNIT, 9);
      });
      // Each link keeps its length: the hand is the running sum of the link vectors.
      for (let k = 0; k < 3; k++) {
        expect(Math.hypot(joints[k + 1][0] - joints[k][0], joints[k + 1][1] - joints[k][1])).toBeCloseTo(LINK_LENGTHS[k] * UNIT, 9);
      }
    }
  });

  it('zeroes each dial along the link before its joint, so the next link points at the relative angle', () => {
    const [x, y] = [10, 20];
    const { zero, major, minor } = dialTicks(x, y, 15, LAYERS[0][1], 65);
    const [start] = starts(zero);
    const rim = iso([x + 15 * Math.cos((65 * Math.PI) / 180), y + 15 * Math.sin((65 * Math.PI) / 180), LAYERS[0][1]], P);
    expect(near(start, rim)).toBe(true);
    // Every 15 degrees a quarter turn either side of the zero: the zero, four long ones every 45 and eight short ones.
    expect(starts(major)).toHaveLength(4);
    expect(starts(minor)).toHaveLength(8);
  });

  it('inks the arc a shoulder turn sweeps: round the shoulder at the hand\'s fixed distance, from the old pen to the new', () => {
    const ink = inkFor(OPENING_GHOST, [...DEFAULT_ANGLES_DEG]);
    const before = planarForwardKinematics(LINK_LENGTHS, OPENING_GHOST).effector;
    const after = planarForwardKinematics(LINK_LENGTHS, [...DEFAULT_ANGLES_DEG]).effector;
    expect(ink.radius).toBeCloseTo(Math.hypot(before.x, before.y), 9);
    expect(ink.radius).toBeCloseTo(Math.hypot(after.x, after.y), 9);
    const points = [...ink.arc.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(near(points[0], paperPoint(before.x * UNIT, before.y * UNIT))).toBe(true);
    expect(near(points[points.length - 1], paperPoint(after.x * UNIT, after.y * UNIT))).toBe(true);
    expect(near(ink.start, paperPoint(before.x * UNIT, before.y * UNIT))).toBe(true);
  });

  it('sketches the pose before the move with a ring at each joint and the pen', () => {
    const sketch = ghostFor(OPENING_GHOST);
    expect(starts(sketch.rings)).toHaveLength(4);
    expect(starts(sketch.links)).toHaveLength(3);
    sketch.points.forEach((point, k) => {
      expect(point).toEqual(jointsOf(OPENING_GHOST)[k]);
    });
  });

  it('keeps one lit part, the pen at the hand, and paints the links layer by layer from the paper up', () => {
    for (const angles of [[...DEFAULT_ANGLES_DEG], [100, -140, -60], [10, 170, 170]]) {
      const parts = armParts(angles);
      const lit = parts.filter((part) => part.kind === 'solid' && part.lit);
      expect(lit.length).toBeGreaterThan(0);
      expect(lit.every((part) => part.id === 'effector-marker')).toBe(true);
      const order = parts.map((part) => part.id).filter((id) => id?.startsWith('link-'));
      expect([...new Set(order)]).toEqual(['link-1', 'link-2', 'link-3']);
      const hand = jointsOf(angles)[3];
      const pen = parts.find((part) => part.id === 'effector-marker' && part.kind === 'solid')!;
      // The nib's outline is centred on the hand, on the paper.
      const nib = pen.kind === 'solid' ? starts(pen.paths.outline) : [];
      expect(nib.length).toBeGreaterThan(0);
      const centre = iso([hand[0], hand[1], PAPER_Z], P);
      expect(Math.abs(nib[0][0] - centre[0])).toBeLessThan(4);
    }
    expect(PARTS.filter((part) => part.kind === 'solid' && part.lit)).toHaveLength(0);
  });

  it('reads the pose in plain words', () => {
    expect(readoutFor([...DEFAULT_ANGLES_DEG])).toBe('Shoulder 110 degrees · hand 0.45 right, 1.89 out');
    expect(readoutFor([150, -45, -35])).toMatch(/^Shoulder 150 degrees · hand \d\.\d\d left, \d\.\d\d out$/);
    for (const angles of [[...DEFAULT_ANGLES_DEG], [0, 180, 0], [180, -90, 0]]) {
      expect(symbolHits(readoutFor(angles))).toEqual([]);
    }
  });
});

const JOINT_NAMES = [/shoulder joint/i, /elbow joint/i, /wrist joint/i];

function readout(id: string): string {
  return (screen.getByTestId(id).textContent ?? '').trim();
}

function parseNumber(id: string): number {
  const value = Number.parseFloat(readout(id));
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

describe('PlanarFkArm', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders one labeled slider per joint plus readout and reset', () => {
    render(<PlanarFkArm />);
    for (const name of JOINT_NAMES) {
      expect(screen.getByRole('slider', { name })).toBeInTheDocument();
    }
    expect(screen.getByTestId('fk-theta-1')).toBeInTheDocument();
    expect(screen.getByTestId('fk-theta-2')).toBeInTheDocument();
    expect(screen.getByTestId('fk-theta-3')).toBeInTheDocument();
    expect(screen.getByTestId('fk-ee-x')).toBeInTheDocument();
    expect(screen.getByTestId('fk-ee-y')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('starts each joint slider name with the label it prints', () => {
    render(<PlanarFkArm />);
    for (const label of ['Turn the shoulder', 'Bend the elbow', 'Bend the wrist']) {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: new RegExp(`^${label}: `) })).toBeInTheDocument();
    }
  });

  it('anchors the readout to the default pose', () => {
    render(<PlanarFkArm />);
    const fk = planarForwardKinematics(LINK_LENGTHS, [...DEFAULT_ANGLES_DEG]);
    expect(readout('fk-theta-1')).toBe(`${DEFAULT_ANGLES_DEG[0]}°`);
    expect(readout('fk-theta-2')).toBe(`${DEFAULT_ANGLES_DEG[1]}°`);
    expect(readout('fk-theta-3')).toBe(`${DEFAULT_ANGLES_DEG[2]}°`);
    expect(parseNumber('fk-ee-x')).toBeCloseTo(fk.effector.x, 1);
    expect(parseNumber('fk-ee-y')).toBeCloseTo(fk.effector.y, 1);
  });

  it('updates the arm pose and readout when a joint slider moves', () => {
    render(<PlanarFkArm />);
    const beforeX = parseNumber('fk-ee-x');
    const beforeY = parseNumber('fk-ee-y');
    const base = screen.getByRole('slider', { name: /shoulder joint/i });
    fireEvent.change(base, { target: { value: '160' } });
    expect(readout('fk-theta-1')).toBe('160°');
    const fk = planarForwardKinematics(LINK_LENGTHS, [160, -45, -35]);
    expect(parseNumber('fk-ee-x')).toBeCloseTo(fk.effector.x, 1);
    expect(parseNumber('fk-ee-y')).toBeCloseTo(fk.effector.y, 1);
    expect(parseNumber('fk-ee-x')).not.toBeCloseTo(beforeX, 1);
    expect(parseNumber('fk-ee-y')).not.toBeCloseTo(beforeY, 1);
  });

  it('moves the end effector monotonically through a base-joint sweep', () => {
    render(<PlanarFkArm />);
    const base = screen.getByRole('slider', { name: /shoulder joint/i });
    const xs: number[] = [];
    for (const angle of [60, 75, 90, 105, 120]) {
      fireEvent.change(base, { target: { value: String(angle) } });
      xs.push(parseNumber('fk-ee-x'));
    }
    // With elbow and wrist held at their defaults, the arm rotates rigidly
    // about the base; across this sweep the x coordinate strictly decreases.
    for (let i = 1; i < xs.length; i += 1) {
      expect(xs[i]).toBeLessThan(xs[i - 1]);
    }
  });

  it('re-poses the downstream links when a middle joint moves', () => {
    render(<PlanarFkArm />);
    const elbow = screen.getByRole('slider', { name: /elbow joint/i });
    const before = readout('fk-ee-y');
    fireEvent.change(elbow, { target: { value: '40' } });
    expect(readout('fk-theta-2')).toBe('40°');
    expect(readout('fk-ee-y')).not.toBe(before);
  });

  it('reset restores the default pose', async () => {
    const user = userEvent.setup();
    render(<PlanarFkArm />);
    const initialX = readout('fk-ee-x');
    const initialY = readout('fk-ee-y');
    fireEvent.change(screen.getByRole('slider', { name: /shoulder joint/i }), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByRole('slider', { name: /wrist joint/i }), {
      target: { value: '90' },
    });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(readout('fk-ee-x')).toBe(initialX);
    expect(readout('fk-ee-y')).toBe(initialY);
    expect(
      screen.getByRole('slider', { name: /shoulder joint/i }),
    ).toHaveValue(String(DEFAULT_ANGLES_DEG[0]));
  });

  it('never renders NaN at the slider extremes', () => {
    render(<PlanarFkArm />);
    for (const name of JOINT_NAMES) {
      const slider = screen.getByRole('slider', { name });
      for (const value of ['-180', '180', '0']) {
        fireEvent.change(slider, { target: { value } });
        for (const id of ['fk-ee-x', 'fk-ee-y']) {
          expect(readout(id)).not.toContain('NaN');
        }
      }
    }
  });

  it('opens on a shoulder turn: the arm before it, the swing of the hand and the hint', () => {
    const { container } = render(<PlanarFkArm />);
    expect(screen.getByTestId('fk-ghost')).toHaveAttribute('data-pose', OPENING_GHOST.join(' '));
    const swing = screen.getByTestId('fk-swing');
    const hand = planarForwardKinematics(LINK_LENGTHS, [...DEFAULT_ANGLES_DEG]).effector;
    expect(Number(swing.getAttribute('data-radius'))).toBeCloseTo(Math.hypot(hand.x, hand.y), 3);
    expect(container.querySelector('[data-anatomy-hint]')?.textContent).toBe(
      'Turn the shoulder: the elbow, wrist and pen ride along',
    );
    expect(container.querySelector('[data-readout]')?.textContent).toBe(readoutFor([...DEFAULT_ANGLES_DEG]));
    // No words in the drawing: the hint, readout and caption carry them.
    const svg = container.querySelector('svg.iso-svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.textContent).toBe('');
  });

  it('keeps the pose before a preset faint and marks the preset chosen', async () => {
    const user = userEvent.setup();
    const { container } = render(<PlanarFkArm />);
    await user.click(screen.getByRole('button', { name: 'Tuck in' }));
    expect(screen.getByRole('button', { name: 'Tuck in' })).toHaveAttribute('aria-pressed', 'true');
    expect(readout('fk-theta-1')).toBe('100°');
    expect(readout('fk-theta-2')).toBe('-140°');
    expect(readout('fk-theta-3')).toBe('-60°');
    expect(screen.getByTestId('fk-ghost')).toHaveAttribute('data-pose', DEFAULT_ANGLES_DEG.join(' '));
    expect(screen.queryByTestId('fk-swing')).toBeNull();
    expect(container.querySelector('[data-testid="fk-swing"]')).toBeNull();
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByRole('button', { name: 'Tuck in' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('fk-swing')).toBeInTheDocument();
  });

  it('eases the drawn arm to a new pose, and jumps there under reduced motion', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      const { container } = render(<PlanarFkArm />);
      fireEvent.change(screen.getByRole('slider', { name: /shoulder joint/i }), { target: { value: '150' } });
      const arm = () => container.querySelector('[data-testid="fk-arm"]')!.getAttribute('data-pose');
      await act(async () => { vi.advanceTimersByTime(48); });
      const mid = Number(arm()!.split(' ')[0]);
      expect(mid).toBeGreaterThan(110);
      expect(mid).toBeLessThan(150);
      await act(async () => { vi.advanceTimersByTime(3000); });
      expect(arm()).toBe('150.0 -45.0 -35.0');
      expect(container.querySelector('[data-readout]')?.textContent).toBe(readoutFor([150, -45, -35]));
    } finally {
      vi.useRealTimers();
    }
    stillMotion();
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      const { container } = render(<PlanarFkArm />);
      fireEvent.change(screen.getAllByRole('slider', { name: /shoulder joint/i }).at(-1)!, { target: { value: '30' } });
      // One frame later the arm is there: no easing in between.
      await act(async () => { vi.advanceTimersByTime(20); });
      expect(container.querySelector('[data-testid="fk-arm"]')!.getAttribute('data-pose')).toBe('30.0 -45.0 -35.0');
    } finally {
      vi.useRealTimers();
    }
  });

  it('turns the shoulder only through the half-plane above its post', () => {
    render(<PlanarFkArm />);
    const shoulder = screen.getByRole('slider', { name: /shoulder joint/i });
    expect(shoulder).toHaveAttribute('min', String(SHOULDER_RANGE_DEG[0]));
    expect(shoulder).toHaveAttribute('max', String(SHOULDER_RANGE_DEG[1]));
  });
});

describe('PlanarFkArm served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<PlanarFkArm />)}</main></body></html>`;

  it('passes the figure-system check and shows no symbol or bare unit in the main view', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/kinematics/');
    expect(figures).toEqual(['planar-fk-arm']);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
