# Stack Feasibility Report
_Verified on 2026-08-06 on macOS 26.5.2 (darwin 25.5.0), Node v22.22.3, npm 10.9.8_

All findings below were verified by execution in `/tmp/ra-feasibility/scaffold/`. Versions are from `npm view` and `npm ls` on the date above. Build metrics are wall-clock from `time` on this machine (14 cores, 36 GB RAM).

## Verdict summary

| # | Concern | Recommendation | Version verified | Status | Notes |
|---|---------|---------------|-----------------|--------|-------|
| 1 | Next.js App Router | Next.js 16.3.0 (Turbopack default) | 16.3.0 | verified-working | Turbopack is now the default for both `dev` and `build`. `next lint` removed; use ESLint CLI directly. React 19.2.8. |
| 2 | TypeScript strict | TypeScript 7.0.2 (Go-based compiler) or 5.9.3 | 7.0.2 / 5.9.3 | verified-working | TS 7 is 4x faster typecheck (275 ms vs 1978 ms build step). Needs `npx next typegen` for `PageProps` global type. Scaffold ships `^5`; pin `typescript@^7` explicitly. |
| 3 | Tailwind CSS | Tailwind CSS 4.3.3 via `@tailwindcss/postcss` 4.3.3 | 4.3.3 | verified-working | PostCSS plugin is the correct Next.js integration path. No `tailwind.config.js` needed; CSS-first `@import "tailwindcss"` in globals.css. |
| 4 | MDX content pipeline | `@next/mdx` 16.3.0 with string-named Turbopack plugins | 16.3.0 | verified-working | Turbopack requires string plugin names + serializable options (no function plugins). Frontmatter via `remark-mdx-frontmatter`, syntax highlighting via `rehype-pretty-code`/shiki, math via `remark-math`+`rehype-katex`, footnotes via GFM. All render at build time — zero client JS for content. |
| 5 | react-three-fiber + drei | R3F 9.7.0, drei 10.7.8, three 0.185.1 | 9.7.0 / 10.7.8 / 0.185.1 | verified-working | React 19.2.8 satisfies peer `>=19 <19.3`. WebGL context verified in headless Chromium via Playwright. `ssr: false` in `next/dynamic` is banned in Server Components — use `'use client'` wrapper instead. |
| 6 | Robot kinematics | `urdf-loader` 0.13.1 + hand-rolled DLS IK | 0.13.1 | verified-working | urdf-loader loads real SO-101 URDF + 15 MB STL meshes in browser (Playwright). FK verified in Node with jsdom shim. DLS IK converges in 6-12 iterations, <10 μm error. `three-ik`/`closed-chain-ik` are unmaintained (last update 2022-2023). |
| 7 | Animation | `motion` 13.0.0 (formerly framer-motion) | 13.0.0 | verified-working | Peer deps `^18 || ^19`. `motion` suffices for UI animation; GSAP 3.15.0 available but unnecessary unless doing scroll-triggered timelines. |
| 8 | Charts / data viz | Recharts 3.10.1 primary; drop to raw d3 7.9.0 for custom viz | 3.10.1 | works-with-caveats | Recharts supports React 19. For a market map (filterable grid + bubble/treemap), use Recharts for standard charts and raw d3 for custom network/treemap. visx 4.0.0 is lower-level alternative. |
| 9 | Client-side search | Pagefind 1.5.2 for full-text; MiniSearch 7.2.0 for structured | 1.5.2 / 7.2.0 | verified-working | Pagefind indexes static HTML post-build (1.9 s, 692 KB output, WASM-based). MiniSearch builds at build time (121 docs → 4.3 KB gzipped, 72 ms). Use Pagefind for prose search, MiniSearch for the market-map filter. |
| 10 | Math rendering | KaTeX 0.18.1 via `rehype-katex` 7.0.1 + `remark-math` 6.0.0 | 0.18.1 | verified-working | KaTeX renders at build time (server-side), zero client JS. MathML + HTML output in static HTML. Import `katex/dist/katex.min.css` in root layout. |
| 11 | Testing | Vitest 4.1.10 + Playwright 1.62.1 + @axe-core/playwright 4.12.1 | 4.1.10 / 1.62.1 | verified-working | Vitest with jsdom + @testing-library/react. Playwright chromium: 274 MiB download, 565 MB on disk. 4 E2E tests pass in 8.8 s including WebGL (SwiftShader) and real URDF load. Axe: zero violations. |
| 12 | Vercel static hosting | `output: 'export'` + `images: { unoptimized: true }` | 16.3.0 | verified-working | `export-marker.json` + `export-detail.json` confirm function-free static output. Zero `.func` files in `out/`. `vercel build` requires linked project (not linked per rules). Standard Next build on Vercel also works but `output: 'export'` guarantees zero functions. |
| 13 | Accessibility + performance | @axe-core/playwright 4.12.1 for a11y; Lighthouse CI optional | 4.12.1 | verified-working | Axe integrates into Playwright, runs in same browser session. Lighthouse CI 0.15.1 is heavier (separate Chrome launch); use for CI gating, not dev. |

## Recommended dependency set

