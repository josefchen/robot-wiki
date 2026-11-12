import { describe, expect, it } from 'vitest';
import { ARTICLE_UPDATES, type ArticleUpdate } from '@/data/updates';
import { publishedModules } from '@/data/modules';
import { recentlyUpdated } from '@/lib/content-dates';
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
