import { IntentLink } from '@/components/ui/intent-link';
import { readableDate, type LatestChange } from '@/lib/home-updates';

/**
 * "Latest": the five most recent article changes, newest first, each dated
 * as a reader writes a date, with the editor's note on what changed where
 * there is one.
 */
export function LatestChanges({ changes }: { changes: readonly LatestChange[] }) {
  return (
    <ol className="latest">
      {changes.map((change) => (
        <li key={change.href} data-latest={`${change.domain}/${change.slug}`} className="latest-row">
          <time dateTime={change.date} className="latest-date">
            {readableDate(change.date)}
          </time>
          <div className="latest-text">
            <IntentLink
              data-brand-control-id="control:link-focus"
              href={change.href}
              className="ink-link latest-title"
            >
              {change.title}
            </IntentLink>
            {change.note ? (
              <p data-latest-note className="latest-note">
                {change.note}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