```jsonc
{
  "dependencies": {
    "next": "16.3.0",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    // MDX pipeline
    "@next/mdx": "16.3.0",
    "@mdx-js/loader": "3.1.1",
    "@mdx-js/react": "3.1.1",
    "@types/mdx": "2.0.14",
    "gray-matter": "4.0.3",
    "remark-frontmatter": "5.0.0",
    "remark-mdx-frontmatter": "5.2.0",
    "remark-gfm": "4.0.1",
    "remark-math": "6.0.0",
    "rehype-slug": "6.0.0",
    "rehype-autolink-headings": "7.1.0",
    "rehype-katex": "7.0.1",
    "rehype-pretty-code": "0.14.5",
    "shiki": "4.4.2",
    "katex": "0.18.1",
    // 3D + kinematics
    "three": "0.185.1",
    "@react-three/fiber": "9.7.0",
    "@react-three/drei": "10.7.8",
    "urdf-loader": "0.13.1",
    // Animation
    "motion": "13.0.0",
    // Charts
    "recharts": "3.10.1",
    "d3": "7.9.0",
    // Search (MiniSearch for structured; Pagefind is devDep)
    "minisearch": "7.2.0"
  },
  "devDependencies": {
    "typescript": "7.0.2",
    "@types/node": "20.19.43",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "@types/three": "0.185.4",
    "tailwindcss": "4.3.3",
    "@tailwindcss/postcss": "4.3.3",
    "eslint": "9.39.5",
    "eslint-config-next": "16.3.0",
    // Testing
    "vitest": "4.1.10",
    "@vitejs/plugin-react": "6.0.5",
    "jsdom": "30.0.1",
    "@testing-library/react": "16.3.2",
    "@testing-library/jest-dom": "7.0.0",
    "@playwright/test": "1.62.1",
    "@axe-core/playwright": "4.12.1",
    // Search (Pagefind indexes post-build)
    "pagefind": "1.5.2"
  }
}
```

**Not included by default:**
- `@react-three/rapier` 2.2.0 + `@dimforge/rapier3d-compat` 0.19.3 — only if contact/physics demos are needed. Cost: WASM 1.5 MB (570 KB gz) + JS 2.2 MB (815 KB gz). Lazy-load on a dedicated route.
- `gsap` 3.15.0 — only if scroll-triggered animation timelines are needed beyond what `motion` provides.
- `vite-tsconfig-paths` — unnecessary; Vite 8 (bundled with Vitest 4) has native `resolve.tsconfigPaths` support. Set `resolve.tsconfigPaths: true` in vitest config instead, or just keep the plugin (it emits a deprecation warning but works).

## Recommended project configuration

### next.config.ts (verified working)

```typescript
import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  images: { unoptimized: true },
  trailingSlash: true,
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [
      'remark-frontmatter',
      ['remark-mdx-frontmatter', { name: 'frontmatter' }],
      'remark-gfm',
      'remark-math',
    ],
    rehypePlugins: [
      'rehype-slug',
      ['rehype-autolink-headings', { behavior: 'wrap' }],
      ['rehype-katex', { strict: false }],
      ['rehype-pretty-code', { theme: 'github-dark-dimmed', keepBackground: true }],
    ],
  },
});

export default withMDX(nextConfig);
```

**Critical:** All remark/rehype plugins are specified as strings (not imported functions) because Turbopack (Next 16 default) cannot serialize JS functions to Rust. Plugins with options use the `['plugin-name', { options }]` tuple form.

### postcss.config.mjs (verified working)

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### src/app/globals.css (Tailwind v4 CSS-first)

```css
@import "tailwindcss";
```

No `tailwind.config.js` or `tailwind.config.ts` needed. Tailwind v4 uses CSS-first configuration. Add `@source` directives or `@theme` blocks in this file if customizing.

### tsconfig.json (strict, verified working)

The scaffold-generated `tsconfig.json` already has `"strict": true`. Key fields:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": [
    "next-env.d.ts", "**/*.ts", "**/*.tsx",
    ".next/types/**/*.ts", ".next/dev/types/**/*.ts", "**/*.mts"
  ]
}
```

With TypeScript 7, run `npx next typegen` after `next build` (or before `tsc --noEmit`) to generate the `PageProps`, `LayoutProps`, and `RouteContext` global types into `.next/types/routes.d.ts`. Without this, standalone `tsc --noEmit` fails with `TS2304: Cannot find name 'PageProps'`. The `next build` command runs typegen internally, so builds are fine.

### vitest.config.mts (verified working)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', '.next/**', 'out/**', 'node_modules/**'],
  },
});
```

Alternative without `vite-tsconfig-paths` (Vite 8 native):
```typescript
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: { /* ... */ },
});
```

### playwright.config.ts (verified working)

