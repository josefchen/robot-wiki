import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  plainJointValue,
  plainPosition,
  sceneToBaseFrame,
  spokenJointValue,
  technicalDegrees,
  technicalPosition,
} from '@/components/three/joint-labels';
import {
  PlaygroundReadout,
  reachState,
  reachText,
} from '@/components/three/playground-hud';
import { TechnicalNames } from '@/components/three/technical-names';
import type { JointControl } from '@/components/three/use-playground-kinematics';
import { robotToScene } from '@/lib/ik';

/**
 * The plain readouts that replaced the monospace HUD, and the "Technical
 * names" fold that keeps the HUD's exact values: every joint angle to a
 * tenth of a degree, the hand's position and angles, the target, the
 * solver's gap in millimetres and its iteration count, and the reach
 * verdict in each of its states.
 */

const JOINTS: JointControl[] = [
  { name: 'shoulder_pan', lower: -1.92, upper: 1.92 },
  { name: 'shoulder_lift', lower: -1.745, upper: 1.745 },
  { name: 'gripper', lower: -0.174533, upper: 1.74533 },
];

// The base frame is the URDF's: x forward, y left, z up. The hand sits
// 21.3 cm forward, 4.1 cm left and 18.4 cm up.
const HAND = robotToScene({ x: 0.2134, y: 0.0409, z: 0.1839 });
const HAND_ANGLES = { roll: 0.036, pitch: -0.667, yaw: 1.596 };

function technical(props: Partial<Parameters<typeof TechnicalNames>[0]> = {}) {
  return render(
    <TechnicalNames
      joints={JOINTS}
      angles={{ shoulder_pan: Math.PI / 2, shoulder_lift: -0.5, gripper: 0 }}
      eeLink="gripper_frame_link"
      hand={HAND}
      handAngles={HAND_ANGLES}
      target={null}
      iterations={null}
      residualMm={null}
      {...props}
    />,
  );
}

describe('plain joint values', () => {
  it('reads angles as whole signed degrees and the gripper as percent open', () => {
    expect(plainJointValue('shoulder_pan', Math.PI / 2, 1.92)).toBe('90°');
    expect(plainJointValue('shoulder_lift', -0.5, 1.745)).toBe('−29°');
    expect(plainJointValue('elbow_flex', -0.001, 1.69)).toBe('0°');
    expect(plainJointValue('gripper', 1.74533 / 2, 1.74533)).toBe('50%');
    // Squeezing past closed reads as closed.
    expect(plainJointValue('gripper', -0.1, 1.74533)).toBe('0%');
    expect(spokenJointValue('shoulder_lift', -0.5, 1.745)).toBe('-29 degrees');
    expect(spokenJointValue('gripper', 1.74533, 1.74533)).toBe('100 percent open');
  });

  it('keeps the technical readout signed to a tenth of a degree', () => {
    expect(technicalDegrees(Math.PI / 2)).toBe('+90.0°');
    expect(technicalDegrees(-0.5)).toBe('-28.6°');
    expect(technicalDegrees(-0.0001)).toBe('+0.0°');
  });
});

describe('hand position', () => {
  it('reads in centimetres from the base, with the direction in words', () => {
    expect(plainPosition(sceneToBaseFrame(HAND))).toBe('21 cm forward, 4 cm left, 18 cm up');
    expect(
      plainPosition(sceneToBaseFrame(robotToScene({ x: -0.12, y: -0.05, z: -0.02 }))),
    ).toBe('12 cm back, 5 cm right, 2 cm down');
    expect(technicalPosition(sceneToBaseFrame(HAND))).toBe('x +0.213 y +0.041 z +0.184');
  });

  it('shows the hand under the stage', () => {
    render(<PlaygroundReadout hand={HAND} state="idle" iterations={null} residualMm={null} />);
    expect(screen.getByTestId('hand-readout')).toHaveTextContent(
      'Hand 21 cm forward, 4 cm left, 18 cm up',
    );
    expect(screen.getByTestId('reach-status')).toHaveAttribute('data-state', 'idle');
    expect(screen.getByTestId('reach-status')).toHaveTextContent('');
  });
});

describe('reach verdict', () => {
  it('names each state in words, with the step count or the gap', () => {
    expect(reachState({ target: null, solving: false, residualMm: null })).toBe('idle');
    const target = { x: 0.2, y: 0.15, z: 0 };
    expect(reachState({ target, solving: true, residualMm: 42.1 })).toBe('solving');
    expect(reachState({ target, solving: false, residualMm: 0.31 })).toBe('reached');
    expect(reachState({ target, solving: false, residualMm: 1 })).toBe('reached');
    expect(reachState({ target, solving: false, residualMm: 1.01 })).toBe('unreachable');
    expect(reachText('solving', 3, 42.1)).toBe('Reaching the target…');
    expect(reachText('reached', 9, 0.31)).toBe('Reached in 9 steps');
    expect(reachText('reached', 1, 0.31)).toBe('Reached in 1 step');
    expect(reachText('unreachable', 100, 812.4)).toBe('Out of reach, 81 cm short');
    expect(reachText('unreachable', 100, 4.2)).toBe('Out of reach, 4 mm short');
  });

  it('announces the verdict from a live region', () => {
    render(<PlaygroundReadout hand={HAND} state="unreachable" iterations={100} residualMm={812.4} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('data-state', 'unreachable');
    expect(status).toHaveTextContent('Out of reach, 81 cm short');
  });
});

describe('TechnicalNames', () => {
  it('lists every joint by plain and URDF name with its exact angle', () => {
    technical();
    expect(screen.getByText('Technical names').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByTestId('tech-joint-shoulder_pan')).toHaveTextContent('+90.0°');
    expect(screen.getByTestId('tech-joint-shoulder_lift')).toHaveTextContent('-28.6°');
    const panRow = screen.getByTestId('tech-joint-shoulder_pan').closest('tr')!;
    expect(panRow).toHaveTextContent('Base turn');
    expect(panRow).toHaveTextContent('shoulder_pan');
    expect(panRow).toHaveTextContent('−110 to 110');
  });

  it('shows the hand position and angles in the base frame', () => {
    technical();
    expect(screen.getByTestId('tech-hand')).toHaveTextContent('x +0.213 y +0.041 z +0.184');
    expect(screen.getByTestId('tech-hand-angles')).toHaveTextContent(
      'roll +2.1° pitch -38.2° yaw +91.4°',
    );
  });

  it('shows the target, the gap in millimetres and the iteration count', () => {
    technical({
      target: robotToScene({ x: 0.2, y: 0, z: 0.15 }),
      iterations: 9,
      residualMm: 0.31,
    });
    expect(screen.getByTestId('tech-target')).toHaveTextContent('x +0.200 y +0.000 z +0.150');
    expect(screen.getByTestId('tech-residual')).toHaveTextContent('0.31 mm');
    expect(screen.getByTestId('tech-iterations')).toHaveTextContent('9');

    technical({ target: robotToScene({ x: 1, y: 0, z: 0.5 }), iterations: 100, residualMm: 812.4 });
    expect(screen.getAllByTestId('tech-residual')[1]).toHaveTextContent('812.40 mm');
  });

  it('says none and n/a when no target is set', () => {
    technical();
    expect(screen.getByTestId('tech-target')).toHaveTextContent('none');
    expect(screen.getByTestId('tech-residual')).toHaveTextContent('n/a');
    expect(screen.getByTestId('tech-iterations')).toHaveTextContent('n/a');
  });
});
