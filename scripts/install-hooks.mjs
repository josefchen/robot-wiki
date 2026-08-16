/**
 * Point git at the repo's tracked hooks (.githooks) after `npm install`.
 *
 * Hooks in .git/hooks are per-clone and untracked, so a check that lives
 * there is a check every new contributor silently lacks. Setting
 * core.hooksPath to a tracked directory makes the pre-commit file-size guard
 * part of the checkout instead of part of one machine's setup.
 *
 * Idempotent, and a no-op outside a git work tree (npm tarball, Vercel
 * build) or in CI, where the same checks run as their own steps. Never
 * overwrites a hooksPath a contributor has set to something else.
 */
import { execFileSync } from 'node:child_process';

const HOOKS_PATH = '.githooks';

const git = (args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

if (process.env.CI) process.exit(0);

let current;
try {
  if (git(['rev-parse', '--is-inside-work-tree']) !== 'true') process.exit(0);
  try {
    current = git(['config', '--local', '--get', 'core.hooksPath']);
  } catch {
    current = '';
  }
} catch {
  // No git, or not a repository: nothing to configure.
  process.exit(0);
}

if (current === HOOKS_PATH) process.exit(0);
if (current !== '') {
  console.log(`install-hooks: core.hooksPath is already set to ${current}, leaving it alone`);
  process.exit(0);
}

git(['config', '--local', 'core.hooksPath', HOOKS_PATH]);
console.log(`install-hooks: core.hooksPath set to ${HOOKS_PATH} (pre-commit file-size guard)`);
