/**
 * One `prepare` owner so this PR can merge without clobbering
 * chore/file-size-budgets (#3).
 *
 * Git has a single core.hooksPath. #3 sets it to .githooks via
 * scripts/install-hooks.mjs. Husky sets it to .husky. Running husky after
 * #3 lands would disable the file-size guard.
 *
 * When install-hooks.mjs is present, prepare runs only that script and
 * leaves the tracked .husky/ hooks inactive. When it is absent (this PR
 * standalone), prepare runs husky so lint-staged and commit-msg install.
 * A follow-up can compose the two hook directories; this script does not.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const installHooks = join(root, 'scripts/install-hooks.mjs');

if (existsSync(installHooks)) {
  const result = spawnSync(process.execPath, [installHooks], {
    cwd: root,
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}

const husky = join(root, 'node_modules/husky/bin.js');
const result = spawnSync(process.execPath, [husky], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
