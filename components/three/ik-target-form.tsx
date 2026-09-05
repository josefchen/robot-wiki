'use client';

import { useState } from 'react';
import type { Vec3 } from '@/lib/ik';

interface IkTargetFormProps {
  /** Scene coordinates used to prefill the form (the home EE position). */
  defaultTarget: Vec3 | null;
  hasTarget: boolean;
  onSolve: (target: Vec3) => void;
  onClear: () => void;
}

const AXES = ['x', 'y', 'z'] as const;

function formatInput(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/**
 * The keyboard path for inverse kinematics: three numeric inputs for the
 * target in scene coordinates plus solve/clear actions. This produces the
 * same solve as click-to-reach and is fully operable without a pointer.
 */
export function IkTargetForm({
  defaultTarget,
  hasTarget,
  onSolve,
  onClear,
}: IkTargetFormProps) {
  const [fields, setFields] = useState<Record<(typeof AXES)[number], string>>({
    x: '',
    y: '',
    z: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Repopulate the fields whenever the prefill target changes (first ready
  // state, a newly placed target, a reset). Render-time state adjustment,
  // not an effect.
  const [previousDefault, setPreviousDefault] = useState<Vec3 | null>(null);
  if (previousDefault !== defaultTarget) {
    setPreviousDefault(defaultTarget);
    if (defaultTarget) {
      setFields({
        x: formatInput(defaultTarget.x),
        y: formatInput(defaultTarget.y),
        z: formatInput(defaultTarget.z),
      });
      setError(null);
    }
  }

  const submit = () => {
    const parsed: Partial<Vec3> = {};
    for (const axis of AXES) {
      const value = Number.parseFloat(fields[axis]);
      if (!Number.isFinite(value)) {
        setError('Enter a finite number for x, y, and z (meters).');
        return;
      }
      parsed[axis] = value;
    }
    setError(null);
    onSolve(parsed as Vec3);
  };

  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-text-dim">
        IK target
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-text-dim">
        Click the ground in the scene, or type a target here. Scene
        coordinates in meters; y is up.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {AXES.map((axis) => (
          <div key={axis}>
            <label
              htmlFor={`ik-target-${axis}`}
              className="font-mono text-xs text-text"
            >
              Target {axis} (m)
            </label>
            <input
              data-brand-control-id="control:input"
              id={`ik-target-${axis}`}
              data-testid={`ik-input-${axis}`}
              type="number"
              step={0.01}
              inputMode="decimal"
              value={fields[axis]}
              onChange={(event) =>
                setFields((previous) => ({
                  ...previous,
                  [axis]: event.target.value,
                }))
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submit();
                }
              }}
              className="mt-1 w-full rounded-sm border border-border bg-bg px-2 py-1.5 font-mono text-xs tabular-nums text-text placeholder:text-text-dim"
              placeholder="0.000"
            />
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-2 font-mono text-xs text-err">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid="ik-solve"
          onClick={submit}
          className="rounded-sm border border-accent px-3 py-1.5 font-sans text-xs text-accent transition-colors hover:bg-accent/10 active:translate-y-[1px]"
        >
          Solve to target
        </button>
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid="ik-clear"
          onClick={onClear}
          disabled={!hasTarget}
          className="rounded-sm border border-border px-3 py-1.5 font-sans text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-dim"
        >
          Clear target
        </button>
      </div>
    </div>
  );
}
