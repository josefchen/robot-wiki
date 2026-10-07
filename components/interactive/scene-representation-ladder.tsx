'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui';
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
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';
import { CiteRef } from '@/components/article/citation-records';
import {
  BACK_WALL,
  CAPABILITIES,
  CAPABILITY_STATE_TEXT,
  DEFAULT_REPRESENTATION,
  DEFAULT_RESOLUTION_INDEX,
  OCCLUDER,
  REPRESENTATIONS,
  RESOLUTION_CM,
  SCENE_DEPTH_CM,
  SCENE_WIDTH_CM,
  SENSOR,
  THIN_POST,
  TRANSPARENT_BOTTLE,
  TRANSPARENT_DEPTH_BIAS_CM,
  footprint,
  formatBytes,
  formatCount,
  hallucinatedSplats,
  occlusionShadow,
  occupancyCells,
  representationById,
  resolutionCm,
  surfaceSamples,
  type CapabilityState,
  type RepresentationId,
  type SurfaceKind,
} from '@/lib/scene-representation';
import { cx } from '@/lib/utils';

/**
 * SceneRepresentationLadder: one fixed synthetic scene, drawn five times
 * as five representations would actually store it.
 *
 * The two controls are orthogonal by construction, and that is the
 * teaching point rather than an implementation detail. The representation
 * selector changes what the store can ANSWER; the resolution slider
 * changes only what it COSTS and how finely it is drawn. A finer
 * occupancy grid still cannot hand a contact solver a surface normal, and
 * a coarser splat still renders a novel view, so the capability
 * indicators never move with the slider.
 *
 * Roles: stored geometry is state, raw point returns are measurement and
 * the occluder's true outline is the dashed reference. Geometry the sensor
 * did not firmly establish (the thin post, the transparent bottle, splats
 * nobody measured) is drawn hollow and dashed in its own role, so the rule
 * survives greyscale. Occupancy cells take three treatments: occupied is
 * the solid state fill, unknown a dotted structure shade, free an empty
 * outline.
 */

/** Round rendered geometry so the server HTML and the hydrated DOM agree. */
const f = (v: number) => Number(v.toFixed(2));

/** The 300 cm scene sits centred in the 340-unit stage width. */
const MARGIN = (CHART_VIEW_WIDTH - SCENE_WIDTH_CM) / 2;
/**
 * Band above the scene for the panel title and the back-wall name, and
 * below it for the sensor name. Both are sized for the narrowest stage,
 * where the fixed pixel type is largest in viewBox units.
 */
const TITLE_BAND = 30;
const BOTTOM_BAND = 26;
const VIEW_BOX = `${-MARGIN} ${-TITLE_BAND} ${CHART_VIEW_WIDTH} ${SCENE_DEPTH_CM + TITLE_BAND + BOTTOM_BAND}`;

const STATE = roleColour('state');
const MEASUREMENT = roleColour('measurement');
const REFERENCE = roleColour('reference');
const STAGE_GROUND = 'var(--motion-stage)';

const UNMEASURED_DASH = '2.5 2';
const SHADOW_OPACITY = 0.16;
const UNKNOWN_SHADE_OPACITY = 0.3;
const UNKNOWN_DOT_SPACING = 5;
const CELL_LINE_OPACITY = 0.35;

const isUncertain = (kind: SurfaceKind) => kind === 'thin' || kind === 'transparent';
const seriesOf = (kind: SurfaceKind) => (isUncertain(kind) ? 'uncertain' : 'surface');

/** Scene boundary and, for surface stores, the never-observed shadow. */
function SceneFrame({ showShadow }: { showShadow: boolean }) {
  const shadow = occlusionShadow();
  return (
    <g>
      <rect
        data-scene-structure=""
        x={0}
        y={0}
        width={SCENE_WIDTH_CM}
        height={SCENE_DEPTH_CM}
        fill="none"
        stroke={CHART_STRUCTURE.axes}
        strokeOpacity={CHART_STRUCTURE.axesOpacity}
        strokeWidth={CHART_STROKE.structure}
      />
      {showShadow && (
        <polygon
          data-series="unobserved"
          points={shadow.map((p) => `${f(p.x)},${f(p.y)}`).join(' ')}
          fill={CHART_STRUCTURE.labelSecondary}
          fillOpacity={SHADOW_OPACITY}
        />
      )}
    </g>
  );
}

