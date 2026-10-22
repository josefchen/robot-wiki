import type { Metadata } from 'next';
import { PlaygroundCanvas } from '@/components/three/playground-canvas';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { playgroundJsonLd } from '@/lib/structured-data';
import {
  STANDALONE_SEO_DESCRIPTIONS,
  STANDALONE_SEO_TITLES,
} from '@/lib/seo';

const title = '3D Kinematics Playground';

export const metadata: Metadata = {
  title: STANDALONE_SEO_TITLES.playground,
  description: STANDALONE_SEO_DESCRIPTIONS.playground,
  // Full card blocks restated: a route-level object replaces the
  // layout's for the same key (no deep merge). og:title is the plain
  // page title so the card matches the rendered h1 (VAL-DIST-004)
  // instead of the templated '| Robot Wiki' document title.
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

export default function PlaygroundPage() {
  return (
    <div
      data-page-frame="frame:playground"
      className="mx-auto w-full max-w-6xl px-6 py-8 md:px-8 lg:px-12"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: playgroundJsonLd(STANDALONE_SEO_DESCRIPTIONS.playground),
        }}
      />
      {/* data-pagefind-body scoped to the heading and the description:
          Pagefind excludes every page that declares no body region once
          one page declares one, so this route needed its own
          (VAL-SEARCH-021). The playground below carries live readouts
          that change on every interaction and are not prose. */}
      <div data-pagefind-body className="max-w-[58ch]">
        <h1
          data-tektur-role="page-h1"
          className="font-display-page display-h1"
        >
          3D Kinematics Playground
        </h1>
        <p className="mt-3 leading-relaxed text-text-dim">
          Pose the SO-101, a small open-source robot arm, one joint at a time,
          or click the floor and watch it work out how to reach. Record a few
          poses and play them back as one smooth motion.
        </p>
      </div>

      <section aria-label="3D robot playground" className="mt-8">
        <PlaygroundCanvas />
      </section>

      <p className="mt-12 max-w-[68ch] text-[13px] leading-relaxed text-text-dim">
        Model: the SO-101 arm from{' '}
        <a
          data-brand-control-id="control:link-focus"
          href="https://github.com/TheRobotStudio/SO-ARM100"
          target="_blank"
          rel="noopener"
          className="text-text underline decoration-border underline-offset-2 transition-colors hover:decoration-text"
        >
          TheRobotStudio/SO-ARM100
        </a>{' '}
        (Apache-2.0), loaded from its URDF. Everything runs in your browser.
      </p>
    </div>
  );
}
