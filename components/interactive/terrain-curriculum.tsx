'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { INSTRUMENT_PRIMARY_CONTROL_CLASS, InstrumentFigure, InstrumentReset } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { PartView } from '@/components/iso/part-view';
import { IsoFigure } from '@/components/iso/react/draw';
import { asksForStillness, useInView } from '@/components/iso/react/live';
import { mulberry32 } from '@/components/motion/rng';
import {
  BACK_NUT,
  BACK_SHUTTLE,
  CELLS,
  FRONT_NUT,
  FRONT_SHUTTLE,
  HEIGHT,
  LAYERS,
  LEVELS,
  PHONE_FIT,
  STEP_CM,
  WIDTH,
  arrange,
  backTrayShift,
  cellOf,
  frontTrayShift,
  homeSlot,
  planRound,
  pointOn,
  shuttleShare,
  tokenDepth,
  tokenShift,
  tokenSvg,
  type Flat2,
  type Part,
  type Waypoint,
} from '@/components/iso/figures/terrain-training-table';

/**
 * TerrainCurriculum: Rudin and colleagues' game-inspired terrain
 * curriculum, drawn as a terrain training table
 * (components/iso/figures/terrain-training-table.ts).
 *
 * Every simulated robot trains on a patch of terrain at some difficulty. A
 * robot that crosses its patch moves up a level, one that covers under half
 * the commanded distance moves down, and one that solves the hardest level
 * is sent back to a random level, so the population keeps training where
 * it can just cope. On the table each robot is a walker token and each
 * level a bay of pyramid stairs, taller from bay to bay. Running a round
 * sends every token over its stairs: those that cross ride the back shuttle
 * one bay toward the hard end (lit), those that stop short of the summit
 * ride the front shuttle one bay back, and the rest return to their bay.
 * While nobody touches it, the table replays the round it shows; reduced
 * motion and the served HTML show the round finished. Reset returns to the
 * round the figure opens on. The robots, their skills and the round
 * outcomes are illustrative and seeded; the three rules and the step
 * heights are the paper's.
 */

export { LEVELS };
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
export const covered = (i: number, level: number, round: number) => BASE[i] + 0.5 * round - 0.85 * (level - 1) + LUCK[round - 1][i];

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

// ------------------------------------------------------------ the table's poses
/**
 * Where each token stands on the start deck after a round: in its bay,
 * ranked by how far it will walk next round, so the furthest walker stands
 * at the back and no token passes another on the stairs.
 */
export const SLOTS: readonly number[][] = ROUNDS.map((state, round) =>
  arrange(state.levels, state.levels.map((level, i) => (round < MAX_ROUND ? covered(i, level, round + 1) : -i))),
);
/** Each token's home on the start deck after a round. */
export const homesOf = (round: number): Flat2[] => ROUNDS[round].levels.map((level, i) => homeSlot(level, SLOTS[round][i]));

const plans = new Map<number, Waypoint[][]>();
/** Every token's path through a round (from the round before it). */
export function planOf(round: number): Waypoint[][] {
  let plan = plans.get(round);
  if (!plan) {
    const before = { levels: ROUNDS[round - 1].levels, slots: SLOTS[round - 1] };
    const after = { levels: ROUNDS[round].levels, slots: SLOTS[round] };
    const distances = ROUNDS[round - 1].levels.map((level, i) => covered(i, level, round));
    plan = planRound(before, after, ROUNDS[round].moves, distances);
    plans.set(round, plan);
  }
  return plan;
}

/** Each token's floor point at share u of a round. */
export const pointsAt = (round: number, u: number): Flat2[] => (round === 0 || u >= 1 ? homesOf(round) : planOf(round).map((path) => pointOn(path, u)));

/** Seconds a round takes on the table. */
const ROUND_S = 3.4;
/** Seconds of quiet before the table replays its round, and between replays. */
const TOUR_START_S = 1.4;
const TOUR_AFTER_TOUCH_S = 3.6;
const TOUR_GAP_S = 4;

/** The tokens' markup in each cell for a round at rest: the server's picture, and the one Reset restores. */
function restMarkup(round: number): Record<string, string> {
  const points = homesOf(round);
  const out: Record<string, string[]> = {};
  const order = points.map((point, i) => i).sort((a, b) => tokenDepth(points[a]) - tokenDepth(points[b]) || a - b);
  for (const i of order) {
    const id = cellOf(points[i]);
    const move = round > 0 ? ROUNDS[round].moves[i] : 'start';
    (out[id] ??= []).push(tokenSvg(i, points[i], move === 'up', move));
  }
  return Object.fromEntries(Object.entries(out).map(([id, list]) => [id, list.join('')]));
}
/**
 * One fixed object per cell: React rewrites a dangerouslySetInnerHTML element whenever the object changes, which
 * would throw away the tokens the live code has moved, so every render passes the same objects.
 */
