'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, StageAnnotation, roleColour } from '@/components/motion/chart';
import { usePlayback } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * ReplayReuse: two ways to spend a transition. An on-policy learner such
 * as PPO may only learn from data its current policy produced, so each
 * batch is collected, used for a few passes and discarded. An off-policy
 * learner keeps every batch in a replay buffer, because Q-learning can
 * improve one policy from data another produced, and each update can draw
 * on all of it.
 *
 * The one control picks the learner. Choosing replays six collection
 * rounds on the motion curve: the batches arrive one by one, and the lines
 * into the update show which batches it may learn from. Reduced motion and
 * the served HTML show the sixth round. The batches are illustrative; the
 * two update rules are PPO's and Q-learning's.
 */

type LearnerId = 'on' | 'off';
const LEARNERS: readonly Preset<LearnerId>[] = [
  { id: 'on', label: 'On-policy, like PPO' },
  { id: 'off', label: 'Off-policy, like SAC' },
];
export const DEFAULT_LEARNER: LearnerId = 'on';
export const ROUNDS = 6;

/** Batches the latest update may learn from after `round` rounds. */
export const usableBatches = (learner: LearnerId, round: number) => (learner === 'on' ? Math.min(1, round) : round);

const WIDTH = 340;
const HEIGHT = 192;
const SLOT = 44;
const GAP = 10;
const ROW_LEFT = (WIDTH - (ROUNDS * SLOT + (ROUNDS - 1) * GAP)) / 2;
const BLOCK_TOP = 58;
const BLOCK_HEIGHT = 26;
const UPDATE_TOP = 134;
const UPDATE_WIDTH = 120;
const UPDATE_HEIGHT = 26;
const slotX = (k: number) => ROW_LEFT + k * (SLOT + GAP);
const f = (v: number) => Number(v.toFixed(2));

const STATEMENT: Record<LearnerId, string> = {
  on: 'Each batch is used, then thrown away',
  off: 'Every batch stays in a replay buffer',
};
const ROW_NOTE: Record<LearnerId, string> = {
  on: 'dashed batches are gone',
  off: 'none are thrown away',
};

function describe(learner: LearnerId): string {
  return learner === 'on'
    ? `After ${ROUNDS} rounds of collecting, an on-policy learner like PPO updates from only the newest batch, ${usableBatches('on', ROUNDS)} of ${ROUNDS}, and has discarded the other ${ROUNDS - 1} after a few passes each; an off-policy learner would still hold all ${ROUNDS}.`
    : `After ${ROUNDS} rounds of collecting, an off-policy learner like SAC keeps all ${usableBatches('off', ROUNDS)} batches in a replay buffer and every update can learn from any of them; an on-policy learner would use only the newest ${usableBatches('on', ROUNDS)}.`;
}

