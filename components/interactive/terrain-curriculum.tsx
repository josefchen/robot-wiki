'use client';

import { useId, useMemo, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_PRIMARY_CONTROL_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, StageAnnotation, roleColour } from '@/components/motion/chart';
import { mulberry32 } from '@/components/motion/rng';
import { usePlayback } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * TerrainCurriculum: Rudin and colleagues' game-inspired terrain
 * curriculum. Every simulated robot trains on a patch of terrain at some
 * difficulty. A robot that crosses its patch moves up a level, one that
 * covers under half the commanded distance moves down, and one that solves
 * the hardest level is sent back to a random level, so the population
 * keeps training where it can just cope.
 *
 * The one control runs a training round: each robot glides to its new
 * level on the motion curve, those that moved up in the accent; reduced
 * motion and the served HTML show the round finished. The robots, their
 * skills and the round outcomes are illustrative and seeded; the three
 * rules are the paper's.
 */

export const LEVELS = 8;
export const ROBOTS = 20;
export const DEFAULT_ROUND = 4;
export const MAX_ROUND = 30;

export type Move = 'up' | 'down' | 'stay' | 'loop';
export type RoundState = { levels: number[]; moves: Move[] };

const random = mulberry32(20211007);
/** Each robot's starting skill and its per-round luck, fixed by the seed. */
const BASE = Array.from({ length: ROBOTS }, () => random() * 0.8);
const LUCK = Array.from({ length: MAX_ROUND }, () => Array.from({ length: ROBOTS }, () => random() * 0.8 - 0.4));
const LOOP_TO = Array.from({ length: MAX_ROUND }, () => Array.from({ length: ROBOTS }, () => 1 + Math.floor(random() * LEVELS)));

/** How much of the commanded distance robot `i` covers at `level` in `round`: 1 is the whole patch. */
const covered = (i: number, level: number, round: number) => BASE[i] + 0.5 * round - 0.85 * (level - 1) + LUCK[round - 1][i];

/** Every round from 0 (all on level 1) to MAX_ROUND, under the paper's three rules. */
export const ROUNDS: readonly RoundState[] = (() => {
  const rounds: RoundState[] = [{ levels: Array(ROBOTS).fill(1), moves: Array(ROBOTS).fill('stay') }];
  for (let round = 1; round <= MAX_ROUND; round++) {
    const previous = rounds[round - 1].levels;
    const moves: Move[] = [];
    const levels = previous.map((level, i) => {
      const distance = covered(i, level, round);
      if (distance >= 1) {
        if (level === LEVELS) {
          moves.push('loop');
          return LOOP_TO[round - 1][i];
        }
        moves.push('up');
        return level + 1;
      }
      if (distance < 0.5 && level > 1) {
        moves.push('down');
        return level - 1;
      }
      moves.push('stay');
      return level;
    });
    rounds.push({ levels, moves });
  }
  return rounds;
})();

export const tally = (state: RoundState) => ({
  up: state.moves.filter((m) => m === 'up').length,
  down: state.moves.filter((m) => m === 'down').length,
  loop: state.moves.filter((m) => m === 'loop').length,
});

const WIDTH = 340;
const HEIGHT = 228;
const LEFT = 10;
const TILE = 40;
const GROUND = 186;
const DOT_STEP = 9;
const colX = (level: number) => LEFT + (level - 1) * TILE + TILE / 2;
const f = (v: number) => Number(v.toFixed(2));

/** Where each robot sits in a round: two to a row, stacked up its level's column. */
function layout(levels: readonly number[]): [number, number][] {
  const seen = new Map<number, number>();
  return levels.map((level) => {
    const k = seen.get(level) ?? 0;
    seen.set(level, k + 1);
    return [f(colX(level) + (k % 2 === 0 ? -5 : 5)), f(GROUND - 30 - Math.floor(k / 2) * DOT_STEP)];
  });
}

/** One terrain patch, rougher with each level: steps that grow taller. */
function Tile({ level }: { level: number }) {
  const x0 = LEFT + (level - 1) * TILE + 2;
  const rise = (level - 1) * 1.6;
  const steps = [0, 1, 2, 1, 0];
  const w = (TILE - 4) / steps.length;
  const d = steps
    .map((s, k) => `${k === 0 ? `M${f(x0)} ${GROUND}` : ''} L${f(x0 + k * w)} ${f(GROUND - s * rise)} L${f(x0 + (k + 1) * w)} ${f(GROUND - s * rise)}`)
    .join(' ');
  return <path data-terrain-level={level} d={`${d} L${f(x0 + TILE - 4)} ${GROUND}`} fill="none" stroke={CHART_STRUCTURE.label} strokeWidth={CHART_STROKE.structure} />;
}

function statusLine(round: number): string {
  if (round === 0) return 'Round 0: every robot starts on the easiest ground';
  const { up, down, loop } = tally(ROUNDS[round]);
  return `Round ${round}: ${up} moved up, ${down} moved down${loop ? `, ${loop} sent back` : ''}`;
}

function describe(round: number): string {
  const state = ROUNDS[round];
  const { up, down, loop } = tally(state);
  const highest = Math.max(...state.levels);
  const lowest = Math.min(...state.levels);
  return `After round ${round}, the ${ROBOTS} illustrative robots train on levels ${lowest} to ${highest} of ${LEVELS}; this round ${up} crossed their patch and moved up, ${down} covered under half the commanded distance and moved down, and ${loop} solved the hardest level and were sent back to a random one.`;
}

