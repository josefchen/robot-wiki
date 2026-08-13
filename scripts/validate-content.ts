/**
 * Build-time content validator (prebuild gate).
 *
 * Runs the checks in lib/validate-content.ts against the real registries and
 * the content/ tree, and exits non-zero on any violation so `npm run build`
 * fails before emitting a broken export.
 */
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { validateContent } from '../lib/validate-content.ts';
import { modules } from '../data/modules.ts';
import { CITATIONS } from '../data/citations.ts';
import { GLOSSARY } from '../data/glossary.ts';
import { IMAGES } from '../data/images.ts';
import { COMPANIES } from '../data/companies.ts';

const root = join(import.meta.dirname, '..');

const issues = validateContent({
  contentRoot: join(root, 'content'),
  publicDir: join(root, 'public'),
  modules,
  citations: CITATIONS,
  terms: GLOSSARY,
  images: IMAGES,
  // The home page renders a registry image from tsx rather than MDX; it is
  // scanned for ImageRef usages so the same unregistered-id gate applies.
  imageSources: [
    { label: 'app/page.tsx', body: readFileSync(join(root, 'app', 'page.tsx'), 'utf8') },
  ],
});

const EXPECTED_SEGMENT_COUNTS: Record<string, number> = {
  'foundation-models': 12,
  humanoids: 35,
  'industrial-logistics': 15,
  'vertical-applications': 32,
  'simulation-tooling': 10,
  'components-hardware': 8,
};

if (COMPANIES.length !== 112) {
  issues.push({
    file: 'data/companies.ts',
    message: `expected 112 companies, got ${COMPANIES.length}`,
  });
}
for (const [segment, expected] of Object.entries(EXPECTED_SEGMENT_COUNTS)) {
  const actual = COMPANIES.filter((c) => c.segment === segment).length;
  if (actual !== expected) {
    issues.push({
      file: 'data/companies.ts',
      message: `segment ${segment}: expected ${expected}, got ${actual}`,
    });
  }
}

if (issues.length > 0) {
  console.error(`validate:content: FAILED (${issues.length} issue(s))`);
  for (const issue of issues) {
    console.error(`  ${issue.file ? `${issue.file}: ` : ''}${issue.message}`);
  }
  process.exit(1);
}

const published = modules.filter((m) => m.status === 'published').length;
console.log(
  `validate:content: OK (${modules.length} registry modules, ${published} published, ${CITATIONS.length} citations, ${GLOSSARY.length} terms, ${IMAGES.length} images, ${COMPANIES.length} companies)`,
);
