'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { INSTRUMENT_SECONDARY_CONTROL_CLASS, InstrumentFigure, PresetGroup, type Preset } from '@/components/ui/instrument';
import { ChartDescription } from '@/components/ui/chart-description';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness, useInView } from '@/components/iso/react/live';
import {
  DRIVES,
  HEIGHT,
  HIGH_DEG,
  LOW_DEG,
  PARTS,
  PHONE_FIT,
  REST_DEG,
  WIDTH,
  cassetteSvg,
  driveOf,
  jointOf,
  leverSvg,
  needleSvg,
  pushAngle,
  tachAngle,
  type Drive,
  type DriveId,
  type Part,
} from '@/components/iso/figures/gear-ratio-bench';

/**
 * GearRatioBench: what a joint's gear ratio trades, drawn as an actuator
 * test bench (components/iso/figures/gear-ratio-bench.ts).
 *
 * One teaching motor drives a lever (the lit part) through a gear cassette
 * with its cover off. The lever lifts a hanger of 5 kg weights; the
 * tachometer reads how fast the joint turns, and the push-back gauge how
 * many times heavier the motor feels to anything that pushes the joint from
 * outside, on a log scale. The three presets are real designs' ratios: the
 * MIT Cheetah's single planetary stage (5.8 to 1), AGILOped's two-stage
 * planetary humanoid joint (36 to 1) and a 100 to 1 strain-wave gear.
 *
 * The model is exact for the teaching motor: torque at the joint = motor
 * torque × ratio × efficiency, speed = motor speed ÷ ratio, felt inertia =
 * rotor inertia × ratio². Choosing a preset swaps the cassette and runs the
 * lift at that joint's top speed, slowed by the same factor for every
 * cassette. An idle tour lifts with each cassette in turn until the reader
 * acts; reduced motion keeps the still pose.
 */

export const DEFAULT_DRIVE: DriveId = 'leg';
const PRESETS: readonly Preset<DriveId>[] = DRIVES.map((drive) => ({ id: drive.id, label: drive.label }));

/** Page seconds per second of the joint's motion: every cassette is slowed by the same factor. */
export const SLOW = 40;
/** The idle tour waits this long before its first lift, and resumes this long after the pointer leaves. */
const TOUR_START_S = 1.4;
const TOUR_RESUME_S = 3.6;

const whole = (value: number) => Math.round(value).toLocaleString('en-US');
export function figuresOf(drive: Drive) {
  const joint = jointOf(drive);
  return { torque: whole(joint.torque), speed: whole(joint.speedRpm), heavier: whole(joint.heavier), holds: whole(joint.holdsKg) };
}
/** The readout: torque and top speed at the joint, and how heavy the motor feels from outside. */
export function readoutFor(drive: Drive): string {
  const f = figuresOf(drive);
  return `${f.torque} newton-meters at the joint · ${f.speed} turns a minute · motor feels ${f.heavier} times heavier`;
}

type Step = { to: number; hold: number };
/** One lift: down onto the pedestal, up to the top, then back to the resting angle. */
const LIFT: readonly Step[] = [
  { to: LOW_DEG, hold: 0.5 },
  { to: HIGH_DEG, hold: 1.1 },
  { to: REST_DEG, hold: 0.9 },
];
/** The lever's slowed swing rate for a drive, degrees a second on the page. */
export const swingRate = (drive: Drive) => (jointOf(drive).speedRpm * 6) / SLOW;

const radians = (deg: number) => (deg * Math.PI) / 180;
const DEFAULT = driveOf(DEFAULT_DRIVE);
/** The rest pose the server and the first render draw. */
const REST = {
  cassette: cassetteSvg(DEFAULT, DEFAULT.ratio * radians(REST_DEG), radians(REST_DEG)),
  lever: leverSvg(REST_DEG, jointOf(DEFAULT).weights),
  tach: needleSvg('tach', tachAngle(0)),
  push: needleSvg('push', pushAngle(jointOf(DEFAULT).heavier)),
};

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.fill === 'top') return <path className="iso-top" d={part.d} />;
  return <path className="iso-shade" data-shade={part.fill} d={part.d} />;
}

