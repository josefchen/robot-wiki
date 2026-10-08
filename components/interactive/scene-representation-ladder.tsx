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
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  StageAnnotation,
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
  type CapabilityId,
  type CapabilityState,
  type RepresentationId,
  type SurfaceKind,
} from '@/lib/scene-representation';
import { cx } from '@/lib/utils';

/**
 * SceneRepresentationLadder: one small room seen from above, stored five
 * ways. Faint drawings of the real objects (the back wall, a box, a thin
 * post, a glass bottle and the camera) sit under every representation, so
 * the reader can compare what was stored against what is there.
 *
 * The two controls are orthogonal by construction, and that is the
 * teaching point rather than an implementation detail. The representation
 * selector changes what the store can ANSWER; the Detail slider changes
 * only what it COSTS and how finely it is drawn. A finer occupancy grid
 * still cannot hand a contact solver a surface normal, and a coarser splat
 * still renders a novel view, so the three answers never move with the
 * slider.
 *
 * Roles: stored geometry is state, raw point returns are measurement.
 * Geometry the sensor did not firmly establish (the thin post, the glass
 * bottle, splats nobody measured) is drawn hollow and dashed, so the rule
 * survives greyscale. The one annotation points at the region hidden
 * behind the box and says what each representation keeps there.
 */

/** Round rendered geometry so the server HTML and the hydrated DOM agree. */
const f = (v: number) => Number(v.toFixed(2));

/** The 300 cm scene sits centred in the 340-unit stage width. */
const MARGIN = (CHART_VIEW_WIDTH - SCENE_WIDTH_CM) / 2;
/**
 * A band above the room for the back wall's name and a sliver below it
 * for the camera's body. Sized for the narrowest stage, where the fixed
 * pixel type is largest in viewBox units.
 */
const TITLE_BAND = 22;
const BOTTOM_BAND = 8;
const SCENE_VIEW_HEIGHT = SCENE_DEPTH_CM + TITLE_BAND + BOTTOM_BAND;
const VIEW_BOX = `${-MARGIN} ${-TITLE_BAND} ${CHART_VIEW_WIDTH} ${SCENE_VIEW_HEIGHT}`;

const STATE = roleColour('state');
const MEASUREMENT = roleColour('measurement');
const STAGE_GROUND = 'var(--motion-stage)';
const INK = CHART_STRUCTURE.label;

const UNMEASURED_DASH = '2.5 2';
const SHADOW_OPACITY = 0.2;
const OCCUPIED_OPACITY = 0.6;
const UNKNOWN_SHADE_OPACITY = 0.42;
const UNKNOWN_DOT_SPACING = 5;
const CELL_LINE_OPACITY = 0.35;
/** The real objects: present on every panel, quieter than any data mark. */
const ROOM_OPACITY = 0.55;

const isUncertain = (kind: SurfaceKind) => kind === 'thin' || kind === 'transparent';
const seriesOf = (kind: SurfaceKind) => (isUncertain(kind) ? 'uncertain' : 'surface');

const BOTTLE = {
  cx: TRANSPARENT_BOTTLE.x + TRANSPARENT_BOTTLE.width / 2,
  cy: TRANSPARENT_BOTTLE.y + TRANSPARENT_BOTTLE.height / 2,
  r: TRANSPARENT_BOTTLE.width / 2,
};
const POST = {
  cx: THIN_POST.x + THIN_POST.width / 2,
  cy: THIN_POST.y + THIN_POST.height / 2,
};

/**
 * A point inside the region hidden behind the box that falls in an
 * "unknown" cell at every grid spacing on the slider, so the annotation's
 * arrow always ends on the dotted patch.
 */
const HIDDEN_TARGET: [number, number] = [78, 64];
const NOTE_X = 4;
const NOTE_Y = 146;
const NOTE_FROM: [number, number] = [36, 133];

/** The plain name on each tab; the technical name stays in the data. */
const PLAIN_NAME: Record<RepresentationId, string> = {
  'point-cloud': 'Dots',
  'occupancy-grid': 'Grid of boxes',
  tsdf: 'Distance map',
  mesh: 'Triangle skin',
  'gaussian-splat': 'Soft blobs',
};

