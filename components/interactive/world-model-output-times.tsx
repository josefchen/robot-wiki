'use client';

import { useId } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, DirectLabel, PointMarker, roleColour } from '@/components/motion/chart';
import { outputTimeX, WORLD_MODEL_OUTPUT_DESCRIPTION, WORLD_MODEL_OUTPUT_SOURCES, WORLD_MODEL_OUTPUT_TIMES } from '@/lib/world-model-figures';

const TICKS = [0.01, 0.1, 1, 10, 100] as const;
const ROW = 58;
const AXIS = 374;
const round = (n: number) => Number(n.toFixed(3));

/** Plain output roles; the complete published workload names stay in the method table. */
const OUTPUT_ROLE: Record<string, string> = {
  '3dgs': 'Single image',
  dreamzero: 'Group of robot moves',
  '1xwm': 'Five seconds of predicted moves',
  vjepa2: 'One chosen move',
  predict2: 'Video clip',
  'cosmos-planner': 'One chosen move',
};

/** Different output units are labelled on every row; the axis measures elapsed seconds only. */
export function WorldModelOutputTimes({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();
  return (
    <InstrumentFigure
      figureId="world-model-output-times"
      className={className}
      kicker="Time to the stated output"
      heading="Different outputs need different waits and hardware"
      stage={
        <FigureStage footer={
          <p className="font-sans text-sm leading-snug text-text-dim">
            3DGS blends overlapping 3D colour blobs into a frame. Action chunks group upcoming moves. 1XWM predicts five seconds of actions before execution. Predict2’s 14B means 14 billion internal settings adjusted using training examples. V-JEPA 2-AC is a prediction model; a planner uses its forecasts after proposed moves to choose a robot move.
          </p>
        }>
          <p className="font-sans text-lg leading-snug text-text" data-testid="output-times-main-comparison">
            Single images, groups of robot moves, a move chosen from several options, and video clips need different waits and different graphics chips.
          </p>
          <PlotStage className="mx-auto max-w-xl" viewBox="0 0 340 416" aria-label="Reported time per frame, action or clip" aria-describedby={descriptionId} data-testid="world-model-output-times-stage">
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
              {TICKS.map(tick => <line key={tick} x1={round(outputTimeX(tick))} x2={round(outputTimeX(tick))} y1="4" y2={AXIS} />)}
            </g>
            {WORLD_MODEL_OUTPUT_TIMES.map((row, i) => {
              const y = 16 + i * ROW;
              const pointY = y + 36;
              const x = round(outputTimeX(row.seconds));
              const highlighted = row.id === 'cosmos-planner';
              return (
                <g key={row.id} data-series={row.id} data-testid={`output-time-${row.id}`} data-seconds={row.seconds} data-time-kind={row.kind}>
                  <DirectLabel x={12} y={y} seriesFor={row.id}>
                    <tspan fontWeight={600}>{OUTPUT_ROLE[row.id]}</tspan> · {row.id === 'cosmos-planner' ? '' : row.id === '3dgs' ? 'method: ' : 'model: '}{row.label}
                  </DirectLabel>
                  <text x="12" y={y + 17} fontSize={CHART_TYPE.labelPx} fill={CHART_STRUCTURE.labelSecondary}>Chips: {row.hardware}</text>
                  {row.kind === 'upper-bound' ? (
                    <path d={`M${x + 8} ${pointY - 4} L${x} ${pointY} L${x + 8} ${pointY + 4}`} fill="none" stroke={roleColour('measurement')} strokeWidth={CHART_STROKE.trace} />
                  ) : <PointMarker x={x} y={pointY} role={highlighted ? 'highlight' : 'measurement'} />}
                  {['3dgs', 'vjepa2', 'cosmos-planner'].includes(row.id) ? (
                    <text x={row.id === '3dgs' ? x + 16 : x - 8} y={pointY + 4} textAnchor={row.id === '3dgs' ? 'start' : 'end'}
                      fontSize={CHART_TYPE.readoutPx} fill={highlighted ? roleColour('highlight') : CHART_STRUCTURE.label} data-scene-readout="">
                      {row.displayedTime}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <line x1="12" x2="328" y1={AXIS} y2={AXIS} stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} data-chart-axes="" />
            {TICKS.map((tick, i) => <text key={tick} x={round(outputTimeX(tick))} y={AXIS + 15} textAnchor={i === 0 ? 'start' : 'middle'} fontSize={CHART_TYPE.tickPx} fill={CHART_STRUCTURE.labelSecondary} data-scene-tick="">{tick}</text>)}
            <text x="12" y="405" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>Seconds, each tick is ten times longer</text>
          </PlotStage>

        </FigureStage>
      }
      caption="Frames, grouped moves, planned actions and clips need different waits and graphics processors (GPUs). The two RTX 4090 planning rows share hardware."
      method={
        <>
          <div>
            V-JEPA 2-AC predicts numerical descriptions of camera views after chosen moves.
            Reported elapsed times on a logarithmic axis. The left-pointing mark is an upper bound from 3DGS rendering at least 100 frames per second.
            DreamZero uses its reported 150-millisecond inference latency; its robot executes commands faster than it refreshes an action chunk.
            The 1XWM total adds 11 seconds of video generation and one second of inverse dynamics.
            V-JEPA 2-AC and the Cosmos Predict1 planning baseline share a GPU, ten refinement iterations and a one-step horizon, but use 800 and 80 samples respectively.
            The separate Predict2 row measures clip generation at 480p and 16 frames per second in NVIDIA’s archived repository.
            These workloads have different outputs and quality requirements, so the chart cannot rank simulator efficiency.
          </div>
          <ChartDescription
            open id={descriptionId} form="table" summary="Every timing, workload and source" description={WORLD_MODEL_OUTPUT_DESCRIPTION}
            rowHeader="system" columns={[{ header: 'time' }, { header: 'output and hardware' }, { header: 'measurement scope' }]}
            rows={WORLD_MODEL_OUTPUT_TIMES.map(row => ({ label: row.label, values: [row.displayedTime, `${row.output}; ${row.hardware}`, row.note] }))}
          />
        </>
      }
      source={<span>{WORLD_MODEL_OUTPUT_SOURCES.map((id, i) => {
        const source = citationFor(id);
        return <span key={id}>{i ? '; ' : null}{source ? <a data-brand-control-id="control:link-focus" href={source.url} target="_blank" rel="noopener">{source.label}</a> : id}</span>;
      })}.</span>}
    />
  );
}
