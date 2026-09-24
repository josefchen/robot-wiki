# Robot Wiki

An open-source, encyclopedic guide to modern robotics, written for machine-learning engineers moving into the field. The 57 published articles pair cited long-form prose with interactive explanations: a 3D kinematics playground with real forward and inverse kinematics, step-through denoising loops, a filterable market map of 111 robotics companies, and a 119-term citation-backed glossary.

The site is fully static. Every page is pre-rendered at build time and all interactivity runs in the browser: no backend and no database. Production uses Vercel Web Analytics for anonymous, aggregate page measurement; query strings are removed before events are sent. It is live at <https://robot-wiki.com>.

Every live corpus count is reproducible: `npm run validate:content` currently prints 57 published articles, 441 citations, 119 glossary terms, 118 registered images, and 111 companies. [`audit/README.md`](audit/README.md) preserves the earlier 42-article, 307-citation audit snapshot rather than rewriting historical ledger totals as the corpus grows.

These corpus counts are not a release verdict. The merged local content gate is red: ten published articles have no audit section, and four citation checks remain unresolved (Technology.org and three ROS 2 entries). All 994 existing claim rows pass the structural evidence check, which does not certify source truth or cover those ten missing article audits. `npm run build` stops at `validate:content` while this gate is red. The production command `npm run vercel-build` keeps its existing content-audit skip so verified progress ships, and it still runs every other release gate.

## Coverage

The wiki is organized into seven domains:

- **Manipulation & Learned Policies**: a robot-learning roadmap, behavior cloning, action chunking, action spaces, diffusion policy, VLA and foundation models, the π line, and RL fine-tuning.
- **RL, Sim-to-Real & Locomotion**: why RL won locomotion, offline RL, massively parallel simulation, domain randomization, legged and humanoid control, and reward design versus MPC.
- **World Models**: the six-paradigm taxonomy, model-based robot learning, evaluation, latent dynamics, generative video, JEPA, generative simulation, and simulator comparisons.
- **Data, Hardware & Evaluation**: the end-to-end robot-learning stack, data bottlenecks, major datasets, hardware taxonomy, teleoperation rigs, and evaluation.
- **Classical Foundations**: kinematics, calibration, motion planning, control, state estimation, ROS 2 for ML engineers, grasp planning, perception, and scene representation.
- **Frontier & Open Problems**: the reliability gap, dexterity, generalization, competing theses, the bear case, safety, and assurance.
- **Adjacent Domains**: autonomous vehicles, drones, surgical robotics, space robotics.

The 3D playground (<https://robot-wiki.com/playground/>) loads the SO-101 arm (Apache-2.0) and runs forward kinematics from joint sliders, inverse kinematics from a click-to-reach target using a damped-least-squares solver, and trajectory record/replay with JSON export. The market map (<https://robot-wiki.com/market-map/>) filters 111 companies by segment, country, stage, and approach, with source links and funding data on every entry.

## Architecture

A single Next.js 16 application (App Router, React 19, TypeScript strict, Tailwind CSS 4) configured with `output: 'export'`. The production build emits plain static files into `out/`, which can be served by any static host.

```
app/          App Router routes: articles, domain landings, playground, market map,
              search, glossary, A-Z index, credits, editorial policy, privacy,
              RSS feed, sitemap, robots.txt
components/   UI primitives, 2D interactive visualizations, 3D playground,
              market-map views, article chrome, navigation
content/      MDX articles, one directory per domain
data/         Structured data validated with Zod: citations, module registry,
              glossary, companies, methods, datasets, hardware, teleop rigs, images
lib/          Content pipeline, search, IK solver, rehype plugins
library/      Canonical Robot Wiki visual and interaction design system
contract/     Measurable design-integrity acceptance criteria
public/       Static assets, including the SO-101 robot model
scripts/      Build-time node scripts: content validation, reading times,
              search index build, link liveness checker
tests/        Vitest unit and component tests, Playwright e2e specs, fixtures
research/     Deep-research reports behind the content (read-only transparency trail)
audit/        Per-claim content-integrity audit ledgers: every published
              article checked against its cited primary sources, with the
              method, conventions, and totals in audit/README.md
```

### Design system

The canonical visual and interaction specification is
[`library/design-system.md`](library/design-system.md), with countable release
criteria in [`contract/design-integrity.md`](contract/design-integrity.md).
Contributors and agents must read both before changing UI, visualization,
navigation, typography, colour, imagery, or social cards. The approved public
identity is `Robot Wiki`, paired with the descriptor “Citation-first
encyclopedia of modern robot learning.” There is no separate logo or symbol.

### Content pipeline

- Articles are MDX files with Zod-validated frontmatter (`title`, `description`, `domain`, `slug`, `order`, `status`, optional verified `datePublished`, `lastReviewed`, `citations`, `seeAlso`).
- Citations live in a central registry (`data/citations.ts`). Prose cites sources with `<Cite id="..." />`, and the build fails if an id is not registered.
- Glossary terms carry cited definitions. Prose wraps jargon in `<Term id="..." />` for a hover-and-focus definition; an unknown term id fails the build.
- References, "See also", "Linked from" backlinks, breadcrumbs, reading time, and citation counts are generated at build time; authors never hand-write them.
- Draft modules are excluded from the export, the sidebar, the search indexes, and the sitemap.
- Search uses two indexes built at build time: Pagefind over prose, MiniSearch over structured data.
- `npm run check:links` sweeps every citation URL for liveness, and `npm run check:citations` verifies each fetched document's identity against the registry entry. Neither is part of the build (200+ network calls); run them on demand. The evidence trail for every audited claim, including how to read the ledgers and re-run the checkers, is in [`audit/README.md`](audit/README.md).
- `npm run check:crossref-authors` queries Crossref for every DOI-bearing citation and compares the registry's author names, year and title against the record, flagging family-name mismatches and given names that expand an initial the source publishes only as an initial (the registry's author-field policy, in the header of `data/citations.ts`, is to render what the source publishes). On demand, not in the build; run it whenever a citation is added or an author field is edited. Byline-backed full names are documented with evidence in `data/crossref-author-exceptions.ts`.

