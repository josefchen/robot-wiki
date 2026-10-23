'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, DirectLabel, StageAnnotation, roleColour } from '@/components/motion/chart';
import { useEasedValue } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * CubeTrials: how often the best-known exception actually worked. OpenAI's
 * Rubik's-cube policy, trained in simulation with automatic domain
 * randomization for a modified Shadow hand, completed one fixed
 * 43-subgoal scramble in 2 of 10 trials when a sensor cube reported its
 * face angles, and in 0 of 10 when vision read them.
 *
 * The one control picks how the face angles were read. The tally of ten
 * trials fills or empties on the motion curve; reduced motion jumps. The
 * squares are a tally, not the order of the trials. Both counts are the
 * paper's.
 */

type SensingId = 'sensor' | 'vision';
export const SENSING: readonly (Preset<SensingId> & { solved: number; phrase: string })[] = [
  { id: 'sensor', label: "The cube's own sensors", solved: 2, phrase: 'a sensor cube reporting its face angles' },
  { id: 'vision', label: 'Cameras', solved: 0, phrase: 'vision reading the face angles' },
];
export const TRIALS = 10;
export const SUBGOALS = 43;
export const DEFAULT_SENSING: SensingId = 'sensor';

const WIDTH = 340;
const HEIGHT = 112;
const CELL = 26;
const GAP = 6;
const LEFT = (WIDTH - (TRIALS * CELL + (TRIALS - 1) * GAP)) / 2;
const TOP = 44;
const f = (v: number) => Number(v.toFixed(2));

function describe(id: SensingId): string {
  const s = SENSING.find((x) => x.id === id)!;
  const other = SENSING.find((x) => x.id !== id)!;
  return `With ${s.phrase}, the simulation-trained hand completed the fixed ${SUBGOALS}-subgoal scramble in ${s.solved} of ${TRIALS} trials, against ${other.solved} of ${TRIALS} with ${other.phrase}.`;
}

export function CubeTrials({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const source = citationFor('openai-rubiks-cube-2019');
  const [sensingId, setSensingId] = useState<SensingId>(DEFAULT_SENSING);
  const sensing = SENSING.find((s) => s.id === sensingId)!;
  const shown = useEasedValue(sensing.solved);
  const accent = roleColour('highlight');

  return (
    <InstrumentFigure
      figureId="cube-trials"
      className={className}
      kicker="Sim-trained dexterity"
      heading="The cube-solving hand finished at most 2 of 10 trials"
      controls={<PresetGroup label="The cube's face angles read by" presets={SENSING} value={sensingId} onChange={setSensingId} testId="cube-sensing" />}
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Ten squares, one per trial of the same scramble: ${sensing.solved} of ${TRIALS} filled, the trials the hand finished with ${sensing.phrase}.`}
            aria-describedby={descriptionId}
            data-testid="cube-stage"
            data-solved={sensing.solved}
          >
            <StageAnnotation x={LEFT} y={16} lines={[`${sensing.solved} of ${TRIALS} trials finished the scramble`]} />
            <g data-series="trials">
              {Array.from({ length: TRIALS }, (_, k) => {
                const fill = Math.max(0, Math.min(1, shown - k));
                const solved = k < sensing.solved;
                const x = LEFT + k * (CELL + GAP);
                return (
                  <g key={k} data-trial={k + 1} data-solved={solved || undefined}>
                    <rect x={f(x)} y={TOP} width={CELL} height={CELL} fill={MOTION_STAGE.background} stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} />
                    {fill > 0 ? (
                      <rect data-chart-role="highlight" x={f(x)} y={TOP} width={CELL} height={CELL} fill={accent} opacity={f(fill)} />
                    ) : null}
                  </g>
                );
              })}
              <DirectLabel x={LEFT} y={TOP + CELL + 22} seriesFor="trials">
                filled: finished all {SUBGOALS} steps of the scramble
              </DirectLabel>
            </g>
            <text x={LEFT} y={TOP + CELL + 40} fontSize={CHART_TYPE.labelPx} fill="var(--role-reference-text)">
              a tally, not trial order
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption="OpenAI's sim-trained hand finished a fixed Rubik's cube scramble in 2 of 10 trials with a sensor cube, 0 with vision."
      method={
        <>
          <div>
            OpenAI trained the policy in simulation with automatic domain randomization, for a modified Shadow hand,
            and ran it on the real hand. With a sensor cube reporting its face angles it completed one fixed
            {` ${SUBGOALS}`}-subgoal scramble in two of ten trials; with vision for the face angles, in zero of ten.
            The system used customized hardware, tuned torque limits and a calibrated hand simulation.
          </div>
          <div>Each square is one trial; filled squares are the trials that finished. The squares count, they do not order.</div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Trials that finished the scramble"
            description={describe(sensingId)}
            rowHeader="face angles read by"
            columns={[{ header: `trials finished (of ${TRIALS})`, numeric: true }]}
            rows={SENSING.map((s) => ({ label: s.label, values: [String(s.solved)] }))}
          />
        </>
      }
      source={
        <span data-testid="cube-source">
          {source ? (
            <a data-brand-control-id="control:link-focus" href={source.url} target="_blank" rel="noopener" className="underline-offset-2">
              {source.label}
            </a>
          ) : (
            'OpenAI'
          )}
          .
        </span>
      }
    />
  );
}
