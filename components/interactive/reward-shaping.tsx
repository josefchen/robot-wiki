'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PresetGroup,
} from '@/components/ui/instrument';
import { roleColour } from '@/components/motion/chart';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, Line, Solid } from '@/components/iso/react/draw';
import { PartView } from '@/components/iso/part-view';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import { asksForStillness } from '@/components/iso/react/live';
import {
  BELT_BAND,
  BODY_SOLIDS,
  CAPS,
  HATCH,
  HEIGHT,
  PARTS,
  TERM_IN_CHARGE,
  WIDTH,
  beltSlats,
  bodyShift,
  capShift,
  legsAt,
  poseFor,
  type Part,
} from '@/components/iso/figures/reward-mixing-desk';
import type { FootPose, RobotSolid } from '@/components/iso/figures/quadruped-rig';
import {
  ATTRACTOR_DOMINANCE_RATIO,
  ATTRACTOR_WEIGHT_MIN,
  BEHAVIORS,
  TERMS,
  WEIGHT_MAX,
  WEIGHT_MIN,
  classifyBehavior,
  defaultWeights,
  formatTotal,
  formatWeight,
  playbackCadence,
  weightedTotal,
  type BehaviorId,
  type Weights,
} from '@/lib/reward-shaping';

/**
 * RewardShaping: how the scoring rule picks the walk, drawn as a reward
 * mixing desk wired to a treadmill bay
 * (components/iso/figures/reward-mixing-desk.ts).
 *
 * Twelve faders on the desk are the twelve weights of the score, in the
 * sliders' order; a dot beside each slot marks the balanced score. Four
 * named scoring rules each move one fader to an end of its slot, and the
 * robot on the treadmill shows the walk the local teaching model selects:
 * a steady trot, standing still, bouncing in place or jittering. The belt
 * follows the robot, so it runs only while it walks. The lit fader is the
 * one in charge of the walk. The twelve weight sliders, the step control
 * and Reset sit in "Adjust more".
 *
 * The classification is an illustrative teaching model, not learned policy
 * rollouts, and is labelled as such in the surrounding prose.
 *
 * Interactive contract: deterministic initial render (default weights,
 * balanced trot, paused), native range inputs (keyboard-accessible),
 * visible readouts, reset control, fixed SVG viewport (no layout shift).
 * Playback runs on the model's cadence (lib/reward-shaping.ts) and degrades
 * to discrete jumps under prefers-reduced-motion; a changed weight glides
 * its fader and blends the walk, and reduced motion jumps both.
 */

const f = (v: number) => Number(v.toFixed(2));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const PHASE_STEP = 0.05;

/** Slider values are integers 0..40, one tenth of a weight unit each. */
function toSlider(weight: number): number {
  return Math.round(weight * 10);
}

function fromSlider(value: number): number {
  return value / 10;
}

type PresetId = 'balanced' | 'effort' | 'high-steps' | 'jerky';

/** Each named scoring rule changes one weight of the balanced score to an end of its slider. */
const PRESETS: { id: PresetId; label: string; change: Partial<Weights> }[] = [
  { id: 'balanced', label: 'Balanced score', change: {} },
  { id: 'effort', label: 'Too strict on effort', change: { torque: WEIGHT_MAX } },
  { id: 'high-steps', label: 'Loves high steps', change: { airTime: WEIGHT_MAX } },
  { id: 'jerky', label: 'Ignores jerky moves', change: { actionRate: WEIGHT_MIN } },
];

const presetWeights = (id: PresetId): Weights => ({
  ...defaultWeights(),
  ...PRESETS.find((p) => p.id === id)!.change,
});

function presetFor(weights: Weights): PresetId | null {
  const match = PRESETS.find((p) => {
    const target = presetWeights(p.id);
    return TERMS.every((term) => toSlider(target[term.id]) === toSlider(weights[term.id]));
  });
  return match?.id ?? null;
}

/** The walk in plain words, for the live readout. */
const WALK: Record<BehaviorId, string> = {
  balanced: 'Steady trot',
  frozen: 'Stands still',
  prancing: 'Bounces in place',
  chatter: 'Legs jitter',
};

