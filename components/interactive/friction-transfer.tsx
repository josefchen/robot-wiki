'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  SliderEnds,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness, follow, useInView, useLoop, useReadout } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import {
  CARRIAGE_FRONT,
  DIAL_FACE,
  HEIGHT,
  NEEDLE,
  ONE_FLOOR,
  PARTS,
  WALKERS,
  WIDTH,
  carriageParts,
  carriageShift,
  crankHandle,
  crankTurns,
  needleDegrees,
  practiceFloors,
  rackParts,
  standsAt,
  type Needle,
  type Part,
} from '@/components/iso/figures/floor-test-bed';
import {
  DEFAULT_DR_RANGE,
  DR_RANGE_MAX,
  DR_RANGE_MIN,
  MU_MAX,
  MU_MIN,
  MU_TRAIN,
  drPeak,
  drSuccess,
  formatMu,
  formatPct,
  pointSuccess,
} from '@/lib/sim2real';

/**
 * FrictionTransfer: why engineers vary the simulated floor on purpose,
 * drawn as a floor test bed (components/iso/figures/floor-test-bed.ts).
 *
 * A carriage carries the real floor plate (the one lit part) along a
 * friction scale between two racks of floor strips. The back rack holds
 * the one floor the back walker practiced on; the front rack holds the run
 * of floors the front walker practiced on. Each walker's chest dial reads
 * the share of tries that end without a fall on the real floor. On the
 * practice floor the one-floor walker wins; a little off it, its dial
 * drops while the many-floor walker's holds until the plate leaves the
 * front rack's strips.
 *
 * The numbers are the authored teaching model in lib/sim2real.ts, not
 * trained policies or robot data. Until the reader touches it, an idle
 * tour slides the plate through a few floors; it waits while the figure is
 * off screen, never runs under reduced motion, and stops for good at the
 * reader's first touch, so it never moves a floor the reader chose.
 */

/** The real floor the figure opens on: a little more slippery than the practice floor, as a real floor is never the simulated one. */
export const OPENING_REAL_MU = 0.65;

/** The real floor in words, against the one practice floor. */
export function floorWords(mu: number): string {
  const gap = mu - MU_TRAIN;
  if (Math.abs(gap) < 0.025) return 'same as the practice floor';
  if (gap < -0.25) return 'much more slippery';
  if (gap < 0) return 'a bit more slippery';
  return gap > 0.25 ? 'much grippier' : 'a bit grippier';
}

/** How widely the practice floors spread, in words. */
const spreadWords = (range: number) =>
  range <= 0.15 ? 'a narrow spread' : range <= 0.4 ? 'a middling spread' : 'a wide spread';

/** The practice floors as plain numbers: "0.45 to 1.15". */
const floorSpan = (range: number) =>
  `${formatMu(Math.max(MU_MIN, MU_TRAIN - range))} to ${formatMu(Math.min(MU_MAX, MU_TRAIN + range))}`;

const stripsWord = (count: number) => (count === 1 ? '1 strip' : `${count} strips`);

/** The live readout: both walkers' tries without a fall on this real floor. */
export function readoutFor(mu: number, range: number): string {
  return `Tries without a fall: one-floor robot ${formatPct(pointSuccess(mu))}, many-floor robot ${formatPct(drSuccess(mu, range))}`;
}

/** The note under the drawing: what the dials say right now. */
function noteFor(mu: number, range: number): string {
  const point = pointSuccess(mu);
  const dr = drSuccess(mu, range);
  if (Math.abs(mu - MU_TRAIN) < 0.025) return 'On its own practice floor the one-floor robot does best';
  if (point >= dr) return 'Close to its practice floor the one-floor robot still does best';
  if (dr < 0.2) return 'Past every practice strip, both robots mostly fall';
  if (Math.abs(mu - MU_TRAIN) <= range + 1e-9) return 'Off its one floor the one-floor robot falls; the many-floor robot keeps going';
  return 'Past the front rack the many-floor robot starts to fall too';
}

/** The idle tour: the practice floor, then floors either side, held a while each. */
export const TOUR = [0.8, 0.55, 0.35, 0.65, 1.05, 1.35, 0.65] as const;
const TOUR_START_MS = 1400;
const TOUR_HOLD_MS = 3200;

/** The one line under the drawing that says what to do and which robot is which. */
export const HINT = 'Slide the blue plate, the real floor · back robot practiced on one floor · front robot practiced on the run of strips';

