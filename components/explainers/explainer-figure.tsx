'use client';

import { useEffect, useRef } from 'react';
import { FigureFrame, FigureStage } from '@/components/motion/figure-frame';
import { POSTER_SIZE } from './catalog';
import { EXPLAINER_MOUNTS } from './mounts';
import { EXPLAINER_WORDS, type ExplainerId, type ExplainerWords } from './words';
import './explainers.css';

const START_LABEL = 'Start in 3D';

/**
 * One explainer mounted in its home article, in the shared figure frame: the
 * explainer's question as the headline, its stage and step rail on the
 * figure stage, a plain caption, and "How this was made" holding the steps
 * as text, the parts list and the scene's own method and sources.
 *
 * The served markup is the poster and the steps as text, so the figure
 * reads without WebGL, in print and before any script runs. The viewer
 * drives it as an embed (`startExplainers` with `scene`): it ignores the
 * page hash, and the 3D kit, three.js and the scene load only when the
 * reader presses Start, so an article never opens a WebGL context on load.
 * The stage keeps the poster's aspect ratio, so nothing shifts when the
 * scene replaces it.
 */
export function ExplainerFigure({ id }: { id: ExplainerId }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    void import('./viewer').then(({ startExplainers }) => {
      // Unmounted, or cleaned up by StrictMode, before the viewer loaded: the ref may be gone, so start none.
      if (cancelled || !root.current) return;
      return startExplainers(root.current, { scene: id }).then((dispose) => {
        if (cancelled) dispose();
        else stop = dispose;
      });
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [id]);

  const words: ExplainerWords = EXPLAINER_WORDS[id];
  const stage = (
    <FigureStage className="explainers in-article">
      <div className="explainer" data-x="explainer">
        <div className="stage-wrap">
          <div className="stage" data-x="stage" data-mode="poster">
            {/* The poster stands in for the 3D scene until the reader starts it, without WebGL and in print. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves the poster as is */}
            <img
              className="poster"
              data-x="poster"
              src={`/explainers/posters/${id}.webp`}
              alt={words.steps[0]}
              width={POSTER_SIZE.width}
              height={POSTER_SIZE.height}
              loading="lazy"
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
              {START_LABEL}
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
          <div className="step-text" data-x="stepText" data-step-text aria-live="polite">
            {words.steps[0]}
          </div>
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
          <div className="sentence" data-x="sentence" />
          <div className="concept" data-x="concept" />
          <details className="check">
            <summary data-x="checkQ" data-brand-control-id="control:secondary-action" />
            <div data-x="checkA" />
          </details>
        </div>
      </div>
    </FigureStage>
  );
  return (
    <FigureFrame
      as="div"
      role="group"
      aria-label={words.question}
      ref={root}
      figureId={`explainer-${id}`}
      data-explainer-mount={id}
      heading={words.question}
      stage={stage}
      caption={EXPLAINER_MOUNTS[id].caption}
      method={
        <>
          <div className="font-medium text-text">The steps in words</div>
          <ol className="list-decimal space-y-1 pl-5" data-explainer-text={id}>
            {words.steps.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ol>
          {words.parts ? (
            <>
              <div className="font-medium text-text">Parts</div>
              <ul className="list-disc pl-5" data-explainer-parts>
                {words.parts.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </>
          ) : null}
          <div data-x="how" />
        </>
      }
    />
  );
}
