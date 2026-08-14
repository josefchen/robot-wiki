'use client';

import { useState } from 'react';
import {
  DEFAULT_PARADIGM,
  WM_PARADIGMS,
  WM_USES,
  paradigmById,
  type WmParadigmId,
} from '@/lib/world-model-taxonomy';
import { cx } from '@/lib/utils';

/**
 * WmDisambiguator: the six-panel disambiguator for the
 * world-models/taxonomy module. One panel per paradigm, each drawing what
 * that paradigm actually predicts: Dreamer gets a latent vector, a reward
 * scalar, and a fuzzy reconstruction; TD-MPC gets a latent and an MPPI
 * candidate fan with no image at all; the video paradigm gets a predicted
 * frame; JEPA gets an embedding and a goal-distance meter with an
 * explicit no-decoder marker; the world-action model emits frames and an
 * action chunk together; the symbolic model is a predicate list.
 *
 * Activating a panel highlights which of {policy learning, planning,
 * evaluation, data generation} the paradigm is actually used for.
 *
 * Interactive contract: deterministic initial render (latent dynamics),
 * native buttons (keyboard-accessible, aria-pressed), visible monospace
 * readouts, reset control, fixed panel geometry (no layout shift). No
 * auto-playing or JS-driven motion, only hover/focus CSS transitions, so
 * the component is reduced-motion safe by construction.
 */

const MONO = 'var(--font-mono)';
const DIM = 'var(--color-text-dim)';
const TEXT = 'var(--color-text)';
const ACCENT = 'var(--color-accent)';
const BORDER = 'var(--color-border)';
const BORDER_STRONG = 'var(--color-border-strong)';
const SURFACE_2 = 'var(--color-surface-2)';