export function TerrainCurriculum({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const source = citationFor('rudin-2021');
  const [round, setRound] = useState(DEFAULT_ROUND);
  const [progress, play] = usePlayback();
  const accent = roleColour('highlight');
  const state = ROUNDS[round];
  const from = useMemo(() => layout(ROUNDS[Math.max(0, round - 1)].levels), [round]);
  const to = useMemo(() => layout(state.levels), [state]);

  const advance = () => {
    setRound((r) => Math.min(MAX_ROUND, r + 1));
    play();
  };
  const restart = () => {
    setRound(0);
    play();
  };

  return (
    <InstrumentFigure
      figureId="terrain-curriculum"
      className={className}
      kicker="Terrain curriculum"
      heading="Robots that cope get harder ground; strugglers get easier"
      controls={
        <>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-testid="curriculum-next"
            className={INSTRUMENT_PRIMARY_CONTROL_CLASS}
            onClick={round >= MAX_ROUND ? undefined : advance}
            aria-disabled={round >= MAX_ROUND || undefined}
          >
            Run a training round
          </button>
          <InstrumentReset onClick={restart} label="Start over" data-testid="curriculum-reset" />
        </>
      }
      stage={
        <FigureStage footer={<StageStatus>Illustrative robots; rules cited</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`${ROBOTS} simulated robots spread over ${LEVELS} terrain levels, easy on the left and hard on the right, after round ${round}. ${statusLine(round)}.`}
            aria-describedby={descriptionId}
            data-testid="curriculum-stage"
            data-round={round}
          >
            {Array.from({ length: LEVELS }, (_, k) => (
              <Tile key={k} level={k + 1} />
            ))}
            <line x1={LEFT} y1={GROUND} x2={LEFT + LEVELS * TILE} y2={GROUND} stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} />
            <text data-scene-tick="" x={LEFT} y={GROUND + 6} dominantBaseline="hanging" fontSize={CHART_TYPE.tickPx} fill={CHART_STRUCTURE.labelSecondary}>
              easy ground
            </text>
            <text data-scene-axis="" x={LEFT + (LEVELS * TILE) / 2} y={GROUND + 6} dy="1.4em" dominantBaseline="hanging" textAnchor="middle" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
              terrain difficulty, level 1 to {LEVELS}
            </text>
            <text data-scene-tick="" x={LEFT + LEVELS * TILE} y={GROUND + 6} dominantBaseline="hanging" textAnchor="end" fontSize={CHART_TYPE.tickPx} fill={CHART_STRUCTURE.labelSecondary}>
              hard ground
            </text>
            <g data-series="robots">
              {to.map(([tx, ty], i) => {
                const [fx, fy] = from[i];
                const x = f(fx + (tx - fx) * progress);
                const y = f(fy + (ty - fy) * progress);
                const move = round > 0 ? state.moves[i] : 'stay';
                const up = move === 'up';
                const stayed = move === 'stay';
                return (
                  <circle
                    key={i}
                    data-robot={i}
                    data-move={round > 0 ? move : 'start'}
                    data-chart-role={up ? 'highlight' : 'measurement'}
                    cx={x}
                    cy={y}
                    r={stayed ? 2.2 : 3.4}
                    fill={up ? accent : stayed ? CHART_STRUCTURE.labelSecondary : MOTION_STAGE.background}
                    stroke={up ? accent : stayed ? 'none' : CHART_STRUCTURE.label}
                    strokeWidth={CHART_STROKE.structure}
                  />
                );
              })}
            </g>
            <StageAnnotation x={LEFT} y={20} lines={[statusLine(round)]} />
            {round > 0 ? (
              <text x={LEFT} y={38} fontSize={CHART_TYPE.labelPx} fill={CHART_STRUCTURE.labelSecondary}>
                filled moved up, rings moved down, small stayed
              </text>
            ) : null}
          </PlotStage>
        </FigureStage>
      }
      caption="Robots that cross their patch move to harder ground; those covering under half move back."
      method={
        <>
          <div>
            Rudin and colleagues trained thousands of ANYmal robots at once on a grid of terrain patches of rising
            difficulty. A robot that walks across its patch is promoted to the next level; one that covers less than
            half the distance it was commanded to walk is demoted; one that solves the hardest level is sent back to
            a random level, so the population never collapses onto the top.
          </div>
          <div>
            Here {ROBOTS} illustrative robots, with seeded skills that grow each round, follow those three rules over{' '}
            {LEVELS} levels. The skills, luck and outcomes are invented for the drawing; only the rules come from the
            paper.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Where the robots train after each round"
            description={describe(round)}
            rowHeader="round"
            columns={[
              { header: 'moved up', numeric: true },
              { header: 'moved down', numeric: true },
              { header: 'sent back', numeric: true },
              { header: 'highest level', numeric: true },
            ]}
            rows={[...new Set([1, 2, 3, DEFAULT_ROUND, round])]
              .filter((r) => r > 0)
              .sort((a, b) => a - b)
              .map((r) => {
                const t = tally(ROUNDS[r]);
                return { label: String(r), values: [String(t.up), String(t.down), String(t.loop), String(Math.max(...ROUNDS[r].levels))] };
              })}
          />
        </>
      }
      source={
        <span data-testid="curriculum-source">
          {source ? (
            <a data-brand-control-id="control:link-focus" href={source.url} target="_blank" rel="noopener" className="underline-offset-2">
              {source.label}
            </a>
          ) : (
            'Rudin and colleagues'
          )}
          .
        </span>
      }
    >
      <span className="sr-only" aria-live="polite" data-testid="curriculum-live">
        {statusLine(round)}.
      </span>
    </InstrumentFigure>
  );
}
