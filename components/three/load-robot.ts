import { LoadingManager } from 'three';
import URDFLoader from 'urdf-loader';
import type { URDFRobot } from 'urdf-loader';
import { createGlbMeshLoader } from './glb-mesh-loader';
import { createProceduralArm } from './procedural-arm';

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
