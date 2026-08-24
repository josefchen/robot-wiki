'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui';
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
import { cx } from '@/lib/utils';

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
 * Reproducibility contract: the scene is a pure function of the slider
 * state. Reset restores the default three-contact grasp at mu 0.70. Every
 * rendered coordinate is rounded through f(), so SSR HTML and hydration
 * agree byte for byte and validators can assert exact readout values.
 *
 * Interactive contract: native range inputs and buttons (keyboard
 * accessible), visible monospace readouts, a reset control, fixed SVG
 * viewports (no layout shift), and nothing animates.
 */

const VIEW_W = 320;
const VIEW_H = 300;

/** Round every rendered geometry value: SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

/** Object view: the unit square (half side 1) mapped to pixels. */
const OBJ = { cx: 160, cy: 150, scale: 95 };
const objX = (x: number) => f(OBJ.cx + OBJ.scale * x);
const objY = (y: number) => f(OBJ.cy - OBJ.scale * y);

/**
 * Wrench view: oblique projection of (fx, fy, tau). Torque recedes up and
 * to the left so the fx-fy plane stays square to the reader. The kernel
 * direction (0.55, -0.45, 1) is the view depth axis used for painter
 * sorting.
 */
const WR = { cx: 160, cy: 152, scale: 60 };
const wrX = (v: Vec3) => f(WR.cx + WR.scale * (v.x - 0.55 * v.z));
const wrY = (v: Vec3) => f(WR.cy - WR.scale * (v.y + 0.45 * v.z));
const depth = (v: Vec3) => 0.55 * v.x - 0.45 * v.y + v.z;

