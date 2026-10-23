'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Action } from '@/components/ui/action';
import { cx } from '@/lib/utils';

/**
 * The front page's search box. Without JavaScript the GET form opens
 * /search/?q=; with it the router does the same navigation client-side,
 * as the shell's sidebar box does.
 */
export function HomeSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/search/?q=${encodeURIComponent(q)}` : '/search/');
  }

  return (
    <form
      role="search"
      aria-label="Search the wiki"
      action="/search/"
      method="get"
      onSubmit={submit}
      className={cx('max-w-xl', className)}
    >
      {/* mb-2! outranks the masthead's 24px eyebrow margin, so the label stays with its box. */}
      <label htmlFor="home-search-input" className="eyebrow mb-2! block text-balance">
        Search articles, sources and glossary
      </label>
      <div className="flex items-stretch gap-3">
        <input
          id="home-search-input"
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ALOHA, diffusion policy"
          autoComplete="off"
          data-brand-control-id="control:input"
          data-brand-surface-id="surface:flat"
          className="min-w-0 flex-1 border border-text-dim bg-surface px-3 py-2 text-[15px] text-text placeholder:text-text-dim"
        />
        <Action variant="primary" type="submit">
          Search
        </Action>
      </div>
    </form>
  );
}
