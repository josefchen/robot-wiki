/**
 * CLI wrapper for the no-slop lint (VAL-BUILD-004, VAL-BUILD-007).
 *
 * Runs the pure checks in lib/no-slop.ts against the real repo:
 *   1. Placeholder sweep over every .html file in the static export
 *      (out/), skipping nothing except script/style contents (masked
 *      inside the checker).
 *   2. AI-writing marker lint over every MDX body in content/: banned
 *      vocabulary, em/en dashes in prose, and rule-of-three density.
 *
 * Exits non-zero on any finding. Run standalone or via validate:content
 * (it runs in prebuild, before the export exists, so the placeholder
 * half is skipped there and covered by the standalone run after build).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  dashLines,
  findBannedVocabulary,
  findPlaceholderMarkers,
  ruleOfThreeDensity,
  RULE_OF_THREE_LIMIT,
} from '../lib/no-slop.ts';

const root = join(import.meta.dirname, '..');
const problems: string[] = [];

// --- 1. Placeholder sweep over the export (VAL-BUILD-004). ---
const outDir = join(root, 'out');
if (existsSync(outDir)) {
  const htmlFiles: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) htmlFiles.push(full);
    }
  })(outDir);

  for (const file of htmlFiles) {
    const markers = findPlaceholderMarkers(readFileSync(file, 'utf8'));
    if (markers.length > 0) {
      problems.push(`${file.replace(outDir, '')}: placeholder markers (${markers.join(', ')})`);
    }
  }
  console.log(`no-slop: placeholder sweep over ${htmlFiles.length} exported HTML files`);
} else {
  console.log('no-slop: out/ absent, placeholder sweep skipped (runs standalone after build)');
}

// --- 2. AI-writing markers over MDX prose (VAL-BUILD-007). ---
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

  for (const finding of findBannedVocabulary(body)) {
    problems.push(`${rel}:${finding.line}: ${finding.message}`);
  }
  for (const line of dashLines(body)) {
    problems.push(`${rel}:${line}: em or en dash in prose (rewrite with a comma, colon, or period)`);
  }
  const density = ruleOfThreeDensity(body);
  if (density > RULE_OF_THREE_LIMIT) {
    problems.push(
      `${rel}: rule-of-three density ${density.toFixed(1)} per 1000 words exceeds ${RULE_OF_THREE_LIMIT}`,
    );
  }
}
console.log(`no-slop: AI-writing lint over ${mdxFiles.length} MDX files`);

if (problems.length > 0) {
  console.error(`no-slop: FAILED (${problems.length} finding(s))`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('no-slop: OK (zero placeholder markers, zero banned AI-writing markers)');
