/**
 * CLI wrapper for the commit-msg hook (.husky/commit-msg).
 *
 * Git invokes the hook with the path of the pending commit-message file as
 * the first argument. This reads that file, runs the pure checks in
 * lib/commit-message.ts, and exits non-zero with every problem listed so the
 * commit is rejected while the message is still cheap to fix.
 */
import { readFileSync } from 'node:fs';
import { validateCommitMessage } from '../lib/commit-message.ts';

const messagePath = process.argv[2];
if (messagePath === undefined) {
  console.error(
    'check-commit-msg: expected the commit-message file path as the first argument',
  );
  process.exit(2);
}

const problems = validateCommitMessage(readFileSync(messagePath, 'utf8'));
if (problems.length > 0) {
  console.error('commit-msg: rejected this commit message.');
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  console.error(
    '\nSee "Pull request guidelines" in CONTRIBUTING.md. Reword with ' +
      '`git commit` again (the message you wrote is preserved in ' +
      '.git/COMMIT_EDITMSG).',
  );
  process.exit(1);
}
