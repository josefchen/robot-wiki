'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui';
import {
  CREDIT_ASSIGNMENT,
  EPISODE_LENGTH_S,
  VALUE_TRACE,
  segmentAt,
  taggedSegments,
  valueAt,
  type TaggedSegment,
} from '@/lib/advantage-episode';
import { cx } from '@/lib/utils';

/**
 * AdvantageScrubber: the Recap (pi*0.6) advantage-conditioning idea made
 * tangible. A scrub slider walks through one failed espresso episode while
 * a value-function trace runs along the timeline. Segments where the value
 * rises are tagged high advantage; where it falls, low advantage. The
 * credit-assignment arc shows the failed insertion blamed on the grasp
 * 20 s earlier. Two further views show what Recap does with the tags: at
 * training time every transition is kept with its binary tag; at execution
 * time the policy is conditioned on "high".
 *
 * The value trace is illustrative (it encodes the shape of the Recap
 * portafilter example), not measured; the caption says so.
 *
 * Interactive contract: deterministic render, native range slider
 * (keyboard arrows step the playhead), visible monospace readouts, view
 * switcher + reset, no auto-playing motion, no layout shift across views.
 */
type View = 'episode' | 'training' | 'execution';

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'episode', label: 'Episode' },
  { id: 'training', label: 'Training data' },
  { id: 'execution', label: 'At execution' },
];

const WIDTH = 720;
const LEFT = 44;
const RIGHT_PAD = 12;
const STAGE_TOP = 30;
const STAGE_HEIGHT = 24;
const PLOT_TOP = 72;
const PLOT_BOTTOM = 184;
const AXIS_Y = 200;
const HEIGHT = 208;
const V_MIN = 5;
const V_MAX = 45;

const TAG_FILL: Record<TaggedSegment['tag'], string> = {
  high: 'rgba(74, 222, 128, 0.10)',
  low: 'rgba(248, 113, 113, 0.10)',
};
const TAG_STROKE: Record<TaggedSegment['tag'], string> = {
  high: 'var(--color-ok)',
  low: 'var(--color-err)',
};

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function x(tS: number): number {
  const span = WIDTH - LEFT - RIGHT_PAD;
  return f(LEFT + (tS / EPISODE_LENGTH_S) * span);
}

function y(v: number): number {
  const frac = (v - V_MIN) / (V_MAX - V_MIN);
  return f(PLOT_BOTTOM - frac * (PLOT_BOTTOM - PLOT_TOP));
}

function tracePoints(upToS: number): string {
  const points: string[] = [];
  for (const point of VALUE_TRACE) {
    if (point.t > upToS) break;
    points.push(`${x(point.t)},${y(point.v)}`);
  }
  points.push(`${x(upToS)},${y(valueAt(upToS))}`);
  return points.join(' ');
}

function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
}

