# Release gate

The gate protects readers, not records of earlier work.

## What runs
`npm run vercel-build` (what Vercel runs) does, in order:
1. Before the export: content validation (schemas, citations, glossary,
   images, author years, and that each home and hub fact's article cites
   its source inline), the vocabulary and dash lint over article source, chart
   description wiring and rules, motion colour tokens, and font glyph
   coverage for the display and card fonts.
2. `next build` writes the static export. Reading times are measured from
   the rendered prose; if they moved, the export is built once more so every
   header shows the new time.
3. After the export: export prune, 404 guard, search indexes (Pagefind and
   the structured index), the vocabulary and dash lint over rendered pages, the
   figure-system check, SEO metadata, Discovery-page prose, internal links,
   and Open Graph card generation.
4. Last: no Callout or Aside box in any article, and at least 30 distinct
   cited sources per article.

`npm test` runs the Vitest unit and component suite; `npm run test:e2e` runs
Playwright on demand.

`npm run refresh` regenerates every committed derived file (motion tokens,
equations, companies, content dates, reading times, Open Graph cards). Run it before committing; the build never fails because a
committed derived file is out of date.

## Keep or retire

Keep a check or test when it fails because a reader would get something wrong:
a page, figure or interaction that breaks, an unresolved citation, an article
under 30 sources, an inaccessible control or missing chart description, banned
words or dashes in prose, a dead link, wrong SEO metadata, a broken search index,
bad data, or broken logic.

Retire it when it fails only because bytes differ from a recorded earlier
state or a bookkeeping record is missing: hash pins, continuity or originals
records, stale screenshots, approval chains, baselines, record-count
equality, capture records, release fingerprints.
