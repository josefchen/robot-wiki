'use client';

import { useEffect, useRef } from 'react';
import type { ExplainerId } from '@/components/explainers/words';
import '@/components/explainers/explainers.css';

/**
 * Home's featured scene: one explainer from /how-robots-work/, in the same
 * markup and driven by the same viewer, without the gallery's rail, header,
 * pager and "How this was made" fold.
 *
 * The page paints the explainer's poster and its first step as text. The
 * viewer module loads after hydration and fills the step rail; the 3D kit,
 * three.js and the scene load only when the reader presses the stage's
 * start button (`startExplainers` with `embed`), so home's first load never
 * carries them. The props come from the server page, so this chunk carries
 * no explainer words.
 */
export function FeaturedExplainer({
  scene,
  firstStep,
  posterWidth,
  posterHeight,
  startLabel,
}: {
  scene: ExplainerId;
  /** The explainer's first step, which is also its poster's alternative text. */
  firstStep: string;
  posterWidth: number;
  posterHeight: number;
  startLabel: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    void import('@/components/explainers/viewer').then(({ startExplainers }) => {
      // Unmounted, or cleaned up by StrictMode, before the viewer loaded: the ref may be gone, so start none.
      if (cancelled) return;
      return startExplainers(root.current!, { scene }).then((dispose) => {
        if (cancelled) dispose();
        else stop = dispose;
      });
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [scene]);

  return (
    <div ref={root} className="explainers" data-explainers data-explainer-embed={scene}>
      <div className="explainer" data-x="explainer">
        <div className="stage-wrap">
          <div className="stage" data-x="stage" data-mode="poster">
            {/* The poster stands in for the 3D scene until the reader starts it, without WebGL and in print. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves the poster as is */}
            <img
              className="poster"
              data-x="poster"
              src={`/explainers/posters/${scene}.webp`}
              alt={firstStep}
              width={posterWidth}
              height={posterHeight}
            />
            <div className="status" data-x="status" hidden>
              Loading…
            </div>
            <button
              type="button"
              className="btn start"
              data-x="start"
              data-brand-control-id="control:secondary-action"
              hidden
            >
              {startLabel}
            </button>
            <div className="hint" data-hint data-stage-overlay hidden />
          </div>
          <div
            className="card"
            data-card
            data-stage-overlay
            data-brand-surface-id="surface:flat"
            aria-live="polite"
            hidden
          />
        </div>
        <div className="steps">
          <div className="dots" data-x="dots" data-steps />
          <p className="step-text" data-x="stepText" data-step-text aria-live="polite">
            {firstStep}
          </p>
          <div className="nav">
            <button
              type="button"
              className="btn"
              data-x="prev"
              data-prev
              data-brand-control-id="control:secondary-action"
              disabled
            >
              Back
            </button>
            <button
              type="button"
              className="btn primary"
              data-x="next"
              data-next
              data-brand-control-id="control:primary-action"
            >
              Next
            </button>
          </div>
        </div>
        <div className="controls" data-controls />
        <div className="fold parts" data-parts hidden />
        <div className="readout" data-readout hidden />
        <div className="predict" data-predict hidden />
        <div className="summary" data-x="summary" hidden>
          <p className="sentence" data-x="sentence" />
          <p className="concept" data-x="concept" />
          <details className="check">
            <summary data-x="checkQ" data-brand-control-id="control:secondary-action" />
            <p data-x="checkA" />
          </details>
        </div>
      </div>
    </div>
  );
}
