#!/usr/bin/env node
/**
 * Probe + plant proof for the registry-generated-locator blindness defect
 * (05f58a6, b533287, and the 2026-08-23 sweep completion).
 *
 * DEFECT. On every article route the shared template
 * (app/(content)/[domain]/[slug]/page.tsx) closes
 * <div data-pagefind-body className="prose"> and THEN renders
 * <SeeAlso>/<LinkedFrom>/<References>, all still inside <main>. The
 * References bibliography emits one external target=_blank anchor per
 * registry citation, so a chip-count floor scoped to main/#main-content
 * is satisfied by the generated bibliography alone and cannot fail while
 * the module has citations.
 *
 * MODES.
 *   node scripts/prose-anchor-probe.mjs            measure: per route,
 *     print authored-prose anchor count, generated-References anchor
 *     count, and the spec's floor, then say whether the floor is masked
 *     (registry alone satisfies it).
 *   node scripts/prose-anchor-probe.mjs --plant    plant proof: in a real
 *     browser, delete every matching anchor inside the authored prose
 *     (replacing each with its text so the page still renders), then
 *     re-count and evaluate the floor. A correctly scoped locator fails
 *     its floor (count 0); a still-masked one passes. Exit 1 if any
 *     route still passes, or if any prose count does not fall to 0.
 *   --route <substring>  restrict to matching routes.
 *   --out <dir>          export directory to serve (default: out/).
 *
 * Serves the static export with an inline dependency-free server (the
 * same conventions as tests/e2e/helpers/static-export-server.ts) so the
 * numbers measure the shipped artifact, never the dev server.
 *
 * The ROUTES table mirrors the chip-floor locators in the named specs.
 * Keep it in sync when a spec changes its selector or floor: the probe's
 * value is that it grades the SAME locator the spec grades.
 */
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

/** spec:line of the graded locator; floor is the spec's unchanged floor. */
const ROUTES = [
  {
    spec: "evaluation-crisis.spec.ts:117",
    route: "/data-hardware/evaluation-crisis/",
    selector: 'a[href^="https://"]',
    floor: 9,
  },
  {
    spec: "generalization.spec.ts:99",
    route: "/frontier/generalization/",
    selector: 'a[href^="https://"]',
    floor: 5,
  },
  {
    spec: "generative-sim.spec.ts:55",
    route: "/world-models/generative-sim/",
    selector: 'a[href^="http"]',
    floor: 8,
  },
  {
    spec: "generative-video.spec.ts:97",
    route: "/world-models/generative-video/",
    selector: 'a[href^="http"]',
    floor: 10,
  },
  {
    spec: "grasp-planning.spec.ts:128",
    route: "/classical/grasp-planning/",
    selector: 'a[target="_blank"][href^="https://"]',
    floor: 11,
  },
  {
    spec: "hardware-taxonomy.spec.ts:103",
    route: "/data-hardware/hardware-taxonomy/",
    selector: 'a[href^="http"]',
    floor: 20,
  },
  {
    spec: "jepa.spec.ts:61",
    route: "/world-models/jepa/",
    selector: 'a[href^="http"]',
    floor: 10,
  },
  {
    spec: "kinematics.spec.ts:114",
    route: "/classical/kinematics/",
    selector: 'a[target="_blank"][href^="https://"]',
    floor: 9,
  },
  {
    spec: "latent-dynamics.spec.ts:60",
    route: "/world-models/latent-dynamics/",
    selector: 'a[href^="http"]',
    floor: 9,
  },
  {
    spec: "legged-locomotion.spec.ts:45",
    route: "/rl-sim2real/legged-locomotion/",
    selector: 'a[href^="http"]',
    floor: 12,
  },
  {
    spec: "motion-planning.spec.ts:113",
    route: "/classical/motion-planning/",
    selector: 'a[target="_blank"][href^="https://"]',
    floor: 10,
  },
  {
    spec: "parallel-sim-rl.spec.ts:54",
    route: "/rl-sim2real/parallel-sim-rl/",
    selector: 'a[href^="http"]',
    floor: 7,
  },
  {
    spec: "reliability-gap.spec.ts:84",
    route: "/frontier/reliability-gap/",
    selector: 'a[href^="https://"]',
    floor: 5,
  },
  {
    spec: "rl-finetuning.spec.ts:52",
    route: "/manipulation/rl-finetuning/",
    selector: 'a[href^="https://arxiv.org/abs/"]',
    floor: 5,
  },
  {
    spec: "sim2real-transfer.spec.ts:59",
    route: "/rl-sim2real/sim2real-transfer/",
    selector: 'a[href^="http"]',
    floor: 10,
  },
  {
    spec: "state-estimation.spec.ts:155",
    route: "/classical/state-estimation/",
    selector: 'a[target="_blank"][href^="https://"]',
    floor: 12,
  },
  {
    spec: "teleop-rigs.spec.ts:66",
    route: "/data-hardware/teleop-rigs/",
    selector: 'a[href^="https://"]',
    floor: 9,
  },
  {
    spec: "why-rl-locomotion.spec.ts:60",
    route: "/rl-sim2real/why-rl-locomotion/",
    selector: 'a[href^="https://arxiv.org/abs/"]',
    floor: 5,
  },
  {
    spec: "wm-taxonomy.spec.ts:45",
    route: "/world-models/taxonomy/",
    selector: 'a[href^="http"]',
    floor: 11,
  },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function startServer(root) {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url ?? "/", "http://localhost").pathname,
      );
      const filePath = resolve(join(root, pathname));
      if (filePath !== root && !filePath.startsWith(root + "/")) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const body = await readFile(join(filePath, "index.html"));
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        res.end(body);
        return;
      } catch {
        /* fall through */
      }
      const body = await readFile(filePath);
      res.writeHead(200, {
        "Content-Type":
          MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    port: server.address().port,
    stop: () => new Promise((r) => server.close(r)),
  };
}

