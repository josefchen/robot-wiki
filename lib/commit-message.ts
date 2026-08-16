/**
 * Commit-subject validation for the commit-msg hook.
 *
 * CONTRIBUTING.md requires conventional prefixes ("Use conventional commit
 * prefixes (`feat:`, `fix:`, `chore:`, `docs:`) so history stays scannable"),
 * and `main` is 142/144 compliant. The two exceptions ("harden bubble view
 * affordances: hover/focus labels, ...") are exactly the drift this check
 * stops: a subject whose colon reads like a prefix but carries no type, so
 * `git log --oneline` no longer groups by kind of change.
 *
 * The rules are deliberately limited to what the shipped history already
 * satisfies, so the hook never rejects a subject the project considers good:
 * subject length is not capped (the longest on `main` is 121 characters and
 * the detail earns it) and the description may start uppercase, because
 * acronym-first subjects like "feat: SEO metadata fix" are legitimate. The
 * em/en dash ban reuses DASH_PATTERN from the prose lint, so commit subjects
 * hold to the same writing rule as the articles.
 *
 * Pure decision logic lives here for unit testing; the hook wrapper is
 * scripts/check-commit-msg.ts.
 */
import { DASH_PATTERN } from './no-slop.ts';

/**
 * Types allowed in a commit subject. CONTRIBUTING.md names feat/fix/chore/
 * docs; the rest are the Conventional Commits standard set, and `test:` and
 * `style:` already carry real history on `main`.
 */
export const COMMIT_TYPES = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
] as const;

/** `<type>(<optional scope>)<optional !>: <description>` */
const SUBJECT_PATTERN = new RegExp(
  `^(${COMMIT_TYPES.join('|')})(\\([a-z0-9][a-z0-9./-]*\\))?!?: (.+)$`,
);

/**
 * Subjects git generates or reserves for itself. Merge and revert messages
 * come from git verbatim, and the autosquash markers are consumed by
 * `git rebase --autosquash`, so none of them are the author's to shape.
 */
const GENERATED_SUBJECT = /^(Merge\b|Revert\b|fixup!|squash!|amend!)/;

/**
 * The subject line of a raw commit-message file: the first line that is
 * neither blank nor part of git's `#` comment block. Reading past the blank
 * lines matters because `git commit` with an empty editor buffer hands the
 * hook a file that starts with a newline and then the instructions.
 */
export function commitSubject(message: string): string {
  for (const line of message.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    return trimmed;
  }
  return '';
}

/**
 * Every problem with `message`, as reviewer-readable sentences. An empty
 * array means the subject is acceptable; the hook exits non-zero otherwise.
 */
export function validateCommitMessage(message: string): string[] {
  const subject = commitSubject(message);
  if (subject === '') {
    return ['the commit message is empty'];
  }
  if (GENERATED_SUBJECT.test(subject)) {
    return [];
  }

  const problems: string[] = [];
  const match = SUBJECT_PATTERN.exec(subject);
  if (match === null) {
    problems.push(
      `the subject must open with a conventional type (${COMMIT_TYPES.join(', ')}), ` +
        'optionally scoped, then ": " and a description, as in ' +
        `"fix(market-map): keep the focus ring on the plotted mark". Got: "${subject}"`,
    );
  } else if (match[3].endsWith('.')) {
    // commitSubject() already trimmed, so the captured description cannot be
    // trailing whitespace and a final "." is a real sentence period.
    problems.push('the subject must not end with a period');
  }
  if (DASH_PATTERN.test(subject)) {
    problems.push(
      'the subject must not use em or en dashes, the same prose rule the ' +
        'articles are linted against',
    );
  }
  return problems;
}
