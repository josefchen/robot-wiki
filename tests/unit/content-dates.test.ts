import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import dates from '@/data/content-dates.json' with { type: 'json' };
import { publishedModules } from '@/data/modules';
import {
  articleDateModified,
  articleDatePublished,
  calendarDate,
  recentlyUpdated,
  routeDateModified,
  utcTimestamp,
} from '@/lib/content-dates';
import { gitAddedAt, gitModifiedAt, gitModifiedAtAny, utcNow } from '@/lib/content-dates-git';
import { moduleDatePublished } from '@/lib/module-source';

const key = ({ domain, slug }: { domain: string; slug: string }) => `${domain}/${slug}`;

describe('article change dates', () => {
  it('records exactly the published articles', () => {
    expect(Object.keys(dates.articles).sort()).toEqual(
      publishedModules().map(key).sort(),
    );
  });

  it('returns the requested number of articles, newest first', () => {
    const recent = recentlyUpdated(publishedModules(), 5);
    expect(recent).toHaveLength(5);
    for (let index = 1; index < recent.length; index += 1) {
      expect(Date.parse(recent[index - 1].modifiedAt)).toBeGreaterThanOrEqual(
        Date.parse(recent[index].modifiedAt),
      );
    }
    for (const article of recent) {
      expect(article.dateModified).toBe(
        articleDateModified(article.domain, article.slug),
      );
      expect(article.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('never dates a publication after the latest change', () => {
    for (const entry of publishedModules()) {
      const published = articleDatePublished(
        entry.domain,
        entry.slug,
        moduleDatePublished(entry.domain, entry.slug),
      );
      expect(published, key(entry)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        published <= articleDateModified(entry.domain, entry.slug),
        `${key(entry)} datePublished ${published}`,
      ).toBe(true);
    }
  });

  it('dates no article or route after the day the file is read', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const entry of publishedModules()) {
      expect(articleDateModified(entry.domain, entry.slug) <= today, key(entry)).toBe(true);
    }
    for (const route of Object.keys(dates.routes)) {
      expect(routeDateModified(route) <= today, route).toBe(true);
    }
  });
});

/**
 * 18:45 UTC on 14 Nov 2026 is 02:45 on 15 Nov in Singapore. A release
 * committed there at that hour put the next day's date on every page that
 * prints one.
 */
describe('the day a date names', () => {
  const zone = process.env.TZ;
  const EVENING_EAST = '2026-11-15T02:45:02+08:00';

  beforeEach(() => {
    process.env.TZ = 'Asia/Singapore';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T18:45:02Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  });

  it('is the UTC day, whatever zone wrote the stamp or builds the site', () => {
    // The zone and the clock took hold: here it is already the 15th.
    expect(new Date().getTimezoneOffset()).toBe(-480);
    expect(new Date().getDate()).toBe(15);

    expect(utcTimestamp(EVENING_EAST)).toBe('2026-11-14T18:45:02Z');
    expect(calendarDate(EVENING_EAST)).toBe('2026-11-14');
    expect(calendarDate('2026-11-14T18:45:02Z')).toBe('2026-11-14');
    expect(calendarDate('2026-11-14T23:59:59.500+00:00')).toBe('2026-11-14');
    expect(calendarDate('2026-11-13T22:30:00-05:00')).toBe('2026-11-14');
    // No offset would be read in the building machine's zone.
    expect(() => calendarDate('2026-11-14T18:45:02')).toThrow(/offset/);
    expect(() => calendarDate('2026-11-14')).toThrow(/offset/);
  });

  it('stamps an uncommitted change with the UTC time', () => {
    expect(new Date().getDate()).toBe(15);
    expect(utcNow()).toBe('2026-11-14T18:45:02Z');
    expect(calendarDate(utcNow())).toBe('2026-11-14');
  });

  it('reads a commit made east of Greenwich as its UTC time', () => {
    const root = mkdtempSync(join(tmpdir(), 'content-dates-'));
    const git = (...args: string[]) =>
      execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, GIT_AUTHOR_DATE: EVENING_EAST, GIT_COMMITTER_DATE: EVENING_EAST },
      }).trim();
    try {
      git('init', '--quiet');
      writeFileSync(join(root, 'article.mdx'), 'One sentence.\n');
      git('add', 'article.mdx');
      git(
        '-c', 'user.name=Test',
        '-c', 'user.email=test@example.com',
        '-c', 'commit.gpgsign=false',
        'commit', '--quiet', '--no-verify', '-m', 'Add an article',
      );
      // Git itself still prints the committer's zone, and the 15th.
      expect(git('log', '-1', '--format=%cI')).toBe(EVENING_EAST);
      expect(gitModifiedAt(root, 'article.mdx')).toBe('2026-11-14T18:45:02Z');
      expect(gitAddedAt(root, 'article.mdx')).toBe('2026-11-14T18:45:02Z');
      expect(gitModifiedAtAny(root, ['article.mdx', 'absent.mdx'])).toBe('2026-11-14T18:45:02Z');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
