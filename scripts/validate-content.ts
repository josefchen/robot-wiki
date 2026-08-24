/**
 * Build-time content validator (prebuild gate).
 *
 * Runs the checks in lib/validate-content.ts against the real registries and
 * the content/ tree, and exits non-zero on any violation so `npm run build`
 * fails before emitting a broken export.
 */
import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { validateContent } from '../lib/validate-content.ts';
import { modules } from '../data/modules.ts';
import { CITATIONS } from '../data/citations.ts';
import { findProseCitationYearDisagreements } from '../lib/prose-citation-years.ts';
import { GLOSSARY } from '../data/glossary.ts';
import { IMAGES } from '../data/images.ts';
import { COMPANIES } from '../data/companies.ts';
import { roundSourceMembershipIssues } from '../lib/company-source-provenance.ts';

const root = join(import.meta.dirname, '..');

const issues = validateContent({
  contentRoot: join(root, 'content'),
  publicDir: join(root, 'public'),
  modules,
  citations: CITATIONS,
  terms: GLOSSARY,
  images: IMAGES,
  companies: COMPANIES,
  // The home page renders a registry image from tsx rather than MDX; it is
  // scanned for ImageRef usages so the same unregistered-id gate applies.
  imageSources: [
    { label: 'app/page.tsx', body: readFileSync(join(root, 'app', 'page.tsx'), 'utf8') },
  ],
});

// An author-year mention in prose must agree with the registry year of the
// chip it introduces, or a reader sees two years for one paper in a single
// sentence.
//
// Deliberately NOT wired to the `skip: 'year'` entries in
// data/crossref-author-exceptions.ts, though they look like the obvious
// source of truth. Those answer a different question: whether the registry
// year may differ from what arXiv or Crossref publishes, which is settled
// for pi-rl-2026 (the entry cites v3). Whether the PROSE may contradict the
// chip beside it is not settled by that, and it never is: the reader cannot
// see the exception file. Wiring the two together silenced this check on the
// one article it was written for, and a planted "(Chen et al., 2021)"
// survived a green run. There is no legitimate divergence, so there is no
// list.
const citationYears = CITATIONS.map((c) => ({
  id: c.id,
  year: c.year,
  authors: c.authors ?? [],
}));
for (const domain of readdirSync(join(root, 'content'), { withFileTypes: true })) {
  if (!domain.isDirectory()) continue;
  for (const name of readdirSync(join(root, 'content', domain.name))) {
    if (!name.endsWith('.mdx')) continue;
    const rel = `content/${domain.name}/${name}`;
    for (const hit of findProseCitationYearDisagreements({
      file: rel,
      body: readFileSync(join(root, rel), 'utf8'),
      citations: citationYears,
    })) {
      issues.push({
        file: rel,
        message: `prose cites ${hit.surname} ${hit.proseYear} but ${hit.citationId} is year ${hit.registryYear}: "${hit.excerpt.slice(0, 90)}"`,
      });
    }
  }
}

const EXPECTED_SEGMENT_COUNTS: Record<string, number> = {
  'foundation-models': 12,
  humanoids: 34, // 34 since the 2026-08-18 audit removed the duplicate galaxea-ai-robot row
  'industrial-logistics': 15,
  'vertical-applications': 32,
  'simulation-tooling': 10,
  'components-hardware': 8,
};

if (COMPANIES.length !== 111) {
  issues.push({
    file: 'data/companies.ts',
    message: `expected 111 companies, got ${COMPANIES.length}`, // 111 since the 2026-08-18 audit removed a duplicate row
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

// No record may carry two source entries with the same URL: the card and
// timeline renderers key their source lists by URL, so a duplicate (the
// replace-vs-append mistake the 2026-08-18 sharpa fix cleaned up) produces
// a React duplicate-key console error on every view. Replacing a dead
// source URL must actually replace the entry, never append alongside it.
for (const company of COMPANIES) {
  const seen = new Set<string>();
  for (const source of company.sources) {
    if (seen.has(source.url)) {
      issues.push({
        file: 'data/companies.ts',
        message: `${company.id}: duplicate source URL ${source.url} (the source list is keyed by URL; replace dead URLs, never append a duplicate)`,
      });
    }
    seen.add(source.url);
  }
}

// A funding round may explicitly name the source that backs its displayed
// figure, but the pointer must stay inside that company's own provenance
// list. This belongs in validate:content rather than the network liveness
// sweep because membership is deterministic, offline schema hygiene and
// must fail every build, not only an on-demand URL check.
for (const message of roundSourceMembershipIssues(COMPANIES)) {
  issues.push({
    file: 'data/companies.ts',
    message,
  });
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