/**
 * In-page counting. prose: anchors inside div.prose[data-pagefind-body]
 * matching the spec's selector (the authored chips). registry: matching
 * anchors inside #main-content but OUTSIDE the prose div (the generated
 * References bibliography; also SeeAlso/LinkedFrom when they carry
 * external hrefs, which they do not — they are internal links).
 */
async function measure(page, route, selector) {
  return page.evaluate(
    ({ path, sel }) => {
      const prose = document.querySelector("div.prose[data-pagefind-body]");
      const main =
        document.querySelector("#main-content") ??
        document.querySelector("main");
      if (!prose || !main)
        return { error: `missing ${!prose ? "prose" : "main"} on ${path}` };
      const proseSet = new Set(prose.querySelectorAll(sel));
      const registry = Array.from(main.querySelectorAll(sel)).filter(
        (a) => !proseSet.has(a),
      ).length;
      return { prose: proseSet.size, registry };
    },
    { path: route, sel: selector },
  );
}

/** Delete every matching authored-prose anchor, keeping its text. */
async function plant(page, selector) {
  return page.evaluate((sel) => {
    const prose = document.querySelector("div.prose[data-pagefind-body]");
    if (!prose) return { deleted: -1, remaining: -1 };
    const anchors = Array.from(prose.querySelectorAll(sel));
    for (const a of anchors)
      a.replaceWith(document.createTextNode(a.textContent ?? ""));
    return {
      deleted: anchors.length,
      remaining: prose.querySelectorAll(sel).length,
    };
  }, selector);
}

export async function main(argv = process.argv.slice(2)) {
  const plantMode = argv.includes("--plant");
  const routeArg = argv[argv.indexOf("--route") + 1];
  const outArg = argv[argv.indexOf("--out") + 1];
  const outDir = resolve(outArg && !outArg.startsWith("--") ? outArg : "out");
  const routes = ROUTES.filter(
    (r) =>
      !routeArg ||
      routeArg.startsWith("--") ||
      r.route.includes(routeArg) ||
      r.spec.includes(routeArg),
  );

  const server = await startServer(outDir);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const base = `http://127.0.0.1:${server.port}`;
  let failures = 0;

  console.log(
    plantMode
      ? `PLANT PROOF against ${outDir} (authored chips deleted in-page; a scoped locator must FAIL its floor)\n`
      : `MEASURE against ${outDir}\n`,
  );
  console.log(
    "spec                          route                                        prose  registry  floor  verdict",
  );
  for (const r of routes) {
    await page.goto(base + r.route, { waitUntil: "load" });
    const m = await measure(page, r.route, r.selector);
    if (m.error) {
      console.log(
        `${r.spec.padEnd(30)} ${r.route.padEnd(45)} ERROR ${m.error}`,
      );
      failures += 1;
      continue;
    }
    if (!plantMode) {
      const masked = m.registry >= r.floor;
      if (masked) failures += 1;
      console.log(
        `${r.spec.padEnd(30)} ${r.route.padEnd(45)} ${String(m.prose).padStart(5)}  ${String(m.registry).padStart(8)}  ${String(r.floor).padStart(5)}  ${masked ? "MASKED (registry alone passes)" : "not masked"}`,
      );
    } else {
      const p = await plant(page, r.selector);
      const okDeleted = p.deleted === m.prose && p.remaining === 0;
      const floorNow = p.remaining >= r.floor; // the spec's assertion, post-plant
      const good = okDeleted && !floorNow;
      if (!good) failures += 1;
      console.log(
        `${r.spec.padEnd(30)} ${r.route.padEnd(45)} deleted ${p.deleted}/${m.prose}, remaining ${p.remaining}; floor ${r.floor} ${floorNow ? "STILL PASSES (locator still masked)" : "fails (correctly scoped)"}`,
      );
    }
  }

  await browser.close();
  await server.stop();
  console.log(
    `\n${failures === 0 ? "OK" : "FAILURES: " + failures}${plantMode ? " (plant mode)" : " (measure mode: masked floors)"}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
