'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
  SliderEnds,
} from '@/components/ui/instrument';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  roleColour,
} from '@/components/motion/chart';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, Line, Solid } from '@/components/iso/react/draw';
import { Stage, asksForStillness } from '@/components/iso/react/live';
import { dotsSvg, lineSvg, solidSvg } from '@/components/iso/iso-kit';
import {
  EPSILON_FULL,
  HEIGHT as OBJECT_H,
  WIDTH as OBJECT_W,
  carriageInFront,
  carriageParts,
  cordPath,
  eyeBoltParts,
  restStationFor,
  modelPointAt,
  needleDegrees,
  needlePath,
  sceneOf,
  shiftBy,
  type Group,
  type Part,
} from '@/components/iso/figures/grasp-test-table';
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
  contactPositionFromPoint,
  pushAngle,
  resistedPushes,
  suggestContactPosition,
  type Vec3,
} from '@/lib/grasp';

/**
 * GraspWrenchLab: robot fingertips holding a block, drawn as a grasp test
 * table.
 *
 * The block is the lib's unit square, seen on a round test table, and each
 * fingertip is a frictional point contact on a post that the reader drags
 * round the block's sides. The wedge on the block's top at each fingertip
 * is its friction cone, half-angle arctan(mu); the surface slider sets mu.
 * A cord from an eye bolt on the block's edge, on the line through its
 * centre, runs to a force gauge on a carriage that rides the table's rim
 * and pulls toward eight stations, 45 degrees apart:
 * a force through the centre in each direction, the same eight test forces
 * as before. A telltale pin stands up at each station whose pull the
 * contacts cancel with no net twist (resistedPushes in lib/grasp); under
 * force closure every pin is up. The dial reads the Ferrari-Canny epsilon,
 * full at 1.00 and clamped there, and rests on its zero stop exactly when
 * the grip fails. The standing pins are the one lit set: they answer the
 * figure's question, which directions the grip holds. "Run the pull test" walks
 * the carriage round the stations; reduced motion keeps the still pose.
 *
 * The grasp wrench space itself (the hull of cone-edge wrenches in
 * (fx, fy, tau), projected obliquely) sits in "Adjust more" with the
 * numeric contact sliders; the numbers sit in "How this was made".
 *
 * Reproducibility: the scene is a pure function of the contact positions
 * and mu. A dragged fingertip snaps to the sliders' 0.005 perimeter grid,
 * Reset restores the three-contact grasp at mu 0.70, and every rendered
 * coordinate is rounded, so SSR HTML and hydration agree.
 */

const VIEW_W = CHART_VIEW_WIDTH;
const WRENCH_H = 280;

/** Round every rendered geometry value: SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

export { EPSILON_FULL };

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

/** One stop of the pull test, in seconds: the carriage travels to a station, then pulls. */
export const TRAVEL_S = 0.55;
export const PULL_S = 0.7;
export const TEST_S = PUSH_COUNT * (TRAVEL_S + PULL_S);
/** How far a pull the grip cannot cancel drags the block before the fingers catch it, in world units. */
export const NUDGE = 5;

/** Where the pull test stands `t` seconds in: the station, the carriage's angle on the rim, the pull's share. */
export function testAt(t: number): { station: number; angle: number; pull: number; done: boolean } {
  const step = TRAVEL_S + PULL_S;
  if (t >= TEST_S) return { station: PUSH_COUNT - 1, angle: stationAngle(PUSH_COUNT - 1), pull: 0, done: true };
  const station = Math.min(PUSH_COUNT - 1, Math.floor(t / step));
  const into = t - station * step;
  if (into < TRAVEL_S) {
    const from = station === 0 ? stationAngle(0) - Math.PI / 4 : stationAngle(station - 1);
    const u = into / TRAVEL_S;
    const e = u * u * (3 - 2 * u);
    return { station, angle: from + (stationAngle(station) - from) * e, pull: 0, done: false };
  }
  return { station, angle: stationAngle(station), pull: Math.sin((Math.PI * (into - TRAVEL_S)) / PULL_S), done: false };
}
/** The world angle of station `k` on the rim, unwrapped so the carriage walks one way round. */
const stationAngle = (k: number) => -pushAngle(k);

/** The surface slider's value in words. */
function surfaceWords(mu: number) {
  if (mu < 0.25) return 'slippery';
  if (mu < 0.5) return 'a little slippery';
  if (mu < 0.8) return 'fairly rough';
  return 'very rough';
}

