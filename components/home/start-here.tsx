import { IntentLink } from '@/components/ui/intent-link';
import type { FeaturedArticle } from '@/lib/featured-article';

/**
 * "Start here": the editor's four entry points, hottest first, as equal
 * entries: the article's title, linked, and one plain sentence on what it
 * answers.
 */
export function StartHere({ entries }: { entries: readonly FeaturedArticle[] }) {
  return (
    <ol className="start-here">
      {entries.map((entry) => (
        <li
          key={entry.href}
          data-start-here={`${entry.domain}/${entry.slug}`}
          className="start-entry"
        >
          <h3 className="start-title">
            <IntentLink
              data-brand-control-id="control:link-focus"
              href={entry.href}
              className="start-link"
            >
              {entry.title}
            </IntentLink>
          </h3>
          <p data-featured-dek className="start-dek">
            {entry.dek}
          </p>
        </li>
      ))}
    </ol>
  );
}