/** Occluder outline and sensor marker, drawn over every panel's data. */
function SceneChrome() {
  return (
    <g>
      <rect
        data-series="occluder"
        x={OCCLUDER.x}
        y={OCCLUDER.y}
        width={OCCLUDER.width}
        height={OCCLUDER.height}
        fill="none"
        stroke={REFERENCE}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      <path
        d={`M ${SENSOR.x - 5} ${SENSOR.y + 3} L ${SENSOR.x + 5} ${SENSOR.y + 3} L ${SENSOR.x} ${SENSOR.y - 6} Z`}
        fill={CHART_STRUCTURE.label}
      />
    </g>
  );
}

function OccupancyPanel({ cellCm, patternId }: { cellCm: number; patternId: string }) {
  const cells = occupancyCells(cellCm);
  const s = UNKNOWN_DOT_SPACING;
  // Cell boundaries are structure, drawn once over the cell fills, so a free
  // cell is the empty space between lines and a name over it sits on no mark.
  const cols = Math.round(Math.max(...cells.map((c) => c.x)) / cellCm) + 1;
  const rows = Math.round(Math.max(...cells.map((c) => c.y)) / cellCm) + 1;
  const gridW = f(cols * cellCm);
  const gridH = f(rows * cellCm);
  const gridLines = [
    ...Array.from({ length: cols + 1 }, (_, i) => `M${f(i * cellCm)} 0V${gridH}`),
    ...Array.from({ length: rows + 1 }, (_, j) => `M0 ${f(j * cellCm)}H${gridW}`),
  ].join('');
  return (
    <g>
      <defs>
        <pattern id={patternId} width={s} height={s} patternUnits="userSpaceOnUse">
          <rect width={s} height={s} fill={CHART_STRUCTURE.labelSecondary} fillOpacity={UNKNOWN_SHADE_OPACITY} />
          <circle cx={s / 2} cy={s / 2} r={0.9} fill={CHART_STRUCTURE.labelSecondary} />
        </pattern>
      </defs>
      <SceneFrame showShadow={false} />
      {cells.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          data-series={cell.state}
          x={f(cell.x)}
          y={f(cell.y)}
          width={f(cell.size)}
          height={f(cell.size)}
          fill={cell.state === 'occupied' ? STATE : cell.state === 'unknown' ? `url(#${patternId})` : 'none'}
        />
      ))}
      <path
        data-scene-structure=""
        d={gridLines}
        fill="none"
        stroke={CHART_STRUCTURE.axes}
        strokeOpacity={CELL_LINE_OPACITY}
        strokeWidth={CHART_STROKE.structure / 2}
      />
      <SceneChrome />
    </g>
  );
}

