/**
 * Build-time content validator.
 *
 * The full pipeline (Zod frontmatter schemas, citation-ID resolution,
 * internal-link checks, draft-status exclusion) lands with the
 * foundation-content-pipeline feature. This scaffold version verifies the
 * one thing that exists today: every content MDX file carries a frontmatter
 * block. It passes vacuously when no content exists yet.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const contentRoot = join(import.meta.dirname, '..', 'content');

function listMdxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMdxFiles(full));
    else if (entry.isFile() && /\.mdx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

if (!existsSync(contentRoot)) {
  console.log('validate:content: no content/ directory yet, nothing to validate');
  process.exit(0);
}

const files = listMdxFiles(contentRoot);
const failures: string[] = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  if (!source.startsWith('---\n') || source.indexOf('\n---', 4) === -1) {
    failures.push(`${file}: missing frontmatter block`);
  }
}

if (failures.length > 0) {
  console.error('validate:content: FAILED');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`validate:content: OK (${files.length} content file(s) checked)`);