function attractorTakeaway(
  behaviorId: BehaviorId,
  weights: Weights,
  total: string,
): string {
  const n = TERMS.length;
  if (behaviorId === 'frozen') {
    return `The ${n} weighted reward terms give an illustrative total of ${total} per step, and the preview is the freeze attractor: torque ${formatWeight(weights.torque)} now outweighs velocity tracking, so the chosen rule draws a stationary pose, not a trained optimum.`;
  }
  if (behaviorId === 'prancing') {
    return `The ${n} weighted reward terms give an illustrative total of ${total} per step, and the preview is the prance attractor: foot air time ${formatWeight(weights.airTime)} now outweighs velocity tracking, so the chosen rule draws bouncing in place, not a trained policy.`;
  }
  if (behaviorId === 'chatter') {
    return `The ${n} weighted reward terms give an illustrative total of ${total} per step, and the preview is the chatter attractor: action-rate is only ${formatWeight(weights.actionRate)}, so the chosen rule draws vibration, not a measured control frequency.`;
  }
  // The balanced regime's real exit condition is relative: a term leaves
  // balanced only when it BOTH clears ATTRACTOR_WEIGHT_MIN and reaches
  // ATTRACTOR_DOMINANCE_RATIO x velTrack. High velTrack keeps heavy
  // penalties balanced, so an absolute "below 2.5" claim would be false.
  return `The ${n} weighted reward terms give an illustrative total of ${total} per step, and the preview is a balanced trot: neither torque ${formatWeight(weights.torque)} nor air time ${formatWeight(weights.airTime)} clears the ${ATTRACTOR_WEIGHT_MIN} attractor bar and ${ATTRACTOR_DOMINANCE_RATIO}x the ${formatWeight(weights.velTrack)} velocity-tracking weight together, so the chosen rule draws a trot instead of freezing, prancing, or chattering.`;
}

/**
 * Where in its cycle each walk is drawn when the preview phase is 0, so the
 * first frame already shows the walk: the bounce at its top, the jitter at
 * its widest. Freeze has no cycle and the trot reads at any phase.
 */
const DRAWN_PHASE_OFFSET: Record<BehaviorId, number> = {
  balanced: 0,
  frozen: 0,
  prancing: 0.25,
  chatter: 1 / 32,
};

/** The robot as the model draws a walk at a preview phase. */
export const drawnPose = (behaviorId: BehaviorId, phase: number) => poseFor(behaviorId, phase + DRAWN_PHASE_OFFSET[behaviorId]);

type DrawnPose = ReturnType<typeof drawnPose>;

/** Seconds a changed weight takes to glide its fader, and the walk to change. */
const GLIDE_SECONDS = 0.16;
const BLEND_SECONDS = 0.4;

function mixPose(a: DrawnPose, b: DrawnPose, k: number): DrawnPose {
  const feet: FootPose[] = a.feet.map((foot, index) => {
    const other = b.feet[index]!;
    return { dx: foot.dx + (other.dx - foot.dx) * k, lift: foot.lift + (other.lift - foot.lift) * k, down: k < 0.5 ? foot.down : other.down };
  });
  return { feet, rise: a.rise + (b.rise - a.rise) * k, roll: 0, travel: a.travel + (b.travel - a.travel) * k };
}

const RUNS: Array<{ live: boolean; parts: Part[] }> = [];
for (const part of PARTS) {
  const last = RUNS[RUNS.length - 1];
  const live = part.kind === 'slot';
  if (last && !last.live && !live) last.parts.push(part);
  else RUNS.push({ live, parts: [part] });
}

function StaticPart({ part }: { part: Part }) {
  if (part.kind === 'fill') return <path className="iso-shade" data-shade={part.shade} d={part.d} />;
  if (part.kind === 'slot') return null;
  return <PartView part={part} />;
}

type Refs = {
  far: (SVGGElement | null)[];
  near: (SVGGElement | null)[];
  body: SVGGElement | null;
  slats: SVGPathElement | null;
  caps: (SVGGElement | null)[];
  phase: HTMLSpanElement | null;
};

function writeLeg(group: SVGGElement | null, solid: RobotSolid) {
  writeSolid(group, solid.paths);
  const edge = group?.querySelector('[data-live-part="edge"]');
  if (edge && edge.getAttribute('data-tone') !== solid.tone) edge.setAttribute('data-tone', solid.tone);
}

/** The preview phase in whole percent, written into the method's phase readout without a render. */
function writePhase(element: HTMLSpanElement | null, phase: number) {
  const text = `${Math.round(phase * 100)}%`;
  const node = element?.firstChild;
  if (node && node.nodeValue !== text) node.nodeValue = text;
}

function drawRobot(refs: Refs, pose: DrawnPose) {
  const { far, near } = legsAt(pose);
  far.forEach((solid, index) => writeLeg(refs.far[index] ?? null, solid));
  near.forEach((solid, index) => writeLeg(refs.near[index] ?? null, solid));
  refs.body?.setAttribute('transform', bodyShift(pose.rise));
  refs.slats?.setAttribute('d', beltSlats(pose.travel));
}

