'use client';

import { useState } from 'react';
import { robotToScene, type Vec3 } from '@/lib/ik';
import { sceneToBaseFrame } from './joint-labels';

interface IkTargetFormProps {
  /** Scene point the fields start from: the placed target, or the hand at home. */
  defaultTarget: Vec3 | null;
  hasTarget: boolean;
  onSolve: (target: Vec3) => void;
  onClear: () => void;
  /** The reach verdict, repeated here for screens where the stage is out of view. */
  status?: string | null;
  disabled?: boolean;
}

const FIELDS = [
  { key: 'forward', label: 'Forward' },
  { key: 'left', label: 'Left' },
  { key: 'up', label: 'Up' },
] as const;
type FieldKey = (typeof FIELDS)[number]['key'];

function formatCm(metres: number): string {
  const cm = Math.round(metres * 1000) / 10;
  return String(Object.is(cm, -0) ? 0 : cm);
}

/**
 * The keyboard path to a reach: three boxes for the target in centimetres
 * from the base (forward, left, up), the same frame the hand readout uses,
 * and a Reach button. It runs the same solve as a click on the floor.
 */
export function IkTargetForm({
  defaultTarget,
  hasTarget,
  onSolve,
  onClear,
  status = null,
  disabled = false,
}: IkTargetFormProps) {
  const [fields, setFields] = useState<Record<FieldKey, string>>({
    forward: '',
    left: '',
    up: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Refill the boxes whenever the starting point changes (first ready
  // state, a newly placed target, a reset). Render-time state adjustment,
  // not an effect.
  const [previousDefault, setPreviousDefault] = useState<Vec3 | null>(null);
  if (previousDefault !== defaultTarget) {
    setPreviousDefault(defaultTarget);
    if (defaultTarget) {
      const point = sceneToBaseFrame(defaultTarget);
      setFields({
        forward: formatCm(point.forward),
        left: formatCm(point.left),
        up: formatCm(point.up),
      });
      setError(null);
    }
  }

  const submit = () => {
    const cm: Partial<Record<FieldKey, number>> = {};
    for (const { key } of FIELDS) {
      const value = Number.parseFloat(fields[key]);
      if (!Number.isFinite(value)) {
        setError('Enter a number of centimetres in each box.');
        return;
      }
      cm[key] = value;
    }
    setError(null);
    onSolve(
      robotToScene({
        x: (cm.forward ?? 0) / 100,
        y: (cm.left ?? 0) / 100,
        z: (cm.up ?? 0) / 100,
      }),
    );
  };

  return (
    <section className="pg-section" aria-labelledby="pg-reach-heading">
      <div className="pg-head">
        <h2 id="pg-reach-heading">Reach</h2>
      </div>
      <p className="pg-note">
        Click the floor to set a target, or type one in centimetres from the
        base.
      </p>
      <div className="pg-fields">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="pg-field">
            <label htmlFor={`reach-${key}`}>{label}</label>
            <span className="pg-unit-wrap">
              <input
                data-brand-control-id="control:input"
                id={`reach-${key}`}
                data-testid={`reach-input-${key}`}
                type="number"
                step={0.1}
                inputMode="decimal"
                disabled={disabled}
                value={fields[key]}
                aria-describedby="pg-reach-unit"
                onChange={(event) =>
                  setFields((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submit();
                  }
                }}
              />
              <span className="pg-unit" aria-hidden="true">
                cm
              </span>
            </span>
          </div>
        ))}
      </div>
      <span id="pg-reach-unit" hidden>
        centimetres
      </span>

      {error ? (
        <p role="alert" className="pg-error">
          {error}
        </p>
      ) : null}

      <div className="pg-actions">
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid="reach-submit"
          onClick={submit}
          disabled={disabled}
          className="pg-btn"
        >
          Reach
        </button>
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid="reach-clear"
          onClick={onClear}
          disabled={disabled || !hasTarget}
          className="pg-text"
        >
          Clear target
        </button>
      </div>
      {status ? (
        <p className="pg-note pg-narrow-only" aria-hidden="true">
          {status}
        </p>
      ) : null}
    </section>
  );
}
