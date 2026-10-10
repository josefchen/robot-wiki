'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReset,
  LegendItem,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { RobotDog, type DogFeet } from '@/components/motion/robot-dog';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_VIEW_WIDTH,
  DirectLabel,
  LegendSwatch,
  StageAnnotation,
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
 * The real ground is a side-view profile of the chosen terrain; the
 * student's guess is that terrain plus a constructed error field, drawn
 * dashed on the same ground, with a gap wherever a leg reading is lost.
 * The strip under the ground is the normalized terrain plus seeded noise
 * the legs report. Reconstruction does not infer terrain from those bars.
 * No teacher or student is trained; the discrepancy readout is 2.2*MAE,
 * not a paper's empirical result.
 *
 * Height reads as height: higher ground is drawn higher, for the real
 * profile and the guess alike. The cells under the profile are shaded by
 * the same height, darker for higher, so shade and height never disagree.
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 204;
const PLOT_LEFT = 8;
const PLOT_RIGHT = 332;
const CELL_W = (PLOT_RIGHT - PLOT_LEFT) / TERRAIN_CELLS;

/** The ground profile: lowest terrain at GROUND_BOTTOM, highest RISE above it. */
const GROUND_BOTTOM = 150;
const GROUND_RISE = 46;
const STRIP = { labelY: 176, baseline: 200, maxHeight: 18 } as const;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

/** The cell the note's leader points at: a kept reading on the first rise. */
const POINTER_CELL = 2;

const cellX = (i: number) => f(PLOT_LEFT + (i + 0.5) * CELL_W);
/** Ground shade per cell: darker cells are higher terrain, on a quiet grey ramp. */
const cellShade = (h: number) => f(0.05 + 0.13 * ((h - TERRAIN_MIN) / (TERRAIN_MAX - TERRAIN_MIN)));
const groundY = (h: number) => f(GROUND_BOTTOM - ((h - TERRAIN_MIN) / (TERRAIN_MAX - TERRAIN_MIN)) * GROUND_RISE);

type NoiseId = 'clean' | 'some' | 'very';

const NOISE_PRESETS: { id: NoiseId; label: string; degradation: number }[] = [
  { id: 'clean', label: 'Clean', degradation: 0 },
  { id: 'some', label: 'Some noise', degradation: DEFAULT_DEGRADATION },
  { id: 'very', label: 'Very noisy', degradation: 0.6 },
];

const presetFor = (degradation: number): NoiseId | null =>
  NOISE_PRESETS.find((p) => Math.abs(p.degradation - degradation) < 1e-9)?.id ?? null;

/** Runs of consecutive kept cells, so a lost reading leaves a gap in the guess. */
function keptRuns(occluded: readonly boolean[]): number[][] {
  const runs: number[][] = [];
  let run: number[] = [];
  occluded.forEach((lost, i) => {
    if (lost) {
      if (run.length) runs.push(run);
      run = [];
    } else {
      run.push(i);
    }
  });
  if (run.length) runs.push(run);
  return runs;
}

/** A four-legged robot standing on the real ground, its feet on cells 17 to 21. */
function StandingDog() {
  const foot = (i: number) => [cellX(i), f(groundY(TERRAIN[i]) - 1)] as const;
  const feet: DogFeet = [foot(18), foot(17), foot(21), foot(20)];
  const hipY = f(Math.min(...feet.map(([, y]) => y)) - 34);
  return <RobotDog rear={f(cellX(17) + 3)} front={f(cellX(20) + 3)} hipY={hipY} feet={feet} segment={21} />;
}