export function AdvantageScrubber({ className }: { className?: string }) {
  const [view, setView] = useState<View>('episode');
  const [playhead, setPlayhead] = useState(0);

  const tagged = taggedSegments();
  const current = tagged.find((s) => s.id === segmentAt(playhead).id)!;
  const value = valueAt(playhead);
  const highCount = tagged.filter((s) => s.tag === 'high').length;
  const lowCount = tagged.length - highCount;

  function reset() {
    setView('episode');
    setPlayhead(0);
  }

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div
        role="group"
        aria-label="Select a view"
        className="flex flex-wrap items-center gap-1.5"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={v.id === view}
            onClick={() => setView(v.id)}
            className={cx(
              'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
              v.id === view
                ? 'border-accent text-text'
                : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
            )}
          >
            {v.label}
          </button>
        ))}
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
        <span className="ml-auto font-mono text-[10px] text-text-dim">
          espresso episode, one failed attempt
        </span>
      </div>

      {view === 'episode' && (
        <>
          <div className="mt-3">
            <label
              htmlFor="advantage-playhead"
              className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
            >
              Episode time
              <span className="font-mono text-xs normal-case tracking-normal text-text">
                <span data-testid="time-readout">
                  t = {playhead.toFixed(1)} s
                </span>
                {'  '}
                <span data-testid="value-readout">
                  V = {value.toFixed(1)}
                </span>
              </span>
            </label>
            <input
              id="advantage-playhead"
              type="range"
              min={0}
              max={EPISODE_LENGTH_S}
              step={0.5}
              value={playhead}
              aria-label={`Episode time in seconds, currently ${playhead.toFixed(1)}`}
              aria-valuetext={`${playhead.toFixed(1)} seconds`}
              onChange={(e) => setPlayhead(Number(e.target.value))}
              className="mt-2 w-full accent-accent"
            />
          </div>

          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`Value-function trace over a 40 second espresso episode. The playhead is at ${playhead.toFixed(1)} seconds inside the ${current.label} segment, tagged ${current.tag} advantage. Segments where the value rises are outlined green, where it falls, red. A dashed arc links the failed insertion back to the grasp 20 seconds earlier.`}
            className="mt-2 block w-full"
          >
            {/* Credit-assignment arc: failure at insertion blamed on the grasp. */}
            <path
              d={`M ${x(CREDIT_ASSIGNMENT.failureAtS)} ${STAGE_TOP - 2} C ${x(CREDIT_ASSIGNMENT.failureAtS)} 14, ${x(CREDIT_ASSIGNMENT.blamedAtS)} 14, ${x(CREDIT_ASSIGNMENT.blamedAtS)} ${STAGE_TOP - 6}`}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1.25}
              strokeDasharray="4 3"
            />
            <text
              data-testid="credit-annotation"
              x={(x(CREDIT_ASSIGNMENT.blamedAtS) + x(CREDIT_ASSIGNMENT.failureAtS)) / 2}
              y={8}
              textAnchor="middle"
              fill="var(--color-accent)"
              fontSize={9}
              fontFamily="var(--font-mono)"
            >
              failure blamed on the grasp, 20 s earlier
            </text>

            {/* Stage blocks, tinted by advantage tag. */}
            {tagged.map((segment) => (
              <g key={segment.id}>
                <rect
                  x={x(segment.start)}
                  y={STAGE_TOP}
                  width={f(x(segment.end) - x(segment.start))}
                  height={STAGE_HEIGHT}
                  fill={TAG_FILL[segment.tag]}
                  stroke={TAG_STROKE[segment.tag]}
                  strokeWidth={1}
                />
                <text
                  x={(x(segment.start) + x(segment.end)) / 2}
                  y={STAGE_TOP + STAGE_HEIGHT / 2 + 3}
                  textAnchor="middle"
                  fill="var(--color-text)"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                >
                  {segment.label}
                </text>
              </g>
            ))}

            {/* Value trace: full trace dim, elapsed portion amber. */}
            <line
              x1={LEFT}
              x2={WIDTH - RIGHT_PAD}
              y1={PLOT_BOTTOM}
              y2={PLOT_BOTTOM}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <polyline
              points={tracePoints(EPISODE_LENGTH_S)}
              fill="none"
              stroke="var(--color-border-strong)"
              strokeWidth={1.25}
            />
            {playhead > 0 && (
              <polyline
                points={tracePoints(playhead)}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
              />
            )}
            <text
              x={LEFT - 6}
              y={PLOT_TOP + 3}
              textAnchor="end"
              fill="var(--color-text-dim)"
              fontSize={9}
              fontFamily="var(--font-mono)"
            >
              V(s)
            </text>

            {/* Playhead. */}
            <line
              x1={x(playhead)}
              x2={x(playhead)}
              y1={STAGE_TOP}
              y2={PLOT_BOTTOM}
              stroke="var(--color-accent)"
              strokeWidth={1.5}
            />
            <circle
              cx={x(playhead)}
              cy={y(value)}
              r={3.5}
              fill="var(--color-accent)"
            />

            {/* Time axis. Rightmost label anchors end so it never clips. */}
            {[0, 10, 20, 30, EPISODE_LENGTH_S].map((t) => (
              <text
                key={t}
                x={x(t)}
                y={AXIS_Y}
                textAnchor={
                  t === EPISODE_LENGTH_S
                    ? 'end'
                    : t === 0
                      ? 'start'
                      : 'middle'
                }
                fill="var(--color-text-dim)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {`${t} s`}
              </text>
            ))}
          </svg>

          <p className="mt-1 font-mono text-[10px] text-text-dim">
            green outline: value rises, high advantage. red outline: value
            falls, low advantage. trace shape is illustrative, after the
            Recap portafilter example.
          </p>

          <p className="mt-3 font-mono text-xs text-text">
            Current segment:{' '}
            <span data-testid="segment-readout">
              {current.label}: {current.tag} advantage (
              {formatDelta(current.delta)})
            </span>
          </p>

          <ul className="mt-2 divide-y divide-border border-t border-border">
            {tagged.map((segment) => (
              <li
                key={segment.id}
                data-testid={`segment-row-${segment.id}`}
                className={cx(
                  'py-2',
                  segment.id === current.id && 'bg-surface-2',
                )}
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-xs text-text">
                    {segment.label}
                  </span>
                  <span className="font-mono text-[10px] text-text-dim">
                    {segment.start}-{segment.end} s
                  </span>
                  <span
                    className={cx(
                      'font-mono text-xs',
                      segment.tag === 'high' ? 'text-ok' : 'text-err',
                    )}
                  >
                    {formatDelta(segment.delta)}
                  </span>
                  <span className="ml-auto">
                    <Badge variant={segment.tag === 'high' ? 'ok' : 'err'}>
                      {segment.tag} advantage
                    </Badge>
                  </span>
                </div>
                <p className="mt-0.5 font-sans text-xs leading-relaxed text-text-dim">
                  {segment.note}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {view === 'training' && (
        <div data-testid="training-view" className="mt-3">
          <p className="font-mono text-xs text-text">
            {tagged.length} transitions kept: {highCount} high advantage,{' '}
            {lowCount} low advantage
          </p>
          <p className="mt-1 font-sans text-xs leading-relaxed text-text-dim">
            Nothing is filtered out. Failed and suboptimal segments stay in
            the dataset; each one is simply labeled with the sign of its
            advantage, so the model learns which is which instead of never
            seeing its own mistakes.
          </p>
          <ul className="mt-3 divide-y divide-border border-t border-border">
            {tagged.map((segment) => (
              <li
                key={segment.id}
                data-testid={`training-row-${segment.id}`}
                className="flex flex-wrap items-center gap-x-3 py-2"
              >
                <span className="font-mono text-xs text-text">
                  {segment.label}
                </span>
                <span className="font-mono text-[10px] text-text-dim">
                  {segment.start}-{segment.end} s
                </span>
                <span className="font-mono text-[10px] text-text-dim">
                  delta V {formatDelta(segment.delta)}
                </span>
                <span className="ml-auto">
                  <Badge variant={segment.tag === 'high' ? 'ok' : 'err'}>
                    tag: {segment.tag} advantage
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === 'execution' && (
        <div data-testid="execution-view" className="mt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
              Conditioning
            </span>
            <Badge>task: make espresso</Badge>
            <Badge variant="accent">advantage: high</Badge>
          </div>
          <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
            At test time the policy is always asked for the high-advantage
            version of the behavior. The bad grasp was never deleted from
            training; it is simply not what the model is asked to reproduce.
          </p>
          <ul className="mt-3 divide-y divide-border border-t border-border">
            {tagged.map((segment) => {
              const active = segment.tag === 'high';
              return (
                <li
                  key={segment.id}
                  data-testid={`execution-row-${segment.id}`}
                  data-active={active}
                  className={cx(
                    'flex flex-wrap items-center gap-x-3 py-2',
                    !active && 'opacity-40',
                  )}
                >
                  <span className="font-mono text-xs text-text">
                    {segment.label}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-text-dim">
                    {active ? 'reproduced' : 'suppressed by conditioning'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
