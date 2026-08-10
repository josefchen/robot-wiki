import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Map',
  description:
    'The embodied-AI industry as data: companies across six segments, filterable by approach, geography, stage, and funding.',
};

/**
 * Placeholder shell for the market-map route so navigation entry points
 * resolve while the full experience is built (market-map milestone: Zod-
 * validated company data, filterable grid/bubble views, funding timeline).
 */
export default function MarketMapPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-sans text-3xl font-semibold tracking-tight text-text">
        Market Map
      </h1>
      <p className="mt-3 leading-relaxed text-text-dim">
        The market map is under construction. When it ships, this page
        presents the embodied-AI industry as filterable data: companies across
        foundation models, humanoids, industrial and logistics systems,
        vertical applications, simulation and tooling, and components.
      </p>
      <ul className="mt-6 space-y-2 border-t border-border pt-6 text-sm text-text-dim">
        <li>Filter by segment, country, stage, and technical approach</li>
        <li>Company cards with funding, status, and source links</li>
        <li>A funding timeline of notable rounds</li>
      </ul>
    </div>
  );
}
