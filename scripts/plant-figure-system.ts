/**
 * Mutation proof for the figure-system check: plants one defect of each rule
 * class into a copy of the built export, and requires the check to fail on
 * every plant, naming the planted rule, and to pass on the unplanted copy.
 *
 *   node scripts/plant-figure-system.ts [--root out]
 *
 * The plants go into the first framed chart the export serves that has no
 * allowlist entry, so they follow the pages as they change. The export
 * itself is never written; the copy lives in a temporary folder.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { FIGURE_RULES, figureName, type FigureRule } from '../lib/figure-system-check.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--root');
const root = at >= 0 && args[at + 1] ? args[at + 1] : 'out';
const allowlisted = new Set(
  (JSON.parse(readFileSync('contract/figure-system-allowlist.json', 'utf8')).entries as { route: string; figure: string }[])
    .map(({ route, figure }) => `${route} ${figure}`),
);

const SVG_NS = 'http://www.w3.org/2000/svg';
const FRAME = 'main figure[data-figure-frame]';
const stageSvg = (frame: Element) => frame.querySelector(':scope > [data-figure-stage] svg') as Element;
const caption = (frame: Element) => frame.querySelector(':scope > [data-figure-caption]') as Element;
const title = (frame: Element) => frame.querySelector(':scope > [data-figure-header] [data-figure-title]') as Element;
const wordRun = (n: number) => Array.from({ length: n }, (_, i) => `word${i + 1}`).join(' ');
const svgEl = (document: Document, tag: string, attrs: Record<string, string>, text = '') => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  el.textContent = text;
  return el;
};
const htmlEl = (document: Document, tag: string, attrs: Record<string, string>, text: string) => {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  el.textContent = text;
  return el;
};

const PLANTS: { rule: FigureRule; plant: string; apply: (frame: Element, document: Document) => void }[] = [
  { rule: 'reserved-colour', plant: 'a mark filled with signal blue', apply: (f, d) => stageSvg(f).append(svgEl(d, 'rect', { width: '4', height: '4', fill: 'var(--color-accent)' })) },
  { rule: 'hard-coded-colour', plant: 'a mark filled with #ff00aa', apply: (f, d) => stageSvg(f).append(svgEl(d, 'rect', { width: '4', height: '4', fill: '#ff00aa' })) },
  { rule: 'sub-scale-text', plant: 'a 10 px note on the stage', apply: (f, d) => stageSvg(f).before(htmlEl(d, 'span', { class: 'text-[10px]' }, 'a 10 px note')) },
  {
    rule: 'sub-scale-text',
    plant: 'svg text off the stage scale',
    apply: (f, d) => {
      const svg = svgEl(d, 'svg', { viewBox: '0 0 40 10' });
      svg.append(svgEl(d, 'text', { y: '8' }, 'off the scale'));
      stageSvg(f).before(svg);
    },
  },
  { rule: 'outside-frame', plant: 'the frame hook removed', apply: (f) => f.removeAttribute('data-figure-frame') },
  { rule: 'frame-structure', plant: 'a paragraph between stage and caption', apply: (f, d) => caption(f).before(htmlEl(d, 'p', {}, 'A note between the stage and the caption.')) },
  { rule: 'caption-words', plant: 'a 26-word caption', apply: (f) => { caption(f).textContent = `${wordRun(26)}.`; } },
  { rule: 'legend-off-stage', plant: 'a legend below the stage', apply: (f, d) => caption(f).before(htmlEl(d, 'div', { 'data-figure-legend': '' }, 'Legend')) },
  { rule: 'headline-words', plant: 'an 11-word headline', apply: (f) => { title(f).textContent = wordRun(11); } },
  {
    rule: 'kicker-words',
    plant: 'a 7-word kicker',
    apply: (f, d) => {
      const kicker = f.querySelector(':scope > [data-figure-header] [data-figure-kicker]');
      if (kicker) kicker.textContent = wordRun(7);
      else title(f).before(htmlEl(d, 'div', { 'data-figure-kicker': '' }, wordRun(7)));
    },
  },
  {
    rule: 'fold-label',
    plant: 'a fold labelled "More detail"',
    apply: (f, d) => {
      f.querySelector(':scope > details')?.remove();
      const fold = htmlEl(d, 'details', { 'data-figure-fold': 'method' }, '');
      fold.append(htmlEl(d, 'summary', {}, 'More detail'), htmlEl(d, 'div', {}, 'Method notes.'));
      caption(f).after(fold);
    },
  },
  {
    rule: 'dark-stage',
    plant: 'the stage put back on the graphite plate',
    apply: (f) => f.querySelector(':scope > [data-figure-stage]')?.setAttribute('data-brand-surface-id', 'surface:bounded-dark-instrument'),
  },
  {
    rule: 'dark-stage',
    plant: 'a raised card inside the stage',
    apply: (f, d) => stageSvg(f).before(htmlEl(d, 'div', { 'data-brand-surface-id': 'surface:raised' }, 'A boxed note.')),
  },
];

const copy = mkdtempSync(join(tmpdir(), 'figure-system-plant-'));
try {
  cpSync(root, copy, {
    recursive: true,
    filter: (src) => statSync(src).isDirectory() || src.endsWith('.html') || src.endsWith('sitemap.xml'),
  });
  const routes = [...readFileSync(join(copy, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname);
  const pageFile = (route: string) => (route.endsWith('/') ? join(copy, route, 'index.html') : join(copy, `${route}.html`));
  const target = routes.map((route) => {
    const html = readFileSync(pageFile(route), 'utf8');
    const frames = [...new JSDOM(html).window.document.querySelectorAll(FRAME)];
    const index = frames.findIndex((f) => stageSvg(f) && caption(f) && !allowlisted.has(`${route} ${figureName(f)}`));
    return { route, html, index, name: index >= 0 ? figureName(frames[index]) : '' };
  }).find(({ index }) => index >= 0);
  if (!target) throw new Error('figure-system plant: no framed chart without an allowlist entry in the export');

  const check = () => spawnSync(process.execPath, ['scripts/check-figure-system.ts', '--root', copy], { encoding: 'utf8' });
  const rows: { rule: string; plant: string; exit: number | null; reported: string | null }[] = [];
  for (const { rule, plant, apply } of PLANTS) {
    const dom = new JSDOM(target.html);
    apply(dom.window.document.querySelectorAll(FRAME)[target.index], dom.window.document);
    writeFileSync(pageFile(target.route), dom.serialize());
    const run = check();
    const reported = `${run.stdout}\n${run.stderr}`.split('\n')
      .find((line) => line.startsWith(`figure-system: ${target.route} [`) && line.includes(`] ${rule}: `)) ?? null;
    rows.push({ rule, plant, exit: run.status, reported });
  }
  writeFileSync(pageFile(target.route), target.html);
  const clean = check();
  console.log(`figure-system plant: ${target.route} [${target.name}]`);
  for (const row of rows) console.log(`  ${row.exit} ${row.rule} (${row.plant}): ${row.reported ?? 'NOT REPORTED'}`);
  console.log(`  ${clean.status} clean copy: ${clean.stdout.trim().split('\n').at(-1)}`);
  const missed = rows.filter((row) => row.exit !== 1 || !row.reported);
  const covered = new Set(rows.map((row) => row.rule));
  const uncovered = (Object.keys(FIGURE_RULES) as FigureRule[]).filter((rule) => !covered.has(rule));
  if (missed.length || uncovered.length || clean.status !== 0) {
    console.error(`figure-system plant: ${missed.length} plant(s) passed, ${uncovered.length} rule(s) unplanted, clean copy exit ${clean.status}`);
    process.exitCode = 1;
  }
} finally {
  rmSync(copy, { recursive: true, force: true });
}
