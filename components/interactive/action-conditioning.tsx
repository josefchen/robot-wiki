'use client';

import { useState } from 'react';
import {
  ACTIONS,
  INITIAL_STATE,
  REALISM_SCORE,
  ROLLOUT_STEPS,
  SENSITIVITY_THRESHOLD,
  actionSensitivity,
  rollout,
  type ActionId,
  type Conditioning,
  type SceneState,
} from '@/lib/action-conditioning';
import { cx } from '@/lib/utils';

/**
 * ActionConditioning: plausible video versus action-faithful video.
 *
 * Two rollouts start from the same initial frame under two different
 * actions. Under strong conditioning the futures visibly diverge: push-left
 * slides the block into the goal zone, lift raises the gripper and leaves
 * the block. Under weak conditioning both futures collapse to the same
 * intention-consistent outcome (block drifts toward the goal, gripper
 * rises a little) because the model is predicting from task intent rather
 * than from the action. The action-sensitivity readout measures the
 * divergence; the visual-realism readout stays fixed at 0.91 in both
 * modes, because realistic video is exactly what a weakly conditioned
 * model still produces.
 *
 * Interactive contract: typed props, deterministic render, monospace
 * numeric readouts, reset control, native keyboard-accessible buttons,
 * fixed chart geometry (no layout shift). Scrub-driven only, no
 * auto-playing or JS-driven motion, so it is reduced-motion safe by
 * construction.
 */
type ActionConditioningProps = {
  /** Action for rollout A. Default 'push-left'. */
  defaultActionA?: ActionId;
  /** Action for rollout B. Default 'lift'. */
  defaultActionB?: ActionId;
  /** Initial conditioning state. Default 'strong'. */
  defaultConditioning?: Conditioning;
  className?: string;
};

const SCENE_W = 140;
const SCENE_H = 92;
const SCENE_GAP = 10;
const TABLE_Y = 78;
const BLOCK_SIZE = 14;
const GRIPPER_X = 63;

const MONO = 'var(--font-mono)';
const DIM = 'var(--color-text-dim)';
const ACCENT = 'var(--color-accent)';
const BORDER_STRONG = 'var(--color-border-strong)';
const SURFACE_2 = 'var(--color-surface-2)';

function blockXToPx(blockX: number): number {
  return 10 + blockX * (SCENE_W - 34);
}

function gripperBottomY(gripperY: number): number {
  return TABLE_Y - BLOCK_SIZE - gripperY * 52;
}

/**
 * One predicted frame: the tabletop, the dashed goal zone on the left, the
 * amber block, and the gripper hanging above the block's initial position.
 * Geometry is a pure function of the scene state, so identical states
 * render identical frames.
 */
function Scene({
  state,
  testIdPrefix,
}: {
  state: SceneState;
  testIdPrefix?: string;
}) {
  const bx = blockXToPx(state.blockX);
  const gy = gripperBottomY(state.gripperY);
  return (
    <g>
      <rect
        x={0}
        y={0}
        width={SCENE_W}
        height={SCENE_H}
        fill={SURFACE_2}
        stroke={BORDER_STRONG}
        strokeWidth={1}
      />
      {/* goal zone */}
      <rect
        x={14}
        y={TABLE_Y - 18}
        width={32}
        height={18}
        fill="none"
        stroke={DIM}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text
        x={30}
        y={TABLE_Y - 24}
        textAnchor="middle"
        fill={DIM}
        fontSize={7}
        fontFamily={MONO}
      >
        goal
      </text>
      {/* table */}
      <line
        x1={4}
        y1={TABLE_Y}
        x2={SCENE_W - 4}
        y2={TABLE_Y}
        stroke={DIM}
        strokeWidth={1.5}
      />
      {/* block */}
      <rect
        data-testid={testIdPrefix}
        x={bx}
        y={TABLE_Y - BLOCK_SIZE}
        width={BLOCK_SIZE}
        height={BLOCK_SIZE}
        fill={ACCENT}
        opacity={0.9}
      />
      {/* gripper: stem plus two prongs */}
      <rect x={GRIPPER_X - 2} y={gy - 22} width={4} height={22} fill={DIM} />
      <rect x={GRIPPER_X - 8} y={gy - 8} width={3.5} height={8} fill={DIM} />
      <rect x={GRIPPER_X + 4.5} y={gy - 8} width={3.5} height={8} fill={DIM} />
    </g>
  );
}

function actionLabel(id: ActionId): string {
  return ACTIONS.find((a) => a.id === id)?.label ?? id;
}

function actionDescription(id: ActionId): string {
  return ACTIONS.find((a) => a.id === id)?.description ?? '';
}

