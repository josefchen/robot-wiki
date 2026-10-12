'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { solidSvg } from '@/components/iso/iso-kit';
import {
  BIN_CLEAR_Y,
  BLADE_DROP,
  HEIGHT,
  PUNCH_FACE,
  PUSH_CONTACT,
  PUSH_TRAVEL,
  ROW,
  TAPE_CLIP,
  WIDTH,
  crankPaths,
  feelerYAt,
  guideRodPaths,
  holeY,
  inkPath,
  knobPointer,
  pileOffset,
  plannedMove,
  rodPaths,
  sceneOf,
  shiftBy,
  type Group,
  type Part,
} from '@/components/iso/figures/plan-tape-reader';
import {
  CONTROL_HZ,
  DIFFUSION_POLICY_HORIZON,
  clampHorizon,
  commitDurationS,
  planChunks,
  replanRateHz,
} from '@/lib/receding-horizon';

/**
 * RecedingHorizon: plan ahead, act on the first part, then plan again,
 * drawn as a plan-tape reader.
 *
 * A punch writes each plan onto paper tape, one row per planned move. The
 * strip feeds to a reader whose feeler acts on the first T_a rows and inks
 * them (the ink, the path the robot really moves, is the one lit part);
 * then a blade cuts the strip, a pusher sweeps the unread tail into the bin
 * in front, and the punch writes the next plan.
 * The still pose is the cut of the last plan in the window: its read rows
 * on the exit plate, its tail on the gate, and the earlier plans' tails in
 * the bin. "Run the reader" plays the window from the first plan, three
 * times slower than the robot. The step sliders and Reset sit in "Adjust
 * more", the symbols and the receding-horizon term in "How this was made".
 */
type RecedingHorizonProps = {
  /** Window of control steps in which new plans start. Default 32. */
  windowSteps?: number;
  className?: string;
};

const MIN_TP = 4;
const MAX_TP = 32;
/** The reader runs this many times slower than the robot, so the eye can follow it. */
export const SLOW = 3;

type HorizonPreset = 'diffusion' | 'never';

function formatHz(value: number): string {
  return `${value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '.0')} Hz`;
}

function formatSeconds(value: number): string {
  return `${value.toFixed(1)} s`;
}

/** "1.25 times a second": the replan rate in plain words. */
function rateWords(value: number): string {
  return `${value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '.0')} times a second`;
}

function secondsWords(value: number): string {
  return `${value.toFixed(1)} seconds`;
}

const smooth = (u: number) => {
  const t = Math.max(0, Math.min(1, u));
  return t * t * (3 - 2 * t);
};

/** One plan's cycle on the reader, in seconds on screen: feed, act, cut, push, drop into the bin. */
export function cycleOf(ta: number, plans: number) {
  const overhead = Math.min(1, 9 / Math.max(1, plans));
  return {
    feed: 0.8 * overhead,
    act: (ta / CONTROL_HZ) * SLOW,
    cut: 0.4 * overhead,
    push: 0.6 * overhead,
    drop: 0.6 * overhead,
  };
}

export type ReaderPose = {
  /** Rows the feeler has read of the current plan. */
  read: number;
  /** The current plan's strip, along the bench from its still-pose place. */
  card: number;
  /** The earlier plans' read rows, along the bench. */
  exec: number;
  /** The current plan's tail, from its still-pose place. */
  tail: [number, number, number];
  /** How far the pusher bar is forward. */
  push: number;
  /** How far the blade is down. */
  blade: number;
  /** The feeler's place across the tape. */
  feelerY: number;
};

/** The still pose: plan `plan` at its cut, every read row inked, the tail still on the gate. */
export function cutPose(plan: number, ta: number): ReaderPose {
  return { read: ta, card: 0, exec: 0, tail: [0, 0, 0], push: 0, blade: 0, feelerY: feelerYAt(plan, ta, ta) };
}

