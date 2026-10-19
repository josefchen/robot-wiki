import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IkTargetForm } from '@/components/three/ik-target-form';
import { robotToScene, sceneToRobot } from '@/lib/ik';

/**
 * The typed path to a reach. The boxes read centimetres in the arm's base
 * frame (forward, left, up: the URDF's x, y, z), the frame the hand readout
 * uses; the form hands the solver the same scene point a click would.
 */

// 20 cm forward, 5 cm left, 15 cm up.
const HAND = robotToScene({ x: 0.2, y: 0.05, z: 0.15 });

function expectScenePoint(actual: { x: number; y: number; z: number }, base: { x: number; y: number; z: number }) {
  const robot = sceneToRobot(actual);
  expect(robot.x).toBeCloseTo(base.x, 10);
  expect(robot.y).toBeCloseTo(base.y, 10);
  expect(robot.z).toBeCloseTo(base.z, 10);
}

describe('IkTargetForm', () => {
  it('prefills the boxes from the hand position, in centimetres from the base', () => {
    render(
      <IkTargetForm
        defaultTarget={robotToScene({ x: 0.2, y: -0.05, z: 0.153 })}
        hasTarget={false}
        onSolve={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByLabelText(/^forward/i)).toHaveValue(20);
    expect(screen.getByLabelText(/^left/i)).toHaveValue(-5);
    expect(screen.getByLabelText(/^up/i)).toHaveValue(15.3);
    expect(screen.getByLabelText(/^forward/i)).toHaveAccessibleDescription('centimetres');
  });

  it('submits the typed target as the scene point for the solver', () => {
    const onSolve = vi.fn();
    render(
      <IkTargetForm
        defaultTarget={HAND}
        hasTarget={false}
        onSolve={onSolve}
        onClear={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^forward/i), {
      target: { value: '12' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^reach$/i }));
    expect(onSolve).toHaveBeenCalledTimes(1);
    expectScenePoint(onSolve.mock.calls[0][0], { x: 0.12, y: 0.05, z: 0.15 });
  });

  it('solves on Enter in a box, without a pointer', () => {
    const onSolve = vi.fn();
    render(
      <IkTargetForm defaultTarget={HAND} hasTarget={false} onSolve={onSolve} onClear={() => {}} />,
    );
    fireEvent.change(screen.getByLabelText(/^up/i), { target: { value: '30' } });
    fireEvent.keyDown(screen.getByLabelText(/^up/i), { key: 'Enter' });
    expectScenePoint(onSolve.mock.calls[0][0], { x: 0.2, y: 0.05, z: 0.3 });
  });

  it('rejects non-numeric input with an inline error and no solve', () => {
    const onSolve = vi.fn();
    render(
      <IkTargetForm
        defaultTarget={HAND}
        hasTarget={false}
        onSolve={onSolve}
        onClear={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^left/i), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^reach$/i }));
    expect(onSolve).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/number of centimetres/i);
  });

  it('offers a clear-target action once a target exists', () => {
    const onClear = vi.fn();
    const { rerender } = render(
      <IkTargetForm
        defaultTarget={HAND}
        hasTarget={false}
        onSolve={() => {}}
        onClear={onClear}
      />,
    );
    expect(screen.getByRole('button', { name: /clear target/i })).toBeDisabled();
    rerender(
      <IkTargetForm defaultTarget={HAND} hasTarget={true} onSolve={() => {}} onClear={onClear} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /clear target/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