function SamplePanel({
  spacingCm,
  mode,
}: {
  spacingCm: number;
  mode: 'points' | 'band' | 'mesh';
}) {
  const samples = surfaceSamples(spacingCm);
  // Raw returns are observations; the band and the mesh are stored geometry.
  const tone = mode === 'points' ? MEASUREMENT : STATE;
  return (
    <g>
      <SceneFrame showShadow />
      {mode === 'mesh' &&
        (['wall', 'occluder', 'transparent'] as const).map((kind) => {
          const run = samples.filter((s) => s.kind === kind);
          if (run.length < 2) return null;
          return (
            <polyline
              key={kind}
              data-series={seriesOf(kind)}
              points={run.map((s) => `${f(s.x)},${f(s.y)}`).join(' ')}
              fill="none"
              stroke={STATE}
              strokeWidth={CHART_STROKE.trace}
              strokeDasharray={isUncertain(kind) ? UNMEASURED_DASH : undefined}
            />
          );
        })}
      {mode === 'band' &&
        samples.map((sample, i) => (
          <rect
            key={i}
            data-series={seriesOf(sample.kind)}
            x={f(sample.x - spacingCm * 0.6)}
            y={f(sample.y - spacingCm * 0.6)}
            width={f(spacingCm * 1.2)}
            height={f(spacingCm * 1.2)}
            fill={STATE}
            fillOpacity={isUncertain(sample.kind) ? 0.08 : 0.22}
            stroke={STATE}
            strokeWidth={isUncertain(sample.kind) ? 0.8 : 0.4}
            strokeDasharray={isUncertain(sample.kind) ? UNMEASURED_DASH : undefined}
          />
        ))}
      {samples.map((sample, i) => {
        const uncertain = isUncertain(sample.kind);
        return (
          <circle
            key={`p-${i}`}
            data-series={seriesOf(sample.kind)}
            cx={f(sample.x)}
            cy={f(sample.y)}
            r={f((mode === 'points' ? 1.8 : 1.2) * (uncertain ? 1.7 : 1))}
            fill={uncertain ? 'none' : tone}
            stroke={uncertain ? tone : 'none'}
            strokeWidth={0.7}
            strokeDasharray={uncertain ? UNMEASURED_DASH : undefined}
          />
        );
      })}
      <SceneChrome />
    </g>
  );
}

function SplatPanel({ spacingCm }: { spacingCm: number }) {
  const samples = surfaceSamples(spacingCm);
  const invented = hallucinatedSplats(spacingCm);
  return (
    <g>
      <SceneFrame showShadow={false} />
      {invented.map((point, i) => (
        <ellipse
          key={`h-${i}`}
          data-series="uncertain"
          cx={f(point.x)}
          cy={f(point.y)}
          rx={f(spacingCm * 0.9)}
          ry={f(spacingCm * 0.55)}
          fill={STATE}
          fillOpacity={0.12}
          stroke={STATE}
          strokeWidth={0.8}
          strokeDasharray={UNMEASURED_DASH}
        />
      ))}
      {samples.map((sample, i) => {
        const uncertain = isUncertain(sample.kind);
        return (
          <ellipse
            key={`s-${i}`}
            data-series={seriesOf(sample.kind)}
            cx={f(sample.x)}
            cy={f(sample.y)}
            rx={f(spacingCm * 0.8)}
            ry={f(spacingCm * 0.45)}
            fill={STATE}
            fillOpacity={uncertain ? 0.18 : 0.5}
            stroke={uncertain ? STATE : 'none'}
            strokeWidth={0.8}
            strokeDasharray={uncertain ? UNMEASURED_DASH : undefined}
          />
        );
      })}
      <SceneChrome />
      {/* Names the invented region from below the occluder, where the
          splats stop, rather than across the blobs it points at, and below
          the thin post's name. */}
      <SceneNote
        x={OCCLUDER.x + OCCLUDER.width / 2}
        y={OCCLUDER.y + OCCLUDER.height + 48}
        anchor="middle"
        fill={STATE}
      >
        rendered, never measured
      </SceneNote>
    </g>
  );
}

/**
 * An in-scene name. The stroke in the stage ground knocks the text out of
 * any cell or sample behind it, so the name stays legible over the data.
 */
function SceneNote({
  x,
  y,
  anchor = 'start',
  fill = CHART_STRUCTURE.labelSecondary,
  children,
}: {
  x: number;
  y: number;
  anchor?: 'start' | 'middle' | 'end';
  fill?: string;
  children: string;
}) {
  return (
    <text
      data-scene-note=""
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={CHART_TYPE.axisPx}
      fill={fill}
      stroke={STAGE_GROUND}
      strokeWidth={3}
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {children}
    </text>
  );
}

