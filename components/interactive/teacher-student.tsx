'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';
import {
  DEFAULT_DEGRADATION,
  TERRAIN,
  TERRAIN_CELLS,
  TERRAIN_MAX,
  TERRAIN_MIN,
  actionDivergence,
  formatDivergence,
  formatMeters,
  occludedCells,
  proprioReadings,
  reconstruction,
  reconstructionMae,
} from '@/lib/sim2real';

/**
 * TeacherStudent: an authored illustration motivated by input mismatch.
 * Three panels draw chosen terrain, normalized terrain plus seeded noise,
 * and terrain plus a constructed error field. Reconstruction does not
 * infer terrain from the input bars. No teacher or student is trained;
 * the discrepancy readout is 2.2*MAE, not a paper's empirical result.
 *
 * Interactive contract: deterministic initial render, native range input
 * (keyboard-accessible), visible readouts, reset control, fixed SVG
 * viewport (no layout shift), no JS-driven motion (scrub-only, so
 * reduced-motion safe by construction).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 216;
const PLOT_LEFT = 8;
const PLOT_RIGHT = 332;
const CELL_W = (PLOT_RIGHT - PLOT_LEFT) / TERRAIN_CELLS;

const TEACHER = { labelY: 20, top: 28, height: 36 } as const;
const STUDENT = { labelY: 88, baseline: 140, maxHeight: 42 } as const;
const RECON = { labelY: 164, top: 172, height: 36 } as const;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

/**
 * Terrain height as the opacity of one role colour, the same map for the
 * teacher's terrain and the student's reconstruction so equal heights paint
 * identically. Higher terrain is fainter, so darker cells are higher.
 */
function terrainOpacity(height: number): number {
  const t = (height - TERRAIN_MIN) / (TERRAIN_MAX - TERRAIN_MIN);
  return f(1 - 0.7 * Math.min(1, Math.max(0, t)));
}

function PanelTitle({ y, children }: { y: number; children: string }) {
  return (
    <text
      data-scene-note=""
      x={PLOT_LEFT}
      y={y}
      fontSize={CHART_TYPE.axisPx}
      fill={CHART_STRUCTURE.labelSecondary}
    >
      {children}
    </text>
  );
}

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
  const terrainColour = roleColour('state');
  const readingColour = roleColour('measurement');
  const occludedColour = roleColour('constraint');

  return (
    <InstrumentFigure
      figureId="teacher-student"
      className={className}
      heading="Teacher terrain and student reconstruction"
      controls={
        <>
          <ControlField>
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
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <InstrumentReset onClick={() => setDegradation(defaultDegradation)} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="terrain" swatch={<LegendSwatch role="state" mark="bar" />}>
                  terrain height
                </LegendItem>
                <LegendItem series="readings" swatch={<LegendSwatch role="measurement" mark="bar" />}>
                  proprioceptive reading
                </LegendItem>
                <LegendItem series="occluded" swatch={<LegendSwatch role="constraint" mark="dash" />}>
                  occluded channel
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                Degradation {Math.round(degradation * 100)}%: reconstruction MAE{' '}
                <span data-testid="mae-readout" style={{ color: terrainColour }}>
                  {formatMeters(mae)}
                </span>
                , action divergence{' '}
                <span data-testid="divergence-readout" style={{ color: roleColour('highlight') }}>
                  {formatDivergence(divergence)}
                </span>
                , occluded channels{' '}
                <span data-testid="occluded-readout" style={{ color: occludedColour }}>
                  {occludedCount}/{TERRAIN_CELLS}
                </span>
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
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
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Teacher-student distillation at ${Math.round(degradation * 100)} percent degradation. Top panel: the teacher's privileged terrain heightfield. Middle panel: the student's proprioceptive history, ${occludedCount} of ${TERRAIN_CELLS} channels occluded. Bottom panel: the student's reconstructed terrain, mean absolute error ${formatMeters(mae)}. Teacher-student action divergence ${formatDivergence(divergence)}.`}
            aria-describedby={descriptionId}
          >
            <PanelTitle y={TEACHER.labelY}>teacher: privileged terrain heightfield</PanelTitle>
            <g data-testid="teacher-panel" data-series="terrain">
              {TERRAIN.map((h, i) => (
                <rect
                  key={i}
                  x={f(PLOT_LEFT + i * CELL_W)}
                  y={TEACHER.top}
                  width={f(CELL_W - 1)}
                  height={TEACHER.height}
                  fill={terrainColour}
                  fillOpacity={terrainOpacity(h)}
                />
              ))}
            </g>

            <PanelTitle y={STUDENT.labelY}>student input: recent proprioceptive readings</PanelTitle>
            <g data-scene-structure="" opacity={CHART_STRUCTURE.axesOpacity}>
              <line
                x1={PLOT_LEFT}
                x2={PLOT_RIGHT}
                y1={STUDENT.baseline}
                y2={STUDENT.baseline}
                stroke={CHART_STRUCTURE.axes}
                strokeWidth={CHART_STROKE.structure}
              />
            </g>
            <g data-testid="student-panel" data-series="readings">
              {readings.map((v, i) => {
                const x = f(PLOT_LEFT + i * CELL_W);
                if (occluded[i]) {
                  return (
                    <g key={i} data-series="occluded">
                      {/* A broken stub rather than a solid one: an occluded cell
                          has no reading, and the gap says so without the hue. */}
                      <line
                        x1={x}
                        x2={f(x + CELL_W - 1)}
                        y1={f(STUDENT.baseline - 1.5)}
                        y2={f(STUDENT.baseline - 1.5)}
                        stroke={occludedColour}
                        strokeWidth={3}
                        strokeDasharray="2 2"
                      />
                      <line
                        x1={f(x + (CELL_W - 1) / 2)}
                        x2={f(x + (CELL_W - 1) / 2)}
                        y1={f(STUDENT.baseline - 3)}
                        y2={f(STUDENT.baseline - STUDENT.maxHeight)}
                        stroke={occludedColour}
                        strokeWidth={CHART_STROKE.structure}
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
                    fill={readingColour}
                  />
                );
              })}
            </g>

            <PanelTitle y={RECON.labelY}>student reconstruction of the terrain</PanelTitle>
            <g data-testid="recon-panel" data-series="terrain">
              {recon.map((h, i) => (
                <rect
                  key={i}
                  x={f(PLOT_LEFT + i * CELL_W)}
                  y={RECON.top}
                  width={f(CELL_W - 1)}
                  height={RECON.height}
                  fill={terrainColour}
                  fillOpacity={terrainOpacity(h)}
                  stroke={occluded[i] ? occludedColour : 'none'}
                  strokeWidth={occluded[i] ? CHART_STROKE.reference : 0}
                  strokeDasharray={occluded[i] ? '2 2' : undefined}
                />
              ))}
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="In this authored toy, reconstruction error and action divergence rise by construction as proprioceptive degradation increases."
      source="Darker cells are higher terrain. Chosen terrain, seeded noise and an authored error field; no recorded robot sensing or trained policies."
    />
  );
}
