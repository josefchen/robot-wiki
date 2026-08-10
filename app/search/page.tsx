import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchInterface } from '@/components/search/search-interface';

export const metadata: Metadata = {
  title: 'Search',
  description:
    'Search robot-wiki: full-text over the prose of every published module.',
};

/**
 * /search. One input over the Pagefind prose index built at build time
 * (scripts/build-search.ts). The results area is grouped so the structured
 * entity index (methods, companies, datasets) can add a second group without
 * reworking this page. data-pagefind-ignore keeps this page out of its own
 * index. Suspense is required because SearchInterface reads ?q= from the URL.
 */
export default function SearchPage() {
  return (
    <div data-pagefind-ignore className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-dim">
        Tool
      </p>
      <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-text">
        Search
      </h1>
      <p className="mt-3 leading-relaxed text-text-dim">
        Full-text search over the prose of every published module. The index
        is generated at build time and queries run locally in your browser.
      </p>
      <Suspense fallback={null}>
        <SearchInterface />
      </Suspense>
    </div>
  );
}
