# Contributing

Every claim traces to a primary source that says it: a paper, official
documentation, a dataset card or a first-party report. An unpublished value is
"not disclosed", one that does not apply is "n/a". Never guess.

## Report or fix an error

Open a [content correction](https://github.com/josefchen/robot-wiki/issues/new?template=content-correction.yml)
with the page URL and a primary source that shows the right value. To fix it
yourself, edit the article in `content/<domain>/<slug>.mdx` and open a pull
request that names the source.

## Add a source

Add an entry to `data/citations.ts` (or the file for that domain in
`data/citation-additions/`) with an id, title, authors, year, venue and URL
checked against the source itself. Cite it in prose with `<Cite id="..." />`.
An unknown id fails the build.

## Add or edit an article

Articles are MDX in `content/<domain>/`, listed in `data/modules.ts`. Write
plainly, in American English, with no hype and no dashes as punctuation. Wrap
jargon in `<Term id="..." />` and give new terms a cited definition in
`data/glossary.ts`. Each article cites at least 30 distinct sources.
References, backlinks, reading time and "See also" are generated; set only
`seeAlso` in the front matter.

## Add a figure

Figures live in `components/interactive/` and follow [docs/design.md](docs/design.md).
Give each one a lazy entry in `components/mdx/lazy-mounts.tsx`, a text
description in `lib/chart-descriptions.ts` and a test in `tests/component/`.

## Checks

Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run validate:content`
before a pull request. [docs/release-gate.md](docs/release-gate.md) lists the rest.
Code is contributed under MIT, content under CC BY 4.0.
