import type { Metadata } from 'next';
import { PlaygroundCanvas } from '@/components/three/playground-canvas';

export const metadata: Metadata = {
  title: '3D Kinematics Playground',
  description:
    'A SO-101 robot arm rendered from its URDF in the browser: joint sliders for forward kinematics, click-to-reach inverse kinematics, and trajectory record/replay.',
};

export default function PlaygroundPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="font-sans text-3xl font-semibold tracking-tight text-text">
        3D Kinematics Playground
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-text-dim">
        A SO-101 follower arm loaded from its URDF and rendered client-side
        with WebGL. Move each joint with the sliders, click the ground to
        set a target for the damped-least-squares solver, or record a
        sequence of poses and play it back as an eased trajectory. Nothing
        here touches a server.
      </p>

      <section aria-label="3D robot playground" className="mt-6">
        <PlaygroundCanvas />
      </section>

      <p className="mt-3 font-mono text-xs leading-relaxed text-text-dim">
        Drag to orbit. Scroll to zoom. Right-drag to pan. Click the ground to
        set an IK target, or type one into the target form. In the trajectory
        panel, Record arms keyframe capture and Play eases between the saved
        poses. Model: SO-101 from{' '}
        <a
          href="https://github.com/TheRobotStudio/SO-ARM100"
          target="_blank"
          rel="noopener"
          className="text-text underline decoration-border underline-offset-2 transition-colors hover:decoration-accent"
        >
          TheRobotStudio/SO-ARM100
        </a>{' '}
        (Apache-2.0), meshes converted to GLB with Draco compression.
      </p>
    </div>
  );
}
