# Checks

Every check here fails when a reader would get something wrong.

## The build

`npm run vercel-build` is what the deploy runs. In order:

1. Before the export (`prebuild`): content validation (schemas, citations,
   glossary, images, author years, and that each home and hub fact's article
   cites its source inline), the prose lint over article source, chart
   descriptions, motion color tokens, and glyph coverage of the card fonts.
2. `next build` writes the static export. Reading times are measured from the
   rendered prose; if they moved, the export is built once more.
3. After the export (`postbuild`): export cleanup, the 404 guard, the search
   indexes, the prose lint over rendered pages, the figure-system check, SEO
   metadata, Discovery-page prose budgets, internal links and Open Graph card
   generation.
4. Last: no callout or aside box in any article, and at least 30 distinct
   sources per article.

## Tests

- `npm test` runs the unit and component tests.
- `npm run test:e2e` runs the browser tests, including the axe sweep. It
  starts its own dev server on port 3200.
- On every push, a GitHub workflow steps each 3D explainer at 1280 and 390 px
  and fails when labels overlap or leave the stage.

## On demand

These need the network, so the build does not run them:

- `npm run check:links`: every citation URL resolves.
- `npm run check:citations`: each fetched page matches its registry entry.
- `npm run check:crossref-authors`: DOI and arXiv authors, year and title agree.
- `npm run check:dataset-sources`: every market-map source URL resolves.

## Generated files

`npm run refresh` regenerates the committed derived files (motion tokens,
equations, companies, content dates, reading times, Open Graph cards) and
builds. Run it before committing.
