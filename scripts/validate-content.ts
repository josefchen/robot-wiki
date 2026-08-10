/**
 * Build-time content validator (prebuild gate).
 *
 * Runs the checks in lib/validate-content.ts against the real registries and
 * the content/ tree, and exits non-zero on any violation so `npm run build`
 * fails before emitting a broken export.
 */
import { join } from 'node:path';
import { validateContent } from '../lib/validate-content.ts';
import { modules } from '../data/modules.ts';
import { CITATIONS } from '../data/citations.ts';
import { GLOSSARY } from '../data/glossary.ts';

const root = join(import.meta.dirname, '..');

const issues = validateContent({
  contentRoot: join(root, 'content'),
  publicDir: join(root, 'public'),
  modules,
  citations: CITATIONS,
  terms: GLOSSARY,
});

if (issues.length > 0) {
  console.error(`validate:content: FAILED (${issues.length} issue(s))`);
  for (const issue of issues) {
    console.error(`  ${issue.file ? `${issue.file}: ` : ''}${issue.message}`);
  }
  process.exit(1);
}

const published = modules.filter((m) => m.status === 'published').length;
console.log(
  `validate:content: OK (${modules.length} registry modules, ${published} published, ${CITATIONS.length} citations)`,
);
