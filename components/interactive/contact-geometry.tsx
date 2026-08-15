'use client';

import { useState } from 'react';
import {
  DEFAULT_ERROR_MM,
  FOOT_XS,
  GROUND_Y,
  HOLE,
  MAX_ERROR_MM,
  MIN_ERROR_MM,
  PEG,
  SCENARIOS,
  SCENARIO_ORDER,
  contactCount,
  formatMm,
  outcomeFor,
  renderedOffsetPx,
  toleranceBandPx,
  type ScenarioId,
} from '@/lib/contact-geometry';
import { cx } from '@/lib/utils';

/**
 * ContactGeometry: inject a contact-model error epsilon into two MDPs and
 * watch what each one does with it.
 *
 * Locomotion (quadruped stance): four near-point foot-ground contacts and a
 * stable gait attractor. The simulator's ground being off by a few
 * millimeters, or even a centimeter, is absorbed by high-bandwidth feedback;
 * the feet stay inside the tolerance band.
 *
 * Manipulation (peg insertion): fourteen simultaneous distributed contacts
 * and a 0.5 mm clearance. The same few-millimeter contact-model error jams
 * the peg against the wall. That asymmetry, not any property of PPO, is why
 * sim-trained RL is the default for walking and not for assembly.
 *
 * Interactive contract: deterministic initial render, native slider and
 * aria-pressed scenario buttons (keyboard-accessible), visible monospace
 * readouts, reset control, fixed 640x320 viewport across scenarios (no
 * layout shift), no JS-driven motion (scrub-only, so reduced-motion safe by
 * construction).
 */

const WIDTH = 640;
const HEIGHT = 320;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

const TERRAIN_POINTS = [
  [0, 250],
  [90, 244],
  [200, 249],
  [320, 243],
  [430, 248],
  [540, 244],
  [640, 249],
] as const;

function ContactMarker({
  id,
  x,
  y,
  normalDeg,
  failed,
}: {
  id: string;
  x: number;
  y: number;
  normalDeg: number;
  failed: boolean;
}) {
  const rad = (normalDeg * Math.PI) / 180;
  const tick = 9;
  return (
    <g data-testid={`contact-marker-${id}`}>
      <line
        x1={f(x)}
        y1={f(y)}
        x2={f(x + Math.sin(rad) * tick)}
        y2={f(y - Math.cos(rad) * tick)}
        stroke={failed ? 'var(--color-err)' : 'var(--color-accent)'}
        strokeWidth={1.5}
      />
      <circle
        cx={f(x)}
        cy={f(y)}
        r={3}
        fill={failed ? 'var(--color-err)' : 'var(--color-accent)'}
      />
    </g>
  );
}

