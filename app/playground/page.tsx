import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '3D Kinematics Playground - robot-atlas',
  description:
    'A 3D robot kinematics playground: forward and inverse kinematics on a real arm, running client-side.',
};

/**
 * Placeholder shell for the playground route so navigation entry points
 * resolve while the full experience is built (milestone 2: R3F scene, SO-101
 * URDF, DLS IK solver, trajectory replay).
 */
export default function PlaygroundPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-dim">
        Tool
      </p>
      <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-text">
        3D Kinematics Playground
      </h1>
      <p className="mt-3 leading-relaxed text-text-dim">
        The playground is under construction. When it ships, this page loads a
        SO-101 robot arm in the browser: joint sliders drive forward
        kinematics in real time, click-to-reach runs a damped least-squares
        inverse kinematics solver, and recorded trajectories replay with
        easing.
      </p>
      <ul className="mt-6 space-y-2 border-t border-border pt-6 text-sm text-text-dim">
        <li>Forward kinematics with one slider per revolute joint</li>
        <li>Click-to-reach inverse kinematics with live residual readout</li>
        <li>Trajectory record, replay, and JSON export</li>
      </ul>
    </div>
  );
}