const CONE_LEN = 0.5;

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

  const stateColor = analysis.forceClosure
    ? 'var(--color-ok)'
    : 'var(--color-err)';

  const buttonBase =
    'rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-dim disabled:active:translate-y-0';

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
  const axisEnds: { v: Vec3; label: string }[] = [
    { v: { x: 1.7, y: 0, z: 0 }, label: 'fx' },
    { v: { x: 0, y: 1.7, z: 0 }, label: 'fy' },
    { v: { x: 0, y: 0, z: 1.9 }, label: 'τ' },
  ];

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div>
        <label
          htmlFor="grasp-mu"
          className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
        >
          <span>
            <span className="normal-case tracking-normal">μ</span> friction
            coefficient
          </span>
          <span
            className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
            data-testid="grasp-mu-value"
          >
            {mu.toFixed(2)}
          </span>
        </label>
        <input
          id="grasp-mu"
          type="range"
          min={0.05}
          max={1.0}
          step={0.05}
          value={mu}
          onChange={(e) => setMu(Number(e.target.value))}
          aria-label={`Friction coefficient mu, currently ${mu.toFixed(2)}`}
          className="mt-2 w-full accent-accent"
        />
        <p className="mt-1 font-sans text-[11px] leading-snug text-text-dim">
          The cones narrow as μ drops; the wrench hull shrinks with them.
        </p>
      </div>

      <fieldset className="mt-4">
        <legend className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
          contact positions
        </legend>
        <div className="mt-1 grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {contacts.map((s, i) => (
            <div key={i}>
              <label
                htmlFor={`grasp-contact-${i}`}
                className="flex items-baseline justify-between gap-2 font-mono text-[11px] text-text-dim"
              >
                contact {i + 1}
                <span
                  className="whitespace-nowrap font-mono text-xs text-text"
                  data-testid={`grasp-contact-${i + 1}-value`}
                >
                  {s.toFixed(3)}
                </span>
              </label>
              <input
                id={`grasp-contact-${i}`}
                type="range"
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
                className="mt-1 w-full accent-accent"
              />
            </div>
          ))}
        </div>
        <p className="mt-1 font-sans text-[11px] leading-snug text-text-dim">
          Position along the perimeter: 0.00 at the top-right corner,
          increasing counterclockwise. The exact edge midpoints are 0.125,
          0.375, 0.625, and 0.875.
        </p>
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label={`Square object held by ${contacts.length} frictional point contacts; each contact shows its friction cone opening inward.`}
          aria-describedby={objectDescriptionId}
          data-testid="grasp-object-view"
          className="block w-full"
        >
          {/* Object */}
          <rect
            x={objX(-1)}
            y={objY(1)}
            width={f(2 * OBJ.scale)}
            height={f(2 * OBJ.scale)}
            fill="var(--color-surface-2)"
            stroke="var(--color-border-strong)"
            strokeWidth={1}
          />
          {/* Center marker */}
          <line
            x1={objX(-0.08)}
            y1={objY(0)}
            x2={objX(0.08)}
            y2={objY(0)}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          <line
            x1={objX(0)}
            y1={objY(-0.08)}
            x2={objX(0)}
            y2={objY(0.08)}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          {geoms.map((g, i) => (
            <g key={i}>
              {/* Inward normal ray */}
              <line
                x1={objX(g.point.x)}
                y1={objY(g.point.y)}
                x2={objX(g.point.x + 0.62 * g.normal.x)}
                y2={objY(g.point.y + 0.62 * g.normal.y)}
                stroke="var(--color-text-dim)"
                strokeWidth={1}
                strokeDasharray="3 4"
                opacity={0.55}
              />
              {/* Friction cone */}
              <path
                d={conePath(g.point, g.normal, mu)}
                fill="var(--color-accent)"
                opacity={0.16}
              />
              <path
                d={conePath(g.point, g.normal, mu)}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={1}
                opacity={0.55}
              />
              {/* Contact point and index */}
              <circle
                cx={objX(g.point.x)}
                cy={objY(g.point.y)}
                r={3.5}
                fill="var(--color-accent)"
                stroke="var(--color-surface)"
                strokeWidth={1}
              />
              <text
                x={objX(g.point.x - 0.2 * g.normal.x)}
                y={objY(g.point.y - 0.2 * g.normal.y) + 3}
                textAnchor="middle"
                fill="var(--color-text-dim)"
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {i + 1}
              </text>
            </g>
          ))}
        </svg>

        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label={`Grasp wrench space: the convex hull of the primitive contact wrenches. Force closure ${analysis.forceClosure ? 'yes' : 'no'}, quality epsilon ${analysis.epsilon.toFixed(3)}.`}
          aria-describedby={wrenchDescriptionId}
          data-testid="grasp-wrench-view"
          className="block w-full"
        >
          {/* Axes through the origin */}
          {axisEnds.map(({ v, label }) => (
            <g key={label}>
              <line
                x1={wrX({ x: -v.x * 0.82, y: -v.y * 0.82, z: -v.z * 0.82 })}
                y1={wrY({ x: -v.x * 0.82, y: -v.y * 0.82, z: -v.z * 0.82 })}
                x2={wrX(v)}
                y2={wrY(v)}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray="2 5"
              />
              <text
                x={wrX({ x: v.x * 1.08, y: v.y * 1.08, z: v.z * 1.08 })}
                y={wrY({ x: v.x * 1.08, y: v.y * 1.08, z: v.z * 1.08 }) + 3}
                textAnchor="middle"
                fill="var(--color-text-dim)"
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {label}
              </text>
            </g>
          ))}

          {/* Wrench hull, far facets first */}
          {facets.map((facet, i) => (
            <polygon
              key={i}
              points={facet.points}
              fill="var(--color-accent)"
              opacity={0.09}
            />
          ))}
          {facets.map((facet, i) => (
            <polygon
              key={i}
              points={facet.points}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1}
              opacity={0.5}
            />
          ))}

          {/* Primitive wrenches (skip the origin, drawn as the marker) */}
          {analysis.primitives.map((p, i) => (
            <circle
              key={i}
              cx={wrX(p)}
              cy={wrY(p)}
              r={2.5}
              fill="var(--color-accent)"
            />
          ))}

          {/* Zero-wrench origin marker: green inside, red on or outside */}
          <circle
            cx={wrX(origin)}
            cy={wrY(origin)}
            r={5}
            fill="var(--color-surface)"
            stroke={stateColor}
            strokeWidth={1.5}
          />
          <circle cx={wrX(origin)} cy={wrY(origin)} r={1.5} fill={stateColor} />
          <text
            x={wrX(origin) + 9}
            y={wrY(origin) - 6}
            fill={stateColor}
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            0
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-text-dim">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-4"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--color-accent) 15%, transparent)',
            }}
          />
          wrench hull
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-accent)' }}
          />
          cone-edge wrench
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border"
            style={{ borderColor: stateColor }}
          />
          zero wrench
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          data-pagefind-ignore
          type="button"
          onClick={addContact}
          disabled={contacts.length >= MAX_CONTACTS}
          aria-label="Add a contact at the emptiest perimeter location"
          className={buttonBase}
        >
          Add contact
        </button>
        <button
          data-pagefind-ignore
          type="button"
          onClick={removeContact}
          disabled={contacts.length <= MIN_CONTACTS}
          aria-label="Remove the last contact"
          className={buttonBase}
        >
          Remove contact
        </button>
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          aria-label="Reset: restore the default grasp and friction"
          className={buttonBase}
        >
          Reset
        </button>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">contacts</span>{' '}
        <span data-testid="grasp-contacts-readout" className="text-text">
          {contacts.length}
        </span>{' '}
        <span className="text-text-dim">force closure</span>{' '}
        <span
          data-testid="grasp-closure-readout"
          className={analysis.forceClosure ? 'text-ok' : 'text-err'}
        >
          {analysis.forceClosure ? 'yes' : 'no'}
        </span>{' '}
        <span className="text-text-dim">ε</span>{' '}
        <span data-testid="grasp-epsilon-readout" className="text-accent">
          {analysis.epsilon.toFixed(3)}
        </span>
      </p>

      <ChartDescription
        id={objectDescriptionId}
        className="mt-3"
        form="state"
        summary="Current object contacts and cones"
        description={`${contacts.length} frictional contacts on the unit square at mu ${mu.toFixed(2)} open inward cones of half-angle ${(Math.atan(mu) * 180 / Math.PI).toFixed(1)} degrees; each contact can push along its cone but cannot pull.`}
        states={[
          { label: 'contacts', value: String(contacts.length) },
          { label: 'mu', value: mu.toFixed(2) },
          { label: 'cone half-angle', value: `${(Math.atan(mu) * 180 / Math.PI).toFixed(1)}°` },
          {
            label: 'regime',
            value: analysis.forceClosure ? 'push-only cones, closed grasp' : 'push-only cones, open grasp',
          },
        ]}
      />
      <ChartDescription
        id={wrenchDescriptionId}
        className="mt-3"
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

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Left: the object and its friction cones, half-angle arctan μ. Right:
        the grasp wrench space, the convex hull of the cone-edge wrenches in
        (fx, fy, τ), with τ scaled per half side of the object. Force closure
        holds exactly when the origin sits strictly inside the hull; ε is the
        radius of the largest origin-centered wrench ball that still fits.
        Things worth trying: remove contact 3 and watch the hull collapse
        onto the origin, then slide contact 2 to 0.625 so the pair is
        antipodal; or drag μ down and watch ε shrink.
      </p>
    </div>
  );
}