const PANEL_LABEL: Record<RepresentationId, string> = {
  'point-cloud':
    'Plan view of the scene as a point cloud: one sample per returned ray, drawn as a filled dot on opaque surfaces and as a hollow dashed ring on the thin post and the transparent bottle, and nothing at all behind the occluder',
  'occupancy-grid':
    'Plan view of the scene as an occupancy grid: free, occupied and unknown cells, with the region behind the occluder held as unknown',
  tsdf: 'Plan view of the scene as a truncated signed-distance field: a narrow band of voxels straddling each observed surface, outlined with a dashed edge over the thin post and the transparent bottle',
  mesh: 'Plan view of the scene as a triangle mesh: connected surface runs, dashed where the surface is thin or transparent, with a hole where nothing was observed',
  'gaussian-splat':
    'Plan view of the scene as a Gaussian splat: solid blobs on the observed surfaces, and dashed hollow blobs filling the region behind the occluder that were rendered but never measured',
};

type SwatchKind =
  | 'cell-occupied' | 'cell-unknown' | 'cell-free' | 'shade' | 'dot' | 'ring'
  | 'band' | 'band-dashed' | 'line' | 'line-dashed' | 'blob' | 'blob-dashed' | 'outline';

const UNOBSERVED = { series: 'unobserved', kind: 'shade', label: 'never observed' } as const;
const OUTLINE = { series: 'occluder', kind: 'outline', label: 'occluder outline' } as const;
const UNCERTAIN = 'not firmly measured';

const LEGEND: Record<RepresentationId, readonly { series: string; kind: SwatchKind; label: string }[]> = {
  'occupancy-grid': [
    { series: 'occupied', kind: 'cell-occupied', label: 'occupied' },
    { series: 'unknown', kind: 'cell-unknown', label: 'unknown' },
    { series: 'free', kind: 'cell-free', label: 'free' },
    OUTLINE,
  ],
  'point-cloud': [
    { series: 'surface', kind: 'dot', label: 'returned sample' },
    { series: 'uncertain', kind: 'ring', label: UNCERTAIN },
    UNOBSERVED,
    OUTLINE,
  ],
  tsdf: [
    { series: 'surface', kind: 'band', label: 'voxel band' },
    { series: 'uncertain', kind: 'band-dashed', label: UNCERTAIN },
    UNOBSERVED,
    OUTLINE,
  ],
  mesh: [
    { series: 'surface', kind: 'line', label: 'surface run' },
    { series: 'uncertain', kind: 'line-dashed', label: UNCERTAIN },
    UNOBSERVED,
    OUTLINE,
  ],
  'gaussian-splat': [
    { series: 'surface', kind: 'blob', label: 'observed splat' },
    { series: 'uncertain', kind: 'blob-dashed', label: UNCERTAIN },
    OUTLINE,
  ],
};

