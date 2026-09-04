'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import { CiteRef } from '@/components/mdx/cite-ref';
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
 * The structural pattern is the world-models disambiguator's (a panel
 * switcher with one panel per option), deliberately followed rather than
 * extended: that component's data model is world-model paradigms and its
 * content is another domain's argument, so sharing one component across
 * two unrelated schemas would trade cross-mount consistency for reuse
 * that is not really reuse.
 *
 * The two controls are orthogonal by construction, and that is the
 * teaching point rather than an implementation detail. The representation
 * selector changes what the store can ANSWER; the resolution slider
 * changes only what it COSTS and how finely it is drawn. A finer
 * occupancy grid still cannot hand a contact solver a surface normal, and
 * a coarser splat still renders a novel view, so the capability
 * indicators never move with the slider.
 *
 * Interactive contract: deterministic initial render, native buttons and
 * a native range input (both keyboard-operable), visible monospace
 * readouts, a reset control, fixed panel geometry so nothing shifts. No
 * JS-driven motion at all, only CSS hover and focus transitions, so the
 * component is reduced-motion safe by construction.
 */

const MONO = 'var(--font-mono)';
const DIM = 'var(--color-text-dim)';
const TEXT = 'var(--color-text)';
const ACCENT = 'var(--color-accent)';
const WARN = 'var(--color-warn)';
const BORDER = 'var(--color-border)';
const BORDER_STRONG = 'var(--color-border-strong)';
const SURFACE_2 = 'var(--color-surface-2)';

/** Round rendered geometry so the server HTML and the hydrated DOM agree. */
const f = (v: number) => Number(v.toFixed(2));

/**
 * Glyph sizes in viewBox units, not pixels. The 300-unit-wide viewBox
 * renders about 275px wide at the 375px viewport (the narrowest layout,
 * a scale near 0.92) and wider everywhere else, so a size of 7 would land
 * under 7px on screen and be illegible. These are chosen so the smallest
 * label still renders at about 10px at the narrowest layout.
 */
const TITLE_SIZE = 14;
const LABEL_SIZE = 11;

/** Height of the title band above the scene, in viewBox units. */
const TITLE_BAND_CM = 20;

const SURFACE_TONE: Record<SurfaceKind, string> = {
  wall: BORDER_STRONG,
  occluder: BORDER_STRONG,
  thin: WARN,
  transparent: WARN,
};

/**
 * One rule runs through every panel: geometry the sensor did not firmly
 * establish is drawn broken, geometry it measured is drawn whole. The thin
 * post and the transparent bottle are the surfaces depth sensing fails on,
 * and the splats behind the occluder were never measured at all, so all of
 * them take a dashed edge. It follows the convention the scene already sets
 * with the dashed occluder shadow, and it is the same statement the warn
 * tone makes, in a form that survives greyscale.
 */
const UNMEASURED_DASH = '2.5 2';

const SURFACE_DASH: Record<SurfaceKind, string | undefined> = {
  wall: undefined,
  occluder: undefined,
  thin: UNMEASURED_DASH,
  transparent: UNMEASURED_DASH,
};

const isUncertain = (kind: SurfaceKind) => SURFACE_DASH[kind] !== undefined;

const STATE_TONE: Record<CapabilityState, string> = {
  yes: 'border-accent text-accent',
  partial: 'border-warn text-warn',
  no: 'border-border text-text-dim',
};

/**
 * Occluder outline and sensor marker, with no background fill.
 *
 * Split out from SceneFrame so a panel that draws opaque cells can put the
 * chrome back on top without repainting the background over its own data.
 */
function SceneChrome() {
  return (
    <g>
      <rect
        x={OCCLUDER.x}
        y={OCCLUDER.y}
        width={OCCLUDER.width}
        height={OCCLUDER.height}
        fill="none"
        stroke={DIM}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <circle cx={SENSOR.x} cy={SENSOR.y} r={3} fill={ACCENT} />
      <text
        x={SENSOR.x + 7}
        y={SENSOR.y + 4}
        fill={DIM}
        fontSize={LABEL_SIZE}
        fontFamily={MONO}
      >
        sensor
      </text>
    </g>
  );
}