export function ReplayReuse({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const ppo = citationFor('ppo-2017');
  const suttonBarto = citationFor('sutton-barto-2018');
  const [learner, setLearner] = useState<LearnerId>(DEFAULT_LEARNER);
  const [progress, play] = usePlayback(1400);
  const accent = roleColour('highlight');
  const arrived = progress * ROUNDS;
  const round = Math.max(1, Math.min(ROUNDS, Math.ceil(arrived - 1e-6)));
  const done = progress >= 1;
  const updateX = WIDTH / 2;

  const choose = (id: LearnerId) => {
    setLearner(id);
    play();
  };

  return (
    <InstrumentFigure
      figureId="replay-reuse"
      className={className}
      kicker="On-policy and off-policy"
      heading="Off-policy learners reuse experience; on-policy ones discard it"
      controls={<PresetGroup label="The learner" presets={LEARNERS} value={learner} onChange={choose} testId="replay-learner" />}
      stage={
        <FigureStage footer={<StageStatus>Illustrative batches</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`${ROUNDS} batches of robot experience, collected one per round, above the policy update. ${learner === 'on' ? 'The update learns from the newest batch only; the older batches were thrown away.' : `The update can learn from all ${ROUNDS} batches, kept in a replay buffer.`}`}
            aria-describedby={descriptionId}
            data-testid="replay-stage"
            data-learner={learner}
            data-usable={usableBatches(learner, round)}
          >
            <StageAnnotation x={ROW_LEFT} y={16} lines={[STATEMENT[learner]]} />
            <text x={ROW_LEFT} y={BLOCK_TOP - 14} fontSize={CHART_TYPE.labelPx} fill="var(--role-reference-text)">
              {ROW_NOTE[learner]}
            </text>
            {learner === 'off' && done ? (
              <g data-testid="replay-buffer">
                <rect
                  x={ROW_LEFT - 5}
                  y={BLOCK_TOP - 5}
                  width={ROUNDS * SLOT + (ROUNDS - 1) * GAP + 10}
                  height={BLOCK_HEIGHT + 10}
                  fill="none"
                  stroke={accent}
                  strokeWidth={CHART_STROKE.structure}
                />
              </g>
            ) : null}
            {Array.from({ length: ROUNDS }, (_, k) => {
              const appear = Math.max(0, Math.min(1, arrived - k));
              if (appear <= 0) return null;
              const newest = k === round - 1;
              const usable = learner === 'off' || newest;
              const x = slotX(k);
              return (
                <g key={k} data-batch={k + 1} data-usable={usable || undefined} opacity={f(appear)}>
                  <rect
                    x={x}
                    y={BLOCK_TOP}
                    width={SLOT}
                    height={BLOCK_HEIGHT}
                    fill={usable ? accent : MOTION_STAGE.background}
                    stroke={usable ? accent : CHART_STRUCTURE.labelSecondary}
                    strokeWidth={CHART_STROKE.structure}
                    strokeDasharray={usable ? undefined : '3 3'}
                  />
                  <text
                    x={f(x + SLOT / 2)}
                    y={BLOCK_TOP + BLOCK_HEIGHT / 2 + 4}
                    textAnchor="middle"
                    fontSize={CHART_TYPE.tickPx}
                    fill={usable ? MOTION_STAGE.background : CHART_STRUCTURE.labelSecondary}
                  >
                    {k + 1}
                  </text>
                  {usable ? (
                    <line
                      x1={f(x + SLOT / 2)}
                      y1={BLOCK_TOP + BLOCK_HEIGHT}
                      x2={f(updateX + (k - (ROUNDS - 1) / 2) * 12)}
                      y2={UPDATE_TOP}
                      stroke={accent}
                      strokeWidth={CHART_STROKE.structure + 0.5}
                    />
                  ) : null}
                </g>
              );
            })}
            <rect
              x={updateX - UPDATE_WIDTH / 2}
              y={UPDATE_TOP}
              width={UPDATE_WIDTH}
              height={UPDATE_HEIGHT}
              fill={MOTION_STAGE.background}
              stroke={CHART_STRUCTURE.axes}
              strokeWidth={CHART_STROKE.structure}
            />
            <text x={updateX} y={UPDATE_TOP + UPDATE_HEIGHT / 2 + 4} textAnchor="middle" fontSize={CHART_TYPE.labelPx} fill={CHART_STRUCTURE.label}>
              policy update
            </text>
            <text data-testid="replay-count" x={updateX} y={HEIGHT - 6} textAnchor="middle" fontSize={CHART_TYPE.labelPx} fill={CHART_STRUCTURE.label}>
              {`learns from ${usableBatches(learner, round)} of ${round} ${round === 1 ? 'batch' : 'batches'}`}
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption="On-policy learners like PPO discard each batch after use; off-policy learners keep every batch for reuse."
      method={
        <>
          <div>
            An on-policy update is valid only for data the current policy produced, so each batch is collected,
            consumed and discarded; PPO makes several passes over each batch where plain policy gradient makes one.
            An off-policy method improves one policy from data another produced, so experience piles up in a replay
            buffer. Underneath is Q-learning, which fits the value of a state and action and can learn from any
            recorded step.
          </div>
          <div>
            The batches are illustrative. With thousands of simulated robots, steps are nearly free and PPO&apos;s
            stability wins; on a real robot every step costs time, which is why reuse matters there.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary={`What the update may learn from after ${ROUNDS} rounds`}
            description={describe(learner)}
            rowHeader="learner"
            columns={[{ header: `batches usable after ${ROUNDS} rounds`, numeric: true }, { header: 'older batches' }]}
            rows={LEARNERS.map((l) => ({
              label: l.label,
              values: [String(usableBatches(l.id, ROUNDS)), l.id === 'on' ? 'thrown away' : 'kept in the replay buffer'],
            }))}
          />
        </>
      }
      source={
        <span data-testid="replay-source">
          {ppo ? (
            <a data-brand-control-id="control:link-focus" href={ppo.url} target="_blank" rel="noopener" className="underline-offset-2">
              {ppo.label}
            </a>
          ) : (
            'Schulman and colleagues'
          )}
          ;{' '}
          {suttonBarto ? (
            <a data-brand-control-id="control:link-focus" href={suttonBarto.url} target="_blank" rel="noopener" className="underline-offset-2">
              {suttonBarto.label}
            </a>
          ) : (
            'Sutton and Barto'
          )}
          .
        </span>
      }
    />
  );
}