/** Each robot's share of tries without a fall, and so whether it stands. */
const sharesAt = (mu: number, range: number): Record<Needle, number> => ({ back: pointSuccess(mu), front: drSuccess(mu, range) });
type Pose = 'standing' | 'toppled';
const poseOf = (share: number): Pose => (standsAt(share) ? 'standing' : 'toppled');

function PartView({ part }: { part: Part }): ReactNode {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  return null;
}

/** A walker's chest dial, drawn in its face plane; the needle group turns. */
function Dial({ matrix, needle, pose, degrees, needleRef }: { matrix: string; needle: Needle; pose: Pose; degrees: number; needleRef: (el: SVGGElement | null) => void }) {
  return (
    <g transform={matrix} data-testid={`dial-${needle}-${pose}`}>
      <path className="iso-fill" d={DIAL_FACE.rim} />
      <path className="iso-top" d={DIAL_FACE.rim} />
      <Line d={DIAL_FACE.rim} tone="lo" />
      <Line d={DIAL_FACE.arc} tone="faint" />
      <Line d={DIAL_FACE.minor} tone="lo" />
      <Line d={DIAL_FACE.major} tone="mid" />
      <g ref={needleRef} transform={`rotate(${degrees.toFixed(1)})`} data-needle={needle}>
        {/* The needle's tip stops on the bare face by design. */}
        <path className="iso-line" data-tone="hi" data-free="end" style={{ strokeWidth: 1.1 }} d={NEEDLE} />
      </g>
      <path className="iso-fill" d={DIAL_FACE.hub} />
      <Line d={DIAL_FACE.hub} tone="lo" />
    </g>
  );
}

