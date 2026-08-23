/**
 * CLI wrapper for the no-slop lint.
 *
 * Runs the pure checks in lib/no-slop.ts against the real repo:
 *   1. Placeholder sweep over every .html file in the static export
 *      (out/), skipping nothing except script/style contents (masked
 *      inside the checker).
 *   2. AI-writing marker lint over every MDX body in content/: banned
 *      vocabulary, em/en dashes in prose, and rule-of-three density.
 *   3. The same marker lint over the rendered prose of every exported
 *      HTML file: component copy, data-file strings that render, landing
 *      text, and <title>/meta descriptions, i.e. prose a reader sees that
 *      never lives in content/. "Shipped prose" means what renders, so the
 *      export is the honest scan surface, exactly as it already was for
 *      the placeholder half.
 *
 * Verbatim quoted source text is exempt only through the attribution
 * registry in data/no-slop-exceptions.ts: the registry is
 * validated before any scanning (an entry without evidence fails the run),
 * its exact quote text is masked in both halves, and an entry whose quote
 * matches no scanned content is reported [STALE] so the list stays honest.
 *
 * Exits non-zero on any finding. Run standalone (npm run lint-no-slop) or
 * via validate:content (prebuild, --source-only: the source tree is what
 * exists before a build, and a stale out/ from an earlier build must not
 * fail the prebuild for defects already fixed in source) and via postbuild
 * (full run over the freshly produced export).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  dashLines,
  extractRenderedProse,
  findBannedVocabulary,
  findPlaceholderMarkers,
  findStaleQuotationExceptions,
  ruleOfThreeDensity,
  ruleOfThreeResult,
  RULE_OF_THREE_MIN_WORDS,
  RULE_OF_THREE_LIMIT,
  validateQuotationExceptions,
} from '../lib/no-slop.ts';
import { NO_SLOP_EXCEPTIONS } from '../data/no-slop-exceptions.ts';
import { CITATIONS } from '../data/citations.ts';

const sourceOnly = process.argv.includes('--source-only');
const root = join(import.meta.dirname, '..');
const problems: string[] = [];

// Validate the exception registry before scanning a single file: an
// exception without recorded evidence is a suppressed failure, so the
// lint fails fast and says why (same contract as the link-check sweep).
const citationIds = new Set(CITATIONS.map((c) => c.id));
const exceptionProblems = validateQuotationExceptions(NO_SLOP_EXCEPTIONS, citationIds);
if (exceptionProblems.length > 0) {
  console.error('The no-slop exception registry (data/no-slop-exceptions.ts) is not valid:');
  for (const problem of exceptionProblems) console.error(`  - ${problem}`);
  process.exit(1);
}

const scannedTexts: string[] = [];

// --- 1. Placeholder sweep over the export, ---
// --- plus the rendered-prose marker lint. ---
const outDir = join(root, 'out');
if (sourceOnly) {
  console.log('no-slop: source-only run, export sweeps skipped (postbuild gates the fresh export)');
} else if (existsSync(outDir)) {
  const htmlFiles: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) htmlFiles.push(full);
    }
  })(outDir);

  for (const file of htmlFiles) {
    const rel = file.replace(outDir, '');
    const html = readFileSync(file, 'utf8');

    const markers = findPlaceholderMarkers(html);
    if (markers.length > 0) {
      problems.push(`${rel}: placeholder markers (${markers.join(', ')})`);
    }

    // Rendered-prose markers: report an excerpt of the offending line,
    // since line numbers of extracted text map to no source file.
    const prose = extractRenderedProse(html);
    scannedTexts.push(prose);
    const lines = prose.split('\n');
    for (const finding of findBannedVocabulary(prose, NO_SLOP_EXCEPTIONS)) {
      const excerpt = (lines[finding.line - 1] ?? '').trim().slice(0, 90);
      problems.push(`${rel}: ${finding.message} (near "${excerpt}")`);
    }
    for (const line of dashLines(prose, NO_SLOP_EXCEPTIONS)) {
      const excerpt = (lines[line - 1] ?? '').trim().slice(0, 90);
      problems.push(
        `${rel}: em or en dash in rendered prose (near "${excerpt}")`,
      );
    }
    const density = ruleOfThreeDensity(prose);
    if (density > RULE_OF_THREE_LIMIT) {
      problems.push(
        `${rel}: rule-of-three density ${density.toFixed(1)} per 1000 words exceeds ${RULE_OF_THREE_LIMIT}`,
      );
    }
    const result = ruleOfThreeResult(prose);
    if (result.subFloor) {
      // Informational, never a failure and never a silent zero: a body too
      // short for the threshold to be meaningful is visible and countable,
      // distinct from a measured-and-clean page.
      console.log(
        `  [SUB-FLOOR] ${rel}: ${result.words} words (below the ${RULE_OF_THREE_MIN_WORDS}-word measurement floor), rule-of-three density ${result.density.toFixed(1)} per 1000 words reported informationally`,
      );
    }
  }
  console.log(`no-slop: placeholder + rendered-prose sweep over ${htmlFiles.length} exported HTML files`);
} else {
  console.log('no-slop: out/ absent, export sweeps skipped (runs standalone after build)');
}

// --- 2. AI-writing markers over MDX prose. ---
const contentDir = join(root, 'content');
const mdxFiles: string[] = [];
(function walk(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.mdx?$/.test(entry.name)) mdxFiles.push(full);
  }
})(contentDir);

for (const file of mdxFiles) {
  const rel = file.replace(contentDir, '');
  const body = readFileSync(file, 'utf8');
  scannedTexts.push(body);

  for (const finding of findBannedVocabulary(body, NO_SLOP_EXCEPTIONS)) {
    problems.push(`${rel}:${finding.line}: ${finding.message}`);
  }
  for (const line of dashLines(body, NO_SLOP_EXCEPTIONS)) {
    problems.push(`${rel}:${line}: em or en dash in prose (rewrite with a comma, colon, or period)`);
  }
  const density = ruleOfThreeDensity(body);
  if (density > RULE_OF_THREE_LIMIT) {
    problems.push(
      `${rel}: rule-of-three density ${density.toFixed(1)} per 1000 words exceeds ${RULE_OF_THREE_LIMIT}`,
    );
  }
  const result = ruleOfThreeResult(body);
  if (result.subFloor) {
    console.log(
      `  [SUB-FLOOR] ${rel}: ${result.words} words (below the ${RULE_OF_THREE_MIN_WORDS}-word measurement floor), rule-of-three density ${result.density.toFixed(1)} per 1000 words reported informationally`,
    );
  }
}
console.log(`no-slop: AI-writing lint over ${mdxFiles.length} MDX files`);

// --- 3. Stale exception entries keep the registry honest. ---
// Only meaningful when the export was scanned too: an exception whose
// quote lives only in rendered prose (a bibliography title, a market-map
// source title) is invisible to a source-only run, which must not report
// it stale on evidence it never collected.
if (!sourceOnly) {
  const stale = findStaleQuotationExceptions(NO_SLOP_EXCEPTIONS, scannedTexts);
  for (const exception of stale) {
    console.log(
      `  [STALE] ${exception.id}: the registered quotation no longer appears in any scanned content; remove its entry from data/no-slop-exceptions.ts.`,
    );
  }
}

if (problems.length > 0) {
  console.error(`no-slop: FAILED (${problems.length} finding(s))`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(
  `no-slop: OK (zero placeholder markers, zero banned AI-writing markers, ${NO_SLOP_EXCEPTIONS.length} registered quotation exception(s) in force)`,
);
