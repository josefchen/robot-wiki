'use client';

import type { Vec3 } from '@/lib/ik';
import type { EePose, JointControl } from './use-playground-kinematics';

interface PlaygroundHudProps {
  joints: JointControl[];
  angles: Record<string, number>;
  eePose: EePose | null;
  targetScene: Vec3 | null;
  solving: boolean;
  /** Live EE-to-target distance, millimeters. */
  residualMm: number | null;
  iterations: number | null;
}

const RAD_TO_DEG = 180 / Math.PI;

function signed(value: number, digits: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function formatVec(v: Vec3): string {
  return `x ${signed(v.x, 3)}  y ${signed(v.y, 3)}  z ${signed(v.z, 3)}`;
}

/**
 * Monospace readout overlay for the playground: joint angles, end-effector
 * pose, and the live IK residual/iteration count. Compact, pinned to the
 * top-left corner, and pointer-transparent so it never blocks the scene.
 */
export function PlaygroundHud({
  joints,
  angles,
  eePose,
  targetScene,
  solving,
  residualMm,
  iterations,
}: PlaygroundHudProps) {
  const status = solving
    ? 'solving'
    : targetScene === null
      ? null
      : residualMm !== null && residualMm <= 1
        ? 'reached'
        : 'not reached';

  return (
    <div
      data-testid="playground-hud"
      role="region"
      aria-label="Kinematics readout"
      className="pointer-events-none absolute left-3 top-3 rounded-sm border border-border bg-surface/95 px-3 py-2 font-mono text-[11px] leading-relaxed tabular-nums text-text-dim"
    >
      <dl>
        {joints.map((joint) => (
          <div key={joint.name} className="flex justify-between gap-4">
            <dt className="text-text-dim">{joint.name}</dt>
            <dd data-testid={`hud-joint-${joint.name}`} className="text-text">
              {signed((angles[joint.name] ?? 0) * RAD_TO_DEG, 1)}°
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-1.5 border-t border-border pt-1.5">
        <p>
          <span className="text-text">ee </span>
          <span data-testid="hud-ee-position">
            {eePose ? formatVec(eePose.position) : 'n/a'}
          </span>
        </p>
        <p>
          <span className="text-text">{'   '}</span>
          <span data-testid="hud-ee-orientation">
            {eePose
              ? `r ${signed(eePose.roll * RAD_TO_DEG, 1)}°  p ${signed(eePose.pitch * RAD_TO_DEG, 1)}°  y ${signed(eePose.yaw * RAD_TO_DEG, 1)}°`
              : 'n/a'}
          </span>
        </p>
      </div>

      <div className="mt-1.5 border-t border-border pt-1.5">
        <p>
          <span className="text-text">tgt </span>
          <span data-testid="hud-target">
            {targetScene ? formatVec(targetScene) : 'none'}
          </span>
        </p>
        <p>
          <span className="text-text">ik </span>
          <span data-testid="hud-residual">
            {residualMm !== null ? `${residualMm.toFixed(2)} mm` : 'n/a'}
          </span>
          {'  iter '}
          <span data-testid="hud-iterations">
            {iterations !== null ? iterations : 'n/a'}
          </span>
          {status ? (
            <>
              {'  '}
              <span
                data-testid="hud-ik-status"
                className={
                  status === 'reached'
                    ? 'text-ok'
                    : status === 'not reached'
                      ? 'text-err'
                      : 'text-text-dim'
                }
              >
                {status}
              </span>
            </>
          ) : (
            <span data-testid="hud-ik-status" className="text-text-dim">
              {'  idle'}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
