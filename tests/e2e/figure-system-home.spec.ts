import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { forEachInOwnContext } from './helpers/per-route-context';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Home figures at settle (VAL-OPUS-009, VAL-OPUS-006) and the placements of
 * the two named duplicate concepts over every Sitemap URL (VAL-OPUS-011),
 * on the static export. Tables and captures go to
 * FIGURE_SYSTEM_EVIDENCE_OUT, or to the test's output folder, before the
 * assertions run, so a run over an older export (FIGURE_SYSTEM_EXPORT_ROOT)
 * still records its placements.
 */
const EXPORT_ROOT = process.env.FIGURE_SYSTEM_EXPORT_ROOT ?? 'out';
let server: StaticExportServer;
test.beforeAll(async () => {
  server = await startStaticExportServer(EXPORT_ROOT);
});
test.afterAll(async () => {
  await server.stop();
});

function evidenceDir(outputDir: string): string {
  const dir = process.env.FIGURE_SYSTEM_EVIDENCE_OUT ?? outputDir;
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function settle(page: Page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
}

/** Per frame: its parts, caption words, drawn marks and largest empty band. */
function readFrames() {
  const painted = 'path, line, rect, circle, ellipse, polyline, polygon, text, image, use, img, canvas';
  return [...document.querySelectorAll<HTMLElement>('main [data-figure-frame]')].map((frame) => {
    const stage = frame.querySelector<HTMLElement>('[data-figure-stage]');
    const caption = frame.querySelector('[data-figure-caption]')?.textContent?.trim() ?? '';
    const box = stage?.getBoundingClientRect();
    const spans: [number, number][] = [];
    if (stage && box) {
      const add = (r: DOMRect) => {
        if (r.width < 0.5 || r.height < 0.5) return;
        if (r.height >= box.height * 0.9 && r.width >= box.width * 0.9) return;
        spans.push([Math.max(r.top, box.top), Math.min(r.bottom, box.bottom)]);
      };
      stage.querySelectorAll(painted).forEach((el) => add(el.getBoundingClientRect()));
      const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        [...range.getClientRects()].forEach(add);
      }
      stage.querySelectorAll('button, input, select').forEach((el) => add(el.getBoundingClientRect()));
    }
    spans.sort((a, b) => a[0] - b[0]);
    let cursor = box?.top ?? 0; let gap = 0;
    for (const [top, bottom] of spans) {
      gap = Math.max(gap, top - cursor);
      cursor = Math.max(cursor, bottom);
    }
    if (box) gap = Math.max(gap, box.bottom - cursor);
    return {
      figure: frame.getAttribute('data-figure-frame'),
      title: frame.querySelector('[data-figure-title]')?.textContent?.trim() ?? '',
      stage: !!stage, captionWords: caption ? caption.split(/\s+/).length : 0,
      marks: stage?.querySelectorAll(painted).length ?? 0,
      stageHeight: Math.round(box?.height ?? 0),
      emptyBand: box ? Math.round((gap / box.height) * 1000) / 1000 : 1,
    };
  });
}

/**
 * Per frame: every visible text run with its part, family and painted size.
 * Stage svg text is sized in viewBox units, so its size is multiplied by the
 * scale the svg is drawn at. Typeset maths and screen-reader text are left out.
 */
