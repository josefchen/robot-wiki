import { execFileSync } from 'node:child_process';

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
 * The commit time of the latest commit that changed non-whitespace content
 * in `path`, or null when the file has no history yet. Commits are visited
 * in git's own history order with its default simplification, which is what
 * `git log -1 -- <path>` reports before whitespace-only edits are skipped.
 */
export function gitModifiedAt(root: string, path: string): string | null {
  const log = git(root, ['log', '--format=%H%x09%cI', '--', path]);
  for (const line of log.split('\n').filter(Boolean)) {
    const [commit, timestamp] = line.split('\t');
    if (!changesOnlyWhitespace(root, commit, path)) return timestamp;
  }
  return null;
}

/** The commit time of the commit that added `path`, following renames. */
export function gitAddedAt(root: string, path: string): string | null {
  const log = git(root, ['log', '--follow', '--diff-filter=A', '--format=%cI', '--', path]);
  return log.split('\n').filter(Boolean).at(-1) ?? null;
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

/** Local time with its UTC offset, the form `git log --format=%cI` prints. */
export function localIsoTimestamp(date: Date): string {
  const pad = (value: number) => String(Math.abs(value)).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
  );
}