/** The pose `t` seconds into plan `plan`'s cycle: fed from the punch, read, cut, its tail pushed off and dropped into the bin. */
export function poseAt(plan: number, tp: number, ta: number, t: number, plans: number): ReaderPose {
  const c = cycleOf(ta, plans);
  const back = -ta * ROW;
  const prevY = plan > 0 ? holeY(plannedMove(plan - 1, ta - 1, ta)) : holeY(plannedMove(0, 0, ta));
  const firstY = holeY(plannedMove(plan, 0, ta));
  let s = t;
  if (s < c.feed) {
    const u = smooth(s / c.feed);
    const card = back + PUNCH_FACE * (1 - u);
    return { read: 0, card, exec: back, tail: [card, 0, 0], push: 0, blade: 0, feelerY: prevY + (firstY - prevY) * u };
  }
  s -= c.feed;
  if (s < c.act) {
    const read = (s / c.act) * ta;
    const card = back + read * ROW;
    return { read, card, exec: card, tail: [card, 0, 0], push: 0, blade: 0, feelerY: feelerYAt(plan, ta, read) };
  }
  s -= c.act;
  const rest = cutPose(plan, ta);
  if (tp === ta) return rest;
  if (s < c.cut) return { ...rest, blade: Math.sin(Math.PI * (s / c.cut)) * BLADE_DROP };
  s -= c.cut;
  if (s < c.push) {
    const push = smooth(s / c.push) * PUSH_TRAVEL;
    return { ...rest, push, tail: [0, Math.max(0, push - PUSH_CONTACT), 0] };
  }
  s -= c.push;
  // Over the bed's front edge and the bin's back wall first, then down onto the pile.
  const u = Math.min(1, s / c.drop);
  const [rx, ry, rz] = pileOffset(plan, tp - ta);
  const pushed = PUSH_TRAVEL - PUSH_CONTACT;
  const a = smooth(u / 0.4);
  const b = smooth((u - 0.4) / 0.6);
  const tail: [number, number, number] = [rx * b, pushed + (BIN_CLEAR_Y - pushed) * a + (ry - BIN_CLEAR_Y) * b, rz * b];
  return { ...rest, push: PUSH_TRAVEL * (1 - smooth(u)), tail };
}

const still = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

function PartView({ part }: { part: Part }): ReactNode {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.kind === 'strip') {
    return (
      <g data-testid={part.role === 'committed' ? 'rh-committed' : 'rh-predicted'} data-plan={part.plan} data-rows={part.rows}>
        {part.parts.map((child, index) => (
          <PartView key={index} part={child} />
        ))}
      </g>
    );
  }
  return null;
}

const rodsSvg = (list: ReturnType<typeof rodPaths>) => list.map((paths) => solidSvg(paths, { tone: 'mid' })).join('');
const MOVING: Group[] = ['exec', 'card', 'tail', 'pusher', 'blade', 'feeler'];

function groupTransform(group: Group, pose: ReaderPose): string | undefined {
  if (group === 'exec') return shiftBy(pose.exec);
  if (group === 'card') return shiftBy(pose.card);
  if (group === 'tail') return shiftBy(...pose.tail);
  if (group === 'pusher') return shiftBy(0, pose.push);
  if (group === 'blade') return shiftBy(0, 0, -pose.blade);
  if (group === 'feeler') return shiftBy(0, pose.feelerY);
  return undefined;
}

