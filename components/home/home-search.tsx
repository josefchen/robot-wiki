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
      className={cx('flex max-w-xl items-stretch gap-2', className)}
    >
      <input
        id="home-search-input"
        name="q"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search articles, sources and glossary terms"
        placeholder="ALOHA, diffusion policy"
        autoComplete="off"
        data-brand-control-id="control:input"
        data-brand-surface-id="surface:flat"
        className="min-w-0 flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-[15px] text-text placeholder:text-text-dim"
      />
      <Action variant="primary" type="submit">
        Search
      </Action>
    </form>
  );
}
