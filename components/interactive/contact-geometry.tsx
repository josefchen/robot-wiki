'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_VIEW_WIDTH,
  ConstraintHatch,
  DirectLabel,
  LegendSwatch,
  PointMarker,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import { RobotDog, type DogFeet } from '@/components/motion/robot-dog';
import { MOTION_STAGE } from '@/lib/motion-tokens';
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
 * ContactGeometry: one floor error, two tasks, side by side.
 *
 * Left, a four-legged robot stands where the simulator thinks the floor
 * is (dashed), above where the floor really is (solid). Feedback on every
 * step absorbs the gap until it passes the gait's 20 mm tolerance.
 *
 * Right, a gripper lowers a peg into the hole where the simulator thinks
 * the hole is (dashed walls). The real hole (solid walls) has 0.5 mm of
 * clearance, so the same couple of millimetres lands the peg on the edge.
 *
 * Gaps are drawn larger than real so a 2 mm error is visible at all: the
 * floor gap grows with the square root of the error and the peg's offset
 * stops growing at four clearances, past which it carries no information.
 * Every lib contact keeps a marker; only the ones that go wrong (all four
 * feet past the gait's tolerance, the rim and leading corner where a peg
 * binds) are crosses.
 * No JS-driven motion, so reduced-motion safe by construction.
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 208;

/** Where the real floor and the hole's base sit. */
const FLOOR_Y = 176;
const OUTCOME_Y = 200;
const DOG_PANEL_RIGHT = 168;

/** The dog's hips and the feet that carry the lib's four foot contacts, in order. */
const DOG_REAR = 44;
const DOG_FRONT = 112;
const DOG_LEG = 22;
const DOG_FEET_X = [50, 40, 120, 110] as const;

/** Peg scene geometry, in stage units. */
const PEG_X = 262;
const PEG_W = 30;
const PEG_H = 54;
/** One drawn clearance on each side of the peg, the real 0.5 mm. */
const CLEARANCE = 4;
const WALL_W = 16;
const MOUTH_Y = FLOOR_Y - 48;
const INSERTED = 30;
const HOLE_LEFT = PEG_X - PEG_W / 2 - CLEARANCE;
const HOLE_RIGHT = PEG_X + PEG_W / 2 + CLEARANCE;

const f = (v: number) => Number(v.toFixed(2));

/** Drawn floor gap: grows with the square root so 2 mm still shows. */
const floorGap = (errorMm: number) => f(5 * Math.sqrt(Math.max(0, errorMm)));

/** Drawn peg offset: one clearance per 0.5 mm, stopping at four clearances. */
const pegShift = (errorMm: number) => {
  const spec = SCENARIOS.manipulation;
  return f((Math.min(errorMm, 4 * spec.toleranceMm) * CLEARANCE) / spec.toleranceMm);
};

/** Where each of the lib's fourteen insertion contacts sits on the seated peg. */
const PEG_CONTACT_AT: Record<string, readonly [number, number]> = {
  'wall-l-1': [-PEG_W / 2, INSERTED - 24],
  'wall-l-2': [-PEG_W / 2, INSERTED - 15],
  'wall-l-3': [-PEG_W / 2, INSERTED - 6],
  'wall-r-1': [PEG_W / 2, INSERTED - 24],
  'wall-r-2': [PEG_W / 2, INSERTED - 15],
  'wall-r-3': [PEG_W / 2, INSERTED - 6],
  'chamfer-l': [-8, INSERTED],
  'chamfer-r': [8, INSERTED],
  'finger-l-1': [-PEG_W / 2, INSERTED - PEG_H + 6],
  'finger-l-2': [-PEG_W / 2, INSERTED - PEG_H + 16],
  'finger-r-1': [PEG_W / 2, INSERTED - PEG_H + 6],
  'finger-r-2': [PEG_W / 2, INSERTED - PEG_H + 16],
};

/** Where a peg that misses binds: the right-hand rim and the peg's leading corner. */
const JAM_CONTACTS = new Set(['rim-r', 'chamfer-r']);