## Setup

Prerequisites: Node.js 22+ and npm (the repo uses npm exclusively; there is no pnpm or bun config).

```sh
git clone https://github.com/josefchen/robot-wiki.git
cd robot-wiki
npm install
npx playwright install chromium   # once, for the e2e suite
```

## Running locally

```sh
npm run dev
```

Starts the Next.js dev server on <http://localhost:3200> (the port is pinned in the script). Articles, the sidebar, and all interactives hot-reload as you edit.

To preview the production artifact instead of the dev server:

```sh
npm run build
npx serve out -l 3201
```

## Testing

```sh
npm run test          # unit + component tests (Vitest)
npm run test:e2e      # end-to-end tests (Playwright, headless Chromium)
npm run typecheck     # next typegen + tsc --noEmit (TypeScript strict)
npm run lint          # ESLint
npm run validate:content  # content-pipeline validation, also runs before every build;
                          # prints the live corpus counts (published modules, citations,
                          # glossary terms, companies) quoted in this README
```

Scope a Vitest run with a filename substring, for example `npm run test -- repo-docs`. The e2e runner starts its own dev server on port 3200 and executes serially (the 3D playground renders through SwiftShader in headless Chromium); a full suite takes several minutes.

### Shared glossary viewport repair (2026-09-09)

The shared `Term` placement repair has 34 passing focused unit/component cases
and 10 passing scoped browser cases (`term-viewport` and `rma-kl-reader`) at
375×812 and 1440×900. These cover centered PPO placement, visible sticky-header
clearance, viewport edges, scroll/resize updates, and complete oversized
pointer/keyboard-readable definitions. Normal lint (including prelint), route
type generation, and nonincremental TypeScript pass. The separate 111 historical
cases are input-qualified reuse, not fresh executions.

This is a zero-credit component checkpoint: all 994 original audit records
(413 complete / 581 incomplete across 47 articles), 319 plans, 397 existing
approvals, and 47 inherited baseline failures are unchanged. Three current
article comparisons still fail four locked reference anchors. Full production
export/reading-time, the 48-card OG/X matrix, the remaining shared smoke failure,
and independent release acceptance remain open. Do not treat these scoped
passes as a green content gate or publication authorization.

The subsequent bounded consumer verification reconciles 46 consuming routes,
224 unique article/term bindings, and 227 raw rendered occurrences across all
47 published articles. All 908 occurrence × viewport × hover/keyboard-focus
identities pass at 375×812 and 1440×900, including canonical definitions,
glossary fragments, ARIA identity, viewport/header bounds, and scrollable
definition endpoints. Seven new inventory tests pass. The 94 route/viewport
identities include two checks of the non-consuming article; the three targeted
keyboard reruns overlap that population and are not additional coverage.
Earlier trailing-slash and conditional-tooltip-tab-stop fixture failures remain
in the retained history.

The four non-consuming shared smoke routes produced seven passes and one
failure: on `/playground/` at 375×812, after keyboard skip-to-content and clicking
the navigation trigger, the close-menu control did not appear. That failure
remains unresolved; no product implementation was changed to hide it. Axe was
not reached in that failed case, and incompletes from the other cases are not
full accessibility acceptance. These are offline development-runtime checks,
not a production export or a full-reference comparison of every trigger.

## Building

```sh
npm run build
```

Runs the complete production build: content validation first (`prebuild`), then `next build` with a reading-time measurement pass, then the search-index build (`postbuild`). When the content gate passes, the result is a fully static site in `out/`, including `sitemap.xml` and `robots.txt`. The Vercel-specific build command runs the same sequence without that content validation while the content audit is red; every other gate is identical.

## Deployment

The `main` branch is connected to a Vercel project, so every push to `main` produces a production deployment at <https://robot-wiki.com>. Browser cache for `/images/*`, `/og/*`, hashed `/_next/static/*` assets, and fonts is set in `vercel.json` (`public, max-age=31536000, immutable`). HTML stays must-revalidate so a deploy is visible immediately.

```sh
git push origin main
```

Because `out/` is plain static files, the site can also be hosted on any static file server or CDN.

## Contributing

Contributions are welcome, especially corrections with primary sources. See [CONTRIBUTING.md](CONTRIBUTING.md) for the content standards (every non-obvious claim needs a citation; unknown values are never invented) and the pull request guidelines.

## License

- Source code: MIT (see [LICENSE](LICENSE)).
- Editorial content (articles, glossary definitions, figures): Creative Commons Attribution 4.0 International (see [LICENSE-CONTENT](LICENSE-CONTENT)).
- The SO-101 arm model is from [TheRobotStudio/SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100) under Apache-2.0.