/** A legend swatch repeating the panel's own mark for each entry. */
function SceneSwatch({ kind }: { kind: SwatchKind }) {
  if (kind === 'dot') return <LegendSwatch role="measurement" mark="dot" />;
  if (kind === 'band') return <LegendSwatch role="state" mark="band" />;
  if (kind === 'line') return <LegendSwatch role="state" mark="line" />;
  if (kind === 'outline') return <LegendSwatch role="reference" mark="dash" />;
  const h = CHART_TYPE.tickPx;
  const w = h * 2;
  const grid = { stroke: CHART_STRUCTURE.axes, strokeOpacity: CELL_LINE_OPACITY, strokeWidth: 1 };
  const dashed = { fill: 'none', strokeWidth: 1, strokeDasharray: UNMEASURED_DASH };
  return (
    <svg aria-hidden="true" focusable="false" width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      {kind === 'cell-occupied' && <rect x={0.5} y={0.5} width={w - 1} height={h - 1} fill={STATE} {...grid} />}
      {kind === 'cell-free' && <rect x={0.5} y={0.5} width={w - 1} height={h - 1} fill="none" {...grid} />}
      {kind === 'cell-unknown' && (
        <g>
          <rect x={0.5} y={0.5} width={w - 1} height={h - 1} fill={CHART_STRUCTURE.labelSecondary} fillOpacity={UNKNOWN_SHADE_OPACITY} {...grid} />
          {[w / 4, w / 2, (3 * w) / 4].map((cx) => (
            <circle key={cx} cx={cx} cy={h / 2} r={0.9} fill={CHART_STRUCTURE.labelSecondary} />
          ))}
        </g>
      )}
      {kind === 'shade' && <rect x={0} y={0} width={w} height={h} fill={CHART_STRUCTURE.labelSecondary} fillOpacity={SHADOW_OPACITY * 2} />}
      {kind === 'ring' && <circle cx={w / 2} cy={h / 2} r={h / 2 - 2} stroke={MEASUREMENT} {...dashed} />}
      {kind === 'band-dashed' && <rect x={1} y={1} width={w - 2} height={h - 2} stroke={STATE} {...dashed} />}
      {kind === 'line-dashed' && <path d={`M1 ${h / 2} H${w - 1}`} stroke={STATE} {...dashed} strokeWidth={CHART_STROKE.trace} />}
      {kind === 'blob' && <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 2} fill={STATE} fillOpacity={0.5} />}
      {kind === 'blob-dashed' && <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 2} stroke={STATE} {...dashed} />}
    </svg>
  );
}

function Panel({
  id,
  spacingCm,
  describedBy,
  patternId,
}: {
  id: RepresentationId;
  spacingCm: number;
  describedBy: string;
  patternId: string;
}) {
  return (
    <PlotStage
      viewBox={VIEW_BOX}
      aria-label={PANEL_LABEL[id]}
      aria-describedby={describedBy}
      data-testid={`scene-panel-${id}`}
    >
      <text
        data-chart-label=""
        x={0}
        y={-9}
        fontSize={CHART_TYPE.labelPx}
        fill={CHART_STRUCTURE.label}
      >
        {representationById(id).short}
      </text>
      <SceneNote x={BACK_WALL.x + BACK_WALL.width} y={-9} anchor="end">
        back wall
      </SceneNote>
      {id === 'occupancy-grid' && <OccupancyPanel cellCm={spacingCm} patternId={patternId} />}
      {id === 'point-cloud' && <SamplePanel spacingCm={spacingCm} mode="points" />}
      {id === 'tsdf' && <SamplePanel spacingCm={spacingCm} mode="band" />}
      {id === 'mesh' && <SamplePanel spacingCm={spacingCm} mode="mesh" />}
      {id === 'gaussian-splat' && <SplatPanel spacingCm={spacingCm} />}
      {/* Object names sit below their objects, clear of the samples, bands
          and splats every representation draws around them at every
          spacing: the bottle's returns land behind it, nearer the wall. */}
      <SceneNote x={TRANSPARENT_BOTTLE.x} y={TRANSPARENT_BOTTLE.y + TRANSPARENT_BOTTLE.height + 18}>
        transparent
      </SceneNote>
      <SceneNote
        x={THIN_POST.x + THIN_POST.width / 2}
        y={THIN_POST.y + THIN_POST.height + 34}
        anchor="middle"
      >
        thin post
      </SceneNote>
      <SceneNote x={SENSOR.x} y={SCENE_DEPTH_CM + CHART_TYPE.axisPx + 2} anchor="middle">
        sensor
      </SceneNote>
    </PlotStage>
  );
}

/** The row border repeats the answer without colour: all, some, none. */
const STATE_LINE: Record<CapabilityState, string> = {
  yes: 'border-2 border-solid border-text text-text',
  partial: 'border border-solid border-text text-text',
  no: 'border border-dashed border-text-dim text-text-dim',
};

