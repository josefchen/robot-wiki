import { AuthorList } from '@/components/article/author-list';
import { venueStatesYear } from '@/data/citations';
import { referenceGroups } from '@/lib/reference-order';
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
 * Entries are anchored at #ref-<id> so chips can jump to them. Entries
 * declared in frontmatter but never cited inline follow the cited ones under
 * one "Further reading" heading instead of appearing as silent orphans, and
 * their numbers run on from the cited entries (lib/reference-order.ts).
 */
export function References({ entries }: { entries: readonly ResolvedReference[] }) {
  if (entries.length === 0) return null;
  const { cited, furtherReading } = referenceGroups(entries);

  return (
    <section aria-labelledby="references-heading" className="mt-16">
      <h2 id="references-heading" className="section-h2">
        References
      </h2>
      {cited.length > 0 ? (
        <ol className="mt-6 list-none space-y-3">
          {cited.map((entry, index) => (
            <ReferenceEntry key={entry.citation.id} entry={entry} number={index + 1} />
          ))}
        </ol>
      ) : null}
      {furtherReading.length > 0 ? (
        <>
          {/* The article's h3 role: DM Sans 600 at 16px, sentence case,
              untracked. One heading marks the whole group, so the page
              carries no repeated tracked-capitals label for it. */}
          <h3 className="mt-9 font-display text-[16px] font-semibold leading-[1.4] text-text">
            Further reading
          </h3>
          <ol start={cited.length + 1} className="mt-3 list-none space-y-3">
            {furtherReading.map((entry, index) => (
              <ReferenceEntry
                key={entry.citation.id}
                entry={entry}
                number={cited.length + index + 1}
              />
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}

function ReferenceEntry({
  entry: { citation, furtherReading },
  number,
}: {
  entry: ResolvedReference;
  number: number;
}) {
  return (
    <li
      id={`ref-${citation.id}`}
      data-reference-id={citation.id}
      // Which group the entry belongs to, exposed so a sweep can read the
      // further-reading set without sniffing the heading's words.
      data-further-reading={furtherReading ? 'true' : 'false'}
      className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 py-1 target:[&>div]:border-l target:[&>div]:border-ink target:[&>div]:pl-3"
    >
      <span
        aria-hidden="true"
        className="pt-px font-mono text-[13px] leading-relaxed text-text"
      >
        {number}
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
  );
}
