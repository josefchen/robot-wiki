'use client';

import { useRouter } from 'next/navigation';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { cx } from '@/lib/utils';

/**
 * The shell's search entry point. Submits to /search with the query in the
 * URL (VAL-NAV-017). Works without JS via the native GET form; with JS it
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
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    onNavigate?.();
  }

  return (
    <form
      role="search"
      aria-label="Site search"
      action="/search/"
      method="get"
      onSubmit={submit}
      className={cx('px-2', className)}
    >
      <label
        htmlFor={inputId}
        className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
      >
        Search
      </label>
      <div className="flex items-stretch gap-1.5">
        <input
          id={inputId}
          name="q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="temporal ensembling, ALOHA, chunk size"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-sm border border-border bg-surface px-2 py-1.5 text-sm text-text placeholder:text-text-dim/80"
        />
        <button
          type="submit"
          aria-label="Search the wiki"
          className="flex items-center rounded-sm border border-border bg-surface-2 px-2.5 text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          <MagnifyingGlass size={16} aria-hidden />
        </button>
      </div>
    </form>
  );
}
