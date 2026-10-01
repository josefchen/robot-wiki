'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ConstraintHatch,
  LegendSwatch,
  PointMarker,
  roleColour,
} from '@/components/motion/chart';
import {
  DEFAULT_ERROR_MM,
  FOOT_XS,
  GROUND_Y,
  HOLE,
  MAX_ERROR_MM,
  MIN_ERROR_MM,
  PEG,
  SCENARIOS,
  SCENARIO_ORDER,
  contactCount,
  formatMm,
  outcomeFor,
  renderedOffsetPx,
  toleranceBandPx,
  type ScenarioId,
} from '@/lib/contact-geometry';

/**
 * ContactGeometry: inject a contact-model error epsilon into two MDPs and
 * watch what each one does with it.
 *
 * Locomotion (quadruped stance): four near-point foot-ground contacts and a
 * stable gait attractor. The simulator's ground being off by a few
 * millimeters, or even a centimeter, is absorbed by high-bandwidth feedback;
 * the feet stay inside the tolerance band.
 *
 * Manipulation (peg insertion): fourteen simultaneous distributed contacts
 * and a 0.5 mm clearance. The same few-millimeter contact-model error jams
 * the peg against the wall. That asymmetry, not any property of PPO, is why
 * sim-trained RL is the default for walking and not for assembly.
 *
 * Interactive contract: deterministic initial render, native slider and
 * aria-pressed scenario buttons (keyboard-accessible), visible readouts,
 * reset control, one fixed stage viewport across scenarios (no layout
 * shift), no JS-driven motion (scrub-only, so reduced-motion safe by
 * construction).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 152;

/** The lib authors both scenes in a 640-wide viewport. */
const LIB_WIDTH = 640;
const SX = WIDTH / LIB_WIDTH;

/*
 * Locomotion keeps the lib's vertical pixels per millimeter one to one, so
 * the rendered offset and the tolerance band read in the model's own units.
 */
const LOCO_GROUND = 142;
const LOCO_BODY = { top: 30, height: 20 } as const;

/** The peg scene scales uniformly about the peg's centre line. */
const MANIP_SCALE = 0.6;
const MANIP_TOP = 10;

const NOTE_X = 8;
const NOTE_Y = 19;
const TICK = 6;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

const mx = (x: number) => f(WIDTH / 2 + (x - PEG.centerX) * MANIP_SCALE);
const my = (y: number) => f(MANIP_TOP + (y - PEG.topY) * MANIP_SCALE);

const TERRAIN_POINTS = [
  [0, 250],
  [90, 244],
  [200, 249],
  [320, 243],
  [430, 248],
  [540, 244],
  [640, 249],
] as const;

const STRUCTURE = {
  fill: 'none',
  stroke: CHART_STRUCTURE.axes,
  strokeWidth: CHART_STROKE.trace,
} as const;

function ContactMarker({
  id,
  x,
  y,
  normalDeg,
  failed,
}: {
  id: string;
  x: number;
  y: number;
  normalDeg: number;
  failed: boolean;
}) {
  const rad = (normalDeg * Math.PI) / 180;
  const role = failed ? 'constraint' : 'state';
  // A contact that no longer holds is a cross rather than a dot, so the
  // failure is a shape and not only a hue.
  return (
    <g data-testid={`contact-marker-${id}`}>
      <line
        data-chart-mark="normal"
        data-chart-role={role}
        x1={f(x)}
        y1={f(y)}
        x2={f(x + Math.sin(rad) * TICK)}
        y2={f(y - Math.cos(rad) * TICK)}
        stroke={roleColour(role)}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={failed ? '2 2' : undefined}
      />
      <PointMarker x={f(x)} y={f(y)} role={role} shape={failed ? 'cross' : 'dot'} />
    </g>
  );
}

/*
 * Stacked note lines step in em, not in stage units: the stage holds its
 * text at one CSS size while the drawing scales, so an em step keeps the
 * lines together at every width.
 */
const LINE_EM = CHART_TYPE.ascent + CHART_TYPE.descent;

