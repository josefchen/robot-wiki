import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

/** Read a frozen checkpoint, never the mutable current tree, for a test oracle. */
export function committedText(commit: string, path: string): string {
  if (!/^[0-9a-f]{40}$/.test(commit) || path.startsWith('/') || path.includes('..')) {
    throw new Error('Historical fixture must name a commit and a repository-relative path');
  }
  return execFileSync('git', ['show', `${commit}:${path}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

export function committedJson<T>(commit: string, path: string): T {
  return JSON.parse(committedText(commit, path)) as T;
}
