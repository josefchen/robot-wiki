/**
 * lint-staged: the fast slice of the repo gate, run by .husky/pre-commit.
 *
 * The full gate in CONTRIBUTING.md is typecheck, lint, test, validate:content
 * and build. Only the parts that finish in seconds belong in a commit hook,
 * because a hook slow enough to be annoying is a hook that gets bypassed:
 *
 *   - ESLint over the staged files, with --fix so mechanical problems are
 *     repaired and restaged instead of bouncing the commit.
 *   - The whole-project typecheck. It is not scoped to the staged files on
 *     purpose: TypeScript 7's native compiler checks this repo in under two
 *     seconds, so scoping would buy nothing and would miss the breakage that
 *     matters most, a changed signature failing in its importers.
 *   - The content validators when a staged file feeds them: an unregistered
 *     citation id, an unknown glossary term, or an AI-writing marker in prose
 *     fails the build, so it should fail the commit.
 *
 * The Vitest suite (~100s) is too slow for a per-commit hook and runs in
 * .husky/pre-push instead. The production build and the Playwright suite stay
 * in review, per CONTRIBUTING.md.
 *
 * lint-staged appends the staged file list to string commands and runs the
 * result of a function once per commit, which is how the two project-wide
 * gates below stay single runs.
 */

/** Whole-project gates: one run per commit, not one run per staged file. */
const typecheck = () => 'npm run typecheck';
const validateContent = () => 'npm run validate:content';

const lintStagedConfig = {
  // --no-warn-ignored: eslint.config.mjs ignores research/, next-env.d.ts and
  // the build output, and a staged file from there would otherwise surface as
  // a warning that --max-warnings=0 turns into a failed commit.
  '*.{ts,tsx,mts,mjs,cjs,js,jsx}': [
    'eslint --fix --max-warnings=0 --no-warn-ignored',
    typecheck,
  ],
  // The MDX prose and the Zod-validated registries are what
  // scripts/validate-content.ts and scripts/lint-no-slop.ts read.
  '{content/**/*.mdx,data/**/*.ts}': validateContent,
};

export default lintStagedConfig;
