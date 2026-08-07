import {
  BoxGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
// urdf-loader default-exports only URDFLoader at runtime; the robot classes
// are re-exported from this submodule (typed by its bundled .d.ts). Building
// the fallback from the real classes keeps its API identical to a loaded
// URDFRobot: .joints, .links, setJointValue(name, angle), joint limits.
import { URDFJoint, URDFLink, URDFRobot } from 'urdf-loader/src/URDFClasses.js';

// Matches the baked SO-101 GLB materials: amber 3D-printed shell, dark servos.
const SHELL_MATERIAL = new MeshStandardMaterial({
  color: 0xffd11f,
  roughness: 0.65,
  metalness: 0.05,
});
const SERVO_MATERIAL = new MeshStandardMaterial({
  color: 0x1a1a1a,
  roughness: 0.5,
  metalness: 0.2,
});

function makeJoint(
  name: string,
  origin: [number, number, number],
  lower: number,
  upper: number,
): URDFJoint {
  const joint = new URDFJoint();
  joint.name = name;
  joint.jointType = 'revolute';
  // Axes follow the URDF Z-up convention (the scene wrapper rotates the
  // whole robot into three.js Y-up): base yaw about Z, pitches about Y.
  if (name === 'shoulder_pan') {
    joint.axis.set(0, 0, 1);
  } else {
    joint.axis.set(0, 1, 0);
  }
  joint.position.set(...origin);
  joint.limit.lower = lower;
  joint.limit.upper = upper;
  return joint;
}

function makeLink(name: string): URDFLink {
  const link = new URDFLink();
  link.name = name;
  return link;
}

function segment(length: number, width: number): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(width, width, length),
    SHELL_MATERIAL,
  );
  mesh.position.z = length / 2;
  return mesh;
}

function servo(radius: number, height: number): Mesh {
  return new Mesh(new CylinderGeometry(radius, radius, height, 24), SERVO_MATERIAL);
}

/**
 * Builds a 3-joint procedural arm used when the SO-101 URDF or its meshes
 * fail to load. Z-up, roughly SO-101 scale (about 0.3 m of reach), with the
 * same joint names and limit ranges as the real arm's first three joints.
 */
export function createProceduralArm(): URDFRobot {
  const robot = new URDFRobot();
  robot.name = 'base_link';
  robot.robotName = 'procedural-fallback';

  const base = new Mesh(
    new CylinderGeometry(0.05, 0.055, 0.03, 32),
    SHELL_MATERIAL,
  );
  base.position.z = 0.015;
  robot.add(base);

  const shoulderPan = makeJoint('shoulder_pan', [0, 0, 0.03], -1.92, 1.92);
  const shoulder = makeLink('shoulder_link');
  const shoulderServo = servo(0.026, 0.05);
  shoulderServo.position.z = 0.012;
  shoulder.add(shoulderServo, segment(0.11, 0.04));

  const shoulderLift = makeJoint('shoulder_lift', [0, 0, 0.11], -1.745, 1.745);
  const upperArm = makeLink('upper_arm_link');
  const liftServo = servo(0.024, 0.045);
  liftServo.rotation.x = Math.PI / 2;
  upperArm.add(liftServo, segment(0.1, 0.035));

  const elbowFlex = makeJoint('elbow_flex', [0, 0, 0.1], -1.69, 1.69);
  const forearm = makeLink('forearm_link');
  const elbowServo = servo(0.02, 0.04);
  elbowServo.rotation.x = Math.PI / 2;
  const tip = new Mesh(new SphereGeometry(0.018, 16, 12), SERVO_MATERIAL);
  tip.position.z = 0.09;
  forearm.add(elbowServo, segment(0.09, 0.03), tip);

  // Fixed tool frame at the tip, like the SO-101's gripper_frame_link: it
  // gives IK a well-defined end effector past the elbow joint.
  const toolTipJoint = makeJoint('tool_tip_joint', [0, 0, 0.09], 0, 0);
  toolTipJoint.jointType = 'fixed';
  const toolTip = makeLink('tool_tip');

  robot.add(shoulderPan);
  shoulderPan.add(shoulder);
  shoulder.add(shoulderLift);
  shoulderLift.add(upperArm);
  upperArm.add(elbowFlex);
  elbowFlex.add(forearm);
  forearm.add(toolTipJoint);
  toolTipJoint.add(toolTip);

  robot.joints = {
    shoulder_pan: shoulderPan,
    shoulder_lift: shoulderLift,
    elbow_flex: elbowFlex,
    tool_tip_joint: toolTipJoint,
  };
  robot.links = {
    base_link: robot,
    shoulder_link: shoulder,
    upper_arm_link: upperArm,
    forearm_link: forearm,
    tool_tip: toolTip,
  };

  return robot;
}
