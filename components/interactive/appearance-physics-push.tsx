'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageNumber, StageReadout, StageStatus } from '@/components/motion/figure-frame';
import { MOTION_STAGE } from '@/lib/motion-tokens';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
  StageAnnotation,
  roleColour,
  type ChartPoint,
} from '@/components/motion/chart';
import {
  CONTACT_TIME_S,
  DEFAULT_FORCE_N,
  FRICTION_MU,
  INITIAL_LAYERS,
  INITIAL_MUG,
  MASS_KG,
  MAX_FORCE_N,
  MIN_FORCE_N,
  TRACK_MAX_M,
  type LayerState,
  type MugState,
  applyPush,
  displacementForForce,
  formatCentimetres,
  formatCm,
  pushTestNote,
  setLayer,
} from '@/lib/appearance-physics-push';

/**
 * One scene, three layers: the picture (the rendered mug and table), the
 * physics proxy (collision hull, mass and friction) and the simulation
 * layer, the solver that turns a push into motion. With only the picture a
 * push changes nothing; with the physics underneath the same push slides
 * the mug.
 */
type AppearancePhysicsPushProps = {
  /** Initial push strength in newtons. Default 4. */
  defaultForceN?: number;
  className?: string;
};

type Scene = 'picture' | 'physics';

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 150;
const TABLE = { left: 16, right: WIDTH - 16, y: 118, slab: 6, leg: 5, legInset: 22, floor: HEIGHT - 6 };
const MUG_W = 34;
const MUG_H = 40;
/** How far the handle reaches right of the body. */
const HANDLE = 14;
const HULL_PAD = 4;
const TRACK_X0 = 80;
const TRACK_X1 = 270;
const PUSH_Y = TABLE.y - 16;
const HEAD = 8;
const NOTE = { x: 16, y: 22 };

const PHYSICS_LAYERS: LayerState = { appearance: true, physics: true, simulation: true };

const MUG_BODY = `M0 ${TABLE.y - MUG_H}h${MUG_W}v${MUG_H - 6}a6 6 0 0 1 -6 6h${-(MUG_W - 12)}a6 6 0 0 1 -6 -6Z`;
const MUG_HANDLE = `M${MUG_W} ${TABLE.y - MUG_H + 9}h5a9 9 0 0 1 0 18h-5`;

/** Mug left edge in stage units for a track position in meters. */
function mugX(positionM: number): number {
  return TRACK_X0 + (positionM / TRACK_MAX_M) * (TRACK_X1 - TRACK_X0);
}

function newtons(force: number): string {
  return `${force} ${force === 1 ? 'newton' : 'newtons'}`;
}

function sceneOf(layers: LayerState): Scene | null {
  if (layers.appearance && !layers.physics) return 'picture';
  if (layers.appearance && layers.physics && layers.simulation) return 'physics';
  return null;
}

/** The stage note: what the reader should see in the current state. */
function noteLines(layers: LayerState, mug: MugState): readonly [string, string] {
  if (!layers.physics) {
    return layers.appearance
      ? ['Pushed, but it is only a picture:', 'no weight or friction, so it stays put']
      : ['No picture and no physics:', 'there is nothing here to push'];
  }
  if (!layers.simulation) return ['Shape, weight and friction are there,', 'but no solver works out the motion'];
  if (mug.effectivePushes === 0) return ['Weight and friction are in place,', 'so a push will now slide the mug'];
  if (mug.position >= TRACK_MAX_M - 1e-9) return ['With weight and friction underneath,', 'the pushes slid it to the table’s end'];
  return ['With weight and friction underneath,', 'the same push slides the mug along'];
}

/** The push: a shaft and a filled head whose tip touches the mug. */
function PushArrow({ tip, length }: { tip: number; length: number }) {
  const colour = roleColour('action');
  return (
    <g data-testid="force-arrow" data-series="push" data-chart-role="action">
      <line x1={tip - length} x2={tip - HEAD + 1} y1={PUSH_Y} y2={PUSH_Y} stroke={colour} strokeWidth={CHART_STROKE.trace} />
      <polygon points={`${tip},${PUSH_Y} ${tip - HEAD},${PUSH_Y - HEAD / 1.6} ${tip - HEAD},${PUSH_Y + HEAD / 1.6}`} fill={colour} />
    </g>
  );
}

/** A table drawn as a slab on two legs: scenery, not data. */
function Table() {
  const legHeight = TABLE.floor - TABLE.y - TABLE.slab;
  return (
    <g data-testid="table-appearance" data-scene-structure="table" fill="none" stroke={roleColour('reference')} strokeWidth={CHART_STROKE.structure}>
      <rect x={TABLE.left} y={TABLE.y} width={TABLE.right - TABLE.left} height={TABLE.slab} />
      <rect x={TABLE.left + TABLE.legInset} y={TABLE.y + TABLE.slab} width={TABLE.leg} height={legHeight} />
      <rect x={TABLE.right - TABLE.legInset - TABLE.leg} y={TABLE.y + TABLE.slab} width={TABLE.leg} height={legHeight} />
      <line
        x1={TABLE.left}
        x2={TABLE.right}
        y1={TABLE.y}
        y2={TABLE.y}
        stroke={CHART_STRUCTURE.axes}
        strokeOpacity={CHART_STRUCTURE.axesOpacity}
      />
    </g>
  );
}

