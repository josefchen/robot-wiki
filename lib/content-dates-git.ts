import { execFileSync } from 'node:child_process';
import { utcTimestamp } from './content-dates.ts';

/**
 * Reads article change dates out of git. Only the generator and the test that
 * holds `data/content-dates.json` to history use this; pages read the
 * committed file through `lib/content-dates.ts`.
 */

function git(root: string, args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function onlyWhitespace(numstat: string): boolean {
  return numstat
    .split('\n')
    .filter(Boolean)
    .every((line) => /^0\t0\t/.test(line));
}

function changesOnlyWhitespace(root: string, commit: string, path: string): boolean {
  const parents = git(root, ['rev-list', '--parents', '-n', '1', commit]).split(' ');
  const args = parents.length > 1
    ? ['diff', '-w', '--numstat', `${commit}^1`, commit, '--', path]
    : ['show', '-w', '--numstat', '--format=', commit, '--', path];
  return onlyWhitespace(git(root, args));
}

/**
 * The commit time, in UTC, of the latest commit that changed non-whitespace
 * content in `path`, or null when the file has no history yet. Commits are
 * visited in git's own history order with its default simplification, which
 * is what `git log -1 -- <path>` reports before whitespace-only edits are
 * skipped. Git prints `%cI` in the committer's zone, and the day a page
 * shows must not depend on where the commit was made.
 */
export function gitModifiedAt(root: string, path: string): string | null {
  const log = git(root, ['log', '--format=%H%x09%cI', '--', path]);
  for (const line of log.split('\n').filter(Boolean)) {
    const [commit, timestamp] = line.split('\t');
    if (!changesOnlyWhitespace(root, commit, path)) return utcTimestamp(timestamp);
  }
  return null;
}

/** The commit time, in UTC, of the commit that added `path`, following renames. */
export function gitAddedAt(root: string, path: string): string | null {
  const log = git(root, ['log', '--follow', '--diff-filter=A', '--format=%cI', '--', path]);
  const added = log.split('\n').filter(Boolean).at(-1);
  return added ? utcTimestamp(added) : null;
}

/** The latest of {@link gitModifiedAt} over several files or directories. */
export function gitModifiedAtAny(root: string, paths: readonly string[]): string | null {
  return paths
    .map((path) => gitModifiedAt(root, path))
    .filter((timestamp): timestamp is string => timestamp !== null)
    .reduce<string | null>(
      (latest, timestamp) =>
        latest === null || Date.parse(timestamp) > Date.parse(latest) ? timestamp : latest,
      null,
    );
}

/** Whether the working tree holds a non-whitespace change git has not seen. */
export function hasUncommittedChange(root: string, path: string): boolean {
  return !onlyWhitespace(git(root, ['diff', '-w', '--numstat', 'HEAD', '--', path]));
}

/** The current time in UTC, the form of every stamp in the dates file. */
export function utcNow(date: Date = new Date()): string {
  return utcTimestamp(date.toISOString());
}
