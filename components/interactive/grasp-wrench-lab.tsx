'use client';

import { useId, useMemo, useState } from 'react';
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
import {
  CONTACT_POSITION_MAX,
  CONTACT_POSITION_MIN,
  CONTACT_POSITION_STEP,
  DEFAULT_CONTACTS,
  DEFAULT_MU,
  MAX_CONTACTS,
  MIN_CONTACTS,
  analyzeGrasp,
  contactGeometry,
  suggestContactPosition,
  type Vec3,
} from '@/lib/grasp';
/**
 * GraspWrenchLab: a planar grasp on a unit square, with the grasp wrench
 * space drawn next to it. Contacts slide along the perimeter and a slider
 * sets the Coulomb friction coefficient mu. The left view shows the object
 * with each contact's friction cone (half-angle arctan(mu)); the right view
 * shows the convex hull of the primitive cone-edge wrenches in the 3D
 * wrench space (fx, fy, tau), projected obliquely with torque drawn up and
 * to the left. Force closure holds exactly when the origin marker sits
 * strictly inside the hull; the readout's epsilon is the Ferrari-Canny
 * quality, the radius of the largest origin-centered wrench ball that fits.
 *
 * Roles: the grasp itself (contacts, wrench hull) is state; the friction
 * cones and the cone-edge wrenches they generate are action, so each cone
 * edge and its wrench share a colour; the inward normals are reference.
 * The zero-wrench ring is solid in the value colour inside the hull and
 * dashed in the stage label colour outside it, so closure reads as shape.
 *
 * Reproducibility contract: the scene is a pure function of the slider
 * state. Reset restores the default three-contact grasp at mu 0.70. Every
 * rendered coordinate is rounded through f(), so SSR HTML and hydration
 * agree byte for byte and validators can assert exact readout values.
 */

const VIEW_W = CHART_VIEW_WIDTH;
const VIEW_H = 280;

/** Round every rendered geometry value: SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

/** Object view: the unit square (half side 1) mapped to pixels. */
const OBJ = { cx: VIEW_W / 2, cy: VIEW_H / 2, scale: 90 };
const objX = (x: number) => f(OBJ.cx + OBJ.scale * x);
const objY = (y: number) => f(OBJ.cy - OBJ.scale * y);

/**
 * Wrench view: oblique projection of (fx, fy, tau). Torque recedes up and
 * to the left so the fx-fy plane stays square to the reader. The kernel
 * direction (0.55, -0.45, 1) is the view depth axis used for painter
 * sorting.
 */
const WR = { cx: VIEW_W / 2, cy: VIEW_H / 2, scale: 56 };
const wrX = (v: Vec3) => f(WR.cx + WR.scale * (v.x - 0.55 * v.z));
const wrY = (v: Vec3) => f(WR.cy - WR.scale * (v.y + 0.45 * v.z));
const depth = (v: Vec3) => 0.55 * v.x - 0.45 * v.y + v.z;

const CONE_LEN = 0.5;
/** Cones and hull facets overlap, so each translucent fill stays faint. */
const CONE_FILL_OPACITY = 0.2;
const FACET_FILL_OPACITY = 0.08;
const FACET_STROKE_OPACITY = 0.6;
/** Contact numbers sit this far outside the perimeter, in object units. */
const LABEL_OFFSET = 0.24;

/** SVG path of the friction cone wedge at a contact, apex at the point. */
function conePath(point: { x: number; y: number }, normal: { x: number; y: number }, mu: number) {
  const alpha = Math.atan(mu);
  const base = Math.atan2(normal.y, normal.x);
  const a0 = base - alpha;
  const a1 = base + alpha;
  const e0x = objX(point.x + CONE_LEN * Math.cos(a0));
  const e0y = objY(point.y + CONE_LEN * Math.sin(a0));
  const e1x = objX(point.x + CONE_LEN * Math.cos(a1));
  const e1y = objY(point.y + CONE_LEN * Math.sin(a1));
  const r = f(CONE_LEN * OBJ.scale);
  // Model-space counterclockwise reads clockwise on screen, so sweep = 1.
  return `M ${objX(point.x)} ${objY(point.y)} L ${e0x} ${e0y} A ${r} ${r} 0 0 1 ${e1x} ${e1y} Z`;
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

function RingSwatch({ closed }: { closed: boolean }) {
  const s = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0">
      <circle cx={s / 2} cy={s / 2} r={s / 2 - CHART_STROKE.trace / 2} {...ringPaint(closed)} />
    </svg>
  );
}

