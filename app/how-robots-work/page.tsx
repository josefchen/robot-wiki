import type { Metadata } from 'next';
import { HowRobotsWork } from '@/components/explainers/how-robots-work';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { howRobotsWorkJsonLd } from '@/lib/structured-data';
import {
  STANDALONE_SEO_DESCRIPTIONS,
  STANDALONE_SEO_TITLES,
} from '@/lib/seo';

const title = 'How robots work';

export const metadata: Metadata = {
  title: STANDALONE_SEO_TITLES.howRobotsWork,
  description: STANDALONE_SEO_DESCRIPTIONS.howRobotsWork,
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

export default function HowRobotsWorkPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: howRobotsWorkJsonLd(STANDALONE_SEO_DESCRIPTIONS.howRobotsWork),
        }}
      />
      {/* The explainer column below is filled in the browser from the open
          scene and changes on every step, so the index takes the heading,
          the introduction and the explainers' served text instead. */}
      <div data-pagefind-body className="mb-8 max-w-[68ch]">
        <h1
          data-tektur-role="page-h1"
          className="font-display-page text-3xl tracking-tight text-text"
        >
          How robots work
        </h1>
        <p className="mt-3 font-serif text-[1.0625rem] leading-relaxed text-text-dim">
          These are short explainers built on 3D models of real robots. Each
          one answers a single question. Guess first, then drag, push or tilt
          to see why.
        </p>
      </div>
      <HowRobotsWork />
    </div>
  );
}
