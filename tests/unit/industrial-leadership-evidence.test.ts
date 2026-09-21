import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  originalClaimDigest,
  parseCompoundPlans,
  parseLedger,
} from '../../lib/audit-ledger';
import {
  buildManifest,
  sha256,
  validateApprovedDeltas,
  type ApprovedDelta,
} from '../../lib/brand-v2-baseline';

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

const articlePath = 'content/data-hardware/industrial-deployment.mdx';
const article = readFileSync(articlePath, 'utf8');
const oldSpan = 'The MIT Task Force on the Work of the Future, co-chaired by David Autor and David Mindell with Elisabeth Reynolds as executive director, surveyed the same evidence and concluded that a robot-driven jobs apocalypse is not imminent: technology displaces tasks rather than whole occupations, and the outcome depends on policy and the institutions shaping deployment <Cite id="mit-work-future-2020" />.';
const newSpan = 'The MIT Task Force on the Work of the Future, co-chaired by David Autor and David Mindell with Elisabeth Reynolds as executive director, reported in 2020 that it found no compelling evidence of technological advances driving a jobless future. It describes automation displacing human labour from some tasks while creating new work, with the jobs available and the skills they demand shaped by economic incentives, policy choices and institutional forces <Cite id="mit-work-future-2020" />.';
const approvalId = 'mit-industrial-43-prose-20260921';
const authorizationPath = '/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/convergence-mit-adjacent-integration-20260921/authorization.json';
const oldProseHash = '6063818cca0a9e5d84fddddd801ca6a098309f9a1b3baa6fe41cff7f735f743d';
const newProseHash = '125ef32b92ffe8c9444379f6fc3a00caeaad89e7330c836081d91b33deec33ba';
const approvals = JSON.parse(
  readFileSync('contract/brand-v2-approved-deltas.json', 'utf8'),
).entries as ApprovedDelta[];
const proseHash = (source: string) => buildManifest('prose', [{
  id: 'article:data-hardware/industrial-deployment',
  value: {
    path: articlePath,
    body: matter(source.replace(/\r\n/g, '\n')).content.trim(),
  },
}]).members[0].hash;

const adjacentRows = [
  {
    ordinal: 51,
    digest: '3282e9b1bb6009d492faee3164ecb7284e89251a628b237548180b46a55efb3a',
    claim: 'Registry defect: mit-work-future-2020 comment names three co-chairs',
    verdict: 'C (the data/citations.ts comment now reads "co-chairs Autor and Mindell, executive director Reynolds")',
    passageHash: 'a59f66918d34e882a846d9cf34f4db3f906a7358dbba349f884e10ce25d1d12e',
  },
  {
    ordinal: 43,
    digest: '561a6746845c6645be94b01b5e4f171b3911f6f7ab6cfcc010ee2ee157243b52',
    claim: 'MIT Task Force concluded a robot-driven jobs apocalypse is not imminent; technology displaces tasks; outcome depends on policy and institutions',
    verdict: 'V',
    passageHash: '1d047e77bbb6bd41e575cda5cbc959ab69a0e0058b1b5138198e3e90fe06dfa6',
  },
] as const;

