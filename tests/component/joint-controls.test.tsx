import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JointControls } from '@/components/three/joint-controls';
import { SO101_JOINT_LABELS } from '@/components/three/joint-labels';
import type { JointControl } from '@/components/three/use-playground-kinematics';

const JOINTS: JointControl[] = [
  { name: 'shoulder_pan', lower: -1.92, upper: 1.92 },
  { name: 'shoulder_lift', lower: -1.745, upper: 1.745 },
  { name: 'elbow_flex', lower: -1.69, upper: 1.69 },
];

function zeroAngles() {
  return { shoulder_pan: 0, shoulder_lift: 0, elbow_flex: 0 };
}

describe('JointControls', () => {
  it('renders exactly one slider per joint, named in plain words, with its value', () => {
    render(
      <JointControls
        joints={JOINTS}
        angles={zeroAngles()}
        onChange={() => {}}
        onReset={() => {}}
      />,
    );
    for (const joint of JOINTS) {
      const slider = screen.getByTestId(`joint-slider-${joint.name}`);
      expect(slider).toHaveAccessibleName(SO101_JOINT_LABELS[joint.name].name);
      expect(slider).toHaveAttribute('type', 'range');
      expect(slider).toHaveAttribute('aria-valuetext', '0 degrees');
      // Slider min/max are the joint's limits, in degrees.
      expect(Number(slider.getAttribute('min'))).toBeCloseTo((joint.lower * 180) / Math.PI, 6);
      expect(Number(slider.getAttribute('max'))).toBeCloseTo((joint.upper * 180) / Math.PI, 6);
      const readout = screen.getByTestId(`joint-readout-${joint.name}`);
      expect(readout).toHaveTextContent('0°');
    }
    expect(screen.getByRole('slider', { name: 'Base turn' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Shoulder' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Elbow' })).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(3);
  });

  it('maps slider degrees to radians and clamps to the joint limits', () => {
    const onChange = vi.fn();
    render(
      <JointControls
        joints={JOINTS}
        angles={zeroAngles()}
        onChange={onChange}
        onReset={() => {}}
      />,
    );
    const slider = screen.getByTestId('joint-slider-shoulder_pan');
    fireEvent.change(slider, { target: { value: '45' } });
    expect(onChange).toHaveBeenCalledWith('shoulder_pan', Math.PI / 4);

    onChange.mockClear();
    fireEvent.change(slider, { target: { value: '999' } });
    expect(onChange).toHaveBeenCalledWith('shoulder_pan', 1.92);

    onChange.mockClear();
    fireEvent.change(slider, { target: { value: '-999' } });
    expect(onChange).toHaveBeenCalledWith('shoulder_pan', -1.92);
  });

  it('reflects the current angles in the readouts (slider sync after IK)', () => {
    render(
      <JointControls
        joints={JOINTS}
        angles={{ shoulder_pan: Math.PI / 2, shoulder_lift: -0.5, elbow_flex: 0.25 }}
        onChange={() => {}}
        onReset={() => {}}
      />,
    );
    expect(screen.getByTestId('joint-readout-shoulder_pan')).toHaveTextContent('90°');
    expect(screen.getByTestId('joint-readout-shoulder_lift')).toHaveTextContent('−29°');
    expect(screen.getByTestId('joint-slider-shoulder_lift')).toHaveAttribute(
      'aria-valuetext',
      '-29 degrees',
    );
    expect(Number((screen.getByTestId('joint-slider-shoulder_pan') as HTMLInputElement).value)).toBeCloseTo(90, 6);
  });

  it('reads the gripper as how far it is open', () => {
    render(
      <JointControls
        joints={[{ name: 'gripper', lower: -0.174533, upper: 1.74533 }]}
        angles={{ gripper: 1.74533 * 0.4 }}
        onChange={() => {}}
        onReset={() => {}}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Gripper open' });
    expect(slider).toHaveAttribute('aria-valuetext', '40 percent open');
    expect(screen.getByTestId('joint-readout-gripper')).toHaveTextContent('40%');
  });

  it('marks the joint being worked and reports it, by pointer and by focus', () => {
    const onActiveJoint = vi.fn();
    const { rerender } = render(
      <JointControls
        joints={JOINTS}
        angles={zeroAngles()}
        onChange={() => {}}
        onReset={() => {}}
        onActiveJoint={onActiveJoint}
      />,
    );
    const slider = screen.getByTestId('joint-slider-elbow_flex');
    fireEvent.focus(slider);
    expect(onActiveJoint).toHaveBeenLastCalledWith('elbow_flex');
    fireEvent.blur(slider);
    expect(onActiveJoint).toHaveBeenLastCalledWith(null);
    fireEvent.pointerEnter(slider.closest('li')!);
    expect(onActiveJoint).toHaveBeenLastCalledWith('elbow_flex');

    rerender(
      <JointControls
        joints={JOINTS}
        angles={zeroAngles()}
        onChange={() => {}}
        onReset={() => {}}
        activeJoint="elbow_flex"
        onActiveJoint={onActiveJoint}
      />,
    );
    // A non-colour marker: the row carries data-active (bold label and a square).
    expect(slider.closest('li')).toHaveAttribute('data-active');
    expect(screen.getByTestId('joint-slider-shoulder_pan').closest('li')).not.toHaveAttribute('data-active');
  });

  it('exposes a reset control', () => {
    const onReset = vi.fn();
    render(
      <JointControls
        joints={JOINTS}
        angles={zeroAngles()}
        onChange={() => {}}
        onReset={onReset}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /reset pose/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
