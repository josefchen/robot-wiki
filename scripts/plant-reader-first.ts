/**
 * Plants one violation of each reader-first rule into a copy of the
 * registry, the records, the registered sources and the export, and fails
 * unless the reader-first check exits non-zero naming the figure for every
 * plant and exits zero on the clean copy.
 *
 *   node scripts/plant-reader-first.ts [--out out]
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { publishedModules } from '../data/modules.ts';
import { RECORD_DIR, REGISTRY_PATH, readRegistry, recordPath, type RegistryEntry } from '../lib/reader-first.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--out');
const exportRoot = resolve(at >= 0 && args[at + 1] ? args[at + 1] : 'out');
const registry = readRegistry('.');
const page = (base: string, route: string) => join(base, 'out', route, 'index.html');
const SVG_NS = 'http://www.w3.org/2000/svg';

function mirror(): string {
  const copy = mkdtempSync(join(tmpdir(), 'reader-first-plant-'));
  const files = [REGISTRY_PATH, ...new Set(registry.figures.flatMap((entry) => entry.sources))];
  for (const file of files) {
    mkdirSync(dirname(join(copy, file)), { recursive: true });
    cpSync(file, join(copy, file));
  }
  cpSync(RECORD_DIR, join(copy, RECORD_DIR), { recursive: true });
  for (const route of ['/', '/credits/', ...publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`)]) {
    mkdirSync(dirname(page(copy, route)), { recursive: true });
    cpSync(join(exportRoot, route, 'index.html'), page(copy, route));
  }
  return copy;
}

function editPage(base: string, route: string, edit: (document: Document) => void) {
  const dom = new JSDOM(readFileSync(page(base, route), 'utf8'));
  edit(dom.window.document);
  writeFileSync(page(base, route), dom.serialize());
}

const frameOf = (document: Document, entry: RegistryEntry) =>
  document.querySelector(`main [data-figure-frame="${entry.figure}"]`);
const target = registry.figures.find((entry) => {
  const html = readFileSync(join(exportRoot, entry.route, 'index.html'), 'utf8');
  return frameOf(new JSDOM(html).window.document, entry)?.querySelector('[data-figure-stage] svg');
});
if (!target) throw new Error('reader-first plant: no registered figure with a stage svg in the export');
const name = `${target.route} [${target.figure}]`;
const unregistered = 'fixture:unregistered-reader-first-plant';

const PLANTS: { plant: string; names: string; apply: (base: string) => void }[] = [
  { plant: 'record deleted', names: name, apply: (base) => rmSync(join(base, recordPath(target.id))) },
  {
    plant: 'verdict flipped to fail',
    names: name,
    apply: (base) => {
      const file = join(base, recordPath(target.id));
      writeFileSync(file, readFileSync(file, 'utf8').replace('"verdict": "pass"', '"verdict": "fail"'));
    },
  },
  { plant: 'registered source edited', names: name, apply: (base) => appendFileSync(join(base, target.sources[0]), '\n// planted edit\n') },
  {
    plant: 'unregistered fixture figure added',
    names: `${target.route} [${unregistered}]`,
    apply: (base) => editPage(base, target.route, (document) => {
      const figure = document.createElement('figure');
      figure.setAttribute('data-figure-frame', unregistered);
      document.querySelector('main')!.append(figure);
    }),
  },
  {
    plant: '"k = 8" in a stage label',
    names: name,
    apply: (base) => editPage(base, target.route, (document) => {
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('data-scene-note', '');
      text.textContent = 'k = 8';
      frameOf(document, target)!.querySelector('[data-figure-stage] svg')!.append(text);
    }),
  },
];

const check = (base: string) => spawnSync(process.execPath,
  ['scripts/check-reader-first.ts', '--root', base, '--out', join(base, 'out')], { encoding: 'utf8' });
let failed = 0;
for (const { plant, names, apply } of PLANTS) {
  const base = mirror();
  try {
    apply(base);
    const run = check(base);
    const reported = `${run.stdout}\n${run.stderr}`.split('\n').find((line) => line.startsWith(`reader-first: ${names}:`));
    console.log(`  ${run.status} ${plant}: ${reported ?? 'NOT REPORTED'}`);
    if (run.status !== 1 || !reported) failed += 1;
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}
const base = mirror();
const clean = check(base);
rmSync(base, { recursive: true, force: true });
console.log(`reader-first plant: ${name}`);
console.log(`  ${clean.status} clean copy: ${clean.stdout.trim().split('\n').at(-1)}`);
if (failed || clean.status !== 0) {
  console.error(`reader-first plant: ${failed} plant(s) passed or went unnamed, clean copy exit ${clean.status}`);
  if (clean.status !== 0) console.error(clean.stderr.trim().split('\n').slice(0, 10).join('\n'));
  process.exitCode = 1;
}
