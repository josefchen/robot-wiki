'use client';

import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { Vec3 } from '@/lib/ik';
import { isWebGLAvailable } from '@/lib/webgl';
import { IkTargetForm } from './ik-target-form';
import { JointControls, JointControlsPlaceholder } from './joint-controls';
import { loadSo101Robot, type LoadedRobot } from './load-robot';
import {
  PlaygroundReadout,
  reachState,
  reachText,
} from './playground-hud';
import { SceneErrorBoundary } from './scene-error-boundary';
import { TechnicalNames } from './technical-names';
import { TrajectoryPanel } from './trajectory-panel';
import { usePlaygroundKinematics } from './use-playground-kinematics';
import { useTrajectory } from './use-trajectory';
import { WebGLUnavailable } from './webgl-unavailable';
import type { RenderedFrameSnapshot } from './robot-scene';
import './playground.css';

// Client-only: R3F must never render on the server (breaks static export).
const RobotScene = dynamic(() => import('./robot-scene'), { ssr: false });

const NOOP_SUBSCRIBE = () => () => {};
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener?.('change', onChange);
  return () => query.removeEventListener?.('change', onChange);
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches;
}

/**
 * The playground: a light stage with the SO-101 arm in the explainers' clay
 * look, the line under it that says where the hand is, and one control deck
 * (joints, reach, motion, technical names) beside the stage on a wide screen
 * and under it on a phone.
 *
 * The WebGL probe runs through useSyncExternalStore so the server render and
 * the first client render agree (null: probe not run yet), keeping static
 * export hydration clean. The model loads outside the R3F tree so progress
 * never depends on the frame loop. `data-playground-state` on the root reads
 * `loading` until the arm and its controls are live, then `ready`, or
 * `unavailable` without WebGL; tests wait on it rather than on timing.
 */
