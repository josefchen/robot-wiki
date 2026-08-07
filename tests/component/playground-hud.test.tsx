import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlaygroundHud } from '@/components/three/playground-hud';
import type { JointControl } from '@/components/three/use-playground-kinematics';

const JOINTS: JointControl[] = [
  { name: 'shoulder_pan', lower: -1.92, upper: 1.92 },
  { name: 'shoulder_lift', lower: -1.745, upper: 1.745 },
];

const EE_POSE = {
  position: { x: 0.2134, y: 0.1839, z: -0.0409 },
  roll: 0.036,
  pitch: -0.667,
  yaw: 1.596,
};

describe('PlaygroundHud', () => {
  it('shows every joint angle in degrees in monospace', () => {
    render(
      <PlaygroundHud
        joints={JOINTS}
        angles={{ shoulder_pan: Math.PI / 2, shoulder_lift: -0.5 }}
        eePose={EE_POSE}
        targetScene={null}
        solving={false}
        residualMm={null}
        iterations={null}
      />,
    );
    expect(screen.getByTestId('hud-joint-shoulder_pan')).toHaveTextContent(
      '+90.0°',
    );
    expect(screen.getByTestId('hud-joint-shoulder_lift')).toHaveTextContent(
      '-28.6°',
    );
    expect(screen.getByTestId('playground-hud').className).toContain(
      'font-mono',
    );
  });

  it('shows the end-effector position and orientation', () => {
    render(
      <PlaygroundHud
        joints={JOINTS}
        angles={{ shoulder_pan: 0, shoulder_lift: 0 }}
        eePose={EE_POSE}
        targetScene={null}
        solving={false}
        residualMm={null}
        iterations={null}
      />,
    );
    expect(screen.getByTestId('hud-ee-position')).toHaveTextContent(
      'x +0.213 y +0.184 z -0.041',
    );
    expect(screen.getByTestId('hud-ee-orientation')).toHaveTextContent(
      'r +2.1° p -38.2° y +91.4°',
    );
  });

  it('shows target, residual in mm, iteration count, and reach status', () => {
    render(
      <PlaygroundHud
        joints={JOINTS}
        angles={{ shoulder_pan: 0, shoulder_lift: 0 }}
        eePose={EE_POSE}
        targetScene={{ x: 0.2, y: 0.15, z: 0 }}
        solving={false}
        residualMm={0.31}
        iterations={9}
      />,
    );
    expect(screen.getByTestId('hud-target')).toHaveTextContent(
      'x +0.200 y +0.150 z +0.000',
    );
    expect(screen.getByTestId('hud-residual')).toHaveTextContent('0.31 mm');
    expect(screen.getByTestId('hud-iterations')).toHaveTextContent('9');
    expect(screen.getByTestId('hud-ik-status')).toHaveTextContent('reached');
  });

  it('marks unreached targets honestly', () => {
    render(
      <PlaygroundHud
        joints={JOINTS}
        angles={{ shoulder_pan: 0, shoulder_lift: 0 }}
        eePose={EE_POSE}
        targetScene={{ x: 1, y: 0.5, z: 0 }}
        solving={false}
        residualMm={812.4}
        iterations={100}
      />,
    );
    expect(screen.getByTestId('hud-ik-status')).toHaveTextContent(
      'not reached',
    );
    expect(screen.getByTestId('hud-residual')).toHaveTextContent('812.40 mm');
  });

  it('shows a solving state and a none state', () => {
    const { rerender } = render(
      <PlaygroundHud
        joints={JOINTS}
        angles={{ shoulder_pan: 0, shoulder_lift: 0 }}
        eePose={EE_POSE}
        targetScene={{ x: 0.2, y: 0.15, z: 0 }}
        solving={true}
        residualMm={42.1}
        iterations={3}
      />,
    );
    expect(screen.getByTestId('hud-ik-status')).toHaveTextContent('solving');

    rerender(
      <PlaygroundHud
        joints={JOINTS}
        angles={{ shoulder_pan: 0, shoulder_lift: 0 }}
        eePose={EE_POSE}
        targetScene={null}
        solving={false}
        residualMm={null}
        iterations={null}
      />,
    );
    expect(screen.getByTestId('hud-target')).toHaveTextContent('none');
  });
});