/** The readout at rest: what the eight test pulls show right now. */
export function noteText(closed: boolean, slipping: number) {
  if (closed) return 'Pulls from every direction are resisted: the grip holds';
  if (slipping === 0) return 'Every pull is resisted, but a twist can turn the block: the grip fails';
  return `${slipping} of ${PUSH_COUNT} pulls ${slipping === 1 ? 'slips' : 'slip'} free: the grip fails`;
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

const still = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

function PartView({ part, dragging, onGrab }: { part: Part; dragging: number | null; onGrab: (index: number, pointerId: number, el: Element) => void }): ReactNode {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        halo={part.halo}
        crease={part.crease}
        inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'fill') return <path className="iso-shade" data-shade={part.shade} d={part.d} />;
  if (part.kind === 'halo') return <path className="iso-halo" d={part.d} />;
  const children = 'parts' in part ? part.parts.map((child, index) => <PartView key={index} part={child} dragging={dragging} onGrab={onGrab} />) : null;
  if (part.kind === 'finger') {
    return (
      <g data-finger={part.index + 1}>
        {children}
        <circle
          cx={f(part.grab[0])}
          cy={f(part.grab[1])}
          r={16}
          fill="none"
          pointerEvents="all"
          style={{ cursor: dragging === part.index ? 'grabbing' : 'grab', touchAction: 'none' }}
          onPointerDown={(e) => onGrab(part.index, e.pointerId, e.currentTarget)}
        />
      </g>
    );
  }
  if (part.kind === 'station') return <g data-push={part.held ? 'resisted' : 'slips'} data-station={part.index}>{children}</g>;
  if (part.kind === 'wedges') return <g data-part="cone">{children}</g>;
  return null;
}

const carriageSvg = (angle: number) =>
  carriageParts([Math.cos(angle), Math.sin(angle)])
    .map((part) =>
      part.kind === 'solid' ? solidSvg(part.paths, { tone: part.tone }) : part.kind === 'line' ? lineSvg(part.d, { tone: part.tone }) : part.kind === 'dots' ? dotsSvg(part.points, { size: part.size, tone: part.tone }) : '',
    )
    .join('');

/** The eye bolt in the active tapped hole and the cord from it to the gauge's hook. */
const cordSvg = (station: number, nudge: [number, number]) =>
  eyeBoltParts(station, nudge)
    .map((part) => (part.kind === 'solid' ? solidSvg(part.paths, { tone: part.tone }) : part.kind === 'dots' ? dotsSvg(part.points, { size: part.size, tone: part.tone }) : ''))
    .join('') + lineSvg(cordPath(station, nudge), { tone: 'mid' });