export function RecedingHorizon({
  windowSteps = 32,
  className,
}: RecedingHorizonProps) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const clipId = `${uid.replace(/[^a-zA-Z0-9_-]/g, '')}-tape`;
  const [horizon, setHorizon] = useState<{ tp: number; ta: number }>({
    tp: DIFFUSION_POLICY_HORIZON.tp,
    ta: DIFFUSION_POLICY_HORIZON.ta,
  });
  const clamped = clampHorizon(horizon.tp, horizon.ta);
  const chunks = useMemo(
    () => planChunks(clamped.tp, clamped.ta, windowSteps),
    [clamped.tp, clamped.ta, windowSteps],
  );
  const lastPlan = chunks.length - 1;
  const [running, setRunning] = useState(false);
  // While the reader runs, the plan being read; at rest, the last plan in the window, at its cut.
  const [livePlan, setLivePlan] = useState(0);
  const plan = running ? livePlan : lastPlan;
  const parts = useMemo(() => sceneOf(clamped.tp, clamped.ta, plan), [clamped.tp, clamped.ta, plan]);
  const runs = useMemo(() => {
    const list: Array<{ group: Group; parts: Part[]; key: string }> = [];
    const seen: Partial<Record<Group, number>> = {};
    for (const part of parts) {
      const last = list[list.length - 1];
      if (last && last.group === part.group) last.parts.push(part);
      else {
        seen[part.group] = (seen[part.group] ?? 0) + 1;
        list.push({ group: part.group, parts: [part], key: `${part.group}-${seen[part.group]}` });
      }
    }
    return list;
  }, [parts]);

  // The pose React renders: the cut at rest, the start of the feed while running.
  const restPose: ReaderPose = running ? poseAt(plan, clamped.tp, clamped.ta, 0, chunks.length) : cutPose(plan, clamped.ta);

  const groupRefs = useRef<Partial<Record<Group, SVGGElement | null>>>({});
  const inkRef = useRef<SVGPathElement>(null);
  const rodsRef = useRef<SVGGElement>(null);
  const rodsBackRef = useRef<SVGGElement>(null);
  const rodsFrontRef = useRef<SVGGElement>(null);
  const crankRef = useRef<SVGGElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const settings = useRef({ tp: clamped.tp, ta: clamped.ta, plans: chunks.length });
  useLayoutEffect(() => {
    settings.current = { tp: clamped.tp, ta: clamped.ta, plans: chunks.length };
  }, [clamped.tp, clamped.ta, chunks.length]);

  // Run the window from the first plan: each plan fed, read, cut and its tail binned, ending at the last plan's cut.
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    let t = 0;
    let current = 0;
    let executed = 0;
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(now - last, 64)) / 1000;
      last = now;
      t += dt;
      const { tp, ta, plans } = settings.current;
      const c = cycleOf(ta, plans);
      const length = c.feed + c.act + (tp > ta ? c.cut + c.push + c.drop : 0);
      const final = current >= plans - 1;
      if (final && t >= c.feed + c.act) {
        setRunning(false);
        return;
      }
      if (!final && t >= length) {
        t -= length;
        current += 1;
        executed += ta;
        setLivePlan(current);
      }
      const p = poseAt(current, tp, ta, t, plans);
      for (const group of MOVING) groupRefs.current[group]?.setAttribute('transform', groupTransform(group, p) ?? '');
      inkRef.current?.setAttribute('d', inkPath(current, ta, p.read));
      if (rodsRef.current) rodsRef.current.innerHTML = rodsSvg(rodPaths(p.push));
      const rods = guideRodPaths(p.feelerY);
      if (rodsBackRef.current) rodsBackRef.current.innerHTML = rodsSvg(rods.back);
      if (rodsFrontRef.current) rodsFrontRef.current.innerHTML = rodsSvg(rods.front);
      if (crankRef.current) crankRef.current.innerHTML = solidSvg(crankPaths(0.8 + (executed + p.read) * 0.35), { tone: 'mid' });
      if (phaseRef.current) {
        phaseRef.current.textContent =
          p.read <= 0
            ? `plan ${current + 1} of ${plans} punched · `
            : p.read < ta
              ? `plan ${current + 1} of ${plans}, step ${Math.ceil(p.read)} of ${ta} · `
              : `plan ${current + 1} of ${plans} cut · `;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const restPhase = `plans ${secondsWords(commitDurationS(clamped.tp))} ahead · `;
  // At rest, or after a stop mid-run, put every moving part back in the still pose.
  useEffect(() => {
    if (running) return;
    const p = cutPose(plan, clamped.ta);
    for (const group of MOVING) groupRefs.current[group]?.setAttribute('transform', groupTransform(group, p) ?? '');
    inkRef.current?.setAttribute('d', inkPath(plan, clamped.ta, p.read));
    if (rodsRef.current) rodsRef.current.innerHTML = rodsSvg(rodPaths(0));
    const rodsNow = guideRodPaths(p.feelerY);
    if (rodsBackRef.current) rodsBackRef.current.innerHTML = rodsSvg(rodsNow.back);
    if (rodsFrontRef.current) rodsFrontRef.current.innerHTML = rodsSvg(rodsNow.front);
    if (crankRef.current) crankRef.current.innerHTML = solidSvg(crankPaths(0.8), { tone: 'mid' });
    if (phaseRef.current) phaseRef.current.textContent = restPhase;
  }, [running, plan, clamped.ta, restPhase]);

  // The reader runs from the reader's control, from the first plan; under reduced motion it stays still.
  const toggleRun = () => {
    setLivePlan(0);
    if (running) {
      setRunning(false);
      return;
    }
    if (still()) return;
    setRunning(true);
  };

  function set(tp: number, ta: number) {
    setRunning(false);
    setHorizon(clampHorizon(tp, ta));
  }

  // Tail width in control steps: T_p - T_a after clamping. At zero there
  // is no tail on any plan, so the takeaway must not claim one.
  const tailSteps = clamped.tp - clamped.ta;
  const tailClause =
    tailSteps > 0
      ? `the inked rows are executed while the unread ${tailSteps}-step tails are thrown away into the bin`
      : 'with T_a equal to T_p there is no tail to throw away: every predicted action is executed, so the policy runs open-loop between inferences';

  const defaults = {
    tp: DIFFUSION_POLICY_HORIZON.tp,
    ta: DIFFUSION_POLICY_HORIZON.ta,
  };
  const replanRate = formatHz(replanRateHz(clamped.ta));
  const committed = formatSeconds(commitDurationS(clamped.ta));
  const preset: HorizonPreset | null =
    clamped.tp === defaults.tp && clamped.ta === defaults.ta
      ? 'diffusion'
      : clamped.tp === MAX_TP && clamped.ta === MAX_TP
        ? 'never'
        : null;

  const rods = guideRodPaths(restPose.feelerY);
  const label =
    tailSteps > 0
      ? `Receding horizon on a tape reader: a punch writes each plan of ${clamped.tp} moves as rows of holes on paper tape, the reader acts on the first ${clamped.ta} rows and inks them, then a blade cuts the strip and the ${tailSteps} unread rows drop into a bin while the next plan is punched. ${chunks.length} plans cover the ${windowSteps}-step window, so the bin holds ${chunks.length} tails once the last is cut.`
      : `Receding horizon on a tape reader: a punch writes each plan of ${clamped.tp} moves as rows of holes on paper tape and the reader acts on every row before the next plan is punched, so nothing drops into the bin. ${chunks.length} plans cover the ${windowSteps}-step window.`;

  return (
    <InstrumentFigure
      figureId="receding-horizon"
      className={className}
      kicker="Receding horizon"
      heading="Plan 1.6 seconds ahead, act on half, then rethink"
      controls={
        <>
          <PresetGroup<HorizonPreset>
            label="How often it rethinks"
            presets={[
              {
                id: 'diffusion',
                label: `Diffusion Policy: rethink every ${secondsWords(commitDurationS(defaults.ta))}`,
              },
              { id: 'never', label: 'Never rethink' },
            ]}
            value={preset}
            onChange={(id) => (id === 'diffusion' ? set(defaults.tp, defaults.ta) : set(MAX_TP, MAX_TP))}
            testId="horizon-preset"
          />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            onClick={toggleRun}
            data-testid="rh-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the reader' : 'Run the reader'}
          </button>
        </>
      }
      adjust={
        <>
          <div className="grid basis-full gap-3 sm:grid-cols-2">
            <ControlField>
              <ControlLabel htmlFor="rh-tp" value={`${clamped.tp} steps`}>
                Steps planned
              </ControlLabel>
              <input
                id="rh-tp"
                type="range"
                data-brand-control-id="control:input"
                min={MIN_TP}
                max={MAX_TP}
                step={1}
                value={clamped.tp}
                onChange={(e) => set(Number(e.target.value), clamped.ta)}
                aria-label={`Predicted horizon T_p, currently ${clamped.tp}`}
                className={INSTRUMENT_SLIDER_CLASS}
              />
              <SliderEnds low={`${MIN_TP} steps`} high={`${MAX_TP} steps`} />
            </ControlField>
            <ControlField>
              <ControlLabel htmlFor="rh-ta" value={`${clamped.ta} steps`}>
                Steps acted on
              </ControlLabel>
              <input
                id="rh-ta"
                type="range"
                data-brand-control-id="control:input"
                min={1}
                max={MAX_TP}
                step={1}
                value={clamped.ta}
                onChange={(e) => set(clamped.tp, Number(e.target.value))}
                aria-label={`Executed horizon T_a, currently ${clamped.ta}`}
                className={INSTRUMENT_SLIDER_CLASS}
              />
              <SliderEnds low="1 step" high={`${MAX_TP} steps`} />
            </ControlField>
          </div>
          <InstrumentReset onClick={() => set(defaults.tp, defaults.ta)} />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={running ? 'Running three times slower than the robot' : 'Run the reader to watch each plan cut short'}
          readout={
            <>
              <span ref={phaseRef} data-rh-phase="" dangerouslySetInnerHTML={{ __html: running ? '' : restPhase }} />
              acts on <span data-testid="rh-commit-readout">{secondsWords(commitDurationS(clamped.ta))}</span> · rethinks{' '}
              <span data-testid="rh-replan-readout">{rateWords(replanRateHz(clamped.ta))}</span>
            </>
          }
          status="A schematic of the replanning cycle, not a recorded run."
          data-testid="rh-stage-frame"
        >
          <IsoFigure width={WIDTH} height={HEIGHT} label={label} describedBy={descriptionId}>
            <defs>
              <clipPath id={clipId}>
                <path d={TAPE_CLIP} />
              </clipPath>
            </defs>
            {runs.map((run) => {
              const body = run.parts.map((part, k) => {
                if (part.kind !== 'slot') return <PartView key={k} part={part} />;
                if (part.group === 'card') {
                  return <path key={k} ref={inkRef} className="iso-line" data-tone="lit" d={inkPath(plan, clamped.ta, restPose.read)} data-testid="rh-ink" />;
                }
                if (part.group === 'rods') return <g key={k} ref={rodsRef} dangerouslySetInnerHTML={{ __html: rodsSvg(rodPaths(restPose.push)) }} />;
                if (part.group === 'rodsBack') return <g key={k} ref={rodsBackRef} dangerouslySetInnerHTML={{ __html: rodsSvg(rods.back) }} />;
                if (part.group === 'rodsFront') return <g key={k} ref={rodsFrontRef} dangerouslySetInnerHTML={{ __html: rodsSvg(rods.front) }} />;
                if (part.group === 'crank') return <g key={k} ref={crankRef} dangerouslySetInnerHTML={{ __html: solidSvg(crankPaths(0.8), { tone: 'mid' }) }} />;
                if (part.group === 'knobs') {
                  return (
                    <g key={k}>
                      <Line d={knobPointer(0, (clamped.tp - MIN_TP) / (MAX_TP - MIN_TP))} tone="hi" />
                      <Line d={knobPointer(1, (clamped.ta - 1) / (MAX_TP - 1))} tone="hi" />
                    </g>
                  );
                }
                return null;
              });
              if (!MOVING.includes(run.group)) return <g key={run.key}>{body}</g>;
              const clipped = run.group === 'exec' || run.group === 'card' || run.group === 'tail';
              return (
                <g key={run.key} clipPath={clipped ? `url(#${clipId})` : undefined}>
                  <g
                    ref={(node) => {
                      groupRefs.current[run.group] = node;
                    }}
                    transform={groupTransform(run.group, restPose)}
                    data-testid={`rh-${run.group}`}
                  >
                    {body}
                  </g>
                </g>
              );
            })}
          </IsoFigure>
        </AnatomyStage>
      }
      caption="Acting on only the first half of each plan, then replanning, lets the robot react to what it sees while still moving smoothly."
      method={
        <>
          <p>
            This is receding-horizon control. Each plan predicts T_p actions and the robot executes the
            first T_a before it plans again; the rest of each plan is replaced by the next plan and never
            executed. The presets use the Diffusion Policy setting, T_p = {defaults.tp} and T_a ={' '}
            {defaults.ta} at {CONTROL_HZ} Hz: 1.25 replans a second and 0.8 s committed per plan.
            “Never rethink” sets both to {MAX_TP}, so the robot runs each plan open-loop. Now T_p ={' '}
            {clamped.tp}, T_a = {clamped.ta}: {replanRate} replan rate, {committed} committed per plan.
          </p>
          <p>
            The bench is a schematic, not a recorded run: one row of tape is one planned step, the hole
            across a row is where that step moves, and the path the holes follow is made up. Running, it
            moves three times slower than ten steps a second.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current receding-horizon plan"
            description={`A receding-horizon plan with T_p ${clamped.tp} and T_a ${clamped.ta} issues ${chunks.length} chunks across the ${windowSteps}-step window, replanning at ${replanRate} and committing ${committed} per plan; ${tailClause}.`}
            states={[
              { label: 'T_p', value: String(clamped.tp) },
              { label: 'T_a', value: String(clamped.ta) },
              { label: 'chunks', value: String(chunks.length) },
              { label: 'replan rate', value: replanRate },
              { label: 'committed', value: committed },
            ]}
          />
        </>
      }
      source="Schematic of the replanning cycle; the preset uses the Diffusion Policy setting: plan 16 steps, act on 8, ten steps a second."
    />
  );
}
