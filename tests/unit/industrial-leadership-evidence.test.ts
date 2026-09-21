import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  originalClaimDigest,
  parseCompoundPlans,
  parseLedger,
} from '../../lib/audit-ledger';

const ledgerPath = 'audit/data-hardware.md';
const markdown = readFileSync(ledgerPath, 'utf8');
const registryIds = new Set(CITATIONS.map(({ id }) => id));
const compoundPlans = parseCompoundPlans(
  JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')),
);
const articleCitations = Object.fromEntries(
  compoundPlans
    .filter((plan) => plan.ledgerPath === ledgerPath && plan.kind === 'frontmatter-p1')
    .map((plan) => [
      plan.articleSlug,
      matter(readFileSync(`content/data-hardware/${plan.articleSlug}.mdx`, 'utf8'))
        .data.citations as string[],
    ]),
);
const parse = (input = markdown) =>
  parseLedger(ledgerPath, input, registryIds, { compoundPlans, articleCitations });
const industrial = (input = markdown) =>
  parse(input).find(({ slug }) => slug === 'industrial-deployment')!;
const leadership = (input = markdown) => industrial(input).claimRecords[43];
const tupleDigest = '05fe8edd3949d806f1f00f1709d972bb30425db359411d96f96a9d67d7f1a285';
const sourceUrl =
  'https://workofthefuture-taskforce.mit.edu/wp-content/uploads/2021/01/2020-Final-Report4.pdf';

// Literal continuous leadership block from the retained PDF-derived markdown,
// not raw PDF bytes. Report-text SHA256:
// 294188a5930fcb13e66ea0d4058684593ff8d4d2636d4a90a71ac527a7468323.
// Original tool-result event: 2026-09-21T16:55:02.521Z, not an origin-fetch time.
// Extraction stops at 40000 characters after this block; HTTP status/headers
// and origin-fetch time were unavailable. Duplicate text/spacing is preserved.
const leadershipBlock = [
  'By David Autor, David Mindell, and Elisabeth Reynolds',
  'MIT Task Force on the Work of the Future',
  '',
  'DAVID AUTOR, TASK FORCE CO-CHAIR',
  'Ford Professor of Economics, Margaret MacVicar Fellow,',
  '',
  'Ford Professor of Economics, Margaret MacVicar Fellow, ',
  'and Associate Department Head',
  '',
  'Labor Studies Program Co-Director, National Bureau of ',
  'Economic Research',
  '',
  'DAVID MINDELL, TASK FORCE CO-CHAIR',
  'Professor of Aeronautics and Astronautics',
  '',
  'Dibner Professor of the History of Engineering and Manufacturing ',
  'Founder and CEO, Humatics Corporation',
  '',
  'ELISABETH REYNOLDS, TASK FORCE EXECUTIVE DIRECTOR ',
  'Principal Research Scientist',
  '',
  'Executive, Director, MIT Industrial Performance Center Lecturer, ',
  'Department of Urban Studies and Planning',
].join('\n');

describe('industrial deployment original 44: MIT leadership evidence', () => {
  it('preserves the historical three-co-chair claim and all four original cells', () => {
    const row = leadership();
    expect(originalClaimDigest(row)).toBe(tupleDigest);
    expect(row.claim).toBe(
      'The Task Force was "co-chaired by David Autor, David Mindell and Elisabeth Reynolds"',
    );
    expect(row.verdict).toBe(
      'C (now "co-chaired by David Autor and David Mindell with Elisabeth Reynolds as executive director")',
    );
    expect(row.note).toBe('');
  });

  it('completes only a scalar evidence record while retaining the C outcome', () => {
    const row = leadership();
    expect(row.evidenceFailures).toEqual([]);
    expect(row.compound).toBeUndefined();
    expect(row.citationId).toBe('mit-work-future-2020');
    expect(row.sourceUrl).toBe(sourceUrl);
    expect(row.outcome).toBe('passing');
    expect(row.verdict).toMatch(/^C\b/);
  });

  it('retains the complete literal block and distinguishes both co-chairs from Reynolds', () => {
    const passage = leadership().supportingPassage.replace(/<br>/g, '\n');
    expect(passage).toBe(leadershipBlock);
    expect(passage.match(/TASK FORCE CO-CHAIR/g)).toHaveLength(2);
    expect(passage.match(/TASK FORCE EXECUTIVE DIRECTOR/g)).toHaveLength(1);
    expect(passage).not.toContain('ELISABETH REYNOLDS, TASK FORCE CO-CHAIR');
  });

  it.each([
    ['Citation ID', 4],
    ['Source URL fetched', 5],
    ['Supporting passage', 6],
  ] as const)('fails closed when the native row loses %s', (_field, column) => {
    const lines = markdown.split('\n');
    const row = leadership();
    const cells = lines[row.line - 1].split(/(?<!\\)\|/);
    expect(cells).toHaveLength(8);
    cells[column] = ' ';
    lines[row.line - 1] = cells.join('|');
    const changed = lines.join('\n');
    expect(leadership(changed).evidenceFailures.length).toBeGreaterThan(0);
    expect(originalClaimDigest(leadership(changed))).toBe(tupleDigest);
    expect(leadership(changed).verdict).toBe(row.verdict);
    for (const ordinal of [43, 51]) {
      expect(industrial(changed).claimRecords[ordinal - 1])
        .toEqual(industrial().claimRecords[ordinal - 1]);
    }
  });

  it('keeps the native domain summary reconciled without changing recorded verdicts', () => {
    expect(parse().flatMap(({ summaryFailures }) => summaryFailures)).toEqual([]);
  });
});
