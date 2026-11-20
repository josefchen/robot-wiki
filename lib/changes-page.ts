/**
 * What /changes/ derives from data/updates.ts: one row per editor's note,
 * newest first, each with its article's title and address from the module
 * registry.
 */
import { ARTICLE_UPDATES, type ArticleUpdate } from '../data/updates.ts';
import { getModule } from '../data/modules.ts';

export const CHANGES_PATH = '/changes/';
export const CHANGES_TITLE = 'Recent changes';

export type ChangeRow = {
  /** Unique on the page: the note's day, article and place in the data. */
  id: string;
  /** The calendar day, `YYYY-MM-DD`. */
  date: string;
  title: string;
  href: string;
  note: string;
  /** What stands between the title and the note: nothing after a title that ends its own sentence. */
  titleEnd: '.' | '';
};

type Article = { title: string; status: string };
type FindArticle = (domain: string, slug: string) => Article | undefined;

const published = (update: ArticleUpdate, find: FindArticle): Article | undefined => {
  const article = find(update.domain, update.slug);
  return article?.status === 'published' ? article : undefined;
};

/**
 * Notes whose article the registry does not publish, as `domain/slug`. The
 * page leaves such a row out, so a reader never meets a dead link; the unit
 * test holds this list empty.
 */
export function unresolvedChanges(
  updates: readonly ArticleUpdate[] = ARTICLE_UPDATES,
  find: FindArticle = getModule,
): string[] {
  return updates
    .filter((update) => !published(update, find))
    .map((update) => `${update.domain}/${update.slug}`);
}

/** Every note with a published article, newest first; a day keeps the editor's order. */
export function changeRows(
  updates: readonly ArticleUpdate[] = ARTICLE_UPDATES,
  find: FindArticle = getModule,
): ChangeRow[] {
  return updates
    .map((update, index) => ({ update, index, article: published(update, find) }))
    .filter((entry): entry is typeof entry & { article: Article } => entry.article !== undefined)
    .sort((left, right) => right.update.date.localeCompare(left.update.date) || left.index - right.index)
    .map(({ update, index, article }) => ({
      id: `${update.date}/${update.domain}/${update.slug}/${index}`,
      date: update.date,
      title: article.title,
      href: `/${update.domain}/${update.slug}/`,
      note: update.note,
      titleEnd: /[.?!]$/.test(article.title) ? '' : '.',
    }));
}

/** Search registration starts at thirty published editorial notes. */
export function changesAreIndexable(publishedNotes = changeRows().length): boolean {
  return publishedNotes >= 30;
}