export function RewardShaping({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const [weights, setWeights] = useState<Weights>(() => defaultWeights());
  const [playing, setPlaying] = useState(false);
  // Reduced motion tracked reactively, not read once at play time. A
  // one-shot read can be stale when playback starts (the media setting
  // lands after hydration), and a cadence captured from it would keep
  // animating smoothly under prefers-reduced-motion for the rest of the
  // playback with nothing to correct it.
  const [reducedMotion, setReducedMotion] = useState(false);
  // Changes the drawing must jump to rather than glide: Reset and Step.
  const [jumps, setJumps] = useState(0);
  // The opening drawing, fixed for the life of the figure: the live code moves the parts from here.
  const [rest] = useState(() => {
    const pose = drawnPose('balanced', 0);
    return { pose, legs: legsAt(pose), body: bodyShift(pose.rise), slats: beltSlats(pose.travel) };
  });

  // Sync reduced-motion state to the live media query so the playback
  // cadence re-derives when the setting changes, including mid-playback.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const behaviorId: BehaviorId = classifyBehavior(weights);
  const behavior = BEHAVIORS[behaviorId];
  const total = weightedTotal(weights);
  const inCharge = TERM_IN_CHARGE[behaviorId];

  const refs = useRef<Refs>({ far: [], near: [], body: null, slats: null, caps: [], phase: null });
  // What the drawing shows now, which the loop moves toward the chosen state.
  const live = useRef({
    phase: 0,
    shown: { ...weights },
    from: rest.pose,
    blend: 1,
    behaviorId: 'balanced' as BehaviorId,
    playing: false,
    reduced: false,
    clock: 0,
    frame: 0,
    last: 0,
    jumps: 0,
  });

  const setWeight = (id: keyof Weights, sliderValue: number) => {
    setWeights((w) => ({ ...w, [id]: fromSlider(sliderValue) }));
  };

  const reset = () => {
    live.current.phase = 0;
    setPlaying(false);
    setWeights(defaultWeights());
    setJumps((n) => n + 1);
  };

  const step = () => {
    live.current.phase = f((live.current.phase + PHASE_STEP) % 1);
    setJumps((n) => n + 1);
  };

  // One loop moves everything: faders glide to their weights, the walk blends to the chosen one, and
  // while playing the stride runs on the model's cadence (coarse jumps under reduced motion).
  useLayoutEffect(() => {
    const s = live.current;
    const r = refs.current;
    const calm = asksForStillness();
    const jumped = jumps !== s.jumps;
    s.jumps = jumps;
    s.playing = playing;
    s.reduced = reducedMotion || prefersReducedMotion();
    const pose = () => drawnPose(s.behaviorId, s.phase);
    const shownPose = () => (s.blend >= 1 ? pose() : mixPose(s.from, pose(), smoothstep(s.blend)));
    if (s.behaviorId !== behaviorId) {
      s.from = shownPose();
      s.behaviorId = behaviorId;
      s.blend = 0;
    }
    if (calm || jumped) {
      s.shown = { ...weights };
      s.blend = 1;
    }
    // React has written each cap at its chosen weight; put every cap back where it is shown until it glides there.
    CAPS.forEach((cap, index) => r.caps[index]?.setAttribute('transform', capShift(s.shown[cap.term])));
    drawRobot(r, shownPose());
    writePhase(r.phase, s.phase);

    const tick = (now: number) => {
      const dt = s.last ? Math.min(now - s.last, 64) / 1000 : 1 / 60;
      s.last = now;
      let moving = false;
      if (s.playing) {
        const { tickMs, phasePerTick } = playbackCadence(s.reduced);
        if (s.reduced) {
          s.clock += dt * 1000;
          while (s.clock >= tickMs) {
            s.clock -= tickMs;
            s.phase = s.phase + phasePerTick >= 1 ? 0 : f(s.phase + phasePerTick);
          }
        } else {
          s.phase = (s.phase + (dt * 1000 * phasePerTick) / tickMs) % 1;
        }
        moving = true;
      }
      for (const [index, cap] of CAPS.entries()) {
        const goal = weights[cap.term];
        const was = s.shown[cap.term];
        if (was === goal) continue;
        const next = Math.abs(goal - was) < 0.004 ? goal : was + (goal - was) * (1 - Math.exp(-dt / GLIDE_SECONDS));
        s.shown[cap.term] = next;
        r.caps[index]?.setAttribute('transform', capShift(next));
        moving = moving || next !== goal;
      }
      if (s.blend < 1) {
        s.blend = Math.min(1, s.blend + dt / BLEND_SECONDS);
        moving = true;
      }
      drawRobot(r, shownPose());
      writePhase(r.phase, s.phase);
      s.frame = moving ? requestAnimationFrame(tick) : 0;
    };
    const needed = s.playing || s.blend < 1 || CAPS.some((cap) => s.shown[cap.term] !== weights[cap.term]);
    // Reduced motion glides nothing, but Play still steps the preview in the model's coarse jumps.
    if (needed && (!calm || s.playing)) {
      s.last = 0;
      s.clock = 0;
      s.frame = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(s.frame);
      s.frame = 0;
    };
  }, [weights, playing, reducedMotion, jumps, behaviorId]);

  const r = refs.current;
  const robotSolid = (solid: RobotSolid, index: number, side: 'far' | 'near') => (
    <LiveSolid key={`${side}-${index}`} ref={(el) => void (r[side][index] = el)} paths={solid.paths} tone={solid.tone} />
  );
  const liveView = (slot: Extract<Part, { kind: 'slot' }>['slot']) => {
    if (slot === 'belt') {
      return (
        <g key={slot} data-part="belt">
          <Line d={BELT_BAND} tone="faint" />
          <path ref={(el) => void (r.slats = el)} className="iso-line" data-tone="faint" d={rest.slats} />
        </g>
      );
    }
    if (slot === 'legs-far') return <g key={slot} data-part="legs-far">{rest.legs.far.map((solid, index) => robotSolid(solid, index, 'far'))}</g>;
    if (slot === 'legs-near') return <g key={slot} data-part="legs-near">{rest.legs.near.map((solid, index) => robotSolid(solid, index, 'near'))}</g>;
    if (slot === 'body') {
      return (
        <g key={slot} ref={(el) => void (r.body = el)} data-part="robot-body" transform={rest.body}>
          {BODY_SOLIDS.map((solid, index) => (
            <Solid key={index} paths={solid.paths} tone={solid.tone} inner={solid.inner ? <g dangerouslySetInnerHTML={{ __html: solid.inner }} /> : undefined} />
          ))}
          <Line d={HATCH.outline} tone="faint" />
          <Dots points={HATCH.screws} size={0.4} />
        </g>
      );
    }
    return (
      <g key={slot} data-part="faders">
        {CAPS.map((cap, index) => {
          const lit = cap.term === inCharge;
          return (
            <g
              key={cap.term}
              ref={(el) => void (r.caps[index] = el)}
              data-fader={cap.term}
              data-weight={formatWeight(weights[cap.term])}
              data-lit-fader={lit ? 'true' : 'false'}
              transform={capShift(weights[cap.term])}
            >
              <Solid paths={cap.paths} tone="hi" lit={lit} />
              <Line d={cap.grip} tone={lit ? 'lit' : 'mid'} />
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <InstrumentFigure
      figureId="reward-shaping"
      className={className}
      kicker="Reward design"
      heading="How you score a robot shapes how it walks"
      controls={
        <>
          <PresetGroup<PresetId>
            label="Scoring rule"
            presets={PRESETS}
            value={presetFor(weights)}
            onChange={(id) => setWeights(presetWeights(id))}
            testId="rs-preset"
          />
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause rollout preview' : 'Play rollout preview'}
            className={`${INSTRUMENT_SECONDARY_CONTROL_CLASS} self-end`}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
        </>
      }
      adjust={
        <>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={step}
            aria-label="Step the preview forward"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Step
          </button>
          <InstrumentReset onClick={reset} />
          <div className="grid basis-full grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-3">
            {TERMS.map((term) => (
              <ControlField key={term.id}>
                <ControlLabel
                  htmlFor={`rs-${term.id}`}
                  value={formatWeight(weights[term.id])}
                >
                  {term.label}
                </ControlLabel>
                <input
                  id={`rs-${term.id}`}
                  type="range"
                  data-brand-control-id="control:input"
                  min={toSlider(WEIGHT_MIN)}
                  max={toSlider(WEIGHT_MAX)}
                  step={1}
                  value={toSlider(weights[term.id])}
                  onChange={(e) => setWeight(term.id, Number(e.target.value))}
                  aria-label={`${term.label} weight`}
                  className={INSTRUMENT_SLIDER_CLASS}
                />
              </ControlField>
            ))}
          </div>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Lit fader: the scoring rule in charge of the walk"
          readout={<span data-testid="walk-readout">{WALK[behaviorId]}</span>}
          status="Illustrative teaching model. No policy is trained here."
          data-walk={behaviorId}
        >
          <div className="iso-stage">
            <svg
              className="iso-svg"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              focusable="false"
              data-testid="quad-preview"
              aria-label={`Rollout preview: ${behavior.status}. ${behavior.description}`}
              aria-describedby={descriptionId}
            >
              {RUNS.map((run, index) =>
                run.live ? (
                  liveView((run.parts[0] as Extract<Part, { kind: 'slot' }>).slot)
                ) : (
                  <g key={index}>
                    {run.parts.map((part, k) => (
                      <StaticPart key={k} part={part} />
                    ))}
                  </g>
                ),
              )}
            </svg>
          </div>
        </AnatomyStage>
      }
      caption="Robots learning by trial and error do whatever earns points; the scoring rules, not hand-written steps, decide what kind of walk emerges."
      method={
        <>
          <p>
            This is a local teaching model, not a trained robot. Its score adds up twelve illustrative reward terms:
            each term has a fixed size and a weight, rewards count up and penalties count down, and the sum is the
            weighted total per step. The terms, weights and sizes are teaching choices, not a source configuration or
            the paper reward.
          </p>
          <InstrumentReadout className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Selected category: <span data-testid="behavior-status">{behavior.status}</span>
            </span>
            <span>
              Weighted total:{' '}
              <span data-testid="total-readout" style={{ color: roleColour('value') }}>
                {formatTotal(total)} / step
              </span>
            </span>
          </InstrumentReadout>
          {/* Outside the live readout: during playback the phase moves
              every tick, too often for a polite region to announce. */}
          <span className="block tabular-nums">
            Preview phase: <span ref={(el) => void (r.phase = el)}>{'0%'}</span>
          </span>
          <p>
            Three rules pick a failure category, checked in this order. Chatter (the legs jitter) when the
            action-rate penalty is near zero. Freeze (the robot stands still) when the torque penalty reaches{' '}
            {ATTRACTOR_WEIGHT_MIN} and also {ATTRACTOR_DOMINANCE_RATIO} times the velocity-tracking weight. Prance (it
            bounces in place) when foot air time passes the same two bars. Otherwise the robot trots. These are
            chosen classification rules and drawn poses, not trained policies, measured control frequencies or
            actuator-damage predictions. The preview phase is how far the drawing is through one stride; Play loops
            it and Step moves it on by {Math.round(PHASE_STEP * 100)} percent. At phase 0 the bounce is drawn at its top
            and the jitter at its widest, so a changed walk shows before Play.
          </p>
          <p>
            The drawing is a mixing desk wired to a treadmill bay. Each of its twelve faders is one weight, in the
            order of the sliders, from 0 at the front of its slot to {formatWeight(WEIGHT_MAX)} at the back; a dot
            beside each slot marks the balanced score. The lit fader is the one in charge of the walk: velocity
            tracking while the trot holds, otherwise the weight that tipped it. The robot&rsquo;s feet and body follow
            the same drawn poses, and the belt runs only while it walks.
          </p>
          <p>
            The four scoring rules each change one weight of the balanced score: &ldquo;Too strict on effort&rdquo;
            sets the torque penalty to {formatWeight(WEIGHT_MAX)}, &ldquo;Loves high steps&rdquo; sets foot air time
            to {formatWeight(WEIGHT_MAX)}, and &ldquo;Ignores jerky moves&rdquo; sets the action-rate penalty to{' '}
            {formatWeight(WEIGHT_MIN)}.
          </p>
          <ul className="m-0! grid list-none gap-0.5 p-0!">
            {TERMS.map((term) => (
              <li key={term.id}>
                {term.label}: default weight {formatWeight(term.defaultWeight)}. {term.blurb}
              </li>
            ))}
          </ul>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current reward-weight attractor"
            description={attractorTakeaway(behaviorId, weights, formatTotal(total))}
            states={[
              { label: 'attractor', value: behavior.name },
              { label: 'total', value: `${formatTotal(total)} / step` },
              { label: 'torque', value: formatWeight(weights.torque) },
              { label: 'air time', value: formatWeight(weights.airTime) },
              { label: 'action-rate', value: formatWeight(weights.actionRate) },
            ]}
          />
        </>
      }
    />
  );
}

function smoothstep(k: number) {
  const t = Math.max(0, Math.min(1, k));
  return t * t * (3 - 2 * t);
}
