'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PresetGroup,
  type Preset,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { PartView } from '@/components/iso/part-view';
import { IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness, follow, useInView } from '@/components/iso/react/live';
import type { SolidPaths } from '@/components/iso/iso-kit';
import {
  BETTER_RATE,
  CURSORS,
  HEIGHT,
  JAWS,
  MAX_TRIALS,
  PARTS,
  POLICIES,
  TRIAL_COUNTS,
  WIDTH,
  WORSE_RATE,
  alongRule,
  chanceApart,
  chanceWorseTies,
  clopperPearson,
  fallingTile,
  knobParts,
  overlapBar,
  overlapOf,
  passesOf,
  tileField,
  trialsOf,
  type JawSide,
  type Policy,
  type Slot,
  type TileField,
  type TrialCount,
} from '@/components/iso/figures/trial-tally-board';

/**
 * TrialTally: why a few real trials cannot rank two policies, drawn as a
 * trial tally board (components/iso/figures/trial-tally-board.ts).
 *
 * Two policies with fixed true success rates, 70% and 85%, are each tried
 * the same number of times. Every trial drops a flip tile into the policy's
 * field, light face up for a pass and dark for a failure. On each policy's
 * percent rule a caliper's jaws close on the exact 95% range of true rates
 * its tally supports, and a cursor marks the measured rate; pins mark the
 * true rates. The lit bar between the rules spans the stretch the two ranges
 * share. With 10 trials the measured rates jump from run to run and the
 * ranges overlap widely; with 300 they stand apart. "Run the trials again"
 * draws a fresh run; when nobody touches the figure it reruns by itself.
 *
 * Illustrative teaching pair, not measured policies. The article's numbers:
 * Snyder and colleagues give 10 or 50 trials as small feasible samples, and
 * TRI ran 50 real rollouts per task, policy and condition.
 */

export const SOURCES = {
  tri: { id: 'tri-lbm-2025', url: 'https://arxiv.org/abs/2507.05331' },
  snyder: { id: 'optimal-stopping-2025', url: 'https://arxiv.org/abs/2503.10966' },
} as const;

export const COUNTS: readonly Preset<`${TrialCount}`>[] = TRIAL_COUNTS.map((count) => ({ id: `${count}` as const, label: `${count} trials` }));

const percent = (rate: number) => `${Math.round(rate * 100)}%`;
const POLICY_NAME: Record<Policy, string> = { worse: `${percent(WORSE_RATE)} policy`, better: `${percent(BETTER_RATE)} policy` };

/** A chance in plain words: runs in 100, in 1,000 or in a million. */
export function chanceWords(chance: number): string {
  if (chance >= 0.995) return 'nearly every run';
  if (chance >= 0.01) return `${Math.round(chance * 100)} runs in 100`;
  if (chance >= 0.001) return `${Math.round(chance * 1000)} runs in 1,000`;
  if (chance >= 0.5e-6) return `${Math.round(chance * 1e6)} runs in a million`;
  return 'fewer than 1 run in a million';
}

export interface Tally {
  count: TrialCount;
  passes: Record<Policy, number>;
  ranges: Record<Policy, readonly [number, number]>;
  overlap: number;
}
/** Run `run`'s tally at `count` trials per policy. */
export function tallyOf(count: TrialCount, run: number): Tally {
  const passes = {
    worse: passesOf(trialsOf(run, 'worse'), count),
    better: passesOf(trialsOf(run, 'better'), count),
  };
  const ranges = { worse: clopperPearson(passes.worse, count), better: clopperPearson(passes.better, count) };
  return { count, passes, ranges, overlap: overlapOf(ranges.worse, ranges.better) };
}

