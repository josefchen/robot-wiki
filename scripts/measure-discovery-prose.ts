/**
 * Measures the Discovery pages in a static export: prose Words, the first
 * paragraph and its Words, the average sentence length and the phrase sweep
 * over the visible text of <main>.
 *
 *   node scripts/measure-discovery-prose.ts [--root out]            one JSON record per route
 *   node scripts/measure-discovery-prose.ts --check [--root out]    exit 1 on any finding
 *   node scripts/measure-discovery-prose.ts --record [--root out]   rewrite the budgets
 *
 * --check holds each page to its budget in data/discovery-budgets.json and
 * to the prose rules (lib/discovery-prose.ts). A pass that cuts a page
 * records the new, lower count with --record, so the page cannot grow back.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import {
  DISCOVERY_ROUTES,
  discoveryFindings,
  measureDiscoveryPage,
  type DiscoveryBudgets,
} from '../lib/discovery-prose.ts';

const args = process.argv.slice(2);
const rootFlag = args.indexOf('--root');
const repo = join(import.meta.dirname, '..');
const outDir = resolve(rootFlag >= 0 ? args[rootFlag + 1] : join(repo, 'out'));
const budgetPath = join(repo, 'data', 'discovery-budgets.json');

const measures = DISCOVERY_ROUTES.flatMap((route) => {
  const file = join(outDir, route, 'index.html');
  if (!existsSync(file)) return [];
  const main = new JSDOM(readFileSync(file, 'utf8')).window.document.querySelector('main');
  if (!main) throw new Error(`no <main> in ${route}`);
  return [measureDiscoveryPage(route, main)];
});

if (args.includes('--record')) {
  if (measures.length !== DISCOVERY_ROUTES.length) {
    throw new Error(`discovery-prose: ${outDir} lacks a Discovery page; build the export first`);
  }
  const budgets = Object.fromEntries(measures.map(({ route, words }) => [route, words]));
  writeFileSync(budgetPath, `${JSON.stringify(budgets, null, 2)}\n`);
  console.log(`discovery-prose: recorded ${measures.length} budgets in data/discovery-budgets.json`);
} else if (args.includes('--check')) {
  const budgets = JSON.parse(readFileSync(budgetPath, 'utf8')) as DiscoveryBudgets;
  const findings = discoveryFindings(measures, budgets);
  for (const { route, rule, detail } of findings) {
    console.error(`discovery-prose: ${route} ${rule}: ${detail}`);
  }
  if (findings.length > 0) process.exit(1);
  console.log(
    `discovery-prose: OK (${measures.length} pages within budget, first paragraphs, sentence length and sweep)`,
  );
} else {
  console.log(JSON.stringify(measures, null, 2));
}
