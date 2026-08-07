import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JointControls } from '@/components/three/joint-controls';
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
  it('renders exactly one labeled slider per joint with degree readouts', () => {
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
      expect(slider).toHaveAccessibleName(new RegExp(joint.name));
      expect(slider).toHaveAttribute('type', 'range');
      const readout = screen.getByTestId(`joint-readout-${joint.name}`);
      expect(readout).toHaveTextContent('0.0°');
    }
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
    expect(screen.getByTestId('joint-readout-shoulder_pan')).toHaveTextContent(
      '+90.0°',
    );
    expect(screen.getByTestId('joint-readout-shoulder_lift')).toHaveTextContent(
      '-28.6°',
    );
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
