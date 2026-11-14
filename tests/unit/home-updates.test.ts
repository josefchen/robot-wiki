import { describe, expect, it } from 'vitest';
import { ARTICLE_UPDATES, type ArticleUpdate } from '@/data/updates';
import { publishedModules } from '@/data/modules';
import { articleModifiedAt, calendarDate, recentlyUpdated } from '@/lib/content-dates';
import {
  UPDATE_NOTE_MAX_WORDS,
  latestChanges,
  readableDate,
  updateProblems,
} from '@/lib/home-updates';

const at = (dates: Record<string, string>, fallback = '2026-01-01T00:00:00+00:00') =>
  (domain: string, slug: string) => dates[`${domain}/${slug}`] ?? fallback;

describe('"Latest" on home', () => {
  it('writes dates the way a reader does', () => {
    expect(readableDate('2026-11-12')).toBe('12 Nov 2026');
    expect(readableDate('2026-01-04')).toBe('4 Jan 2026');
    expect(() => readableDate('12/11/2026')).toThrow(/not a calendar date/);
  });

  it('holds every editor note to a published article, a real date and one short plain line, newest first', () => {
    for (const update of ARTICLE_UPDATES) {
      expect(updateProblems(update), `${update.domain}/${update.slug}`).toEqual([]);
    }
    const dates = ARTICLE_UPDATES.map(({ date }) => date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('falls back to the dates git records when no article has a note', () => {
    const latest = latestChanges(5, []);
    const expected = recentlyUpdated(publishedModules(), 5);
    expect(latest.map(({ domain, slug }) => `${domain}/${slug}`)).toEqual(
      expected.map(({ domain, slug }) => `${domain}/${slug}`),
    );
    expect(latest.map(({ date }) => date)).toEqual(expected.map(({ dateModified }) => dateModified));
    expect(latest.every(({ note }) => note === undefined)).toBe(true);
    expect(latestChanges(5)).toHaveLength(5);
  });

  it('dates a change by its UTC day and keeps the note written for that day', () => {
    // 02:45 on 15 Nov in Singapore is 18:45 on 14 Nov in UTC.
    const dates = at({ 'frontier/reliability-gap': '2026-11-15T02:45:02+08:00' });
    const updates: ArticleUpdate[] = [
      { date: '2026-11-14', domain: 'frontier', slug: 'reliability-gap', note: 'New deployment numbers.' },
    ];
    const [first] = latestChanges(1, updates, dates);
    expect(first).toMatchObject({
      slug: 'reliability-gap',
      date: '2026-11-14',
      note: 'New deployment numbers.',
    });
  });

  it('dates no note and no row after today in UTC', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const update of ARTICLE_UPDATES) {
      expect(update.date <= today, `${update.domain}/${update.slug} ${update.date}`).toBe(true);
    }
    for (const change of latestChanges(5)) {
      expect(change.date <= today, `${change.href} ${change.date}`).toBe(true);
    }
  });

  it('shows a note that names the latest change, and moves the article to the note\'s date', () => {
    const dates = at({
      'frontier/reliability-gap': '2026-11-01T10:00:00+01:00',
      'classical/control': '2026-11-03T10:00:00+01:00',
    });
    const updates: ArticleUpdate[] = [
      { date: '2026-11-05', domain: 'frontier', slug: 'reliability-gap', note: 'New deployment numbers from three factories.' },
    ];
    const latest = latestChanges(2, updates, dates);
    expect(latest[0]).toMatchObject({
      domain: 'frontier',
      slug: 'reliability-gap',
      date: '2026-11-05',
      note: 'New deployment numbers from three factories.',
    });
    expect(latest[1]).toMatchObject({ domain: 'classical', slug: 'control', date: '2026-11-03' });
    expect(latest[1].note).toBeUndefined();
  });

  it('leads a day with its latest change, noted or not', () => {
    const [newest, ...noted] = publishedModules().slice(0, 6);
    const dates = at({
      [`${newest.domain}/${newest.slug}`]: '2026-11-14T20:33:02Z',
      ...Object.fromEntries(
        noted.map(({ domain, slug }, index) => [`${domain}/${slug}`, `2026-11-14T1${index}:00:00Z`]),
      ),
    });
    const updates: ArticleUpdate[] = noted.map(({ domain, slug }) => ({
      date: '2026-11-14',
      domain,
      slug,
      note: 'Corrects one figure.',
    }));
    const latest = latestChanges(5, updates, dates);
    expect(latest[0]).toMatchObject({ domain: newest.domain, slug: newest.slug, date: '2026-11-14' });
    expect(latest[0].note).toBeUndefined();
    // The noted rows follow, latest first, and the earliest is the one cut.
    expect(latest.slice(1).map(({ slug }) => slug)).toEqual(
      noted.slice(1).reverse().map(({ slug }) => slug),
    );
    expect(latest.slice(1).every(({ note }) => note === 'Corrects one figure.')).toBe(true);
  });

  it('keeps the editor\'s order among changes git stamps with the same second', () => {
    const [first, second, third] = publishedModules();
    const dates = at(
      Object.fromEntries(
        [first, second, third].map(({ domain, slug }) => [`${domain}/${slug}`, '2026-11-14T20:02:37Z']),
      ),
    );
    const updates: ArticleUpdate[] = [third, first].map(({ domain, slug }) => ({
      date: '2026-11-14',
      domain,
      slug,
      note: 'Corrects one figure.',
    }));
    expect(latestChanges(3, updates, dates).map(({ slug }) => slug)).toEqual([
      third.slug,
      first.slug,
      second.slug,
    ]);
  });

  it('leaves out of the five no article changed later than one it shows', () => {
    const shown = latestChanges(5);
    const shownPaths = new Set(shown.map(({ domain, slug }) => `${domain}/${slug}`));
    const omitted = publishedModules().filter(({ domain, slug }) => !shownPaths.has(`${domain}/${slug}`));
    expect(omitted.length).toBeGreaterThan(0);
    for (const row of shown) {
      const rowAt = articleModifiedAt(row.domain, row.slug);
      for (const article of omitted) {
        const articleAt = articleModifiedAt(article.domain, article.slug);
        const label = `${article.domain}/${article.slug} against ${row.domain}/${row.slug}`;
        expect(calendarDate(articleAt) <= row.date, label).toBe(true);
        // A note dated after git's day moves its row to that day; any other
        // row is held to the second git recorded.
        if (calendarDate(rowAt) === row.date) {
          expect(Date.parse(articleAt), label).toBeLessThanOrEqual(Date.parse(rowAt));
        }
      }
    }
  });

  it('drops a note older than the article\'s latest change', () => {
    const dates = at({ 'frontier/reliability-gap': '2026-11-09T10:00:00+01:00' });
    const updates: ArticleUpdate[] = [
      { date: '2026-11-05', domain: 'frontier', slug: 'reliability-gap', note: 'New deployment numbers.' },
    ];
    const [first] = latestChanges(1, updates, dates);
    expect(first).toMatchObject({ slug: 'reliability-gap', date: '2026-11-09' });
    expect(first.note).toBeUndefined();
  });

  it('refuses notes that are long, dashed, unpublished, misdated or out of order', () => {
    const base: ArticleUpdate = { date: '2026-11-05', domain: 'frontier', slug: 'reliability-gap', note: 'Rewrote the opening.' };
    expect(updateProblems(base)).toEqual([]);
    expect(updateProblems({ ...base, note: Array.from({ length: UPDATE_NOTE_MAX_WORDS + 1 }, () => 'word').join(' ') })[0]).toMatch(
      /over 10/,
    );
    expect(updateProblems({ ...base, note: 'New numbers — and a chart.' })[0]).toMatch(/dash/);
    expect(updateProblems({ ...base, slug: 'no-such-article' })[0]).toMatch(/not a published article/);
    expect(updateProblems({ ...base, date: '5 Nov 2026' })[0]).toMatch(/not YYYY-MM-DD/);
    expect(() =>
      latestChanges(5, [base, { ...base, date: '2026-11-07' }]),
    ).toThrow(/newest first/);
  });
});
