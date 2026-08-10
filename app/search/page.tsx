import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchInterface } from '@/components/search/search-interface';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search robot-wiki: full-text over the prose of every article.',
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
      {/* aria-current stands in for the nav marker here: the shell exposes
          /search through a form, not a link, so no nav entry can carry it
          (VAL-DESIGN-022 requires exactly one aria-current per route). */}
      <h1
        aria-current="page"
        className="font-sans text-3xl font-semibold tracking-tight text-text"
      >
        Search
      </h1>
      <p className="mt-3 leading-relaxed text-text-dim">
        Full-text search over the prose of every article. Queries run locally
        in your browser.
      </p>
      <Suspense fallback={null}>
        <SearchInterface />
      </Suspense>
    </div>
  );
}
