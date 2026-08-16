# Contributing to robot-wiki

Thanks for helping improve the wiki. Contributions that fit this repo: corrections to published articles, new articles or glossary terms, data fixes in the structured datasets, improvements to interactives, and tooling. The wiki is built to be citable, so the content rules below are enforced in review, not treated as suggestions.

## Getting set up

You need Node.js 22+ and npm (the repo uses npm exclusively).

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

## Code structure

The directories are layers and imports only point downwards: `app/` composes
pages, `components/` renders, `lib/` holds the logic, `data/` is a leaf of
Zod-validated registries. Feature folders under `components/` (article,
interactive, market-map, nav, search, three) are independent of each other, so
anything two of them need moves down into `components/ui/` if it is
presentational or `lib/` if it is logic. Nothing under `components/` may reach
`node:fs` or the build-time `lib/` modules that do (an interactive is a client
bundle); a route under `app/` reads at prerender time and passes plain data
down. `npm run lint:architecture` fails on a violation and names the rule; the
rules live in `.dependency-cruiser.mjs` with the reasoning next to each one.
The README's [module boundaries](README.md#module-boundaries) section has the
layer diagram.

## Testing your change

Run the full gate locally before opening a pull request:

```sh
npm run typecheck
npm run lint
npm run lint:architecture
npm run test
npm run validate:content
npm run build
```

Also run `npm run test:e2e` if you touched anything a browser can see (pages, interactives, metadata, the search index). The suite runs serially against a dev server it starts itself and takes several minutes.

## Pull request guidelines

- Branch from `main` and keep the PR to one logical change. A new article, a data fix, and a component refactor belong in separate PRs.
- Use conventional commit prefixes (`feat:`, `fix:`, `chore:`, `docs:`) so history stays scannable.
- Describe what and why. For content changes, list the primary sources you used and explicitly flag anything you could not verify. Reviewers check claims against the cited sources, so an unverifiable claim will be cut rather than softened.
- Expect a real review. Every PR is reviewed before merge. Content PRs are audited against their sources; code PRs are checked for test coverage and accessibility (axe-core runs in e2e on the pages it touches). Push new commits to address review comments; do not force-push a branch under review.
- Every PR must leave the gates green: typecheck, lint, module boundaries, the Vitest suite, content validation, and the production build. A red build on `main` breaks the automatic Vercel deployment, so this is not negotiable.

## Licensing

By contributing code, you agree it will be licensed under the MIT license ([LICENSE](LICENSE)). By contributing editorial content (articles, glossary definitions, figures), you agree it will be licensed under Creative Commons Attribution 4.0 International ([LICENSE-CONTENT](LICENSE-CONTENT)).

## Reporting a problem

Open an issue with the URL of the page and, for factual claims, a primary source that contradicts what the page says. Reports that come with a source get fixed faster.
