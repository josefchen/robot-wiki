'use client';

import { MagnifyingGlass, X } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { IntentLink } from '@/components/ui/intent-link';
import {
  createPagefindClient,
  createRequestSequencer,
  type SearchClient,
  type SearchHit,
} from '@/lib/search';
import {
  applyStructuredFacet,
  createStructuredSearchClient,
  type EntityType,
  type StructuredHit,
  type StructuredSearchClient,
} from '@/lib/structured-search';
import { ResultsGroup } from './results-group';
import { TypeFacetBar } from './type-facet-bar';

type SearchStatus = 'idle' | 'searching' | 'done' | 'unavailable';

/** What one settled query produced, including which surfaces failed. */
type SearchOutcome = {
  query: string;
  hits: SearchHit[];
  structured: StructuredHit[];
  proseFailed: boolean;
  structuredFailed: boolean;
};

type SearchInterfaceProps = {
  /** Test seam: override the production Pagefind loader. */
  loadClient?: () => Promise<SearchClient>;
  /**
   * Test seam for the structured MiniSearch loader. Defaults to the
   * production client that fetches /search-index.json.
   */
  loadStructured?: () => Promise<StructuredSearchClient>;
  /** Debounce before a typed query is applied. */
  debounceMs?: number;
};

const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  company: 'company',
  method: 'method',
  dataset: 'dataset',
};

/**
 * The /search interface: one input, two result groups (prose + structured),
 * entity-type facets that only narrow the structured group.
 *
 * Behavior contract: the query mirrors the ?q= URL param both
 * ways (shell search box submits land here prefilled); status is derived
 * from (query, result) rather than mirrored, and results apply only under a
 * latest-wins sequencer, so a slow response for an older query can never mix
 * into newer results; clearing the query returns to the idle state;
 * ArrowDown/ArrowUp move focus between the input and the result links
 * across both groups.
 *
 * A surface whose index failed reports the failure in its own group note
 * and in the status line; it never renders the no-results wording, because
 * an index that could not load has not answered the query
 * (VAL-B2-DISC-001).
 */