export function SceneRepresentationLadder({
  className,
}: {
  className?: string;
}) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const patternId = `scene-unknown-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [selectedId, setSelectedId] = useState<RepresentationId>(
    DEFAULT_REPRESENTATION,
  );
  const [resolutionIndex, setResolutionIndex] = useState(
    DEFAULT_RESOLUTION_INDEX,
  );

  const selected = representationById(selectedId);
  const cellCm = resolutionCm(resolutionIndex);
  const cost = footprint(selectedId, cellCm);

  const reset = () => {
    setSelectedId(DEFAULT_REPRESENTATION);
    setResolutionIndex(DEFAULT_RESOLUTION_INDEX);
  };

  const answered = CAPABILITIES.filter(
    (c) => selected.capabilities[c.id].state === 'yes',
  ).length;

  // Built in this order so each accessible name keeps its source ordinal
  // in the sealed baseline: selector, slider, capability list, then reset.
  const selector = (
    <div
      role="group"
      aria-label="Scene representations"
      className="flex flex-wrap gap-1"
    >
      {REPRESENTATIONS.map((rep) => {
        const active = rep.id === selectedId;
        return (
          <button
            data-brand-control-id="control:selection"
            key={rep.id}
            type="button"
            aria-pressed={active}
            aria-label={`${rep.short}: stores ${rep.stores}`}
            data-testid={`scene-select-${rep.id}`}
            onClick={() => setSelectedId(rep.id)}
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            {rep.short}
          </button>
        );
      })}
    </div>
  );

  const resolution = (
    <ControlField>
      <ControlLabel
        htmlFor={`${uid}-resolution`}
        value={<span data-testid="scene-resolution-value">{cellCm} cm</span>}
      >
        Resolution
      </ControlLabel>
      <input
        id={`${uid}-resolution`}
        type="range"
        data-brand-control-id="control:input"
        min={0}
        max={RESOLUTION_CM.length - 1}
        step={1}
        value={resolutionIndex}
        onChange={(e) => setResolutionIndex(Number(e.target.value))}
        aria-label={`Resolution, currently ${cellCm} centimetres per cell`}
        aria-valuetext={`${cellCm} centimetres per cell`}
        data-testid="scene-resolution-slider"
        className={INSTRUMENT_SLIDER_CLASS}
      />
    </ControlField>
  );

  // Lists on the stage are role lists: the article's prose list indent and
  // item rhythm would otherwise reach into the figure.
  const answers = (
    <div
      role="list"
      aria-label="What this representation can answer"
      data-testid="scene-capabilities"
      className="grid gap-1.5"
    >
      {CAPABILITIES.map((capability) => {
        const graded = selected.capabilities[capability.id];
        return (
          <div
            role="listitem"
            key={capability.id}
            data-testid={`scene-capability-${capability.id}`}
            data-brand-surface-id="surface:flat"
            data-state={graded.state}
            aria-label={`${capability.label}: ${CAPABILITY_STATE_TEXT[graded.state]}`}
            className={cx(
              'rounded-xs px-2 py-1.5 font-sans text-[13px] leading-snug',
              STATE_LINE[graded.state],
            )}
          >
            {capability.label}:{' '}
            <span
              data-testid={`scene-capability-state-${capability.id}`}
              className="font-medium"
            >
              {CAPABILITY_STATE_TEXT[graded.state]}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <InstrumentFigure
      figureId="scene-representation-ladder"
      data-testid="scene-ladder"
      className={className}
      heading="One scene, five representations"
      controls={
        <>
          {selector}
          {resolution}
          <InstrumentReset
            onClick={reset}
            aria-label="Reset the representation and resolution to their opening values"
          />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                {LEGEND[selectedId].map((entry) => (
                  <LegendItem
                    key={entry.series}
                    series={entry.series}
                    swatch={<SceneSwatch kind={entry.kind} />}
                  >
                    {entry.label}
                  </LegendItem>
                ))}
              </InstrumentLegend>
              <p
                data-testid="scene-live-summary"
                aria-live="polite"
                className="w-full font-sans text-[13px] leading-snug text-text-dim"
              >
                <span className="text-text">
                  {selected.article === 'a' ? 'A' : 'An'} {selected.name}
                </span>{' '}
                stores: {selected.stores} Behind the occluder it holds:{' '}
                {selected.unobserved}
              </p>
              <div role="list" className="grid w-full gap-1 font-sans text-[13px] leading-snug text-text-dim">
                {CAPABILITIES.map((capability) => (
                  <div role="listitem" key={capability.id}>
                    <span className="text-text">{capability.label}:</span>{' '}
                    {selected.capabilities[capability.id].note}.
                  </div>
                ))}
              </div>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current representation, resolution and footprint"
                description={`Stored as ${selected.article} ${selected.name} at ${cellCm} cm, the same scene costs ${formatBytes(cost.bytes)} across ${formatCount(cost.elements)} ${cost.elementName}, and answers ${answered} of the 3 queries: free space ${CAPABILITY_STATE_TEXT[selected.capabilities['free-space'].state]}, a contact normal ${CAPABILITY_STATE_TEXT[selected.capabilities['contact-normal'].state]}, a novel view ${CAPABILITY_STATE_TEXT[selected.capabilities['novel-view'].state]}.`}
                states={[
                  { label: 'representation', value: selected.short },
                  { label: 'resolution', value: `${cellCm} cm` },
                  { label: 'footprint', value: formatBytes(cost.bytes) },
                  { label: cost.elementName, value: formatCount(cost.elements) },
                  { label: 'answers', value: `${answered} of 3` },
                ]}
              />
            </>
          }
        >
          {/* The panel keeps its own container so its type scale follows
              the panel's width, not the two-column row it sits in. */}
          <div className="@container">
            <div className="grid items-start gap-4 @min-[34rem]:grid-cols-[minmax(0,1fr)_minmax(11rem,13rem)]">
              <div data-brand-surface-id="surface:flat" className="@container">
                <Panel
                  id={selectedId}
                  spacingCm={cellCm}
                  describedBy={descriptionId}
                  patternId={patternId}
                />
              </div>
              {/* The answers and footprint are a readout band of the stage,
                  beside the drawing when there is room and under it when not. */}
              <div
                data-figure-stage-band="aside"
                className="grid content-start gap-3 px-3 pb-1 @min-[34rem]:pl-0 @min-[34rem]:pt-3"
              >
                {answers}
                <InstrumentReadout>
                  <span className="text-text-dim">Footprint</span>{' '}
                  <span data-testid="scene-footprint-readout">
                    {formatBytes(cost.bytes)}
                  </span>
                  <span className="block text-text-dim">
                    <span data-testid="scene-elements-readout" className="text-text">
                      {formatCount(cost.elements)} {cost.elementName}
                    </span>{' '}
                    at {cellCm} cm
                  </span>
                </InstrumentReadout>
              </div>
            </div>
          </div>
        </FigureStage>
      }
      caption="The representation sets which of the three queries the store answers; resolution changes only cost and detail."
      source={
        <>
          Synthetic scene: a 3.0 by 3.0 by 2.0 m cell holding a 2 cm post, a
          transparent bottle and an occluder, with the sensor at the near
          edge. Footprints come from declared storage models, volumetric
          stores billed over the whole volume and surface stores over the
          observed area only, which is why a narrow-band signed-distance field
          holds fewer cells than the occupancy grid it resembles and its cost
          grows more slowly as the spacing shrinks{' '}
          <CiteRef id="curless-levoy-1996" />. The bottle is drawn{' '}
          {TRANSPARENT_DEPTH_BIAS_CM} cm behind its true face, where a depth
          sensor reports it, and the thin post survives only while the
          spacing resolves it. Behind the occluder the occupancy grid keeps an
          explicit unknown, where the Gaussian splat renders geometry nothing
          measured <CiteRef id="moravec-elfes-1985" />.
        </>
      }
    />
  );
}
