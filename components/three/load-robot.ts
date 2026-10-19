import { LoadingManager, type Material, type Mesh, type Object3D } from 'three';
import URDFLoader from 'urdf-loader';
import type { URDFRobot } from 'urdf-loader';
import { createGlbMeshLoader } from './glb-mesh-loader';
import { createProceduralArm } from './procedural-arm';
import { PLAYGROUND_MATERIALS } from './stage-look';

const URDF_URL = '/models/so101/so101.urdf';

export interface RobotInfo {
  kind: 'so101' | 'fallback';
  name: string;
  jointCount: number;
  /** Name of the end-effector link used for FK readouts and IK. */
  eeLink: string;
}

export interface LoadedRobot {
  robot: URDFRobot;
  info: RobotInfo;
  /**
   * The motor meshes that turn each joint, by joint name. The scene paints
   * them in the accent while the reader works that joint's slider.
   */
  motors: Record<string, Mesh[]>;
}

/** The URDF material name of the Feetech STS3215 servo bodies. */
const MOTOR_MATERIAL = 'sts3215';

/**
 * Which joint the motor in each link turns: the SO-101's servo sits in the
 * link before its joint (the explainers' arm scene uses the same table),
 * and the fallback arm's servos in the link they rotate.
 */
const MOTOR_JOINT: Record<string, string> = {
  base_link: 'shoulder_pan',
  shoulder_link: 'shoulder_lift',
  upper_arm_link: 'elbow_flex',
  lower_arm_link: 'wrist_flex',
  wrist_link: 'wrist_roll',
  gripper_link: 'gripper',
};
const FALLBACK_MOTOR_JOINT: Record<string, string> = {
  shoulder_link: 'shoulder_pan',
  upper_arm_link: 'shoulder_lift',
  forearm_link: 'elbow_flex',
};

type UrdfTagged = Object3D & {
  isURDFVisual?: boolean;
  isURDFLink?: boolean;
  urdfNode?: Element | null;
};

function materialName(mesh: Mesh): string {
  for (let node: Object3D | null = mesh; node; node = node.parent) {
    const tagged = node as UrdfTagged;
    if (tagged.isURDFVisual && tagged.urdfNode) {
      return tagged.urdfNode.querySelector('material')?.getAttribute('name') ?? '';
    }
  }
  return ([mesh.material].flat()[0] as Material | undefined)?.name ?? '';
}

function owningLink(mesh: Mesh): string | null {
  for (let node: Object3D | null = mesh.parent; node; node = node.parent) {
    if ((node as UrdfTagged).isURDFLink) return node.name;
  }
  return null;
}

/**
 * Repaints a loaded arm in the explainers' clay look: printed parts in clay,
 * servos in the motor grey, every mesh casting and taking the key light's
 * shadow. The SO-101 meshes ship with a baked yellow; this replaces it.
 */
export function applyStageLook(
  robot: URDFRobot,
  kind: RobotInfo['kind'],
): Record<string, Mesh[]> {
  const table = kind === 'so101' ? MOTOR_JOINT : FALLBACK_MOTOR_JOINT;
  const motors: Record<string, Mesh[]> = {};
  robot.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const isMotor = materialName(mesh) === MOTOR_MATERIAL;
    mesh.material = isMotor ? PLAYGROUND_MATERIALS.dark : PLAYGROUND_MATERIALS.clay;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const link = owningLink(mesh);
    const joint = isMotor && link ? table[link] : undefined;
    if (joint) (motors[joint] ??= []).push(mesh);
  });
  return motors;
}

export function countRevoluteJoints(robot: URDFRobot): number {
  return Object.values(robot.joints).filter((j) => j.jointType === 'revolute')
    .length;
}

function fallbackRobot(): LoadedRobot {
  const robot = createProceduralArm();
  return {
    robot,
    info: {
      kind: 'fallback',
      name: robot.robotName,
      jointCount: countRevoluteJoints(robot),
      eeLink: 'tool_tip',
    },
    motors: applyStageLook(robot, 'fallback'),
  };
}

// Module-level cache: the robot graph is loaded once per page and shared
// across remounts (React Strict Mode double-effects, HMR).
let pending: Promise<LoadedRobot> | null = null;

/**
 * Loads the SO-101 URDF (GLB+Draco meshes) and resolves once every mesh has
 * settled. Never rejects: any URDF or mesh failure resolves to the
 * procedural 3-joint fallback arm, so a missing asset never hangs the page.
 *
 * Deliberately lives outside the R3F tree: this runs on plain effects and
 * fetch, not on the frame loop.
 */
export function loadSo101Robot(): Promise<LoadedRobot> {
  if (pending) return pending;

  pending = new Promise<LoadedRobot>((resolve) => {
    let settled = false;
    let meshFailures = 0;
    let loadedRobot: URDFRobot | null = null;

    const settle = (result: LoadedRobot) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);
    loader.loadMeshCb = createGlbMeshLoader(() => {
      meshFailures += 1;
    });

    // urdf-loader's onLoad fires right after the URDF parses, before the
    // async mesh loads settle. The LoadingManager's onLoad is the real
    // "everything resolved" signal.
    manager.onLoad = () => {
      if (loadedRobot && meshFailures === 0) {
        settle({
          robot: loadedRobot,
          info: {
            kind: 'so101',
            name: loadedRobot.robotName,
            jointCount: countRevoluteJoints(loadedRobot),
            eeLink: 'gripper_frame_link',
          },
          motors: applyStageLook(loadedRobot, 'so101'),
        });
      } else {
        settle(fallbackRobot());
      }
    };

    loader.load(
      URDF_URL,
      (loaded) => {
        loadedRobot = loaded;
      },
      undefined,
      () => settle(fallbackRobot()),
    );
  });

  return pending;
}