const ink = CHART_STRUCTURE.label;
const LINE = { fill: 'none', stroke: ink, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const DASHED = { ...LINE, strokeWidth: 1.25, strokeDasharray: CHART_STROKE.dash } as const;

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

function ContactMarker({ id, x, y, lost }: { id: string; x: number; y: number; lost: boolean }) {
  // A contact that goes wrong is a red cross; every other contact is a
  // small grey dot, so the failure is a shape and not only a hue, and it is
  // the one mark group at full emphasis.
  return (
    <g data-testid={`contact-marker-${id}`} data-contact={lost ? 'lost' : 'held'}>
      {lost ? (
        <PointMarker x={f(x)} y={f(y)} role="constraint" shape="cross" />
      ) : (
        <circle cx={f(x)} cy={f(y)} r={1.5} fill={CHART_STRUCTURE.labelSecondary} opacity={0.7} />
      )}
    </g>
  );
}

/** A legend swatch in the drawing's own ink, solid or dashed. */
function InkSwatch({ dashed = false }: { dashed?: boolean }) {
  return (
    <svg aria-hidden="true" focusable="false" width={28} height={14} viewBox="0 0 28 14" className="shrink-0">
      <path d="M1 7 H27" {...(dashed ? DASHED : LINE)} />
    </svg>
  );
}

function DogScene({ errorMm }: { errorMm: number }) {
  const spec = SCENARIOS.locomotion;
  const failed = outcomeFor(spec, errorMm) === 'fail';
  const simFloor = f(FLOOR_Y - floorGap(errorMm));
  const hipY = simFloor - 38;
  const feet = DOG_FEET_X.map((x) => [x, simFloor] as const) as unknown as DogFeet;
  return (
    <g data-testid="dog-scene">
      <line data-testid="real-floor" x1={4} x2={DOG_PANEL_RIGHT} y1={FLOOR_Y} y2={FLOOR_Y} {...LINE} />
      <line data-testid="sim-floor" x1={4} x2={DOG_PANEL_RIGHT} y1={simFloor} y2={simFloor} {...DASHED} />
      {/* Past its tolerance the robot tips onto its nose. */}
      <g transform={failed ? `rotate(14 ${DOG_FEET_X[1]} ${simFloor})` : undefined}>
        <RobotDog rear={DOG_REAR} front={DOG_FRONT} hipY={hipY} feet={feet} segment={DOG_LEG} />
        {spec.contacts.map((c, i) => (
          <ContactMarker key={c.id} id={c.id} x={DOG_FEET_X[i]} y={simFloor - 2} lost={failed} />
        ))}
      </g>
      <DirectLabel x={84} y={OUTCOME_Y} anchor="middle" role={failed ? 'constraint' : undefined}>
        {failed ? 'loses its footing' : 'keeps walking'}
      </DirectLabel>
    </g>
  );
}

/** A two-finger gripper holding the peg, as a line drawing: wrist, palm and a finger on each side with its pad. */
function Gripper({ pegLeft, pegTop }: { pegLeft: number; pegTop: number }) {
  const pegRight = f(pegLeft + PEG_W);
  const palmY = f(pegTop - 8);
  const centre = f(pegLeft + PEG_W / 2);
  const outline = { fill: 'none', stroke: ink, strokeWidth: CHART_STROKE.trace } as const;
  return (
    <g data-testid="gripper">
      <line x1={centre} x2={centre} y1={f(palmY - 18)} y2={palmY} {...outline} />
      <rect x={f(pegLeft - 10)} y={palmY} width={PEG_W + 20} height={4} {...outline} />
      {[f(pegLeft - 8), pegRight].map((x) => (
        <g key={x}>
          <rect x={x} y={f(palmY + 4)} width={8} height={30} {...outline} fill={MOTION_STAGE.background} />
          <line
            x1={x === pegRight ? f(x + 1.5) : f(x + 6.5)}
            x2={x === pegRight ? f(x + 1.5) : f(x + 6.5)}
            y1={f(pegTop + 8)}
            y2={f(pegTop + 20)}
            {...outline}
          />
        </g>
      ))}
    </g>
  );
}

function PegScene({ errorMm, hatchId }: { errorMm: number; hatchId: string }) {
  const spec = SCENARIOS.manipulation;
  const failed = outcomeFor(spec, errorMm) === 'fail';
  const shift = pegShift(errorMm);
  // A peg that misses rests on the wall top instead of entering the hole.
  const bottom = failed ? MOUTH_Y : MOUTH_Y + INSERTED;
  const lift = bottom - (MOUTH_Y + INSERTED);
  const pegLeft = f(PEG_X - PEG_W / 2 + shift);
  const pegRight = f(pegLeft + PEG_W);
  const pegTop = bottom - PEG_H;
  const overlap = f(pegRight - HOLE_RIGHT);
  const wallH = FLOOR_Y - 4 - MOUTH_Y;
  return (
    <g data-testid="peg-scene">
      <g data-testid="real-hole" {...LINE}>
        <rect x={HOLE_LEFT - WALL_W} y={MOUTH_Y} width={WALL_W} height={wallH} />
        <rect x={HOLE_RIGHT} y={MOUTH_Y} width={WALL_W} height={wallH} />
        <rect x={HOLE_LEFT - WALL_W} y={FLOOR_Y - 4} width={HOLE_RIGHT - HOLE_LEFT + 2 * WALL_W} height={4} />
      </g>
      {/* Where the simulator believes the hole is. */}
      <g data-testid="sim-hole" {...DASHED}>
        <line x1={f(HOLE_LEFT + shift)} x2={f(HOLE_LEFT + shift)} y1={MOUTH_Y - 8} y2={FLOOR_Y - 4} />
        <line x1={f(HOLE_RIGHT + shift)} x2={f(HOLE_RIGHT + shift)} y1={MOUTH_Y - 8} y2={FLOOR_Y - 4} />
      </g>
      {failed && overlap > 0 ? (
        <ConstraintHatch id={hatchId} x={HOLE_RIGHT} y={MOUTH_Y - 5} width={overlap} height={5} />
      ) : null}
      <g data-testid="peg">
        <path
          d={`M ${pegLeft} ${pegTop} H ${pegRight} V ${f(bottom - 4)} L ${f(pegRight - 4)} ${bottom} H ${f(pegLeft + 4)} L ${pegLeft} ${f(bottom - 4)} Z`}
          {...LINE}
          fill={MOTION_STAGE.background}
        />
      </g>
      <Gripper pegLeft={pegLeft} pegTop={pegTop} />
      {spec.contacts.map((c) => {
        const lost = failed && JAM_CONTACTS.has(c.id);
        // Rim contacts belong to the real hole; the rest ride with the peg.
        if (c.id === 'rim-l' || c.id === 'rim-r') {
          return <ContactMarker key={c.id} id={c.id} x={c.id === 'rim-l' ? HOLE_LEFT : HOLE_RIGHT} y={MOUTH_Y} lost={lost} />;
        }
        const [dx, dy] = PEG_CONTACT_AT[c.id] ?? [0, 0];
        return <ContactMarker key={c.id} id={c.id} x={PEG_X + shift + dx} y={MOUTH_Y + dy + lift} lost={lost} />;
      })}
      <DirectLabel x={PEG_X} y={OUTCOME_Y} anchor="middle" role={failed ? 'constraint' : undefined}>
        {failed ? 'jams on the edge' : 'slides into the hole'}
      </DirectLabel>
    </g>
  );
}

function annotationLines(errorMm: number, dogOk: boolean, pegOk: boolean): string[] {
  const mm = plainMm(errorMm);
  if (dogOk && pegOk) return [`At ${mm} both cope: the dog keeps`, 'walking and the peg still slides in'];
  if (dogOk) return [`Same ${mm} error: the dog keeps walking,`, 'the peg misses the hole'];
  return [`At ${mm} even the dog loses its footing;`, 'the peg missed long before'];
}

export function ContactGeometry({
  defaultErrorMm = DEFAULT_ERROR_MM,
  className,
}: {
  defaultErrorMm?: number;
  className?: string;
}) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const hatchId = `${uid.replace(/[^a-zA-Z0-9_-]/g, '')}-cg-overlap`;
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
    ? `Locomotion at ${error} of contact-model error stays stable: all ${nLoco} paws stand on the dashed simulated floor, inside the ${formatMm(loco.toleranceMm)} a gait absorbs, with ${(loco.toleranceMm - errorMm).toFixed(1)} mm of margin left.`
    : `Locomotion at ${error} of contact-model error loses support: the gap to the real floor exceeds the ${formatMm(loco.toleranceMm)} a gait absorbs, so its ${nLoco} near-point contacts have left the recoverable region.`;
  const manipClause = manipOk
    ? `The peg at the same error still seats inside the ${formatMm(manip.toleranceMm)} clearance of the real hole, with all ${nManip} distributed contacts holding.`
    : `The peg at the same error jams on the edge of the real hole, past its ${formatMm(manip.toleranceMm)} clearance, so its ${nManip} distributed contacts cannot absorb millimetres the way a gait can.`;
  const takeaway = `${locoClause} ${manipClause}`;

  function reset() {
    setErrorMm(defaultErrorMm);
  }

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
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem swatch={<InkSwatch />}>real surface</LegendItem>
                <LegendItem swatch={<InkSwatch dashed />}>
                  where the simulator thinks it is
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="constraint" mark="cross" />}>where it goes wrong</LegendItem>
              </InstrumentLegend>
              <StageStatus>Illustrative, not measured; gaps drawn larger than real</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Contact-model error of ${errorMm.toFixed(1)} millimetres, side by side. Left, a four-legged robot stands on the simulated floor: ${locoOutcome}. Right, a gripper lowers a peg toward the real hole: ${manipOutcome}.`}
            aria-describedby={descriptionId}
          >
            <StageAnnotation x={8} y={16} lines={annotationLines(errorMm, locoOk, manipOk)} />
            <DogScene errorMm={errorMm} />
            <PegScene errorMm={errorMm} hatchId={hatchId} />
          </PlotStage>
        </FigureStage>
      }
      caption="Simulators never get surfaces exactly right; legs adjust step by step, but a tight-fitting part leaves almost no room for error."
      method={
        <>
          <p>
            Both scenes take the same contact-model error, epsilon: how far the simulator&rsquo;s idea of a
            surface is from the real one. The walking robot stands where the simulator puts the floor; the
            peg is lowered where the simulator puts the hole. Gaps are drawn larger than real so a couple of
            millimetres shows at all: the floor gap grows with the square root of the error, and the peg&rsquo;s
            offset stops growing at four clearances. The slider under &ldquo;Adjust more&rdquo; sets any error
            from {MIN_ERROR_MM} to {MAX_ERROR_MM} mm.
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
