'use client';

import { useState } from 'react';
import {
  APPROACH_ORDER,
  DEFAULT_APPROACH,
  approachById,
  fastestRateLabel,
  type WbcApproachId,
} from '@/lib/wbc-decomposition';
import { cx } from '@/lib/utils';

/**
 * WbcDecomposition: the three-decomposition comparison for the humanoid
 * whole-body control module. Selecting an approach redraws the control
 * stack (one box per layer, arrows labeled with what flows down to the
 * actuators) and updates the numeric readouts with the figures each source
 * actually publishes.
 *
 * The point the diagram makes: all three 2026 stacks reach the same robot,
 * but they draw the learning boundary in different places. Helix 02 keeps
 * a discrete motion-tracking controller at 1 kHz under its VLA, GR00T
 * hands latent tokens to a separate whole-body controller, and Gemini
 * Robotics 2 removes the boundary entirely.
 *
 * Interactive contract: deterministic initial render (motion-tracking RL),
 * native buttons (keyboard-accessible, aria-pressed), visible monospace
 * readouts, reset control, fixed SVG viewport (no layout shift). There is
 * no auto-playing or JS-driven motion, only hover/focus CSS transitions,
 * so the component is reduced-motion safe by construction.
 */

const WIDTH = 640;
const HEIGHT = 292;
const BOX_LEFT = 24;
const BOX_RIGHT = 616;
const BOX_W = BOX_RIGHT - BOX_LEFT;
const TOP = 46;
const BOX_H = 44;
const GAP = 28;
const ROBOT_H = 30;

export function WbcDecomposition({
  defaultApproach = DEFAULT_APPROACH,
  className,
}: {
  defaultApproach?: WbcApproachId;
  className?: string;
}) {
  const [approachId, setApproachId] = useState<WbcApproachId>(defaultApproach);
  const approach = approachById(approachId);
  const fastest = fastestRateLabel(approach);

  const reset = () => setApproachId(DEFAULT_APPROACH);

  const buttonBase =
    'rounded-sm border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]';
  const buttonIdle =
    'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text';
  const buttonActive = 'border-accent bg-surface-2 text-accent';

  const robotY = TOP + approach.layers.length * (BOX_H + GAP);

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          role="group"
          aria-label="Whole-body control decomposition"
          className="flex flex-wrap gap-1"
        >
          {APPROACH_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={approachId === id}
              onClick={() => setApproachId(id)}
              className={cx(
                buttonBase,
                approachId === id ? buttonActive : buttonIdle,
              )}
            >
              {approachById(id).name}
            </button>
          ))}
        </div>
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className={cx(buttonBase, buttonIdle)}
        >
          Reset
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
        <span className="text-text-dim">
          Representative:{' '}
          <span data-testid="representative-readout" className="text-accent">
            {approach.representative}
          </span>
        </span>
        <span className="text-text-dim">
          Layers:{' '}
          <span data-testid="layers-readout" className="text-text">
            {approach.layers.length}
          </span>
        </span>
        <span className="text-text-dim">
          Fastest loop:{' '}
          <span data-testid="fastest-loop-readout" className="text-text">
            {fastest}
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Whole-body control stack for the ${approach.name} decomposition, representative system ${approach.representative}. ${approach.layers.length} layers from ${approach.layers[0].name} down to full-body actuators. Fastest disclosed loop ${fastest}.`}
        data-testid="wbc-diagram"
        className="mt-3 block w-full"
      >
        <defs>
          <marker
            id="wbc-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0.5 L 7.5 4 L 0 7.5 z"
              fill="var(--color-border-strong)"
            />
          </marker>
        </defs>

        <text
          x={BOX_LEFT}
          y={20}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          control stack, highest layer first
        </text>
        <text
          x={BOX_RIGHT}
          y={20}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {approach.representative.toLowerCase()}
        </text>

        {approach.layers.map((layer, i) => {
          const top = TOP + i * (BOX_H + GAP);
          const isController = i === approach.layers.length - 1;
          return (
            <g key={layer.name} data-testid={`layer-${i}`}>
              <rect
                x={BOX_LEFT}
                y={top}
                width={BOX_W}
                height={BOX_H}
                fill="var(--color-surface-2)"
                stroke={
                  isController
                    ? 'var(--color-accent)'
                    : 'var(--color-border)'
                }
                strokeWidth={1}
              />
              <text
                x={BOX_LEFT + 12}
                y={top + 18}
                fill="var(--color-text)"
                fontSize={12}
                fontFamily="var(--font-sans)"
              >
                {layer.name}
              </text>
              <text
                x={BOX_LEFT + 12}
                y={top + 34}
                fill="var(--color-text-dim)"
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                emits: {layer.output}
              </text>
              <text
                x={BOX_RIGHT - 12}
                y={top + BOX_H / 2 + 4}
                textAnchor="end"
                fill={
                  layer.rateHz !== null
                    ? 'var(--color-accent)'
                    : 'var(--color-text-dim)'
                }
                fontSize={11}
                fontFamily="var(--font-mono)"
              >
                {layer.rate}
              </text>
              {i < approach.layers.length - 1 && (
                <line
                  x1={BOX_LEFT + BOX_W / 2}
                  y1={top + BOX_H + 4}
                  x2={BOX_LEFT + BOX_W / 2}
                  y2={top + BOX_H + GAP - 6}
                  stroke="var(--color-border-strong)"
                  strokeWidth={1.5}
                  markerEnd="url(#wbc-arrow)"
                />
              )}
            </g>
          );
        })}

        {/* Actuator boundary: every stack ends at the same robot. */}
        <line
          x1={BOX_LEFT + BOX_W / 2}
          y1={robotY - GAP + BOX_H + 4}
          x2={BOX_LEFT + BOX_W / 2}
          y2={robotY - 6}
          stroke="var(--color-border-strong)"
          strokeWidth={1.5}
          markerEnd="url(#wbc-arrow)"
        />
        <g data-testid="robot-boundary">
          <rect
            x={BOX_LEFT}
            y={robotY}
            width={BOX_W}
            height={ROBOT_H}
            fill="var(--color-bg)"
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          <text
            x={BOX_LEFT + BOX_W / 2}
            y={robotY + ROBOT_H / 2 + 4}
            textAnchor="middle"
            fill="var(--color-text-dim)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            full-body actuators: legs, torso, arms, hands
          </text>
        </g>
      </svg>

      <div
        data-testid="wbc-stats"
        className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs sm:grid-cols-4"
      >
        {approach.stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-[11px] text-text-dim">
              {stat.label}
            </div>
            <div className="mt-0.5 text-sm text-text">{stat.value}</div>
          </div>
        ))}
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">{approach.name}:</span>{' '}
        <span className="text-accent">{approach.representative}</span>{' '}
        <span className="text-text-dim">Layers</span>{' '}
        <span className="text-text">{approach.layers.length}</span>{' '}
        <span className="text-text-dim">Fastest loop</span>{' '}
        <span className="text-text">{fastest}</span>
      </p>
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        {approach.idea} In this stack, {approach.interfaceNote}. Amber marks
        the layer that talks to the actuators. Openness: {approach.openness}.
        {approach.lineage.length > 0
          ? ` Same decomposition: ${approach.lineage.join(', ')}.`
          : ''}
      </p>
    </div>
  );
}