/** The rendered mug in outline: a body with rounded foot corners and a handle. */
function MugPicture({ colour }: { colour: string }) {
  return (
    <g fill="none" stroke={colour} strokeWidth={CHART_STROKE.trace} strokeLinejoin="round">
      <path d={MUG_BODY} fill={MOTION_STAGE.background} />
      <path d={MUG_HANDLE} />
    </g>
  );
}

const LAYER_BUTTONS: ReadonlyArray<{ id: keyof LayerState; label: string }> = [
  { id: 'appearance', label: 'Picture' },
  { id: 'physics', label: 'Shape, weight and friction' },
  { id: 'simulation', label: 'Physics solver' },
];

const onOff = (on: boolean) => (on ? 'on' : 'off');

export function AppearancePhysicsPush({
  defaultForceN = DEFAULT_FORCE_N,
  className,
}: AppearancePhysicsPushProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const forceId = `${id}-force`;
  const [layers, setLayers] = useState<LayerState>(INITIAL_LAYERS);
  const [mug, setMug] = useState<MugState>(INITIAL_MUG);
  const [forceN, setForceN] = useState(defaultForceN);

  const scene = sceneOf(layers);
  const solves = layers.physics && layers.simulation;
  const atTrackEnd = mug.position >= TRACK_MAX_M - 1e-9;
  const moved = formatCentimetres(mug.position);
  const pushes = `${mug.effectivePushes} ${mug.effectivePushes === 1 ? 'push' : 'pushes'}`;
  const note = pushTestNote(layers);

  function choose(next: Scene) {
    if (next === 'picture') {
      setLayers(INITIAL_LAYERS);
      setMug(INITIAL_MUG);
      return;
    }
    // The physics scene opens on the push already answered, so its first
    // frame shows the slide instead of waiting for a second click.
    setLayers(PHYSICS_LAYERS);
    setMug(applyPush(INITIAL_MUG, PHYSICS_LAYERS, forceN).state);
  }

  function toggle(layer: keyof LayerState) {
    setLayers((current) => setLayer(current, layer, !current[layer]));
  }

  function push() {
    setMug((current) => applyPush(current, layers, forceN).state);
  }

  function reset() {
    setLayers(INITIAL_LAYERS);
    setMug(INITIAL_MUG);
    setForceN(defaultForceN);
  }

  const x = mugX(mug.position);
  // After the solver has moved the mug, the arrow stays where the last push
  // was applied, so the slide reads from the arrow to the mug.
  const tip = solves && mug.history.length > 1 ? mugX(mug.history[mug.history.length - 2]) : x;
  const state = roleColour('state');
  const reference = roleColour('reference');
  const top = TABLE.y - MUG_H - (layers.physics ? HULL_PAD : 0);
  const target: ChartPoint = [x + MUG_W / 2, top - 6];
  const sceneName = scene === 'picture'
    ? 'Picture only'
    : scene === 'physics'
      ? 'Picture plus physics'
      : `Picture ${onOff(layers.appearance)}, shape, weight and friction ${onOff(layers.physics)}, physics solver ${onOff(layers.simulation)}`;
  const force = newtons(forceN);
  const description = !layers.physics
    ? layers.appearance
      ? `With only the picture, a push of ${force} leaves the mug at ${moved}: a picture has no shape, weight or friction for a solver to push against.`
      : `With neither the picture nor the physics, a push of ${force} has nothing to act on and the mug stays at ${moved}.`
    : !layers.simulation
      ? `Shape, weight and friction are in place but the solver is off, so a push of ${force} leaves the mug at ${moved}.`
      : `With shape, weight and friction under the picture, the solver turns each push of ${force} into a slide: the mug has moved ${moved} after ${pushes}.`;

  const stage = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label={`A mug on a table with a push arrow. ${sceneName}. The mug has moved ${moved}.`}
      aria-describedby={descriptionId}
    >
      {layers.appearance ? <Table /> : null}
      {layers.physics ? (
        <rect
          data-testid="collision-slab"
          data-series="collision-slab"
          data-chart-role="reference"
          x={TABLE.left}
          y={TABLE.y}
          width={TABLE.right - TABLE.left}
          height={TABLE.slab}
          fill="none"
          stroke={reference}
          strokeWidth={CHART_STROKE.reference}
          strokeDasharray={CHART_STROKE.dash}
        />
      ) : null}
      {solves && layers.appearance
        ? mug.history.slice(0, -1).map((p, i) => (
            <g
              key={i}
              data-testid="motion-ghost"
              data-series="motion-ghost"
              data-chart-role="state"
              transform={`translate(${mugX(p)} 0)`}
              opacity={CHART_UNCERTAINTY.fillAlpha}
            >
              <MugPicture colour={state} />
            </g>
          ))
        : null}
      <PushArrow tip={tip} length={12 + forceN * 5} />
      <g data-testid="mug" transform={`translate(${x} 0)`}>
        {layers.appearance ? (
          <g data-testid="mug-appearance" data-series="mug" data-chart-role="state">
            <MugPicture colour={state} />
          </g>
        ) : null}
        {layers.physics ? (
          <rect
            data-testid="collision-hull"
            data-series="collision-hull"
            data-chart-role="reference"
            x={-HULL_PAD}
            y={TABLE.y - MUG_H - HULL_PAD}
            width={MUG_W + HANDLE + 2 * HULL_PAD}
            height={MUG_H + HULL_PAD}
            fill="none"
            stroke={reference}
            strokeWidth={CHART_STROKE.reference}
            strokeDasharray={CHART_STROKE.dash}
          />
        ) : null}
      </g>
      <g data-testid="push-note">
        <StageAnnotation x={NOTE.x} y={NOTE.y} lines={noteLines(layers, mug)} from={[NOTE.x + 4, NOTE.y + 30]} target={target} />
      </g>
    </PlotStage>
  );

  return (
    <InstrumentFigure
      figureId="appearance-physics-push"
      className={className}
      kicker="The push test"
      heading="A realistic picture of a mug cannot be pushed"
      controls={
        <>
          <PresetGroup<Scene>
            label="What is in the scene?"
            presets={[
              { id: 'picture', label: 'Picture only' },
              { id: 'physics', label: 'Picture plus physics' },
            ]}
            value={scene}
            onChange={choose}
            testId="push-scene"
          />
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={push}
            disabled={atTrackEnd && solves}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Push the mug
          </button>
        </>
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel htmlFor={forceId} value={newtons(forceN)}>
              Push strength
            </ControlLabel>
            <input
              id={forceId}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_FORCE_N}
              max={MAX_FORCE_N}
              step={1}
              value={forceN}
              onChange={(e) => setForceN(Number(e.target.value))}
              aria-label={`Push strength, currently ${newtons(forceN)}`}
              aria-valuetext={newtons(forceN)}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="gentle" high="hard" />
          </ControlField>
          <div role="group" aria-label="Layers" className="flex flex-wrap gap-2">
            {LAYER_BUTTONS.map((b) => (
              <button
                data-brand-control-id="control:selection"
                key={b.id}
                type="button"
                aria-pressed={layers[b.id]}
                onClick={() => toggle(b.id)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {b.label}
              </button>
            ))}
          </div>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <StageReadout>
                Mug moved <StageNumber data-testid="displacement-readout">{moved}</StageNumber>
              </StageReadout>
              <StageStatus>illustrative, not measured</StageStatus>
            </>
          }
        >
          {stage}
        </FigureStage>
      }
      caption="AI can generate convincing 3D scenes, but a robot cannot train in them until someone adds shape, weight and friction underneath."
      method={
        <>
          <p>
            The scene has three layers. The picture is what a renderer or a generative model draws:
            the mug and the table. The physics proxy adds what a solver needs: a collision hull (the
            dashed outline), a mass of {MASS_KG} kilograms and a friction coefficient of{' '}
            {FRICTION_MU}. The simulation layer is the solver, which integrates each push into motion.
            &ldquo;Picture plus physics&rdquo; turns on both; &ldquo;Adjust more&rdquo; switches each
            layer on its own.
          </p>
          <p>
            Each push is an authored impulse held for {CONTACT_TIME_S} seconds, {newtons(defaultForceN)}{' '}
            by default and {MIN_FORCE_N} to {MAX_FORCE_N} newtons with the push-strength slider.
            Friction stops the mug after d = v&sup2;/(2&mu;g), so the default push slides it{' '}
            {formatCentimetres(displacementForForce(defaultForceN))}. The table is{' '}
            {formatCentimetres(TRACK_MAX_M)} long and the mug stops at its end.
          </p>
          <p data-testid="push-test-note">
            <span className="font-medium text-text">{note.title}.</span> {note.body} The numbers are
            authored for this schematic, not measured on a real mug.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current push-test layers"
            description={description}
            states={[
              { label: 'picture', value: onOff(layers.appearance) },
              { label: 'shape, weight and friction', value: onOff(layers.physics) },
              { label: 'physics solver', value: onOff(layers.simulation) },
              { label: 'push strength', value: newtons(forceN) },
              { label: 'moved', value: formatCm(mug.position) },
              { label: 'pushes that moved it', value: String(mug.effectivePushes) },
            ]}
          />
        </>
      }
    />
  );
}