// Same retained official report/result as original 44. Original 43 uses the
// unspliced continuous Chapter 1 conclusion 1 through section 2.1 paragraph.
// These hashes pin the reviewed text, not source freshness or independent acceptance.
describe('industrial deployment originals 51 and 43: bounded MIT closeout', () => {
  for (const expected of adjacentRows) {
    const row = (input = markdown) =>
      industrial(input).claimRecords[expected.ordinal - 1];

    it(`preserves original ${expected.ordinal}'s exact historical four-cell tuple and verdict`, () => {
      expect(originalClaimDigest(row())).toBe(expected.digest);
      expect(row().claim).toBe(expected.claim);
      expect(row().verdict).toBe(expected.verdict);
      expect(row().note).toBe('');
    });

    it(`completes original ${expected.ordinal} with the registered scalar source, not a new plan`, () => {
      expect(row().evidenceFailures).toEqual([]);
      expect(row().compound).toBeUndefined();
      expect(row().citationId).toBe('mit-work-future-2020');
      expect(row().sourceUrl).toBe(sourceUrl);
      expect(row().outcome).toBe('passing');
    });

    it(`pins original ${expected.ordinal}'s complete literal supporting passage`, () => {
      const passage = row().supportingPassage.replace(/<br>/g, '\n');
      expect(sha256(passage)).toBe(expected.passageHash);
      if (expected.ordinal === 51) expect(passage).toBe(leadershipBlock);
    });

    it.each([
      ['Citation ID', 4],
      ['Source URL fetched', 5],
      ['Supporting passage', 6],
    ] as const)(`fails original ${expected.ordinal} closed without %s and preserves other records`, (_field, column) => {
      const lines = markdown.split('\n');
      const cells = lines[row().line - 1].split(/(?<!\\)\|/);
      expect(cells).toHaveLength(8);
      cells[column] = ' ';
      lines[row().line - 1] = cells.join('|');
      const changed = lines.join('\n');
      expect(row(changed).evidenceFailures.length).toBeGreaterThan(0);
      expect(originalClaimDigest(row(changed))).toBe(expected.digest);
      const before = parse().flatMap(section => section.claimRecords);
      const after = parse(changed).flatMap(section => section.claimRecords);
      expect(after).toHaveLength(before.length);
      for (const [index, original] of before.entries()) {
        if (original.line !== row().line) expect(after[index]).toEqual(original);
      }
    });
  }

  it('keeps all job/task/policy conjuncts and non-benign countercontext in the continuous passage', () => {
    const passage = industrial().claimRecords[42].supportingPassage.replace(/<br>/g, '\n');
    expect(passage.startsWith('1. Technological change is simultaneously replacing existing work and creating new work.')).toBe(true);
    for (const text of [
      'It is not eliminating work altogether.',
      'No compelling historical or contemporary evidence suggests',
      'the impact of robotics and automation on workers will not be benign',
      'economic incentives, policy choices, and institutional forces',
      'even as technological advances displace human labor from some tasks',
      'they spur three other forces that generate new work',
      'Adopting new technology creates winners and losers',
    ]) expect(passage).toContain(text);
    expect(passage.endsWith('by vastly increasing their efficiency.')).toBe(true);
    expect(passage).not.toContain('surveyed the same evidence');
    expect(passage).not.toContain('rather than whole occupations');
  });

  it('applies only the exact authorized source-faithful article span with unchanged citation multiplicity', () => {
    expect(article.split(newSpan)).toHaveLength(2);
    expect(article).not.toContain(oldSpan);
    expect(article).not.toContain('surveyed the same evidence');
    expect(article).not.toContain('rather than whole occupations');
    expect(proseHash(article)).toBe(newProseHash);
    expect(proseHash(article.replace(newSpan, oldSpan))).toBe(oldProseHash);
    expect(article.match(/<Cite\s/g)).toHaveLength(32);
    expect(article.match(/<Cite id="mit-work-future-2020" \/>/g)).toHaveLength(1);
    expect(matter(article).data.lastReviewed).toBe('2026-08-22');
  });

  it('appends one exact native approval without rewriting the 996-entry prior prefix', () => {
    expect(sha256(JSON.stringify(approvals.slice(0, 996))))
      .toBe('ba543843eda437da7e6031ad52fd0e84069e8c0a48e7cfd9596a962c4f640907');
    const selected = approvals.filter(delta => delta.id === approvalId);
    expect(selected).toHaveLength(1);
    expect(approvals[996]).toEqual(selected[0]);
    expect(validateApprovedDeltas(selected)).toEqual([]);
    expect(selected[0]).toMatchObject({
      manifest: 'prose',
      memberId: 'article:data-hardware/industrial-deployment',
      oldHash: oldProseHash,
      newHash: newProseHash,
      responsibleMilestone: 'brand-v2-editorial',
      affectedAssertions: ['VAL-B2-BASE-002', 'VAL-B2-BASE-010', 'VAL-AUDIT-004', 'VAL-AUDIT-009'],
      disposition: 'permanent',
    });
    expect(selected[0].ownerApproval).toContain("Josef's standing");
    expect(selected[0].ownerApproval).toContain('orchestrator');
    expect(selected[0].ownerApproval).toContain(authorizationPath);
    expect(selected[0].ownerApproval).toContain('not a new human signature or independent acceptance');
  });

  it('does not let the exact prose hash approve restored stronger wording or unrelated prose', () => {
    expect(proseHash(article.replace(newSpan, oldSpan))).not.toBe(newProseHash);
    expect(proseHash(`${article}\nUnrelated added prose.\n`)).not.toBe(newProseHash);
  });
});
