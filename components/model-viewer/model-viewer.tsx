'use client';

import dynamic from 'next/dynamic';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import type { URDFRobot } from 'urdf-loader';
import { FigureFrame, FigureStage } from '@/components/motion/figure-frame';
import { SceneErrorBoundary } from '@/components/three/scene-error-boundary';
import { WebGLUnavailable } from '@/components/three/webgl-unavailable';
import { isWebGLAvailable } from '@/lib/webgl';
import './model-viewer.css';

// Client-only and loaded on demand: three.js, the URDF and the meshes reach
// the page only after the reader presses "Load model".
const ModelScene = dynamic(() => import('./model-scene'), { ssr: false });

export type ModelViewerProps = {
  /** The record's id. */
  id: string;
  product: string;
  /** Mesh count and shipped size, shown before loading. */
  summary: string;
  heading: string;
  caption: string;
  /** The canvas's text alternative. */
  alt: string;
  /** The shipped URDF's address on the site. */
  urdf: string;
};

export type ViewerState =
  | { kind: 'idle' }
  | { kind: 'loading'; loaded: number; total: number }
  | { kind: 'loaded'; robot: URDFRobot }
  | { kind: 'failed'; failed: number; meshes: number }
  | { kind: 'unavailable' };

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener?.('change', onChange);
  return () => query.removeEventListener?.('change', onChange);
}
const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches;

/** The status line while the files arrive. */
export function loadingText({ loaded, total }: { loaded: number; total: number }): string {
  return total > 0 ? `Loading meshes, ${loaded} of ${total}` : 'Loading the model';
}

/** What the frame says when the model did not assemble. */
export function failedText({ failed, meshes }: { failed: number; meshes: number }): string {
  if (meshes === 0) return 'The URDF did not load, so the model is not drawn.';
  return `${failed} of ${meshes} mesh files did not load, so the model is not drawn.`;
}

/**
 * One maker model in the site's figure frame. The frame holds its height in
 * every state: before loading it shows the model's name, its size and
 * "Load model"; then the loading line; then the model, with "Reset view";
 * or the reason it is not drawn. Nothing 3D is fetched before the press.
 * `data-state` on the root names the state and `data-drawn` appears once a
 * frame of the fitted model has rendered; browser checks wait on both.
 */
export function ModelViewer({ id, product, summary, heading, caption, alt, urdf }: ModelViewerProps) {
  const [state, setState] = useState<ViewerState>({ kind: 'idle' });
  const [drawn, setDrawn] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const unavailableRef = useRef<HTMLDivElement>(null);

  // The pressed button leaves the frame; focus moves to what replaces it.
  const focusSoon = (ref: { current: HTMLElement | null }) =>
    requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));

  const load = useCallback(async () => {
    if (!isWebGLAvailable()) {
      setState({ kind: 'unavailable' });
      focusSoon(unavailableRef);
      return;
    }
    setDrawn(false);
    setState({ kind: 'loading', loaded: 0, total: 0 });
    focusSoon(statusRef);
    const { loadUrdfModel, UrdfModelError } = await import('@/components/three/load-urdf-model');
    try {
      const model = await loadUrdfModel(urdf, (loaded, total) =>
        setState((current) => (current.kind === 'loading' ? { kind: 'loading', loaded, total } : current)),
      );
      setState({ kind: 'loaded', robot: model.robot });
      focusSoon(resetRef);
    } catch (error) {
      const failure = error instanceof UrdfModelError ? error : new UrdfModelError(0, 0);
      setState({ kind: 'failed', failed: failure.failed, meshes: failure.meshes });
      focusSoon(retryRef);
    }
  }, [urdf]);

  const onDrawn = useCallback(() => setDrawn(true), []);
  const onSceneError = useCallback(() => setState({ kind: 'unavailable' }), []);

  return (
    <FigureFrame
      figureId={`model-${id}`}
      data-model-viewer={id}
      data-state={state.kind}
      data-drawn={drawn ? '' : undefined}
      heading={heading}
      caption={caption}
      stage={
        <FigureStage>
          <div className="mv-stage" data-testid="model-stage">
            {state.kind === 'idle' ? (
              <div className="mv-centre">
                <p id={`${id}-name`} className="mv-name">
                  {product}
                </p>
                <p id={`${id}-summary`} className="mv-summary">
                  {summary}
                </p>
                <button
                  type="button"
                  className="mv-btn"
                  data-brand-control-id="control:primary-action"
                  aria-describedby={`${id}-name ${id}-summary`}
                  onClick={load}
                >
                  Load model
                </button>
              </div>
            ) : null}

            {state.kind === 'loading' ? (
              <div className="mv-centre">
                <p ref={statusRef} tabIndex={-1} role="status" className="mv-status" data-loading="">
                  {loadingText(state)}
                </p>
              </div>
            ) : null}

            {state.kind === 'failed' ? (
              <div className="mv-centre">
                <p role="status" className="mv-status">
                  {failedText(state)}
                </p>
                <button
                  ref={retryRef}
                  type="button"
                  className="mv-text"
                  data-brand-control-id="control:secondary-action"
                  onClick={load}
                >
                  Try again
                </button>
              </div>
            ) : null}

            {state.kind === 'unavailable' ? (
              <div ref={unavailableRef} tabIndex={-1} className="mv-centre mv-unavailable">
                <WebGLUnavailable subject="model" />
              </div>
            ) : null}

            {state.kind === 'loaded' ? (
              <>
                <SceneErrorBoundary fallback={null} onError={onSceneError}>
                  <div className="absolute inset-0">
                    <ModelScene
                      robot={state.robot}
                      label={alt}
                      resetToken={resetToken}
                      reducedMotion={reducedMotion}
                      onDrawn={onDrawn}
                    />
                  </div>
                </SceneErrorBoundary>
                <p className="mv-hint" aria-hidden="true">
                  <span className="mv-hint-mouse">Drag to turn. Click, then scroll to zoom.</span>
                  <span className="mv-hint-touch">Tap, then drag to turn and pinch to zoom.</span>
                </p>
                <button
                  ref={resetRef}
                  type="button"
                  className="mv-text mv-reset"
                  data-brand-control-id="control:secondary-action"
                  onClick={() => setResetToken((token) => token + 1)}
                >
                  Reset view
                </button>
              </>
            ) : null}
          </div>
        </FigureStage>
      }
    />
  );
}
