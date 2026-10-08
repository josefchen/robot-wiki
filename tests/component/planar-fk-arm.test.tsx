import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PlanarFkArm, SHOULDER_RANGE_DEG } from '@/components/interactive/planar-fk-arm';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import {
  DEFAULT_ANGLES_DEG,
  LINK_LENGTHS,
  planarForwardKinematics,
} from '@/lib/planar-fk';

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

  it('opens on a shoulder turn: the arm before it, the swing of the hand and the note', () => {
    const { container } = render(<PlanarFkArm />);
    expect(screen.getByTestId('fk-ghost')).toBeInTheDocument();
    expect(screen.getByTestId('fk-swing')).toBeInTheDocument();
    expect(container.querySelector('[data-figure-annotation]')?.textContent).toBe(
      'Turn here: elbow,wrist and handall ride along',
    );
    expect(container.textContent).toContain('before the turn');
  });

  it('keeps the pose before a preset faint and marks the preset chosen', async () => {
    const user = userEvent.setup();
    const { container } = render(<PlanarFkArm />);
    await user.click(screen.getByRole('button', { name: 'Tuck in' }));
    expect(screen.getByRole('button', { name: 'Tuck in' })).toHaveAttribute('aria-pressed', 'true');
    expect(readout('fk-theta-1')).toBe('100°');
    expect(readout('fk-theta-2')).toBe('-140°');
    expect(readout('fk-theta-3')).toBe('-60°');
    expect(screen.getByTestId('fk-ghost')).toBeInTheDocument();
    expect(screen.queryByTestId('fk-swing')).toBeNull();
    expect(container.textContent).not.toContain('before the turn');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByRole('button', { name: 'Tuck in' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('fk-swing')).toBeInTheDocument();
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
