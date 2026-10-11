'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { cx } from '@/lib/utils';

/**
 * The shell's search entry point. Submits to /search with the query in the
 * URL. Works without JS via the native GET form; with JS it
 * routes client-side. The structured-results group lands with the
 * foundation-search feature; this box is the stable contract.
 */
type SearchBoxProps = {
  /** Prefix for element ids so sidebar and drawer instances never collide. */
  idPrefix: string;
  /** Called after submit so a containing drawer can close itself. */
  onNavigate?: () => void;
  className?: string;
};

export function SearchBox({ idPrefix, onNavigate, className }: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputId = `${idPrefix}-search-input`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/search/?q=${encodeURIComponent(q)}` : '/search/');
    onNavigate?.();
  }

  return (
    <form
      role="search"
      aria-label="Site search"
      action="/search/"
      method="get"
      onSubmit={submit}
      className={cx(className)}
    >
      <label htmlFor={inputId} className="eyebrow mb-2 block">
        Search
      </label>
      <div className="flex items-stretch border-b border-border-strong">
        <input
          id={inputId}
          name="q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // The panel gives this input about 280px at every width, so the
          // placeholder has to fit that, not the viewport.
          placeholder="ALOHA, chunk size"
          autoComplete="off"
          data-brand-control-id="control:input"
          data-brand-surface-id="surface:flat"
          className="min-w-0 flex-1 bg-transparent py-2 font-sans text-[15px] text-text placeholder:text-text-dim"
        />
        <button
          type="submit"
          aria-label="Search the wiki"
          data-brand-control-id="control:secondary-action"
          className="cursor-pointer pl-3 font-sans text-[14px] text-text-dim transition-colors hover:text-text"
        >
          Search
        </button>
      </div>
    </form>
  );
}
