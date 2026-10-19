'use client';

import type { Vec3 } from '@/lib/ik';
import {
  jointLabel,
  sceneToBaseFrame,
  technicalDegrees,
  technicalPosition,
} from './joint-labels';
import type { JointControl } from './use-playground-kinematics';

const RAD_TO_DEG = 180 / Math.PI;

function limit(radians: number): string {
  const deg = Math.round(radians * RAD_TO_DEG);
  return deg < 0 ? `−${-deg}` : String(deg);
}

interface TechnicalNamesProps {
  joints: JointControl[];
  angles: Record<string, number>;
  /** Name of the URDF link the hand readout follows. */
  eeLink: string;
  hand: Vec3 | null;
  /** The hand frame's ZYX Euler angles in the base frame, radians. */
  handAngles: { roll: number; pitch: number; yaw: number } | null;
  target: Vec3 | null;
  iterations: number | null;
  residualMm: number | null;
}

/**
 * The fold for readers who want the robot's own vocabulary: each joint's
 * URDF name with its angle to a tenth of a degree and its limits, and the
 * hand, target and solver in metres in the arm's base frame.
 */
export function TechnicalNames({
  joints,
  angles,
  eeLink,
  hand,
  handAngles,
  target,
  iterations,
  residualMm,
}: TechnicalNamesProps) {
  return (
    <details className="pg-section" data-testid="technical-names">
      <summary data-brand-control-id="control:secondary-action">Technical names</summary>
      <div className="pg-fold">
        <table className="pg-tech">
          <caption>Joints by their URDF names. Angles and limits in degrees.</caption>
          <thead>
            <tr>
              <th scope="col">Joint and URDF name</th>
              <th scope="col">Angle</th>
              <th scope="col">Limits</th>
            </tr>
          </thead>
          <tbody>
            {joints.map((joint) => (
              <tr key={joint.name}>
                <th scope="row">
                  <span className="pg-plain">{jointLabel(joint.name).name}</span>
                  <code>{joint.name}</code>
                </th>
                <td className="pg-num" data-testid={`tech-joint-${joint.name}`}>
                  {technicalDegrees(angles[joint.name] ?? 0)}
                </td>
                <td className="pg-num">
                  {limit(joint.lower)} to {limit(joint.upper)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="pg-tech-list">
          <div>
            <dt>Hand link</dt>
            <dd>{eeLink}</dd>
          </div>
          <div>
            <dt>Hand (m)</dt>
            <dd data-testid="tech-hand">{hand ? technicalPosition(sceneToBaseFrame(hand)) : 'n/a'}</dd>
          </div>
          <div>
            <dt>Hand angles</dt>
            <dd data-testid="tech-hand-angles">
              {handAngles
                ? `roll ${technicalDegrees(handAngles.roll)} pitch ${technicalDegrees(handAngles.pitch)} yaw ${technicalDegrees(handAngles.yaw)}`
                : 'n/a'}
            </dd>
          </div>
          <div>
            <dt>Target (m)</dt>
            <dd data-testid="tech-target">
              {target ? technicalPosition(sceneToBaseFrame(target)) : 'none'}
            </dd>
          </div>
          <div>
            <dt>Solver</dt>
            <dd>damped least squares</dd>
          </div>
          <div>
            <dt>Iterations</dt>
            <dd data-testid="tech-iterations">{iterations ?? 'n/a'}</dd>
          </div>
          <div>
            <dt>Gap</dt>
            <dd data-testid="tech-residual">
              {residualMm !== null ? `${residualMm.toFixed(2)} mm` : 'n/a'}
            </dd>
          </div>
        </dl>
        <p className="pg-note">
          Frame: the base link, x forward, y left, z up. Exported motions
          name the joints this way.
        </p>
      </div>
    </details>
  );
}
