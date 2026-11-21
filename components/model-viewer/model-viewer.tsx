'use client';

import dynamic from 'next/dynamic';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import type { URDFRobot } from 'urdf-loader';
import { FigureFrame, FigureStage } from '@/components/motion/figure-frame';
import { SceneErrorBoundary } from '@/components/three/scene-error-boundary';
import { WebGLUnavailable } from '@/components/three/webgl-unavailable';
import type { ModelStill } from '@/lib/robots-in-3d-page';
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
  /** The opening view, rendered from the same files, shown until the model has drawn. */
  still: ModelStill;
};

export type ViewerState =
  | { kind: 'idle' }
  | { kind: 'loading'; loaded: number; total: number }
  | { kind: 'loaded'; robot: URDFRobot; total: number }
  | { kind: 'failed'; failed: number; meshes: number }
  | { kind: 'viewer-failed' }
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
 * every state: before loading it shows the still of the opening view with
 * the model's size and "Load model" over it; then the loading line over the
 * still; then the model, with its hint and "Reset view", which replaces the
 * still once the fitted model has drawn; or the reason it is not drawn.
 * Until that frame the canvas is mounted but hidden and the loading line
 * stays, so the still is the only picture. Nothing 3D is fetched before the
 * press. `data-state` on the root names the state and `data-drawn` appears
 * once a frame of the fitted model has rendered; browser checks wait on both.
 */
export function ModelViewer({ id, product, summary, heading, caption, alt, urdf, still }: ModelViewerProps) {
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

  const onViewerError = useCallback(() => {
    setState({ kind: 'viewer-failed' });
    focusSoon(retryRef);
  }, []);

  const load = useCallback(async () => {
    if (!isWebGLAvailable()) {
      setState({ kind: 'unavailable' });
      focusSoon(unavailableRef);
      return;
    }
    setDrawn(false);
    setState({ kind: 'loading', loaded: 0, total: 0 });
    focusSoon(statusRef);
    const loader = await import('@/components/three/load-urdf-model').catch(() => null);
    if (!loader) {
      onViewerError();
      return;
    }
    try {
      const model = await loader.loadUrdfModel(urdf, (loaded, total) =>
        setState((current) => (current.kind === 'loading' ? { kind: 'loading', loaded, total } : current)),
      );
      setState((current) => ({ kind: 'loaded', robot: model.robot, total: current.kind === 'loading' ? current.total : 0 }));
    } catch (error) {
      const failure = error instanceof loader.UrdfModelError ? error : { failed: 0, meshes: 0 };
      setState({ kind: 'failed', failed: failure.failed, meshes: failure.meshes });
      focusSoon(retryRef);
    }
  }, [urdf, onViewerError]);

  const onDrawn = useCallback(() => {
    setDrawn(true);
    focusSoon(resetRef);
  }, []);
  const pending = state.kind === 'loaded' && !drawn;
  const showStill = state.kind === 'idle' || state.kind === 'loading' || pending;
  const progress = state.kind === 'loading' ? state : pending ? { loaded: state.total, total: state.total } : null;

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
            {showStill ? (
              <picture className="mv-still">
                <source media={still.wide.media} srcSet={still.wide.src} width={still.wide.width} height={still.wide.height} />
                <img
                  src={still.square.src}
                  alt={still.alt}
                  width={still.square.width}
                  height={still.square.height}
                  decoding="async"
                  data-model-still=""
                />
              </picture>
            ) : null}

            {state.kind === 'idle' ? (
              <div className="mv-load">
                <button
                  type="button"
                  className="mv-btn"
                  data-brand-control-id="control:primary-action"
                  aria-describedby={`${id}-name ${id}-summary`}
                  onClick={load}
                >
                  Load model
                </button>
                <p className="mv-summary">
                  <span id={`${id}-name`} className="sr-only">
                    {product},{' '}
                  </span>
                  <span id={`${id}-summary`}>{summary}</span>
                </p>
              </div>
            ) : null}

            {progress ? (
              <div className="mv-load">
                <p ref={statusRef} tabIndex={-1} role="status" className="mv-status" data-loading="">
                  {loadingText(progress)}
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

            {state.kind === 'viewer-failed' ? (
              <div className="mv-centre">
                <p role="status" className="mv-status">The 3D viewer could not start.</p>
                <button ref={retryRef} type="button" className="mv-text" onClick={() => window.location.reload()}>
                  Reload page
                </button>
              </div>
            ) : null}

            {state.kind === 'loaded' ? (
              <>
                <SceneErrorBoundary fallback={null} onError={onViewerError}>
                  {/* Hidden, not unmounted: the canvas keeps its size while the fit runs. */}
                  <div
                    className="absolute inset-0"
                    data-testid="model-scene"
                    style={drawn ? undefined : { visibility: 'hidden' }}
                  >
                    <ModelScene
                      robot={state.robot}
                      label={alt}
                      resetToken={resetToken}
                      reducedMotion={reducedMotion}
                      onDrawn={onDrawn}
                    />
                  </div>
                </SceneErrorBoundary>
                {drawn ? (
                  <>
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
              </>
            ) : null}
          </div>
        </FigureStage>
      }
    />
  );
}