const REST_MARKUP: Record<string, { __html: string }> = (() => {
  const markup = restMarkup(DEFAULT_ROUND);
  return Object.fromEntries(CELLS.map((cell) => [cell.id, { __html: markup[cell.id] ?? '' }]));
})();

// ------------------------------------------------------------ words
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

const countIn = (round: number) => {
  const counts = Array<number>(LEVELS).fill(0);
  for (const level of ROUNDS[round].levels) counts[level - 1] += 1;
  return counts;
};
function drawingLabel(round: number): string {
  const counts = countIn(round);
  const spread = counts.map((count, k) => (count ? `${count} in bay ${k + 1}` : '')).filter(Boolean).join(', ');
  return `A terrain training table: eight bays of stairs side by side, the steps taller from the easy bay at the left to the hard bay at the right. Walker tokens stand on the start deck at the front of their bay; after round ${round} there are ${spread}. ${statusLine(round)}. The tokens that just moved up are lit.`;
}

type Refs = {
  tokens: SVGGElement[];
  cells: Map<string, SVGGElement>;
  back: SVGGElement[];
  front: SVGGElement[];
};

/** Stand every token at its point for a round, filed into its cell in painter's order, and set both shuttles. */
function placeAll(refs: Refs, round: number, u: number) {
  const points = pointsAt(round, u);
  const groups = new Map<string, number[]>();
  points.forEach((point, i) => {
    const node = refs.tokens[i];
    if (!node) return;
    const shift = tokenShift(point);
    if (node.getAttribute('transform') !== shift) node.setAttribute('transform', shift);
    const id = cellOf(point);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(i);
  });
  for (const [id, list] of groups) {
    const cell = refs.cells.get(id);
    if (!cell) continue;
    list.sort((a, b) => tokenDepth(points[a]) - tokenDepth(points[b]) || a - b);
    const wanted = list.map((i) => refs.tokens[i]!);
    const now = [...cell.children];
    // Moving a node only when the cell's order differs, so most frames touch no DOM order at all.
    if (now.length !== wanted.length || now.some((node, k) => node !== wanted[k])) {
      for (const node of wanted) cell.appendChild(node);
    }
  }
  const share = round === 0 || u >= 1 ? 0 : shuttleShare(u);
  const back = backTrayShift(share);
  const front = frontTrayShift(share);
  for (const node of refs.back) node.setAttribute('transform', back);
  for (const node of refs.front) node.setAttribute('transform', front);
}

/** Light the tokens that moved up in a round, and mark every token's move. */
function markAll(refs: Refs, round: number) {
  refs.tokens.forEach((node, i) => {
    const move = round > 0 ? ROUNDS[round].moves[i] : 'start';
    node.setAttribute('data-move', move);
    for (const part of [node.children[1], node.children[2]]) {
      if (move === 'up') part?.setAttribute('data-lit', '');
      else part?.removeAttribute('data-lit');
    }
  });
}

const still = () => typeof window === 'undefined' || typeof window.matchMedia !== 'function' || asksForStillness();

