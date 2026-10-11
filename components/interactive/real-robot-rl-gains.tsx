'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  DirectLabel,
  StageAnnotation,
  linearScale,
  roleColour,
} from '@/components/motion/chart';
import { useEasedValue } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';
import { GAIN_STUDIES, gainPoints } from '@/lib/real-robot-rl-gains';

/**
 * RealRobotRlGains: four real-robot studies in which reinforcement learning
 * on top of a policy trained from recorded data raised success. Each row
 * is one study's reported success before and after, on its own task and
 * robot, so rows are not comparable with one another. The one control
 * moves every row between its before and after value on the motion curve;
 * reduced motion jumps. Every number is as the article cites it.
 */

const LARGEST = GAIN_STUDIES.reduce((a, b) => (gainPoints(b) > gainPoints(a) ? b : a));

type PhaseId = 'before' | 'after';
const PHASES: readonly Preset<PhaseId>[] = [
  { id: 'before', label: 'Before RL' },
  { id: 'after', label: 'After RL' },
];
export const DEFAULT_PHASE: PhaseId = 'after';

const WIDTH = 340;
const HEIGHT = 238;
const PLOT_LEFT = 116;
const PLOT_RIGHT = 328;
const ROW_TOP = 34;
const ROW_STEP = 44;
const AXIS_Y = ROW_TOP + ROW_STEP * GAIN_STUDIES.length - 10;
const TICKS = [0, 25, 50, 75, 100] as const;
const sx = linearScale([0, 100], [PLOT_LEFT, PLOT_RIGHT]);
const f = (v: number) => Number(v.toFixed(2));
const rowY = (i: number) => ROW_TOP + i * ROW_STEP;
const pct = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}%`;

function describe(phase: PhaseId): string {
  const values = GAIN_STUDIES.map((s) => `${s.method} ${pct(phase === 'after' ? s.after : s.before)}`).join(', ');
  return `${phase === 'after' ? 'After reinforcement learning' : 'Before reinforcement learning'}, real-robot success reads ${values}; each study raised its own policy by ${Math.min(...GAIN_STUDIES.map(gainPoints))} to ${Math.max(...GAIN_STUDIES.map(gainPoints))} percentage points, on tasks that differ, so the rows are not a ranking.`;
}

export function RealRobotRlGains({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const [phase, setPhase] = useState<PhaseId>(DEFAULT_PHASE);
  const shown = useEasedValue(phase === 'after' ? 1 : 0);
  const accent = roleColour('highlight');
  const largestIndex = GAIN_STUDIES.indexOf(LARGEST);

  return (
    <InstrumentFigure
      figureId="real-robot-rl-gains"
      className={className}
      kicker="Offline-to-online improvement"
      heading="Online RL raised real-robot success in every study"
      controls={<PresetGroup label="Real-robot success" presets={PHASES} value={phase} onChange={setPhase} testId="rl-gains-phase" />}
      stage={
        <FigureStage footer={<StageStatus>Reported rates; tasks differ</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Real-robot success in four studies ${phase === 'after' ? 'after' : 'before'} reinforcement learning: ${GAIN_STUDIES.map((s) => `${s.task}, ${pct(phase === 'after' ? s.after : s.before)}`).join('; ')}.`}
            aria-describedby={descriptionId}
            data-testid="rl-gains-stage"
          >
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
              {TICKS.slice(1).map((t) => (
                <line key={t} x1={f(sx(t))} y1={ROW_TOP - 18} x2={f(sx(t))} y2={AXIS_Y} />
              ))}
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={PLOT_LEFT} y1={AXIS_Y} x2={PLOT_RIGHT} y2={AXIS_Y} />
              <line x1={PLOT_LEFT} y1={ROW_TOP - 18} x2={PLOT_LEFT} y2={AXIS_Y} />
            </g>
            {TICKS.map((t) => (
              <text key={t} data-scene-tick="" x={f(sx(t))} y={AXIS_Y + 6} dominantBaseline="hanging" textAnchor={t === 0 ? 'start' : t === 100 ? 'end' : 'middle'} fontSize={CHART_TYPE.tickPx} fill={CHART_STRUCTURE.labelSecondary}>
                {t}
              </text>
            ))}
            <text data-scene-axis="" x={PLOT_RIGHT} y={AXIS_Y + 6} dy="1.5em" dominantBaseline="hanging" textAnchor="end" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
              real tries that succeeded (%)
            </text>
            {GAIN_STUDIES.map((study, i) => {
              const y = rowY(i);
              const before = f(sx(study.before));
              const now = f(sx(study.before + (study.after - study.before) * shown));
              const value = phase === 'after' ? study.after : study.before;
              return (
                <g key={study.id} data-testid={`rl-gains-row-${study.id}`} data-value={value}>
                  <DirectLabel x={0} y={y - 2}>
                    {study.task}
                  </DirectLabel>
                  <text x={0} y={y + 13} fontSize={CHART_TYPE.labelPx} fill="var(--role-reference-text)">
                    {study.method}
                  </text>
                  <line x1={before} y1={y} x2={now} y2={y} stroke={accent} strokeWidth={CHART_STROKE.trace + 0.5} />
                  <circle cx={before} cy={y} r={CHART_STROKE.markerRadius + 0.5} fill={MOTION_STAGE.background} stroke={CHART_STRUCTURE.label} strokeWidth={CHART_STROKE.structure} />
                  <circle cx={now} cy={y} r={CHART_STROKE.markerRadius + 1} fill={accent} data-chart-role="highlight" />
                  <text data-scene-readout="" x={now} y={y - 9} textAnchor={now > PLOT_RIGHT - 24 ? 'end' : 'middle'} fontSize={CHART_TYPE.readoutPx} fill={CHART_STRUCTURE.label}>
                    {pct(value)}
                  </text>
                </g>
              );
            })}
            {phase === 'after' ? (
              <StageAnnotation
                x={f(sx(LARGEST.before) - 8)}
                y={rowY(largestIndex) + 18}
                anchor="end"
                lines={[`+${Math.round(gainPoints(LARGEST))} points`]}
              />
            ) : null}
          </PlotStage>
        </FigureStage>
      }
      caption={`In each study, RL after offline training raised real-robot success by ${Math.round(Math.min(...GAIN_STUDIES.map(gainPoints)))} to ${Math.round(Math.max(...GAIN_STUDIES.map(gainPoints)))} percentage points.`}
      method={
        <>
          <div>
            Each row is one study&apos;s reported real-robot success before and after reinforcement learning, on its
            own task, robot and protocol, so the rows show a direction, not a ranking. The hollow mark is the policy
            trained on recorded data; the filled mark is after RL.
          </div>
          <ul className="list-disc space-y-1 pl-5">
            {GAIN_STUDIES.map((study) => (
              <li key={study.id}>
                {study.method}: {pct(study.before)} to {pct(study.after)}, {study.note}.
              </li>
            ))}
          </ul>
          <div>
            The other side stays in view: Robomimic found batch RL weak on human demonstrations, where a recurrent
            cloning policy was a strong baseline, so these gains come from studies with reward-bearing data or
            online practice.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Real-robot success before and after RL"
            description={describe(phase)}
            rowHeader="study"
            columns={[
              { header: 'before (%)', numeric: true },
              { header: 'after (%)', numeric: true },
              { header: 'gain (points)', numeric: true },
            ]}
            rows={GAIN_STUDIES.map((s) => ({
              label: `${s.method}, ${s.task.toLowerCase()}`,
              values: [s.before.toFixed(1), s.after.toFixed(1), gainPoints(s).toFixed(1)],
            }))}
          />
        </>
      }
      source={
        <span data-testid="rl-gains-source">
          {GAIN_STUDIES.map((study, i) => {
            const record = citationFor(study.citationId);
            return (
              <span key={study.id}>
                {i > 0 ? ', ' : null}
                {record ? (
                  <a data-brand-control-id="control:link-focus" href={record.url} target="_blank" rel="noopener" className="underline-offset-2">
                    {record.label}
                  </a>
                ) : (
                  study.method
                )}
              </span>
            );
          })}
          .
        </span>
      }
    />
  );
}