export function SearchInterface({
  loadClient = createPagefindClient,
  loadStructured = createStructuredSearchClient,
  debounceMs = 200,
}: SearchInterfaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(
    () => searchParams.get('q')?.trim() ?? '',
  );
  const [result, setResult] = useState<SearchOutcome | null>(null);
  const [facetType, setFacetType] = useState<EntityType | 'all'>('all');

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<SearchClient | null>(null);
  const structuredRef = useRef<StructuredSearchClient | null>(null);
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
  // searching until the result for exactly this query lands, then done, or
  // unavailable when both indexes failed to load. While a new query is in
  // flight the previous result list stays on screen and is replaced
  // atomically when the new one arrives.
  let status: SearchStatus;
  if (!trimmed) status = 'idle';
  else if (result?.query !== trimmed) status = 'searching';
  else if (result.proseFailed && result.structuredFailed) {
    status = 'unavailable';
  } else status = 'done';

  const hits =
    status === 'searching' || status === 'done' ? (result?.hits ?? []) : [];
  // The unfiltered structured list is kept alongside the filtered one so the
  // empty state can tell the two apart: a facet hiding real matches is a
  // different situation from a query nothing in the wiki answers, and the
  // old single message conflated them (VAL-SEARCH-023).
  const structuredAll =
    status === 'searching' || status === 'done'
      ? (result?.structured ?? [])
      : [];
  const structuredHits = applyStructuredFacet(structuredAll, {
    type: facetType,
  });
  const resultCount = hits.length + structuredHits.length;

  const settled = status === 'done';
  const proseFailed = settled && (result?.proseFailed ?? false);
  const structuredFailed = settled && (result?.structuredFailed ?? false);
  const facetNarrowing =
    settled &&
    facetType !== 'all' &&
    structuredHits.length === 0 &&
    structuredAll.length > 0;
  // The site-wide message may only claim the wiki has nothing on a query
  // when neither surface has anything, unfiltered, AND both surfaces
  // actually answered. A surface whose index failed has not answered: its
  // emptiness is reported as an error in its own group, never as a verdict
  // on the query.
  const siteEmpty =
    settled &&
    !proseFailed &&
    !structuredFailed &&
    hits.length === 0 &&
    structuredAll.length === 0;

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
        let found: SearchHit[] = [];
        let structured: StructuredHit[] = [];
        let proseLoadFailed = false;
        let structuredLoadFailed = false;
        await Promise.all([
          (async () => {
            try {
              clientRef.current ??= await loadClient();
              found = await clientRef.current.search(trimmed);
            } catch {
              proseLoadFailed = true;
            }
          })(),
          (async () => {
            try {
              structuredRef.current ??= await loadStructured();
              structured = await structuredRef.current.search(trimmed);
            } catch {
              structuredLoadFailed = true;
            }
          })(),
        ]);
        if (!seq.isCurrent(token)) return;
        setResult({
          query: trimmed,
          hits: proseLoadFailed ? [] : found,
          structured: structuredLoadFailed ? [] : structured,
          proseFailed: proseLoadFailed,
          structuredFailed: structuredLoadFailed,
        });
      })();
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [trimmed, debounceMs, loadClient, loadStructured, router]);

  function resetToIdle() {
    sequencerRef.current.invalidate();
    setQuery('');
    setLastPushed('');
    setFacetType('all');
    router.replace('/search', { scroll: false });
  }

  function onQueryChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setQuery(value);
    if (!value.trim()) {
      // Clearing returns to the idle state immediately and drops any
      // in-flight search.
      resetToIdle();
    }
  }

  function onClearClick() {
    resetToIdle();
    // The reader's next action is almost always another query, so focus
    // returns to the input rather than dropping to the body.
    inputRef.current?.focus();
  }

  function focusResult(index: number) {
    resultsRef.current
      ?.querySelectorAll<HTMLAnchorElement>('a[data-search-result]')
      [index]?.focus();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && resultCount > 0) {
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
      if (index + 1 < resultCount) focusResult(index + 1);
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
    const proseCount = hits.length;
    const entityCount = structuredHits.length;
    if (facetNarrowing && proseFailed) {
      // A type facet is hiding real entity hits while the module surface is
      // also down. The filter is named, never a total miss, because the
      // page still shows the filter-hiding recovery note: what a screen
      // reader hears must agree with it (VAL-SEARCH-027). This check runs
      // before the proseFailed empty-match copy for exactly that reason.
      statusText = `No ${ENTITY_TYPE_LABEL[facetType as EntityType]} results for "${trimmed}" under the active type filter; the module index is unavailable`;
    } else if (proseFailed) {
      // The module surface did not answer, so the status names its failure
      // alongside whatever the entity surface did answer.
      statusText =
        entityCount > 0
          ? `${entityCount} ${entityCount === 1 ? 'entity matches' : 'entities match'} "${trimmed}"; the module index is unavailable`
          : `No method, company or dataset entity matches "${trimmed}"; the module index is unavailable`;
    } else if (structuredFailed) {
      statusText =
        proseCount > 0
          ? `${proseCount} ${proseCount === 1 ? 'module matches' : 'modules match'} "${trimmed}"; the entity index is unavailable`
          : `No article prose matches "${trimmed}"; the entity index is unavailable`;
    } else if (entityCount === 0) {
      statusText =
        proseCount > 0
          ? `${proseCount} ${proseCount === 1 ? 'module matches' : 'modules match'} "${trimmed}"`
          : facetNarrowing
            ? `No ${ENTITY_TYPE_LABEL[facetType as EntityType]} results for "${trimmed}" under the active type filter`
            : // Names both surfaces searched, so what a screen reader hears
              // agrees with the visible message instead of blaming the
              // module prose for what may be an entity miss too.
              `No article prose and no method, company or dataset entity matches "${trimmed}"`;
    } else if (proseCount === 0) {
      statusText = `${entityCount} ${entityCount === 1 ? 'entity matches' : 'entities match'} "${trimmed}"`;
    } else {
      statusText = `${proseCount} ${proseCount === 1 ? 'module' : 'modules'}, ${entityCount} ${entityCount === 1 ? 'entity' : 'entities'} match "${trimmed}"`;
    }
  } else if (status === 'unavailable') {
    statusText = 'The search index is unavailable';
  }

  // The prose group's settled note: an index failure reads as an error,
  // never as "nothing matched" (VAL-B2-DISC-001/002).
  const proseNote: string | undefined = proseFailed
    ? 'The module index is unavailable, so module results could not be loaded for this query. This is a load failure, not a verdict on the query.'
    : status === 'done' && hits.length === 0
      ? `No module prose matches "${trimmed}". Check the spelling, or try a broader term.`
      : undefined;

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
            data-brand-control-id="control:input"
            id="search-page-input"
            ref={inputRef}
            type="search"
            value={query}
            onChange={onQueryChange}
            onKeyDown={onInputKeyDown}
            placeholder="ALOHA, chunk size"
            autoComplete="off"
            aria-describedby="search-page-hint"
            className="min-w-0 flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-text-dim"
          />
          {/* Functional clear action: keyboard operable, labelled, and
              present exactly while there is a query to clear. It shares
              the input's height so the control row stays one line at
              375px, and it is absent when the input is empty, so the
              placeholder keeps the full content box it is measured in. */}
          {query.length > 0 ? (
            <button
              data-brand-control-id="control:secondary-action"
              type="button"
              aria-label="Clear search"
              onClick={onClearClick}
              className="flex cursor-pointer items-center rounded-sm border border-border bg-surface-2 px-2 text-text-dim transition-colors hover:border-border-strong hover:text-text"
            >
              <X aria-hidden="true" size={16} />
            </button>
          ) : null}
          <span
            aria-hidden
            className="flex items-center pr-1 text-text-dim"
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
            Type a query to search the prose of every published module, and
            the methods, companies, and datasets in the wiki data layer.
          </p>
          <p className="mt-3 font-mono text-xs text-text-dim">
            Try: temporal ensembling, ALOHA, chunk size
          </p>
        </div>
      ) : null}

      {status === 'unavailable' ? (
        <div
          className="mt-8 border-t border-border pt-6"
          role="note"
          data-search-unavailable
        >
          <p className="max-w-[65ch] border-l-2 border-err pl-3 text-sm leading-relaxed text-err">
            The search index is unavailable in this environment. It is
            generated during the production build; run{' '}
            <code className="rounded-sm border border-border bg-surface-2 px-1 py-0.5 font-mono text-xs text-err">
              npm run build
            </code>{' '}
            and serve the{' '}
            <code className="rounded-sm border border-border bg-surface-2 px-1 py-0.5 font-mono text-xs text-err">
              out/
            </code>{' '}
            directory to search locally.
          </p>
        </div>
      ) : null}

      {/* The site-wide empty state, raised only when neither surface has
          anything to show for the query with no facet applied. It names
          both surfaces the query was run against and points at a browse
          destination, so a reader who mistyped is not left at a dead end
          (VAL-SEARCH-023 b). */}
      {siteEmpty ? (
        <div
          data-search-empty
          className="mt-8 border-t border-border pt-6"
        >
          <p className="max-w-[65ch] text-sm leading-relaxed text-text-dim">
            Nothing matches &ldquo;{trimmed}&rdquo;, in the article prose or
            in the methods, companies, and datasets of the wiki data layer.
            Check the spelling, try a broader term, or browse{' '}
            <Link
              data-brand-control-id="control:link-focus"
              href="/a-z"
              className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
            >
              the A-Z index
            </Link>
            .
          </p>
        </div>
      ) : null}

      {status === 'searching' || status === 'done' ? (
        <div ref={resultsRef} className="mt-8 space-y-10">
          <ResultsGroup
            id="prose"
            heading="Modules"
            count={status === 'done' ? hits.length : undefined}
            note={proseNote}
            noteIsError={proseFailed}
            loading={status === 'searching' && hits.length === 0}
          >
            {hits.length > 0 ? (
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {hits.map((entry, index) => (
                  <li key={entry.url}>
                    <IntentLink
                      data-brand-control-id="control:link-focus"
                      href={entry.url}
                      data-search-result
                      onKeyDown={(event) => onResultKeyDown(event, index)}
                      className="group block px-1 py-3"
                    >
                      <span
                        data-result-title
                        className="font-sans text-sm font-medium text-text underline-offset-2 decoration-accent group-hover:text-accent group-hover:underline group-focus-visible:text-accent group-focus-visible:underline"
                      >
                        {entry.title}
                      </span>
                      {entry.excerpt ? (
                        <span
                          className="search-excerpt mt-1 block text-sm leading-relaxed text-text-dim"
                          dangerouslySetInnerHTML={{ __html: entry.excerpt }}
                        />
                      ) : null}
                    </IntentLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </ResultsGroup>

          <ResultsGroup
            id="structured"
            heading="Structured"
            count={status === 'done' ? structuredHits.length : undefined}
            note={
              !settled || structuredHits.length > 0 ? undefined : structuredFailed ? (
                'The entity index is unavailable, so method, company and dataset results could not be loaded for this query. This is a load failure, not a verdict on the query.'
              ) : facetNarrowing ? (
                <>
                  {`The ${ENTITY_TYPE_LABEL[facetType as EntityType]} filter is hiding ${structuredAll.length} ${structuredAll.length === 1 ? 'entity that matches' : 'entities that match'} "${trimmed}".`}{' '}
                  <button
                    data-brand-control-id="control:secondary-action"
                    type="button"
                    onClick={() => setFacetType('all')}
                    className="cursor-pointer text-accent underline decoration-border-strong underline-offset-2 transition-colors hover:decoration-accent"
                  >
                    Clear the type filter
                  </button>
                </>
              ) : (
                `No structured entities match "${trimmed}". Try another term.`
              )
            }
            noteIsError={structuredFailed}
            loading={status === 'searching' && structuredHits.length === 0}
          >
            {status === 'done' || structuredHits.length > 0 ? (
              <TypeFacetBar
                value={facetType}
                onChange={setFacetType}
                pending={status === 'searching'}
              />
            ) : null}
            {structuredHits.length > 0 ? (
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {structuredHits.map((entry, index) => (
                  <li key={entry.id}>
                    {/* Native anchor: next/link in the test env strips the
                        trailing slash before a hash, and the destination
                        contract is the exact `/path/#id` stored in the index. */}
                    <a
                      data-brand-control-id="control:link-focus"
                      href={entry.url}
                      data-search-result
                      onKeyDown={(event) =>
                        onResultKeyDown(event, hits.length + index)
                      }
                      className="group block px-1 py-3"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        {/* Named rather than positional: the title used to
                            be the anchor's first child, and specs selected
                            it that way, which the snippet row silently
                            re-pointed at the title/label wrapper. */}
                        <span
                          data-entity-title
                          className="font-sans text-sm font-medium text-text underline-offset-2 decoration-accent group-hover:text-accent group-hover:underline group-focus-visible:text-accent group-focus-visible:underline"
                        >
                          {entry.title}
                        </span>
                        <span
                          data-entity-type={entry.type}
                          aria-hidden="true"
                          className="shrink-0 font-mono text-[11px] text-text-dim"
                        >
                          {ENTITY_TYPE_LABEL[entry.type]}
                        </span>
                      </span>
                      {/* The entity's own record, verbatim on its
                          destination route, so eight company rows are
                          something a reader can choose between. */}
                      {entry.snippet ? (
                        <span
                          data-entity-snippet
                          className="mt-1 block text-sm leading-relaxed text-text-dim"
                        >
                          {entry.snippet}
                        </span>
                      ) : null}
                    </a>
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