/** Background, optional occlusion shadow, then the shared chrome. */
function SceneFrame({ showShadow }: { showShadow: boolean }) {
  const shadow = occlusionShadow();
  return (
    <g>
      <rect
        x={0}
        y={0}
        width={SCENE_WIDTH_CM}
        height={SCENE_DEPTH_CM}
        fill={SURFACE_2}
        stroke={BORDER}
        strokeWidth={1}
      />
      {showShadow && (
        <polygon
          points={shadow.map((p) => `${f(p.x)},${f(p.y)}`).join(' ')}
          fill={DIM}
          opacity={0.16}
        />
      )}
      <SceneChrome />
    </g>
  );
}

function OccupancyPanel({ cellCm }: { cellCm: number }) {
  const cells = occupancyCells(cellCm);
  return (
    <g>
      <SceneFrame showShadow={false} />
      {cells.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          x={f(cell.x)}
          y={f(cell.y)}
          width={f(cell.size)}
          height={f(cell.size)}
          fill={
            cell.state === 'occupied'
              ? BORDER_STRONG
              : cell.state === 'unknown'
                ? DIM
                : 'none'
          }
          opacity={cell.state === 'unknown' ? 0.42 : 1}
          stroke={BORDER}
          strokeWidth={0.4}
        />
      ))}
      {/* Sensor and occluder outline only: re-running SceneFrame here would
          repaint its opaque background over every cell just drawn. */}
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
              points={run.map((s) => `${f(s.x)},${f(s.y)}`).join(' ')}
              fill="none"
              stroke={SURFACE_TONE[kind]}
              strokeWidth={1.6}
              strokeDasharray={SURFACE_DASH[kind]}
            />
          );
        })}
      {mode === 'band' &&
        samples.map((sample, i) => (
          <rect
            key={i}
            x={f(sample.x - spacingCm * 0.6)}
            y={f(sample.y - spacingCm * 0.6)}
            width={f(spacingCm * 1.2)}
            height={f(spacingCm * 1.2)}
            fill={SURFACE_TONE[sample.kind]}
            fillOpacity={0.22}
            stroke={SURFACE_TONE[sample.kind]}
            strokeWidth={isUncertain(sample.kind) ? 0.8 : 0.4}
            strokeDasharray={SURFACE_DASH[sample.kind]}
          />
        ))}
      {samples.map((sample, i) => (
        <circle
          key={`p-${i}`}
          cx={f(sample.x)}
          cy={f(sample.y)}
          r={f((mode === 'points' ? 1.8 : 1.2) * (isUncertain(sample.kind) ? 1.7 : 1))}
          fill={isUncertain(sample.kind) ? 'none' : SURFACE_TONE[sample.kind]}
          stroke={isUncertain(sample.kind) ? SURFACE_TONE[sample.kind] : 'none'}
          strokeWidth={0.7}
          strokeDasharray={SURFACE_DASH[sample.kind]}
        />
      ))}
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
          cx={f(point.x)}
          cy={f(point.y)}
          rx={f(spacingCm * 0.9)}
          ry={f(spacingCm * 0.55)}
          fill={WARN}
          fillOpacity={0.12}
          stroke={WARN}
          strokeWidth={0.8}
          strokeDasharray={UNMEASURED_DASH}
        />
      ))}
      {samples.map((sample, i) => (
        <ellipse
          key={`s-${i}`}
          cx={f(sample.x)}
          cy={f(sample.y)}
          rx={f(spacingCm * 0.8)}
          ry={f(spacingCm * 0.45)}
          fill={SURFACE_TONE[sample.kind]}
          fillOpacity={isUncertain(sample.kind) ? 0.18 : 0.5}
          stroke={isUncertain(sample.kind) ? SURFACE_TONE[sample.kind] : 'none'}
          strokeWidth={0.8}
          strokeDasharray={SURFACE_DASH[sample.kind]}
        />
      ))}
      {/* Names the invented region from below the occluder, where the shadow
          is empty, rather than across the blobs it is pointing at. */}
      <text
        x={OCCLUDER.x + OCCLUDER.width / 2}
        y={OCCLUDER.y + OCCLUDER.height + LABEL_SIZE + 12}
        textAnchor="middle"
        fill={WARN}
        fontSize={LABEL_SIZE}
        fontFamily={MONO}
      >
        rendered, never measured
      </text>
    </g>
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

