'use client';

import { createContext, use, useMemo, type ReactNode } from 'react';
import { Cite } from '@/components/ui/cite';

/**
 * The slice of a citation a client widget renders: where the source link
 * points, its title, the inline chip label and the tooltip metadata line
 * (data/citations.ts `citationLabel` and `citationMeta`, computed on the
 * server). Nothing else of the registry entry crosses to the browser.
 */
export type CitationRecord = {
  id: string;
  url: string;
  title: string;
  label: string;
  meta: string;
};

export type CitationLookup = (id: string) => CitationRecord | undefined;

const CitationRecordsContext = createContext<ReadonlyMap<
  string,
  CitationRecord
> | null>(null);

/**
 * Supplies the citation records a client widget may look up.
 *
 * The citation registry (data/citations.ts) is a server-side module: it
 * holds every source on the site, and importing it from a Client Component
 * would ship all of it to every page that mounts the widget. Instead the
 * server resolves exactly the records a widget can show
 * (lib/widget-citations.ts) and passes them down through this provider,
 * the same way components/mdx/cite-ref.tsx resolves a <Cite> on the server
 * and hands the presentational chip explicit props. The provider renders
 * no markup of its own.
 */
export function CitationRecordsProvider({
  records,
  children,
}: {
  records: readonly CitationRecord[];
  children: ReactNode;
}) {
  const byId = useMemo(
    () => new Map(records.map((record) => [record.id, record])),
    [records],
  );
  return <CitationRecordsContext value={byId}>{children}</CitationRecordsContext>;
}

/**
 * Returns the lookup for the records the nearest provider supplied.
 *
 * Outside production a missing provider, or an id the server did not
 * supply, throws: it means a widget's citation ids in
 * lib/widget-citations.ts have drifted from what the widget renders, and a
 * component test exercising that state should fail loudly rather than
 * render a widget whose source link silently vanished. In production the
 * lookup returns undefined, which every widget already renders as "no
 * source link" rather than crashing an interaction.
 */
export function useCitationLookup(): CitationLookup {
  const byId = use(CitationRecordsContext);
  if (byId === null) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(
        'useCitationLookup: no CitationRecordsProvider above this widget; ' +
          'mount it through components/mdx/article-mounts.tsx',
      );
    }
    return () => undefined;
  }
  return (id) => {
    const record = byId.get(id);
    if (!record && process.env.NODE_ENV !== 'production') {
      throw new Error(
        `useCitationLookup: citation "${id}" was not supplied to this widget; ` +
          'add it to its entry in lib/widget-citations.ts',
      );
    }
    return record;
  };
}

/**
 * The inline citation chip for Client Components: the same markup as
 * components/mdx/cite-ref.tsx, resolved from the records the server
 * supplied instead of from the registry. Widgets write `<CiteRef id="..."/>`
 * exactly as MDX does, so every source scan that reads chip sites out of
 * component source still sees them; tests/unit/widget-citations.test.tsx
 * pins that both resolvers render identical HTML.
 */
export function CiteRef({ id }: { id: string }) {
  const citation = useCitationLookup()(id);
  if (!citation) {
    return (
      <span className="inline-flex items-center rounded-xs border border-err px-1.5 font-mono text-[0.72em] leading-5 text-err">
        missing citation: {id}
      </span>
    );
  }
  return (
    <Cite
      citeId={id}
      href={citation.url}
      label={citation.label}
      title={citation.title}
      meta={citation.meta}
      referenceHref={`#ref-${id}`}
    />
  );
}
