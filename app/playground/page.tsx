import type { Metadata } from 'next';
import { PlaygroundCanvas } from '@/components/three/playground-canvas';

export const metadata: Metadata = {
  title: '3D Kinematics Playground - robot-atlas',
  description:
    'A SO-101 robot arm rendered from its URDF in the browser, with joint sliders for forward kinematics and click-to-reach inverse kinematics.',
};

export default function PlaygroundPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-dim">
        Tool
      </p>
      <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-text">
        3D Kinematics Playground
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-text-dim">
        A SO-101 follower arm loaded from its URDF and rendered client-side
        with WebGL. Move each joint with the sliders, or click the ground to
        set a target and watch the damped-least-squares solver reach for it.
        Nothing here touches a server.
      </p>

      <section aria-label="3D robot playground" className="mt-6">
        <PlaygroundCanvas />
      </section>

      <p className="mt-3 font-mono text-xs leading-relaxed text-text-dim">
        Drag to orbit. Scroll to zoom. Right-drag to pan. Click the ground to
        set an IK target, or type one into the target form. Model: SO-101
        from{' '}
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
