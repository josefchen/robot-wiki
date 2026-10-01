/** Production scene budget and deterministic site-wide beat contact sheets. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import { SCENE_TARGETS, type SceneTarget } from '../lib/motion-scene-registry.ts';

const ROOT = join(import.meta.dirname, '..');
const EVIDENCE = join(ROOT, 'evidence/motion/scenes');
const LIMIT = 25 * 1024;

export function contactSheetPlan(targets: readonly SceneTarget[]) {
  if (targets.length === 0) throw new Error('scene population is empty');
  if (new Set(targets.map((scene) => scene.id)).size !== targets.length) {
    throw new Error('duplicate scene IDs in contact sheet');
  }
  return [375, 1440].map((viewport) => ({
    viewport,
    rows: targets.map(({ id, route, beats }) => {
      if (!Number.isInteger(beats) || beats < 1) throw new Error(`${id} has no beats`);
      return {
        id, route, beats,
        images: Array.from({ length: beats }, (_, index) =>
          `evidence/motion/scenes/${id}/${viewport}-beat-${index + 1}.png`),
      };
    }),
  }));
}

export function verifySceneCaptures(root: string, targets: readonly SceneTarget[]) {
  const plans = contactSheetPlan(targets);
  for (const plan of plans) {
    for (const row of plan.rows) {
      const directory = join(root, 'evidence/motion/scenes', row.id);
      const auditFile = join(directory, 'audit.json');
      if (!existsSync(auditFile)) throw new Error(`${row.id}: missing audit.json`);
      const audit = JSON.parse(readFileSync(auditFile, 'utf8')) as Record<string, {
        intersections: string[]; overflow: string[]; lowContrast: string[];
      }>;
      for (const label of ['reduced poster', 'poster', ...Array.from(
        { length: row.beats }, (_, index) => `beat ${index + 1}`,
      )]) {
        const name = `${plan.viewport} ${label}`;
        const image = join(directory, `${plan.viewport}-${label.replaceAll(' ', '-')}.png`);
        if (!existsSync(image)) throw new Error(`missing scene capture: ${relative(root, image)}`);
        const issues = audit[name];
        if (!issues) throw new Error(`${row.id}: missing audit of ${name}`);
        if (issues.intersections.length || issues.overflow.length || issues.lowContrast.length) {
          throw new Error(`${row.id}: ${name} has visual audit failures`);
        }
      }
    }
  }
  return plans;
}

/** Count emitted scene-bearing chunks; shared kit chunks with no scene ID are excluded. */
export function sceneBundleBudget(chunkDir: string, targets: readonly SceneTarget[]) {
  const chunks = readdirSync(chunkDir).filter((file) => file.endsWith('.js')).map((file) => ({
    file,
    source: readFileSync(join(chunkDir, file)),
  }));
  return targets.map(({ id }) => {
    const matches = chunks.filter(({ source }) => source.includes(`id:"${id}"`));
    // A page-level common chunk may also contain the scene. Require a
    // scene-specific emitted chunk so a single all-scenes bundle cannot pass.
    const owned = matches.filter(({ source }) =>
      !targets.some((other) => other.id !== id && source.includes(`id:"${other.id}"`)));
    if (owned.length === 0) throw new Error(`${id}: missing individually attributable production chunk`);
    const gzipBytes = matches.reduce((sum, { source }) => sum + gzipSync(source).length, 0);
    return {
      id,
      chunks: matches.map(({ file }) => file),
      gzipBytes,
      withinBudget: gzipBytes <= LIMIT,
    };
  });
}

const SHEET_DOMAINS = [
  'classical', 'manipulation', 'rl-sim2real', 'world-models', 'data-hardware', 'frontier-adjacent',
] as const;

function domainScenes(targets: readonly SceneTarget[], domain: (typeof SHEET_DOMAINS)[number]) {
  return targets.filter((scene) => domain === 'frontier-adjacent'
    ? scene.route.startsWith('/frontier/') || scene.route.startsWith('/adjacent/')
    : scene.route.startsWith(`/${domain}/`));
}