function SceneNote({
  x = NOTE_X,
  y,
  anchor = 'start',
  failed = false,
  lines,
  upward = false,
  children,
}: {
  x?: number;
  y: number;
  anchor?: 'start' | 'end';
  failed?: boolean;
  /** Several lines; `upward` puts the last line on `y` and stacks above it. */
  lines?: readonly ReactNode[];
  upward?: boolean;
  children?: ReactNode;
}) {
  return (
    <text
      data-scene-note=""
      x={x}
      y={f(y)}
      textAnchor={anchor}
      fontSize={CHART_TYPE.axisPx}
      fill={failed ? roleColour('constraint') : CHART_STRUCTURE.labelSecondary}
    >
      {lines
        ? lines.map((line, i) => (
            <tspan
              key={i}
              x={x}
              dy={i > 0 ? `${LINE_EM}em` : upward && lines.length > 1 ? `${-LINE_EM * (lines.length - 1)}em` : undefined}
            >
              {line}
            </tspan>
          ))
        : children}
    </text>
  );
}

function LocomotionScene({ errorMm }: { errorMm: number }) {
  const spec = SCENARIOS.locomotion;
  const offset = renderedOffsetPx(spec, errorMm);
  const band = toleranceBandPx(spec);
  const failed = outcomeFor(spec, errorMm) === 'fail';
  const footY = f(LOCO_GROUND - offset);
  const bandY = f(LOCO_GROUND - band);
  const bodyBottom = LOCO_BODY.top + LOCO_BODY.height;

  return (
    <g>
      {/* Terrain (where the ground really is), body and legs. */}
      <g data-scene-structure="" opacity={CHART_STRUCTURE.axesOpacity}>
        <polyline
          points={TERRAIN_POINTS.map(([x, y]) => `${f(x * SX)},${f(LOCO_GROUND + y - GROUND_Y)}`).join(' ')}
          {...STRUCTURE}
        />
        <rect
          x={f(110 * SX)}
          y={LOCO_BODY.top}
          width={f(420 * SX)}
          height={LOCO_BODY.height}
          {...STRUCTURE}
        />
        {FOOT_XS.map((x) => (
          <line key={x} x1={f(x * SX)} x2={f(x * SX)} y1={bodyBottom} y2={footY} {...STRUCTURE} />
        ))}
      </g>
      {/* Tolerance band: where feedback can still recover the foot. */}
      <line
        data-chart-mark="limit"
        data-chart-role="constraint"
        x1={0}
        x2={WIDTH}
        y1={bandY}
        y2={bandY}
        stroke={roleColour('constraint')}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      <SceneNote
        x={WIDTH - 6}
        y={bandY - 6}
        anchor="end"
        upward
        lines={['tolerance', `±${formatMm(spec.toleranceMm)}`]}
      />
      {/* Feet sit where the model thinks the ground is. */}
      {spec.contacts.map((c) => (
        <ContactMarker
          key={c.id}
          id={c.id}
          x={c.x * SX}
          y={footY}
          normalDeg={c.normalDeg}
          failed={failed}
        />
      ))}
      {offset > 0 && (
        <SceneNote y={NOTE_Y} failed={failed}>
          ground modeled {errorMm.toFixed(1)} mm too high
        </SceneNote>
      )}
    </g>
  );
}

