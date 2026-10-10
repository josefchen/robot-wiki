'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
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
  annotationArrow,
  roleColour,
} from '@/components/motion/chart';
import { MOTION_STAGE } from '@/lib/motion-tokens';
import {
  CONTACT_POSITION_MAX,
  CONTACT_POSITION_MIN,
  CONTACT_POSITION_STEP,
  DEFAULT_CONTACTS,
  DEFAULT_MU,
  MAX_CONTACTS,
  MIN_CONTACTS,
  PUSH_COUNT,
  analyzeGrasp,
  contactGeometry,
  contactPositionFromPoint,
  pushAngle,
  resistedPushes,
  suggestContactPosition,
  type ContactGeometry,
  type Vec3,
} from '@/lib/grasp';

/**
 * GraspWrenchLab: robot fingertips pressing on a box, seen from above.
 *
 * The box is the lib's unit square and each fingertip a frictional point
 * contact that the reader drags along the edges. The fan inside the box at
 * each fingertip is its friction cone, half-angle arctan(mu); the surface
 * slider sets mu. Eight test pushes act through the box centre, each drawn
 * as resisted when the contacts can cancel it with no net twist (see
 * resistedPushes in lib/grasp); under force closure every push is resisted.
 * The grip-margin meter shows the Ferrari-Canny epsilon, full at 1.00 (four
 * contacts at the edge midpoints on the grippiest surface reach it) and
 * clamped there. Its ends read "no grip" and "very firm": any fill above that
 * is a grip that holds (force closure exactly when epsilon is above zero),
 * so the words stay true at every state. A plain label beside the wedge
 * nearest it says what a wedge means.
 *
 * The grasp wrench space itself (the hull of cone-edge wrenches in
 * (fx, fy, tau), projected obliquely) sits in "Adjust more" with the
 * numeric contact sliders; the numbers sit in "How this was made".
 *
 * Reproducibility: the scene is a pure function of the contact positions
 * and mu. A dragged fingertip snaps to the sliders' 0.005 perimeter grid,
 * Reset restores the three-contact grasp at mu 0.70, and every rendered
 * coordinate goes through f(), so SSR HTML and hydration agree.
 */

const VIEW_W = CHART_VIEW_WIDTH;
const VIEW_H = 266;
const WRENCH_H = 280;

/** Round every rendered geometry value: SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

/** The box: the unit square (half side 1) at 40 stage units per unit. */
const BOX = { cx: 112, cy: 154, scale: 40 };
const objX = (x: number) => f(BOX.cx + BOX.scale * x);
const objY = (y: number) => f(BOX.cy - BOX.scale * y);

/** Fingertip drawing, in stage units outward along the finger from the contact. */
const PAD_R = 6;
const FINGER_W = 8;
/** The finger's rounded end touches the box: its cap reaches back to the contact. */
const FINGER_START = FINGER_W / 2;
const JOINT_AT = 20;
const FINGER_END = 34;
/** Where a finger's number sits: along the finger, and off to one side. */
const NUMBER_ALONG = 27;
const NUMBER_SIDE = 14;
/** Pointer reach around a fingertip, so a finger is easy to grab on a phone. */
const GRAB_R = 16;

/** The test pushes: arrows on a ring, pointing at the box centre. */
const PUSH_TIP = 86;
const PUSH_TAIL = 106;
const HEAD_LEN = 7;
const HEAD_HALF = 4.5;

/** The fan drawn for each friction cone, in object units. */
const FAN_LEN = 0.5;
const FAN_FILL_OPACITY = 0.18;

/** The grip-margin meter: epsilon from 0 (bottom) to EPSILON_FULL (top). */
export const EPSILON_FULL = 1;
const METER = { x: 244, top: 128, bottom: 260, width: 8 };

/**
 * The wedge label, top right. Its last line is held at `y` and the arrow
 * leaves just under that line's start, so the two stay together while the
 * stage type keeps its CSS size on a stretched viewBox.
 */
