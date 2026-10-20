'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { roleColour } from '@/components/motion/chart';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, Line, Solid, Wire } from '@/components/iso/react/draw';
import { Stage, asksForStillness } from '@/components/iso/react/live';
import {
  CYCLE_SECONDS,
  FLOOR_UNITS,
  HEIGHT,
  HOLE_UNITS,
  PARTS,
  WIDTH,
  clipFor,
  cycleAt,
  movingAt,
  restPose,
  type BenchPart,
  type BenchPose,
} from '@/components/iso/figures/contact-error-bench';
import {
  DEFAULT_ERROR_MM,
  MAX_ERROR_MM,
  MIN_ERROR_MM,
  SCENARIOS,
  contactCount,
  formatMm,
  outcomeFor,
} from '@/lib/contact-geometry';

/**
 * ContactGeometry: one floor error, two tasks, on one test bench
 * (components/iso/figures/contact-error-bench.ts). One knob at the bench's
 * front sets the error; its line shaft drives a gearbox at each fixture, so
 * the same turn lowers the floor at the left and moves the hole at the right.
 *
 * At the left a four-legged robot stands with its hind feet on a deck, the
 * floor as the simulator modelled it, and steps its front feet down to a
 * lift plate, the real floor, which a screw jack lowers by the error. The
 * legs reach the plate, as a gait's feedback takes up the gap on its next
 * step, until the drop passes the 20 mm they can absorb; past that the front
 * feet find nothing and the robot pitches forward onto the plate.
 *
 * At the right a gripper lowers a peg, the one lit part, where the simulator
 * says the hole is, and a cross-slide moves the real hole by the same error.
 * The hole leaves 0.5 mm of clearance, so the same couple of millimetres
 * brings the peg down on the rim.
 *
 * Gaps are drawn larger than real so a 2 mm error shows at all: the floor at
 * its own scale, the hole at a steeper one that stops at four clearances,
 * past which the exact shift carries no information. A ruler at each station
 * reads its gap, its tolerance marked by the longest tick. Each change of
 * error runs one test: the peg lifts clear, the jack and the slide move, the
 * peg comes down and the robot settles. Reduced motion jumps to the result.
 */

type PresetId = 'thin' | 'coin' | 'thumb';

const PRESETS: { id: PresetId; label: string; errorMm: number }[] = [
  { id: 'thin', label: 'Thinner than a card (0.5 mm)', errorMm: 0.5 },
  { id: 'coin', label: 'A coin’s thickness (2 mm)', errorMm: 2 },
  { id: 'thumb', label: 'A thumb’s width (25 mm)', errorMm: 25 },
];

const presetFor = (errorMm: number): PresetId | null =>
  PRESETS.find((p) => Math.abs(p.errorMm - errorMm) < 1e-9)?.id ?? null;

/** "2 mm", "0.5 mm", "2.3 mm" for the stage; the fold keeps one decimal. */
const plainMm = (mm: number) => formatMm(Number(mm.toFixed(1)));

/** Where each of the lib's contacts goes wrong when its task fails: all four feet, and the rim and leading corner a peg binds on. */
const JAM_CONTACTS = new Set(['rim-r', 'chamfer-r']);

function annotationLines(errorMm: number, dogOk: boolean, pegOk: boolean): string[] {
  const mm = plainMm(errorMm);
  if (dogOk && pegOk) return [`At ${mm} both cope: the dog keeps`, 'walking and the peg still slides in'];
  if (dogOk) return [`Same ${mm} error: the dog keeps walking,`, 'the peg misses the hole'];
  return [`At ${mm} even the dog loses its footing;`, 'the peg missed long before'];
}

/** The stage's live words: the error the rulers read now, and what each fixture did with it. */
export function benchReadout(errorMm: number, settled: boolean): string {
  const mm = `One ${errorMm.toFixed(1)} mm error`;
  if (!settled) return `${mm} · testing`;
  const legs = outcomeFor(SCENARIOS.locomotion, errorMm) === 'ok' ? 'legs reach' : 'legs fall short';
  const peg = outcomeFor(SCENARIOS.manipulation, errorMm) === 'ok' ? 'peg goes in' : 'peg jams';
  return `${mm} · ${legs} · ${peg}`;
}