export function PlaygroundCanvas() {
  const probed = useSyncExternalStore(
    NOOP_SUBSCRIBE,
    () => isWebGLAvailable(),
    () => null,
  );
  // A context that probes available but fails when the scene creates it
  // takes the same unavailable branch.
  const [sceneFailed, setSceneFailed] = useState(false);
  const webgl = probed === true && sceneFailed ? false : probed;
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );
  const [loaded, setLoaded] = useState<LoadedRobot | null>(null);
  const [activeJoint, setActiveJoint] = useState<string | null>(null);
  const [viewResetToken, setViewResetToken] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const publishRenderedFrame = useCallback(
    (snapshot: RenderedFrameSnapshot) => {
      const viewport = viewportRef.current;
      if (viewport === null) return;
      const fixed = (values: number[]) => values.map((value) => value.toFixed(6)).join(',');
      viewport.dataset.sceneFrame = String(snapshot.frame);
      viewport.dataset.sceneReady = String(snapshot.ready);
      viewport.dataset.cameraPosition = fixed(snapshot.camera);
      viewport.dataset.cameraTarget = fixed(snapshot.target);
      viewport.dataset.cameraFov = snapshot.fov.toFixed(4);
      viewport.dataset.dpr = String(snapshot.dpr);
      viewport.dataset.drawingBuffer = snapshot.buffer.join('x');
    },
    [],
  );

  useEffect(() => {
    if (webgl !== true) return;
    let cancelled = false;
    loadSo101Robot().then((result) => {
      if (!cancelled) setLoaded(result);
    });
    return () => {
      cancelled = true;
    };
  }, [webgl]);

  const kinematics = usePlaygroundKinematics(loaded);
  const trajectory = useTrajectory({
    joints: kinematics.joints,
    angles: kinematics.angles,
    setPose: kinematics.setPose,
  });
  const ready = loaded !== null && kinematics.ready;
  const state = webgl === false ? 'unavailable' : ready ? 'ready' : 'loading';

  // Manual pose input wins over an in-progress playback: moving a slider or
  // resetting the pose stops the motion before writing.
  const setJointManual = useCallback(
    (name: string, radians: number) => {
      trajectory.stopPlayback();
      kinematics.setJoint(name, radians);
    },
    [trajectory, kinematics],
  );
  // Reset pose: every joint to zero, no target, the camera home. The
  // recorded poses stay; Clear is what removes them.
  const resetPoseManual = useCallback(() => {
    trajectory.stopPlayback();
    kinematics.resetPose();
    setViewResetToken((token) => token + 1);
  }, [trajectory, kinematics]);

  // The reach boxes start from the hand's home position (once, not on every
  // pose change) and then follow explicitly placed targets.
  const [homeHand, setHomeHand] = useState<Vec3 | null>(null);
  if (homeHand === null && kinematics.eePose !== null) {
    setHomeHand(kinematics.eePose.position);
  }

  const reach = reachState({
    target: kinematics.targetScene,
    solving: kinematics.solving,
    residualMm: kinematics.residualMm,
  });
  const hand = kinematics.eePose?.position ?? null;

  return (
    <div className="playground" data-testid="playground" data-playground-state={state}>
      <div className="pg-view">
        <div
          ref={viewportRef}
          data-testid="playground-viewport"
          data-brand-surface-id="surface:flat"
          className="pg-stage"
        >
          {webgl === false ? <WebGLUnavailable /> : null}

          {webgl === true ? (
            <SceneErrorBoundary
              fallback={<WebGLUnavailable />}
              onError={() => setSceneFailed(true)}
            >
              <div className="absolute inset-0">
                <RobotScene
                  robot={loaded}
                  angles={kinematics.angles}
                  target={kinematics.targetScene}
                  targetState={reach === 'idle' ? 'solving' : reach}
                  hand={hand}
                  activeJoint={activeJoint}
                  viewResetToken={viewResetToken}
                  reducedMotion={reducedMotion}
                  onPlaceTarget={kinematics.placeTarget}
                  onRenderedFrame={publishRenderedFrame}
                />
              </div>
            </SceneErrorBoundary>
          ) : null}

          {ready ? (
            <p className="pg-hint">
              <span className="pg-hint-mouse">Drag to turn. Click the floor to set a target.</span>
              <span className="pg-hint-touch">Tap, then drag to turn. Tap the floor to set a target.</span>
            </p>
          ) : null}

          {webgl !== false && !ready ? (
            <p role="status" className="pg-status" data-loading="">
              Loading the arm…
            </p>
          ) : null}
        </div>

        {webgl !== false ? (
          <>
            <PlaygroundReadout
              hand={ready ? hand : null}
              state={reach}
              iterations={kinematics.iterations}
              residualMm={kinematics.residualMm}
            />
            {loaded !== null ? (
              <p className="pg-model" data-testid="robot-status">
                {loaded.info.kind === 'so101'
                  ? `SO-101 · ${loaded.info.jointCount} joints, from its URDF`
                  : `Simplified ${loaded.info.jointCount}-joint arm · the SO-101 model files did not load`}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {webgl !== false ? (
        <div className="pg-deck">
          {ready ? (
            <>
              <JointControls
                joints={kinematics.joints}
                angles={kinematics.angles}
                onChange={setJointManual}
                onReset={resetPoseManual}
                activeJoint={activeJoint}
                onActiveJoint={setActiveJoint}
              />
              <IkTargetForm
                defaultTarget={kinematics.targetScene ?? homeHand}
                hasTarget={kinematics.targetScene !== null}
                onSolve={kinematics.placeTarget}
                onClear={kinematics.clearTarget}
                status={reachText(reach, kinematics.iterations, kinematics.residualMm) || null}
              />
              <TrajectoryPanel controller={trajectory} />
              <TechnicalNames
                joints={kinematics.joints}
                angles={kinematics.angles}
                eeLink={loaded.info.eeLink}
                hand={hand}
                handAngles={kinematics.eePose?.base ?? null}
                target={kinematics.targetScene}
                iterations={kinematics.iterations}
                residualMm={kinematics.residualMm}
              />
            </>
          ) : (
            <>
              <JointControlsPlaceholder />
              <section className="pg-section" aria-busy="true">
                <div className="pg-head">
                  <h2>Reach</h2>
                </div>
                <p className="pg-note">
                  Click the floor to set a target, or type one in centimetres
                  from the base.
                </p>
              </section>
              <section className="pg-section" aria-busy="true">
                <div className="pg-head">
                  <h2>Motion</h2>
                </div>
                <p className="pg-note">
                  Record a few poses, then play them back as one smooth motion.
                </p>
              </section>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
