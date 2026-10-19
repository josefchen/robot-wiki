'use client';

import {
  jointLabel,
  plainJointValue,
  SO101_JOINT_ORDER,
  spokenJointValue,
} from './joint-labels';
import type { JointControl } from './use-playground-kinematics';

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

interface JointControlsProps {
  joints: JointControl[];
  /** Radians per joint name. */
  angles: Record<string, number>;
  onChange: (name: string, radians: number) => void;
  onReset: () => void;
  /** The joint whose slider has the pointer or the keyboard focus. */
  activeJoint?: string | null;
  onActiveJoint?: (name: string | null) => void;
}

/**
 * One slider per joint, named in plain words ("Base turn", "Elbow") with
 * its value beside the name. The slider range is exactly the joint's URDF
 * limit range in degrees, so pointer and keyboard input (arrows, Home, End)
 * stop at the limits; values are clamped again on the way out for synthetic
 * events. Pointing at a slider or focusing it lights that joint's motor in
 * the scene.
 */
export function JointControls({
  joints,
  angles,
  onChange,
  onReset,
  activeJoint = null,
  onActiveJoint,
}: JointControlsProps) {
  return (
    <section className="pg-section" aria-labelledby="pg-joints-heading">
      <div className="pg-head">
        <h2 id="pg-joints-heading">Joints</h2>
        <button
          data-brand-control-id="control:secondary-action"
          type="button"
          data-testid="reset-pose"
          onClick={onReset}
          className="pg-text"
        >
          Reset pose
        </button>
      </div>
      <ul className="pg-joints">
        {joints.map((joint) => {
          const label = jointLabel(joint.name);
          const value = angles[joint.name] ?? 0;
          const minDeg = joint.lower * RAD_TO_DEG;
          const maxDeg = joint.upper * RAD_TO_DEG;
          const id = `joint-slider-${joint.name}`;
          return (
            <li
              key={joint.name}
              className="pg-joint"
              data-active={activeJoint === joint.name ? '' : undefined}
              onPointerEnter={() => onActiveJoint?.(joint.name)}
              onPointerLeave={() => onActiveJoint?.(null)}
            >
              <label htmlFor={id}>{label.name}</label>
              <span
                data-testid={`joint-readout-${joint.name}`}
                className="pg-value"
                aria-hidden="true"
              >
                {plainJointValue(joint.name, value, joint.upper)}
              </span>
              <input
                data-brand-control-id="control:input"
                id={id}
                data-testid={id}
                type="range"
                min={minDeg}
                max={maxDeg}
                // step="any" avoids native step snapping, so the input can
                // sit exactly on the (non-round) URDF limit values. Arrow
                // keys move 1 degree per press.
                step="any"
                value={value * RAD_TO_DEG}
                aria-valuetext={spokenJointValue(joint.name, value, joint.upper)}
                onFocus={() => onActiveJoint?.(joint.name)}
                onBlur={() => onActiveJoint?.(null)}
                onChange={(event) => {
                  const deg = Number.parseFloat(event.target.value);
                  if (!Number.isFinite(deg)) return;
                  onChange(
                    joint.name,
                    Math.min(maxDeg, Math.max(minDeg, deg)) * DEG_TO_RAD,
                  );
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The joints section while the arm loads: the SO-101's joint names over
 * resting tracks, in the same places the sliders will take, so nothing
 * moves when the model arrives.
 */
export function JointControlsPlaceholder() {
  return (
    <section className="pg-section" aria-labelledby="pg-joints-heading" aria-busy="true">
      <div className="pg-head">
        <h2 id="pg-joints-heading">Joints</h2>
      </div>
      <ul className="pg-joints">
        {SO101_JOINT_ORDER.map((name) => (
          <li key={name} className="pg-joint">
            <span className="pg-name">{jointLabel(name).name}</span>
            <span className="pg-value" aria-hidden="true" />
            <span className="pg-track" aria-hidden="true" />
          </li>
        ))}
      </ul>
    </section>
  );
}
