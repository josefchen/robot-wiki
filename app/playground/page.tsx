import type { Metadata } from 'next';
import { PlaygroundCanvas } from '@/components/three/playground-canvas';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';

const title = '3D Kinematics Playground';

export const metadata: Metadata = {
  title,
  description:
    'A SO-101 robot arm rendered from its URDF in the browser: joint sliders for forward kinematics, click-to-reach inverse kinematics, and trajectory record/replay.',
  // Full card blocks restated: a route-level object replaces the
  // layout's for the same key (no deep merge). og:title is the plain
  // page title so the card matches the rendered h1 (VAL-DIST-004)
  // instead of the templated ' - Robot Wiki' document title.
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

export default function PlaygroundPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      {/* data-pagefind-body scoped to the heading and the description:
          Pagefind excludes every page that declares no body region once
          one page declares one, so this route needed its own
          (VAL-SEARCH-021). The canvas below carries live joint readouts
          that change on every interaction and are not prose. */}
      <div data-pagefind-body>
        <h1
          data-tektur-role="page-h1"
          className="font-display-page text-3xl tracking-tight text-text"
        >
          3D Kinematics Playground
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-text-dim">
          A SO-101 follower arm loaded from its URDF and rendered
          client-side with WebGL. Move each joint with the sliders, click the
          ground to set a target for the damped-least-squares solver, or
          record a sequence of poses and play it back as an eased
          trajectory. Nothing here touches a server.
        </p>
      </div>

      <section aria-label="3D robot playground" className="mt-6">
        <PlaygroundCanvas />
      </section>

      <p className="mt-3 font-mono text-xs leading-relaxed text-text-dim">
        Drag to orbit. Scroll to zoom. Right-drag to pan. Click the ground to
        set an IK target, or type one into the target form. In the trajectory
        panel, Record arms keyframe capture and Play eases between the saved
        poses. Model: SO-101 from{' '}
        <a
          data-brand-control-id="control:link-focus"
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
