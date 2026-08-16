# What and why

<!-- One logical change per PR. Say what changes and why it is correct, not what files you touched. -->

Closes #

## Type of change

- [ ] Content: new or edited article, glossary term, or figure
- [ ] Data: a row in one of the `data/` registries
- [ ] Code: component, interactive, or content pipeline
- [ ] Tooling, docs, or build

## Sources

<!--
Required for content and data changes. One line per claim or field that moved, with the URL and the
section, table, or figure it comes from. List anything you could NOT verify: reviewers cut unverifiable
claims rather than softening them.
-->

- [ ] Every new claim cites a source registered in `data/citations.ts`, with identifiers copied from the source itself
- [ ] Values no source publishes are left as "not disclosed" or `null`, never estimated
- [ ] Generated sections (references, See also, backlinks, breadcrumbs, reading time, citation counts) are left to the build

## Gates

All of these must be green; a red `main` breaks the production deployment.

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run validate:content`
- [ ] `npm run build`
- [ ] `npm run test:e2e` (required if a browser can see the change: pages, interactives, metadata, or the search index)

## Interactives and accessibility

<!-- Delete this section if the PR adds no UI. -->

- [ ] Controls are keyboard operable and labelled, with a visible numeric readout and a reset control
- [ ] Honours `prefers-reduced-motion`
- [ ] Matches the existing dark technical theme (no gradients, glassmorphism, or emoji icons)
- [ ] Screenshots or a recording attached for visual changes
