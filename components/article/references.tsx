import { AuthorList } from '@/components/article/author-list';
import { Badge } from '@/components/ui/badge';
import { venueStatesYear } from '@/data/citations';
import type { ResolvedReference } from '@/lib/references';

/**
 * The long form of the inline <Cite> chips: a complete bibliography for one
 * article, derived from the citation registry via lib/references.ts. The
 * shared article template renders this as the last content section of every
 * published article; per-article MDX must never hand-write it
 * (architecture.md section 6b).
 *
 * Entries keep registry data verbatim: title, full author list, year, venue
 * when the registry records one, and a link to the primary source. Absent
 * optional fields render nothing, never a fabricated value.
 * Entries are anchored at #ref-<id> so chips can jump to them, and entries
 * declared in frontmatter but never cited inline carry an explicit
 * "Further reading" marker instead of appearing as silent orphans
 */
export function References({ entries }: { entries: readonly ResolvedReference[] }) {
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="references-heading" className="mt-14">
      <h2
        id="references-heading"
        className="font-sans text-[1.375rem] font-semibold tracking-tight text-text"
      >
        References
      </h2>
      <ol className="mt-6 list-none space-y-4">
        {entries.map(({ citation, furtherReading }, index) => (
          <li
            key={citation.id}
            id={`ref-${citation.id}`}
            data-reference-id={citation.id}
            className="grid scroll-mt-16 grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 rounded-sm px-2 py-1.5 transition-colors target:bg-surface lg:scroll-mt-4 [margin-inline:-0.5rem]"
          >
            <span
              aria-hidden="true"
              className="pt-0.5 text-right font-mono text-xs leading-relaxed text-text-dim"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-brand-control-id="control:link-focus"
                  className="break-words font-sans text-sm font-medium leading-snug text-text underline decoration-border-strong underline-offset-[3px] transition-colors hover:text-accent hover:decoration-accent"
                >
                  {citation.title}
                </a>
                {furtherReading ? <Badge>Further reading</Badge> : null}
              </div>
              <p className="mt-1 break-words font-sans text-[13px] leading-relaxed text-text-dim">
                <AuthorList
                  authors={citation.authors}
                  trailing={`${citation.venue ? `, ${citation.venue}` : ''}${
                    venueStatesYear(citation) ? '' : `, ${citation.year}`
                  }.`}
                />
              </p>
              <p className="mt-0.5 break-all font-mono text-xs leading-relaxed text-text-dim">
                {citation.url}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