function Panel({
  id,
  spacingCm,
  describedBy,
}: {
  id: RepresentationId;
  spacingCm: number;
  describedBy: string;
}) {
  return (
    <svg
      // A band above the scene carries the panel title, so the title cannot
      // sit on top of the back wall or its label.
      viewBox={`0 ${-TITLE_BAND_CM} ${SCENE_WIDTH_CM} ${SCENE_DEPTH_CM + TITLE_BAND_CM}`}
      role="img"
      aria-label={PANEL_LABEL[id]}
      aria-describedby={describedBy}
      data-testid={`scene-panel-${id}`}
      className="block w-full"
    >
      <text
        x={0}
        y={-TITLE_BAND_CM + TITLE_SIZE}
        fill={TEXT}
        fontSize={TITLE_SIZE}
        fontFamily={MONO}
      >
        {representationById(id).short}
      </text>
      {id === 'occupancy-grid' && <OccupancyPanel cellCm={spacingCm} />}
      {id === 'point-cloud' && <SamplePanel spacingCm={spacingCm} mode="points" />}
      {id === 'tsdf' && <SamplePanel spacingCm={spacingCm} mode="band" />}
      {id === 'mesh' && <SamplePanel spacingCm={spacingCm} mode="mesh" />}
      {id === 'gaussian-splat' && <SplatPanel spacingCm={spacingCm} />}
      {/* Labels sit clear of the geometry they name: the wall label below the
          wall, the object labels ending just short of their object. */}
      <text
        x={BACK_WALL.x}
        y={BACK_WALL.y + BACK_WALL.height + LABEL_SIZE + 2}
        fill={DIM}
        fontSize={LABEL_SIZE}
        fontFamily={MONO}
      >
        back wall
      </text>
      <text
        x={TRANSPARENT_BOTTLE.x + TRANSPARENT_BOTTLE.width}
        y={BACK_WALL.y + BACK_WALL.height + LABEL_SIZE + 2}
        textAnchor="end"
        fill={DIM}
        fontSize={LABEL_SIZE}
        fontFamily={MONO}
      >
        transparent
      </text>
      <text
        x={THIN_POST.x + THIN_POST.width}
        y={THIN_POST.y - LABEL_SIZE / 2}
        textAnchor="end"
        fill={DIM}
        fontSize={LABEL_SIZE}
        fontFamily={MONO}
      >
        thin post
      </text>
    </svg>
  );
}