export function ActionConditioning({
  defaultActionA = 'push-left',
  defaultActionB = 'lift',
  defaultConditioning = 'strong',
  className,
}: ActionConditioningProps) {
  const [actionA, setActionA] = useState<ActionId>(defaultActionA);
  const [actionB, setActionB] = useState<ActionId>(defaultActionB);
  const [conditioning, setConditioning] =
    useState<Conditioning>(defaultConditioning);

  const framesA = rollout({ action: actionA, conditioning });
  const framesB = rollout({ action: actionB, conditioning });
  const sensitivity = actionSensitivity({ actionA, actionB, conditioning });
  const realism = REALISM_SCORE;

  const sameAction = actionA === actionB;
  const diverged = sensitivity > SENSITIVITY_THRESHOLD;
  const verdict = sameAction
    ? 'same action in both panels: identical futures by definition'
    : diverged
      ? 'futures diverge: the model responds to the action'
      : 'futures near-identical: the model is following task intent, not the action';

  function reset() {
    setActionA(defaultActionA);
    setActionB(defaultActionB);
    setConditioning(defaultConditioning);
  }

  const toggleBase =
    'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]';
  const toggleOn = 'border-accent text-accent';
  const toggleOff =
    'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text';

  function actionGroup(
    panel: 'a' | 'b',
    current: ActionId,
    set: (a: ActionId) => void,
  ) {
    return (
      <div role="group" aria-label={`Rollout ${panel.toUpperCase()} action`}>
        <div className="font-mono text-[11px] text-text-dim">
          Rollout {panel.toUpperCase()} action
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={current === a.id}
              aria-label={`${a.label} for rollout ${panel.toUpperCase()}`}
              title={a.description}
              onClick={() => set(a.id)}
              className={cx(
                toggleBase,
                current === a.id ? toggleOn : toggleOff,
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function rolloutPanel(
    panel: 'a' | 'b',
    action: ActionId,
    frames: SceneState[],
  ) {
    const width = ROLLOUT_STEPS * SCENE_W + (ROLLOUT_STEPS - 1) * SCENE_GAP;
    return (
      <div data-testid={`rollout-panel-${panel}`}>
        <div className="font-mono text-[11px] text-text-dim">
          Rollout {panel.toUpperCase()}: {actionLabel(action).toLowerCase()}
          <span> ({actionDescription(action)})</span>
        </div>
        <svg
          viewBox={`0 0 ${width} ${SCENE_H + 16}`}
          role="img"
          aria-label={`Rollout ${panel.toUpperCase()}: predicted frames under the action ${actionLabel(action)}, ${conditioning} conditioning.`}
          className="mt-1.5 block w-full"
        >
          {frames.slice(1).map((state, i) => {
            const k = i + 1;
            return (
              <g
                key={k}
                transform={`translate(${i * (SCENE_W + SCENE_GAP)},0)`}
              >
                <Scene state={state} testIdPrefix={`block-${panel}-${k}`} />
                <text
                  x={SCENE_W / 2}
                  y={SCENE_H + 11}
                  textAnchor="middle"
                  fill={DIM}
                  fontSize={8}
                  fontFamily={MONO}
                >
                  t = {k}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="group" aria-label="Conditioning strength">
          <div className="font-mono text-[11px] text-text-dim">
            Model conditioning
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={conditioning === 'strong'}
              onClick={() => setConditioning('strong')}
              className={cx(
                toggleBase,
                conditioning === 'strong' ? toggleOn : toggleOff,
              )}
            >
              Strong conditioning
            </button>
            <button
              type="button"
              aria-pressed={conditioning === 'weak'}
              onClick={() => setConditioning('weak')}
              className={cx(
                toggleBase,
                conditioning === 'weak' ? toggleOn : toggleOff,
              )}
            >
              Weak conditioning
            </button>
          </div>
        </div>
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {actionGroup('a', actionA, setActionA)}
        {actionGroup('b', actionB, setActionB)}
      </div>

      <div className="mt-4" data-testid="initial-frame">
        <div className="font-mono text-[11px] text-text-dim">
          Shared initial frame
        </div>
        <svg
          viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
          role="img"
          aria-label="Shared initial frame: a block centered on a table with a gripper above it and a goal zone marked on the left."
          className="mt-1.5 block w-full max-w-[240px]"
        >
          <Scene state={INITIAL_STATE} />
        </svg>
      </div>

      <div className="mt-4 grid gap-4">
        {rolloutPanel('a', actionA, framesA)}
        {rolloutPanel('b', actionB, framesB)}
      </div>

      <p className="mt-4 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">action sensitivity S =</span>{' '}
        <span data-testid="sensitivity-readout" className="text-accent">
          {sensitivity.toFixed(3)}
        </span>{' '}
        <span className="text-text-dim">
          (threshold {SENSITIVITY_THRESHOLD.toFixed(2)}), visual realism R =
        </span>{' '}
        <span data-testid="realism-readout">{realism.toFixed(2)}</span>{' '}
        <span className="text-text-dim">in both modes</span>
      </p>
      <p className="mt-1.5 font-sans text-xs leading-relaxed text-text-dim">
        {verdict}. S is the mean per-frame distance between the two predicted
        futures. Realism is reported separately because a weakly conditioned
        model still renders sharp, plausible video: it just renders the same
        future no matter which action you choose.
      </p>
    </div>
  );
}
