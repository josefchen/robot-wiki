/**
 * The explainer noise and landing audit (VAL-OPUS-041 (c) and (i), VAL-OPUS-042, VAL-OPUS-044).
 *
 *   node scripts/audit-explainers.ts [--out out | --base-url URL] [--ids arm,hand] [--widths 1280,390]
 *     [--record file.json] [--shots dir] [--landing dir] [--motion reduce]
 *
 * Steps each explainer forward from the first step to the last, answering the guess and reading its
 * reveal, at 1280 x 800 and 390 x 844 with touch. At every settled step it records the step text's
 * word count, the visible anchored labels and their tones, the visible controls, the role colours on
 * the stage, the projected box of the subject the step names (the kit's `focus`), and whether the
 * stage changes over the 2 s after settle. --shots writes the teach-back frames: the explainer column
 * at each step, with the takeaway sentence hidden and the self-check answer closed. --landing writes
 * the stage at each step with the subject box and the central half drawn. Exits non-zero when a step
 * runs over the budget (more than 25 words, 3 anchored labels, 2 controls, or one non-failure colour
 * across the stage pixels and the label tones; fewer than 3 or more than 5 steps) or lands badly (no
 * subject, a subject box that leaves the stage, or a subject centre outside the central half). Stage
 * motion after settle is reported for a reader to judge against the step text.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import sharp from 'sharp';
import { EXPLAINER_ORDER } from '../components/explainers/catalog.ts';
import { serveExport } from '../lib/visual-capture.ts';
import { PLAYWRIGHT_SWIFTSHADER_ARGS } from '../playwright.config.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const ids = option('--ids', EXPLAINER_ORDER.map(({ id }) => id).join(',')).split(',');
const widths = option('--widths', '1280,390').split(',').map(Number);
const VIEWPORTS: Record<number, { height: number; touch: boolean }> = { 1280: { height: 800, touch: false }, 390: { height: 844, touch: true } };
const record = option('--record', '');
const shots = option('--shots', '');
const reduced = option('--motion', 'no-preference') === 'reduce';

type Box = { x: number; y: number; w: number; h: number };
type Step = { explainer: string; width: number; step: string; text: string; words: number; labels: string[];
  tones: string[]; controls: string[]; colours: Record<string, number>; subject: Box | null; stage: { w: number; h: number };
  moves: boolean; shot?: string; landing?: string };
const steps: Step[] = [];
const problems: string[] = [];
const landing = option('--landing', '');

type Hook = { ready: boolean; live?: boolean; busy: boolean; moving?: boolean; steps: number; subject?: Box | null; start?: () => void };

// The role colours of explainers.css (motion-tokens.json roles). `focus` is the highlight lime.
const ROLES: Record<string, [number, number, number]> = {
  focus: [0xc6, 0xff, 0x19], fail: [0xcb, 0x3b, 0x32], ok: [0x56, 0x79, 0x3d], sense: [0x8e, 0x6a, 0x00], act: [0x86, 0x62, 0x99],
};
const hsl = ([r, g, b]: number[]) => {
  const [R, G, B] = [r / 255, g / 255, b / 255], max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 2, d = max - min;
  if (d < 1e-6) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: h * 60, s, l };
};
const ROLE_HUES = Object.entries(ROLES).map(([role, rgb]) => ({ role, ...hsl(rgb) }));
// Share of the stage, per role, of clearly coloured pixels whose hue lies nearest that role's hue.
// A pixel counts only when its four neighbours share its role, so the one- and two-pixel blends
// along the edge of a lime part, whose hue drifts towards the neighbouring roles, are not read as
// a second colour.
async function colourCensus(png: Buffer) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const roleOf = new Int8Array(width * height).fill(-1);
  let total = 0;
  for (let p = 0; p < width * height; p += 1) {
    const i = p * channels;
    if (channels === 4 && data[i + 3] < 128) continue;
    total += 1;
    const { h, s, l } = hsl([data[i], data[i + 1], data[i + 2]]);
    if (s < 0.12 || l < 0.12 || l > 0.92) continue;
    let best = 0, gap = 360;
    ROLE_HUES.forEach((r, k) => { const dh = Math.min(Math.abs(h - r.h), 360 - Math.abs(h - r.h)); if (dh < gap) { gap = dh; best = k; } });
    // The act purple and the ok green are muted (saturation 0.22 and 0.33), so each role is held to
    // about half its own saturation rather than to one floor that would never see them.
    if (gap <= 14 && s >= Math.min(0.35, 0.55 * ROLE_HUES[best].s)) roleOf[p] = best;
  }
  const counts: Record<string, number> = {};
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const p = y * width + x, k = roleOf[p];
      if (k < 0 || roleOf[p - 1] !== k || roleOf[p + 1] !== k || roleOf[p - width] !== k || roleOf[p + width] !== k) continue;
      counts[ROLE_HUES[k].role] = (counts[ROLE_HUES[k].role] ?? 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, Number((n / Math.max(1, total)).toFixed(4))]).filter(([, f]) => (f as number) >= 0.002));
}
async function settle(page: Page) {
  // A stage scrolled out of view pauses its scene, and a paused step never settles.
  await page.evaluate(() => document.querySelector('[data-x="stage"]')?.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => {
    const h = (window as unknown as { __explainer?: Hook }).__explainer;
    const predict = document.querySelector<HTMLElement>('[data-predict]');
    return Boolean(h?.ready && h.live !== false) && (!h!.busy || predict?.hidden === false) && !h!.moving;
  }, undefined, { timeout: 120_000, polling: 100 });
  await page.waitForTimeout(800);
}

// Runs in the page: what the reader sees on the stage and in the controls at this step.
function readStep() {
  const shown = (el: Element) => {
    const style = getComputedStyle(el);
    return !(el as HTMLElement).hidden && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.05
      && (el as HTMLElement).offsetParent !== null;
  };
  const tags = [...document.querySelectorAll('[data-x="stage"] .tag')].filter(shown);
  const controls = [...document.querySelectorAll('[data-controls] .ctl')].filter(shown);
  return {
    text: document.querySelector('[data-x="stepText"]')?.textContent?.trim() ?? '',
    labels: tags.map((t) => t.textContent!.trim()),
    tones: tags.map((t) => [...t.classList].find((c) => c.startsWith('tone-'))!.slice(5)),
    controls: controls.map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim()),
  };
}

// The skip link sits off screen until focused, but an element screenshot of the explainer still paints it.
const TEACH_BACK_CSS = `[data-x="summary"] .sentence, [data-explainer-fold], .pager, [data-explainer-words], .skip-link { display: none !important; }`;
// The site header sticks to the top of the viewport; captures scrolled under it would show it over the stage.
const UNSTICK_CSS = 'header.sticky { position: static !important; }';

async function visit(page: Page, explainer: string, width: number, step: string) {
  await settle(page);
  const canvas = page.locator('[data-x="stage"] canvas');
  const first = await canvas.screenshot({ animations: 'allow' });
  await page.waitForTimeout(2000);
  const second = await canvas.screenshot({ animations: 'allow' });
  const seen = await page.evaluate(readStep);
  const where = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-x="stage"]')!;
    return { subject: (window as unknown as { __explainer: Hook }).__explainer.subject ?? null, stage: { w: el.clientWidth, h: el.clientHeight } };
  });
  const entry: Step = { explainer, width, step, ...seen, ...where, colours: await colourCensus(second),
    words: seen.text.split(/\s+/).filter(Boolean).length, moves: !first.equals(second) };
  const name = `${width}-s${step.replace(/[^a-z0-9]+/gi, '-')}.png`;
  if (shots) {
    entry.shot = join(shots, explainer, name);
    mkdirSync(dirname(entry.shot), { recursive: true });
    await page.locator('[data-x="explainer"]').screenshot({ path: entry.shot, animations: 'disabled' });
  }
  if (landing && entry.subject) {
    entry.landing = join(landing, explainer, name);
    mkdirSync(dirname(entry.landing), { recursive: true });
    await page.evaluate((b) => {
      const box = document.createElement('div');
      box.id = 'audit-subject-box';
      box.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;outline:2px dashed #245fff;pointer-events:none;z-index:9`;
      const mid = document.createElement('div');
      mid.style.cssText = 'position:absolute;left:25%;top:25%;width:50%;height:50%;outline:1px dotted #6e6f70;pointer-events:none;z-index:9';
      mid.id = 'audit-central-half';
      document.querySelector('[data-x="stage"]')!.append(box, mid);
    }, entry.subject);
    await page.locator('[data-x="stage"]').screenshot({ path: entry.landing, animations: 'disabled' });
    await page.evaluate(() => { document.getElementById('audit-subject-box')?.remove(); document.getElementById('audit-central-half')?.remove(); });
  }
  steps.push(entry);
  const at = `#${explainer} step ${step} at ${width} px`;
  if (entry.words > 25) problems.push(`${at}: the step text has ${entry.words} words (25 at most)`);
  if (entry.labels.length > 3) problems.push(`${at}: ${entry.labels.length} anchored labels (3 at most): ${entry.labels.join(', ')}`);
  if (entry.controls.length > 2) problems.push(`${at}: ${entry.controls.length} controls (2 at most): ${entry.controls.join(' / ')}`);
  // A label's tone is a colour on the stage too, and a thin arrow can be too small for the census.
  const hues = [...new Set([...Object.keys(entry.colours), ...entry.tones.filter((tone) => tone !== 'plain')])].filter((role) => role !== 'fail');
  if (hues.length > 1) problems.push(`${at}: ${hues.length} non-failure colours on the stage and its labels (1 at most): ${hues.join(', ')}`);
  const b = entry.subject, { w, h } = entry.stage;
  if (!b) problems.push(`${at}: the step names no subject for the camera`);
  else {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (b.x < -1 || b.y < -1 || b.x + b.w > w + 1 || b.y + b.h > h + 1) problems.push(`${at}: the subject box ${fmt(b)} leaves the ${w} x ${h} stage`);
    if (cx < w / 4 || cx > (3 * w) / 4 || cy < h / 4 || cy > (3 * h) / 4) problems.push(`${at}: the subject centre (${Math.round(cx)}, ${Math.round(cy)}) is outside the central half`);
  }
  console.log(`audit: ${at}: ${entry.words} words, ${entry.labels.length} labels, ${entry.controls.length} controls, colours ${Object.keys(entry.colours).join('+') || 'none'}, label tones ${entry.tones.join('+') || 'none'}, subject ${b ? fmt(b) : 'none'}${entry.moves ? ', stage moves after settle' : ''}`);
}
const fmt = (b: Box) => `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}x${Math.round(b.h)}`;

const served = option('--base-url', '') ? null : await serveExport(resolve(option('--out', 'out')), 0);
const base = option('--base-url', '') || served!.base;
const browser = await chromium.launch({ args: [...PLAYWRIGHT_SWIFTSHADER_ARGS] });
try {
  for (const width of widths) {
    const { height, touch } = VIEWPORTS[width];
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: touch,
      isMobile: touch, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    for (const explainer of ids) {
      const page = await context.newPage();
      page.on('pageerror', (error) => problems.push(`#${explainer} at ${width} px: page error ${error.message}`));
      await page.goto(`${base}/how-robots-work/#${explainer}`, { waitUntil: 'load', timeout: 120_000 });
      await page.addStyleTag({ content: UNSTICK_CSS });
      if (shots) await page.addStyleTag({ content: TEACH_BACK_CSS });
      // Under reduced motion the poster stays until the reader presses Start.
      if (reduced) await page.locator('[data-x="start"]').click();
      await settle(page);
      const count = await page.evaluate(() => (window as unknown as { __explainer: Hook }).__explainer.steps);
      if (count < 3 || count > 5) problems.push(`#${explainer}: ${count} steps (3 to 5)`);
      for (let i = 0; i < count; i += 1) {
        await settle(page);
        const predict = page.locator('[data-predict]');
        if (await predict.isVisible()) {
          await visit(page, explainer, width, `${i + 1} guess`);
          await predict.locator('.opts button').first().click();
          await visit(page, explainer, width, `${i + 1} reveal`);
        } else {
          await visit(page, explainer, width, `${i + 1}`);
        }
        if (i < count - 1) await page.locator('[data-x="next"]').click();
      }
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
  writeFileSync(record, `${JSON.stringify({ motion: reduced ? 'reduce' : 'no-preference', steps }, null, 2)}\n`);
}
for (const problem of problems) console.log(`audit: ${problem}`);
if (problems.length) {
  console.log(`audit: FAIL, ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`audit: ok, ${steps.length} settled step(s) within the noise budget`);