export function FrictionTransfer({
  defaultRealMu = OPENING_REAL_MU,
  defaultRange = DEFAULT_DR_RANGE,
  className,
}: {
  defaultRealMu?: number;
  defaultRange?: number;
  className?: string;
}) {
  // useId-derived input ids keep each label bound to its own slider if the
  // figure is ever mounted twice on one page.
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const tobin = citationFor('tobin-2017');
  const peng = citationFor('peng-2018');
  const [realMu, setRealMu] = useState(defaultRealMu);
  const [range, setRange] = useState(defaultRange);

  const point = pointSuccess(realMu);
  const dr = drSuccess(realMu, range);
  const floors = useMemo(() => practiceFloors(range), [range]);
  const carriage = useMemo(() => carriageParts(realMu), [realMu]);
  const backRack = useMemo(() => rackParts('back', ONE_FLOOR), []);
  const frontRack = useMemo(() => rackParts('front', floors), [floors]);

  // ------------------------------------------------------------ the bed in motion
  const { anchor, say } = useReadout<SVGGElement>();
  const carriageRef = useRef<SVGGElement | null>(null);
  const frontRef = useRef<SVGGElement | null>(null);
  const needleRefs = useRef<Record<string, SVGGElement | null>>({});
  const poseRefs = useRef<Record<string, SVGGElement | null>>({});
  /** How far each walker is toppled, 0 standing to 1 lying, as drawn. */
  const fallen = useRef<Record<Needle, number>>({
    back: standsAt(sharesAt(defaultRealMu, defaultRange).back) ? 0 : 1,
    front: standsAt(sharesAt(defaultRealMu, defaultRange).front) ? 0 : 1,
  });
  const pinRef = useRef<SVGGElement | null>(null);
  const gripRef = useRef<SVGGElement | null>(null);
  /** What the server and the first render draw; the loop moves the parts from there on. */
  const [first] = useState(() => ({ mu: defaultRealMu, range: defaultRange }));
  const shown = useRef({ mu: defaultRealMu, range: defaultRange });
  const goal = useRef({ mu: realMu, range });
  const visible = useInView(anchor);

  const kick = useLoop((dt, calm) => {
    const s = shown.current;
    const g = goal.current;
    s.mu = follow(s.mu, g.mu, dt, 0.32, calm);
    s.range = follow(s.range, g.range, dt, 0.25, calm);
    if (Math.abs(s.mu - g.mu) < 0.002) s.mu = g.mu;
    if (Math.abs(s.range - g.range) < 0.002) s.range = g.range;
    const shift = carriageShift(s.mu);
    carriageRef.current?.setAttribute('transform', shift);
    frontRef.current?.setAttribute('transform', shift);
    const handle = crankHandle(crankTurns(s.mu));
    writeSolid(pinRef.current, handle.pin);
    writeSolid(gripRef.current, handle.grip);
    const shares = sharesAt(s.mu, s.range);
    let tipping = false;
    for (const who of ['back', 'front'] as const) {
      const turn = `rotate(${needleDegrees(shares[who]).toFixed(1)})`;
      needleRefs.current[`${who}-standing`]?.setAttribute('transform', turn);
      needleRefs.current[`${who}-toppled`]?.setAttribute('transform', turn);
      // A walker topples, or stands back up, in a short eased cross-fade; under reduced motion it switches.
      const goalFallen = standsAt(shares[who]) ? 0 : 1;
      const was = fallen.current[who];
      const now = calm ? goalFallen : Math.abs(goalFallen - was) < 0.02 ? goalFallen : was + (goalFallen - was) * (1 - Math.exp(-dt / 0.12));
      fallen.current[who] = now;
      if (now !== goalFallen) tipping = true;
      poseRefs.current[`${who}-standing`]?.setAttribute('opacity', (1 - now).toFixed(2));
      poseRefs.current[`${who}-toppled`]?.setAttribute('opacity', now.toFixed(2));
    }
    say(readoutFor(s.mu, s.range));
    return s.mu !== g.mu || s.range !== g.range || tipping;
  }, visible);

  useEffect(() => {
    goal.current = { mu: realMu, range };
    kick();
  }, [realMu, range, kick]);

  // ------------------------------------------------------------ the idle tour
  const tourOver = useRef(false);
  const tourStep = useRef(0);
  const touched = () => {
    tourOver.current = true;
  };
  useEffect(() => {
    if (!visible || asksForStillness()) return;
    let timer = 0;
    const next = (delay: number) => {
      timer = window.setTimeout(() => {
        const focusInside = anchor.current?.closest('[data-figure-frame]')?.contains(document.activeElement) ?? false;
        if (tourOver.current || focusInside) {
          tourOver.current = true;
          return;
        }
        setRealMu(TOUR[tourStep.current % TOUR.length]);
        tourStep.current += 1;
        next(TOUR_HOLD_MS);
      }, delay);
    };
    if (!tourOver.current) next(TOUR_START_MS);
    return () => window.clearTimeout(timer);
  }, [visible, anchor]);

  function reset() {
    touched();
    setRealMu(defaultRealMu);
    setRange(defaultRange);
  }

  const sampleRows = useMemo(() => {
    const mus = [...new Set([0.2, 0.5, 0.8, 1.1, 1.5, realMu])].sort((a, b) => a - b);
    return mus.map((mu) => ({
      label: formatMu(mu),
      values: [formatPct(pointSuccess(mu)), formatPct(drSuccess(mu, range)), Math.abs(mu - realMu) < 0.001 ? 'real floor' : 'off'],
    }));
  }, [realMu, range]);

  // Named width regime so two mounts on one route describe distinct regimes
  // even after digit normalisation.
  const widthMark = range >= 0.5 ? 'wide' : 'ordinary';
  const descriptionText =
    `Illustrative, not measured robot data. With the real floor plate at friction ${formatMu(realMu)}, the one-floor robot gets through ${formatPct(point)} of tries without a fall and the many-floor robot ${formatPct(dr)}. The many-floor robot's rack holds ${stripsWord(floors.length)}, friction ${floorSpan(range)}, a half-width of ${formatMu(range)} either side of the practice floor at ${formatMu(MU_TRAIN)}, marked ${widthMark}; on them it gets through ${formatPct(drPeak(range))}, from 0.93 minus 0.55 times the half-width. The one-floor robot's share is a bell with peak 0.97 and width 0.09 around ${formatMu(MU_TRAIN)}, and the many-floor robot's falls away with width 0.10 past its strips. Reset restores friction ${formatMu(defaultRealMu)} and half-width ${formatMu(defaultRange)}. Moving the plate samples the formulas; no training or adaptation runs.`;

  const shares = sharesAt(realMu, range);
  const firstShares = sharesAt(first.mu, first.range);
  const standing = (who: Needle) => (standsAt(shares[who]) ? 'stands' : 'lies toppled');
  const label = `A floor test bed. The real floor plate sits at friction ${formatMu(realMu)}, ${floorWords(realMu)}. The back walker practiced on one floor strip, at ${formatMu(MU_TRAIN)}, ${standing('back')} and its dial reads ${formatPct(point)} of tries without a fall; the front walker practiced on ${stripsWord(floors.length)}, from ${floorSpan(range)}, ${standing('front')} and its dial reads ${formatPct(dr)}.`;

  const carriageSlot = (
    <g key="carriage" ref={carriageRef} transform={carriageShift(first.mu)} data-testid="real-floor-carriage" data-real-mu={formatMu(realMu)}>
      {carriage.map((part, index) =>
        part.kind === 'walker' ? (
          <g key={`walker-${part.walker}`} data-testid={`walker-${part.walker}`} data-pose={poseOf(shares[part.walker])}>
            {(['standing', 'toppled'] as const).map((pose) => (
              <g
                key={pose}
                data-walker-pose={pose}
                opacity={poseOf(firstShares[part.walker]) === pose ? 1 : 0}
                ref={(el) => {
                  poseRefs.current[`${part.walker}-${pose}`] = el;
                }}
              >
                {WALKERS[part.walker][pose].map((piece, k) =>
                  piece.kind === 'dial' ? (
                    <Dial
                      key={`dial-${k}`}
                      matrix={piece.matrix}
                      needle={piece.needle}
                      pose={pose}
                      degrees={needleDegrees(firstShares[piece.needle])}
                      needleRef={(el) => {
                        needleRefs.current[`${piece.needle}-${pose}`] = el;
                      }}
                    />
                  ) : (
                    <PartView key={k} part={piece} />
                  ),
                )}
              </g>
            ))}
          </g>
        ) : (
          <PartView key={index} part={part} />
        ),
      )}
    </g>
  );

  return (
    <InstrumentFigure
      figureId="friction-transfer"
      className={className}
      kicker="Domain randomization"
      heading="One-floor robot wins on its floor; many-floor robot copes widely"
      controls={
        <ControlField>
          {/* The setting reads as one phrase: a value on its own read as a second label. */}
          <ControlLabel htmlFor={`${uid}-real-mu`} className="justify-start">
            <span>
              Real floor: <span className="text-text">{floorWords(realMu)}</span>
            </span>
          </ControlLabel>
          <input
            id={`${uid}-real-mu`}
            type="range"
            data-brand-control-id="control:input"
            min={Math.round(MU_MIN * 100)}
            max={Math.round(MU_MAX * 100)}
            step={1}
            value={Math.round(realMu * 100)}
            onPointerDown={touched}
            onKeyDown={touched}
            onChange={(e) => {
              touched();
              setRealMu(Number(e.target.value) / 100);
            }}
            aria-label={`Real floor: ${floorWords(realMu)}; real floor friction, currently ${formatMu(realMu)}`}
            aria-valuetext={`${floorWords(realMu)}, friction ${formatMu(realMu)}: one-floor robot ${formatPct(point)}, many-floor robot ${formatPct(dr)} of tries without a fall`}
            className={INSTRUMENT_SLIDER_CLASS}
          />
          <SliderEnds low="slippery" high="grippy" />
        </ControlField>
      }
      adjust={
        <>
          <ControlField className="w-full basis-full content-start sm:max-w-sm">
            <ControlLabel htmlFor={`${uid}-range`} value={spreadWords(range)}>
              Range of practice floors
            </ControlLabel>
            <input
              id={`${uid}-range`}
              type="range"
              data-brand-control-id="control:input"
              min={Math.round(DR_RANGE_MIN * 100)}
              max={Math.round(DR_RANGE_MAX * 100)}
              step={5}
              value={Math.round(range * 100)}
              onPointerDown={touched}
              onKeyDown={touched}
              onChange={(e) => {
                touched();
                setRange(Number(e.target.value) / 100);
              }}
              aria-label={`Range of practice floors: ${spreadWords(range)}, ${stripsWord(floors.length)} in the front rack, plus or minus ${formatMu(range)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="nearly one floor" high="many floors" />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={HINT}
          readout={readoutFor(realMu, range)}
          status="Illustrative teaching model, not measured robot data"
          data-testid="floor-test-bed"
          data-real-mu={formatMu(realMu)}
        >
          <IsoFigure width={WIDTH} height={HEIGHT} label={label} describedBy={descriptionId}>
            <g ref={anchor} onPointerDown={touched}>
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                if (part.slot === 'rack-back') {
                  return (
                    <g key="rack-back" data-testid="rack-one-floor" data-strips={ONE_FLOOR.length}>
                      {backRack.map((strip, k) => (
                        <PartView key={k} part={strip} />
                      ))}
                    </g>
                  );
                }
                if (part.slot === 'rack-front') {
                  return (
                    <g key="rack-front" data-testid="rack-many-floors" data-strips={floors.length}>
                      {frontRack.map((strip, k) => (
                        <PartView key={k} part={strip} />
                      ))}
                    </g>
                  );
                }
                if (part.slot === 'crank') {
                  const handle = crankHandle(crankTurns(first.mu));
                  return (
                    <g key="crank" data-testid="crank-handle">
                      <LiveSolid ref={pinRef} paths={handle.pin} tone="mid" />
                      <LiveSolid ref={gripRef} paths={handle.grip} tone="mid" />
                    </g>
                  );
                }
                if (part.slot === 'carriage-front') {
                  return (
                    <g key="carriage-front" ref={frontRef} transform={carriageShift(first.mu)}>
                      {CARRIAGE_FRONT.map((front, k) => (
                        <PartView key={k} part={front} />
                      ))}
                    </g>
                  );
                }
                return carriageSlot;
              })}
            </g>
          </IsoFigure>
        </AnatomyStage>
      }
      caption="Robots practice on simulated floors that never match a real floor exactly, so engineers vary the floors on purpose."
      method={
        <>
          <p>
            The task in this example is walking across a floor without falling, and each dial reads the share of tries
            that end without a fall. The drawing is a floor test bed. Its scale runs from slippery at the left to grippy
            at the right: friction {formatMu(MU_MIN)} to {formatMu(MU_MAX)}, with a slot in each rack for every 0.05.
            A floor strip&apos;s grit shows its grip: the closer its rows of dots, the grippier it is. The back rack
            holds the one floor the one-floor robot practiced on, friction {formatMu(MU_TRAIN)}. The front rack holds
            the floors the many-floor robot practiced on, here {stripsWord(floors.length)} from {floorSpan(range)}, a
            half-width of {formatMu(range)} either side of the practice floor; &quot;Adjust more&quot; widens or narrows it.
            The blue plate on the carriage is the real floor, and its two tabs point at the same friction in both racks.
            Each robot&apos;s chest dial reads the share of its tries that end without a fall, and a robot is drawn
            toppled when more than half of its tries end in a fall.
          </p>
          <p data-testid="friction-note">{noteFor(realMu, range)}.</p>
          <p data-testid="ft-explanation">
            On this real floor, friction <span data-testid="real-mu-readout">{formatMu(realMu)}</span>, the one-floor
            robot gets through <span data-testid="point-readout">{formatPct(point)}</span> of tries and the many-floor
            robot <span data-testid="dr-readout">{formatPct(dr)}</span>. The numbers are made-up formulas, not trained
            policies or robot data: the one-floor robot&apos;s share is a bell around its practice floor, peak{' '}
            {formatPct(pointSuccess(MU_TRAIN))}; the many-floor robot holds{' '}
            <span data-testid="dr-peak-label">{formatPct(drPeak(range))}</span> across its strips and falls away past
            them. That plateau is 0.93 minus 0.55 times the half-width, so a wider rack copes with more floors but does a
            little worse on each: 74% at half-width 0.35 and 57% at 0.65. That cost is a local assumption, not a paper
            result, and domain randomization has no measured universal law of this shape.
          </p>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Tries without a fall against the real floor's friction"
            rowHeader="friction"
            columns={[
              { header: 'one-floor robot', numeric: true },
              { header: 'many-floor robot', numeric: true },
              { header: 'real floor', numeric: false },
            ]}
            rows={sampleRows}
            description={descriptionText}
          />
        </>
      }
      source={
        <span data-testid="friction-sources">
          The idea, not these numbers:{' '}
          {tobin ? (
            <a data-brand-control-id="control:link-focus" href={tobin.url} target="_blank" rel="noopener" className="underline-offset-2">
              {tobin.label}
            </a>
          ) : (
            'Tobin and colleagues'
          )}{' '}
          randomized what a simulated camera sees, and{' '}
          {peng ? (
            <a data-brand-control-id="control:link-focus" href={peng.url} target="_blank" rel="noopener" className="underline-offset-2">
              {peng.label}
            </a>
          ) : (
            'Peng and colleagues'
          )}{' '}
          randomized the physics, friction included.
        </span>
      }
    />
  );
}
