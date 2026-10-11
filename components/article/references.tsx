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
    <section aria-labelledby="references-heading" className="mt-16">
      <h2 id="references-heading" className="section-h2">
        References
      </h2>
      <ol className="mt-6 list-none space-y-3">
        {entries.map(({ citation, furtherReading }, index) => (
          <li
            key={citation.id}
            id={`ref-${citation.id}`}
            data-reference-id={citation.id}
            // The same boolean the badge renders from, exposed so a sweep
            // can read the further-reading set without sniffing the badge's
            // own words.
            data-further-reading={furtherReading ? 'true' : 'false'}
            className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 py-1 target:[&>div]:border-l target:[&>div]:border-ink target:[&>div]:pl-3"
          >
            <span
              aria-hidden="true"
              className="pt-px font-mono text-[13px] leading-relaxed text-text"
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
                  data-reference-source-link
                  // Ink with a 1px underline, like every prose link. Internal
                  // index rows (See also, Linked from) carry no underline at
                  // rest, so a reader can tell an outbound source from a
                  // move inside the wiki without reading it.
                  className="ink-link break-words font-sans text-[14px] font-medium leading-snug"
                >
                  {citation.title}
                </a>
                {furtherReading ? <Badge>Further reading</Badge> : null}
              </div>
              <p className="mt-0.5 break-words font-sans text-[13px] leading-relaxed text-text-dim">
                <AuthorList
                  id={citation.id}
                  authors={citation.authors}
                  trailing={`${citation.venue ? `, ${citation.venue}` : ''}${
                    venueStatesYear(citation) ? '' : `, ${citation.year}${citation.year === 'n.d.' ? `; accessed ${citation.accessedOn}` : ''}`
                  }.`}
                />
              </p>
              <p className="break-all font-mono text-[12px] leading-relaxed text-text-dim">
                {citation.url}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
