# robot-wiki

An open-source, encyclopedic guide to modern robotics, written for machine-learning engineers moving into the field. Articles pair cited long-form prose with interactive explanations: a 3D kinematics playground with real forward and inverse kinematics, step-through denoising loops, a filterable market map of 112 robotics companies, and a citation-backed glossary.

The site is fully static. Every page is pre-rendered at build time and all interactivity runs in the browser: no backend, no database, no tracking. It is live at <https://robot-wiki.com>.

## Coverage

The wiki is organized into seven domains:

- **Manipulation & Learned Policies**: behavior cloning, action chunking, diffusion policy, VLA models, the π line, RL fine-tuning, execution-time strategies.
- **RL, Sim-to-Real & Locomotion**: why RL won locomotion, massively parallel simulation, domain randomization, legged and humanoid control, reward design versus MPC.
- **World Models**: the six-paradigm taxonomy, latent-dynamics models, generative video models, JEPA, generative simulation.
- **Data, Hardware & Evaluation**: the data bottleneck, major datasets, hardware taxonomy, teleoperation rigs, the evaluation crisis.
- **Classical Foundations**: kinematics, motion planning, control, state estimation, grasp planning.
- **Frontier & Open Problems**: the reliability gap, dexterity, generalization, competing theses, the bear case.
- **Adjacent Domains**: autonomous vehicles, drones, surgical robotics, space robotics.

The 3D playground (<https://robot-wiki.com/playground/>) loads the SO-101 arm (Apache-2.0) and runs forward kinematics from joint sliders, inverse kinematics from a click-to-reach target using a damped-least-squares solver, and trajectory record/replay with JSON export. The market map (<https://robot-wiki.com/market-map/>) filters 112 companies by segment, country, stage, and approach, with source links and funding data on every entry.

## Architecture

A single Next.js 16 application (App Router, React 19, TypeScript strict, Tailwind CSS 4) configured with `output: 'export'`. The production build emits plain static files into `out/`, which can be served by any static host.

```
app/          App Router routes: articles, domain landings, playground, market map,
              search, glossary, A-Z index, credits, sitemap, robots.txt
components/   UI primitives, 2D interactive visualizations, 3D playground,
              market-map views, article chrome, navigation
content/      MDX articles, one directory per domain
data/         Structured data validated with Zod: citations, module registry,
              glossary, companies, methods, datasets, hardware, teleop rigs, images
lib/          Content pipeline, search, IK solver, rehype plugins
public/       Static assets, including the SO-101 robot model
scripts/      Build-time node scripts: content validation, reading times,
              search index build, link liveness checker
tests/        Vitest unit and component tests, Playwright e2e specs, fixtures
research/     Deep-research reports behind the content (read-only transparency trail)
```

### Content pipeline

- Articles are MDX files with Zod-validated frontmatter (`title`, `summary`, `domain`, `slug`, `order`, `status`, `lastReviewed`, `citations`, `seeAlso`).
- Citations live in a central registry (`data/citations.ts`). Prose cites sources with `<Cite id="..." />`, and the build fails if an id is not registered.
- Glossary terms carry cited definitions. Prose wraps jargon in `<Term id="..." />` for a hover-and-focus definition; an unknown term id fails the build.
- References, "See also", "Linked from" backlinks, breadcrumbs, reading time, and citation counts are generated at build time; authors never hand-write them.
- Draft modules are excluded from the export, the sidebar, the search indexes, and the sitemap.
- Search uses two indexes built at build time: Pagefind over prose, MiniSearch over structured data.
- `npm run check:links` sweeps every citation URL for liveness. It is not part of the build (200+ network calls); run it on demand.

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
npm run validate:content  # content-pipeline validation, also runs before every build
```

Scope a Vitest run with a filename substring, for example `npm run test -- repo-docs`. The e2e runner starts its own dev server on port 3200 and executes serially (the 3D playground renders through SwiftShader in headless Chromium); a full suite takes several minutes.

## Building

```sh
npm run build
```

Runs the complete production build: content validation first (`prebuild`), then `next build` with a reading-time measurement pass, then the search-index build (`postbuild`). The result is a fully static site in `out/`, including `sitemap.xml` and `robots.txt`.

## Deployment

The `main` branch is connected to a Vercel project, so every push to `main` produces a production deployment at <https://robot-wiki.com>:

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
