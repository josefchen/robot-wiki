# Robot Wiki

Source for <https://robot-wiki.com>, an open encyclopedia of modern robotics written for machine-learning engineers moving into the field. Articles pair cited long-form prose with interactive figures: a 3D kinematics playground, step-through denoising loops, a filterable market map of robotics companies and a glossary with cited definitions.

The site is fully static. Every page is pre-rendered at build time and all interactivity runs in the browser, with no backend and no database. Vercel Web Analytics records anonymous, aggregate page views; query strings are removed before events are sent.

## Coverage

`npm run validate:content` prints the current counts. At the time of writing: 57 published articles, 1,398 registered citations, 119 glossary terms, 239 registered images and 111 companies.

The articles fall into seven domains:

- **Manipulation & Learned Policies**: behaviour cloning, action chunking, action spaces, diffusion policy, VLA models, the π line and RL fine-tuning.
- **RL, Sim-to-Real & Locomotion**: why RL won locomotion, offline RL, massively parallel simulation, domain randomization and legged and humanoid control.
- **World Models**: a taxonomy of approaches, latent dynamics, generative video, JEPA, generative simulation and evaluation.
- **Data, Hardware & Evaluation**: the robot-learning stack, datasets, hardware and prices, teleoperation rigs and policy evaluation.
- **Classical Foundations**: kinematics, calibration, motion planning, control, state estimation, ROS 2, grasp planning, perception and scene representation.
- **Frontier & Open Problems**: reliability, dexterity, generalization, competing theses, the bear case, and safety and assurance.
- **Adjacent Domains**: autonomous vehicles, drones, surgical robotics and space robotics.

The [playground](https://robot-wiki.com/playground/) loads the SO-101 arm and runs forward kinematics from joint sliders, inverse kinematics from a click-to-reach target with a damped-least-squares solver, and trajectory record and replay with JSON export. The [market map](https://robot-wiki.com/market-map/) filters companies by segment, country, stage and approach, with a source link on every entry.

## Sources and audit

- Every source lives in one registry, `data/citations.ts`. Prose cites it with `<Cite id="..." />`, and the build fails on an id that is not registered. Glossary terms work the same way through `<Term id="..." />` and `data/glossary.ts`.
- Each published article has a section in its domain's audit ledger under [`audit/`](audit/README.md). Each row records the claim, the source checked, the URL fetched, the supporting passage and a verdict: verified, corrected or cut. The content validator fails when a published article or a registered citation has no ledger entry.
- Unknown values are written as "not disclosed" or "n/a", never guessed.
- Three network checks run on demand rather than in the build: `npm run check:links` (citation URLs resolve), `npm run check:citations` (each fetched document matches its registry entry) and `npm run check:crossref-authors` (DOI-bearing citations agree with Crossref on authors, year and title).

## Repository layout

A single Next.js 16 application (App Router, React 19, strict TypeScript, Tailwind CSS 4) with `output: 'export'`.

```
app/          routes: articles, domain pages, playground, market map, search,
              glossary, A-Z index, credits, editorial policy, feed, sitemap
components/   UI, interactive figures, 3D playground, article chrome, navigation
content/      MDX articles, one directory per domain
data/         Zod-validated registries: citations, modules, glossary,
              companies, methods, datasets, hardware, images
lib/          content pipeline, search, IK solver, rehype plugins
scripts/      validation, reading times, search index, link checks
tests/        Vitest unit and component tests, Playwright end-to-end specs
research/     research notes behind the articles
audit/        per-claim audit ledgers
```

References, "See also" lists, backlinks, breadcrumbs, reading times and citation counts are generated at build time. Draft articles are left out of the export, navigation, search and sitemap.

The visual and interaction specification is [`library/design-system.md`](library/design-system.md), with measurable acceptance criteria in [`contract/design-integrity.md`](contract/design-integrity.md). Read both before changing UI, figures, typography, colour or social cards. The public name is `Robot Wiki`, with the descriptor "Citation-first encyclopedia of modern robot learning." There is no separate logo or symbol.

## Setup

Node.js 22 or later and npm.

```sh
git clone https://github.com/josefchen/robot-wiki.git
cd robot-wiki
npm install
npx playwright install chromium   # once, for the end-to-end tests
```

## Running locally

```sh
npm run dev
```

The dev server runs on <http://localhost:3200>. Articles, navigation and interactive figures reload as you edit.

## Testing

```sh
npm run typecheck         # route types, then tsc --noEmit
npm run lint              # ESLint
npm run validate:content  # schema, citation, glossary and audit checks; prints the counts above
npm run test              # Vitest unit and component tests
npm run test:e2e          # Playwright end-to-end tests in headless Chromium
```

Pass a filename substring to run part of the Vitest suite, for example `npm run test -- repo-docs`. The end-to-end runner starts its own dev server on port 3200 and runs serially.

## Building

```sh
npm run build
npx serve out -l 3201   # preview the static export
```

The build runs the content validator first, then `next build` with a reading-time pass, then the search index, internal-link, SEO and design-system checks over the export. The result in `out/` is plain static files, including `sitemap.xml`, `robots.txt` and `feed.xml`.

## Deployment

The `main` branch deploys to Vercel at <https://robot-wiki.com>. Vercel runs `npm run vercel-build`, which performs the same export and post-export checks but not the content validator. Cache headers live in `vercel.json`. Because `out/` is plain files, any static host works.

## Contributing

Corrections with a primary source are the most useful contribution. [CONTRIBUTING.md](CONTRIBUTING.md) covers the content standards and pull request guidelines.

## Licences

- Code: MIT ([LICENSE](LICENSE)).
- Editorial content (articles, glossary definitions, figures): Creative Commons Attribution 4.0 International ([LICENSE-CONTENT](LICENSE-CONTENT)).
- SO-101 arm model: [TheRobotStudio/SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100), Apache-2.0.