function readFonts() {
  return [...document.querySelectorAll<HTMLElement>('main [data-figure-frame]')].map((frame) => {
    const runs: { part: string; family: string; px: number; text: string }[] = [];
    const walker = document.createTreeWalker(frame, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      const text = node.textContent?.trim() ?? '';
      if (!el || !text || el.closest('.katex, .sr-only') || !el.checkVisibility()) continue;
      const style = getComputedStyle(el);
      const ctm = el instanceof SVGGraphicsElement ? el.getScreenCTM() : null;
      const px = parseFloat(style.fontSize) * (ctm ? Math.hypot(ctm.a, ctm.b) : 1);
      const part = el.closest('[data-figure-stage]') ? 'stage' : el.closest('[data-figure-caption]') ? 'caption'
        : el.closest('[data-figure-source]') ? 'source' : el.closest('[data-figure-header]') ? 'header' : 'other';
      runs.push({ part, family: style.fontFamily.split(',')[0].replace(/["']/g, '').trim(), px: Math.round(px * 10) / 10, text: text.slice(0, 40) });
    }
    return { figure: frame.getAttribute('data-figure-frame'), runs };
  });
}

/**
 * Per frame: the role each stage mark paints with, resolved against the
 * role and stage tokens the page declares, and every use of a reserved
 * colour (signal blue or a status colour) anywhere in the frame.
 */
function readRoles() {
  const hex = (value: string) => {
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return value.trim().toUpperCase();
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (p.length > 3 && p[3] === 0) return null;
    return `#${p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  };
  // Resolved through a probe so #fff and #FFFFFF, or a var() chain, compare equal.
  const probe = document.body.appendChild(document.createElement('span'));
  const token = (name: string) => { probe.style.color = `var(${name})`; return hex(getComputedStyle(probe).color) ?? name; };
  const names = new Map<string, string>();
  for (const role of ['state', 'measurement', 'action', 'value', 'constraint', 'reference', 'highlight']) names.set(token(`--role-${role}-stage`), role);
  // Concrete is both the reference role and the stage structure (axes, grid, secondary labels).
  names.set(token('--color-concrete'), 'reference or structure');
  for (const [name, label] of [['--color-graphite', 'stage ground'], ['--color-white', 'structure (white)'], ['--color-ink', 'ink']]) if (!names.has(token(name))) names.set(token(name), label);
  const reserved = new Map([['--color-signal', 'signal'], ['--color-ok', 'ok'], ['--color-warn', 'warn'], ['--color-error', 'error']].map(([name, label]) => [token(name), label]));
  probe.remove();
  return [...document.querySelectorAll<HTMLElement>('main [data-figure-frame]')].map((frame) => {
    const marks: Record<string, number> = {};
    const uses: { tag: string; property: string; colour: string; use: string }[] = [];
    frame.querySelectorAll('[data-figure-stage] :is(path, line, rect, circle, ellipse, polyline, polygon)').forEach((el) => {
      const style = getComputedStyle(el);
      for (const property of ['fill', 'stroke'] as const) {
        // A line has no interior: its default black fill never paints.
        if (property === 'fill' && el.tagName.toLowerCase() === 'line') continue;
        const colour = style[property] === 'none' ? null : hex(style[property]);
        if (!colour) continue;
        const role = reserved.get(colour) ?? names.get(colour) ?? `unregistered ${colour}`;
        marks[role] = (marks[role] ?? 0) + 1;
      }
    });
    frame.querySelectorAll('*').forEach((el) => {
      const style = getComputedStyle(el);
      for (const property of ['color', 'fill', 'stroke', 'background-color', 'border-top-color'] as const) {
        const colour = hex(style.getPropertyValue(property));
        const name = colour && reserved.get(colour);
        if (!name || (property === 'color' && el instanceof SVGElement) || (property === 'border-top-color' && parseFloat(style.borderTopWidth) === 0)) continue;
        uses.push({ tag: el.tagName.toLowerCase(), property, colour: name, use: el.closest('a[href]') ? 'link' : el.closest('[data-figure-status]') ? 'status' : 'mark' });
      }
    });
    return { figure: frame.getAttribute('data-figure-frame'), marks, reserved: uses };
  });
}

for (const width of [375, 1440]) {
  test(`home figures show their real content on the frame at ${width}px (VAL-OPUS-009, VAL-OPUS-003 to 006)`, async ({ browser }, info) => {
    test.setTimeout(90_000);
    const dir = evidenceDir(info.outputDir);
    const skeleton = 'main .animate-pulse, main [data-skeleton], main [aria-busy="true"]';
    const firstPaint = await browser.newPage({ viewport: { width, height: 900 }, javaScriptEnabled: false });
    await firstPaint.goto(`http://localhost:${server.port}/`);
    await firstPaint.screenshot({ path: join(dir, `home-first-paint-${width}.jpg`), fullPage: true, type: 'jpeg', quality: 80 });
    const firstPaintSkeletons = await firstPaint.locator(skeleton).count();
    const posters = await firstPaint.evaluate(readFrames);
    await firstPaint.close();

    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`http://localhost:${server.port}/`, { waitUntil: 'networkidle' });
    await settle(page);
    await page.screenshot({ path: join(dir, `home-settle-${width}.jpg`), fullPage: true, type: 'jpeg', quality: 80 });
    const settleSkeletons = await page.locator(skeleton).count();
    const frames = await page.evaluate(readFrames);
    const fonts = await page.evaluate(readFonts);
    const roles = await page.evaluate(readRoles);
    await page.close();
    writeFileSync(join(dir, `home-frames-${width}.json`), `${JSON.stringify(frames, null, 1)}\n`);
    writeFileSync(join(dir, `home-fonts-${width}.json`), `${JSON.stringify(fonts, null, 1)}\n`);
    writeFileSync(join(dir, `home-roles-${width}.json`), `${JSON.stringify(roles, null, 1)}\n`);
    // VAL-OPUS-009: what each frame shows at settle is the poster it painted before any script ran.
    const posterRows = frames.map((f) => {
      const p = posters.find((x) => x.figure === f.figure);
      return { figure: f.figure, title: f.title, settle: { marks: f.marks, captionWords: f.captionWords }, firstPaint: p ? { title: p.title, marks: p.marks, captionWords: p.captionWords } : null };
    });
    writeFileSync(join(dir, `home-poster-vs-first-paint-${width}.json`), `${JSON.stringify(posterRows, null, 1)}\n`);
    // VAL-OPUS-003/004: stage marks paint only role or structure colours; reserved colours only on links.
    const offRole = roles.flatMap((r) => Object.keys(r.marks).filter((m) => m.startsWith('unregistered') || ['signal', 'ok', 'warn', 'error'].includes(m)).map((m) => `${r.figure} ${m}`));
    expect(offRole, 'stage marks outside the role palette').toEqual([]);
    const misused = roles.flatMap((r) => r.reserved.filter((u) => !(u.colour === 'signal' && u.use === 'link') && u.use !== 'status').map((u) => `${r.figure} <${u.tag}> ${u.property} ${u.colour}`));
    expect(misused, 'reserved colours off links and status marks').toEqual([]);
    expect(firstPaintSkeletons, 'skeletons before any script runs').toBe(0);
    expect(settleSkeletons, 'skeletons at settle').toBe(0);
    // VAL-OPUS-005: sans at 12px or more, three sizes across every home figure, mono only on numbers.
    const runs = fonts.flatMap((f) => f.runs.map((r) => ({ ...r, figure: f.figure })));
    expect(runs.filter((r) => r.px < 12).map((r) => `${r.figure} ${r.part} ${r.px}px "${r.text}"`), 'text under 12px').toEqual([]);
    const sizes = [...new Set(runs.map((r) => r.px))].sort((a, b) => a - b);
    expect(sizes.length, `figure text sizes ${sizes.join(', ')}`).toBeLessThanOrEqual(3);
    expect(runs.filter((r) => !/^IBM Plex (Sans|Mono)$/.test(r.family)).map((r) => `${r.figure} ${r.family} "${r.text}"`), 'faces').toEqual([]);
    // A readout's unit or sign can be its own text run beside the digits ("220", "°").
    const unitOnly = /^[\s°%′″'"+\-−–±×·/.,:;()µμA-Za-z]{1,3}$/;
    const wordy = runs.filter((r) => r.family === 'IBM Plex Mono' && (/[A-Za-z]{4,}/.test(r.text) || (!/\d/.test(r.text) && !unitOnly.test(r.text))));
    expect(wordy.map((r) => `${r.figure} "${r.text}"`), 'mono on non-numeric text').toEqual([]);
    // Home's one figure is the featured scene (VAL-OPUS-017, VAL-OPUS-021).
    expect(frames.map((frame) => frame.figure)).toEqual(['scene:reliability-threshold']);
    for (const frame of frames) {
      expect(frame.title, `${frame.figure} title`).not.toBe('');
      expect(frame.stage, `${frame.figure} stage`).toBe(true);
      expect(frame.captionWords, `${frame.figure} caption words`).toBeGreaterThan(0);
      expect(frame.captionWords, `${frame.figure} caption words`).toBeLessThanOrEqual(20);
      expect(frame.marks, `${frame.figure} drawn marks`).toBeGreaterThanOrEqual(3);
      expect(frame.emptyBand, `${frame.figure} largest empty band`).toBeLessThanOrEqual(0.2);
    }
    for (const row of posterRows) {
      expect(row.firstPaint?.title, `${row.figure} poster at first paint`).toBe(row.title);
      expect(row.firstPaint?.marks ?? 0, `${row.figure} poster marks at first paint`).toBeGreaterThanOrEqual(3);
    }
  });
}

const CONCEPTS = [
  { name: 'episode-success chart', selector: 'svg[aria-label^="Line chart of episode success"]', canonical: '/data-hardware/evaluation-crisis/' },
  // The scene's own hook, not its frame's, so a run over the pre-frame export still finds it.
  // It left /frontier/reliability-gap/, where the calculator presets carry its beats (VAL-OPUS-131).
  { name: 'reliability-threshold scene', selector: '[data-motion-scene="reliability-threshold"]', canonical: '/' },
];
/** Repeats a later pass owns by name; an entry that stops repeating fails, so this only shrinks. */
const KNOWN_REPEATS: Record<string, string> = {};

test('each named concept has one canonical visual and every other placement links to it (VAL-OPUS-011)', async ({ browser }, info) => {
  test.setTimeout(180_000);
  const routes = [...readFileSync(join(EXPORT_ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const placements: { concept: string; route: string; index: number; canonical: boolean; caption: string | null; link: string | null }[] = [];
  await forEachInOwnContext(browser, routes, async (page, route) => {
    await page.goto(`http://localhost:${server.port}${route}`, { waitUntil: 'domcontentloaded' });
    for (const concept of CONCEPTS) {
      const found = await page.evaluate(({ selector, canonical }) => [...document.querySelectorAll(`main ${selector}`)].map((el) => {
        const mount = el.closest('[data-figure-frame], [data-brand-module-signature="instrument-frame"]') ?? el;
        const reuse = mount.nextElementSibling?.closest(`[data-figure-reuse="${canonical}"]`)?.textContent?.trim() ?? null;
        const source = mount.querySelector(`[data-figure-source] a[href="${canonical}"]`)?.closest('[data-figure-source]')?.textContent?.trim() ?? null;
        // An instrument frame has no caption slot; its chart description names the placement's purpose.
        const caption = mount.querySelector('[data-figure-caption], figcaption, [data-chart-description]')?.textContent?.trim().replace(/\s+/g, ' ') ?? null;
        return { caption, link: reuse ?? source };
      }), concept);
      found.forEach((hit, index) => placements.push({ concept: concept.name, route, index, canonical: route === concept.canonical, caption: hit.caption, link: hit.link }));
    }
  });
  writeFileSync(join(evidenceDir(info.outputDir), 'duplicate-placements.json'), `${JSON.stringify({ placements, knownRepeats: KNOWN_REPEATS }, null, 1)}\n`);
  for (const concept of CONCEPTS) {
    expect(placements.filter((p) => p.concept === concept.name && p.canonical).length, `${concept.name} canonical`).toBeGreaterThan(0);
  }
  const unlinked = placements.filter((p) => !p.canonical && !p.link).map((p) => `${p.concept} on ${p.route}`);
  expect(unlinked, 'placements with neither a link nor a stated purpose').toEqual([]);
  const repeats = [...new Set(placements.filter((p) => p.index > 0).map((p) => `${p.concept} ${p.route}`))];
  expect(repeats.sort(), 'pages that repeat a visual').toEqual(Object.keys(KNOWN_REPEATS).sort());
});
