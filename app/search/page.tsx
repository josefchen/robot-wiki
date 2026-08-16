import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchInterface } from '@/components/search/search-interface';

export const metadata: Metadata = {
  title: 'Search',
  description:
    'Search robot-wiki: full-text over article prose, plus methods, companies, and datasets.',
};

/**
 * /search. One input over two build-time indexes: Pagefind for prose and
 * MiniSearch for structured entities (methods, companies, datasets).
 * data-pagefind-ignore keeps this page out of its own index. Suspense is
 * required because SearchInterface reads ?q= from the URL.
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
        Search article prose together with the methods, companies, and datasets
        in the wiki data layer. Queries run locally in your browser.
      </p>
      <Suspense fallback={null}>
        <SearchInterface />
      </Suspense>
    </div>
  );
}
