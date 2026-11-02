/** The sealed B2-EV-023 two-keyframe fixture, previously local to the deep
 * row driver. These explicit angles are inputs, never copied from output. */
export const CANONICAL_PLAYGROUND_JOINTS = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper'] as const;
export const CANONICAL_PLAYGROUND_TRAJECTORY = {
  format: 'robot-atlas-trajectory' as const,
  version: 1,
  jointNames: [...CANONICAL_PLAYGROUND_JOINTS],
  segmentSeconds: 1.2,
  keyframes: [{
    angles: {
      shoulder_pan: 0,
      shoulder_lift: 0,
      elbow_flex: 0,
      wrist_flex: 0,
      wrist_roll: 0,
      gripper: 0
    }
  }, {
    angles: {
      shoulder_pan: 0.2,
      shoulder_lift: 0.1,
      elbow_flex: -0.1,
      wrist_flex: 0.1,
      wrist_roll: 0.1,
      gripper: 0.05
    }
  }]
};
