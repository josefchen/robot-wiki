import { ARTICLE_UPDATES, type ArticleUpdate } from '../data/updates.ts';
import { getModule, publishedModules } from '../data/modules.ts';
import { wordCount } from './article-lead.ts';
import { articleModifiedAt, calendarDate } from './content-dates.ts';
import { homeCopyProblems } from './home-copy.ts';

/**
 * "Latest" on home: the articles changed most recently, each with the
 * editor's note on what changed where data/updates.ts has one.
 *
 * An article's date is the day git records for its latest change. A note
 * dated on or after that day names that change, so the article takes the
 * note and its date; an older note described an earlier change and is not
 * shown. An article with no note still appears, dated by git.
 */
export const UPDATE_NOTE_MAX_WORDS = 10;

export type LatestChange = {
  domain: string;
  slug: string;
  title: string;
  href: string;
  /** The calendar day, `YYYY-MM-DD`. */
  date: string;
  note?: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-11-12` as a reader writes it: `12 Nov 2026`. */
export function readableDate(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) throw new Error(`${day} is not a calendar date`);
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) throw new Error(`${day} has no month ${match[2]}`);
  return `${Number(match[3])} ${month} ${match[1]}`;
}

/** Every reason `update` could not be shown on home; empty when it can. */
export function updateProblems(update: ArticleUpdate): string[] {
  const problems: string[] = [];
  const label = `${update.domain}/${update.slug}`;
  if (getModule(update.domain, update.slug)?.status !== 'published') {
    problems.push(`${label} is not a published article`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(update.date) || Number.isNaN(Date.parse(update.date))) {
    problems.push(`${label} is dated ${update.date}, not YYYY-MM-DD`);
  }
  const words = wordCount(update.note);
  if (words === 0) problems.push(`${label} has an empty note`);
  if (words > UPDATE_NOTE_MAX_WORDS) {
    problems.push(`${label}'s note runs to ${words} words, over ${UPDATE_NOTE_MAX_WORDS}`);
  }
  if (/[\r\n]/.test(update.note)) problems.push(`${label}'s note runs over one line`);
  for (const problem of homeCopyProblems(update.note)) problems.push(`${label}'s note carries ${problem}`);
  return problems;
}

/** The `count` latest changes, newest first. */
export function latestChanges(
  count = 5,
  updates: readonly ArticleUpdate[] = ARTICLE_UPDATES,
  modifiedAt: (domain: string, slug: string) => string = articleModifiedAt,
): LatestChange[] {
  for (let index = 1; index < updates.length; index += 1) {
    if (updates[index].date > updates[index - 1].date) {
      throw new Error('data/updates.ts must list its notes newest first');
    }
  }
  const problems = updates.flatMap(updateProblems);
  if (problems.length > 0) throw new Error(`data/updates.ts: ${problems.join('; ')}`);

  return publishedModules()
    .map((article) => {
      const at = modifiedAt(article.domain, article.slug);
      const day = calendarDate(at);
      // The newest note for this article, if it names its latest change.
      const update = updates.find(
        (row) => row.domain === article.domain && row.slug === article.slug,
      );
      const noted = update && update.date >= day ? update : undefined;
      return {
        change: {
          domain: article.domain,
          slug: article.slug,
          title: article.title,
          href: `/${article.domain}/${article.slug}/`,
          date: noted?.date ?? day,
          ...(noted ? { note: noted.note } : {}),
        } satisfies LatestChange,
        // On one day, changes the editor noted lead, in the editor's order;
        // the rest keep git's order. A noted day sorts as its end.
        rank: noted ? updates.indexOf(noted) : Number.POSITIVE_INFINITY,
        order: noted && noted.date > day ? Date.parse(`${noted.date}T23:59:59Z`) : Date.parse(at),
      };
    })
    .sort(
      (left, right) =>
        right.change.date.localeCompare(left.change.date) ||
        (left.rank === right.rank ? 0 : left.rank < right.rank ? -1 : 1) ||
        right.order - left.order ||
        `${left.change.domain}/${left.change.slug}`.localeCompare(`${right.change.domain}/${right.change.slug}`),
    )
    .slice(0, count)
    .map(({ change }) => change);
}
