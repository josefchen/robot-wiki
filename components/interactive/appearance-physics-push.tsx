'use client';

import { useState } from 'react';
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
import { cx } from '@/lib/utils';

/**
 * AppearancePhysicsPush: the three-layer push test.
 *
 * One scene, three layers. The appearance layer renders the mug and the
 * table (standing in for a neural reconstruction or generated assets); the
 * physics-proxy layer adds collision geometry, mass, and friction; the
 * simulation layer shows the integrated result. The push test makes the
 * module's central argument mechanically: with only appearance enabled,
 * pushing the mug does nothing, because a renderer has no dynamics; with
 * the physics proxy enabled, the same push produces deterministic motion.
 *
 * Interactive contract: typed props, deterministic render, monospace
 * numeric readouts, reset control, native keyboard-accessible inputs, fixed
 * chart geometry (no layout shift). Button-driven only, no auto-playing or
 * JS-driven motion, so it is reduced-motion safe by construction.
 */
type AppearancePhysicsPushProps = {
  /** Initial push force in newtons. Default 4. */
  defaultForceN?: number;
  className?: string;
};

const VIEW_W = 560;
const VIEW_H = 320;
const TABLE_Y = 220;
const TABLE_H = 30;
const MUG_W = 36;
const MUG_H = 46;
const TRACK_X0 = 80;
const TRACK_X1 = 480;

const MONO = 'var(--font-mono)';
const DIM = 'var(--color-text-dim)';
const ACCENT = 'var(--color-accent)';
const OK = 'var(--color-ok)';
const BORDER_STRONG = 'var(--color-border-strong)';
const SURFACE_2 = 'var(--color-surface-2)';

/** Mug left edge in scene pixels for a track position in meters. */
function mugX(positionM: number): number {
  return TRACK_X0 + (positionM / TRACK_MAX_M) * (TRACK_X1 - TRACK_X0);
}

function formatN(force: number): string {
  return `${force.toFixed(1)} N`;
}

/** Layer caption with a color key; dims when the layer is off. */
function LayerCaption({
  x,
  index,
  name,
  detail,
  color,
  on,
}: {
  x: number;
  index: string;
  name: string;
  detail: string;
  color: string;
  on: boolean;
}) {
  return (
    <g opacity={on ? 1 : 0.4}>
      <rect x={x} y={10} width={10} height={10} fill="none" stroke={color} strokeWidth={1.5} />
      <text x={x + 16} y={19} fill={DIM} fontSize={10} fontFamily={MONO}>
        {index} {name}: {detail}
      </text>
    </g>
  );
}

