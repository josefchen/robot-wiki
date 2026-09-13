import { existsSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';

// Independent, explicit fixture values: do not call the renderer's citationMeta.
// Full registered names belong in References (VAL-WIKI-002/029), not this short line.
export const KEYPOINT_SHORT_META: Readonly<Record<string, string>> = {
  'moka-2024': 'Fangchen Liu, Kuan Fang, Pieter Abbeel et al., 2024',
  'rekep-2024': 'Wenlong Huang, Chen Wang, Yunzhu Li et al., 2024',
  'robopoint-2024': 'Wentao Yuan, Jiafei Duan, Valts Blukis et al., 2024',
};

export function assertShortMetadata(id: string, actual: string): void {
  const expected = KEYPOINT_SHORT_META[id];
  if (!expected || actual !== expected) throw new Error(`Wrong shortened metadata for ${id}: ${JSON.stringify(actual)}`);
}

export function assertFullReferenceAuthors(actual: string, authors: readonly string[]): void {
  if (!authors.length || actual !== authors.join(', ')) throw new Error('Missing, extra, or reordered References authors');
}

/** Fail closed before any capture/report write, including symlinked output parents. */
export function ownedEvidencePath(root: string | undefined, target: string): string {
  if (!root || !isAbsolute(root) || resolve(root) !== root || realpathSync(root) !== root) throw new Error('An explicit canonical absolute evidence root is required');
  const path = resolve(target);
  if (!path.startsWith(root + sep) || !realpathSync(dirname(path)).startsWith(root + sep) ||
      (existsSync(path) && !realpathSync(path).startsWith(root + sep))) throw new Error('Evidence output escapes its owned root');
  return path;
}
