'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { TrajectoryController } from './use-trajectory';

interface TrajectoryPanelProps {
  controller: TrajectoryController;
}

function formatSeconds(value: number): string {
  return `${value.toFixed(1)} s`;
}

function poseCount(count: number, segmentSeconds: number): string {
  if (count === 0) return 'No poses yet';
  if (count === 1) return '1 pose';
  return `${count} poses · ${formatSeconds((count - 1) * segmentSeconds)}`;
}

/**
 * Record poses, play them back as one eased motion, and export or import
 * the motion as a JSON file. The panel is presentational: all state lives
 * in the useTrajectory controller, so every control here is reachable by
 * keyboard and every outcome (poses, progress, errors) is visible as text.
 */
export function TrajectoryPanel({ controller }: TrajectoryPanelProps) {
  const [importText, setImportText] = useState('');

  // Object URL for the export download, revoked when replaced or unmounted.
  // Guarded because jsdom has no URL.createObjectURL.
  const downloadUrl = useMemo(() => {
    if (
      controller.exportText === null ||
      typeof URL.createObjectURL !== 'function'
    ) {
      return null;
    }
    return URL.createObjectURL(
      new Blob([controller.exportText], { type: 'application/json' }),
    );
  }, [controller.exportText]);
  useEffect(() => {
    if (!downloadUrl) return;
    return () => URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  const count = controller.keyframes.length;
  const { playing, progress } = controller;

  return (
    <section className="pg-section" aria-labelledby="pg-motion-heading">
      <div className="pg-head">
        <h2 id="pg-motion-heading">Motion</h2>
        <span data-testid="trajectory-count" className="pg-count">
          {poseCount(count, controller.segmentSeconds)}
        </span>
      </div>

      <div className="pg-actions">
        <button
          data-brand-control-id="control:primary-action"
          type="button"
          data-testid="trajectory-record"
          onClick={controller.recordPose}
          className="pg-btn pg-primary"
        >
          Record pose
        </button>
        {/* One button that reads Play, or Stop while the motion runs, so focus stays put. */}
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid={playing ? 'trajectory-stop' : 'trajectory-play'}
          onClick={playing ? controller.stopPlayback : controller.play}
          disabled={!playing && count === 0}
          className="pg-btn"
        >
          {playing ? 'Stop' : 'Play'}
        </button>
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid="trajectory-clear"
          aria-label="Clear the recorded poses"
          onClick={controller.clear}
          disabled={count === 0 && !playing}
          className="pg-text"
        >
          Clear
        </button>
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid="trajectory-export"
          onClick={controller.exportTrajectory}
          disabled={count === 0}
          className="pg-text"
        >
          Export
        </button>
      </div>

      {count > 0 ? (
        <ol className="pg-poses" aria-label="Recorded poses">
          {controller.keyframes.map((_, index) => (
            <li key={index}>
              <button
                data-brand-control-id="control:secondary-action"
                type="button"
                data-testid={`trajectory-keyframe-${index}`}
                onClick={() => controller.jumpToKeyframe(index)}
                className="pg-pose"
                aria-label={`Move the arm to pose ${index + 1}, at ${formatSeconds(index * controller.segmentSeconds)}`}
              >
                {index + 1}
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      {progress ? (
        <div
          data-testid="trajectory-progress"
          data-t={progress.t.toFixed(3)}
          data-duration={progress.duration.toFixed(3)}
          className="pg-progress"
        >
          <span>{`${progress.t.toFixed(1)} of ${formatSeconds(progress.duration)}`}</span>
          <span className="pg-bar" aria-hidden="true">
            <span
              style={
                {
                  transform: `scaleX(${Math.min(1, progress.t / progress.duration)})`,
                } as CSSProperties
              }
            />
          </span>
        </div>
      ) : null}

      {controller.message ? (
        <p
          data-testid="trajectory-message"
          role={controller.message.kind === 'error' ? 'alert' : 'status'}
          className="pg-message"
        >
          {controller.message.text}
        </p>
      ) : null}

      {controller.exportText !== null ? (
        <div className="pg-fold">
          <textarea
            data-brand-control-id="control:input"
            data-testid="trajectory-export-json"
            readOnly
            value={controller.exportText}
            rows={6}
            aria-label="The exported motion, as JSON"
            onFocus={(event) => event.target.select()}
          />
          {downloadUrl ? (
            <a
              data-brand-control-id="control:link-focus"
              data-testid="trajectory-download"
              href={downloadUrl}
              download="so101-trajectory.json"
              className="pg-download"
            >
              Download so101-trajectory.json
            </a>
          ) : null}
        </div>
      ) : null}

      <details data-testid="trajectory-import-fold">
        <summary data-brand-control-id="control:secondary-action">
          Import a motion
        </summary>
        <div className="pg-fold">
          <textarea
            data-brand-control-id="control:input"
            data-testid="trajectory-import-json"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={5}
            aria-label="A motion to import, as JSON"
            placeholder="Paste an exported motion here"
          />
          <input
            data-brand-control-id="control:input"
            data-testid="trajectory-import-file"
            type="file"
            accept=".json,application/json"
            aria-label="Choose a motion file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              file.text().then((text) => setImportText(text));
              event.target.value = '';
            }}
          />
          <div className="pg-actions">
            <button
              data-brand-control-id="control:secondary-action"
              type="button"
              data-testid="trajectory-import"
              onClick={() => controller.importTrajectory(importText)}
              disabled={importText.trim() === ''}
              className="pg-btn"
            >
              Import
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
