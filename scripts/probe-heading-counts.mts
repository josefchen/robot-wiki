#!/usr/bin/env node
/**
 * Derivation probe for the heading counts cited in the HEADINGS comment of
 * tests/e2e/heading-permalink.spec.ts (raw h2+h3 in prose, swept section
 * headings, Card titles). The spec's corpus bound is rows.length > 200, so
 * nothing executable fails when those figures drift; this probe is how a
 * reader re-derives them from the shipped export instead of trusting the
 * comment. Same defect class as the stale "255 of 259" the comment carried
 * before 2026-08-23: a figure in a reader-facing document must carry its
 * own derivation (standing AGENTS.md rule).
 *
 *   node scripts/probe-heading-counts.mts [--out <dir>]
 *
 * Serves the static export on an OS-assigned port with the same
 * dependency-free server the specs use. Needs a current out/ (npm run
 * build).
 */
import { chromium } from 'playwright-core';
import { publishedModules } from '../data/modules.ts';
import { startStaticExportServer } from '../tests/e2e/static-export-server.ts';

const outDir = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]!
  : 'out';

const HEADINGS =
  '.prose h2:not([data-card-title]), .prose h3:not([data-card-title])';
const RAW = '.prose h2, .prose h3';

const server = await startStaticExportServer(outDir);
const browser = await chromium.launch();
const page = await browser.newPage();

let swept = 0;
let raw = 0;
let cardTitles = 0;
let routes = 0;
for (const m of publishedModules()) {
  routes += 1;
  await page.goto(`http://127.0.0.1:${server.port}/${m.domain}/${m.slug}/`);
  swept += await page.locator(HEADINGS).count();
  raw += await page.locator(RAW).count();
  cardTitles += await page.locator('.prose [data-card-title]').count();
}

console.log(
  JSON.stringify(
    { routes, rawH2H3: raw, swept: swept, cardTitles },
    null,
    2,
  ),
);

await browser.close();
await server.stop();
