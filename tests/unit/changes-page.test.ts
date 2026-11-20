import { describe, expect, it } from 'vitest';
import { ARTICLE_UPDATES, type ArticleUpdate } from '@/data/updates';
import { getModule } from '@/data/modules';
import { changesAreIndexable, changeRows, unresolvedChanges } from '@/lib/changes-page';

/**
 * The rows of /changes/ (lib/changes-page.ts): every note in data/updates.ts,
 * newest first, with the article's title and address from the registry.
 */

const note = (date: string, slug: string, text = 'Rewrote the opening.'): ArticleUpdate => ({
  date,
  domain: 'frontier',
  slug,
  note: text,
});

const registry =
  (articles: Record<string, { title: string; status: string }>) => (domain: string, slug: string) =>
    articles[`${domain}/${slug}`];

describe('the rows of Recent changes', () => {
  it('requires thirty published notes before opening the page to search', () => {
    expect(changesAreIndexable(29)).toBe(false);
    expect(changesAreIndexable(30)).toBe(true);
    expect(changesAreIndexable(31)).toBe(true);
  });

  it('resolves every note in the data to a published article', () => {
    expect(unresolvedChanges()).toEqual([]);
  });

  it('gives every note one row, with its date, its note and the registry title and address', () => {
    const rows = changeRows();
    expect(rows).toHaveLength(ARTICLE_UPDATES.length);
    const expected = ARTICLE_UPDATES.map((update) => ({
      date: update.date,
      title: getModule(update.domain, update.slug)?.title,
      href: `/${update.domain}/${update.slug}/`,
      note: update.note,
    }));
    // The data is kept newest first, so the page order is the data's order.
    expect(rows.map(({ date, title, href, note: text }) => ({ date, title, href, note: text }))).toEqual(expected);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('lists the real rows newest first', () => {
    const dates = changeRows().map((row) => row.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('sorts by day, newest first, and keeps the data order within a day', () => {
    const find = registry({
      'frontier/a': { title: 'A', status: 'published' },
      'frontier/b': { title: 'B', status: 'published' },
      'frontier/c': { title: 'C', status: 'published' },
    });
    const rows = changeRows(
      [note('2026-11-05', 'a'), note('2026-11-09', 'b'), note('2026-11-05', 'c'), note('2026-11-09', 'a')],
      find,
    );
    expect(rows.map((row) => `${row.date} ${row.title}`)).toEqual([
      '2026-11-09 B',
      '2026-11-09 A',
      '2026-11-05 A',
      '2026-11-05 C',
    ]);
  });

  it('keeps an article noted twice as two rows with distinct ids', () => {
    const find = registry({ 'frontier/a': { title: 'A', status: 'published' } });
    const rows = changeRows([note('2026-11-09', 'a', 'Second.'), note('2026-11-09', 'a', 'First.')], find);
    expect(rows.map((row) => row.note)).toEqual(['Second.', 'First.']);
    expect(rows[0].id).not.toBe(rows[1].id);
  });

  it('reports a note whose article is missing or unpublished and leaves it off the page', () => {
    const find = registry({
      'frontier/a': { title: 'A', status: 'published' },
      'frontier/planned': { title: 'Planned', status: 'draft' },
    });
    const updates = [note('2026-11-09', 'no-such-article'), note('2026-11-08', 'a'), note('2026-11-07', 'planned')];
    expect(unresolvedChanges(updates, find)).toEqual(['frontier/no-such-article', 'frontier/planned']);
    expect(changeRows(updates, find).map((row) => row.href)).toEqual(['/frontier/a/']);
  });

  it('ends the title with a full stop unless the title ends its own sentence', () => {
    const find = registry({
      'frontier/a': { title: 'The Bear Case', status: 'published' },
      'frontier/b': { title: 'What Is a World Model?', status: 'published' },
    });
    const rows = changeRows([note('2026-11-09', 'a'), note('2026-11-09', 'b')], find);
    expect(rows.map((row) => row.titleEnd)).toEqual(['.', '']);
  });
});
