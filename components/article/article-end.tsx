import Link from 'next/link';
import type { ModuleRegistryEntry } from '@/data/modules';
import {
  articleEditUrl,
  articleErrorReportUrl,
  articleNeighbours,
} from '@/lib/article-sequence';

/**
 * The foot of every article, after the References: the neighbouring
 * articles in the domain's order, then the two ways to change the page.
 * The first article of a domain has no previous and the last has no next;
 * the missing side renders nothing.
 */

const titleLink =
  'justify-self-start break-words font-medium text-text underline decoration-border-strong underline-offset-[3px] transition-colors hover:decoration-text';

const actionLink =
  'text-text-dim underline decoration-border-strong decoration-1 underline-offset-[3px] transition-colors hover:text-text hover:decoration-text';

function Neighbour({
  label,
  rel,
  entry,
}: {
  label: 'Previous' | 'Next';
  rel: 'prev' | 'next';
  entry: ModuleRegistryEntry | undefined;
}) {
  if (!entry) return null;
  return (
    <li className="grid grid-cols-[4rem_minmax(0,1fr)]">
      <span className="text-text-dim">{label}</span>
      <Link
        rel={rel}
        href={`/${entry.domain}/${entry.slug}/`}
        data-brand-control-id="control:link-focus"
        className={titleLink}
      >
        {entry.title}
      </Link>
    </li>
  );
}

export function ArticleEnd({ entry }: { entry: ModuleRegistryEntry }) {
  const { previous, next } = articleNeighbours(entry.domain, entry.slug);

  return (
    <div data-article-end className="mt-16 space-y-6 font-sans">
      {previous || next ? (
        <nav aria-label="Previous and next article">
          <ul className="list-none space-y-1.5 text-sm leading-snug">
            <Neighbour label="Previous" rel="prev" entry={previous} />
            <Neighbour label="Next" rel="next" entry={next} />
          </ul>
        </nav>
      ) : null}
      <p className="text-[13px] leading-relaxed text-text-dim">
        <a
          href={articleEditUrl(entry.domain, entry.slug)}
          target="_blank"
          rel="noopener"
          data-brand-control-id="control:link-focus"
          className={actionLink}
        >
          Improve this page
        </a>
        <span aria-hidden="true"> · </span>
        <a
          href={articleErrorReportUrl(entry)}
          target="_blank"
          rel="noopener"
          data-brand-control-id="control:link-focus"
          className={actionLink}
        >
          Report an error
        </a>
      </p>
    </div>
  );
}
