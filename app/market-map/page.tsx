import type { Metadata } from 'next';
import { MarketMap } from '@/components/market-map/market-map';
import { COMPANIES } from '@/data/companies';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';

const title = 'Market Map';

export const metadata: Metadata = {
  title,
  description:
    'The embodied-AI industry as data: companies across six segments, filterable by approach, geography, stage, and funding.',
  // Full card blocks restated: a route-level object replaces the
  // layout's for the same key (no deep merge). og:title is the plain
  // page title so the card matches the rendered h1 (VAL-DIST-004)
  // instead of the templated ' - robot-wiki' document title.
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

export default function MarketMapPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="font-sans text-3xl font-semibold tracking-tight text-text">
        Market Map
      </h1>
      <p className="mt-3 max-w-3xl leading-relaxed text-text-dim">
        {COMPANIES.length} companies in six segments: foundation models,
        humanoids, industrial and logistics, vertical applications, simulation
        and tooling, and components. Filters write into the URL. Expand a card
        for the sources behind a figure.
      </p>
      <div className="mt-8">
        <MarketMap companies={COMPANIES} />
      </div>
    </div>
  );
}
