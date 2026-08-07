import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchQuery } from './search-query';

export const metadata: Metadata = {
  title: 'Search - robot-atlas',
  description:
    'Search robot-atlas: full-text over module prose plus structured lookup over methods, companies, and datasets.',
};

/**
 * Placeholder shell for /search so the nav shell's search entry point
 * resolves. The foundation-search feature builds the real Pagefind prose
 * results here; the structured group lands with the market-map milestone.
 */
export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-dim">
        Tool
      </p>
      <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-text">
        Search
      </h1>
      <p className="mt-3 leading-relaxed text-text-dim">
        Search is under construction. When it ships, one input queries two
        indexes at once: full-text prose results across every published
        module, and structured results over the methods, companies, and
        datasets in the atlas data layer.
      </p>
      <Suspense fallback={null}>
        <SearchQuery />
      </Suspense>
    </div>
  );
}
