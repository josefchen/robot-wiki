/**
 * The reader-first check (VAL-OPUS-145, VAL-OPUS-139).
 *
 *   node scripts/check-reader-first.ts [--root .] [--out out]
 *
 * Fails when a registered figure has no reader-test record, a failing
 * verdict, a missing screenshot or a source digest that no longer matches
 * its files; when a figure on an article, on /credits/ or on the home page
 * has no registry entry, or a registered one no longer renders; and when a
 * registered figure's main view (header, stage, controls and caption, with
 * both folds closed) shows a symbol or a bare unit from the committed
 * pattern list in lib/figure-main-view.ts. Every message names the figure.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { publishedModules } from '../data/modules.ts';
import { mainViewSymbolHits } from '../lib/figure-main-view.ts';
import { readRegistry, recordProblems, registryProblems } from '../lib/reader-first.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const root = resolve(option('--root', '.'));
const out = resolve(option('--out', join(root, 'out')));

const registry = readRegistry(root);
const problems = registryProblems(root, registry);
for (const entry of registry.figures) problems.push(...recordProblems(root, entry));

const routes = ['/', '/credits/', ...publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`)];
const registered = new Map(registry.figures.map((entry) => [`${entry.route} ${entry.figure}`, entry]));
const rendered = new Set<string>();
for (const route of routes) {
  const file = join(out, route, 'index.html');
  if (!existsSync(file)) {
    problems.push(`${route}: no exported page at ${file}`);
    continue;
  }
  const { document } = new JSDOM(readFileSync(file, 'utf8')).window;
  for (const frame of document.querySelectorAll('main [data-figure-frame]')) {
    const figure = frame.getAttribute('data-figure-frame') ?? '';
    const key = `${route} ${figure}`;
    rendered.add(key);
    if (!registered.has(key)) {
      problems.push(`${route} [${figure}]: figure in the export has no reader-first registry entry`);
      continue;
    }
    for (const hit of mainViewSymbolHits(frame)) {
      problems.push(`${route} [${figure}]: main view shows ${hit.what} (${hit.match}) in "${hit.line.slice(0, 80)}"`);
    }
  }
}
for (const entry of registry.figures) {
  if (!rendered.has(`${entry.route} ${entry.figure}`)) {
    problems.push(`${entry.route} [${entry.figure}]: registered figure does not render in the export`);
  }
}

for (const problem of problems) console.error(`reader-first: ${problem}`);
console.log(`reader-first: ${problems.length ? 'FAIL' : 'ok'}; ${registry.figures.length} registered figures, ` +
  `${rendered.size} rendered, ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
