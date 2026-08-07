'use client';

import type { ThreeEvent } from '@react-three/fiber';
import type { URDFRobot } from 'urdf-loader';

/**
 * Renders an already-loaded robot (see load-robot.ts). URDF is Z-up (ROS);
 * the scene is Y-up (three.js), so the wrapper applies the frame correction.
 *
 * Clicks on the robot body are swallowed here so they never place an IK
 * target on the ground plane behind the arm; targets come from deliberate
 * clicks on the ground plane only.
 */
export function RobotArm({ robot }: { robot: URDFRobot }) {
  const swallowClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
  };
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} onClick={swallowClick}>
      <primitive object={robot} />
    </group>
  );
}
