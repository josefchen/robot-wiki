'use client';

import { useState } from 'react';
import {
  DEFAULT_ANGLES_DEG,
  JOINT_LIMIT_DEG,
  LINK_LENGTHS,
  planarForwardKinematics,
  totalReach,
} from '@/lib/planar-fk';
import { cx } from '@/lib/utils';

/**
 * PlanarFkArm: the 2D forward-kinematics visualizer for the classical
 * kinematics module. Three revolute joints drive a planar arm; sliders set
 * each joint angle relative to its parent link, and the readout reports the
 * joint angles plus the end-effector position computed by the running sum
 * of link vectors (the planar form of the FK transform product).
 *
 * Interactive contract: typed props, deterministic render, visible numeric
 * readouts, reset control, keyboard-accessible native sliders with ARIA
 * labels, fixed viewBox (no layout shift), no JS-driven motion (scrub-only,
 * reduced-motion safe by construction).
 */

const WIDTH = 640;
const HEIGHT = 560;
const ORIGIN_X = 320;
const ORIGIN_Y = 280;
const SCALE = 113; // px per link unit; reach 2.30 -> 259.9 px
const REACH_PX = totalReach(LINK_LENGTHS) * SCALE;

const JOINT_META = [
  { id: 'fk-joint-1', label: 'Base joint', short: 'θ1' },
  { id: 'fk-joint-2', label: 'Elbow joint', short: 'θ2' },
  { id: 'fk-joint-3', label: 'Wrist joint', short: 'θ3' },
] as const;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

/** Signed fixed-point readout, instrument style: "+0.42" / "-1.03". */
function formatSigned(v: number): string {
  const s = v.toFixed(2);
  return s.startsWith('-') ? s : `+${s}`;
}

function toSvgX(x: number): number {
  return f(ORIGIN_X + x * SCALE);
}

function toSvgY(y: number): number {
  return f(ORIGIN_Y - y * SCALE);
}

export function PlanarFkArm({ className }: { className?: string }) {
  const [angles, setAngles] = useState<number[]>([...DEFAULT_ANGLES_DEG]);

  const { pivots, effector } = planarForwardKinematics(LINK_LENGTHS, angles);

  // Rendering chain: base pivot, intermediate joints, then the effector tip.
  const points = [...pivots, effector];

  function setJoint(index: number, value: number): void {
    setAngles((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  function reset(): void {
    setAngles([...DEFAULT_ANGLES_DEG]);
  }

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        {JOINT_META.map((joint, i) => (
          <div key={joint.id}>
            <label
              htmlFor={joint.id}
              className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
            >
              {joint.label}
              <span
                data-testid={`fk-theta-${i + 1}`}
                className="font-mono text-xs normal-case tracking-normal text-text"
              >
                {angles[i]}°
              </span>
            </label>
            <input
              id={joint.id}
              type="range"
              min={-JOINT_LIMIT_DEG}
              max={JOINT_LIMIT_DEG}
              step={1}
              value={angles[i]}
              onChange={(e) => setJoint(i, Number(e.target.value))}
              aria-label={`${joint.label} angle in degrees, currently ${angles[i]}`}
              className="mt-2 w-full accent-accent"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={reset}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Planar three-link arm. Base angle ${angles[0]} degrees, elbow ${angles[1]} degrees, wrist ${angles[2]} degrees. End effector at x ${formatSigned(effector.x)}, y ${formatSigned(effector.y)} link units.`}
        className="mt-4 block w-full"
      >
        {/* Reachable workspace disc. */}
        <circle
          cx={ORIGIN_X}
          cy={ORIGIN_Y}
          r={f(REACH_PX)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={1}
          strokeDasharray="4 5"
        />
        {/* Base-frame axes. */}
        <line
          x1={f(ORIGIN_X - REACH_PX)}
          y1={ORIGIN_Y}
          x2={f(ORIGIN_X + REACH_PX)}
          y2={ORIGIN_Y}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <line
          x1={ORIGIN_X}
          y1={f(ORIGIN_Y - REACH_PX)}
          x2={ORIGIN_X}
          y2={f(ORIGIN_Y + REACH_PX)}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <text
          x={f(ORIGIN_X + REACH_PX - 4)}
          y={ORIGIN_Y - 8}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={11}
          fontFamily="var(--font-mono)"
        >
          +x
        </text>
        <text
          x={ORIGIN_X + 8}
          y={f(ORIGIN_Y - REACH_PX + 14)}
          fill="var(--color-text-dim)"
          fontSize={11}
          fontFamily="var(--font-mono)"
        >
          +y
        </text>
        <text
          x={f(ORIGIN_X + REACH_PX - 4)}
          y={f(ORIGIN_Y + REACH_PX - 8)}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          reach {totalReach(LINK_LENGTHS).toFixed(2)}
        </text>

        {/* Links. */}
        {points.slice(0, -1).map((p, i) => {
          const q = points[i + 1];
          return (
            <line
              key={`link-${i}`}
              data-testid={`fk-link-${i + 1}`}
              x1={toSvgX(p.x)}
              y1={toSvgY(p.y)}
              x2={toSvgX(q.x)}
              y2={toSvgY(q.y)}
              stroke="var(--color-text-dim)"
              strokeWidth={7}
              strokeLinecap="round"
            />
          );
        })}

        {/* Joint hubs (base plus the two intermediate joints). */}
        {pivots.map((p, i) => (
          <g key={`joint-${i}`}>
            <circle
              cx={toSvgX(p.x)}
              cy={toSvgY(p.y)}
              r={i === 0 ? 10 : 8}
              fill="var(--color-surface-2)"
              stroke="var(--color-border-strong)"
              strokeWidth={1.5}
            />
            <circle
              cx={toSvgX(p.x)}
              cy={toSvgY(p.y)}
              r={2.5}
              fill={i === 0 ? 'var(--color-text-dim)' : 'var(--color-border-strong)'}
            />
          </g>
        ))}

        {/* End-effector marker. */}
        <g data-testid="fk-effector-marker">
          <circle
            cx={toSvgX(effector.x)}
            cy={toSvgY(effector.y)}
            r={7}
            fill="var(--color-bg)"
            stroke="var(--color-accent)"
            strokeWidth={2}
          />
          <circle
            cx={toSvgX(effector.x)}
            cy={toSvgY(effector.y)}
            r={2}
            fill="var(--color-accent)"
          />
        </g>
      </svg>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">end effector</span>{' '}
        <span className="text-text-dim">x</span>{' '}
        <span data-testid="fk-ee-x" className="text-accent">
          {formatSigned(effector.x)}
        </span>{' '}
        <span className="text-text-dim">y</span>{' '}
        <span data-testid="fk-ee-y" className="text-accent">
          {formatSigned(effector.y)}
        </span>{' '}
        <span className="text-text-dim">link units</span>
      </p>
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Link lengths 1.00, 0.75, and 0.55. Each angle is measured relative to
        its parent link, and the plotted position is the running sum of the
        three link vectors: the planar form of the forward-kinematics
        transform product.
      </p>
    </div>
  );
}
