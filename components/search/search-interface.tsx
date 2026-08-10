'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import {
  createPagefindClient,
  createRequestSequencer,
  type SearchClient,
  type SearchHit,
} from '@/lib/search';
import { ResultsGroup } from './results-group';

type SearchStatus = 'idle' | 'searching' | 'done' | 'unavailable';

type SearchInterfaceProps = {
  /** Test seam: override the production Pagefind loader. */
  loadClient?: () => Promise<SearchClient>;
  /** Debounce before a typed query is applied. */
  debounceMs?: number;
};

/**
 * The /search interface: one input, one prose results group today, with the
 * results area structured so the structured-entity group (market-map
 * milestone) slots in as a second ResultsGroup without reworking this
 * component.
 *
 * Behavior contract (VAL-SEARCH-*): the query mirrors the ?q= URL param both
 * ways (shell search box submits land here prefilled); status is derived
 * from (query, result) rather than mirrored, and results apply only under a
 * latest-wins sequencer, so a slow response for an older query can never mix
 * into newer results; clearing the query returns to the idle state;
 * ArrowDown/ArrowUp move focus between the input and the result links.
 */
export function SearchInterface({
  loadClient = createPagefindClient,
  debounceMs = 200,
}: SearchInterfaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(
    () => searchParams.get('q')?.trim() ?? '',
  );
  const [result, setResult] = useState<{
    query: string;
    hits: SearchHit[];
  } | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<SearchClient | null>(null);
  const sequencerRef = useRef(createRequestSequencer());

  // External query changes (the shell search box submits while the user is
  // already on /search) adjust the input during render, the documented
  // pattern for deriving state from a changing external value. Our own
  // router.replace calls echo back through useSearchParams; lastPushed
  // records the last query this component put in the URL (set before each
  // replace, so it is committed by the time the echo renders) and echoes
  // are skipped, never clobbering in-progress typing.
  const urlQuery = (searchParams.get('q') ?? '').trim();
  const [lastPushed, setLastPushed] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== lastPushed) {
      setQuery(urlQuery);
    }
  }

  const trimmed = query.trim();

  // Status is derived, never mirrored: idle when the query is empty,
  // searching until the result for exactly this query lands, then done (or
  // unavailable if the index failed to load). While a new query is in
  // flight the previous result list stays on screen and is replaced
  // atomically when the new one arrives.
  let status: SearchStatus;
  if (!trimmed) status = 'idle';
  else if (result?.query !== trimmed) status = 'searching';
  else if (unavailable) status = 'unavailable';
  else status = 'done';

  const hits =
    status === 'searching' || status === 'done' ? (result?.hits ?? []) : [];

  // Debounced search. Every state write happens inside the timer callback;
  // the sequencer token guarantees only the latest query can apply results.
  useEffect(() => {
    if (!trimmed) return;
    const seq = sequencerRef.current;
    const token = seq.begin();
    const timer = setTimeout(() => {
      setLastPushed(trimmed);
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`, {
        scroll: false,
      });
      void (async () => {
        try {
          clientRef.current ??= await loadClient();
          const found = await clientRef.current.search(trimmed);
          if (!seq.isCurrent(token)) return;
          setResult({ query: trimmed, hits: found });
          setUnavailable(false);
        } catch {
          if (!seq.isCurrent(token)) return;
          setResult({ query: trimmed, hits: [] });
          setUnavailable(true);
        }
      })();
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [trimmed, debounceMs, loadClient, router]);

  function onQueryChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setQuery(value);
    if (!value.trim()) {
      // Clearing returns to the idle state immediately and drops any
      // in-flight search.
      sequencerRef.current.invalidate();
      setLastPushed('');
      router.replace('/search', { scroll: false });
    }
  }

  function focusResult(index: number) {
    resultsRef.current
      ?.querySelectorAll<HTMLAnchorElement>('a[data-search-result]')
      [index]?.focus();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && hits.length > 0) {
      event.preventDefault();
      focusResult(0);
    }
  }

  function onResultKeyDown(
    event: KeyboardEvent<HTMLAnchorElement>,
    index: number,
  ) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (index + 1 < hits.length) focusResult(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index === 0) inputRef.current?.focus();
      else focusResult(index - 1);
    }
  }

  let statusText = '';
  if (status === 'searching') {
    statusText = `Searching for "${trimmed}"`;
  } else if (status === 'done') {
    statusText =
      hits.length > 0
        ? `${hits.length} ${hits.length === 1 ? 'module matches' : 'modules match'} "${trimmed}"`
        : `No modules match "${trimmed}"`;
  } else if (status === 'unavailable') {
    statusText = 'The search index is unavailable';
  }

  return (
    <div className="mt-8">
      <form
        role="search"
        aria-label="Search the wiki"
        onSubmit={(event) => event.preventDefault()}
      >
        <label
          htmlFor="search-page-input"
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
        >
          Search the wiki
        </label>
        <div className="flex items-stretch gap-1.5">
          <input
            id="search-page-input"
            ref={inputRef}
            type="search"
            value={query}
            onChange={onQueryChange}
            onKeyDown={onInputKeyDown}
            placeholder="temporal ensembling, ALOHA, chunk size"
            autoComplete="off"
            aria-describedby="search-page-hint"
            className="min-w-0 flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-text-dim/80"
          />
          <span
            aria-hidden
            className="flex items-center rounded-sm border border-border bg-surface-2 px-3 text-text-dim"
          >
            <MagnifyingGlass size={16} />
          </span>
        </div>
        <p id="search-page-hint" className="sr-only">
          Results update as you type. Use the down arrow key to move into the
          results, and the arrow keys to move between them.
        </p>
      </form>

      <p
        role="status"
        aria-live="polite"
        className="mt-4 font-mono text-xs text-text-dim"
      >
        {statusText}
      </p>

      {status === 'idle' ? (
        <div className="mt-8 border-t border-border pt-6">
          <p className="max-w-[65ch] text-sm leading-relaxed text-text-dim">
            Type a query to search the prose of every published module.
            Structured lookups over the methods, companies, and datasets in
            the wiki data layer arrive with the market map.
          </p>
          <p className="mt-3 font-mono text-xs text-text-dim">
            Try: temporal ensembling, ALOHA, chunk size
          </p>
        </div>
      ) : null}

      {status === 'unavailable' ? (
        <div className="mt-8 border-t border-border pt-6" role="note">
          <p className="max-w-[65ch] text-sm leading-relaxed text-text-dim">
            The search index is unavailable in this environment. It is
            generated during the production build; run{' '}
            <code className="rounded-sm border border-border bg-surface-2 px-1 py-0.5 font-mono text-xs text-text">
              npm run build
            </code>{' '}
            and serve the{' '}
            <code className="rounded-sm border border-border bg-surface-2 px-1 py-0.5 font-mono text-xs text-text">
              out/
            </code>{' '}
            directory to search locally.
          </p>
        </div>
      ) : null}

      {status === 'searching' || status === 'done' ? (
        <div ref={resultsRef} className="mt-8">
          <ResultsGroup
            id="prose"
            heading="Modules"
            count={status === 'done' ? hits.length : undefined}
            note={
              status === 'done' && hits.length === 0
                ? `No module prose matches "${trimmed}". Check the spelling, or try a broader term.`
                : undefined
            }
          >
            {hits.length > 0 ? (
              <ul className="divide-y divide-border">
                {hits.map((entry, index) => (
                  <li key={entry.url}>
                    <Link
                      href={entry.url}
                      data-search-result
                      onKeyDown={(event) => onResultKeyDown(event, index)}
                      className="group block px-1 py-3"
                    >
                      <span className="font-sans text-sm font-medium text-text transition-colors group-hover:text-accent">
                        {entry.title}
                      </span>
                      {entry.excerpt ? (
                        <span
                          className="search-excerpt mt-1 block text-sm leading-relaxed text-text-dim"
                          dangerouslySetInnerHTML={{ __html: entry.excerpt }}
                        />
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </ResultsGroup>
        </div>
      ) : null}
    </div>
  );
}