/** Domains that still mount a scene, in sheet order. */
export function sceneSheetDomains(targets: readonly SceneTarget[]) {
  return SHEET_DOMAINS.filter((domain) => domainScenes(targets, domain).length > 0);
}

const escape = (value: string) => value.replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

async function renderSheet(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  viewport: number,
  targets: readonly SceneTarget[],
  file: string,
) {
  const rows = targets.map((scene) => `
    <section>
      <h2>${escape(scene.id)} <small>${escape(scene.route)}</small></h2>
      <div class="beats">${Array.from({ length: scene.beats }, (_, index) => {
        const image = join(EVIDENCE, scene.id, `${viewport}-beat-${index + 1}.png`);
        return `<figure><img src="data:image/png;base64,${readFileSync(image).toString('base64')}"
          alt="${escape(scene.id)} beat ${index + 1}"><figcaption>Beat ${index + 1}</figcaption></figure>`;
      }).join('')}</div>
    </section>`).join('');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  try {
    await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
      * { box-sizing: border-box } body { margin: 0; padding: 24px; background: #F5F6F7;
        color: #0B0B0C; font: 14px Arial, sans-serif }
      h1 { font-size: 22px; margin: 0 0 20px } h2 { font-size: 16px; margin: 0 0 8px;
        border-top: 1px solid #D9DADB; padding-top: 12px }
      small { color: #242D33; font-weight: 400; margin-left: 12px }
      section { margin-bottom: 20px } .beats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px }
      figure { margin: 0; min-width: 0; background: #FFFFFF; border: 1px solid #D9DADB }
      img { display: block; width: 100%; height: auto }
      figcaption { padding: 4px 8px; font-weight: 600 }
    </style><h1>Motion scenes · ${viewport}px · ${targets.length} scenes</h1>${rows}</html>`);
    await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  } finally {
    await page.close();
  }
}

async function main() {
  const plans = verifySceneCaptures(ROOT, SCENE_TARGETS);
  const sizes = sceneBundleBudget(join(ROOT, '.next/static/chunks'), SCENE_TARGETS);
  const over = sizes.filter((row) => !row.withinBudget);
  if (over.length) throw new Error(`scene JS over ${LIMIT} gzipped bytes: ${JSON.stringify(over)}`);
  const output = join(EVIDENCE, 'site-wide');
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const plan of plans) {
      await renderSheet(browser, plan.viewport, SCENE_TARGETS, join(output, `${plan.viewport}-contact-sheet.png`));
      console.log(`${plan.viewport}px: ${plan.rows.length} scenes, ${plan.rows.reduce((sum, row) => sum + row.beats, 0)} beats`);
      const domains = sceneSheetDomains(SCENE_TARGETS);
      for (const domain of SHEET_DOMAINS) {
        const file = join(output, `${plan.viewport}-${domain}.png`);
        if (domains.includes(domain)) {
          await renderSheet(browser, plan.viewport, domainScenes(SCENE_TARGETS, domain), file);
        } else {
          rmSync(file, { force: true });
        }
      }
    }
  } finally {
    await browser.close();
  }
  const evidence = {
    scenes: SCENE_TARGETS.length,
    beatImagesPerViewport: plans[0].rows.reduce((sum, row) => sum + row.beats, 0),
    budgetBytes: LIMIT,
    chunks: sizes,
    sheets: readdirSync(output).filter((file) => file.endsWith('.png')).sort(),
    images: plans.flatMap((plan) => plan.rows.flatMap((row) => row.images.map((image) => ({
      path: image,
      sha256: createHash('sha256').update(readFileSync(join(ROOT, image))).digest('hex'),
    })))),
  };
  writeFileSync(join(output, 'manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`contact sheets: ${relative(ROOT, output)}; max scene ${Math.max(...sizes.map((row) => row.gzipBytes))} gzipped bytes`);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