export function GraspWrenchLab({ className }: { className?: string }) {
  const uid = useId();
  const objectDescriptionId = `${uid}-object-description`;
  const wrenchDescriptionId = `${uid}-wrench-description`;
  const [mu, setMu] = useState(DEFAULT_MU);
  const [contacts, setContacts] = useState<number[]>(DEFAULT_CONTACTS);

  const analysis = useMemo(() => analyzeGrasp(contacts, mu), [contacts, mu]);
  const geoms = useMemo(
    () => contacts.map((s) => contactGeometry(s)),
    [contacts],
  );

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
  const state = roleColour('state');
  const action = roleColour('action');
  const reference = roleColour('reference');

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

  const origin = { x: 0, y: 0, z: 0 } as Vec3;
  // Each axis ends just past the region the hull of any grasp can project
  // into (every contact position, mu up to 1), so a label never sits on
  // the hull. Torque recedes along the projection, so its axis runs longest.
  const axisEnds: { v: Vec3; label: string }[] = [
    { v: { x: 2.2, y: 0, z: 0 }, label: 'fx' },
    { v: { x: 0, y: 2.0, z: 0 }, label: 'fy' },
    { v: { x: 0, y: 0, z: 4.0 }, label: 'τ' },
  ];

  const controls = (
    <>
      <ControlField>
        <ControlLabel
          htmlFor="grasp-mu"
          value={<span data-testid="grasp-mu-value">{mu.toFixed(2)}</span>}
        >
          <span>μ friction coefficient</span>
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
          aria-label={`Friction coefficient mu, currently ${mu.toFixed(2)}`}
          className={INSTRUMENT_SLIDER_CLASS}
        />
      </ControlField>
      {contacts.map((s, i) => (
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
      ))}
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
    </>
  );

  const objectView = (
    <div className="@container">
      <PlotStage
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        aria-label={`Square object held by ${contacts.length} frictional point contacts; each contact shows its friction cone opening inward.`}
        aria-describedby={objectDescriptionId}
        data-testid="grasp-object-view"
      >
        <rect
          x={objX(-1)}
          y={objY(1)}
          width={f(2 * OBJ.scale)}
          height={f(2 * OBJ.scale)}
          fill="none"
          stroke={CHART_STRUCTURE.label}
          strokeWidth={CHART_STROKE.structure}
        />
        <path
          d={`M ${objX(-0.08)} ${objY(0)} H ${objX(0.08)} M ${objX(0)} ${objY(-0.08)} V ${objY(0.08)}`}
          fill="none"
          stroke={CHART_STRUCTURE.axes}
          strokeOpacity={CHART_STRUCTURE.axesOpacity}
          strokeWidth={CHART_STROKE.structure}
        />
        {geoms.map((g, i) => (
          <g key={i}>
            <line
              data-series="normal"
              x1={objX(g.point.x)}
              y1={objY(g.point.y)}
              x2={objX(g.point.x + 0.62 * g.normal.x)}
              y2={objY(g.point.y + 0.62 * g.normal.y)}
              stroke={reference}
              strokeWidth={CHART_STROKE.reference}
              strokeDasharray={CHART_STROKE.dash}
            />
            <path
              data-series="cone"
              d={conePath(g.point, g.normal, mu)}
              fill={action}
              fillOpacity={CONE_FILL_OPACITY}
              stroke={action}
              strokeWidth={CHART_STROKE.structure}
            />
            <circle
              data-series="contact"
              cx={objX(g.point.x)}
              cy={objY(g.point.y)}
              r={CHART_STROKE.markerRadius}
              fill={state}
            />
            <text
              data-chart-label=""
              x={objX(g.point.x - LABEL_OFFSET * g.normal.x)}
              y={objY(g.point.y - LABEL_OFFSET * g.normal.y)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={CHART_TYPE.labelPx}
              fill={state}
            >
              {i + 1}
            </text>
          </g>
        ))}
      </PlotStage>
    </div>
  );

  const ox = wrX(origin);
  const oy = wrY(origin);
  const wrenchView = (
    <div className="@container">
      <PlotStage
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
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
                fill={CHART_STRUCTURE.labelSecondary}
              >
                {label}
              </text>
            </g>
          ))}
        </g>

        {/* Wrench hull, far facets first */}
        <g data-series="hull">
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

        <g data-series="cone-edge-wrench">
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

        <g data-series="zero-wrench">
          <circle cx={ox} cy={oy} r={CHART_STROKE.markerRadius + 2} {...ringPaint(closed)} />
          <circle cx={ox} cy={oy} r={CHART_STROKE.structure * 1.5} fill={CHART_STRUCTURE.label} />
        </g>
      </PlotStage>
    </div>
  );

  const halfAngle = ((Math.atan(mu) * 180) / Math.PI).toFixed(1);

  return (
    <InstrumentFigure
      figureId="grasp-wrench-lab"
      className={className}
      heading="Grasp wrench space"
      controls={controls}
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="contact" swatch={<LegendSwatch role="state" mark="dot" />}>
                  contact
                </LegendItem>
                <LegendItem series="cone" swatch={<LegendSwatch role="action" mark="band" />}>
                  friction cone
                </LegendItem>
                <LegendItem series="normal" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  inward normal
                </LegendItem>
                <LegendItem series="hull" swatch={<LegendSwatch role="state" mark="band" />}>
                  wrench hull
                </LegendItem>
                <LegendItem series="cone-edge-wrench" swatch={<LegendSwatch role="action" mark="dot" />}>
                  cone-edge wrench
                </LegendItem>
                <LegendItem series="zero-wrench" swatch={<RingSwatch closed={closed} />}>
                  zero wrench{closed ? ' (inside hull)' : ' (outside hull)'}
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                <span className="text-text-dim">contacts</span>{' '}
                <span data-testid="grasp-contacts-readout">{contacts.length}</span>
                <span className="text-text-dim"> · force closure</span>{' '}
                <span data-testid="grasp-closure-readout">
                  {analysis.forceClosure ? 'yes' : 'no'}
                </span>
                <span className="text-text-dim"> · ε</span>{' '}
                <span data-testid="grasp-epsilon-readout" style={{ color: roleColour('value') }}>
                  {analysis.epsilon.toFixed(3)}
                </span>
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
                    value: analysis.forceClosure ? 'push-only cones, closed grasp' : 'push-only cones, open grasp',
                  },
                ]}
              />
              <ChartDescription
                id={wrenchDescriptionId}
                form="state"
                summary="Current wrench-space quality"
                description={`The grasp wrench hull of ${contacts.length} contacts currently reports force closure ${analysis.forceClosure ? 'yes' : 'no'} with Ferrari-Canny quality epsilon ${analysis.epsilon.toFixed(3)}; that radius is the largest origin-centered wrench ball that still fits inside the hull.`}
                states={[
                  { label: 'force closure', value: analysis.forceClosure ? 'yes' : 'no' },
                  { label: 'epsilon', value: analysis.epsilon.toFixed(3) },
                  {
                    label: 'origin',
                    value: analysis.forceClosure ? 'inside the hull' : 'outside the hull',
                  },
                  { label: 'contacts', value: String(contacts.length) },
                ]}
              />
            </>
          }
        >
          <div className="grid @min-[640px]:grid-cols-2">
            {objectView}
            {wrenchView}
          </div>
        </FigureStage>
      }
      caption="The default three-contact grasp holds force closure: the origin sits inside the wrench hull, and ε measures the margin."
      source="Schematic: computed wrench geometry for point contacts on a unit square, with torque τ per half side. Contact position runs counterclockwise from 0.00 at the top-right corner; edge midpoints are 0.125, 0.375, 0.625 and 0.875."
    />
  );
}
