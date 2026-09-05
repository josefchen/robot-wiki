'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TrajectoryController } from './use-trajectory';

interface TrajectoryPanelProps {
  controller: TrajectoryController;
}

const buttonBase =
  'rounded-sm border px-3 py-1.5 font-sans text-xs transition-colors active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40';
const buttonIdle =
  'border-border text-text-dim hover:border-border-strong hover:text-text disabled:hover:border-border disabled:hover:text-text-dim';
const buttonAccent = 'border-accent text-accent hover:bg-accent/10';

function formatSeconds(value: number): string {
  return `${value.toFixed(1)} s`;
}

/**
 * Record, play back, export, and import joint-angle trajectories. The
 * panel is presentational: all state lives in the useTrajectory
 * controller, so every control here is reachable by keyboard and every
 * outcome (keyframes, progress, errors) is visible as text.
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
  const duration = Math.max(0, count - 1) * controller.segmentSeconds;
  const canPlay = count > 0 && !controller.playing;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-text-dim">
          Trajectory
        </h2>
        <span
          data-testid="trajectory-count"
          className="font-mono text-xs tabular-nums text-accent"
        >
          {count === 0
            ? 'no keyframes'
            : count === 1
              ? '1 keyframe'
              : `${count} keyframes · ${formatSeconds(duration)}`}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-text-dim">
        Record poses as keyframes, then play them back with eased
        interpolation. Trajectories export and import as JSON.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          data-brand-control-id="control:selection"
          type="button"
          data-testid="trajectory-record"
          aria-pressed={controller.recording}
          onClick={
            controller.recording
              ? controller.stopRecording
              : controller.startRecording
          }
          className={`${buttonBase} ${controller.recording ? buttonAccent : buttonIdle}`}
        >
          {controller.recording ? 'Stop recording' : 'Record'}
        </button>
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid="trajectory-add"
          onClick={controller.addKeyframe}
          disabled={!controller.recording}
          className={`${buttonBase} ${buttonIdle}`}
        >
          Add keyframe
        </button>
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid="trajectory-play"
          onClick={controller.play}
          disabled={!canPlay}
          className={`${buttonBase} ${buttonAccent}`}
        >
          Play
        </button>
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid="trajectory-stop"
          onClick={controller.stopPlayback}
          disabled={!controller.playing}
          className={`${buttonBase} ${buttonIdle}`}
        >
          Stop
        </button>
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid="trajectory-clear"
          onClick={controller.clear}
          disabled={count === 0 && !controller.playing}
          className={`${buttonBase} ${buttonIdle}`}
        >
          Clear
        </button>
      </div>

      {count > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Keyframes">
          {controller.keyframes.map((keyframe, index) => (
            <li key={index}>
              <button
                data-brand-control-id="control:secondary-action"
                type="button"
                data-testid={`trajectory-keyframe-${index}`}
                onClick={() => controller.jumpToKeyframe(index)}
                className="rounded-sm border border-border px-2 py-1 font-mono text-[11px] tabular-nums text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
                aria-label={`Move arm to keyframe ${index + 1}`}
              >
                {`kf ${index + 1} · ${formatSeconds(index * controller.segmentSeconds)}`}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {controller.progress ? (
        <p
          data-testid="trajectory-progress"
          className="mt-3 font-mono text-xs tabular-nums text-text"
          role="status"
        >
          {`t ${controller.progress.t.toFixed(2)} s / ${controller.progress.duration.toFixed(2)} s`}
        </p>
      ) : null}

      {controller.message ? (
        <p
          data-testid="trajectory-message"
          role={controller.message.kind === 'error' ? 'alert' : 'status'}
          className={`mt-3 font-mono text-xs leading-relaxed ${
            controller.message.kind === 'error' ? 'text-err' : 'text-text-dim'
          }`}
        >
          {controller.message.text}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-mono text-xs text-text">Export</h3>
            <button
              data-brand-control-id="control:secondary-action"
              type="button"
              data-testid="trajectory-export"
              onClick={controller.exportTrajectory}
              disabled={count === 0}
              className={`${buttonBase} ${buttonIdle}`}
            >
              Export JSON
            </button>
          </div>
          {controller.exportText !== null ? (
            <div className="mt-2">
              <textarea
                data-brand-control-id="control:input"
                data-testid="trajectory-export-json"
                readOnly
                value={controller.exportText}
                rows={6}
                aria-label="Exported trajectory JSON"
                className="w-full rounded-sm border border-border bg-bg px-2 py-1.5 font-mono text-[11px] leading-relaxed text-text-dim"
                onFocus={(event) => event.target.select()}
              />
              {downloadUrl ? (
                <a
                  data-brand-control-id="control:link-focus"
                  data-testid="trajectory-download"
                  href={downloadUrl}
                  download="so101-trajectory.json"
                  className="mt-1.5 inline-block font-mono text-xs text-text underline decoration-border underline-offset-2 transition-colors hover:decoration-accent"
                >
                  Download so101-trajectory.json
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-mono text-xs text-text">Import</h3>
            <button
              data-brand-control-id="control:secondary-action"
              type="button"
              data-testid="trajectory-import"
              onClick={() => controller.importTrajectory(importText)}
              disabled={importText.trim() === ''}
              className={`${buttonBase} ${buttonIdle}`}
            >
              Import
            </button>
          </div>
          <textarea
            data-brand-control-id="control:input"
            data-testid="trajectory-import-json"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={6}
            aria-label="Trajectory JSON to import"
            placeholder='Paste a trajectory JSON file here'
            className="mt-2 w-full rounded-sm border border-border bg-bg px-2 py-1.5 font-mono text-[11px] leading-relaxed text-text placeholder:text-text-dim"
          />
          <input
            data-brand-control-id="control:input"
            data-testid="trajectory-import-file"
            type="file"
            accept=".json,application/json"
            aria-label="Choose a trajectory JSON file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              file.text().then((text) => setImportText(text));
              event.target.value = '';
            }}
            className="mt-1.5 block w-full font-mono text-xs text-text-dim file:mr-3 file:rounded-sm file:border file:border-border file:bg-surface file:px-3 file:py-1 file:font-sans file:text-xs file:text-text-dim file:transition-colors hover:file:border-border-strong hover:file:text-text"
          />
        </div>
      </div>
    </div>
  );
}
