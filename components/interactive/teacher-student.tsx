'use client';

import { useState } from 'react';
import {
  DEFAULT_DEGRADATION,
  TERRAIN,
  TERRAIN_CELLS,
  actionDivergence,
  formatDivergence,
  formatMeters,
  occludedCells,
  proprioReadings,
  reconstruction,
  reconstructionMae,
  terrainColor,
} from '@/lib/sim2real';
import { cx } from '@/lib/utils';

/**
 * TeacherStudent: the information gap due to input mismatch in privileged
 * distillation, made visible. Three stacked panels share one terrain:
 *
 * - teacher: the privileged heightfield under the feet (what the simulator
 *   tells the teacher policy),
 * - student input: a recent history of proprioceptive readings, which noise
 *   and occlusion degrade as the control rises,
 * - reconstruction: the student's estimate of the terrain built from that
 *   history, converging to the teacher's map at zero degradation and
 *   blurring apart as the input degrades.
 *
 * A numeric teacher-student action-divergence readout rises monotonically
 * with the degradation control, matching the Isaac Lab finding that the
 * student must reconstruct unobserved state and degrades under occlusion.
 *
 * Interactive contract: deterministic initial render, native range input
 * (keyboard-accessible), visible monospace readouts, reset control, fixed
 * SVG viewport (no layout shift), no JS-driven motion (scrub-only, so
 * reduced-motion safe by construction).
 */

const WIDTH = 640;
const HEIGHT = 300;
const PLOT_LEFT = 16;
const PLOT_RIGHT = 624;
const CELL_W = (PLOT_RIGHT - PLOT_LEFT) / TERRAIN_CELLS;

const TEACHER = { labelY: 18, top: 24, height: 54 } as const;
const STUDENT = { labelY: 118, baseline: 172, maxHeight: 54 } as const;
const RECON = { labelY: 218, top: 224, height: 54 } as const;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

export function TeacherStudent({
  defaultDegradation = DEFAULT_DEGRADATION,
  className,
}: {
  defaultDegradation?: number;
  className?: string;
}) {
  const [degradation, setDegradation] = useState(defaultDegradation);

  const readings = proprioReadings(degradation);
  const occluded = occludedCells(degradation);
  const recon = reconstruction(degradation);
  const mae = reconstructionMae(degradation);
  const divergence = actionDivergence(degradation);
  const occludedCount = occluded.filter(Boolean).length;

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label
            htmlFor="ts-degradation"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Proprioceptive degradation
            <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
              {Math.round(degradation * 100)}%
            </span>
          </label>
          <input
            id="ts-degradation"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(degradation * 100)}
            onChange={(e) => setDegradation(Number(e.target.value) / 100)}
            aria-label={`Proprioceptive degradation, currently ${Math.round(degradation * 100)} percent`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <button
          data-pagefind-ignore
          type="button"
          onClick={() => setDegradation(defaultDegradation)}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
        <span className="text-text-dim">
          reconstruction MAE:{' '}
          <span data-testid="mae-readout" className="text-text">
            {formatMeters(mae)}
          </span>
        </span>
        <span className="text-text-dim">
          action divergence:{' '}
          <span data-testid="divergence-readout" className="text-accent">
            {formatDivergence(divergence)}
          </span>
        </span>
        <span className="text-text-dim">
          occluded channels:{' '}
          <span data-testid="occluded-readout" className="text-text">
            {occludedCount}/{TERRAIN_CELLS}
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Teacher-student distillation at ${Math.round(degradation * 100)} percent degradation. Top panel: the teacher's privileged terrain heightfield. Middle panel: the student's proprioceptive history, ${occludedCount} of ${TERRAIN_CELLS} channels occluded. Bottom panel: the student's reconstructed terrain, mean absolute error ${formatMeters(mae)}. Teacher-student action divergence ${formatDivergence(divergence)}.`}
        className="mt-3 block w-full"
      >
        {/* Teacher: privileged terrain heightfield. */}
        <text
          x={PLOT_LEFT}
          y={TEACHER.labelY}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          teacher (privileged): terrain heightfield under the feet
        </text>
        <g data-testid="teacher-panel">
          {TERRAIN.map((h, i) => (
            <rect
              key={i}
              x={f(PLOT_LEFT + i * CELL_W)}
              y={TEACHER.top}
              width={f(CELL_W - 1)}
              height={TEACHER.height}
              fill={terrainColor(h)}
            />
          ))}
        </g>

        {/* Student input: proprioceptive history bars. */}
        <text
          x={PLOT_LEFT}
          y={STUDENT.labelY}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          student input: recent proprioceptive readings
        </text>
        <g data-testid="student-panel">
          {readings.map((v, i) => {
            const x = f(PLOT_LEFT + i * CELL_W);
            if (occluded[i]) {
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={f(STUDENT.baseline - 3)}
                    width={f(CELL_W - 1)}
                    height={3}
                    fill="var(--color-err)"
                  />
                  <line
                    x1={f(x + (CELL_W - 1) / 2)}
                    x2={f(x + (CELL_W - 1) / 2)}
                    y1={f(STUDENT.baseline - 3)}
                    y2={f(STUDENT.baseline - STUDENT.maxHeight)}
                    stroke="var(--color-err)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                    opacity={0.5}
                  />
                </g>
              );
            }
            const h = Math.max(
              2,
              Math.min(STUDENT.maxHeight, v * STUDENT.maxHeight),
            );
            return (
              <rect
                key={i}
                x={x}
                y={f(STUDENT.baseline - h)}
                width={f(CELL_W - 1)}
                height={f(h)}
                fill="var(--color-text-dim)"
              />
            );
          })}
          <line
            x1={PLOT_LEFT}
            x2={PLOT_RIGHT}
            y1={STUDENT.baseline}
            y2={STUDENT.baseline}
            stroke="var(--color-border-strong)"
            strokeWidth={1}
          />
        </g>

        {/* Student reconstruction of the terrain. */}
        <text
          x={PLOT_LEFT}
          y={RECON.labelY}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          student reconstruction of the terrain
        </text>
        <g data-testid="recon-panel">
          {recon.map((h, i) => (
            <rect
              key={i}
              x={f(PLOT_LEFT + i * CELL_W)}
              y={RECON.top}
              width={f(CELL_W - 1)}
              height={RECON.height}
              fill={terrainColor(h)}
              stroke={occluded[i] ? 'var(--color-err)' : 'none'}
              strokeWidth={occluded[i] ? 1 : 0}
            />
          ))}
        </g>
      </svg>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">
          degradation {Math.round(degradation * 100)}%:
        </span>{' '}
        <span className="text-text">MAE {formatMeters(mae)}</span>{' '}
        <span className="text-text-dim">divergence</span>{' '}
        <span className="text-accent">{formatDivergence(divergence)}</span>
      </p>
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Brighter cells are higher terrain; the teacher sees them directly. The
        student sees only the bar strip: joint positions, velocities, and
        contact events over a short history. At zero degradation its
        reconstruction matches the teacher&apos;s map and the two policies
        agree. As noise and occlusion rise, the reconstruction blurs, the
        student&apos;s belief about what is under the feet drifts, and its
        actions diverge from the privileged teacher&apos;s.
      </p>
    </div>
  );
}