/** The slider's current spacing, in the words of the selected store. */
const SPACING_WORDS: Record<RepresentationId, readonly [string, string]> = {
  'point-cloud': ['a dot every', ''],
  'occupancy-grid': ['boxes', 'wide'],
  tsdf: ['boxes', 'wide'],
  mesh: ['a corner every', ''],
  'gaussian-splat': ['a blob every', ''],
};

/** What each store keeps in the region the camera never saw. */
const HIDDEN_NOTE: Record<RepresentationId, readonly string[]> = {
  'point-cloud': ['Hidden behind the box: no dots,', 'which looks the same as empty'],
  'occupancy-grid': ['Hidden behind the box:', 'marked ‘unknown’, not ‘empty’'],
  tsdf: ['Hidden behind the box:', 'kept as ‘unknown’'],
  mesh: ['Hidden behind the box:', 'a hole in the skin'],
  'gaussian-splat': ['Hidden behind the box:', 'blobs rendered, never measured'],
};

/** The three questions, in a reader's words. */
const QUESTION: Record<CapabilityId, string> = {
  'free-space': 'Can the robot move here?',
  'contact-normal': 'Which way does the surface face?',
  'novel-view': 'What does it look like from here?',
};

const ANSWER_TEXT: Record<CapabilityState, string> = {
  yes: 'Yes',
  partial: 'Only after work',
  no: 'No',
};

/**
 * An in-scene name. The stroke in the stage ground knocks the text out of
 * any cell or sample behind it, so the name stays legible over the data.
 */
function SceneNote({
  x,
  y,
  anchor = 'start',
  children,
}: {
  x: number;
  y: number;
  anchor?: 'start' | 'middle' | 'end';
  children: string;
}) {
  return (
    <text
      data-scene-note=""
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={CHART_TYPE.axisPx}
      fill={INK}
      stroke={STAGE_GROUND}
      strokeWidth={3}
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {children}
    </text>
  );
}

/** Room boundary and, for surface stores, the never-observed shadow. */
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

/**
 * The real room, seen from above, drawn faintly over every store: a wall
 * strip, a cardboard box with its seam, a glass bottle with its neck, the
 * thin post and the camera looking up into the room. Only outlines, so
 * the stored marks underneath stay readable.
 */
function RoomDrawing() {
  const line = { fill: 'none', stroke: INK, strokeWidth: CHART_STROKE.structure * 1.5 };
  const { x: sx, y: sy } = SENSOR;
  return (
    <g data-series="room" data-testid="scene-room" opacity={ROOM_OPACITY} aria-hidden="true">
      <rect
        x={BACK_WALL.x}
        y={BACK_WALL.y}
        width={BACK_WALL.width}
        height={BACK_WALL.height}
        {...line}
        fill={INK}
        fillOpacity={0.18}
      />
      <g data-scene-object="box">
        <rect x={OCCLUDER.x} y={OCCLUDER.y} width={OCCLUDER.width} height={OCCLUDER.height} rx={1} {...line} />
        <line
          x1={OCCLUDER.x}
          y1={OCCLUDER.y + OCCLUDER.height / 2}
          x2={OCCLUDER.x + OCCLUDER.width}
          y2={OCCLUDER.y + OCCLUDER.height / 2}
          {...line}
        />
      </g>
      <g data-scene-object="bottle">
        <circle cx={BOTTLE.cx} cy={BOTTLE.cy} r={BOTTLE.r} {...line} />
        <circle cx={BOTTLE.cx} cy={BOTTLE.cy} r={BOTTLE.r / 3} {...line} />
      </g>
      <circle data-scene-object="post" cx={POST.cx} cy={POST.cy} r={1.6} fill={INK} />
      <g data-scene-object="camera">
        <rect x={sx - 11} y={sy - 5} width={22} height={11} rx={2} {...line} fill={STAGE_GROUND} />
        <rect x={sx - 5} y={sy - 11} width={10} height={6} rx={1} {...line} fill={INK} />
      </g>
    </g>
  );
}

