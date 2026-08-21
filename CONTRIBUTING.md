# Contributing to robot-wiki

Thanks for helping improve the wiki. Contributions that fit this repo: corrections to published articles, new articles or glossary terms, data fixes in the structured datasets, improvements to interactives, and tooling. The wiki is built to be citable, so the content rules below are enforced in review, not treated as suggestions.

## Getting set up

You need Node.js 22.22.1 or newer and npm (the repo uses npm exclusively). `lint-staged@17` refuses to start on an older 22.x, so the pre-commit hook would fail on a floor of "22+".

```sh
git clone https://github.com/josefchen/robot-wiki.git
cd robot-wiki
npm install
npm run dev
```

The dev server runs at <http://localhost:3200>. See the [README](README.md) for the full command list and architecture overview.

## Content standards

These rules exist because the wiki's value is that every claim can be traced to a source that actually says it.

- **Cite every non-obvious claim.** Add the source to the citation registry (`data/citations.ts`) and cite it in prose with `<Cite id="..." />`. Acceptable primary sources: papers (arXiv, DOI links), official documentation, and lab or company blogs. Verify identifiers against the source itself; never rely on memory for an arXiv id or DOI. The build fails on a citation id that is not registered.
- **Never invent data.** If a value is unknown, write "not disclosed" when the owner of the number has chosen not to publish it, or "n/a" when the value genuinely does not apply. A plausible-sounding guess is a defect, not a placeholder. Every market-map entry and dataset row carries at least one source link.
- **Write plainly.** No marketing language, no hype. Where experts disagree, present both sides and name the proponents. Avoid AI-writing patterns: inflated symbolism, vague attributions ("experts say"), padding in threes, and em-dash-heavy prose.
- **Do not hand-write generated sections.** References, "See also", "Linked from" backlinks, breadcrumbs, reading time, and citation counts are derived at build time. Your job as an author is the frontmatter (`seeAlso` with 2 to 4 curated ids of genuinely related published articles) and the prose.
- **Glossary terms carry cited definitions.** Wrap jargon in `<Term id="..." />` on first use and add missing terms to `data/glossary.ts` with a source. An unknown term id fails the build.
- **Interactives are instruments, not decorations.** Keyboard-accessible controls with ARIA labels, a visible numeric readout, a reset control, and respect for `prefers-reduced-motion`. Follow the existing dark technical theme; no gradients, glassmorphism, or emoji icons.

## Testing your change

Run the full gate locally before opening a pull request:

```sh
npm run typecheck
npm run lint
npm run test
npm run validate:content
npm run build
```

Also run `npm run test:e2e` if you touched anything a browser can see (pages, interactives, metadata, the search index). The suite runs serially against a dev server it starts itself and takes several minutes.

`npm install` runs `scripts/prepare-hooks.mjs`. On this branch that installs the Husky hooks in `.husky/` (lint-staged, commit-msg, pre-push). If `scripts/install-hooks.mjs` is also present (PR #3, `chore/file-size-budgets`, which points `core.hooksPath` at `.githooks`), prepare runs only that installer and leaves `.husky/` tracked but inactive, so merging this PR does not clobber #3. Git has one hooksPath; a follow-up can compose the two directories.

The Husky hooks run the cheap parts of the gate so you find out at commit time rather than in review:

- **`pre-commit`** runs `lint-staged`: ESLint with `--fix` over the files you staged, `npm run typecheck` for the whole project, and `npm run validate:content` when the commit touches MDX prose or a `data/` registry. A few seconds. ESLint's fixes are restaged automatically, so a formatting-only failure repairs itself.
- **`commit-msg`** checks the subject against the conventional-commit rules below.
- **`pre-push`** runs `npm run test`. Roughly two minutes, and it is the difference between a red `main` and a rejected push.

The hooks are a safety net, not the gate: the build and the e2e suite are too slow to run per commit, so run them yourself before you open the PR. If a hook is wrong or in the way, commit with `HUSKY=0 git commit` and say so in the PR rather than leaving a broken hook in place for everyone else.

## Pull request guidelines

- Branch from `main` and keep the PR to one logical change. A new article, a data fix, and a component refactor belong in separate PRs.
- Use conventional commit prefixes (`feat:`, `fix:`, `chore:`, `docs:`, and the rest of the standard set) so history stays scannable. The `commit-msg` hook enforces `<type>(<optional scope>): <description>`, rejects a subject that ends in a period, and applies the same no-em-dash rule the prose is linted against. Subject length is not capped.
- Describe what and why. For content changes, list the primary sources you used and explicitly flag anything you could not verify. Reviewers check claims against the cited sources, so an unverifiable claim will be cut rather than softened.
- Expect a real review. Every PR is reviewed before merge. Content PRs are audited against their sources; code PRs are checked for test coverage and accessibility (axe-core runs in e2e on the pages it touches). Push new commits to address review comments; do not force-push a branch under review.
- Every PR must leave the gates green: typecheck, lint, the Vitest suite, content validation, and the production build. A red build on `main` breaks the automatic Vercel deployment, so this is not negotiable.

## Licensing

By contributing code, you agree it will be licensed under the MIT license ([LICENSE](LICENSE)). By contributing editorial content (articles, glossary definitions, figures), you agree it will be licensed under Creative Commons Attribution 4.0 International ([LICENSE-CONTENT](LICENSE-CONTENT)).

## Reporting a problem

Open an issue with the URL of the page and, for factual claims, a primary source that contradicts what the page says. Reports that come with a source get fixed faster.
