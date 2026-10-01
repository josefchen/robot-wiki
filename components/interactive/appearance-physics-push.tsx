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
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  DirectLabel,
  LegendSwatch,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
  roleColour,
} from '@/components/motion/chart';
import {
  DEFAULT_FORCE_N,
  FRICTION_MU,
  INITIAL_LAYERS,
  INITIAL_MUG,
  MASS_KG,
  MAX_FORCE_N,
  MIN_FORCE_N,
  TRACK_MAX_M,
  type LayerState,
  applyPush,
  formatCm,
  pushTestNote,
  setLayer,
} from '@/lib/appearance-physics-push';

/**
 * One scene, three layers: the appearance layer renders the mug and table,
 * the physics proxy adds collision geometry, mass and friction, and the
 * simulation layer shows the integrated result. With only appearance on, a
 * push changes nothing; with the proxy on, the same push moves the mug.
 */
type AppearancePhysicsPushProps = {
  /** Initial push force in newtons. Default 4. */
  defaultForceN?: number;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 106;
const TABLE = { left: 16, right: WIDTH - 16, y: 92 };
const SLAB_HEIGHT = 8;
const MUG_W = 30;
const MUG_H = 38;
const HULL_PAD = 4;
const TRACK_X0 = 80;
const TRACK_X1 = 270;
// Row baselines: the simulation row on top, the collision-proxy row above
// the hull. Each keeps a label clear of the marks below it.
const SIM_ROW_Y = 22;
const SIM_ARROW_Y = 17;
const PROXY_ROW_Y = 44;
const PUSH_Y = TABLE.y - 14;
const HEAD = 7;

/** Mug left edge in stage units for a track position in meters. */
function mugX(positionM: number): number {
  return TRACK_X0 + (positionM / TRACK_MAX_M) * (TRACK_X1 - TRACK_X0);
}

function formatN(force: number): string {
  return `${force.toFixed(1)} N`;
}

function StageNote({ x, y, anchor = 'start', children, testId }: {
  x: number;
  y: number;
  anchor?: 'start' | 'middle' | 'end';
  children: string;
  testId?: string;
}) {
  return (
    <text
      data-testid={testId}
      data-scene-note=""
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={CHART_TYPE.axisPx}
      fill={CHART_STRUCTURE.labelSecondary}
    >
      {children}
    </text>
  );
}

/** A horizontal arrow in one role: a shaft and a filled head at x2. */
function Arrow({ x1, x2, y, role }: { x1: number; x2: number; y: number; role: 'action' | 'state' }) {
  const colour = roleColour(role);
  return (
    <>
      <line
        data-chart-role={role}
        x1={x1}
        x2={x2 - HEAD + 1}
        y1={y}
        y2={y}
        stroke={colour}
        strokeWidth={CHART_STROKE.trace}
      />
      <polygon
        data-chart-role={role}
        points={`${x2},${y} ${x2 - HEAD},${y - HEAD / 1.6} ${x2 - HEAD},${y + HEAD / 1.6}`}
        fill={colour}
      />
    </>
  );
}

export function AppearancePhysicsPush({
  defaultForceN = DEFAULT_FORCE_N,
  className,
}: AppearancePhysicsPushProps) {
  const descriptionId = `${useId()}-description`;
  const [layers, setLayers] = useState<LayerState>(INITIAL_LAYERS);
  const [mug, setMug] = useState(INITIAL_MUG);
  const [forceN, setForceN] = useState(defaultForceN);

  const note = pushTestNote(layers);
  const idleAttempts = mug.attempts - mug.effectivePushes;
  const atTrackEnd = mug.position >= TRACK_MAX_M - 1e-9;

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
  const start = mugX(0) + MUG_W / 2;
  const centre = x + MUG_W / 2;
  const forceLen = 8 + forceN * 5;
  // The proxy label rides above the mug but stays inside the stage at the
  // track end.
  const proxyLabelX = Math.min(Math.max(centre, 76), 262);
  const state = roleColour('state');
  const constraint = roleColour('constraint');

  const layerButtons: Array<{ id: keyof LayerState; label: string }> = [
    { id: 'appearance', label: 'appearance' },
    { id: 'physics', label: 'physics proxy' },
    { id: 'simulation', label: 'simulation' },
  ];

  const stage = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label={`Three-layer scene. Appearance layer ${layers.appearance ? 'on' : 'off'}, physics proxy ${layers.physics ? 'on' : 'off'}, simulation layer ${layers.simulation ? 'on' : 'off'}. Mug displacement ${formatCm(mug.position)} after ${mug.effectivePushes} effective pushes.`}
      aria-describedby={descriptionId}
    >
      {!layers.simulation ? (
        <StageNote x={TABLE.left} y={SIM_ROW_Y}>simulation layer off</StageNote>
      ) : layers.physics ? (
        <>
          <DirectLabel x={start - 7} y={SIM_ROW_Y} role="state" anchor="end">
            d = {formatCm(mug.position)}
          </DirectLabel>
          {centre - start >= HEAD + 3 ? (
            <g data-series="displacement">
              <Arrow x1={start} x2={centre} y={SIM_ARROW_Y} role="state" />
            </g>
          ) : null}
        </>
      ) : (
        <StageNote testId="no-dynamics-marker" x={TABLE.left} y={SIM_ROW_Y}>
          no dynamics to integrate
        </StageNote>
      )}

      {layers.physics ? (
        <DirectLabel x={proxyLabelX} y={PROXY_ROW_Y} role="constraint" anchor="middle">
          m = {MASS_KG.toFixed(1)} kg, μ = {FRICTION_MU.toFixed(1)}
        </DirectLabel>
      ) : (
        <StageNote x={proxyLabelX} y={PROXY_ROW_Y} anchor="middle">
          no collision hull
        </StageNote>
      )}

      {layers.appearance ? (
        <line
          data-testid="table-appearance"
          data-scene-structure="table"
          x1={TABLE.left}
          x2={TABLE.right}
          y1={TABLE.y}
          y2={TABLE.y}
          stroke={CHART_STRUCTURE.axes}
          strokeWidth={CHART_STROKE.trace}
          opacity={CHART_STRUCTURE.axesOpacity}
        />
      ) : null}

      {layers.physics ? (
        <rect
          data-testid="collision-slab"
          data-series="collision-slab"
          data-chart-role="constraint"
          x={TABLE.left}
          y={TABLE.y}
          width={TABLE.right - TABLE.left}
          height={SLAB_HEIGHT}
          fill="none"
          stroke={constraint}
          strokeWidth={CHART_STROKE.reference}
          strokeDasharray={CHART_STROKE.dash}
        />
      ) : null}

      {layers.simulation
        ? mug.history.slice(0, -1).map((p, i) => (
            <rect
              key={i}
              data-testid="motion-ghost"
              data-series="motion-ghost"
              data-chart-role="state"
              x={mugX(p)}
              y={TABLE.y - MUG_H}
              width={MUG_W}
              height={MUG_H}
              fill={state}
              fillOpacity={CHART_UNCERTAINTY.fillAlpha}
            />
          ))
        : null}

      <g data-testid="force-arrow" data-series="push">
        <Arrow x1={x - 6 - forceLen} x2={x - 6} y={PUSH_Y} role="action" />
      </g>

      <g data-testid="mug" transform={`translate(${x} 0)`}>
        {layers.appearance ? (
          <g data-testid="mug-appearance" data-series="mug" data-chart-role="state">
            <rect x={0} y={TABLE.y - MUG_H} width={MUG_W} height={MUG_H} fill={state} />
            <path
              d={`M${MUG_W} ${TABLE.y - MUG_H + 8}h6a8 8 0 0 1 0 16h-6`}
              fill="none"
              stroke={state}
              strokeWidth={CHART_STROKE.trace}
            />
          </g>
        ) : null}
        {layers.physics ? (
          <rect
            data-testid="collision-hull"
            data-series="collision-hull"
            data-chart-role="constraint"
            x={-HULL_PAD}
            y={TABLE.y - MUG_H - HULL_PAD}
            width={MUG_W + 2 * HULL_PAD}
            height={MUG_H + HULL_PAD}
            fill="none"
            stroke={constraint}
            strokeWidth={CHART_STROKE.reference}
            strokeDasharray={CHART_STROKE.dash}
          />
        ) : null}
      </g>
    </PlotStage>
  );

  return (
    <InstrumentFigure
      figureId="appearance-physics-push"
      className={className}
      heading="A rendered scene needs a solver to answer a push"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor="ap-force" value={formatN(forceN)}>
              Push force
            </ControlLabel>
            <input
              id="ap-force"
              type="range"
              data-brand-control-id="control:input"
              min={MIN_FORCE_N}
              max={MAX_FORCE_N}
              step={1}
              value={forceN}
              onChange={(e) => setForceN(Number(e.target.value))}
              aria-label={`Push force in newtons, currently ${formatN(forceN)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={push}
            disabled={atTrackEnd && layers.physics}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Push the mug
          </button>
          <div role="group" aria-label="Layers" className="flex flex-wrap gap-2">
            {layerButtons.map((b) => (
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
              <InstrumentLegend>
                <LegendItem series="mug" swatch={<LegendSwatch role="state" mark="bar" />}>
                  rendered mug
                </LegendItem>
                <LegendItem series="motion-ghost" swatch={<LegendSwatch role="state" mark="band" />}>
                  earlier positions
                </LegendItem>
                <LegendItem series="push" swatch={<LegendSwatch role="action" mark="line" />}>
                  push, length set by force
                </LegendItem>
                <LegendItem series="collision-hull" swatch={<LegendSwatch role="constraint" mark="dash" />}>
                  collision proxy
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                mug displacement ={' '}
                <span data-testid="displacement-readout" style={{ color: state }}>
                  {formatCm(mug.position)}
                </span>{' '}
                after <span data-testid="push-count-readout">{mug.effectivePushes}</span> effective{' '}
                {mug.effectivePushes === 1 ? 'push' : 'pushes'}
                {idleAttempts > 0
                  ? ` (${idleAttempts} ${idleAttempts === 1 ? 'attempt' : 'attempts'} did nothing)`
                  : null}
              </InstrumentReadout>
              <div
                data-testid="push-test-note"
                className="basis-full font-sans text-[13px] leading-snug text-text-dim"
              >
                <span className="font-medium text-text">{note.title}.</span> {note.body}
              </div>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current push-test layers"
                description={
                  layers.physics
                    ? `Physics proxy is on, so a ${formatN(forceN)} impulse can move the mug: appearance ${layers.appearance ? 'renders' : 'is hidden'} and simulation ${layers.simulation ? 'integrates' : 'is off'}, current displacement ${formatCm(mug.position)} after ${mug.effectivePushes} effective pushes.`
                    : `Appearance ${layers.appearance ? 'is on' : 'is off'} and simulation ${layers.simulation ? 'is on' : 'is off'}, physics proxy is off, so a ${formatN(forceN)} push leaves the mug at ${formatCm(mug.position)} of displacement; the pixels have no mass until the physics proxy supplies a collision hull.`
                }
                states={[
                  { label: 'appearance', value: layers.appearance ? 'on' : 'off' },
                  { label: 'physics proxy', value: layers.physics ? 'on' : 'off' },
                  { label: 'simulation', value: layers.simulation ? 'on' : 'off' },
                  { label: 'force', value: formatN(forceN) },
                  { label: 'displacement', value: formatCm(mug.position) },
                ]}
              />
            </>
          }
        >
          <div className="@container">{stage}</div>
        </FigureStage>
      }
      caption="The same push moves the mug only when a physics proxy supplies collision geometry, friction and a solver."
      source="Schematic with an authored impulse and friction model: a 0.3 kg mug, μ = 0.5 and a 0.1 s push."
    />
  );
}
