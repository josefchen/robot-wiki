'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Vec3 } from '@/lib/ik';
import { isWebGLAvailable } from '@/lib/webgl';
import { IkTargetForm } from './ik-target-form';
import { JointControls } from './joint-controls';
import { loadSo101Robot, type LoadedRobot } from './load-robot';
import { PlaygroundHud } from './playground-hud';
import { SceneErrorBoundary } from './scene-error-boundary';
import { usePlaygroundKinematics } from './use-playground-kinematics';
import { WebGLUnavailable } from './webgl-unavailable';

// Client-only: R3F must never render on the server (breaks static export).
const RobotScene = dynamic(() => import('./robot-scene'), { ssr: false });

const NOOP_SUBSCRIBE = () => () => {};

/**
 * Viewport and control deck for the 3D playground. Probes WebGL support
 * before mounting the canvas, shows a skeletal loading state while the
 * model loads, then renders the scene with a monospace HUD overlay plus
 * joint sliders and an IK target form below.
 *
 * The WebGL probe runs through useSyncExternalStore so the server render
 * and the first client render agree (null: probe not run yet), keeping
 * static export hydration clean. The model loads outside the R3F tree so
 * progress never depends on the frame loop.
 */
export function PlaygroundCanvas() {
  const webgl = useSyncExternalStore(
    NOOP_SUBSCRIBE,
    () => isWebGLAvailable(),
    () => null,
  );
  const [loaded, setLoaded] = useState<LoadedRobot | null>(null);

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
  const loading = webgl === true && loaded === null;
  const ready = loaded !== null && kinematics.ready;

  // The target form is prefilled with the home end-effector position (once,
  // not on every pose change) and then tracks explicitly placed targets.
  const [homeEe, setHomeEe] = useState<Vec3 | null>(null);
  if (homeEe === null && kinematics.eePose !== null) {
    setHomeEe(kinematics.eePose.position);
  }

  const targetState = kinematics.solving
    ? 'solving'
    : kinematics.residualMm !== null && kinematics.residualMm <= 1
      ? 'reached'
      : 'unreachable';

  return (
    <div>
      <div
        data-testid="playground-viewport"
        className="relative h-[min(72dvh,760px)] min-h-[420px] w-full overflow-hidden rounded-sm border border-border bg-bg"
      >
        {webgl === false ? <WebGLUnavailable /> : null}

        {webgl === true ? (
          <SceneErrorBoundary fallback={<WebGLUnavailable />}>
            <div
              role="img"
              aria-label="Interactive 3D view of a SO-101 robot arm. Drag to orbit, scroll to zoom, right-drag to pan, click the ground to set an IK target."
              className="absolute inset-0"
            >
              <RobotScene
                robot={loaded}
                angles={kinematics.angles}
                target={kinematics.targetScene}
                targetState={targetState}
                onPlaceTarget={kinematics.placeTarget}
              />
            </div>
          </SceneErrorBoundary>
        ) : null}

        {loading ? (
          <div
            role="status"
            className="absolute inset-0 flex items-center justify-center"
          >
            <p className="font-mono text-xs text-text-dim motion-safe:animate-pulse">
              loading SO-101 model
            </p>
          </div>
        ) : null}

        {ready ? (
          <PlaygroundHud
            joints={kinematics.joints}
            angles={kinematics.angles}
            eePose={kinematics.eePose}
            targetScene={kinematics.targetScene}
            solving={kinematics.solving}
            residualMm={kinematics.residualMm}
            iterations={kinematics.iterations}
          />
        ) : null}

        {loaded !== null ? (
          <p
            data-testid="robot-status"
            className="pointer-events-none absolute bottom-3 left-3 font-mono text-xs text-text-dim"
          >
            <span className="text-text">
              {loaded.info.kind === 'so101' ? 'so-101' : 'procedural fallback'}
            </span>
            {` · ${loaded.info.jointCount} joints`}
            {loaded.info.kind === 'fallback'
              ? ' (model assets unavailable)'
              : ''}
          </p>
        ) : null}
      </div>

      {ready ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
          <section
            aria-label="Joint angle controls"
            className="rounded-sm border border-border bg-surface p-4"
          >
            <JointControls
              joints={kinematics.joints}
              angles={kinematics.angles}
              onChange={kinematics.setJoint}
              onReset={kinematics.resetPose}
            />
          </section>
          <section
            aria-label="Inverse kinematics target"
            className="rounded-sm border border-border bg-surface p-4"
          >
            <IkTargetForm
              defaultTarget={kinematics.targetScene ?? homeEe}
              hasTarget={kinematics.targetScene !== null}
              onSolve={kinematics.placeTarget}
              onClear={kinematics.clearTarget}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