function LocomotionScene({ errorMm }: { errorMm: number }) {
  const spec = SCENARIOS.locomotion;
  const offset = renderedOffsetPx(spec, errorMm);
  const band = toleranceBandPx(spec);
  const failed = outcomeFor(spec, errorMm) === 'fail';
  const footY = f(GROUND_Y - offset);
  const bandY = f(GROUND_Y - band);

  return (
    <g>
      {/* Terrain (where the ground really is). */}
      <polyline
        points={TERRAIN_POINTS.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke="var(--color-border-strong)"
        strokeWidth={2}
      />
      {/* Tolerance band: where feedback can still recover the foot. */}
      <line
        x1={0}
        x2={WIDTH}
        y1={bandY}
        y2={bandY}
        stroke="var(--color-border)"
        strokeWidth={1}
        strokeDasharray="5 4"
      />
      <text
        x={WIDTH - 8}
        y={f(bandY - 6)}
        textAnchor="end"
        fill="var(--color-text-dim)"
        fontSize={10}
        fontFamily="var(--font-mono)"
      >
        tolerance ±{formatMm(spec.toleranceMm)}
      </text>
      {/* Body and legs. Feet are placed where the model thinks the ground is. */}
      <rect
        x={110}
        y={132}
        width={420}
        height={40}
        rx={3}
        fill="var(--color-surface-2)"
        stroke="var(--color-border-strong)"
        strokeWidth={1.5}
      />
      {FOOT_XS.map((x) => (
        <line
          key={x}
          x1={x}
          y1={172}
          x2={x}
          y2={footY}
          stroke="var(--color-text-dim)"
          strokeWidth={2}
        />
      ))}
      {spec.contacts.map((c) => (
        <ContactMarker
          key={c.id}
          id={c.id}
          x={c.x}
          y={footY}
          normalDeg={c.normalDeg}
          failed={failed}
        />
      ))}
      {offset > 0 && (
        <text
          x={12}
          y={60}
          fill={failed ? 'var(--color-err)' : 'var(--color-text-dim)'}
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          ground modeled {errorMm.toFixed(1)} mm too high
        </text>
      )}
    </g>
  );
}

function ManipulationScene({ errorMm }: { errorMm: number }) {
  const spec = SCENARIOS.manipulation;
  const offset = renderedOffsetPx(spec, errorMm);
  const clearance = toleranceBandPx(spec);
  const failed = outcomeFor(spec, errorMm) === 'fail';
  const pegLeft = f(PEG.centerX - PEG.width / 2 + offset);
  const pegRight = f(PEG.centerX + PEG.width / 2 + offset);

  return (
    <g>
      {/* Hole: two walls and a floor. */}
      <rect
        x={f(HOLE.leftX - 24)}
        y={HOLE.mouthY}
        width={24}
        height={f(HOLE.floorY - HOLE.mouthY)}
        fill="var(--color-surface-2)"
        stroke="var(--color-border-strong)"
        strokeWidth={1.5}
      />
      <rect
        x={HOLE.rightX}
        y={HOLE.mouthY}
        width={24}
        height={f(HOLE.floorY - HOLE.mouthY)}
        fill="var(--color-surface-2)"
        stroke="var(--color-border-strong)"
        strokeWidth={1.5}
      />
      <rect
        x={f(HOLE.leftX - 24)}
        y={HOLE.floorY}
        width={f(HOLE.rightX - HOLE.leftX + 48)}
        height={10}
        fill="var(--color-surface-2)"
        stroke="var(--color-border-strong)"
        strokeWidth={1.5}
      />
      {/* Clearance annotation, placed right of the hole where the canvas is empty. */}
      <line
        x1={f(HOLE.rightX - 3)}
        x2={f(HOLE.rightX + 30)}
        y1={212}
        y2={212}
        stroke="var(--color-border)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text
        x={f(HOLE.rightX + 34)}
        y={216}
        fill="var(--color-text-dim)"
        fontSize={10}
        fontFamily="var(--font-mono)"
      >
        clearance {formatMm(spec.toleranceMm)}
      </text>
      {/* Peg, shifted by the contact-model error. */}
      <rect
        x={pegLeft}
        y={PEG.topY}
        width={PEG.width}
        height={f(PEG.bottomY - PEG.topY)}
        rx={2}
        fill={failed ? 'color-mix(in srgb, var(--color-err) 22%, var(--color-surface-2))' : 'var(--color-surface-2)'}
        stroke={failed ? 'var(--color-err)' : 'var(--color-border-strong)'}
        strokeWidth={1.5}
      />
      {/* Grip fingers on the peg top. */}
      <rect
        x={f(pegLeft - 12)}
        y={f(PEG.topY + 2)}
        width={12}
        height={34}
        rx={2}
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
        strokeWidth={1.5}
      />
      <rect
        x={pegRight}
        y={f(PEG.topY + 2)}
        width={12}
        height={34}
        rx={2}
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
        strokeWidth={1.5}
      />
      {spec.contacts.map((c) => {
        // Rim contacts belong to the hole; the rest ride with the peg.
        const ridesWithPeg = !c.id.startsWith('rim-');
        return (
          <ContactMarker
            key={c.id}
            id={c.id}
            x={f(c.x + (ridesWithPeg ? offset : 0))}
            y={c.y}
            normalDeg={c.normalDeg}
            failed={failed}
          />
        );
      })}
      {offset > clearance && (
        <text
          x={12}
          y={f(PEG.topY - 8)}
          fill="var(--color-err)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          contact model off by {errorMm.toFixed(1)} mm: peg overlaps the wall
        </text>
      )}
    </g>
  );
}

export function ContactGeometry({
  defaultScenario = 'locomotion',
  defaultErrorMm = DEFAULT_ERROR_MM,
  className,
}: {
  defaultScenario?: ScenarioId;
  defaultErrorMm?: number;
  className?: string;
}) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>(defaultScenario);
  const [errorMm, setErrorMm] = useState(defaultErrorMm);

  const spec = SCENARIOS[scenarioId];
  const outcome = outcomeFor(spec, errorMm);
  const outcomeText =
    outcome === 'ok' ? spec.outcomeOk : spec.outcomeFail;

  function reset() {
    setScenarioId(defaultScenario);
    setErrorMm(defaultErrorMm);
  }

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div>
          <span
            id="cg-scenario-label"
            className="font-mono text-[11px] text-text-dim"
          >
            Scenario
          </span>
          <div
            role="group"
            aria-labelledby="cg-scenario-label"
            className="mt-2 flex flex-wrap items-center gap-1.5"
          >
            {SCENARIO_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === scenarioId}
                onClick={() => setScenarioId(id)}
                className={cx(
                  'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
                  id === scenarioId
                    ? 'border-accent text-text'
                    : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
                )}
              >
                {SCENARIOS[id].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label
            htmlFor="cg-error"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] text-text-dim"
          >
            Contact-model error
            <span className="font-mono text-xs text-text">
              ε = {errorMm.toFixed(1)} mm
            </span>
          </label>
          <input
            id="cg-error"
            type="range"
            min={MIN_ERROR_MM}
            max={MAX_ERROR_MM}
            step={0.1}
            value={errorMm}
            onChange={(e) => setErrorMm(Number(e.target.value))}
            aria-label={`Contact-model error epsilon, currently ${errorMm.toFixed(1)} millimeters`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
        <span className="text-text-dim">
          Contacts:{' '}
          <span data-testid="contact-count-readout" className="text-text">
            {contactCount(spec)}
          </span>
        </span>
        <span className="text-text-dim">
          Patch:{' '}
          <span data-testid="patch-readout" className="text-text">
            {spec.patchSummary}
          </span>
        </span>
        <span className="text-text-dim">
          Tolerance:{' '}
          <span data-testid="tolerance-readout" className="text-text">
            ±{formatMm(spec.toleranceMm)}
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${spec.label} contact geometry. ${spec.sceneCaption} Injected contact-model error ${errorMm.toFixed(1)} millimeters. Outcome: ${outcomeText}.`}
        className="mt-3 block w-full"
      >
        {scenarioId === 'locomotion' ? (
          <LocomotionScene errorMm={errorMm} />
        ) : (
          <ManipulationScene errorMm={errorMm} />
        )}
      </svg>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">{spec.label}:</span>{' '}
        <span data-testid="error-readout" className="text-accent">
          ε = {errorMm.toFixed(1)} mm
        </span>{' '}
        <span className="text-text-dim">-&gt;</span>{' '}
        <span
          data-testid="outcome-readout"
          className={outcome === 'ok' ? 'text-ok' : 'text-err'}
        >
          {outcomeText}
        </span>
      </p>
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        {spec.sceneCaption} Contact counts and patch radii are illustrative
        renderings of the asymmetry, not one simulator&apos;s solver output.
        The tolerances are representative physical scales: a gait absorbs
        centimeter-scale contact error through feedback, while a 0.5 mm
        insertion clearance makes the same error fatal.
      </p>
    </div>
  );
}