export function readoutFor(count: TrialCount, run: number): string {
  const { passes, overlap } = tallyOf(count, run);
  return `${POLICY_NAME.worse}: ${passes.worse} of ${count} pass · ${POLICY_NAME.better}: ${passes.better} of ${count} pass · ${overlap > 0 ? `ranges overlap by ${Math.round(overlap * 100)} points` : 'ranges stand apart'}`;
}
const loggingReadout = (count: TrialCount, logged: number, passes: Record<Policy, number>) =>
  `Logging trial ${logged} of ${count} · ${POLICY_NAME.worse}: ${passes.worse} pass · ${POLICY_NAME.better}: ${passes.better} pass`;

/** The legend under the drawing, in plain words. */
export const LEGEND = 'Back row: the 70% policy · front row: the 85% policy · dark tile: a failed trial · blue bar: where the two ranges overlap';
/** The small note under the readout: the most useful chance at this count, and what the numbers are. */
export function noteFor(count: TrialCount): string {
  return `At ${count} trials the ${POLICY_NAME.worse} ties or beats the ${POLICY_NAME.better} in ${chanceWords(chanceWorseTies(count))}. Illustrative teaching pair.`;
}

// ------------------------------------------------------------------ the run
/** How long a run takes to log its trials: longer for more trials, never more than about two seconds. */
export const logSeconds = (count: number) => 0.8 + 0.5 * Math.log10(count);
/** How long one tile takes to fall into its cell. */
export const FALL_S = 0.16;
export const runSeconds = (count: number) => logSeconds(count) + FALL_S;
/** Trial `k` starts to fall at this many seconds into a run. */
const startOf = (k: number, count: number) => (k / count) * logSeconds(count);
/** Tiles that have landed `t` seconds into a run. */
export function landedAt(t: number, count: number): number {
  if (t >= runSeconds(count)) return count;
  return Math.max(0, Math.min(count, Math.floor(((t - FALL_S) / logSeconds(count)) * count) + 1));
}

/** The idle tour: the first rerun after this long in view, then this long after each run ends. */
const TOUR_FIRST_MS = 1400;
const TOUR_HOLD_MS = 2800;
/** After the reader acts, the tour waits this long before it starts again. */
const QUIET_MS = 3600;
/** Falling tiles drawn at once in each field, at most (300 trials keep about 24 in the air). */
const FALL_POOL = 30;
const JAW_S = 0.16;

type SolidRefs = { fill: SVGPathElement | null; shades: Array<SVGPathElement | null>; top: SVGPathElement | null; tint: SVGPathElement | null; crease: SVGPathElement | null; bevel: SVGPathElement | null; outline: SVGPathElement | null };
const emptySolid = (): SolidRefs => ({ fill: null, shades: [null, null, null, null], top: null, tint: null, crease: null, bevel: null, outline: null });
function writeSolid(refs: SolidRefs, paths: SolidPaths | null) {
  refs.fill?.setAttribute('d', paths?.fill ?? '');
  refs.shades.forEach((node, shade) => node?.setAttribute('d', paths?.shades[shade] ?? ''));
  refs.top?.setAttribute('d', paths?.top ?? '');
  refs.tint?.setAttribute('d', paths?.top ?? '');
  refs.crease?.setAttribute('d', paths?.crease ?? '');
  refs.bevel?.setAttribute('d', paths?.bevel ?? '');
  refs.outline?.setAttribute('d', paths?.outline ?? '');
}
/** Ref setters kept outside the components, so the refs objects stay plain mutable records. */
function bind<T extends Record<K, SVGPathElement | null>, K extends keyof T>(refs: T, key: K, el: SVGPathElement | null) {
  refs[key] = el as T[K];
}
function bindShade(refs: { shades: Array<SVGPathElement | null> }, shade: number, el: SVGPathElement | null) {
  refs.shades[shade] = el;
}
/** A solid whose paths the run rewrites: the same markup as the kit's Solid, with refs. */
function LiveSolid({ refs, paths, tone = 'hi', lit = false }: { refs: SolidRefs; paths: SolidPaths | null; tone?: 'hi' | 'mid' | 'lo'; lit?: boolean }) {
  return (
    <g className="iso-solid" data-lit={lit ? '' : undefined}>
      <path ref={(el) => bind(refs, 'fill', el)} className="iso-fill" d={paths?.fill ?? ''} />
      {[0, 1, 2, 3].map((shade) => (
        <path key={shade} ref={(el) => bindShade(refs, shade, el)} className="iso-shade" data-shade={shade} d={paths?.shades[shade] ?? ''} />
      ))}
      <path ref={(el) => bind(refs, 'top', el)} className="iso-top" d={paths?.top ?? ''} />
      {lit ? <path ref={(el) => bind(refs, 'tint', el)} fill="var(--anatomy-lit)" fillOpacity={0.28} d={paths?.top ?? ''} /> : null}
      <path ref={(el) => bind(refs, 'crease', el)} className="iso-line iso-crease" data-tone={tone === 'hi' ? 'lo' : 'faint'} d={paths?.crease ?? ''} />
      <path ref={(el) => bind(refs, 'bevel', el)} className="iso-line iso-bevel" data-tone="faint" d={paths?.bevel ?? ''} />
      <path ref={(el) => bind(refs, 'outline', el)} className="iso-line iso-edge" data-tone={tone} d={paths?.outline ?? ''} />
    </g>
  );
}