export function GraspWrenchLab({ className }: { className?: string }) {
  const uid = useId();
  const objectDescriptionId = `${uid}-object-description`;
  const wrenchDescriptionId = `${uid}-wrench-description`;
  const [mu, setMu] = useState(DEFAULT_MU);
  const [contacts, setContacts] = useState<number[]>(DEFAULT_CONTACTS);
  const [dragging, setDragging] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  /** While the pull test runs, how many stations it has finished. */
  const [tested, setTested] = useState(PUSH_COUNT);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const analysis = useMemo(() => analyzeGrasp(contacts, mu), [contacts, mu]);
  const resisted = useMemo(() => resistedPushes(analysis.primitives), [analysis]);
  // Stations not yet reached in a running test keep their pins down; at rest every station is tested.
  const testedNow = testing ? tested : PUSH_COUNT;
  const shownHeld = useMemo(() => resisted.map((held, k) => held && k < testedNow), [resisted, testedNow]);
  const scene = useMemo(() => sceneOf({ contacts, mu, held: shownHeld }), [contacts, mu, shownHeld]);
  const runs = useMemo(() => {
    const list: Array<{ group: Group; parts: Part[] }> = [];
    for (const part of scene) {
      const last = list[list.length - 1];
      if (last && last.group === part.group) last.parts.push(part);
      else list.push({ group: part.group, parts: [part] });
    }
    return list;
  }, [scene]);

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
        const mx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
        const my = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
        pts.sort((a, b) => Math.atan2(a.y - my, a.x - mx) - Math.atan2(b.y - my, b.x - mx));
        return {
          points: pts.map((p) => `${p.x},${p.y}`).join(' '),
          depth: pts.reduce((sum, p) => sum + p.d, 0) / pts.length,
        };
      })
      .sort((a, b) => b.depth - a.depth);
  }, [analysis]);

  const closed = analysis.forceClosure;
  const slipping = resisted.filter((held) => !held).length;
  const state = roleColour('state');
  const action = roleColour('action');
  const halfAngle = ((Math.atan(mu) * 180) / Math.PI).toFixed(1);
  const note = noteText(closed, slipping);
  // At rest the carriage stands at the first station whose pull slips, or at a clear station facing the viewer.
  const restStation = restStationFor(contacts, resisted);

  const blockRef = useRef<SVGGElement>(null);
  const backRef = useRef<SVGGElement>(null);
  const frontRef = useRef<SVGGElement>(null);
  const cordRef = useRef<SVGGElement>(null);
  const readoutEl = useCallback(
    () => svgRef.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]') ?? null,
    [],
  );
  const resistedRef = useRef(resisted);
  useLayoutEffect(() => {
    resistedRef.current = resisted;
  }, [resisted]);

  /**
   * Put the carriage at `angle` and, once it stands at `station`, the cord
   * taut from that station's eye bolt to its gauge, with the block nudged by
   * `nudge` toward it. While the carriage travels the cord is unhooked.
   */
  const place = useCallback((angle: number, nudge: number, station: number | null) => {
    const dir: [number, number] = [Math.cos(angle), Math.sin(angle)];
    const front = carriageInFront(dir);
    const svg = carriageSvg(angle);
    if (backRef.current) backRef.current.innerHTML = front ? '' : svg;
    if (frontRef.current) frontRef.current.innerHTML = front ? svg : '';
    const offset: [number, number] = [dir[0] * nudge, dir[1] * nudge];
    if (cordRef.current) cordRef.current.innerHTML = station === null ? '' : cordSvg(station, offset);
    blockRef.current?.setAttribute('transform', nudge ? shiftBy(offset[0], offset[1]) : '');
  }, []);

  // The pull test: the carriage walks the eight stations and pulls at each.
  useEffect(() => {
    if (!testing) return;
    let frame = 0;
    const start = performance.now();
    let shown = -1;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const { station, angle, pull, done } = testAt(t);
      if (done) {
        setTested(PUSH_COUNT);
        setTesting(false);
        return;
      }
      const held = resistedRef.current[station];
      place(angle, held ? 0 : NUDGE * pull, pull > 0 ? station : null);
      const finished = pull > 0.5 || t - station * (TRAVEL_S + PULL_S) > TRAVEL_S + PULL_S / 2 ? station + 1 : station;
      if (finished !== shown) {
        shown = finished;
        setTested(finished);
      }
      const readout = readoutEl();
      if (readout) readout.textContent = `pull ${station + 1} of ${PUSH_COUNT} · ${pull > 0 ? (held ? 'held' : 'slips') : 'moving to its station'}`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [testing, place, readoutEl]);

  // At rest: every station tested, the carriage at its rest station, the readout says what the pulls show.
  useEffect(() => {
    if (testing) return;
    place(stationAngle(restStation), 0, restStation);
    const readout = readoutEl();
    if (readout) readout.textContent = note;
  }, [testing, restStation, note, contacts, mu, place, readoutEl]);

  // The pull test starts from the reader's control; under reduced motion it does not run.
  const toggleTest = () => {
    if (testing) {
      setTesting(false);
      return;
    }
    if (still()) return;
    setTested(0);
    setTesting(true);
  };

  const addContact = () =>
    setContacts((c) =>
      c.length >= MAX_CONTACTS ? c : [...c, suggestContactPosition(c)],
    );
  const removeContact = () =>
    setContacts((c) => (c.length > MIN_CONTACTS ? c.slice(0, -1) : c));
  const reset = () => {
    setTesting(false);
    setMu(DEFAULT_MU);
    setContacts(DEFAULT_CONTACTS);
  };

  /** Moves contact i to the edge point under the pointer, on the slider grid. */
  function dragContact(i: number, clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vx = ((clientX - rect.left) / rect.width) * OBJECT_W;
    const vy = ((clientY - rect.top) / rect.height) * OBJECT_H;
    const point = modelPointAt(vx, vy);
    const s = contactPositionFromPoint(point.x, point.y);
    if (s === null) return;
    setContacts((c) => c.map((v, idx) => (idx === i ? s : v)));
  }

  const grab = (index: number, pointerId: number, el: Element) => {
    (el as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(pointerId);
    setTesting(false);
    setDragging(index);
  };

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
      <button
        type="button"
        data-brand-control-id="control:secondary-action"
        data-pagefind-ignore
        data-testid="grasp-run"
        onClick={toggleTest}
        className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
      >
        {testing ? 'Stop the pull test' : 'Run the pull test'}
      </button>
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
    <Stage className="iso-stage">
      <svg
        ref={svgRef}
        className="iso-svg"
        viewBox={`0 0 ${OBJECT_W} ${OBJECT_H}`}
        role="img"
        aria-label={`A square block on a round test table, held by ${contacts.length} fingertips; a cord pulls it toward ${PUSH_COUNT} stations in turn, and ${PUSH_COUNT - slipping} of ${PUSH_COUNT} pulls are resisted.`}
        aria-describedby={objectDescriptionId}
        focusable="false"
        data-testid="grasp-object-view"
        onPointerMove={(e) => {
          if (dragging !== null) dragContact(dragging, e.clientX, e.clientY);
        }}
        onPointerUp={() => setDragging(null)}
        onPointerCancel={() => setDragging(null)}
      >
        {runs.map((run, index) => {
          if (run.group === 'static') {
            return (
              <g key={`static-${index}`}>
                {run.parts.map((part, k) => (
                  <PartView key={k} part={part} dragging={dragging} onGrab={grab} />
                ))}
              </g>
            );
          }
          if (run.group === 'block') {
            return (
              <g key="block" ref={blockRef} data-testid="grasp-block">
                {run.parts.map((part, k) => (
                  <PartView key={k} part={part} dragging={dragging} onGrab={grab} />
                ))}
              </g>
            );
          }
          const slot = run.parts[0];
          if (slot.kind !== 'slot') return null;
          if (slot.name === 'carriage-back') return <g key="carriage-back" ref={backRef} />;
          if (slot.name === 'carriage-front') return <g key="carriage-front" ref={frontRef} />;
          if (slot.name === 'cord') {
            return <g key="cord" ref={cordRef} data-testid="grasp-cord" dangerouslySetInnerHTML={{ __html: cordSvg(restStation, [0, 0]) }} />;
          }
          return (
            <path
              key="needle"
              className="iso-line"
              data-tone="hi"
              data-free=""
              data-testid="grasp-margin-needle"
              data-epsilon={analysis.epsilon.toFixed(3)}
              data-degrees={needleDegrees(analysis.epsilon).toFixed(1)}
              d={needlePath(analysis.epsilon)}
            />
          );
        })}
      </svg>
    </Stage>
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
            onClick={contacts.length >= MAX_CONTACTS ? undefined : addContact}
            aria-disabled={contacts.length >= MAX_CONTACTS || undefined}
            aria-label="Add contact at the emptiest perimeter location"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Add contact
          </button>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={contacts.length <= MIN_CONTACTS ? undefined : removeContact}
            aria-disabled={contacts.length <= MIN_CONTACTS || undefined}
            aria-label="Remove contact: the last one placed"
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
        <AnatomyStage
          viewWidth={OBJECT_W}
          hint={testing ? 'Pulling toward each station in turn' : 'Drag a finger round the block; inside its wedge a finger can push without slipping'}
          readout={note}
          status="Schematic: computed for an ideal block, not measured on a robot"
          data-testid="grasp-stage-frame"
        >
          {objectView}
        </AnatomyStage>
      }
      caption="A robot hand must place its fingers so they can resist a push from any direction, or the object slips."
      method={
        <>
          <p>
            Seen on the test table, the block is a square of half side 1 and each fingertip is a point contact.
            Friction lets a contact push anywhere inside its friction cone, drawn as the wedge on the block&apos;s
            top at each fingertip, of half-angle arctan μ, but never pull; at μ{' '}
            {mu.toFixed(2)} the half-angle is {halfAngle}°. The surface slider sets μ from 0.05 to 1.00.
          </p>
          <p>
            The two edge forces of each cone, with their torque τ about the centre measured per half side, are
            the primitive wrenches (fx, fy, τ). Their convex hull is the grasp wrench space drawn under Adjust
            more. Force closure holds exactly when the origin sits strictly inside the hull: the fingertips can
            then balance any push or twist. The dial shows the Ferrari-Canny quality ε, the radius of the
            largest origin-centred ball inside the hull. The dial rests on its zero stop exactly when ε = 0 and
            the grip fails; any reading above that is a grip that holds. The three-finger grasp at μ 0.70
            gives ε = 0.444; the dial reads full at ε = 1.00, which four fingertips at the edge midpoints reach
            on the roughest surface.
          </p>
          <p>
            The eight test forces act through the centre, 45° apart: a cord tied to an eye bolt on the block&apos;s
            edge, on the line through its centre, pulls it toward each station on the rim in turn: the same force
            as a push through the centre from the opposite side. A pull counts as resisted when a non-negative mix of the primitive wrenches supplies
            the opposite force with no net twist; its telltale pin then stands up, lit, and under force closure every
            pin is up. A pull the grip cannot cancel drags the block toward the station during the test.
          </p>
          <p>
            Contact positions run counterclockwise from 0.000 at the top-right corner of the square as the model
            draws it, which is the far right corner on the table, so the edge midpoints are 0.125, 0.375, 0.625
            and 0.875. A dragged fingertip snaps to the 0.005 grid of the contact sliders; the pips on each
            finger&apos;s base give its number.
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