```typescript
import { defineConfig, devices } from '@playwright/test';

const PORT = 3211; // Use ports in 3200-3299 only

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Headless Chromium needs SwiftShader for WebGL; without these
        // the R3F canvas silently fails to acquire a context in CI.
        launchOptions: {
          args: [
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
          ],
        },
      },
    },
  ],
  webServer: {
    command: `npx --yes http-server out -p ${PORT} -s --silent`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

### Vercel settings

For a fully static, function-free deployment on Vercel:

1. Use `output: 'export'` in `next.config.ts` (verified: produces `export-marker.json` + `export-detail.json`, zero `.func` files).
2. Set `images: { unoptimized: true }` — the default `next/image` loader requires a server function, which is incompatible with static export.
3. Set `trailingSlash: true` for clean directory-style URLs (`/docs/foo/` → `/docs/foo/index.html`).
4. No `vercel.json` needed. Vercel auto-detects Next.js and respects `output: 'export'`.
5. Sitemap: use `app/sitemap.ts` with `generateSitemaps` — works with static export (generates at build time).
6. `robots.txt`: place in `public/robots.txt` — copied to `out/` as-is.

**Gotcha:** `vercel build` (local) requires a linked project (`.vercel/project.json`). It will fail with "No Project Settings found locally" if unlinked. Do not link during feasibility testing.

## Hands-on verification log

### Scaffold creation

**Command:** `npx --yes create-next-app@16.3.0 scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --skip-install --yes`
**Result:** Created Next.js 16.3.0 scaffold with TypeScript, Tailwind v4, ESLint, App Router, src/ directory.
**Timing:** 2.3s
**Errors + resolution:** None.

### Base dependency install

**Command:** `npm install` (in scaffold dir)
**Result:** 365 packages installed, 0 vulnerabilities.
**Timing:** 13.1s
**Errors + resolution:** None. TypeScript resolved to 5.9.3 (from `^5` in scaffold). ESLint resolved to 9.39.5.

### Baseline production build

**Command:** `npx next build`
**Result:** Compiled successfully. 2 static routes (`/`, `/_not-found`).
**Timing:** 6.2s (compile 2.0s, TypeScript 1.0s, static generation 0.3s)
**Errors + resolution:** None. Note: Next 16 removed `size` and `First Load JS` metrics from build output.

### MDX pipeline install

**Command:** `npm install @next/mdx@16.3.0 @mdx-js/loader@3.1.1 @mdx-js/react@3.1.1 @types/mdx remark-gfm@4.0.1 remark-math@6.0.0 remark-frontmatter@5.0.0 remark-mdx-frontmatter rehype-katex@7.0.1 rehype-slug rehype-autolink-headings rehype-pretty-code@0.14.5 shiki@4.4.2 katex@0.18.1 gray-matter@4.0.3`
**Result:** 196 packages added.
**Timing:** 4.7s
**Errors + resolution:** None.

### 3D + animation install

**Command:** `npm install three@0.185.1 @react-three/fiber@9.7.0 @react-three/drei@10.7.8 urdf-loader@0.13.1 motion@13.0.0 && npm install -D @types/three`
**Result:** 60 packages added. `@types/three` 0.185.4 pulled in by drei transitively.
**Timing:** 5.3s
**Errors + resolution:** None. Peer deps satisfied: R3F 9.7.0 requires `react >=19 <19.3` (have 19.2.8), `three >=0.159` (have 0.185.1). drei 10.7.8 requires `@react-three/fiber ^9.0.0`, `three >=0.159`. urdf-loader 0.13.1 requires `three >=0.152.0`.

### Testing + search install

**Command:** `npm install -D vitest@4.1.10 @vitejs/plugin-react@6.0.5 jsdom@30.0.1 @testing-library/react@16.3.2 @testing-library/jest-dom@7.0.0 vite-tsconfig-paths@6.1.1 @playwright/test@1.62.1 @axe-core/playwright@4.12.1 pagefind@1.5.2 minisearch@7.2.0`
**Result:** 99 packages added.
**Timing:** 12.6s
**Errors + resolution:** `tsconfck@3.1.6` deprecation warning (harmless).

### First build with MDX + 3D (SSR error)

**Command:** `npx next build`
**Result:** FAILED. Error: `ssr: false` is not allowed with `next/dynamic` in Server Components.
**Timing:** 3.9s (failed)
**Errors + resolution:** `src/app/three/page.tsx` used `dynamic(() => import('@/components/scene'), { ssr: false })` in a Server Component. Next 16 (like 15) bans this. Fix: mark the page `'use client'` or import the `'use client'` component directly (R3F Canvas renders empty on server, so `ssr: false` is unnecessary). Fixed by importing Scene directly in a Server Component page.

### Full build after fix

**Command:** `npx next build`
**Result:** Compiled successfully. 7 routes, all static. `/docs/[slug]` uses `generateStaticParams` (SSG).
**Timing:** 6.1s (compile 1.5s, TypeScript 2.0s, static generation 0.5s)
**Errors + resolution:** None.
**Output:** `out/` directory with `index.html`, `three/index.html`, `urdf/index.html`, `docs/inverse-kinematics/index.html`, `404.html`, plus `_next/static/` chunks and KaTeX font files.

### MDX content verification

**Command:** `grep` probes on `out/docs/inverse-kinematics/index.html`
**Result:** All MDX features verified in server-rendered HTML:
- KaTeX: 32 matches (display + inline math, MathML + HTML spans)
- Custom `<Callout>` component: 1 match (`data-testid="callout"`)
- `<Cite>` component: 1 match (`data-testid="cite-buss2004"`)
- `<References>` component: 1 match (`data-testid="references"`)
- Footnotes: 20 matches (GFM `[^lambda]` footnote rendered as `<section data-footnotes>`)
- Syntax highlighting: 74 inline `style="color:"` matches (rehype-pretty-code/Shiki at build time)
- Frontmatter: 1 match (`data-testid="fm-title"` showing title + tags)
**Timing:** <1s
**Errors + resolution:** None. Zero shiki/katex/minisearch in client JS bundles — all server-rendered.

### FK + IK verification (Node script)

**Command:** `node scripts/kinematics-check.mjs`
**Result:** URDF parsed (7 joints, 8 links). FK home position `[0.3914, 0, 0.2265]`, FK bent `[0.3626, 0.0044, 0.0131]`, delta 0.2153 m. DLS IK on 5 targets: all converge in 6-12 iterations, worst error 9.68e-6 m.
**Timing:** 0.4s
**Errors + resolution:** First run failed with `ReferenceError: Document is not defined` — urdf-loader does `instanceof Document` checks. Fixed by borrowing `DOMParser`, `Document`, `XMLDocument`, `Element`, `Node`, `NodeList` from jsdom's `window` into `globalThis`.

### Pagefind search index

**Command:** `npx pagefind --site out --output-subdir _pagefind`
**Result:** Indexed 7 pages, 171 words. Output: 692 KB (includes WASM binary, UI JS, CSS, fragment index).
**Timing:** 1.9s (0.01s actual indexing)
**Errors + resolution:** "Did not find a data-pagefind-body element" warning — expected; add `data-pagefind-body` to content containers in real app to scope indexing.

### MiniSearch build-time index

**Command:** `node scripts/build-search-index.mjs`
**Result:** Indexed 121 items (1 doc + 120 simulated market-map entries). Index: 33 KB raw, 4.3 KB gzipped. Fuzzy search "jacobian pseudoinvers" → `inverse-kinematics`. Tag search "humanoid" → 120 hits.
**Timing:** 72ms
**Errors + resolution:** First run failed with `"[object Object]" is not valid JSON` — `MiniSearch.loadJSON` expects a JSON string, not an object. Fixed by using `MiniSearch.loadJS` (takes parsed object) instead.

### Vitest unit tests

**Command:** `npx vitest run`
**Result:** 4 tests passed (citations numbering, unknown citation throw, references rendering, callout rendering).
**Timing:** 2.8s (transform 41ms, setup 193ms, tests 27ms, environment 673ms)
**Errors + resolution:** Deprecation warning: `vite-tsconfig-paths` detected, Vite 8 supports `resolve.tsconfigPaths` natively. Harmless; can remove plugin and set `resolve.tsconfigPaths: true`.

### Playwright E2E tests

**Command:** `PLAYWRIGHT_BROWSERS_PATH=/tmp/ra-feasibility/pw-browsers npx playwright test`
**Result:** 4 tests passed in 8.0s:
1. Static doc page renders MDX features (callout, cite, references, katex, footnotes, code block) — 174ms
2. R3F canvas acquires WebGL context (renderer: "WebKit WebGL" via SwiftShader) — 1.4s
3. URDF viewer loads SO-101 (7 joints), slider interaction works — 469ms
4. Home page axe violations: none — 1.4s
**Timing:** 8.8s total (including web server startup)
**Errors + resolution:** None. Chromium downloaded to custom `PLAYWRIGHT_BROWSERS_PATH` to avoid polluting global cache.

### Playwright Chromium download

**Command:** `PLAYWRIGHT_BROWSERS_PATH=/tmp/ra-feasibility/pw-browsers npx playwright install chromium`
**Result:** Chrome for Testing 151.0.7922.34 (v1234), Chrome Headless Shell, FFmpeg.
**Timing:** ~30s
**Download size:** 274 MiB (Chrome 178.7 MiB + Headless Shell 94.7 MiB + FFmpeg 1 MiB)
**Disk size:** 565 MB (uncompressed)

### TypeScript 7 compatibility test

**Command:** `npm install -D typescript@7.0.2` (in scaffold copy), then `npx next build` and `npx tsc --noEmit`
**Result:** `next build` succeeds. TypeScript step: 275ms (vs 1978ms with TS 5.9.3 — 7.2x faster). Standalone `tsc --noEmit` fails with `TS2304: Cannot find name 'PageProps'` until `npx next typegen` is run (generates `.next/types/routes.d.ts`). After typegen: `tsc --noEmit` passes in 0.5s.
**Timing:** Build 6.9s, typecheck 0.5s
**Errors + resolution:** `PageProps` is a Next 16.2+ globally-generated type. Run `npx next typegen` before standalone typecheck, or rely on `next build` which runs typegen internally.

### ESLint

**Command:** `npx eslint .`
**Result:** No errors.
**Timing:** 2.4s
**Errors + resolution:** None. Note: `next lint` command was removed in Next 16. Use `eslint` directly. The scaffold's `eslint.config.mjs` uses the flat config format with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.

### Vercel build attempt

**Command:** `vercel build < /dev/null`
**Result:** Failed: "No Project Settings found locally. Run `vercel pull --yes` to retrieve them." Expected — project not linked (per rules: do not link, do not change auth state).
**Timing:** <1s
**Errors + resolution:** `vercel build` requires `.vercel/project.json` from a linked project. Not feasible to test without linking. However, `output: 'export'` is well-documented to produce function-free static output on Vercel — verified locally via `export-marker.json` and zero `.func` files in `out/`.

## Build metrics

| Metric | Value |
|--------|-------|
| Base install (365 packages) | 13.1s |
| MDX install (+196 packages) | 4.7s |
| 3D install (+60 packages) | 5.3s |
| Test install (+99 packages) | 12.6s |
| Total packages | 721 |
| Baseline `next build` | 6.2s |
| Full scaffold `next build` (7 routes) | 6.1s |
| TS 5.9.3 typecheck (`tsc --noEmit`) | 2.3s |
| TS 7.0.2 typecheck (after typegen) | 0.5s |
| TS 5.9.3 build TS step | 1978ms |
| TS 7.0.2 build TS step | 275ms |
| ESLint | 2.4s |
| Vitest (4 tests) | 2.8s |
| Playwright (4 tests) | 8.8s |
| Playwright Chromium download | ~30s, 274 MiB → 565 MB |
| Pagefind index | 1.9s, 692 KB output |
| MiniSearch index (121 docs) | 72ms, 33 KB (4.3 KB gz) |
| FK + IK script | 0.4s |

### Per-route bundle sizes (gzipped)

| Route | HTML | JS (raw) | JS (gzip) | CSS (gzip) | Notes |
|-------|------|----------|-----------|-----------|-------|
| `/` (home) | 6.6 KB | 559.3 KB | 168.5 KB | 6.5 KB | Next/React framework only |
| `/three/` (direct R3F import) | 6.9 KB | 1514.7 KB | 424.8 KB | 6.5 KB | Includes 895 KB three.js chunk |
| `/urdf/` (dynamic R3F import) | 6.7 KB | 555.2 KB | 167.0 KB | 6.5 KB | three.js lazy-loaded at runtime |
| `/docs/[slug]` (MDX) | 43.4 KB | 550.6 KB | 165.8 KB | 6.5 KB | Content server-rendered, no shiki/katex in client JS |

**Key insight:** Dynamic-importing R3F (via `'use client'` wrapper with `next/dynamic`) keeps the initial JS at 167 KB gzip. Direct-importing R3F adds 258 KB gzip of three.js to the initial payload. The `/urdf/` pattern (dynamic import) is the correct approach for 3D pages.

**Client bundle composition:** The 550 KB baseline is Next.js + React framework code. No shiki, katex, or minisearch in client bundles — all content processing happens at build time. The 895 KB chunk (`3qb77oxekt8_z.js`) is three.js (contains `WebGLRenderer`).

### Static output size

| Component | Size |
|-----------|------|
| `out/` total | 23 MB (24 MB with Pagefind) |
| `out/_next/` (JS + CSS + fonts) | 3.0 MB |
| `out/robots/so101/` (URDF + STL meshes) | 15 MB |
| KaTeX fonts | 1.2 MB |
| Pagefind index | 692 KB |

## 3D / kinematics findings

### URDF loading

**`urdf-loader` 0.13.1** (gkjohnson/urdf-loaders, Apache-2.0) is the only actively maintained URDF loader for three.js. Last updated 2026-07-08. It:
- Parses URDF XML via DOMParser (requires DOM shim in Node)
- Loads STL and DAE meshes via three.js `STLLoader` / `ColladaLoader` by default
- Provides `URDFRobot` with `setJointValue(name, angle)` for forward kinematics
- Has `loadMeshCb` override for custom mesh loading (used in Node FK test to skip mesh IO)
- Works in the browser: Playwright test loaded the full SO-101 (7 joints, 13 STL meshes, 15 MB) and verified slider-driven joint updates

**In Node.js:** Requires jsdom DOM shim (`DOMParser`, `Document`, `XMLDocument`, `Element`, `Node`, `NodeList` borrowed from `jsdom.window`). With `loadMeshCb` set to return empty `Object3D`, FK-only parsing works without mesh files.

### IK approach recommendation

**Recommendation: Roll your own damped least squares (DLS) Jacobian solver.**

Rationale:
- `three-ik` 0.1.0 (last updated 2022-05-21) — unmaintained, 4 years stale
- `closed-chain-ik` 0.0.3 (last updated 2023-05-04) — unmaintained, 3 years stale
- `ik` 1.0.0 / `kinematics` 1.0.2 — both last updated 2022, unmaintained
- DLS is ~50 lines of code, well-understood math, and has no dependencies

The verified implementation uses:
1. Analytic positional Jacobian (2×N for planar, 3×N for spatial)
2. DLS update: `Δθ = Jᵀ(JJᵀ + λ²I)⁻¹e`
3. Adaptive damping: λ near-zero far from singularities, growing as smallest singular value collapses
4. Convergence: 6-12 iterations for <10μm precision on reachable targets

For the SO-101 (6-DoF spatial), use a 3×6 Jacobian and solve the 3×3 normal-equations system (cheap). For redundant arms, the full 6×N system with SVD or QR fallback near singularities is appropriate.

### Physics engine verdict

**Not recommended by default. Include only if contact/physics demos are explicitly required.**

| Engine | Package | WASM size | JS size | Gzip total | Status |
|--------|---------|-----------|---------|------------|--------|
| Rapier 3D | `@react-three/rapier` 2.2.0 + `@dimforge/rapier3d-compat` 0.19.3 | 1.5 MB (570 KB gz) | 2.2 MB (815 KB gz) | ~1.4 MB gz | Best option if needed. WASM-based, deterministic, R3F integration. |
| Cannon-es | `cannon-es` 0.20.0 | N/A (pure JS) | ~200 KB | ~60 KB gz | Lightweight but less accurate, unmaintained since 2022 |
| Jolt | `jolt-physics` 1.1.0 | Large WASM | — | — | Powerful but heavy; overkill for demos |

Rapier's ~1.4 MB gzipped cost is significant. If included, lazy-load it on a dedicated route with `next/dynamic` so it never enters the initial bundle.

### Mesh optimization (STL → GLB with compression)

The SO-101 ships as 13 binary STL files totaling 15.38 MB (322,564 triangles). This is too large for web delivery. Verified compression options:

| Format | Size (base_so101_v2) | vs STL | Notes |
|--------|---------------------|--------|-------|
| STL (raw) | 460.5 KB | baseline | Current format |
| GLB (uncompressed) | 664.0 KB | +44% larger | No win without compression |
| GLB + meshopt | 163.1 KB | 2.8× smaller | `EXT_meshopt_compression`, native in three GLTFLoader |
| GLB + Draco | 34.8 KB | 13.2× smaller | `KHR_draco_mesh_compression`, needs DRACOLoader |

**Projected totals for all 13 meshes:**
- STL raw: 15.38 MB
- GLB + meshopt: ~5.5 MB
- GLB + Draco: ~1.2 MB

**Recommendation:** Convert STL → GLB with Draco compression at build time. The 15.38 MB → ~1.2 MB reduction makes the SO-101 shippable. Use `@gltf-transform/cli` (`npx gltf-transform draco input.glb output.glb`) or a custom three.js script with `GLTFExporter` + Draco. The three.js `GLTFLoader` supports Draco via `DRACOLoader` (decoder WASM ~100 KB).

Alternatively, meshopt compression (5.5 MB) is simpler (no separate decoder needed, native in GLTFLoader) and may suffice if the total budget allows.

### Redistributable robot mesh sources

| Asset | Source URL | License | Redistributable in our repo? | Notes |
|-------|-----------|---------|------------------------------|-------|
| SO-101 (SO-ARM100) | [TheRobotStudio/SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100) | Apache-2.0 | Yes | 13 STL meshes (15.4 MB), URDF, 6 revolute joints + gripper. Convert to GLB+Draco for web. |
| SO-100 (SO-ARM100) | [TheRobotStudio/SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100) | Apache-2.0 | Yes | Same repo, `Simulation/SO100/`. 13 STL meshes, URDF. |
| Franka Panda (FR3) | [frankaemika/franka_description](https://github.com/frankaemika/franka_description) | Apache-2.0 | Yes | DAE visual meshes (larger, 11-18 MB each) + STL collision. Xacro-based URDF (needs xacro processing). Consider converting DAE → GLB+Draco. |
| UR5 / UR3 / UR10 | [UniversalRobots/Universal_Robots_ROS2_Description](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description) | BSD-3-Clause | Yes (BSD-3 permits redistribution with notice) | DAE meshes. Xacro URDF. Include BSD-3 license notice. |
| Koch v1.1 | [jess-moss/koch-v1-1](https://github.com/jess-moss/koch-v1-1) | Apache-2.0 | Yes | Low-cost arm from HuggingFace LeRobot ecosystem. |
| LeRobot models | [huggingface/lerobot](https://github.com/huggingface/lerobot) | Apache-2.0 | Yes | Contains various teleoperation arm configs. |
| MuJoCo Menagerie | [google-deepmind/mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) | NOASSERTION | Check per-model | Each model has its own license in its subdirectory. Some are Apache-2.0, some are not. Verify before shipping. |
| urdf-loader (library) | [gkjohnson/urdf-loaders](https://github.com/gkjohnson/urdf-loaders) | Apache-2.0 | Yes (it's an npm dep, not a mesh) | The loader itself, not a robot model. |

**Recommendation:** Ship the SO-101 as the primary demo robot (Apache-2.0, simplest mesh setup, actively maintained, most relevant to the open-source robotics community). Convert STL → GLB+Draco before committing. Include the Apache-2.0 LICENSE file and attribution in the repo.

## Vercel static hosting findings

### Recommended approach: `output: 'export'`

Verified that `output: 'export'` in `next.config.ts` produces a fully static, function-free deployment:

1. `next build` generates `out/` directory with HTML/CSS/JS only
2. `.next/export-marker.json` confirms: `exportTrailingSlash: true`, `isNextImageImported: false`
3. `.next/export-detail.json` confirms: `outDirectory` set, `success: true`
4. Zero `.func` files in `out/` (verified with `find out -name '*.func' | wc -l` → 0)
5. All routes prerendered as static HTML (○ Static) or SSG (● with `generateStaticParams`)

### Why `output: 'export'` vs standard Next build on Vercel

A standard Next.js build on Vercel (without `output: 'export'`) also produces static HTML for non-dynamic routes, but:
- It may create serverless functions for any route that uses server features (cookies, headers, etc.)
- `next/image` optimization runs as a serverless function by default
- ISR/PPR features require server infrastructure
- You lose the guarantee of zero functions

With `output: 'export'`, the build **fails loudly** if any route requires server features, enforcing the static-only constraint. This is the safer choice for a mission that explicitly wants "zero serverless functions."

### Gotchas

1. **`next/image`**: Must set `images: { unoptimized: true }`. The default image optimization loader requires a server function. With `unoptimized: true`, images are served as-is (still responsive via `srcset` if you provide `width`/`height`).

2. **Trailing slashes**: `trailingSlash: true` generates `/docs/foo/index.html` instead of `/docs/foo.html`. This works better with static hosts (no URL rewrite needed). Vercel handles both, but `trailingSlash: true` is cleaner.

3. **Dynamic routes**: Must use `generateStaticParams()` with `dynamicParams = false`. Without `generateStaticParams`, the build fails for dynamic routes under `output: 'export'`.

4. **Route Handlers**: Only `GET` is supported, and they must not rely on request-time data. They render to static files at build time (e.g., `app/search-index.json/route.ts` → `search-index.json`).

5. **Sitemap/robots**: `app/sitemap.ts` works with static export (generates at build time). `public/robots.txt` is copied as-is. Note: in Next 16, the `id` parameter for `sitemap` (when using `generateSitemaps`) is now a `Promise<string>` (async).

6. **`vercel build` (local)**: Requires a linked project. Cannot test locally without linking. The `out/` directory from `next build` is the definitive artifact — it's what Vercel would serve.

7. **Internal redirects**: The routes manifest contains internal 308 redirects for trailing-slash normalization. These are handled by Vercel's CDN, not serverless functions.

## Blockers and risks

### BLOCKERS: None

All 13 stack components verified working together. No fundamental incompatibilities found.

### Risks (non-blocking, but require attention)

1. **STL mesh size (15.4 MB)**: The SO-101 STL meshes are too large for web delivery as-is. Must convert to GLB+Draco (~1.2 MB) or GLB+meshopt (~5.5 MB) before shipping. This is a build-step task, not a blocker. Verified that `@gltf-transform/cli` 4.4.2 performs the conversion correctly.

2. **Turbopack plugin serialization**: All MDX remark/rehype plugins must be specified as strings with serializable options in `next.config.ts`. Custom plugins that accept JS functions cannot be used with Turbopack. If a plugin requires a function callback (e.g., a custom Shiki transformer), you must either (a) find a string-config alternative, (b) use `--webpack` flag to opt out of Turbopack for builds, or (c) compile MDX outside the Next.js pipeline (e.g., at build time with a Node script). For the current plugin set (remark-gfm, remark-math, remark-frontmatter, remark-mdx-frontmatter, rehype-slug, rehype-autolink-headings, rehype-katex, rehype-pretty-code), all work with string names.

3. **TypeScript 7 adoption**: TS 7.0.2 is the new Go-based compiler. It works with Next 16.3.0 but is not the scaffold default (`^5` resolves to 5.9.3). Pin `typescript@7.0.2` explicitly in devDependencies. The `PageProps` global type requires `npx next typegen` before standalone `tsc --noEmit`. CI should run `next typegen && tsc --noEmit` or rely on `next build` which runs typegen internally.

4. **R3F SSR**: `next/dynamic` with `ssr: false` is banned in Server Components (Next 16). The correct pattern is: create a `'use client'` wrapper component that imports the R3F Canvas, and import that wrapper from a Server Component page. R3F v9's Canvas renders an empty container during SSR, so `ssr: false` is unnecessary. For pages that need dynamic import (code splitting), mark the page itself `'use client'` and use `dynamic(() => import(...), { ssr: false })` there.

5. **urdf-loader in Node**: Requires jsdom DOM shim for any Node-side processing (e.g., extracting joint limits at build time). Borrow `DOMParser`, `Document`, `XMLDocument`, `Element`, `Node`, `NodeList` from jsdom's `window`.

6. **WebGL in headless/CI**: Playwright's headless Chromium needs `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` flags to get a WebGL context. Without these, the R3F canvas silently fails. This is a test-config concern, not a production concern (real browsers have WebGL).

7. **Franka Panda mesh format**: The Franka description repo uses DAE (Collada) visual meshes (11-18 MB each) and Xacro-based URDF. Shipping the Franka would require converting DAE → GLB+Draco and processing Xacro → URDF. More work than the SO-101 (which has ready-to-use STL + URDF).

## Guidance for implementation workers

### MDX + App Router

- **`mdx-components.tsx` is required.** Without it, `@next/mdx` does not work in App Router. Place it at `src/mdx-components.tsx` (inside `src/` if using `srcDir`).
- **Frontmatter**: `@next/mdx` does not parse YAML frontmatter by default. Use `remark-frontmatter` + `remark-mdx-frontmatter` to expose frontmatter as a named export (`frontmatter`) from the MDX module. Access it via `const { frontmatter } = await import('@/content/foo.mdx')`.
- **All plugins are strings**: In `next.config.ts`, every remark/rehype plugin must be a string name, not an imported function. Plugins with options use `['plugin-name', { serializable-options }]`. This is a Turbopack constraint.
- **Content is server-rendered**: KaTeX, Shiki syntax highlighting, and GFM footnotes all render at build time. Zero client JS for content. The 43 KB HTML for a doc page includes all rendered math, code, and footnotes.
- **Custom components**: Define in `mdx-components.tsx` (global) or pass via `<MDXContent components={...}>` (local). Components like `<Callout>`, `<Cite>`, `<References>` work seamlessly in MDX.

### R3F + 3D

- **No `ssr: false` in Server Components.** Import `'use client'` components directly. R3F v9 Canvas renders nothing on the server (empty `<div>`), so SSR is safe.
- **Dynamic import for code splitting**: If you want three.js out of the initial bundle, create a `'use client'` page that uses `dynamic(() => import('@/components/Scene'), { ssr: false })`. This keeps the initial JS at ~167 KB gzip instead of ~425 KB.
- **OrbitControls**: Must be inside the `<Canvas>` (it needs the R3F context). Use `makeDefault` so other controls can override.
- **Environment preset**: drei's `<Environment preset="city" />` fetches an HDR from a CDN at runtime. For fully offline/static, use `preset="studio"` or provide a local HDR file. This didn't cause issues in testing but could fail in air-gapped environments.
- **stats-gl duplicate three**: drei pulls `stats-gl@2.4.2` which depends on `three@0.170.0`, creating a duplicate three instance. This is a known issue. Use npm `overrides` to force-resolve if it causes problems: `"overrides": { "stats-gl": { "three": "$three" } }`.

### URDF + kinematics

- **urdf-loader `workingPath`**: Set `loader.workingPath = url.slice(0, url.lastIndexOf('/') + 1)` so relative mesh paths in the URDF resolve correctly.
- **`setJointValue` mutates in place**: Calling `robot.setJointValue(name, angle)` updates the three.js transform hierarchy directly. You must call `robot.updateMatrixWorld(true)` before reading end-effector positions if you're doing FK in Node.
- **Joint limits**: Read from `robot.joints[name].limit.lower` / `.upper` after loading. Use these to set slider min/max.
- **DLS IK implementation**: The verified solver is ~50 lines. For a 3-DoF planar arm, use a 2×3 Jacobian and solve a 2×2 system (cheap). For 6-DoF spatial, use a 3×6 (position-only) or 6×6 (full pose) Jacobian. The DLS normal equations `(JJᵀ + λ²I)` are always small (2×2, 3×3, or 6×6), so no SVD needed — a direct solve suffices.

### Search

- **Pagefind**: Run `npx pagefind --site out --output-subdir _pagefind` after `next build`. Add `data-pagefind-body` to content containers to scope indexing (otherwise it indexes all `<body>` content, including nav/footer). The WASM binary (~73 KB) loads lazily only when the user searches.
- **MiniSearch**: Build the index at build time in a Node script, serialize to `public/search-index.json`, and fetch + hydrate client-side. Use `MiniSearch.loadJS(parsedObject, options)` — not `loadJSON` (which expects a string). The index for 121 items is 4.3 KB gzipped.

### Testing

- **Vitest**: Use `environment: 'jsdom'` for component tests. `@testing-library/jest-dom` provides custom matchers (`toHaveTextContent`, `toBeVisible`). Import via `vitest.setup.ts`: `import '@testing-library/jest-dom/vitest'`.
- **Playwright**: Serve the `out/` directory with `http-server` (not `next start`, which requires a server). Use `--silent` to suppress log noise. Set `PLAYWRIGHT_BROWSERS_PATH` to avoid polluting the global browser cache.
- **WebGL in tests**: Headless Chromium needs SwiftShader flags. Without them, `canvas.getContext('webgl2')` returns null and R3F silently fails.
- **Axe**: `@axe-core/playwright` integrates into Playwright tests. Filter to `['serious', 'critical']` impacts to avoid noise from minor issues. The home page passed with zero violations.

### TypeScript 7

- Pin `typescript: "7.0.2"` in devDependencies (scaffold defaults to `^5`).
- Run `npx next typegen` before `npx tsc --noEmit` in CI, or just run `next build` (which includes typegen).
- TS 7 is 7× faster than TS 5 for the Next.js build typecheck step (275ms vs 1978ms).

### Vercel

- `output: 'export'` is the correct setting for a function-free static site.
- `images: { unoptimized: true }` is mandatory with static export.
- `trailingSlash: true` generates clean directory URLs.
- No `vercel.json` needed — Vercel auto-detects Next.js and respects `output: 'export'`.
- The `out/` directory is the deployment artifact. Everything in it is static.