/** The robot's four feet, in the lib's contact order: hind near, hind far, front near, front far. */
const FOOT_CONTACTS: Record<string, string> = {
  'foot-hind-near': 'foot-0',
  'foot-hind-far': 'foot-1',
  'foot-front-near': 'foot-2',
  'foot-front-far': 'foot-3',
};

function PartView({ part, lost }: { part: BenchPart; lost?: (name: string) => boolean | null }): ReactNode {
  if (part.kind === 'solid') {
    const solid = (
      <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined} />
    );
    const contact = part.name ? FOOT_CONTACTS[part.name] : undefined;
    if (!contact || !lost) return solid;
    return (
      <g data-testid={`contact-marker-${contact}`} data-contact={lost(contact) ? 'lost' : 'held'}>
        {solid}
      </g>
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.fill === 'paper') return <path className="iso-fill" d={part.d} />;
  if (part.fill === 'top') return <path className="iso-top" d={part.d} />;
  // The dark inside of a bore: deeper than any side shade.
  if (part.fill === 'void') return <path className="iso-shade" data-shade="0" style={{ fill: 'color-mix(in srgb, var(--anatomy-lo) 55%, var(--anatomy-paper))' }} d={part.d} />;
  return <path className="iso-shade" data-shade={part.fill} d={part.d} />;
}

const tenth = (value: number) => Math.round(value * 10) / 10;