function LatentCells({ x, y, cells = 8 }: { x: number; y: number; cells?: number }) {
  return (
    <g>
      {Array.from({ length: cells }, (_, i) => (
        <rect
          key={i}
          x={x + i * 13}
          y={y}
          width={11}
          height={11}
          fill={i % 3 === 0 ? ACCENT : SURFACE_2}
          stroke={BORDER_STRONG}
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

function CrossedFrame({ x, y, width: w, height: h, label }: { x: number; y: number; width: number; height: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={BORDER_STRONG} strokeWidth={1} />
      <line x1={x} y1={y} x2={x + w} y2={y + h} stroke={BORDER_STRONG} strokeWidth={1} />
      <line x1={x + w} y1={y} x2={x} y2={y + h} stroke={BORDER_STRONG} strokeWidth={1} />
      <text x={x + w / 2} y={y + h + 11} textAnchor="middle" fill={DIM} fontSize={8} fontFamily={MONO}>
        {label}
      </text>
    </g>
  );
}

function VideoScene({ x, y, width: w, height: h }: { x: number; y: number; width: number; height: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={SURFACE_2} stroke={BORDER_STRONG} strokeWidth={1} />
      {/* horizon */}
      <line x1={x} y1={y + h * 0.62} x2={x + w} y2={y + h * 0.62} stroke={BORDER_STRONG} strokeWidth={1} />
      {/* light source */}
      <circle cx={x + w * 0.24} cy={y + h * 0.28} r={5} fill={ACCENT} />
      {/* table */}
      <rect x={x + w * 0.52} y={y + h * 0.52} width={w * 0.36} height={h * 0.12} fill="none" stroke={TEXT} strokeWidth={1} />
      {/* cup */}
      <circle cx={x + w * 0.66} cy={y + h * 0.46} r={3.5} fill="none" stroke={TEXT} strokeWidth={1} />
    </g>
  );
}

function PanelArt({ id }: { id: WmParadigmId }) {
  return (
    <svg
      viewBox="0 0 200 120"
      aria-hidden="true"
      data-testid={`panel-art-${id}`}
      className="block w-full"
    >
      {id === 'latent-dynamics' && (
        <g>
          <text x={14} y={18} fill={DIM} fontSize={8} fontFamily={MONO}>
            latent z (stochastic + deterministic)
          </text>
          <LatentCells x={14} y={24} />
          <text x={14} y={58} fill={ACCENT} fontSize={10} fontFamily={MONO}>
            r = 0.83
          </text>
          <text x={78} y={58} fill={DIM} fontSize={9} fontFamily={MONO}>
            continue = 1
          </text>
          {/* fuzzy decoded reconstruction */}
          <rect x={14} y={70} width={92} height={40} fill={SURFACE_2} stroke={BORDER} strokeWidth={1} />
          <circle cx={46} cy={88} r={10} fill={DIM} opacity={0.35} />
          <rect x={66} y={80} width={26} height={18} fill={DIM} opacity={0.22} />
          <text x={116} y={86} fill={DIM} fontSize={8} fontFamily={MONO}>
            decoded frame
          </text>
          <text x={116} y={97} fill={DIM} fontSize={8} fontFamily={MONO}>
            (training only)
          </text>
        </g>
      )}
      {id === 'decoder-free-latent' && (
        <g>
          <text x={14} y={18} fill={DIM} fontSize={8} fontFamily={MONO}>
            latent z (implicit)
          </text>
          <LatentCells x={14} y={24} />
          {/* MPPI candidate fan */}
          <path d="M 24 96 Q 70 70 130 62" fill="none" stroke={BORDER_STRONG} strokeWidth={1} />
          <path d="M 24 96 Q 76 80 138 78" fill="none" stroke={BORDER_STRONG} strokeWidth={1} />
          <path d="M 24 96 Q 82 88 146 92" fill="none" stroke={ACCENT} strokeWidth={1.5} />
          <path d="M 24 96 Q 74 96 132 104" fill="none" stroke={BORDER_STRONG} strokeWidth={1} />
          <text x={14} y={58} fill={DIM} fontSize={8} fontFamily={MONO}>
            MPPI candidates
          </text>
          <CrossedFrame x={152} y={56} width={34} height={26} label="no image" />
        </g>
      )}
      {id === 'generative-video' && (
        <g>
          <VideoScene x={14} y={14} width={112} height={76} />
          <text x={14} y={104} fill={DIM} fontSize={8} fontFamily={MONO}>
            predicted frame t+1
          </text>
          <text x={140} y={30} fill={DIM} fontSize={8} fontFamily={MONO}>
            conditioned on
          </text>
          <text x={140} y={42} fill={ACCENT} fontSize={8} fontFamily={MONO}>
            action / text
          </text>
          <text x={140} y={62} fill={DIM} fontSize={8} fontFamily={MONO}>
            pixels in,
          </text>
          <text x={140} y={74} fill={DIM} fontSize={8} fontFamily={MONO}>
            pixels out
          </text>
        </g>
      )}
      {id === 'jepa' && (
        <g>
          <text x={14} y={18} fill={DIM} fontSize={8} fontFamily={MONO}>
            embedding e
          </text>
          <LatentCells x={14} y={24} />
          {/* goal embedding */}
          <polygon points="168,22 176,30 168,38 160,30" fill="none" stroke={ACCENT} strokeWidth={1.5} />
          <text x={168} y={50} textAnchor="middle" fill={ACCENT} fontSize={8} fontFamily={MONO}>
            goal
          </text>
          {/* distance meter */}
          <rect x={14} y={66} width={120} height={8} fill="none" stroke={BORDER_STRONG} strokeWidth={1} />
          <rect x={14} y={66} width={38} height={8} fill={ACCENT} />
          <text x={14} y={90} fill={DIM} fontSize={9} fontFamily={MONO}>
            dist(e_pred, e_goal) = 0.31
          </text>
          <CrossedFrame x={150} y={60} width={34} height={26} label="no decoder" />
        </g>
      )}
      {id === 'world-action' && (
        <g>
          <VideoScene x={14} y={14} width={66} height={48} />
          <text x={14} y={76} fill={DIM} fontSize={8} fontFamily={MONO}>
            frame t+1
          </text>
          {/* action chunk bars */}
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={104 + i * 22}
              y={40 - i * 6}
              width={14}
              height={26 + i * 6}
              fill="none"
              stroke={i === 0 ? ACCENT : BORDER_STRONG}
              strokeWidth={1}
            />
          ))}
          <text x={104} y={76} fill={DIM} fontSize={8} fontFamily={MONO}>
            action chunk
          </text>
          <text x={14} y={98} fill={DIM} fontSize={8} fontFamily={MONO}>
            one backbone, two heads
          </text>
        </g>
      )}
      {id === 'symbolic' && (
        <g>
          <text x={14} y={28} fill={TEXT} fontSize={10} fontFamily={MONO}>
            on(cup, table)
          </text>
          <text x={14} y={46} fill={TEXT} fontSize={10} fontFamily={MONO}>
            clear(table)
          </text>
          <line x1={30} y1={54} x2={30} y2={72} stroke={BORDER_STRONG} strokeWidth={1} />
          <polygon points="30,78 26,70 34,70" fill={BORDER_STRONG} />
          <text x={40} y={68} fill={DIM} fontSize={8} fontFamily={MONO}>
            pick(cup)
          </text>
          <text x={14} y={96} fill={ACCENT} fontSize={10} fontFamily={MONO}>
            in(cup, gripper)
          </text>
        </g>
      )}
    </svg>
  );
}

export function WmDisambiguator({
  defaultParadigm = DEFAULT_PARADIGM,
  className,
}: {
  defaultParadigm?: WmParadigmId;
  className?: string;
}) {
  const [selectedId, setSelectedId] = useState<WmParadigmId>(defaultParadigm);
  const selected = paradigmById(selectedId);

  const reset = () => setSelectedId(DEFAULT_PARADIGM);

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs"
        >
          <span className="text-text-dim">
            Selected:{' '}
            <span data-testid="selected-readout" className="text-accent">
              {selected.short}
            </span>
          </span>
          <span className="text-text-dim">
            Predicts:{' '}
            <span data-testid="predicts-readout" className="text-text">
              {selected.predicts.toLowerCase()}
            </span>
          </span>
        </div>
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className="rounded-sm border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div
        role="group"
        aria-label="World-model paradigms"
        className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3"
      >
        {WM_PARADIGMS.map((p) => {
          const active = p.id === selectedId;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={active}
              aria-label={`${p.short}: predicts ${p.panelNote}`}
              onClick={() => setSelectedId(p.id)}
              className={cx(
                'rounded-sm border p-2 text-left transition-colors active:translate-y-[1px]',
                active
                  ? 'border-accent bg-surface-2'
                  : 'border-border bg-surface-2 hover:border-border-strong',
              )}
            >
              <PanelArt id={p.id} />
              <span
                className={cx(
                  'mt-1.5 block font-mono text-[11px]',
                  active ? 'text-accent' : 'text-text-dim',
                )}
              >
                {p.short}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <div className="font-mono text-[11px] text-text-dim">
          Used for
        </div>
        <ul
          aria-label="What the selected paradigm is used for"
          className="mt-1.5 flex flex-wrap gap-1.5"
        >
          {WM_USES.map((use) => {
            const active = selected.uses.includes(use.id);
            return (
              <li
                key={use.id}
                data-testid={`use-${use.id}`}
                data-active={active}
                className={cx(
                  'rounded-sm border px-2 py-1 font-mono text-xs',
                  active
                    ? 'border-accent text-accent'
                    : 'border-border text-text-dim',
                )}
              >
                {use.label}
              </li>
            );
          })}
        </ul>
      </div>

      <p
        data-testid="wm-live-summary"
        aria-live="polite"
        className="mt-3 font-sans text-xs leading-relaxed text-text-dim"
      >
        <span className="text-text">{selected.name}:</span>{' '}
        {selected.panelNote}. Used for{' '}
        {selected.uses
          .map((u) => WM_USES.find((x) => x.id === u)?.label)
          .join(', ')}
        . Representative systems: {selected.systems}.
      </p>
    </div>
  );
}