/** The names of the real objects, set beside them clear of every store. */
function RoomNames() {
  return (
    <g>
      <SceneNote x={BACK_WALL.x + BACK_WALL.width} y={-7} anchor="end">
        back wall
      </SceneNote>
      <SceneNote x={OCCLUDER.x + OCCLUDER.width / 2} y={OCCLUDER.y + OCCLUDER.height + 15} anchor="middle">
        box
      </SceneNote>
      <SceneNote x={POST.cx} y={POST.cy + 17} anchor="middle">
        thin post
      </SceneNote>
      <text
        data-scene-note=""
        x={BOTTLE.cx + BOTTLE.r + 12}
        y={BOTTLE.cy - 2}
        fontSize={CHART_TYPE.axisPx}
        fill={INK}
        stroke={STAGE_GROUND}
        strokeWidth={3}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        <tspan x={BOTTLE.cx + BOTTLE.r + 12}>glass</tspan>
        <tspan x={BOTTLE.cx + BOTTLE.r + 12} dy="1.25em">
          bottle
        </tspan>
      </text>
      <SceneNote x={SENSOR.x + 16} y={SENSOR.y - 2}>
        camera
      </SceneNote>
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
          <circle cx={s / 2} cy={s / 2} r={1.1} fill={CHART_STRUCTURE.labelSecondary} />
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
          fillOpacity={cell.state === 'occupied' ? OCCUPIED_OPACITY : undefined}
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
    </g>
  );
}

function SamplePanel({ spacingCm, mode }: { spacingCm: number; mode: 'points' | 'band' | 'mesh' }) {
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
          fillOpacity={0.16}
          stroke={STATE}
          strokeWidth={0.9}
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
            fillOpacity={uncertain ? 0.14 : 0.38}
            stroke={uncertain ? STATE : 'none'}
            strokeWidth={0.8}
            strokeDasharray={uncertain ? UNMEASURED_DASH : undefined}
          />
        );
      })}
    </g>
  );
}

const PANEL_LABEL: Record<RepresentationId, string> = {
  'point-cloud':
    'A small room seen from above, with a back wall, a box, a thin post, a glass bottle and a camera, stored as a point cloud: one sample per returned ray, drawn as a filled dot on opaque surfaces and as a hollow dashed ring on the thin post and the glass bottle, and nothing at all behind the box',
  'occupancy-grid':
    'A small room seen from above, with a back wall, a box, a thin post, a glass bottle and a camera, stored as an occupancy grid: free, occupied and unknown cells, with the region hidden behind the box held as unknown',
  tsdf: 'A small room seen from above, with a back wall, a box, a thin post, a glass bottle and a camera, stored as a truncated signed-distance field: a narrow band of voxels straddling each observed surface, outlined with a dashed edge over the thin post and the glass bottle',
  mesh: 'A small room seen from above, with a back wall, a box, a thin post, a glass bottle and a camera, stored as a triangle mesh: connected surface runs, dashed where the surface is thin or see-through, with a hole behind the box where nothing was observed',
  'gaussian-splat':
    'A small room seen from above, with a back wall, a box, a thin post, a glass bottle and a camera, stored as a Gaussian splat: solid blobs on the observed surfaces, and dashed hollow blobs filling the region behind the box that were rendered but never measured',
};

type SwatchKind =
  | 'cell-occupied' | 'cell-unknown' | 'cell-free' | 'shade' | 'dot' | 'ring'
  | 'band' | 'band-dashed' | 'line' | 'line-dashed' | 'blob' | 'blob-dashed' | 'room';

type LegendEntry = { series: string; kind: SwatchKind; label: string };

const UNOBSERVED: LegendEntry = { series: 'unobserved', kind: 'shade', label: 'never observed' };
const ROOM: LegendEntry = { series: 'room', kind: 'room', label: 'the real room, faint' };
const UNCERTAIN = 'not firmly measured';