const WEDGE_NOTE = {
  x: 228,
  y: 88,
  lines: ['Inside its wedge,', 'a finger can push', 'without slipping'],
  from: [226, 93] as const,
};
const LINE_EM = 1.25;

/** Wrench view (in "Adjust more"): oblique projection of (fx, fy, tau). */
const WR = { cx: VIEW_W / 2, cy: WRENCH_H / 2, scale: 56 };
const wrX = (v: Vec3) => f(WR.cx + WR.scale * (v.x - 0.55 * v.z));
const wrY = (v: Vec3) => f(WR.cy - WR.scale * (v.y + 0.45 * v.z));
/** The kernel direction (0.55, -0.45, 1) is the view depth axis used for painter sorting. */
const depth = (v: Vec3) => 0.55 * v.x - 0.45 * v.y + v.z;
const FACET_FILL_OPACITY = 0.08;
const FACET_STROKE_OPACITY = 0.6;

const ink = CHART_STRUCTURE.label;
const graphite = CHART_STRUCTURE.labelSecondary;
const paper = MOTION_STAGE.background;

/**
 * A finger in outline, seen from above: two thin sides out from a round
 * pad whose cap touches the contact, closed square at the knuckle end.
 * The cap is two quarter circles in cubic form, so it turns the right way
 * whatever side of the box the finger presses.
 */
function fingerOutline(g: ContactGeometry): string {
  const r = FINGER_W / 2;
  const k = 0.552 * r;
  const p = (along: number, side: number) => {
    const q = fingerPoint(g, along, side);
    return `${q.x} ${q.y}`;
  };
  return [
    `M ${p(FINGER_END, -r)}`,
    `L ${p(FINGER_START, -r)}`,
    `C ${p(FINGER_START - k, -r)} ${p(FINGER_START - r, -k)} ${p(FINGER_START - r, 0)}`,
    `C ${p(FINGER_START - r, k)} ${p(FINGER_START - k, r)} ${p(FINGER_START, r)}`,
    `L ${p(FINGER_END, r)} Z`,
  ].join(' ');
}

/** A stage point `along` units out from a contact and `side` units across the finger. */
function fingerPoint(g: ContactGeometry, along: number, side = 0) {
  // Outward on screen is the inward normal reversed, with y pointing down.
  const out = { x: -g.normal.x, y: g.normal.y };
  return {
    x: f(BOX.cx + BOX.scale * g.point.x + out.x * along - out.y * side),
    y: f(BOX.cy - BOX.scale * g.point.y + out.y * along + out.x * side),
  };
}

/** The friction-cone fan at a contact: apex on the edge, opening into the box. */
function fanPath(g: ContactGeometry, mu: number) {
  const half = Math.atan(mu);
  const base = Math.atan2(g.normal.y, g.normal.x);
  const end = (a: number) =>
    `${objX(g.point.x + FAN_LEN * Math.cos(a))} ${objY(g.point.y + FAN_LEN * Math.sin(a))}`;
  const r = f(FAN_LEN * BOX.scale);
  // Model-space counterclockwise reads counterclockwise on the y-down
  // screen too once both axes map through objX/objY, so sweep = 0 keeps the
  // arc centred on the fingertip and the wedge bulges away from it.
  return `M ${objX(g.point.x)} ${objY(g.point.y)} L ${end(base - half)} A ${r} ${r} 0 0 0 ${end(base + half)} Z`;
}

/** The middle of a contact's wedge, on screen. */
function wedgeCentre(g: ContactGeometry) {
  const along = FAN_LEN * 0.6;
  return { x: objX(g.point.x + g.normal.x * along), y: objY(g.point.y + g.normal.y * along) };
}

/** Test push k as an arrow on the ring, pointing along the push at the box centre. */
function pushArrow(k: number) {
  const dx = Math.cos(pushAngle(k));
  const dy = -Math.sin(pushAngle(k));
  const at = (r: number, side = 0) => `${f(BOX.cx - dx * r - dy * side)} ${f(BOX.cy - dy * r + dx * side)}`;
  return {
    shaft: `M ${at(PUSH_TAIL)} L ${at(PUSH_TIP + HEAD_LEN)}`,
    head: `M ${at(PUSH_TIP)} L ${at(PUSH_TIP + HEAD_LEN, HEAD_HALF)} L ${at(PUSH_TIP + HEAD_LEN, -HEAD_HALF)} Z`,
  };
}