export function ContactGeometry({
  defaultErrorMm = DEFAULT_ERROR_MM,
  className,
}: {
  defaultErrorMm?: number;
  className?: string;
}) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const clipId = `${uid.replace(/[^a-zA-Z0-9_-]/g, '')}-cg-hole`;
  const [errorMm, setErrorMm] = useState(defaultErrorMm);

  const loco = SCENARIOS.locomotion;
  const manip = SCENARIOS.manipulation;
  const locoOk = outcomeFor(loco, errorMm) === 'ok';
  const manipOk = outcomeFor(manip, errorMm) === 'ok';
  const locoOutcome = locoOk ? loco.outcomeOk : loco.outcomeFail;
  const manipOutcome = manipOk ? manip.outcomeOk : manip.outcomeFail;
  const nLoco = contactCount(loco);
  const nManip = contactCount(manip);
  const error = `${errorMm.toFixed(1)} mm`;

  const locoClause = locoOk
    ? `Locomotion at ${error} of contact-model error stays stable: all ${nLoco} paws stay loaded as the front pair steps down to the real floor, inside the ${formatMm(loco.toleranceMm)} a gait absorbs, with ${(loco.toleranceMm - errorMm).toFixed(1)} mm of margin left.`
    : `Locomotion at ${error} of contact-model error loses support: the gap to the real floor exceeds the ${formatMm(loco.toleranceMm)} a gait absorbs, so its ${nLoco} near-point contacts have left the recoverable region.`;
  const manipClause = manipOk
    ? `The peg at the same error still seats inside the ${formatMm(manip.toleranceMm)} clearance of the real hole, with all ${nManip} distributed contacts holding.`
    : `The peg at the same error jams on the edge of the real hole, past its ${formatMm(manip.toleranceMm)} clearance, so its ${nManip} distributed contacts cannot absorb millimetres the way a gait can.`;
  const takeaway = `${locoClause} ${manipClause}`;

  // The bench as drawn: a test runs from wherever it stands to the chosen error's rest pose.
  // Built from the opening error (the state above), so the server and the first client render agree.
  const [pose, setPose] = useState<BenchPose>(() => restPose(errorMm));
  const [settled, setSettled] = useState(true);
  const live = useRef({ pose, from: pose, target: errorMm, start: 0 });
  const frame = useRef(0);
  const shown = useRef(errorMm);

  const step = useCallback(function tick(now: number) {
    const s = live.current;
    const t = (now - s.start) / 1000;
    s.pose = cycleAt(s.from, s.target, Math.min(t, CYCLE_SECONDS));
    setPose(s.pose);
    if (t >= CYCLE_SECONDS) {
      frame.current = 0;
      setSettled(true);
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (shown.current === errorMm) return;
    shown.current = errorMm;
    const s = live.current;
    s.target = errorMm;
    if (asksForStillness()) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      s.pose = restPose(errorMm);
      s.from = s.pose;
      setPose(s.pose);
      setSettled(true);
      return;
    }
    s.from = s.pose;
    s.start = performance.now();
    setSettled(false);
    if (!frame.current) frame.current = requestAnimationFrame(step);
  }, [errorMm, step]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function reset() {
    setErrorMm(defaultErrorMm);
  }

  const moving = movingAt(pose);
  const clip = clipFor(pose);
  const lostFoot = () => !locoOk;
  const pegContacts = manip.contacts.map((c) => c.id);
  const pegLost = manipOk ? [] : pegContacts.filter((id) => JAM_CONTACTS.has(id));
  const slotView = (slot: keyof typeof moving) => moving[slot].map((part, index) => <PartView key={index} part={part} lost={slot === 'robot' ? lostFoot : undefined} />);
  const shownMm = pose.drop / FLOOR_UNITS;

  return (
    <InstrumentFigure
      figureId="contact-geometry"
      className={className}
      kicker="Contact in simulation"
      heading="Legs forgive tiny surface errors; precise hand work does not"
      controls={
        <PresetGroup<PresetId>
          label="How wrong the simulator’s surface is"
          presets={PRESETS}
          value={presetFor(errorMm)}
          onChange={(id) => setErrorMm(PRESETS.find((p) => p.id === id)!.errorMm)}
          testId="cg-error"
        />
      }
      adjust={
        <>
          <ControlField className="w-full basis-full content-start sm:max-w-sm">
            <ControlLabel htmlFor="cg-error" value={error}>
              Contact-model error
            </ControlLabel>
            <input
              id="cg-error"
              type="range"
              data-brand-control-id="control:input"
              min={MIN_ERROR_MM}
              max={MAX_ERROR_MM}
              step={0.1}
              value={errorMm}
              onChange={(e) => setErrorMm(Number(e.target.value))}
              aria-label={`Contact-model error epsilon, currently ${errorMm.toFixed(1)} millimeters`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="exact" high={`${MAX_ERROR_MM} mm off`} />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={
            <span data-figure-annotation="">
              {annotationLines(errorMm, locoOk, manipOk).join(' ')}
            </span>
          }
          readout={benchReadout(settled ? errorMm : shownMm, settled)}
          status="Illustrative, not measured; gaps drawn larger than real"
          data-testid="cg-stage"
        >
          <Stage className="iso-stage">
            <svg
              className="iso-svg"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              focusable="false"
              aria-label={`Contact-model error of ${errorMm.toFixed(1)} millimetres, side by side. Left, a four-legged robot stands on the simulated floor: ${locoOutcome}. Right, a gripper lowers a peg toward the real hole: ${manipOutcome}.`}
              aria-describedby={descriptionId}
              data-testid="cg-bench"
              data-drop={tenth(pose.drop)}
              data-shift={tenth(pose.shift)}
              data-tip={tenth(pose.tip)}
              data-fall={tenth(pose.fall)}
            >
              {clip ? (
                <defs>
                  <clipPath id={clipId}>
                    <path d={clip.d} />
                  </clipPath>
                </defs>
              ) : null}
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                if (part.slot === 'robot') {
                  return (
                    <g key={part.slot} data-testid="dog-scene" data-outcome={locoOk ? 'ok' : 'fail'}>
                      <g data-testid="robot-dog">{slotView('robot')}</g>
                    </g>
                  );
                }
                if (part.slot === 'carriage') {
                  return (
                    <g key={part.slot} data-testid="gripper">
                      {slotView('carriage')}
                    </g>
                  );
                }
                if (part.slot === 'peg') {
                  return (
                    <g
                      key={part.slot}
                      data-testid="peg-scene"
                      data-outcome={manipOk ? 'ok' : 'fail'}
                      data-contacts-held={pegContacts.filter((id) => !pegLost.includes(id)).join(' ')}
                      data-contacts-lost={pegLost.join(' ')}
                      clipPath={clip && clip.slot === 'peg' ? `url(#${clipId})` : undefined}
                    >
                      {slotView('peg')}
                    </g>
                  );
                }
                return <g key={part.slot}>{slotView(part.slot)}</g>;
              })}
            </svg>
          </Stage>
        </AnatomyStage>
      }
      caption="Simulators never get surfaces exactly right; legs adjust step by step, but a tight-fitting part leaves almost no room for error."
      method={
        <>
          <p>
            Both fixtures take the same contact-model error, epsilon: how far the simulator&rsquo;s idea of a
            surface is from the real one. The drawing is a test bench. One knob at its front sets the error: its
            shaft runs along the bench to a gearbox at each fixture, so the same turn lowers the floor and moves the
            hole. At the left a four-legged robot stands with
            its hind feet on a deck, where the simulator puts the floor, and steps its front feet down to a lift
            plate, the real floor, which a screw jack lowers by the error; the legs reach it until the drop passes
            the {formatMm(loco.toleranceMm)} a gait absorbs, and past that the robot pitches forward onto the
            plate. At the right a gripper lowers the lit peg where the simulator puts the hole, and a cross-slide
            moves the real hole by the same error. A ruler at each station reads its gap, the tolerance marked by
            the longest tick. Gaps are drawn larger than real so a couple of millimetres shows at all: the floor
            at {FLOOR_UNITS} drawing units a millimetre, the hole at {HOLE_UNITS}, whose shift stops growing at
            four clearances. The slider under &ldquo;Adjust more&rdquo; sets any error from {MIN_ERROR_MM} to{' '}
            {MAX_ERROR_MM} mm, and each change runs the test again.
          </p>
          <InstrumentReadout>
            Exact error: <span data-testid="error-readout">{error}</span>
          </InstrumentReadout>
          <ul className="m-0! grid list-none gap-0.5 p-0!">
            {[
              { spec: loco, ok: locoOk, outcome: locoOutcome },
              { spec: manip, ok: manipOk, outcome: manipOutcome },
            ].map(({ spec, ok, outcome }) => (
              <li key={spec.id}>
                {spec.label}:{' '}
                <span data-testid={`outcome-readout-${spec.id}`} style={{ color: roleColour(ok ? 'value' : 'constraint') }}>
                  {outcome}
                </span>
                ; <span data-testid={`contact-count-readout-${spec.id}`}>{contactCount(spec)}</span> contacts, patch{' '}
                <span data-testid={`patch-readout-${spec.id}`}>{spec.patchSummary}</span>, tolerance{' '}
                <span data-testid={`tolerance-readout-${spec.id}`}>±{formatMm(spec.toleranceMm)}</span>. {spec.sceneCaption}
              </li>
            ))}
          </ul>
          <p>
            The contact counts and patch radii are illustrative, not one simulator&rsquo;s solver output; the 20 mm
            walking tolerance and the 0.5 mm insertion clearance are representative physical scales.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current contact-model error"
            description={takeaway}
            states={[
              { label: 'error', value: error },
              { label: 'walking', value: locoOutcome },
              { label: 'walking tolerance', value: formatMm(loco.toleranceMm) },
              { label: 'peg insertion', value: manipOutcome },
              { label: 'insertion clearance', value: formatMm(manip.toleranceMm) },
            ]}
          />
        </>
      }
      source="Illustrative contact counts and patch radii, not one simulator's solver output; tolerances are representative physical scales."
    />
  );
}
