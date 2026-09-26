import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/**
 * VAL-BUILD-010: the tracked next-env.d.ts imports production
 * `.next/types/...` routes, never `.next/dev/types`.
 *
 * `next dev` (and therefore every Playwright webServer run on port 3200)
 * rewrites the working-tree file to the dev type path. A developer who
 * commits that variant makes every clean `npm run typecheck` and
 * `npm run build` rewrite the file back, dirtying the tree between the two
 * mode directories. The working-tree check in design-system-contract.test
 * catches the edit before it is committed; this check catches the commit
 * itself, because once typegen has restored the working tree the committed
 * dev variant is invisible to a plain file read.
 */
const committedNextEnv = execFileSync('git', ['show', 'HEAD:next-env.d.ts'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

describe('VAL-BUILD-010: committed next-env.d.ts never references .next/dev', () => {
  it('holds the production type imports in the committed blob', () => {
    expect(committedNextEnv).toContain(
      'import "./.next/types/routes.d.ts";',
    );
    expect(committedNextEnv).toContain(
      'import "./.next/types/root-params.d.ts";',
    );
  });

  it('contains no .next/dev/ reference in the committed blob', () => {
    expect(committedNextEnv).not.toContain('.next/dev/');
  });
});