function ManipulationScene({ errorMm, hatchId }: { errorMm: number; hatchId: string }) {
  const spec = SCENARIOS.manipulation;
  const offset = renderedOffsetPx(spec, errorMm);
  const clearance = toleranceBandPx(spec);
  const failed = outcomeFor(spec, errorMm) === 'fail';
  const shift = offset * MANIP_SCALE;
  const pegLeft = f(mx(PEG.centerX - PEG.width / 2) + shift);
  const pegRight = f(mx(PEG.centerX + PEG.width / 2) + shift);
  const pegWidth = f(PEG.width * MANIP_SCALE);
  const finger = { width: f(12 * MANIP_SCALE), top: my(PEG.topY + 2), height: f(34 * MANIP_SCALE) };
  const wall = { width: f(24 * MANIP_SCALE), height: f((HOLE.floorY - HOLE.mouthY) * MANIP_SCALE) };
  const overlap = f(pegRight - mx(HOLE.rightX));
  const clearanceY = my(212);

  return (
    <g>
      {/* Hole walls and floor, peg and grip fingers. */}
      <g data-scene-structure="" opacity={CHART_STRUCTURE.axesOpacity}>
        <rect x={mx(HOLE.leftX - 24)} y={my(HOLE.mouthY)} width={wall.width} height={wall.height} {...STRUCTURE} />
        <rect x={mx(HOLE.rightX)} y={my(HOLE.mouthY)} width={wall.width} height={wall.height} {...STRUCTURE} />
        <rect
          x={mx(HOLE.leftX - 24)}
          y={my(HOLE.floorY)}
          width={f((HOLE.rightX - HOLE.leftX + 48) * MANIP_SCALE)}
          height={f(10 * MANIP_SCALE)}
          {...STRUCTURE}
        />
        <rect x={pegLeft} y={my(PEG.topY)} width={pegWidth} height={f((PEG.bottomY - PEG.topY) * MANIP_SCALE)} {...STRUCTURE} />
        <rect x={f(pegLeft - finger.width)} y={finger.top} width={finger.width} height={finger.height} {...STRUCTURE} />
        <rect x={pegRight} y={finger.top} width={finger.width} height={finger.height} {...STRUCTURE} />
      </g>
      {/* The part of the peg the model pushes into the wall. */}
      {failed && overlap > 0 ? (
        <ConstraintHatch
          id={hatchId}
          x={mx(HOLE.rightX)}
          y={my(HOLE.mouthY)}
          width={overlap}
          height={f(my(PEG.bottomY) - my(HOLE.mouthY))}
        />
      ) : null}
      {/* Clearance annotation, right of the hole where the stage is empty. */}
      <line
        data-chart-mark="limit"
        data-chart-role="constraint"
        x1={mx(HOLE.rightX - 3)}
        x2={mx(HOLE.rightX + 30)}
        y1={clearanceY}
        y2={clearanceY}
        stroke={roleColour('constraint')}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      <SceneNote x={mx(HOLE.rightX + 34)} y={clearanceY + 4.5}>
        clearance {formatMm(spec.toleranceMm)}
      </SceneNote>
      {spec.contacts.map((c) => {
        // Rim contacts belong to the hole; the rest ride with the peg.
        const ridesWithPeg = !c.id.startsWith('rim-');
        return (
          <ContactMarker
            key={c.id}
            id={c.id}
            x={mx(c.x) + (ridesWithPeg ? shift : 0)}
            y={my(c.y)}
            normalDeg={c.normalDeg}
            failed={failed}
          />
        );
      })}
      {offset > clearance && (
        <SceneNote
          y={60}
          failed
          lines={['contact model off', `by ${errorMm.toFixed(1)} mm: peg`, 'overlaps the wall']}
        />
      )}
    </g>
  );
}