const LEGEND: Record<RepresentationId, readonly LegendEntry[]> = {
  'occupancy-grid': [
    { series: 'occupied', kind: 'cell-occupied', label: 'something there' },
    { series: 'unknown', kind: 'cell-unknown', label: 'unknown' },
    { series: 'free', kind: 'cell-free', label: 'empty' },
    ROOM,
  ],
  'point-cloud': [
    { series: 'surface', kind: 'dot', label: 'measured dot' },
    { series: 'uncertain', kind: 'ring', label: UNCERTAIN },
    UNOBSERVED,
    ROOM,
  ],
  tsdf: [
    { series: 'surface', kind: 'band', label: 'distance kept near a surface' },
    { series: 'uncertain', kind: 'band-dashed', label: UNCERTAIN },
    UNOBSERVED,
    ROOM,
  ],
  mesh: [
    { series: 'surface', kind: 'line', label: 'surface skin' },
    { series: 'uncertain', kind: 'line-dashed', label: UNCERTAIN },
    UNOBSERVED,
    ROOM,
  ],
  'gaussian-splat': [
    { series: 'surface', kind: 'blob', label: 'blob fitted to what was seen' },
    { series: 'uncertain', kind: 'blob-dashed', label: 'rendered, never measured' },
    ROOM,
  ],
};

/** A legend swatch repeating the panel's own mark for each entry. */
function SceneSwatch({ kind }: { kind: SwatchKind }) {
  if (kind === 'dot') return <LegendSwatch role="measurement" mark="dot" />;
  if (kind === 'band') return <LegendSwatch role="state" mark="band" />;
  if (kind === 'line') return <LegendSwatch role="state" mark="line" />;
  const h = CHART_TYPE.tickPx;
  const w = h * 2;
  const grid = { stroke: CHART_STRUCTURE.axes, strokeOpacity: CELL_LINE_OPACITY, strokeWidth: 1 };
  const dashed = { fill: 'none', strokeWidth: 1, strokeDasharray: UNMEASURED_DASH };
  return (
    <svg aria-hidden="true" focusable="false" width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      {kind === 'cell-occupied' && (
        <rect x={0.5} y={0.5} width={w - 1} height={h - 1} fill={STATE} fillOpacity={OCCUPIED_OPACITY} {...grid} />
      )}
      {kind === 'cell-free' && <rect x={0.5} y={0.5} width={w - 1} height={h - 1} fill="none" {...grid} />}
      {kind === 'cell-unknown' && (
        <g>
          <rect x={0.5} y={0.5} width={w - 1} height={h - 1} fill={CHART_STRUCTURE.labelSecondary} fillOpacity={UNKNOWN_SHADE_OPACITY} {...grid} />
          {[w / 4, w / 2, (3 * w) / 4].map((cx) => (
            <circle key={cx} cx={cx} cy={h / 2} r={1.1} fill={CHART_STRUCTURE.labelSecondary} />
          ))}
        </g>
      )}
      {kind === 'shade' && <rect x={0} y={0} width={w} height={h} fill={CHART_STRUCTURE.labelSecondary} fillOpacity={SHADOW_OPACITY * 2} />}
      {kind === 'ring' && <circle cx={w / 2} cy={h / 2} r={h / 2 - 2} stroke={MEASUREMENT} {...dashed} />}
      {kind === 'band-dashed' && <rect x={1} y={1} width={w - 2} height={h - 2} stroke={STATE} {...dashed} />}
      {kind === 'line-dashed' && <path d={`M1 ${h / 2} H${w - 1}`} stroke={STATE} {...dashed} strokeWidth={CHART_STROKE.trace} />}
      {kind === 'blob' && <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 2} fill={STATE} fillOpacity={0.38} />}
      {kind === 'blob-dashed' && <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 2} stroke={STATE} {...dashed} />}
      {kind === 'room' && (
        <g opacity={ROOM_OPACITY} fill="none" stroke={INK} strokeWidth={CHART_STROKE.structure * 1.5}>
          <rect x={2} y={3} width={w / 2 - 3} height={h - 6} rx={1} />
          <circle cx={(3 * w) / 4} cy={h / 2} r={h / 2 - 2.5} />
        </g>
      )}
    </svg>
  );
}