export function AppearancePhysicsPush({
  defaultForceN = DEFAULT_FORCE_N,
  className,
}: AppearancePhysicsPushProps) {
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
  const forceLen = 14 + forceN * 6;
  const toggleBase =
    'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]';
  const toggleOn = 'border-accent text-accent';
  const toggleOff =
    'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text';

  const layerButtons: Array<{ id: keyof LayerState; label: string }> = [
    { id: 'appearance', label: 'appearance' },
    { id: 'physics', label: 'physics proxy' },
    { id: 'simulation', label: 'simulation' },
  ];

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label
              htmlFor="ap-force"
              className="flex items-baseline justify-between gap-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
            >
              Push force
              <span className="font-mono text-xs normal-case tracking-normal text-text">
                {formatN(forceN)}
              </span>
            </label>
            <input
              id="ap-force"
              type="range"
              min={MIN_FORCE_N}
              max={MAX_FORCE_N}
              step={1}
              value={forceN}
              onChange={(e) => setForceN(Number(e.target.value))}
              aria-label={`Push force in newtons, currently ${formatN(forceN)}`}
              className="mt-2 w-full accent-accent"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={push}
              disabled={atTrackEnd && layers.physics}
              className={cx(
                'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
                atTrackEnd && layers.physics
                  ? 'cursor-not-allowed border-border bg-surface-2 text-text-dim opacity-50'
                  : 'border-accent text-accent hover:bg-surface-2',
              )}
            >
              Push the mug
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
            >
              Reset
            </button>
          </div>
        </div>
        <div role="group" aria-label="Layers" className="flex flex-wrap gap-2">
          {layerButtons.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={layers[b.id]}
              onClick={() => toggle(b.id)}
              className={cx(toggleBase, layers[b.id] ? toggleOn : toggleOff)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">mug displacement =</span>{' '}
        <span data-testid="displacement-readout" className="text-accent">
          {formatCm(mug.position)}
        </span>{' '}
        <span className="text-text-dim">after</span>{' '}
        <span data-testid="push-count-readout">{mug.effectivePushes}</span>{' '}
        <span className="text-text-dim">
          effective {mug.effectivePushes === 1 ? 'push' : 'pushes'}
        </span>
        {idleAttempts > 0 && (
          <span className="text-text-dim">
            {' '}
            ({idleAttempts} {idleAttempts === 1 ? 'attempt' : 'attempts'} did
            nothing)
          </span>
        )}
      </p>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`Three-layer scene. Appearance layer ${layers.appearance ? 'on' : 'off'}, physics proxy ${layers.physics ? 'on' : 'off'}, simulation layer ${layers.simulation ? 'on' : 'off'}. Mug displacement ${formatCm(mug.position)} after ${mug.effectivePushes} effective pushes.`}
        className="mt-2 block w-full"
      >
        <defs>
          <marker
            id="ap-arrow-accent"
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={ACCENT} />
          </marker>
          <marker
            id="ap-arrow-ok"
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={OK} />
          </marker>
        </defs>

        {/* layer captions */}
        <LayerCaption
          x={40}
          index="1"
          name="appearance"
          detail="rendered"
          color={BORDER_STRONG}
          on={layers.appearance}
        />
        <LayerCaption
          x={205}
          index="2"
          name="physics proxy"
          detail="collision"
          color={ACCENT}
          on={layers.physics}
        />
        <LayerCaption
          x={390}
          index="3"
          name="simulation"
          detail="integrated"
          color={OK}
          on={layers.simulation}
        />
        <text x={40} y={52} fill={DIM} fontSize={10} fontFamily={MONO}>
          the push test: same scene, same push; only the layer stack changes
        </text>

        {/* simulation layer: displacement arrow and motion trace */}
        {layers.simulation && mug.position > 0 && (
          <g>
            <line
              x1={mugX(0) + MUG_W / 2}
              y1={112}
              x2={x + MUG_W / 2}
              y2={112}
              stroke={OK}
              strokeWidth={1.5}
              markerEnd="url(#ap-arrow-ok)"
            />
            <text
              x={(mugX(0) + x) / 2 + MUG_W / 2}
              y={102}
              textAnchor="middle"
              fill={OK}
              fontSize={10}
              fontFamily={MONO}
            >
              d = {formatCm(mug.position)}
            </text>
          </g>
        )}
        {layers.simulation && !layers.physics && (
          <text
            data-testid="no-dynamics-marker"
            x={mugX(0) + MUG_W / 2 + 60}
            y={116}
            fill={DIM}
            fontSize={10}
            fontFamily={MONO}
          >
            no dynamics to integrate
          </text>
        )}

        {/* force arrow, sized by the slider */}
        <g data-testid="force-arrow">
          <line
            x1={x - forceLen - 8}
            y1={TABLE_Y - MUG_H / 2}
            x2={x - 8}
            y2={TABLE_Y - MUG_H / 2}
            stroke={ACCENT}
            strokeWidth={2}
            markerEnd="url(#ap-arrow-accent)"
          />
          <text
            x={x - forceLen - 8}
            y={TABLE_Y - MUG_H / 2 - 8}
            fill={ACCENT}
            fontSize={10}
            fontFamily={MONO}
          >
            F = {formatN(forceN)}
          </text>
        </g>

        {/* appearance layer: the rendered table */}
        {layers.appearance && (
          <rect
            data-testid="table-appearance"
            x={40}
            y={TABLE_Y}
            width={480}
            height={TABLE_H}
            fill={SURFACE_2}
            stroke={BORDER_STRONG}
            strokeWidth={1}
          />
        )}

        {/* physics proxy: collision slab */}
        {layers.physics && (
          <g data-testid="collision-slab">
            <rect
              x={40}
              y={TABLE_Y}
              width={480}
              height={TABLE_H}
              fill="none"
              stroke={ACCENT}
              strokeWidth={1}
              strokeDasharray="5 4"
            />
            <text
              x={512}
              y={TABLE_Y + TABLE_H + 16}
              textAnchor="end"
              fill={ACCENT}
              fontSize={10}
              fontFamily={MONO}
            >
              μ = {FRICTION_MU.toFixed(1)}
            </text>
          </g>
        )}

        {/* simulation layer: ghost trace of past positions */}
        {layers.simulation &&
          mug.history.slice(0, -1).map((p, i) => (
            <rect
              key={i}
              data-testid="motion-ghost"
              x={mugX(p)}
              y={TABLE_Y - MUG_H}
              width={MUG_W}
              height={MUG_H}
              fill="none"
              stroke={OK}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.35}
            />
          ))}

        {/* the mug, translated by the integrated position */}
        <g data-testid="mug" transform={`translate(${x} 0)`}>
          {layers.appearance && (
            <g data-testid="mug-appearance">
              <rect
                x={0}
                y={TABLE_Y - MUG_H}
                width={MUG_W}
                height={MUG_H}
                fill={SURFACE_2}
                stroke={BORDER_STRONG}
                strokeWidth={1.5}
              />
              <path
                d={`M ${MUG_W} ${TABLE_Y - MUG_H + 8} h 8 a 9 9 0 0 1 0 18 h -8`}
                fill="none"
                stroke={BORDER_STRONG}
                strokeWidth={1.5}
              />
            </g>
          )}
          {layers.physics && (
            <g data-testid="collision-hull">
              <rect
                x={-4}
                y={TABLE_Y - MUG_H - 4}
                width={MUG_W + 8}
                height={MUG_H + 4}
                fill="none"
                stroke={ACCENT}
                strokeWidth={1}
                strokeDasharray="5 4"
              />
              <text
                x={MUG_W / 2}
                y={TABLE_Y - MUG_H - 12}
                textAnchor="middle"
                fill={ACCENT}
                fontSize={10}
                fontFamily={MONO}
              >
                m = {MASS_KG.toFixed(1)} kg
              </text>
            </g>
          )}
        </g>

        {/* ground truth annotation */}
        <text x={40} y={TABLE_Y + TABLE_H + 34} fill={DIM} fontSize={10} fontFamily={MONO}>
          {layers.physics
            ? 'the engine integrates: impulse, friction, rest'
            : 'rendering is not dynamics: the pixels have no mass'}
        </text>
      </svg>

      <div data-testid="push-test-note" className="mt-3 flex items-start gap-3">
        <svg viewBox="0 0 88 56" aria-hidden="true" className="block w-24 shrink-0">
          <rect
            x={4}
            y={16}
            width={24}
            height={28}
            fill="none"
            stroke={BORDER_STRONG}
            strokeWidth={1.5}
          />
          <line
            x1={36}
            y1={30}
            x2={layers.physics ? 72 : 64}
            y2={30}
            stroke={layers.physics ? OK : DIM}
            strokeWidth={2}
          />
          {layers.physics && (
            <path d="M 72 25 L 82 30 L 72 35 z" fill={OK} />
          )}
          {!layers.physics && (
            <g stroke={DIM} strokeWidth={1.5}>
              <line x1={56} y1={18} x2={76} y2={42} />
              <line x1={76} y1={18} x2={56} y2={42} />
            </g>
          )}
          <text
            x={44}
            y={66}
            textAnchor="middle"
            fill={DIM}
            fontSize={8}
            fontFamily={MONO}
          >
            {layers.physics ? 'solver answers' : 'no solver'}
          </text>
        </svg>
        <p className="font-sans text-xs leading-relaxed text-text-dim">
          <span className="font-medium text-text">{note.title}.</span>{' '}
          {note.body}
        </p>
      </div>
    </div>
  );
}