export function ContactGeometry({
  defaultScenario = 'locomotion',
  defaultErrorMm = DEFAULT_ERROR_MM,
  className,
}: {
  defaultScenario?: ScenarioId;
  defaultErrorMm?: number;
  className?: string;
}) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const hatchId = `${uid.replace(/[^a-zA-Z0-9_-]/g, '')}-cg-overlap`;
  const [scenarioId, setScenarioId] = useState<ScenarioId>(defaultScenario);
  const [errorMm, setErrorMm] = useState(defaultErrorMm);

  const spec = SCENARIOS[scenarioId];
  const outcome = outcomeFor(spec, errorMm);
  const outcomeText =
    outcome === 'ok' ? spec.outcomeOk : spec.outcomeFail;
  const nContacts = contactCount(spec);
  const takeaway =
    scenarioId === 'locomotion'
      ? outcome === 'ok'
        ? `Locomotion at ${errorMm.toFixed(1)} mm of injected contact-model error stays stable with all ${nContacts} feet loaded inside the ${formatMm(spec.toleranceMm)} dashed tolerance band; the near-point contacts remain recoverable with ${(spec.toleranceMm - errorMm).toFixed(1)} mm of margin left inside that gait-scale band.`
        : `Locomotion at ${errorMm.toFixed(1)} mm of injected contact-model error loses support: foot float exceeds the ${formatMm(spec.toleranceMm)} dashed tolerance band, so the ${nContacts} near-point contacts have already left the recoverable region.`
      : outcome === 'ok'
        ? `Manipulation at ${errorMm.toFixed(1)} mm of injected contact-model error still seats: the peg clears both walls inside the ${formatMm(spec.toleranceMm)} dashed clearance; the ${nContacts} distributed contacts have not yet used up that insertion tolerance.`
        : `Manipulation at ${errorMm.toFixed(1)} mm of injected contact-model error jams: the peg binds against the wall, well past the ${formatMm(spec.toleranceMm)} dashed clearance, so the ${nContacts} distributed contacts cannot absorb millimeters the way a gait can.`;

  function reset() {
    setScenarioId(defaultScenario);
    setErrorMm(defaultErrorMm);
  }

  const limitName = scenarioId === 'locomotion' ? 'tolerance band' : 'clearance';

  return (
    <InstrumentFigure
      figureId="contact-geometry"
      className={className}
      heading="Contact geometry and model error"
      controls={
        <>
          <div
            role="group"
            aria-labelledby="cg-scenario-label"
            className="flex flex-wrap items-center gap-1.5"
          >
            <span id="cg-scenario-label" className="font-sans text-[13px] text-text-dim">
              Scenario
            </span>
            {SCENARIO_ORDER.map((id) => (
              <button
                data-brand-control-id="control:selection"
                key={id}
                type="button"
                aria-pressed={id === scenarioId}
                onClick={() => setScenarioId(id)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {SCENARIOS[id].label}
              </button>
            ))}
          </div>
          <ControlField>
            <ControlLabel htmlFor="cg-error" value={`ε = ${errorMm.toFixed(1)} mm`}>
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
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem swatch={<LegendSwatch role="state" mark="dot" />}>
                  modeled contact
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="constraint" mark="cross" />}>
                  lost contact
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="constraint" mark="dash" />}>
                  {limitName}
                </LegendItem>
                {scenarioId === 'manipulation' ? (
                  <LegendItem swatch={<LegendSwatch role="constraint" mark="hatch" />}>
                    peg inside the wall
                  </LegendItem>
                ) : null}
              </InstrumentLegend>
              <InstrumentReadout>
                {spec.label} at{' '}
                <span data-testid="error-readout" style={{ color: roleColour('highlight') }}>
                  ε = {errorMm.toFixed(1)} mm
                </span>{' '}
                →{' '}
                <span
                  data-testid="outcome-readout"
                  style={{ color: roleColour(outcome === 'ok' ? 'value' : 'constraint') }}
                >
                  {outcomeText}
                </span>
              </InstrumentReadout>
              <InstrumentReadout>
                <span data-testid="contact-count-readout">{nContacts}</span> contacts, patch{' '}
                <span data-testid="patch-readout">{spec.patchSummary}</span>, tolerance{' '}
                <span data-testid="tolerance-readout">±{formatMm(spec.toleranceMm)}</span>
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current contact-model error"
                description={takeaway}
                states={[
                  { label: 'scenario', value: spec.label },
                  { label: 'error', value: `${errorMm.toFixed(1)} mm` },
                  { label: 'tolerance', value: formatMm(spec.toleranceMm) },
                  { label: 'contacts', value: String(nContacts) },
                  { label: 'outcome', value: outcomeText },
                ]}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`${spec.label} contact geometry. ${spec.sceneCaption} Injected contact-model error ${errorMm.toFixed(1)} millimeters. Outcome: ${outcomeText}.`}
            aria-describedby={descriptionId}
          >
            {scenarioId === 'locomotion' ? (
              <LocomotionScene errorMm={errorMm} />
            ) : (
              <ManipulationScene errorMm={errorMm} hatchId={hatchId} />
            )}
          </PlotStage>
        </FigureStage>
      }
      caption="A gait absorbs centimeter-scale contact error through feedback, while a 0.5 mm insertion clearance makes the same error fatal."
      source="Illustrative contact counts and patch radii, not one simulator's solver output; tolerances are representative physical scales."
    />
  );
}
