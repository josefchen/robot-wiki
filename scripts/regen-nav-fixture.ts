/**
 * Regenerates tests/fixtures/nav-accessible-names.json from the built
 * static export.
 *
 * The fixture is the sidebar baseline: every sidebar link's href
 * and accessible name in canonical order (all sections expanded). Until
 * 2026-08-15 every module publish regenerated it with a throwaway
 * visual-*.mts script written and deleted per session, three workers in a
 * row each doing it slightly differently. This is the checked-in
 * replacement: run `npm run build` (so out/ exists), then `npm run
 * regen:nav`, then commit the fixture diff alongside the publish (expect
 * exactly +1 entry).
 *
 * Derivation lives in lib/nav-fixture.ts (pure, unit-tested); this file
 * only reads the export pages and writes the file. Node-executed, so
 * relative imports carry explicit .ts extensions (AGENTS.md convention).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { DOMAINS } from '../data/domains.ts';
import {
  buildNavFixture,
  scanSidebarDocument,
  serializeNavFixture,
} from '../lib/nav-fixture.ts';

const root = join(import.meta.dirname, '..');
const outDir = join(root, 'out');
const fixturePath = join(root, 'tests', 'fixtures', 'nav-accessible-names.json');

function fail(message: string): never {
  console.error(`regen:nav: FAILED — ${message}`);
  process.exit(1);
}

function readPage(rel: string): Document {
  const htmlPath = join(outDir, rel, 'index.html');
  let html: string;
  try {
    html = readFileSync(htmlPath, 'utf8');
  } catch {
    fail(`missing ${htmlPath} — run npm run build first`);
  }
  return new JSDOM(html).window.document;
}

const rootScan = scanSidebarDocument(readPage('.'));
const domainScans = DOMAINS.map((domain) => ({
  domain,
  scan: scanSidebarDocument(readPage(domain)),
}));

const fixture = buildNavFixture(rootScan, domainScans);
const json = serializeNavFixture(fixture);
writeFileSync(fixturePath, json, 'utf8');

console.log(
  `regen:nav: OK (${fixture.linkCount} links → ${fixturePath})`,
);