/** The surface slider's value in words. */
function surfaceWords(mu: number) {
  if (mu < 0.25) return 'slippery';
  if (mu < 0.5) return 'a little slippery';
  if (mu < 0.8) return 'fairly rough';
  return 'very rough';
}

/** The stage note: what the eight test pushes show right now. */
function noteLines(closed: boolean, slipping: number) {
  if (closed) return ['Pushes from every direction are', 'resisted: the grip holds'];
  if (slipping === 0) return ['Every push is resisted, but a twist', 'can turn the box: the grip fails'];
  return [`${slipping} of ${PUSH_COUNT} pushes ${slipping === 1 ? 'slips' : 'slip'} free:`, 'the grip fails'];
}

/** The zero-wrench ring: solid in the value colour inside the hull, dashed outside. */
function ringPaint(closed: boolean) {
  return {
    fill: 'none',
    stroke: closed ? roleColour('value') : CHART_STRUCTURE.label,
    strokeWidth: CHART_STROKE.trace,
    strokeDasharray: closed ? undefined : CHART_STROKE.dash,
  };
}

export function GraspWrenchLab({ className }: { className?: string }) {
  const uid = useId();
  const objectDescriptionId = `${uid}-object-description`;
  const wrenchDescriptionId = `${uid}-wrench-description`;
  const [mu, setMu] = useState(DEFAULT_MU);
  const [contacts, setContacts] = useState<number[]>(DEFAULT_CONTACTS);
  const [dragging, setDragging] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const analysis = useMemo(() => analyzeGrasp(contacts, mu), [contacts, mu]);
  const geoms = useMemo(() => contacts.map((s) => contactGeometry(s)), [contacts]);
  const resisted = useMemo(() => resistedPushes(analysis.primitives), [analysis]);

  // Facets sorted far to near for painter rendering; each facet's points
  // are angle-sorted around their centroid to form the projected polygon.
  const facets = useMemo(() => {
    if (!analysis.hull.fullDim) return [];
    return analysis.hull.facets
      .map((facet) => {
        const pts = facet.points.map((i) => ({
          x: wrX(analysis.hullPoints[i]),
          y: wrY(analysis.hullPoints[i]),
          d: depth(analysis.hullPoints[i]),
        }));
        const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        pts.sort((a, b) => Math.atan2(a.y - my, a.x - mx) - Math.atan2(b.y - my, b.x - mx));
        return {
          points: pts.map((p) => `${p.x},${p.y}`).join(' '),
          depth: pts.reduce((s, p) => s + p.d, 0) / pts.length,
        };
      })
      .sort((a, b) => b.depth - a.depth);
  }, [analysis]);

  const closed = analysis.forceClosure;
  const slipping = resisted.filter((held) => !held).length;
  const state = roleColour('state');
  const action = roleColour('action');
  const halfAngle = ((Math.atan(mu) * 180) / Math.PI).toFixed(1);
  const meterFill = f((Math.min(analysis.epsilon, EPSILON_FULL) / EPSILON_FULL) * (METER.bottom - METER.top));
  // The wedge label points at whichever wedge sits nearest it, so its arrow
  // always lands on a wedge wherever the fingers are dragged.
  const wedgeTarget = geoms
    .map(wedgeCentre)
    .reduce((best, c) =>
      Math.hypot(c.x - WEDGE_NOTE.from[0], c.y - WEDGE_NOTE.from[1]) <
      Math.hypot(best.x - WEDGE_NOTE.from[0], best.y - WEDGE_NOTE.from[1])
        ? c
        : best,
    );
  const wedgeArrow = annotationArrow(WEDGE_NOTE.from, [wedgeTarget.x, wedgeTarget.y]);

  const addContact = () =>
    setContacts((c) =>
      c.length >= MAX_CONTACTS ? c : [...c, suggestContactPosition(c)],
    );
  const removeContact = () =>
    setContacts((c) => (c.length > MIN_CONTACTS ? c.slice(0, -1) : c));
  const reset = () => {
    setMu(DEFAULT_MU);
    setContacts(DEFAULT_CONTACTS);
  };

  /** Moves contact i to the edge point under the pointer, on the slider grid. */
  function dragContact(i: number, clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * VIEW_W;
    const y = ((clientY - rect.top) / rect.height) * VIEW_H;
    const s = contactPositionFromPoint((x - BOX.cx) / BOX.scale, (BOX.cy - y) / BOX.scale);
    if (s === null) return;
    setContacts((c) => c.map((v, idx) => (idx === i ? s : v)));
  }

  const controls = (
    <>
      <ControlField>
        <ControlLabel htmlFor="grasp-mu" value={surfaceWords(mu)}>
          How rough the surface is
        </ControlLabel>
        <input
          id="grasp-mu"
          type="range"
          data-brand-control-id="control:input"
          min={0.05}
          max={1.0}
          step={0.05}
          value={mu}
          onChange={(e) => setMu(Number(e.target.value))}
          aria-label={`How rough the surface is: friction coefficient mu, currently ${mu.toFixed(2)}`}
          className={INSTRUMENT_SLIDER_CLASS}
        />
        <SliderEnds low="slippery" high="rough" />
      </ControlField>
      <div className="self-center font-sans text-sm text-text-dim">Drag finger 1, 2 or 3 along the box.</div>
    </>
  );

  const contactFields = contacts.map((s, i) => (
    <ControlField key={i}>
      <ControlLabel
        htmlFor={`grasp-contact-${i}`}
        value={
          <span data-testid={`grasp-contact-${i + 1}-value`}>
            {s.toFixed(3)}
          </span>
        }
      >
        Contact {i + 1} position
      </ControlLabel>
      <input
        id={`grasp-contact-${i}`}
        type="range"
        data-brand-control-id="control:input"
        min={CONTACT_POSITION_MIN}
        max={CONTACT_POSITION_MAX}
        step={CONTACT_POSITION_STEP}
        value={s}
        onChange={(e) =>
          setContacts((c) =>
            c.map((v, idx) => (idx === i ? Number(e.target.value) : v)),
          )
        }
        aria-label={`Contact ${i + 1} position along the object perimeter, currently ${s.toFixed(3)}`}
        className={INSTRUMENT_SLIDER_CLASS}
      />
    </ControlField>
  ));

  const objectView = (
    <PlotStage
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      aria-label={`A square box seen from above, held by ${contacts.length} fingertips; ${PUSH_COUNT - slipping} of ${PUSH_COUNT} test pushes are resisted.`}
      aria-describedby={objectDescriptionId}
      data-testid="grasp-object-view"
      onPointerMove={(e) => {
        if (dragging !== null) dragContact(dragging, e.clientX, e.clientY);
      }}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
    >
      <StageAnnotation x={8} y={16} lines={noteLines(closed, slipping)} />
      <rect
        x={objX(-1)}
        y={objY(1)}
        width={f(2 * BOX.scale)}
        height={f(2 * BOX.scale)}
        fill={state}
        fillOpacity={0.1}
        stroke={state}
        strokeWidth={CHART_STROKE.trace}
      />
      <g data-series="cone">
        {geoms.map((g, i) => (
          <path
            key={i}
            d={fanPath(g, mu)}
            fill={action}
            fillOpacity={FAN_FILL_OPACITY}
            stroke={action}
            strokeWidth={CHART_STROKE.structure}
          />
        ))}
      </g>
      {Array.from({ length: PUSH_COUNT }, (_, k) => {
        const { shaft, head } = pushArrow(k);
        const held = resisted[k];
        const colour = roleColour(held ? 'highlight' : 'constraint');
        return (
          <g
            key={k}
            data-series={held ? 'push-held' : 'push-slips'}
            data-series-labelled={held ? undefined : ''}
            data-push={held ? 'resisted' : 'slips'}
          >
            <path
              d={shaft}
              fill="none"
              stroke={colour}
              strokeWidth={CHART_STROKE.trace}
              strokeDasharray={held ? undefined : CHART_STROKE.dash}
            />
            <path d={head} fill={colour} />
          </g>
        );
      })}
      {geoms.map((g, i) => {
        const tip = fingerPoint(g, PAD_R);
        const number = fingerPoint(g, NUMBER_ALONG, NUMBER_SIDE);
        return (
          <g key={i} data-finger={i + 1}>
            <path
              d={fingerOutline(g)}
              fill={paper}
              stroke={ink}
              strokeWidth={CHART_STROKE.trace}
              strokeLinejoin="round"
            />
            <path
              d={`M ${fingerPoint(g, JOINT_AT, -FINGER_W / 2).x} ${fingerPoint(g, JOINT_AT, -FINGER_W / 2).y} L ${fingerPoint(g, JOINT_AT, FINGER_W / 2).x} ${fingerPoint(g, JOINT_AT, FINGER_W / 2).y}`}
              stroke={ink}
              strokeWidth={CHART_STROKE.structure}
            />
            <text
              data-chart-label=""
              x={number.x}
              y={number.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={CHART_TYPE.labelPx}
              fill={graphite}
            >
              {i + 1}
            </text>
            <circle
              cx={tip.x}
              cy={tip.y}
              r={GRAB_R}
              fill="none"
              pointerEvents="all"
              style={{ cursor: dragging === i ? 'grabbing' : 'grab', touchAction: 'none' }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragging(i);
              }}
            />
          </g>
        );
      })}
      <g data-meter="grip-margin">
        <text x={METER.x - 8} y={METER.top - 12} fontSize={CHART_TYPE.labelPx} fill={ink}>
          grip strength
        </text>
        <rect
          x={METER.x}
          y={METER.top}
          width={METER.width}
          height={METER.bottom - METER.top}
          fill="none"
          stroke={graphite}
          strokeWidth={CHART_STROKE.structure}
        />
        <rect
          data-testid="grasp-margin-fill"
          x={METER.x}
          y={f(METER.bottom - meterFill)}
          width={METER.width}
          height={meterFill}
          fill={roleColour('value')}
        />
        <text x={METER.x + METER.width + 6} y={METER.top + 10} fontSize={CHART_TYPE.labelPx} fill={graphite}>
          very firm
        </text>
        <text x={METER.x + METER.width + 6} y={METER.bottom} fontSize={CHART_TYPE.labelPx} fill={graphite}>
          no grip
        </text>
      </g>
      <g data-wedge-note="">
        {wedgeArrow ? (
          <g data-wedge-pointer="">
            <line
              x1={WEDGE_NOTE.from[0]}
              y1={WEDGE_NOTE.from[1]}
              x2={f(wedgeArrow.end[0])}
              y2={f(wedgeArrow.end[1])}
              stroke={graphite}
              strokeWidth={CHART_STROKE.structure}
            />
            <polygon points={wedgeArrow.head.map(([px, py]) => `${f(px)},${f(py)}`).join(' ')} fill={graphite} />
          </g>
        ) : null}
        {WEDGE_NOTE.lines.map((line, i) => (
          <text
            key={line}
            data-chart-label=""
            x={WEDGE_NOTE.x}
            y={WEDGE_NOTE.y}
            dy={`${(i - (WEDGE_NOTE.lines.length - 1)) * LINE_EM}em`}
            fontSize={CHART_TYPE.labelPx}
            fill={ink}
          >
            {line}
          </text>
        ))}
      </g>
    </PlotStage>
  );

  const origin = { x: 0, y: 0, z: 0 } as Vec3;
  // Each axis ends just past the region the hull of any grasp can project
  // into (every contact position, mu up to 1), so a label never sits on
  // the hull. Torque recedes along the projection, so its axis runs longest.
  const axisEnds: { v: Vec3; label: string }[] = [
    { v: { x: 2.2, y: 0, z: 0 }, label: 'fx' },
    { v: { x: 0, y: 2.0, z: 0 }, label: 'fy' },
    { v: { x: 0, y: 0, z: 4.0 }, label: 'τ' },
  ];
  const ox = wrX(origin);
  const oy = wrY(origin);

  const wrenchView = (
    <PlotStage
      viewBox={`0 0 ${VIEW_W} ${WRENCH_H}`}
      aria-label={`Grasp wrench space: the convex hull of the primitive contact wrenches. Force closure ${analysis.forceClosure ? 'yes' : 'no'}, quality epsilon ${analysis.epsilon.toFixed(3)}.`}
      aria-describedby={wrenchDescriptionId}
      data-testid="grasp-wrench-view"
    >
      <g data-chart-axes="">
        {axisEnds.map(({ v, label }) => (
          <g key={label}>
            <line
              x1={wrX({ x: -v.x * 0.82, y: -v.y * 0.82, z: -v.z * 0.82 })}
              y1={wrY({ x: -v.x * 0.82, y: -v.y * 0.82, z: -v.z * 0.82 })}
              x2={wrX(v)}
              y2={wrY(v)}
              stroke={CHART_STRUCTURE.axes}
              strokeOpacity={CHART_STRUCTURE.axesOpacity}
              strokeWidth={CHART_STROKE.structure}
            />
            <text
              data-scene-axis=""
              x={wrX({ x: v.x * 1.1, y: v.y * 1.1, z: v.z * 1.1 })}
              y={wrY({ x: v.x * 1.1, y: v.y * 1.1, z: v.z * 1.1 })}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={CHART_TYPE.axisPx}
              fill={graphite}
            >
              {label}
            </text>
          </g>
        ))}
      </g>
      {/* Wrench hull, far facets first */}
      <g data-wrench="hull">
        {facets.map((facet, i) => (
          <polygon
            key={i}
            points={facet.points}
            fill={state}
            fillOpacity={FACET_FILL_OPACITY}
            stroke={state}
            strokeOpacity={FACET_STROKE_OPACITY}
            strokeWidth={CHART_STROKE.structure}
            strokeLinejoin="round"
          />
        ))}
      </g>
      <g data-wrench="cone-edge-wrench">
        {analysis.primitives.map((p, i) => (
          <circle
            key={i}
            data-chart-mark="dot"
            data-chart-role="action"
            cx={wrX(p)}
            cy={wrY(p)}
            r={CHART_STROKE.markerRadius * 0.65}
            fill={action}
          />
        ))}
      </g>
      <g data-wrench="zero-wrench">
        <circle cx={ox} cy={oy} r={CHART_STROKE.markerRadius + 2} {...ringPaint(closed)} />
        <circle cx={ox} cy={oy} r={CHART_STROKE.structure * 1.5} fill={ink} />
      </g>
    </PlotStage>
  );

  return (
    <InstrumentFigure
      figureId="grasp-wrench-lab"
      className={className}
      kicker="Grasp quality (force closure)"
      heading="Three well-placed fingers hold firm against any push"
      controls={controls}
      adjust={
        <>
          {contactFields}
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={addContact}
            disabled={contacts.length >= MAX_CONTACTS}
            aria-label="Add a contact at the emptiest perimeter location"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Add contact
          </button>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={removeContact}
            disabled={contacts.length <= MIN_CONTACTS}
            aria-label="Remove the last contact"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Remove contact
          </button>
          <InstrumentReset
            onClick={reset}
            aria-label="Reset: restore the default grasp and friction"
          />
          <div className="basis-full space-y-1">
            <div className="font-sans text-sm text-text-dim">
              The same grip as forces and twists: each dot is one edge of a friction cone. The grip holds while
              the ring where the axes cross sits inside the shaded hull.
            </div>
            {wrenchView}
          </div>
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="cone" swatch={<LegendSwatch role="action" mark="band" />}>
                  where a fingertip can push without slipping
                </LegendItem>
                <LegendItem series="push-held" swatch={<LegendSwatch role="highlight" mark="line" />}>
                  an outside push the grip resists
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>Schematic: computed for an ideal box, not measured on a robot</StageStatus>
            </>
          }
        >
          {objectView}
        </FigureStage>
      }
      caption="A robot hand must place its fingers so they can resist a push from any direction, or the object slips."
      method={
        <>
          <p>
            Seen from above, the box is a square of half side 1 and each fingertip is a point contact. Friction
            lets a contact push anywhere inside its friction cone, drawn as the wedge at each fingertip, of
            half-angle arctan μ, but never pull; at μ{' '}
            {mu.toFixed(2)} the half-angle is {halfAngle}°. The surface slider sets μ from 0.05 to 1.00.
          </p>
          <p>
            The two edge forces of each cone, with their torque τ about the centre measured per half side, are
            the primitive wrenches (fx, fy, τ). Their convex hull is the grasp wrench space drawn under Adjust
            more. Force closure holds exactly when the origin sits strictly inside the hull: the fingertips can
            then balance any push or twist. The grip meter shows the Ferrari-Canny quality ε, the radius of the
            largest origin-centred ball inside the hull. The meter is empty, at &ldquo;no grip&rdquo;, exactly when ε
            = 0 and the grip fails; any fill above that is a grip that holds. The three-finger grasp at μ 0.70
            gives ε = 0.444; the
            meter is full at ε = 1.00, which four fingertips at the edge midpoints reach on the roughest
            surface.
          </p>
          <p>
            The eight test pushes act through the centre, 45° apart. A push counts as resisted when a
            non-negative mix of the primitive wrenches supplies the opposite force with no net twist; under
            force closure every push is resisted.
          </p>
          <p>
            Contact positions run counterclockwise from 0.000 at the top-right corner, so the edge midpoints
            are 0.125, 0.375, 0.625 and 0.875. A dragged fingertip snaps to the 0.005 grid of the contact
            sliders.
          </p>
          <InstrumentReadout>
            <span className="text-text-dim">contacts</span>{' '}
            <span data-testid="grasp-contacts-readout">{contacts.length}</span>
            <span className="text-text-dim"> · force closure</span>{' '}
            <span data-testid="grasp-closure-readout">{closed ? 'yes' : 'no'}</span>
            <span className="text-text-dim"> · ε</span>{' '}
            <span data-testid="grasp-epsilon-readout">{analysis.epsilon.toFixed(3)}</span>
            <span className="text-text-dim"> · friction coefficient μ</span>{' '}
            <span data-testid="grasp-mu-value">{mu.toFixed(2)}</span>
          </InstrumentReadout>
          <ChartDescription
            id={objectDescriptionId}
            form="state"
            summary="Current object contacts and cones"
            description={`${contacts.length} frictional contacts on the unit square at mu ${mu.toFixed(2)} open inward cones of half-angle ${halfAngle} degrees; each contact can push along its cone but cannot pull.`}
            states={[
              { label: 'contacts', value: String(contacts.length) },
              { label: 'mu', value: mu.toFixed(2) },
              { label: 'cone half-angle', value: `${halfAngle}°` },
              {
                label: 'regime',
                value: closed ? 'push-only cones, closed grasp' : 'push-only cones, open grasp',
              },
            ]}
          />
          <ChartDescription
            id={wrenchDescriptionId}
            form="state"
            summary="Current wrench-space quality"
            description={`The grasp wrench hull of ${contacts.length} contacts currently reports force closure ${closed ? 'yes' : 'no'} with Ferrari-Canny quality epsilon ${analysis.epsilon.toFixed(3)}; that radius is the largest origin-centered wrench ball that still fits inside the hull.`}
            states={[
              { label: 'force closure', value: closed ? 'yes' : 'no' },
              { label: 'epsilon', value: analysis.epsilon.toFixed(3) },
              { label: 'origin', value: closed ? 'inside the hull' : 'outside the hull' },
              { label: 'contacts', value: String(contacts.length) },
            ]}
          />
        </>
      }
    />
  );
}