type FieldRefs = { body: SVGPathElement | null; edge: SVGPathElement | null; pass: SVGPathElement | null; fail: SVGPathElement | null };
const emptyField = (): FieldRefs => ({ body: null, edge: null, pass: null, fail: null });
function writeField(refs: FieldRefs, field: TileField) {
  refs.body?.setAttribute('d', field.bodies);
  refs.edge?.setAttribute('d', field.bodies);
  refs.pass?.setAttribute('d', field.passTops);
  refs.fail?.setAttribute('d', field.failTops);
}

/** The pose the board rests in when run `run` of `count` trials has been logged. */
function restPose(count: TrialCount, run: number) {
  const tally = tallyOf(count, run);
  return {
    fields: Object.fromEntries(POLICIES.map((policy) => [policy, tileField(policy, trialsOf(run, policy), count)])) as Record<Policy, TileField>,
    ranges: tally.ranges,
    rates: { worse: tally.passes.worse / count, better: tally.passes.better / count },
    bar: overlapBar(Math.max(tally.ranges.worse[0], tally.ranges.better[0]), Math.min(tally.ranges.worse[1], tally.ranges.better[1])),
  };
}

const still = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

export function TrialTally({ className }: { className?: string }) {
  const descriptionId = `${useId()}-drawing`;
  const [count, setCount] = useState<TrialCount>(10);
  const [run, setRun] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  /** The pose the server and the first render draw; runs move the board from there on through refs. */
  const [initial] = useState(() => restPose(10, 0));
  const knob = knobParts(count);
  const tally = tallyOf(count, run);

  const anchor = useRef<HTMLDivElement>(null);
  const visible = useInView(anchor);
  const fieldRefs = useRef<Record<Policy, FieldRefs>>({ worse: emptyField(), better: emptyField() });
  const fallRefs = useRef<Record<Policy, SolidRefs[]>>({ worse: Array.from({ length: FALL_POOL }, emptySolid), better: Array.from({ length: FALL_POOL }, emptySolid) });
  const barRefs = useRef<SolidRefs>(emptySolid());
  const jawRefs = useRef<Record<Policy, Record<JawSide, SVGGElement | null>>>({ worse: { low: null, high: null }, better: { low: null, high: null } });
  const cursorRefs = useRef<Record<Policy, SVGGElement | null>>({ worse: null, better: null });
  const live = useRef({
    ranges: { worse: [...initial.ranges.worse], better: [...initial.ranges.better] } as Record<Policy, [number, number]>,
    rates: { ...initial.rates },
  });
  const frame = useRef(0);
  const touched = useRef(0);

  /** Puts the jaws, cursors and lit bar where `live` says. */
  const placeCalipers = useCallback(() => {
    const { ranges, rates } = live.current;
    for (const policy of POLICIES) {
      jawRefs.current[policy].low?.setAttribute('transform', alongRule(ranges[policy][0]));
      jawRefs.current[policy].high?.setAttribute('transform', alongRule(ranges[policy][1]));
      cursorRefs.current[policy]?.setAttribute('transform', alongRule(rates[policy]));
    }
    writeSolid(barRefs.current, overlapBar(Math.max(ranges.worse[0], ranges.better[0]), Math.min(ranges.worse[1], ranges.better[1])));
  }, []);

  /** Puts the board in the rest pose of run `nextRun` of `nextCount` trials, with no motion. */
  const settle = useCallback(
    (nextCount: TrialCount, nextRun: number) => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      const pose = restPose(nextCount, nextRun);
      for (const policy of POLICIES) {
        writeField(fieldRefs.current[policy], pose.fields[policy]);
        fallRefs.current[policy].forEach((refs) => writeSolid(refs, null));
      }
      live.current = { ranges: { worse: [...pose.ranges.worse], better: [...pose.ranges.better] }, rates: { ...pose.rates } };
      placeCalipers();
      setProgress(null);
      setRunning(false);
    },
    [placeCalipers],
  );

  /** Logs run `nextRun` of `nextCount` trials from the start, or jumps to its end under reduced motion. */
  const start = useCallback(
    (nextCount: TrialCount, nextRun: number) => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      if (still() || typeof requestAnimationFrame !== 'function') {
        settle(nextCount, nextRun);
        return;
      }
      const trials = { worse: trialsOf(nextRun, 'worse'), better: trialsOf(nextRun, 'better') };
      setRunning(true);
      let begin = 0;
      let last = 0;
      let shownLanded = -1;
      let lastSaid = 0;
      const tick = (now: number) => {
        if (!begin) begin = now;
        const t = (now - begin) / 1000;
        const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
        last = now;
        if (t >= runSeconds(nextCount) + 0.6) {
          settle(nextCount, nextRun);
          return;
        }
        const landed = landedAt(t, nextCount);
        if (landed !== shownLanded) {
          shownLanded = landed;
          for (const policy of POLICIES) writeField(fieldRefs.current[policy], tileField(policy, trials[policy], landed));
        }
        // The tiles on their way down, back to front within each field.
        for (const policy of POLICIES) {
          const pool = fallRefs.current[policy];
          let slot = 0;
          for (let k = landed; k < nextCount && slot < FALL_POOL; k++) {
            const age = t - startOf(k, nextCount);
            if (age < 0) break;
            writeSolid(pool[slot++]!, fallingTile(policy, k, Math.min(1, age / FALL_S)));
          }
          for (; slot < FALL_POOL; slot++) writeSolid(pool[slot]!, null);
        }
        const passes = { worse: passesOf(trials.worse, landed), better: passesOf(trials.better, landed) };
        for (const policy of POLICIES) {
          const target = clopperPearson(passes[policy], landed);
          const range = live.current.ranges[policy];
          range[0] = follow(range[0], target[0], dt, JAW_S);
          range[1] = follow(range[1], target[1], dt, JAW_S);
          if (landed > 0) live.current.rates[policy] = follow(live.current.rates[policy], passes[policy] / landed, dt, JAW_S);
        }
        placeCalipers();
        if (landed < nextCount && now - lastSaid > 120) {
          lastSaid = now;
          setProgress(loggingReadout(nextCount, landed, passes));
        } else if (landed === nextCount) setProgress(null);
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [placeCalipers, settle],
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Offscreen, a run in progress jumps to its end.
  const latest = useRef({ count, run, running });
  useEffect(() => {
    latest.current = { count, run, running };
  });
  useEffect(() => {
    if (!visible && latest.current.running) settle(latest.current.count, latest.current.run);
  }, [visible, settle]);

  // The reader's own actions anywhere in the figure hold the idle tour off.
  useEffect(() => {
    const root = anchor.current?.closest('[data-figure-frame]');
    if (!root) return;
    const touch = () => {
      touched.current = performance.now();
    };
    const events = ['pointerdown', 'keydown', 'focusin', 'wheel'] as const;
    for (const name of events) root.addEventListener(name, touch);
    return () => {
      for (const name of events) root.removeEventListener(name, touch);
    };
  }, []);

  // The idle tour: in view, at rest and untouched for a while, the board runs its trials again.
  const firstTour = useRef(true);
  useEffect(() => {
    if (!visible || running || still()) return;
    const wait = firstTour.current ? TOUR_FIRST_MS : TOUR_HOLD_MS;
    let timer = 0;
    const check = () => {
      const quiet = performance.now() - touched.current;
      if (touched.current && quiet < QUIET_MS) {
        timer = window.setTimeout(check, QUIET_MS - quiet + 50);
        return;
      }
      firstTour.current = false;
      const next = latest.current.run + 1;
      setRun(next);
      start(latest.current.count, next);
    };
    timer = window.setTimeout(check, wait);
    return () => window.clearTimeout(timer);
  }, [visible, running, start]);

  const choose = (id: `${TrialCount}`) => {
    const next = Number(id) as TrialCount;
    setCount(next);
    start(next, run);
  };
  const rerun = () => {
    const next = run + 1;
    setRun(next);
    start(count, next);
  };
  const reset = () => {
    setCount(10);
    setRun(0);
    settle(10, 0);
  };

  const slot = (name: Slot): ReactNode => {
    if (name === 'tiles-worse' || name === 'tiles-better') {
      const policy: Policy = name === 'tiles-worse' ? 'worse' : 'better';
      const field = initial.fields[policy];
      const refs = fieldRefs.current[policy];
      return (
        <g key={name} data-testid={`tally-tiles-${policy}`}>
          <g className="iso-solid">
            <path ref={(el) => bind(refs, 'body', el)} className="iso-shade" data-shade={1} d={field.bodies} />
            <path ref={(el) => bind(refs, 'pass', el)} className="iso-top" data-tile="pass" d={field.passTops} />
            <path ref={(el) => bind(refs, 'fail', el)} className="iso-top" data-tile="fail" style={{ fill: 'var(--anatomy-mid)' }} d={field.failTops} />
            <path ref={(el) => bind(refs, 'edge', el)} className="iso-line iso-edge" data-tone="mid" d={field.bodies} />
          </g>
          {fallRefs.current[policy].map((refs, index) => (
            <LiveSolid key={index} refs={refs} paths={null} tone="mid" />
          ))}
        </g>
      );
    }
    if (name === 'caliper-worse' || name === 'caliper-better') {
      const policy: Policy = name === 'caliper-worse' ? 'worse' : 'better';
      const cursor = CURSORS[policy];
      return (
        <g key={name} data-testid={`tally-caliper-${policy}`}>
          <g ref={(el) => { cursorRefs.current[policy] = el; }} transform={alongRule(initial.rates[policy])} data-cursor="">
            <Solid paths={cursor.body} tone="hi" />
            <Line d={cursor.index} tone="hi" />
          </g>
          {(['low', 'high'] as const).map((side) => {
            const jaw = JAWS[policy][side];
            return (
              <g
                key={side}
                ref={(el) => { jawRefs.current[policy][side] = el; }}
                transform={alongRule(initial.ranges[policy][side === 'low' ? 0 : 1])}
                data-jaw={side}
              >
                <Solid paths={jaw.slider} tone="mid" />
                <Solid paths={jaw.blade} tone="hi" />
                <Solid paths={jaw.screw} tone="mid" />
                <Line d={jaw.knurl} tone="lo" />
              </g>
            );
          })}
        </g>
      );
    }
    if (name === 'bar') {
      return (
        <g key={name} data-testid="tally-overlap">
          <LiveSolid refs={barRefs.current} paths={initial.bar} tone="hi" lit />
        </g>
      );
    }
    return (
      <g key={name} data-testid="tally-knob" data-count={count}>
        <Solid paths={knob.knob} tone="mid" />
        <Line d={knob.knurl} tone="lo" />
        <Line d={knob.pointer} tone="hi" free="end" />
      </g>
    );
  };

  return (
    <InstrumentFigure
      figureId="trial-tally"
      className={className}
      kicker="Small samples"
      heading="Ten trials cannot rank a 70% and an 85% policy"
      controls={
        <div ref={anchor} className="flex flex-wrap items-end gap-x-6 gap-y-1">
          <PresetGroup label="Trials per policy" presets={COUNTS} value={`${count}`} onChange={choose} testId="tally-count" />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            data-testid="tally-rerun"
            onClick={rerun}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Run the trials again
          </button>
        </div>
      }
      adjust={<InstrumentReset onClick={reset} />}
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          keys={[{ words: LEGEND }]}
          readout={progress ?? readoutFor(count, run)}
          status={<span data-testid="tally-note">{noteFor(count)}</span>}
          data-testid="tally-stage"
        >
          <IsoFigure
            width={WIDTH}
            height={HEIGHT}
            label={`A trial tally board. ${count} trials each for a policy that truly succeeds 70% of the time and one that truly succeeds 85% of the time. This run: ${tally.passes.worse} and ${tally.passes.better} passes. The calipers' ranges ${tally.overlap > 0 ? `overlap by ${Math.round(tally.overlap * 100)} percentage points` : 'stand apart'}.`}
            describedBy={descriptionId}
          >
            {PARTS.map((part, index) => (part.kind === 'slot' ? slot(part.slot) : <PartView key={index} part={part} />))}
          </IsoFigure>
        </AnatomyStage>
      }
      caption="With 10 trials each measured rate jumps from run to run and the ranges overlap; a few hundred trials set the 85% policy clearly apart."
      method={
        <>
          <p>
            The two policies are an illustrative teaching pair, not measured robots: one truly succeeds 70% of the time,
            the other 85%. Each run draws every trial from a seeded generator as an independent pass or failure at the
            policy&apos;s true rate, so the same run always lands the same way. A run is one sequence of {MAX_TRIALS}{' '}
            trials per policy; 10 or 50 trials read its start. The article&apos;s numbers set the presets: Snyder and
            colleagues give 10 or 50 trials as examples of small feasible samples, and TRI ran 50 real rollouts per task,
            policy and condition.
          </p>
          <p id={descriptionId}>
            The back row of tiles and the rule in front of it belong to the 70% policy, whose plate carries one bump;
            the front rule and row belong to the 85% policy, whose plate carries two. A light tile is a passed trial and a
            dark tile a failed one. Each caliper closes on the exact Clopper-Pearson 95% interval for its policy&apos;s true success rate: the
            lowest rate under which the tally&apos;s passes or more would have a 2.5% chance, and the highest under which
            that many or fewer would. The cursor between the jaws marks the measured rate, the pins in the channel mark the
            true rates, and the blue bar spans the stretch the two intervals share. The chances come from the two
            binomial distributions, summed exactly: at {count} trials each, the 70% policy passes at least as many trials
            as the 85% policy in {chanceWords(chanceWorseTies(count))}, and the intervals stand apart in{' '}
            {chanceWords(chanceApart(count))}. Intervals that overlap do not prove two policies equal, and a formal test
            can find a difference before they separate; the jaws show how much a tally pins down.
          </p>
          <p>
            Sources:{' '}
            <a data-brand-control-id="control:link-focus" href={SOURCES.tri.url} target="_blank" rel="noopener" className="underline-offset-2">
              TRI&apos;s Large Behavior Model study
            </a>{' '}
            (50 real rollouts per task, policy and condition, and the warning that many robotics papers may measure
            statistical noise);{' '}
            <a data-brand-control-id="control:link-focus" href={SOURCES.snyder.url} target="_blank" rel="noopener" className="underline-offset-2">
              Snyder and colleagues
            </a>{' '}
            (10 or 50 trials as small feasible samples; on one closely matched hardware pair, even an ideal sequential test
            needed about 500 trials per policy to detect the gap 80% of the time).
          </p>
        </>
      }
    />
  );
}