function describe(drive: Drive): string {
  const f = figuresOf(drive);
  return `With the ${drive.label.toLowerCase()} cassette (${drive.example}), the teaching motor gives ${f.torque} newton-meters at the joint, enough to hold about ${f.holds} kg on a 25 cm lever, a top speed of ${f.speed} turns a minute, and a motor that feels ${f.heavier} times heavier to anything pushing the joint from outside.`;
}

export function GearRatioBench({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const [driveId, setDriveId] = useState<DriveId>(DEFAULT_DRIVE);
  const drive = driveOf(driveId);
  const joint = jointOf(drive);

  const host = useRef<HTMLDivElement>(null);
  const inView = useInView(host);
  const refs = useRef<{ cassette: SVGGElement | null; lever: SVGGElement | null; tach: SVGGElement | null; push: SVGGElement | null }>({
    cassette: null,
    lever: null,
    tach: null,
    push: null,
  });
  const live = useRef({
    drive: DEFAULT,
    deg: REST_DEG,
    output: radians(REST_DEG),
    tach: 0,
    push: Math.log10(jointOf(DEFAULT).heavier),
    program: [] as Step[],
    holding: -1,
    touring: true,
    paused: false,
    quiet: 0,
    wait: TOUR_START_S,
    lifted: false,
  });
  const frame = useRef(0);

  const draw = useCallback(() => {
    const s = live.current;
    const r = refs.current;
    const weights = jointOf(s.drive).weights;
    if (r.cassette) r.cassette.innerHTML = cassetteSvg(s.drive, s.drive.ratio * s.output, s.output);
    if (r.lever) r.lever.innerHTML = leverSvg(s.deg, weights);
    if (r.tach) r.tach.innerHTML = needleSvg('tach', tachAngle(s.tach));
    if (r.push) r.push.innerHTML = needleSvg('push', pushAngle(10 ** s.push));
  }, []);

  const kick = useCallback(() => {
    if (frame.current || !inView) return;
    let last = 0;
    const step = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const s = live.current;
      const calm = asksForStillness();
      const target = jointOf(s.drive);
      let moving = false;
      if (calm) {
        s.program = [];
        s.deg = REST_DEG;
        s.output = radians(REST_DEG);
      }
      const current = s.program[0];
      if (current) {
        if (s.holding < 0) {
          const delta = current.to - s.deg;
          const move = swingRate(s.drive) * dt;
          const stepDeg = Math.sign(delta) * Math.min(Math.abs(delta), move);
          s.deg += stepDeg;
          s.output += radians(stepDeg);
          moving = Math.abs(delta) > 1e-6;
          if (Math.abs(current.to - s.deg) < 1e-6) s.holding = current.hold;
        } else {
          s.holding -= dt;
          if (s.holding < 0) {
            s.program.shift();
            s.holding = -1;
          }
        }
      }
      const ease = (value: number, to: number, seconds: number) => {
        if (calm) return to;
        const next = value + (to - value) * (1 - Math.exp(-dt / seconds));
        return Math.abs(to - next) < 1e-3 ? to : next;
      };
      s.tach = ease(s.tach, moving ? target.speedRpm : 0, 0.12);
      s.push = ease(s.push, Math.log10(target.heavier), 0.35);
      // The idle tour: lift with this cassette, then move on to the next one.
      if (s.touring && !s.paused && !calm && s.program.length === 0) {
        s.wait -= dt;
        if (s.wait <= 0) {
          if (s.lifted) {
            const index = DRIVES.findIndex((d) => d.id === s.drive.id);
            const next = DRIVES[(index + 1) % DRIVES.length]!;
            s.drive = next;
            setDriveId(next.id);
          }
          s.program = LIFT.map((p) => ({ ...p }));
          s.lifted = true;
          s.wait = 0.8;
        }
      }
      if (s.paused && s.touring) {
        s.quiet += dt;
        if (s.quiet >= TOUR_RESUME_S) s.paused = false;
      }
      draw();
      const settled = s.program.length === 0 && s.tach === 0 && s.push === Math.log10(target.heavier);
      const more = !settled || (s.touring && !calm);
      frame.current = more ? requestAnimationFrame(step) : 0;
    };
    frame.current = requestAnimationFrame(step);
  }, [draw, inView]);

  useEffect(() => {
    if (inView) kick();
    else {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
  }, [inView, kick]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /** The reader took over: the tour stops for good. */
  const takeOver = () => {
    live.current.touring = false;
  };
  const choose = (next: DriveId) => {
    takeOver();
    setDriveId(next);
    const s = live.current;
    s.drive = driveOf(next);
    s.program = asksForStillness() ? [] : LIFT.map((p) => ({ ...p }));
    s.holding = -1;
    draw();
    kick();
  };
  const run = () => {
    takeOver();
    const s = live.current;
    s.program = asksForStillness() ? [] : LIFT.map((p) => ({ ...p }));
    s.holding = -1;
    kick();
  };

  const f = figuresOf(drive);
  return (
    <InstrumentFigure
      figureId="gear-ratio-bench"
      className={className}
      kicker="Gear ratio"
      heading="Gearing down trades speed and give for torque"
      onPointerEnter={() => {
        live.current.paused = true;
        live.current.quiet = 0;
      }}
      onPointerLeave={() => {
        live.current.quiet = 0;
        kick();
      }}
      onKeyDown={takeOver}
      controls={
        <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
          <PresetGroup label="The gear cassette" presets={PRESETS} value={driveId} onChange={choose} testId="gear-drive" />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            data-testid="gear-run"
            onClick={run}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Run the lift
          </button>
        </div>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Blue lever is the joint · weights 5 kg · dials: speed and push-back"
          readout={readoutFor(drive)}
          status="Teaching model, real gear ratios"
          data-testid="gear-stage"
          data-drive={driveId}
        >
          <div ref={host}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              fit={PHONE_FIT}
              label={`An actuator test bench: a motor drives a lever through a gear cassette with its cover off. With the ${drive.label.toLowerCase()} cassette the lever holds ${joint.weights} weights of 5 kg, the joint turns at most ${f.speed} times a minute, and the motor feels ${f.heavier} times heavier to a push from outside.`}
              describedBy={descriptionId}
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                return (
                  <g
                    key={part.slot}
                    data-testid={`gear-${part.slot}`}
                    data-drive={part.slot === 'cassette' ? driveId : undefined}
                    ref={(el) => void (refs.current[part.slot] = el)}
                    dangerouslySetInnerHTML={{ __html: REST[part.slot] }}
                  />
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="Gearing a motor down multiplies its force but divides its speed, and makes the joint far harder to push back."
      method={
        <>
          <p>
            A ratio of N multiplies torque by N, divides speed by N and multiplies the rotor&apos;s inertia, as felt at
            the joint, by N squared. One teaching motor with the MIT Cheetah&apos;s rotor drives three real ratios: 5.8,
            36 and 100 to 1.
          </p>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="What each cassette gives the joint"
            description={describe(drive)}
            rowHeader="gear cassette"
            columns={[
              { header: 'torque at the joint (newton-meters)', numeric: true },
              { header: 'top speed (turns a minute)', numeric: true },
              { header: 'motor feels this many times heavier', numeric: true },
            ]}
            rows={DRIVES.map((d) => {
              const v = figuresOf(d);
              return { label: d.label, values: [v.torque, v.speed, v.heavier] };
            })}
          />
        </>
      }
      source={
        <span data-testid="gear-source">
          <a data-brand-control-id="control:link-focus" href="https://doi.org/10.1109/TRO.2016.2640183" target="_blank" rel="noopener" className="underline-offset-2">
            Wensing et al. (2017)
          </a>
          ;{' '}
          <a data-brand-control-id="control:link-focus" href="https://arxiv.org/abs/2509.09364" target="_blank" rel="noopener" className="underline-offset-2">
            Ficht, Denninger and Behnke (2025)
          </a>
          ;{' '}
          <a data-brand-control-id="control:link-focus" href="https://www.harmonicdrive.net/_hd/content/documents1/CSG-CSF_Component.pdf" target="_blank" rel="noopener" className="underline-offset-2">
            Harmonic Drive CSG/CSF catalog
          </a>
          .
        </span>
      }
    />
  );
}
