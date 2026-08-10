'use client';

import type { JointControl } from './use-playground-kinematics';

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

function formatDeg(radians: number): string {
  const deg = radians * RAD_TO_DEG;
  return `${deg >= 0 ? '+' : ''}${deg.toFixed(1)}°`;
}

interface JointControlsProps {
  joints: JointControl[];
  /** Radians per joint name. */
  angles: Record<string, number>;
  onChange: (name: string, radians: number) => void;
  onReset: () => void;
}

/**
 * One labeled slider per revolute joint, with a live degree readout. The
 * slider range is exactly the joint's limit range, so both pointer and
 * keyboard (arrow/Home/End) input clamp at the limits natively; values are
 * clamped again on the way out for synthetic events.
 */
export function JointControls({
  joints,
  angles,
  onChange,
  onReset,
}: JointControlsProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-text-dim">
          Joint angles
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="rounded-sm border border-border px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset pose
        </button>
      </div>

      <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {joints.map((joint) => {
          const value = angles[joint.name] ?? 0;
          const minDeg = joint.lower * RAD_TO_DEG;
          const maxDeg = joint.upper * RAD_TO_DEG;
          return (
            <div key={joint.name}>
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor={`joint-slider-${joint.name}`}
                  className="font-mono text-xs text-text"
                >
                  {joint.name}
                </label>
                <span
                  data-testid={`joint-readout-${joint.name}`}
                  className="font-mono text-xs tabular-nums text-accent"
                >
                  {formatDeg(value)}
                </span>
              </div>
              <input
                id={`joint-slider-${joint.name}`}
                data-testid={`joint-slider-${joint.name}`}
                type="range"
                min={minDeg}
                max={maxDeg}
                // step="any" avoids native step snapping, so the input can
                // sit exactly on the (non-round) URDF limit values. Arrow
                // keys move 1 degree per press.
                step="any"
                value={value * RAD_TO_DEG}
                aria-label={`${joint.name} joint angle, degrees`}
                onChange={(event) => {
                  const deg = Number.parseFloat(event.target.value);
                  if (!Number.isFinite(deg)) return;
                  onChange(
                    joint.name,
                    Math.min(maxDeg, Math.max(minDeg, deg)) * DEG_TO_RAD,
                  );
                }}
                className="mt-1.5 w-full accent-accent"
              />
              <p className="mt-0.5 font-mono text-[10px] tabular-nums text-text-dim">
                limits {minDeg.toFixed(0)}° to +{maxDeg.toFixed(0)}°
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
