/**
 * The explainer label check (VAL-OPUS-043).
 *
 *   node scripts/check-explainer-labels.ts [--out out | --base-url URL] [--ids arm,hand]
 *     [--widths 1280,390] [--record file.json] [--shots dir] [--fixture] [--layout off]
 *
 * Runs the step sweep on /how-robots-work/: for each explainer it loads #<id>, steps from the first
 * step to the last with Next, answering the guess and reading its reveal, then back to the first with
 * Back, at 1280 x 800 and at 390 x 844 with touch. At every settled step it reads each visible stage
 * label (the anchored labels, the interaction prompt and the part card) and fails when two of their
 * boxes intersect, or a box runs past the stage or is clipped by an ancestor. Each message names the
 * explainer, step, width and labels.
 *
 * --fixture puts two labels on one anchor and one beyond the stage edge on the open stage instead.
 * --layout off plants the mutation: the kit's label layout is swapped for the bare placement above
 * each anchor, with no clamp and no push-apart, so the check has to fail.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { EXPLAINER_ORDER } from '../components/explainers/catalog.ts';
import { labelProblems, type StageLabel } from '../lib/explainer-labels.ts';
import { serveExport } from '../lib/visual-capture.ts';
import { PLAYWRIGHT_SWIFTSHADER_ARGS } from '../playwright.config.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const fixture = args.includes('--fixture');
const ids = option('--ids', fixture ? 'arm' : EXPLAINER_ORDER.map(({ id }) => id).join(',')).split(',');
const unknown = ids.filter((id) => !EXPLAINER_ORDER.some((entry) => entry.id === id));
if (unknown.length) throw new Error(`check-explainer-labels: unknown explainer ${unknown.join(', ')}`);
const widths = option('--widths', '1280,390').split(',').map(Number);
const VIEWPORTS: Record<number, { height: number; touch: boolean }> = {
  1280: { height: 800, touch: false },
  390: { height: 844, touch: true },
};
if (widths.some((width) => !VIEWPORTS[width])) throw new Error('check-explainer-labels: --widths takes 1280 and 390');
const record = option('--record', '');
const shots = option('--shots', '');
const layoutOff = option('--layout', 'on') === 'off';

type Visit = { explainer: string; step: string; width: number; labels: StageLabel[]; problems: string[] };
const visits: Visit[] = [];

// Runs in the page: every visible stage label, as boxes relative to the stage.
function readStage(): { width: number; height: number; labels: StageLabel[] } {
  const stage = document.querySelector('[data-x="stage"]') as HTMLElement;
  const frame = stage.getBoundingClientRect();
  const shown = (el: HTMLElement) => {
    if (el.hidden || !el.textContent?.trim()) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.05;
  };
  const clipper = (box: DOMRect) => {
    for (let at = stage.parentElement; at && at !== document.documentElement; at = at.parentElement) {
      const style = getComputedStyle(at);
      if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
      const r = at.getBoundingClientRect();
      if (box.left < r.left - 0.5 || box.top < r.top - 0.5 || box.right > r.right + 0.5 || box.bottom > r.bottom + 0.5) {
        return `${at.tagName.toLowerCase()}${at.classList.length ? `.${at.classList[0]}` : ''}`;
      }
    }
    return null;
  };
  const column = stage.closest('[data-x="explainer"]') ?? stage;
  const kinds = [['.tag', 'label'], ['[data-hint]', 'prompt'], ['[data-card]', 'card']] as const;
  const labels: StageLabel[] = [];
  for (const [selector, kind] of kinds) {
    for (const el of column.querySelectorAll<HTMLElement>(selector)) {
      if (!shown(el)) continue;
      const box = el.getBoundingClientRect();
      const over = box.right > frame.left && box.left < frame.right && box.bottom > frame.top && box.top < frame.bottom;
      if (kind === 'card' && !over) continue;
      labels.push({ kind, text: el.textContent!.trim(), x: box.left - frame.left, y: box.top - frame.top,
        w: box.width, h: box.height, clippedBy: clipper(box) });
    }
  }
  return { width: frame.width, height: frame.height, labels };
}

type Hook = { ready: boolean; busy: boolean; moving?: boolean; steps: number };

async function settle(page: Page) {
  await page.waitForFunction(() => {
    const h = (window as unknown as { __explainer?: Hook }).__explainer;
    const predict = document.querySelector<HTMLElement>('[data-predict]');
    return Boolean(h?.ready) && (!h!.busy || predict?.hidden === false) && !h!.moving;
  }, undefined, { timeout: 120_000, polling: 100 });
  // Labels fade in over 0.2 s and are placed on the next frame.
  await page.waitForTimeout(800);
}

async function visit(page: Page, explainer: string, step: string, width: number) {
  await settle(page);
  const { labels, ...stage } = await page.evaluate(readStage);
  const problems = labelProblems(labels, stage);
  visits.push({ explainer, step, width, labels, problems });
  for (const problem of problems) console.log(`explainer-labels: #${explainer} step ${step} at ${width} px: ${problem}`);
  if (shots) {
    const file = join(shots, `${explainer}-${width}-s${step.replace(/[^a-z0-9]+/gi, '-')}.png`);
    // Centred, so the sticky site header never sits over the stage in the capture.
    await page.evaluate(() => document.querySelector('[data-x="stage"]')!.scrollIntoView({ block: 'center' }));
    await page.locator('[data-x="stage"]').screenshot({ path: file, animations: 'disabled' });
  }
}

// The planted mutation: each label sits centred above its anchor, as before the layout, unclamped.
async function plantLayoutOff(page: Page) {
  await page.evaluate(() => {
    const stage = (window as unknown as { __explainer: { stage: Record<string, unknown> & { invalidate?: () => void } } }).__explainer.stage;
    stage.layoutLabels = (items: { ax: number; ay: number; w: number; h: number }[]) =>
      items.map(({ ax, ay, w, h }) => ({ box: { x: ax - w / 2, y: ay - 10 - h, w, h }, leader: null }));
    stage.invalidate?.();
  });
}

// Two labels on one anchor at the centre of view, and one whose anchor lies beyond the right edge.
async function plantFixture(page: Page) {
  await page.evaluate(() => {
    type V = { clone: () => V; setFromMatrixColumn: (m: unknown, i: number) => V; addScaledVector: (v: V, s: number) => V; distanceTo: (v: V) => number };
    const stage = (window as unknown as { __explainer: { stage: {
      controls: { target: V }; camera: { matrixWorld: unknown; position: V };
      label: (text: string, at: V) => unknown; invalidate?: () => void } } }).__explainer.stage;
    const target = stage.controls.target.clone();
    const right = target.clone().setFromMatrixColumn(stage.camera.matrixWorld, 0);
    const beyond = target.clone().addScaledVector(right, 3 * stage.camera.position.distanceTo(target));
    stage.label('Fixture: first on the anchor', target);
    stage.label('Fixture: second on the anchor', target);
    stage.label('Fixture: anchor beyond the edge', beyond);
    stage.invalidate?.();
  });
}

async function sweep(page: Page, explainer: string, width: number) {
  const steps = await page.evaluate(() => (window as unknown as { __explainer: Hook }).__explainer.steps);
  for (let i = 0; i < steps; i += 1) {
    await settle(page);
    const predict = page.locator('[data-predict]');
    if (await predict.isVisible()) {
      await visit(page, explainer, `${i + 1} guess`, width);
      await predict.locator('.opts button').first().click();
      await visit(page, explainer, `${i + 1} reveal`, width);
    } else {
      await visit(page, explainer, `${i + 1}`, width);
    }
    if (i < steps - 1) await page.locator('[data-x="next"]').click();
  }
  for (let i = steps - 2; i >= 0; i -= 1) {
    await page.locator('[data-x="prev"]').click();
    await visit(page, explainer, `${i + 1} back`, width);
  }
}

const served = option('--base-url', '') ? null : await serveExport(resolve(option('--out', 'out')), 0);
const base = option('--base-url', '') || served!.base;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ args: [...PLAYWRIGHT_SWIFTSHADER_ARGS] });
const errors: string[] = [];
try {
  for (const width of widths) {
    const { height, touch } = VIEWPORTS[width];
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1,
      hasTouch: touch, isMobile: touch, reducedMotion: 'no-preference' });
    for (const explainer of ids) {
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`#${explainer} at ${width} px: ${error.message}`));
      await page.goto(`${base}/how-robots-work/#${explainer}`, { waitUntil: 'load', timeout: 120_000 });
      await settle(page);
      if (layoutOff) await plantLayoutOff(page);
      if (fixture) {
        await plantFixture(page);
        await visit(page, explainer, 'fixture', width);
      } else {
        await sweep(page, explainer, width);
      }
      console.log(`explainer-labels: #${explainer} at ${width} px swept`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  served?.server.close();
}

if (record) {
  mkdirSync(dirname(record), { recursive: true });
  writeFileSync(record, `${JSON.stringify({ base: served ? 'export' : base, layout: layoutOff ? 'off' : 'on', fixture, visits }, null, 2)}\n`);
}
for (const error of errors) console.log(`explainer-labels: page error ${error}`);
const failing = visits.filter(({ problems }) => problems.length);
const total = failing.reduce((sum, { problems }) => sum + problems.length, 0);
if (total || errors.length) {
  console.log(`explainer-labels: FAIL, ${total} problem(s) at ${failing.length} of ${visits.length} settled step(s)${errors.length ? `, ${errors.length} page error(s)` : ''}`);
  process.exit(1);
}
console.log(`explainer-labels: ok, ${visits.length} settled step(s) across ${ids.length} explainer(s) at ${widths.join(' and ')} px, no overlap or clipping`);
