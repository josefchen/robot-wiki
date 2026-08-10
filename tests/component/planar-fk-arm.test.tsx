import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PlanarFkArm } from '@/components/interactive/planar-fk-arm';
import {
  DEFAULT_ANGLES_DEG,
  LINK_LENGTHS,
  planarForwardKinematics,
} from '@/lib/planar-fk';

const JOINT_NAMES = [/base joint/i, /elbow joint/i, /wrist joint/i];

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
    const base = screen.getByRole('slider', { name: /base joint/i });
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
    const base = screen.getByRole('slider', { name: /base joint/i });
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
    fireEvent.change(screen.getByRole('slider', { name: /base joint/i }), {
      target: { value: '-120' },
    });
    fireEvent.change(screen.getByRole('slider', { name: /wrist joint/i }), {
      target: { value: '90' },
    });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(readout('fk-ee-x')).toBe(initialX);
    expect(readout('fk-ee-y')).toBe(initialY);
    expect(
      screen.getByRole('slider', { name: /base joint/i }),
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
});