export function SceneRepresentationLadder({
  className,
}: {
  className?: string;
}) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
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

  return (
    <div
      data-testid="scene-ladder"
      data-brand-surface-id="surface:flat"
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div
        role="group"
        aria-label="Scene representations"
        className="flex flex-wrap gap-2"
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
              className={cx(
                'rounded-sm border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
                active
                  ? 'border-accent bg-surface-2 text-accent'
                  : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
              )}
            >
              {rep.short}
            </button>
          );
        })}
      </div>

      {/* The diagram is the teaching centrepiece, so its column takes the
          surplus and is never narrower than the controls: both columns share
          the same 12rem floor and the panel gets every remaining pixel.
          items-start stops the panel box inheriting the taller control
          column's height, which left the drawing floating in the top half
          of its own frame. */}
      <div className="mt-4 grid items-start gap-4 md:grid-cols-[minmax(12rem,1fr)_minmax(0,12rem)]">
        <div
          data-brand-surface-id="surface:flat"
          className="rounded-sm border border-border bg-surface-2 p-2"
        >
          <Panel
            id={selectedId}
            spacingCm={cellCm}
            describedBy={descriptionId}
          />
        </div>

        <div>
          <label
            htmlFor={`${uid}-resolution`}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            resolution
            <span
              data-testid="scene-resolution-value"
              className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
            >
              {cellCm} cm
            </span>
          </label>
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
            className="mt-2 w-full accent-accent"
          />

          <p className="mt-3 font-mono text-sm" aria-live="polite">
            <span className="text-text-dim">footprint</span>{' '}
            <span data-testid="scene-footprint-readout" className="text-text">
              {formatBytes(cost.bytes)}
            </span>
            <span className="mt-1 block text-xs text-text-dim">
              <span data-testid="scene-elements-readout">
                {formatCount(cost.elements)} {cost.elementName}
              </span>{' '}
              at {cellCm} cm
            </span>
          </p>

          <ul
            aria-label="What this representation can answer"
            data-testid="scene-capabilities"
            className="mt-3 flex flex-col gap-1.5"
          >
            {CAPABILITIES.map((capability) => {
              const graded = selected.capabilities[capability.id];
              return (
                <li
                  key={capability.id}
                  data-testid={`scene-capability-${capability.id}`}
                  data-brand-surface-id="surface:flat"
                  data-state={graded.state}
                  aria-label={`${capability.label}: ${CAPABILITY_STATE_TEXT[graded.state]}`}
                  className={cx(
                    'rounded-sm border px-2 py-1.5 font-mono text-xs',
                    STATE_TONE[graded.state],
                  )}
                >
                  {capability.label}:{' '}
                  <span
                    data-testid={`scene-capability-state-${capability.id}`}
                    className="font-medium"
                  >
                    {CAPABILITY_STATE_TEXT[graded.state]}
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={reset}
            aria-label="Reset the representation and resolution to their opening values"
            className="mt-3 rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
          >
            Reset
          </button>
        </div>
      </div>

      <p
        data-testid="scene-live-summary"
        aria-live="polite"
        className="mt-3 font-sans text-xs leading-relaxed text-text-dim"
      >
        <span className="text-text">
          {selected.article === 'a' ? 'A' : 'An'} {selected.name}
        </span>{' '}
        stores: {selected.stores} Behind the occluder it holds:{' '}
        {selected.unobserved}
      </p>

      <ul className="mt-2 flex flex-col gap-1 font-sans text-xs leading-relaxed text-text-dim">
        {CAPABILITIES.map((capability) => (
          <li key={capability.id}>
            <span className="text-text">{capability.label}:</span>{' '}
            {selected.capabilities[capability.id].note}.
          </li>
        ))}
      </ul>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
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

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Scene and models, stated rather than hidden: a 3.0 by 3.0 by 2.0 m
        cell holding a 2 cm post, a transparent bottle and an occluder, with
        the sensor at the near edge. The footprints are declared storage
        models rather than measurements of any implementation, volumetric
        stores billed over the whole volume and surface stores over the
        observed area only, which is why a narrow-band signed-distance field
        is cheaper than the occupancy grid it appears to resemble{' '}
        <CiteRef id="curless-levoy-1996" />. The transparent bottle is drawn
        {' '}{TRANSPARENT_DEPTH_BIAS_CM} cm behind its true face in every
        panel, because that is what a depth sensor reports through it, and
        the thin post survives only while the spacing can resolve it. Things
        worth trying: park the resolution at 10 cm and step the selector
        from the occupancy grid to the Gaussian splat, and watch the region
        behind the occluder change from an explicit unknown to confidently
        rendered geometry nothing ever measured{' '}
        <CiteRef id="moravec-elfes-1985" />.
      </p>
    </div>
  );
}
