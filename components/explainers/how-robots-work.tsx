'use client';

import { useEffect, useRef } from 'react';
import { EXPLAINER_CURRICULUM } from './catalog';
import './explainers.css';

/**
 * The explainers gallery: a contents rail beside one explainer column. The
 * markup is static; `startExplainers` loads the 3D kit and the open scene in
 * the browser and fills the column.
 */
export function HowRobotsWork() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    void import('./viewer').then(({ startExplainers }) =>
      startExplainers(root.current!).then((dispose) => {
        if (cancelled) dispose();
        else stop = dispose;
      }),
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  let n = 0;
  return (
    <div ref={root} className="explainers" data-explainers>
      <div className="layout">
        <nav className="rail" aria-label="Explainers">
          {EXPLAINER_CURRICULUM.map(({ group, items }) => (
            <div key={group}>
              <h2>{group}</h2>
              <ol>
                {items.map(({ id, label }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      data-rail-id={id}
                      data-brand-control-id="control:link-focus"
                    >
                      <span className="n">{++n}</span>
                      <span>{label}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </nav>

        <section className="explainer" data-x="explainer">
          <header>
            <p className="kicker" data-x="kicker" />
            <h2 data-x="question">
              Loading…
            </h2>
          </header>
          <div className="stage-wrap">
            <div className="stage" data-x="stage">
              <div className="status" data-x="status">
                Loading…
              </div>
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
            <p className="step-text" data-x="stepText" data-step-text aria-live="polite" />
            <div className="nav">
              <button
                type="button"
                className="btn"
                data-x="prev"
                data-prev
                data-brand-control-id="control:secondary-action"
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
          <div className="readout" data-readout hidden />
          <div className="predict" data-predict hidden />
          <section className="summary" data-x="summary" hidden>
            <p className="sentence" data-x="sentence" />
            <p className="concept" data-x="concept" />
            <details className="check">
              <summary data-x="checkQ" data-brand-control-id="control:secondary-action" />
              <p data-x="checkA" />
            </details>
          </section>
          <details className="fold" data-explainer-fold="how">
            <summary data-brand-control-id="control:secondary-action">
              How this was made
            </summary>
            <div data-x="how" />
          </details>
          <nav className="pager" aria-label="Next and previous explainer">
            <span data-x="pagerPrev" />
            <span data-x="pagerNext" style={{ textAlign: 'right' }} />
          </nav>
        </section>
      </div>
    </div>
  );
}