/** The answer's shape, so Yes, No and the half answer differ without colour. */
function AnswerMark({ state }: { state: CapabilityState }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const };
  return (
    <svg aria-hidden="true" focusable="false" width={14} height={14} viewBox="0 0 14 14" className="shrink-0">
      {state === 'yes' && <path d="M2.5 7.5 L5.75 10.5 L11.5 3.5" {...stroke} strokeLinejoin="round" />}
      {state === 'no' && <path d="M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5" {...stroke} />}
      {state === 'partial' && (
        <g>
          <circle cx={7} cy={7} r={5} {...stroke} strokeWidth={1.25} />
          <path d="M7 2 A5 5 0 0 1 7 12 Z" fill="currentColor" />
        </g>
      )}
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
      {id === 'occupancy-grid' && <OccupancyPanel cellCm={spacingCm} patternId={patternId} />}
      {id === 'point-cloud' && <SamplePanel spacingCm={spacingCm} mode="points" />}
      {id === 'tsdf' && <SamplePanel spacingCm={spacingCm} mode="band" />}
      {id === 'mesh' && <SamplePanel spacingCm={spacingCm} mode="mesh" />}
      {id === 'gaussian-splat' && <SplatPanel spacingCm={spacingCm} />}
      <RoomDrawing />
      <RoomNames />
      {/* The note sits in the open floor between the box and the camera,
          and its leader climbs past the box's left edge to the hidden
          region, so neither crosses a stored mark or an object's name. */}
      <StageAnnotation
        x={NOTE_X}
        y={NOTE_Y}
        lines={HIDDEN_NOTE[id]}
        target={HIDDEN_TARGET}
        from={NOTE_FROM}
        pointer="arrow"
      />
    </PlotStage>
  );
}

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
  const ladder = RESOLUTION_CM.map((cm) => ({ cm, cost: footprint(selectedId, cm) }));
  const [spacingBefore, spacingAfter] = SPACING_WORDS[selectedId];

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
      aria-label="How the robot stores the room"
      className="grid justify-items-start gap-1"
    >
      <span aria-hidden="true" className="font-sans text-sm text-text-dim">
        How the robot stores the room
      </span>
      <div className="flex flex-wrap gap-1">
        {REPRESENTATIONS.map((rep) => {
          const active = rep.id === selectedId;
          return (
            <button
              data-brand-control-id="control:selection"
              key={rep.id}
              type="button"
              aria-pressed={active}
              aria-label={`${PLAIN_NAME[rep.id]} (${rep.short}): stores ${rep.stores}`}
              data-testid={`scene-select-${rep.id}`}
              onClick={() => setSelectedId(rep.id)}
              className={INSTRUMENT_TOGGLE_CLASS}
            >
              {PLAIN_NAME[rep.id]}
            </button>
          );
        })}
      </div>
      <span data-testid="scene-technical-name" className="font-sans text-sm text-text-dim">
        Engineers call this {selected.article} {selected.name}
      </span>
    </div>
  );

  const resolution = (
    <ControlField>
      <ControlLabel
        htmlFor={`${uid}-resolution`}
        value={
          <span>
            {spacingBefore} <span data-testid="scene-resolution-value">{cellCm} cm</span>
            {spacingAfter ? ` ${spacingAfter}` : ''}
          </span>
        }
      >
        Detail
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
        aria-label={`Detail, currently ${cellCm} centimetres per cell`}
        aria-valuetext={`${cellCm} centimetres per cell`}
        data-testid="scene-resolution-slider"
        className={INSTRUMENT_SLIDER_CLASS}
      />
      <SliderEnds low="coarse" high="fine" />
      <span data-testid="scene-detail-note" className="font-sans text-sm text-text">
        More detail: sharper picture, more storage, same answers.
      </span>
    </ControlField>
  );

  // Lists on the stage are role lists: the article's prose list indent and
  // item rhythm would otherwise reach into the figure.
  const answers = (
    <div
      role="list"
      aria-label="What this representation can answer"
      data-testid="scene-capabilities"
      className="grid"
    >
      {CAPABILITIES.map((capability) => {
        const graded = selected.capabilities[capability.id];
        return (
          <div
            role="listitem"
            key={capability.id}
            data-testid={`scene-capability-${capability.id}`}
            data-state={graded.state}
            aria-label={`${QUESTION[capability.id]} ${ANSWER_TEXT[graded.state]}`}
            className="grid gap-0.5 border-b border-border py-2 font-sans text-sm leading-snug text-text first:border-t"
          >
            <span>{QUESTION[capability.id]}</span>
            <span
              className={cx(
                'inline-flex items-center gap-1.5 font-semibold',
                graded.state === 'no' ? 'text-text-dim' : 'text-text',
              )}
            >
              <AnswerMark state={graded.state} />
              <span data-testid={`scene-capability-state-${capability.id}`}>
                {ANSWER_TEXT[graded.state]}
              </span>
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
      kicker="Scene representations"
      heading="Each way of storing a room answers different questions"
      controls={
        <>
          {selector}
          {resolution}
        </>
      }
      adjust={
        <>
          <InstrumentReadout className="basis-full">
            <span className="text-text-dim">Storage for this room:</span>{' '}
            <span data-testid="scene-footprint-readout">{formatBytes(cost.bytes)}</span>
            <span className="text-text-dim">, in </span>
            <span data-testid="scene-elements-readout">
              {formatCount(cost.elements)} {cost.elementName}
            </span>{' '}
            <span className="text-text-dim">at {cellCm} cm spacing</span>
          </InstrumentReadout>
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
              <StageStatus>Schematic: a made-up room seen from above, not measured</StageStatus>
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
              {/* The three answers are a readout band of the stage, beside
                  the drawing when there is room and under it when not. */}
              <div
                data-figure-stage-band="aside"
                className="grid content-start gap-2 px-3 pb-1 @min-[34rem]:pl-0 @min-[34rem]:pt-3"
              >
                <span className="font-sans text-sm text-text-dim">What it can answer</span>
                {answers}
              </div>
            </div>
          </div>
        </FigureStage>
      }
      caption="How a robot stores what it sees decides what it can ask: where it may move, where to touch, how things look."
      method={
        <>
          <p>
            Synthetic scene: a 3.0 by 3.0 by 2.0 m cell holding a 2 cm post, a
            transparent bottle and an occluder (the box), with the sensor (the
            camera) at the near edge. Footprints come from declared storage
            models, volumetric stores billed over the whole volume and surface
            stores over the observed area only, which is why a narrow-band
            signed-distance field holds fewer cells than the occupancy grid it
            resembles and its cost grows more slowly as the spacing shrinks{' '}
            <CiteRef id="curless-levoy-1996" />. The bottle is drawn{' '}
            {TRANSPARENT_DEPTH_BIAS_CM} cm behind its true face, where a depth
            sensor reports it, and the thin post survives only while the
            spacing resolves it. Behind the occluder the occupancy grid keeps an
            explicit unknown, where the Gaussian splat renders geometry nothing
            measured <CiteRef id="moravec-elfes-1985" />.
          </p>
          <p data-testid="scene-live-summary" aria-live="polite">
            {selected.article === 'a' ? 'A' : 'An'} {selected.name} stores:{' '}
            {selected.stores} Behind the occluder it holds: {selected.unobserved}
          </p>
          <p data-testid="scene-resolution-ladder">
            Storage for this room as {selected.article} {selected.name}, coarse to fine:{' '}
            {ladder
              .map(({ cm, cost: c }) => `${formatCount(c.elements)} ${c.elementName} (${formatBytes(c.bytes)}) at ${cm} cm`)
              .join('; ')}
            . The three answers are the same at every spacing.
          </p>
          <div role="list" className="grid gap-1">
            {CAPABILITIES.map((capability) => (
              <div role="listitem" key={capability.id}>
                <span className="font-medium">
                  {QUESTION[capability.id]} ({capability.label}):
                </span>{' '}
                {CAPABILITY_STATE_TEXT[selected.capabilities[capability.id].state]};{' '}
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
    />
  );
}