function annotationLines(degradation: number): string[] {
  if (degradation === 0) return ['With clean leg readings the guess (dashed)', 'lies right on the real ground (solid)'];
  if (degradation <= 0.2) return ['The student’s guess (dashed) almost', 'matches the real ground (solid)'];
  return ['With noisy legs the guess (dashed)', 'drifts from the real ground (solid)'];
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
  const percent = Math.round(degradation * 100);
  const guessColour = roleColour('state');
  const readingColour = roleColour('measurement');
  const ink = CHART_STRUCTURE.label;

  const groundPoints = TERRAIN.map((h, i) => `${cellX(i)},${groundY(h)}`).join(' ');

  return (
    <InstrumentFigure
      figureId="teacher-student"
      className={className}
      kicker="Teacher-student training"
      heading="A blind robot feels the ground through its legs"
      controls={
        <PresetGroup<NoiseId>
          label="Sensor noise"
          presets={NOISE_PRESETS}
          value={presetFor(degradation)}
          onChange={(id) => setDegradation(NOISE_PRESETS.find((p) => p.id === id)!.degradation)}
          testId="ts-noise"
        />
      }
      adjust={
        <>
          <ControlField className="w-full basis-full content-start sm:max-w-sm">
            <ControlLabel htmlFor="ts-degradation" value={`${percent}%`}>
              Proprioceptive degradation
            </ControlLabel>
            <input
              id="ts-degradation"
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={100}
              step={1}
              value={percent}
              onChange={(e) => setDegradation(Number(e.target.value) / 100)}
              aria-label={`Proprioceptive degradation, currently ${Math.round(degradation * 100)} percent`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="clean" high="every reading lost" />
          </ControlField>
          <InstrumentReset onClick={() => setDegradation(defaultDegradation)} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="terrain" swatch={<GroundSwatch />}>
                  real ground
                </LegendItem>
                <LegendItem series="reconstruction" swatch={<LegendSwatch role="state" mark="dash" />}>
                  student’s guess
                </LegendItem>
                <LegendItem series="readings" swatch={<LegendSwatch role="measurement" mark="bar" />}>
                  what its legs feel
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>Illustrative, not measured</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Teacher-student distillation at ${percent} percent degradation. A four-legged robot walks over the real ground profile, which the teacher sees as a privileged heightfield. The student's guess of that ground, from its legs alone, is drawn dashed on top, with gaps where ${occludedCount} of ${TERRAIN_CELLS} leg readings are lost; mean absolute error ${formatMeters(mae)}. Teacher-student action divergence ${formatDivergence(divergence)}.`}
            aria-describedby={descriptionId}
          >
            <StageAnnotation
              x={8}
              y={16}
              lines={annotationLines(degradation)}
              target={[cellX(POINTER_CELL), f(groundY(recon[POINTER_CELL]) - 6)]}
            />
            <g data-testid="teacher-panel" data-series="terrain">
              {/* One column per terrain cell, under the profile: higher cells are drawn
                  higher and shaded darker, so height and shade say the same thing. */}
              {TERRAIN.map((h, i) => (
                <rect
                  key={i}
                  data-terrain-cell={i}
                  x={f(PLOT_LEFT + i * CELL_W)}
                  y={groundY(h)}
                  width={f(CELL_W + 0.2)}
                  height={f(GROUND_BOTTOM + 8 - groundY(h))}
                  fill={ink}
                  fillOpacity={cellShade(h)}
                />
              ))}
              <polyline points={groundPoints} fill="none" stroke={ink} strokeWidth={CHART_STROKE.trace} strokeLinejoin="round" />
            </g>
            <StandingDog />
            <g data-testid="recon-panel" data-series="reconstruction">
              {keptRuns(occluded).map((run) =>
                run.length === 1 ? (
                  <line
                    key={run[0]}
                    x1={f(cellX(run[0]) - CELL_W / 3)}
                    x2={f(cellX(run[0]) + CELL_W / 3)}
                    y1={groundY(recon[run[0]])}
                    y2={groundY(recon[run[0]])}
                    stroke={guessColour}
                    strokeWidth={CHART_STROKE.trace}
                    strokeDasharray={CHART_STROKE.dash}
                  />
                ) : (
                  <polyline
                    key={run[0]}
                    points={run.map((i) => `${cellX(i)},${groundY(recon[i])}`).join(' ')}
                    fill="none"
                    stroke={guessColour}
                    strokeWidth={CHART_STROKE.trace}
                    strokeDasharray={CHART_STROKE.dash}
                    strokeLinejoin="round"
                  />
                ),
              )}
            </g>
            <DirectLabel x={PLOT_LEFT} y={STRIP.labelY}>
              what its legs feel
            </DirectLabel>
            <g data-testid="student-panel" data-series="readings">
              {readings.map((v, i) => {
                const x = f(PLOT_LEFT + i * CELL_W + 1);
                if (occluded[i]) {
                  // A lost reading is a short grey stub, so the gap reads without the hue.
                  return (
                    <line
                      key={i}
                      data-series="occluded"
                      x1={x}
                      x2={f(x + CELL_W - 3)}
                      y1={STRIP.baseline - 1}
                      y2={STRIP.baseline - 1}
                      stroke={CHART_STRUCTURE.axes}
                      strokeWidth={CHART_STROKE.trace}
                      strokeDasharray="2 2"
                    />
                  );
                }
                const h = Math.max(2, Math.min(STRIP.maxHeight, v * STRIP.maxHeight));
                return (
                  <rect
                    key={i}
                    x={x}
                    y={f(STRIP.baseline - h)}
                    width={f(CELL_W - 3)}
                    height={f(h)}
                    fill={readingColour}
                    opacity={0.55}
                  />
                );
              })}
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="Robots trained in simulation with a perfect map must later walk without one; learning to read the ground from leg sensations bridges that gap."
      method={
        <>
          <p>
            Teacher-student training: a teacher policy learns in simulation with privileged information, here the
            terrain heightfield under the robot. A student policy then learns to act like the teacher from
            proprioception alone, the joint angles and motor efforts its legs report, and has to rebuild the ground
            from them. Proprioceptive degradation adds noise to those readings and drops channels; a dropped
            channel is a grey stub in the strip and a gap in the dashed guess.
          </p>
          <p>
            This is an authored toy: reconstruction error and action divergence rise by construction as degradation
            increases. The ground is chosen terrain, the leg readings are that terrain normalized plus seeded noise,
            and the guess is the terrain plus an authored error field; it is not inferred from the strip. Higher
            ground is drawn higher, with its height exaggerated. Darker cells are higher terrain: each of the 24
            cells under the profile is shaded by its height, so the shade and the height agree.
          </p>
          <p>
            Degradation {percent}%: reconstruction MAE{' '}
            <span data-testid="mae-readout" style={{ color: guessColour }}>
              {formatMeters(mae)}
            </span>
            , action divergence{' '}
            <span data-testid="divergence-readout">{formatDivergence(divergence)}</span>, occluded channels{' '}
            <span data-testid="occluded-readout">
              {occludedCount}/{TERRAIN_CELLS}
            </span>
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current teacher-student gap"
            description={`At ${percent} percent proprioceptive degradation the student reconstruction of the teacher terrain sits at ${formatMeters(mae)} MAE with action divergence ${formatDivergence(divergence)}, and ${occludedCount} of ${TERRAIN_CELLS} input channels are already lost as gaps; the drawing puts the privileged ground profile, the proprioceptive strip and that dashed reconstruction on one side view.`}
            states={[
              { label: 'degradation', value: `${percent}%` },
              { label: 'reconstruction MAE', value: formatMeters(mae) },
              { label: 'action divergence', value: formatDivergence(divergence) },
              { label: 'occluded channels', value: `${occludedCount}/${TERRAIN_CELLS}` },
            ]}
          />
        </>
      }
      source="Chosen terrain, seeded noise and an authored error field; no recorded robot sensing or trained policies."
    />
  );
}

/** The real ground's legend swatch: the drawing's own solid ink line. */
function GroundSwatch() {
  return (
    <svg aria-hidden="true" focusable="false" width={28} height={14} viewBox="0 0 28 14" className="shrink-0">
      <path d="M1 7 H27" stroke={CHART_STRUCTURE.label} strokeWidth={CHART_STROKE.trace} strokeLinecap="round" fill="none" />
    </svg>
  );
}
