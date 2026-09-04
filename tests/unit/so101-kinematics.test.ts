import { describe, expect, it } from 'vitest';
import { HARDWARE } from '../../data/hardware';
import { CHART_DESCRIPTIONS } from '../../lib/chart-descriptions';
import {
  SO101_PREVIEW_VIEW,
  parseUrdfJoints,
  readSo101Urdf,
  so101HomeChain,
  so101Preview,
  so101PreviewDescription,
  so101PreviewGeometry,
} from '../../lib/so101-kinematics';

/**
 * The binding `VAL-DESIGN-013` calls for: the home preview of the shipped
 * SO-101 is derived from the model the playground loads, and it is derived
 * in a way that breaks loudly when the model changes.
 *
 * The expected values below come from a second source wherever one exists.
 * The degree-of-freedom count is checked against the hardware registry's own
 * published figure for the same arm rather than against a number copied out
 * of the drawing, which is the vacuity `VAL-B2-VIZ-013` names.
 */

const URDF = readSo101Urdf();

describe('so101 kinematics', () => {
  it('derives a serial revolute chain whose length is the published DoF', () => {
    const chain = so101HomeChain(parseUrdfJoints(URDF));
    const published = HARDWARE.find(
      (entry) => entry.id === 'so-101-self-build',
    );
    expect(
      published?.dof,
      'the hardware registry publishes a DoF for the SO-101',
    ).toEqual(expect.any(Number));
    expect(chain).toHaveLength(published?.dof ?? -1);
    expect(chain.map(({ name }) => name)).toEqual([
      'shoulder_pan',
      'shoulder_lift',
      'elbow_flex',
      'wrist_flex',
      'wrist_roll',
      'gripper',
    ]);
    expect(chain[chain.length - 1].child).toBe('moving_jaw_so101_v1_link');
    for (const joint of chain) {
      expect(joint.upperDeg).toBeGreaterThan(joint.lowerDeg);
      expect(joint.segmentLengthMm).toBeGreaterThan(0);
    }
  });

  it('projects the chain at one uniform scale inside the drawing surface', () => {
    const chain = so101HomeChain(parseUrdfJoints(URDF));
    const geometry = so101PreviewGeometry(chain);
    expect(geometry.points).toHaveLength(chain.length + 1);
    expect(geometry.points[0].name).toBe('base');
    for (const point of geometry.points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(geometry.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(geometry.height);
    }
    // One scale on both axes: every drawn segment keeps its true ratio to
    // the model's own sagittal segment length. A drawing stretched to fill
    // a card would pass a "looks like an arm" check and fail this one.
    const frames = [
      { x: 0, z: 0 },
      ...chain.map((joint) => ({ x: joint.position[0], z: joint.position[2] })),
    ];
    for (let i = 1; i < frames.length; i += 1) {
      const trueLength = Math.hypot(
        frames[i].x - frames[i - 1].x,
        frames[i].z - frames[i - 1].z,
      );
      const drawn = Math.hypot(
        geometry.points[i].x - geometry.points[i - 1].x,
        geometry.points[i].y - geometry.points[i - 1].y,
      );
      // Point coordinates are rounded to two decimals for the rendered
      // attribute, so the recovered scale carries that rounding.
      expect(drawn / trueLength).toBeCloseTo(geometry.pixelsPerMetre, 0);
    }
    expect(geometry.scaleBar.x2 - geometry.scaleBar.x1).toBeCloseTo(
      (geometry.scaleBar.labelMm / 1000) * geometry.pixelsPerMetre,
      2,
    );
    expect(geometry.height).toBe(SO101_PREVIEW_VIEW.height);
  });

  it('renders the registered textual alternative verbatim', () => {
    const registered = CHART_DESCRIPTIONS.find(
      (entry) => entry.component === 'So101ChainPreview',
    );
    expect(registered, 'the preview is registered').toBeTruthy();
    expect(so101Preview().description).toBe(registered!.text);
    expect(registered!.file).toBe('components/home/so101-chain-preview.tsx');
    expect(registered!.route).toBe('/');
  });

  it('moves the drawing and the sentence when the model changes', () => {
    const shortened = URDF.replace(
      /<joint\s+name="wrist_flex"[\s\S]*?<\/joint>/,
      '',
    );
    expect(shortened, 'the mutation changed the URDF bytes').not.toBe(URDF);
    const chain = so101HomeChain(parseUrdfJoints(shortened));
    const full = so101HomeChain(parseUrdfJoints(URDF));
    expect(chain.length).toBeLessThan(full.length);
    expect(so101PreviewDescription(chain)).not.toBe(
      so101PreviewDescription(full),
    );
    expect(so101PreviewGeometry(chain).points).not.toEqual(
      so101PreviewGeometry(full).points,
    );
  });

  it('refuses a model it cannot read as a serial limited chain', () => {
    const unlimited = URDF.replace(
      /<limit effort="[^"]*" velocity="[^"]*" lower="[^"]*"\s+upper="[^"]*"\/>/,
      '<limit effort="10" velocity="10"/>',
    );
    expect(unlimited).not.toBe(URDF);
    expect(() => so101HomeChain(parseUrdfJoints(unlimited))).toThrow(
      /has no limits/,
    );

    const branched = URDF.replace(
      '<joint name="gripper_frame_joint" type="fixed">',
      '<joint name="gripper_frame_joint" type="revolute">',
    );
    expect(branched).not.toBe(URDF);
    expect(() => so101HomeChain(parseUrdfJoints(branched))).toThrow(
      /not serial/,
    );

    expect(() => parseUrdfJoints('<robot></robot>')).toThrow(/declares no joints/);
    expect(() => so101HomeChain(parseUrdfJoints(URDF), 'no_such_link')).toThrow(
      /no revolute joint/,
    );
  });
});
