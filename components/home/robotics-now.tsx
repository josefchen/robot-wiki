import { SourceLink } from '@/components/now/source-mark';
import { IntentLink } from '@/components/ui/intent-link';
import type { Development } from '@/data/now';
import { readableDate } from '@/lib/home-updates';
import { NOW_PATH } from '@/lib/now-page';

/**
 * "Robotics now": the newest developments in the field that rest on a
 * primary source, newest first, in the rows of "Latest". Each row is its
 * date, the page it rests on and its one sentence; the one link under them
 * goes to the page that holds every development.
 */
export function RoboticsNow({
  rows,
  total,
  since,
}: {
  rows: readonly Development[];
  /** How many developments the page behind the link holds. */
  total: number;
  /** The first day those developments cover, `YYYY-MM-DD`. */
  since: string;
}) {
  return (
    <div>
      <ol className="latest">
        {rows.map((row) => (
          <li key={row.id} data-development={row.id} className="latest-row">
            <p className="latest-date">
              <time dateTime={row.date}>{readableDate(row.date)}</time>
              <span aria-hidden="true" className="sm:hidden">
                {' · '}
              </span>
              {/* A 24px-tall target, on the date's line on a phone and under it from 640px. */}
              <SourceLink
                url={row.sourceUrl}
                title={row.sourceTitle}
                className="inline-block py-0.5 leading-5 sm:block sm:w-fit sm:whitespace-normal"
              />
            </p>
            <p data-development-text className="latest-text latest-note">
              {row.what}
            </p>
          </li>
        ))}
      </ol>
      {/* On the rows' own grid, so the link stands in the sentences' column. */}
      <p className="mt-4 font-sans text-[16px] leading-[1.5] sm:grid sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-x-6 xl:grid-cols-3 xl:gap-x-8">
        <IntentLink
          data-brand-control-id="control:link-focus"
          href={NOW_PATH}
          className="ink-link sm:col-start-2 sm:justify-self-start xl:col-end-4"
        >
          All {total} developments since {readableDate(since)}
        </IntentLink>
      </p>
    </div>
  );
}
