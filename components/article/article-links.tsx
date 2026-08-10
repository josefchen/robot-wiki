import Link from 'next/link';
import type { ArticleLinkEntry } from '@/lib/backlinks';

/**
 * The article's navigation blocks: curated forward links ("See also",
 * from the module frontmatter) and derived backlinks ("Linked from",
 * computed at build time by inverting the wiki's internal link graph,
 * lib/backlinks.ts). The shared article template renders both;
 * per-article MDX must never hand-write these headings
 * (architecture.md section 6b).
 *
 * Entries carry registry data verbatim: the target's title as the link
 * label (it must match the destination's h1) and its one-line summary.
 * An empty list renders nothing at all: an article with no inbound links
 * omits "Linked from" entirely rather than showing an empty or
 * apologetic section (VAL-WIKI-012), and "See also" stays absent until
 * the article declares one.
 */

interface ArticleLinkSectionProps {
  headingId: string;
  heading: string;
  section: 'see-also' | 'linked-from';
  entries: readonly ArticleLinkEntry[];
}

function ArticleLinkSection({
  headingId,
  heading,
  section,
  entries,
}: ArticleLinkSectionProps) {
  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      data-section={section}
      className="mt-14"
    >
      <h2
        id={headingId}
        className="font-sans text-[1.375rem] font-semibold tracking-tight text-text"
      >
        {heading}
      </h2>
      <ul className="mt-6 list-none space-y-5">
        {entries.map((entry) => (
          <li key={entry.key} data-article-key={entry.key}>
            <Link
              href={entry.href}
              className="break-words font-sans text-sm font-medium leading-snug text-text underline decoration-border-strong underline-offset-[3px] transition-colors hover:text-accent hover:decoration-accent"
            >
              {entry.title}
            </Link>
            <p className="mt-1 font-sans text-[13px] leading-relaxed text-text-dim">
              {entry.summary}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SeeAlso({ entries }: { entries: readonly ArticleLinkEntry[] }) {
  return (
    <ArticleLinkSection
      headingId="see-also-heading"
      heading="See also"
      section="see-also"
      entries={entries}
    />
  );
}

export function LinkedFrom({ entries }: { entries: readonly ArticleLinkEntry[] }) {
  return (
    <ArticleLinkSection
      headingId="linked-from-heading"
      heading="Linked from"
      section="linked-from"
      entries={entries}
    />
  );
}
