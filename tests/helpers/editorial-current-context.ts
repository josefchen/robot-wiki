import { execFileSync } from 'node:child_process';
import { neutralizeHistory } from '../../lib/neutral-tooling';
import { showAt } from '../unit/helpers/continuation-merge-ledger';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

/** Read a frozen checkpoint, never the mutable current tree, for a test oracle. */
export function committedText(commit: string, path: string): string {
  if (!/^[0-9a-f]{40}$/.test(commit) || path.startsWith('/') || path.includes('..')) {
    throw new Error('Historical fixture must name a commit and a repository-relative path');
  }
  // Historical revisions are rendered with the repository's neutral tooling
  // vocabulary (lib/neutral-tooling.ts) so checkpoints compare against the
  // same identifier spelling the current tree uses. Catalog renders also
  // recompute the digests that pin the rendered text.
  if (path === 'audit/compound-evidence.json' || path === 'audit/local-basis.json') {
    return showAt(commit, path);
  }
  return neutralizeHistory(execFileSync('git', ['show', `${commit}:${path}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }));
}

export function committedJson<T>(commit: string, path: string): T {
  return JSON.parse(committedText(commit, path)) as T;
}
