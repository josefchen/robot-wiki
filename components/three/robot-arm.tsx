'use client';

import type { URDFRobot } from 'urdf-loader';

/**
 * Renders an already-loaded robot (see load-robot.ts). URDF is Z-up (ROS);
 * the scene is Y-up (three.js), so the wrapper applies the frame correction.
 */
export function RobotArm({ robot }: { robot: URDFRobot }) {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={robot} />
    </group>
  );
}