export function TerrainCurriculum({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const source = citationFor('rudin-2021');
  const [round, setRound] = useState(DEFAULT_ROUND);

  const svgHost = useRef<HTMLDivElement>(null);
  const visible = useInView(svgHost);
  const refs = useRef<Refs>({ tokens: [], cells: new Map(), back: [], front: [] });
  /** What the table is doing: resting on a round, or running one from `start` (page seconds). */
  const motion = useRef<{ round: number; start: number | null; frame: number; quietUntil: number }>({
    round: DEFAULT_ROUND,
    start: null,
    frame: 0,
    quietUntil: 0,
  });
  const visibleRef = useRef(visible);

  // Collect the token, cell and shuttle nodes the server drew.
  useEffect(() => {
    const host = svgHost.current;
    if (!host) return;
    const r = refs.current;
    r.tokens = [];
    host.querySelectorAll<SVGGElement>('[data-token]').forEach((node) => (r.tokens[Number(node.dataset.token)] = node));
    r.cells = new Map([...host.querySelectorAll<SVGGElement>('[data-tokens]')].map((node) => [node.dataset.tokens!, node]));
    r.back = [...host.querySelectorAll<SVGGElement>('[data-shuttle="back"]')];
    r.front = [...host.querySelectorAll<SVGGElement>('[data-shuttle="front"]')];
    const m = motion.current;
    return () => cancelAnimationFrame(m.frame);
  }, []);

  /** Run a round from its start (a new round, or the tour replaying the one shown). */
  const run = (next: number) => {
    const m = motion.current;
    cancelAnimationFrame(m.frame);
    m.frame = 0;
    m.round = next;
    markAll(refs.current, next);
    if (still() || next === 0) {
      m.start = null;
      placeAll(refs.current, next, 1);
      return;
    }
    m.start = null;
    const tick = (now: number) => {
      if (m.start === null) m.start = now;
      const u = Math.min(1, (now - m.start) / 1000 / ROUND_S);
      placeAll(refs.current, m.round, u);
      if (u < 1) m.frame = requestAnimationFrame(tick);
      else {
        m.frame = 0;
        m.start = null;
        m.quietUntil = Math.max(m.quietUntil, performance.now() + TOUR_GAP_S * 1000);
      }
    };
    m.frame = requestAnimationFrame(tick);
  };

  /** Rest on a round at once. */
  const settle = (at: number) => {
    const m = motion.current;
    cancelAnimationFrame(m.frame);
    m.frame = 0;
    m.start = null;
    m.round = at;
    markAll(refs.current, at);
    placeAll(refs.current, at, 1);
  };

  const touched = () => {
    // A round the reader starts runs to its end first; the tour waits a while after that.
    motion.current.quietUntil = performance.now() + (ROUND_S + TOUR_AFTER_TOUCH_S) * 1000;
  };

  // The idle tour: while the table is on screen and nobody touches it, it replays the round it shows.
  useEffect(() => {
    visibleRef.current = visible;
    if (!visible || still()) {
      if (!visible && motion.current.frame) settle(motion.current.round);
      return;
    }
    const m = motion.current;
    m.quietUntil = Math.max(m.quietUntil, performance.now() + TOUR_START_S * 1000);
    const timer = window.setInterval(() => {
      if (!visibleRef.current || m.frame || performance.now() < m.quietUntil || m.round === 0) return;
      m.quietUntil = performance.now() + (ROUND_S + TOUR_GAP_S) * 1000;
      run(m.round);
    }, 250);
    return () => window.clearInterval(timer);
    // run and settle read refs only; the tour restarts when the table comes into view.
  }, [visible]);

  const advance = () => {
    if (round >= MAX_ROUND) return;
    touched();
    const next = round + 1;
    setRound(next);
    run(next);
  };
  const restart = () => {
    touched();
    setRound(DEFAULT_ROUND);
    settle(DEFAULT_ROUND);
  };

  const shuttle = (side: 'back' | 'front', parts: readonly Part[], key: string) => (
    <g key={key} data-shuttle={side} transform={side === 'back' ? backTrayShift(0) : frontTrayShift(0)}>
      {parts.map((part, k) => (
        <PartView key={k} part={part} />
      ))}
    </g>
  );

  const counts = countIn(round);

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
            onClick={advance}
            aria-disabled={round >= MAX_ROUND || undefined}
          >
            Run a training round
          </button>
          <InstrumentReset onClick={restart} data-testid="curriculum-reset" />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Easy ground left, hard right; blue tokens just moved up"
          readout={statusLine(round)}
          status="Illustrative model; the paper's rules"
          data-testid="curriculum-stage"
          data-round={round}
          data-source-round={round}
          data-counts={counts.join(' ')}
        >
          <div ref={svgHost} onPointerEnter={touched} onFocusCapture={touched}>
            <IsoFigure width={WIDTH} height={HEIGHT} fit={PHONE_FIT} label={drawingLabel(round)} describedBy={descriptionId}>
              {LAYERS.map((layer, index) => {
                if (layer.kind !== 'slot') return <PartView key={index} part={layer} />;
                if (layer.slot === 'back-shuttle') return shuttle('back', BACK_SHUTTLE, 'back-shuttle');
                if (layer.slot === 'back-nut') return shuttle('back', BACK_NUT, 'back-nut');
                if (layer.slot === 'front-shuttle') return shuttle('front', FRONT_SHUTTLE, 'front-shuttle');
                if (layer.slot === 'front-nut') return shuttle('front', FRONT_NUT, 'front-nut');
                return (
                  <g key="cells" data-testid="curriculum-table">
                    {CELLS.map((cell) => (
                      <g key={cell.id} data-cell={cell.id}>
                        {cell.parts.map((part, k) => (
                          <PartView key={k} part={part} />
                        ))}
                        {/* The tokens standing in this cell; the live code files them here as they move. */}
                        <g data-tokens={cell.id} dangerouslySetInnerHTML={REST_MARKUP[cell.id]} />
                      </g>
                    ))}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="Robots that cross their patch move to harder ground, and those that cover less than half of it move back."
      method={
        <>
          <div>
            Rudin and colleagues promote a robot that crosses its patch, demote one that covers under half its
            commanded distance, and send one that solves the hardest level back to a random one. Here {ROBOTS} invented
            robots follow those rules on stairs rising from {STEP_CM[0]} to {STEP_CM[1]} cm, drawn taller than scale.
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
