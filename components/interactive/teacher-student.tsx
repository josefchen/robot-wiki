'use client';

import { useId, useState } from 'react';
import {
  ChartDescription,
  ControlLabel,
  InstrumentFrame,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
} from '@/components/ui';
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

/**
 * TeacherStudent: an authored illustration motivated by input mismatch.
 * Three panels draw chosen terrain, normalized terrain plus seeded noise,
 * and terrain plus a constructed error field. Reconstruction does not
 * infer terrain from the input bars. No teacher or student is trained;
 * the discrepancy readout is 2.2*MAE, not a paper's empirical result.
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
  const descriptionId = `${useId()}-description`;
  const [degradation, setDegradation] = useState(defaultDegradation);

  const readings = proprioReadings(degradation);
  const occluded = occludedCells(degradation);
  const recon = reconstruction(degradation);
  const mae = reconstructionMae(degradation);
  const divergence = actionDivergence(degradation);
  const occludedCount = occluded.filter(Boolean).length;

  return (
    <InstrumentFrame className={className}>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <ControlLabel
            htmlFor="ts-degradation"
            value={`${Math.round(degradation * 100)}%`}
          >
            Proprioceptive degradation
          </ControlLabel>
          <input
            id="ts-degradation"
            type="range"
            data-brand-control-id="control:input"
            min={0}
            max={100}
            step={1}
            value={Math.round(degradation * 100)}
            onChange={(e) => setDegradation(Number(e.target.value) / 100)}
            aria-label={`Proprioceptive degradation, currently ${Math.round(degradation * 100)} percent`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <InstrumentReset onClick={() => setDegradation(defaultDegradation)} />
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

      <PlotStage
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        aria-label={`Teacher-student distillation at ${Math.round(degradation * 100)} percent degradation. Top panel: the teacher's privileged terrain heightfield. Middle panel: the student's proprioceptive history, ${occludedCount} of ${TERRAIN_CELLS} channels occluded. Bottom panel: the student's reconstructed terrain, mean absolute error ${formatMeters(mae)}. Teacher-student action divergence ${formatDivergence(divergence)}.`}
        aria-describedby={descriptionId}
        className="mt-3"
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
                  {/* A broken stub rather than a solid one: an occluded cell
                      has no reading, and the gap says so without the hue. */}
                  <line
                    x1={x}
                    x2={f(x + CELL_W - 1)}
                    y1={f(STUDENT.baseline - 1.5)}
                    y2={f(STUDENT.baseline - 1.5)}
                    stroke="var(--color-err)"
                    strokeWidth={3}
                    strokeDasharray="2 2"
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
              strokeWidth={occluded[i] ? 1.5 : 0}
              strokeDasharray={occluded[i] ? '2 2' : undefined}
            />
          ))}
        </g>
      </PlotStage>

      <InstrumentReadout>
        <span className="text-text-dim">
          degradation {Math.round(degradation * 100)}%:
        </span>{' '}
        <span className="text-text">MAE {formatMeters(mae)}</span>{' '}
        <span className="text-text-dim">divergence</span>{' '}
        <span className="text-accent">{formatDivergence(divergence)}</span>
      </InstrumentReadout>
      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current teacher-student gap"
        description={`At ${Math.round(degradation * 100)} percent proprioceptive degradation the student reconstruction of the teacher terrain sits at ${formatMeters(mae)} MAE with action divergence ${formatDivergence(divergence)}, and ${occludedCount} of ${TERRAIN_CELLS} input channels are already dashed-occluded; the three stacked panels are the privileged heightfield, the proprioceptive history, and that reconstruction.`}
        states={[
          { label: 'degradation', value: `${Math.round(degradation * 100)}%` },
          { label: 'reconstruction MAE', value: formatMeters(mae) },
          { label: 'action divergence', value: formatDivergence(divergence) },
          { label: 'occluded channels', value: `${occludedCount}/${TERRAIN_CELLS}` },
        ]}
      />
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Darker cells are higher terrain. This deterministic toy draws chosen
        terrain, normalized terrain readings with seeded noise, and a
        reconstruction computed from terrain plus authored errors. The input
        strip is not recorded robot sensing. At zero degradation the
        reconstruction is exact; increasing degradation raises the errors by
        construction. The action-divergence label denotes 2.2 times MAE, not
        measured actions from trained policies.
      </p>
    </InstrumentFrame>
  );
}
