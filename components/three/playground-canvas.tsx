'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { isWebGLAvailable } from '@/lib/webgl';
import { loadSo101Robot, type LoadedRobot } from './load-robot';
import { SceneErrorBoundary } from './scene-error-boundary';
import { WebGLUnavailable } from './webgl-unavailable';

// Client-only: R3F must never render on the server (breaks static export).
const RobotScene = dynamic(() => import('./robot-scene'), { ssr: false });

const NOOP_SUBSCRIBE = () => () => {};

/**
 * Viewport for the 3D playground. Probes WebGL support before mounting the
 * canvas, shows a skeletal loading state while the model loads, and renders
 * a minimal monospace HUD once the robot (or its fallback) is ready.
 *
 * The WebGL probe runs through useSyncExternalStore so the server render and
 * the first client render agree (null: probe not run yet), keeping static
 * export hydration clean. The model loads outside the R3F tree so progress
 * never depends on the frame loop.
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

  const loading = webgl === true && loaded === null;

  return (
    <div
      data-testid="playground-viewport"
      className="relative h-[min(72dvh,760px)] min-h-[420px] w-full overflow-hidden rounded-sm border border-border bg-bg"
    >
      {webgl === false ? <WebGLUnavailable /> : null}

      {webgl === true ? (
        <SceneErrorBoundary fallback={<WebGLUnavailable />}>
          <div
            role="img"
            aria-label="Interactive 3D view of a SO-101 robot arm. Drag to orbit, scroll to zoom, right-drag to pan."
            className="absolute inset-0"
          >
            <RobotScene robot={loaded} />
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
  );
}
