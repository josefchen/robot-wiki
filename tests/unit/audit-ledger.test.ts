import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  AUDIT_LEDGERS,
  classifyVerdict,
  ledgerSummary,
  withLedgerSummary,
  parseLedger,
  reconcileDomain,
  summarise,
  type LedgerSection,
  type CompoundPlan,
  type AuditEvidenceContext,
} from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

const THREE_COLUMN = `# Classical audit

## Summary

Prose that is not a table.

### kinematics.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| FK is an ordered product of per-joint transforms | modern-robotics-2017 | V |
| DH 1955 uses exactly four scalars per joint | denavit-hartenberg-1955 | C ("five" -> "four") |

### motion-planning.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| C-space reformulation is due to Lozano-Perez 1983 | lozano-perez-1983 | V |
`;

const FIVE_COLUMN = `# Frontier audit

## reliability-gap.mdx

| # | Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|---|
| R1 | Stat box: 95% over 30 steps = 21% | arithmetic (p^N) | V | 0.95^30=0.2146 |

## reliability-gap.mdx (continued)

| # | Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|---|
| R7 | Helix runs S0 at 1 kHz | figure.ai/news/helix-02 (fetched) | V | verbatim |
`;

describe('audit ledger parsing', () => {
  it('requires every distinct citation, fetched URL and passage field on each claim', () => {
    const registry = new Set(['alvinn-1988', 'dagger-2011']);
    const markdown = `## behavioral-cloning.mdx

| Claim | Source checked | Verdict | Note | Citation ID | Source URL fetched | Supporting passage |
| --- | --- | --- | --- | --- | --- | --- |
| ALVINN follows roads | Each fetched during this audit | verified | alvinn-1988 and dagger-2011 were checked | alvinn-1988 | | |
`;
    const [section] = parseLedger('audit/manipulation.md', markdown, registry);
    expect(section.unevidencedRows).toHaveLength(1);
    const complete = markdown.replace(
      '| alvinn-1988 | | |',
      '| alvinn-1988 | https://papers.example/alvinn | ALVINN is a backpropagation network designed for the task of road following. |',
    );
    expect(parseLedger('audit/manipulation.md', complete, registry)[0].unevidencedRows).toEqual([]);
    for (const cell of [
      'alvinn-1988',
      'https://papers.example/alvinn',
      'ALVINN is a backpropagation network designed for the task of road following.',
    ]) {
      const missing = complete.replace(`| ${cell} |`, '| |');
      expect(parseLedger('audit/manipulation.md', missing, registry)[0].unevidencedRows)
        .toHaveLength(1);
    }
    for (const pointer of ['Table III', 'https://papers.example/alvinn', 'verbatim']) {
      const pointerOnly = complete.replace(
        'ALVINN is a backpropagation network designed for the task of road following.',
        pointer,
      );
      expect(parseLedger('audit/manipulation.md', pointerOnly, registry)[0].unevidencedRows)
        .toHaveLength(1);
    }
  });

  it('reads every article section and its claim rows out of a three-column ledger', () => {
    const sections = parseLedger('audit/classical.md', THREE_COLUMN);
    expect(sections.map((s) => s.slug)).toEqual([
      'kinematics',
      'motion-planning',
    ]);
    expect(sections[0].claimRows).toBe(2);
    expect(sections[1].claimRows).toBe(1);
  });

  it('does not mistake a prose heading for an article section', () => {
    const sections = parseLedger('audit/classical.md', THREE_COLUMN);
    expect(sections.some((s) => s.slug === 'Summary')).toBe(false);
  });

  it('rejects a summary that still reports an unresolved claim after its row was corrected', () => {
    const markdown = `## kinematics.mdx

| Claim | Source checked | Verdict | Citation ID | Source URL fetched | Supporting passage |
| --- | --- | --- | --- | --- | --- |
| Four DH parameters | denavit-hartenberg-1955 | C | denavit-hartenberg-1955 | https://papers.example/dh | Four parameters are sufficient to describe the relationship between adjacent frames. |

## Summary

- Claims checked: 1
- Verified: 0
- Corrected: 1
- Cut: 0
- Unresolved: 1
`;
    const result = reconcileDomain({
      domain: 'classical',
      assertionId: 'VAL-AUDIT-005',
      ledgerPath: 'audit/classical.md',
      published: ['kinematics'],
      sections: parseLedger('audit/classical.md', markdown, new Set(['denavit-hartenberg-1955'])),
    });
    expect(result.failures.map(({ kind }) => kind)).toContain('ledger-summary-mismatch');
    const rows = markdown.slice(0, markdown.indexOf('## Summary'));
    const registry = new Set(['denavit-hartenberg-1955']);
    const summary = ledgerSummary(parseLedger('audit/classical.md', rows, registry));
    const current = `${rows}${summary}\n`;
    expect(parseLedger('audit/classical.md', current, registry)[0].summaryFailures).toEqual([]);
    const stale = current.replace(
      'Unresolved or unrecognised verdicts: 0',
      'Unresolved or unrecognised verdicts: 1',
    );
    expect(parseLedger('audit/classical.md', stale, registry)[0].summaryFailures)
      .toHaveLength(1);
    const changedVerdict = current.replace('| C |', '| V |');
    expect(parseLedger('audit/classical.md', changedVerdict, registry)[0].summaryFailures)
      .toHaveLength(1);
    expect(parseLedger('audit/classical.md', `${current}\n${summary}`, registry)[0].summaryFailures)
      .toHaveLength(1);
    const unsettled = ledgerSummary(parseLedger(
      'audit/classical.md', rows.replace('| C |', '| C, could not check the replacement |'), registry,
    ));
    expect(unsettled).toContain('Recorded corrected: 0');
    expect(unsettled).toContain('Recorded verified: 0');
    expect(unsettled).toContain('Unresolved or unrecognised verdicts: 1');
  });

  it('folds a continued section into the article it continues', () => {
    const sections = parseLedger('audit/frontier.md', FIVE_COLUMN);
    expect(sections).toHaveLength(1);
    expect(sections[0].slug).toBe('reliability-gap');
    expect(sections[0].claimRows).toBe(2);
  });

  it('regenerates only summary prose and cannot turn incomplete legacy rows into passes', () => {
    const before = parseLedger('audit/classical.md', THREE_COLUMN);
    const updated = withLedgerSummary(THREE_COLUMN, before);
    const after = parseLedger('audit/classical.md', updated);
    expect(updated).toContain('## Historical: Summary');
    expect(updated).toContain('Incomplete evidence records: 3');
    expect(after[0].summaryFailures).toEqual([]);
    const withoutLines = (sections: LedgerSection[]) =>
      sections.flatMap((section) => section.claimRecords.map((record) => ({ ...record, line: 0 })));
    expect(withoutLines(after)).toEqual(withoutLines(before));
    expect(after.flatMap((section) => section.unevidencedRows)).toHaveLength(3);
    expect(withLedgerSummary(updated, after)).toBe(updated);
    expect(() => withLedgerSummary(THREE_COLUMN.replace('# Classical audit\n', ''), before))
      .toThrow(/level-one title/);
    expect(parseLedger('audit/classical.md', `${updated}\n## Summary\nUnresolved: 1`)[0].summaryFailures)
      .toHaveLength(1);
  });

  it('finds the source column wherever the table puts it', () => {
    const three = parseLedger('audit/classical.md', THREE_COLUMN);
    const five = parseLedger('audit/frontier.md', FIVE_COLUMN);
    expect(three[0].unsourcedRows).toEqual([]);
    expect(five[0].unsourcedRows).toEqual([]);
  });

  it('reports a claim row whose source cell is empty', () => {
    const withHole = THREE_COLUMN.replace(
      '| DH 1955 uses exactly four scalars per joint | denavit-hartenberg-1955 |',
      '| DH 1955 uses exactly four scalars per joint |  |',
    );
    const sections = parseLedger('audit/classical.md', withHole);
    expect(sections[0].unsourcedRows).toEqual([
      'DH 1955 uses exactly four scalars per joint',
    ]);
  });

  it('reads the verdict of every row, not just its source', () => {
    const sections = parseLedger('audit/classical.md', THREE_COLUMN);
    expect(sections[0].unresolvedRows).toEqual([]);
    expect(sections[0].unverdictedRows).toEqual([]);
    expect(sections[0].recordedInconsistencyRows).toBe(0);
  });

  it('collects a row the auditor could not resolve, however it is spelled', () => {
    const stuck = THREE_COLUMN.replace(
      '| DH 1955 uses exactly four scalars per joint | denavit-hartenberg-1955 | C ("five" -> "four") |',
      '| DH 1955 uses exactly four scalars per joint | denavit-hartenberg-1955 | **unresolved** |',
    ).replace(
      '| C-space reformulation is due to Lozano-Perez 1983 | lozano-perez-1983 | V |',
      '| C-space reformulation is due to Lozano-Perez 1983 | lozano-perez-1983 | UNRESOLVED |',
    );
    const sections = parseLedger('audit/classical.md', stuck);
    expect(sections[0].unresolvedRows).toEqual([
      {
        claim: 'DH 1955 uses exactly four scalars per joint',
        verdict: '**unresolved**',
      },
    ]);
    expect(sections[1].unresolvedRows).toEqual([
      {
        claim: 'C-space reformulation is due to Lozano-Perez 1983',
        verdict: 'UNRESOLVED',
      },
    ]);
  });

  it('collects a row whose verdict cell nobody filled in', () => {
    const blank = THREE_COLUMN.replace(
      '| FK is an ordered product of per-joint transforms | modern-robotics-2017 | V |',
      '| FK is an ordered product of per-joint transforms | modern-robotics-2017 |  |',
    );
    expect(parseLedger('audit/classical.md', blank)[0].unverdictedRows).toEqual([
      'FK is an ordered product of per-joint transforms',
    ]);
  });

  it('grades a verdict vocabulary it does not recognise as unresolved, not as passing', () => {
    expect(classifyVerdict('V', { source: 'x', note: '' })).toBe('passing');
    expect(classifyVerdict('**corrected**', { source: 'x', note: '' })).toBe(
      'passing',
    );
    expect(
      classifyVerdict('C twice over: both figures moved', {
        source: 'x',
        note: '',
      }),
    ).toBe('passing');
    expect(classifyVerdict('**unresolved**', { source: 'x', note: 'n' })).toBe(
      'unresolved',
    );
    expect(
      classifyVerdict('V | **Could not check.** paywalled', {
        source: 'x',
        note: 'n',
      }),
    ).toBe('unresolved');
    expect(classifyVerdict('probably fine', { source: 'x', note: 'n' })).toBe(
      'unrecognised',
    );
    // `S` closes only when the auditor read a source and wrote down what it
    // said; an `S` with an empty note is a shrug, not a finding.
    expect(classifyVerdict('S', { source: 'x', note: 'disagrees' })).toBe(
      'recorded-inconsistency',
    );
    expect(classifyVerdict('S', { source: 'x', note: '' })).toBe('unresolved');
  });

  it('refuses a table that names no source column at all', () => {
    const noSource = `### kinematics.mdx

| Claim | Verdict |
| --- | --- |
| FK is an ordered product | V |
`;
    expect(() => parseLedger('audit/classical.md', noSource)).toThrow(
      /source column/i,
    );
  });
});

describe('registry-to-ledger reconciliation', () => {
  const audited = (
    entries: readonly (readonly [string, number])[],
  ): LedgerSection[] =>
    entries.map(([slug, claimRows]) => ({
      slug,
      ledgerPath: 'audit/classical.md',
      claimRows,
      unsourcedRows: [],
      unresolvedRows: [],
      unverdictedRows: [],
      recordedInconsistencyRows: 0,
      unevidencedRows: [],
      evidenceKinds: {},
      claimRecords: [],
      summaryFailures: [],
    }));

  it('passes when the audited set equals the published set', () => {
    const result = reconcileDomain({
      domain: 'classical',
      assertionId: 'VAL-AUDIT-005',
      ledgerPath: 'audit/classical.md',
      published: ['kinematics', 'motion-planning'],
      sections: audited([
        ['kinematics', 2],
        ['motion-planning', 1],
      ]),
    });
    expect(result.failures).toEqual([]);
    expect(result.auditedCount).toBe(2);
    expect(result.publishedCount).toBe(2);
  });

  it('fails closed on a published article the ledger never audited', () => {
    const result = reconcileDomain({
      domain: 'classical',
      assertionId: 'VAL-AUDIT-005',
      ledgerPath: 'audit/classical.md',
      published: ['kinematics', 'motion-planning', 'perception'],
      sections: audited([
        ['kinematics', 2],
        ['motion-planning', 1],
      ]),
    });
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].kind).toBe('unaudited-published-article');
    expect(result.failures[0].message).toContain('perception');
  });

  it('fails closed on a ledger section for an article that is not published', () => {
    const result = reconcileDomain({
      domain: 'classical',
      assertionId: 'VAL-AUDIT-005',
      ledgerPath: 'audit/classical.md',
      published: ['kinematics'],
      sections: audited([
        ['kinematics', 2],
        ['retracted-thing', 1],
      ]),
    });
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].kind).toBe('audited-unpublished-article');
    expect(result.failures[0].message).toContain('retracted-thing');
  });

  it('fails closed on an empty published population', () => {
    const result = reconcileDomain({
      domain: 'classical',
      assertionId: 'VAL-AUDIT-005',
      ledgerPath: 'audit/classical.md',
      published: [],
      sections: [],
    });
    expect(result.failures.map((f) => f.kind)).toContain('empty-population');
  });

  it('fails closed on an empty audited population', () => {
    const result = reconcileDomain({
      domain: 'classical',
      assertionId: 'VAL-AUDIT-005',
      ledgerPath: 'audit/classical.md',
      published: ['kinematics'],
      sections: [],
    });
    expect(result.failures.map((f) => f.kind)).toContain('empty-population');
  });

  it('fails a section that carries a heading but no checked claim', () => {
    const result = reconcileDomain({
      domain: 'classical',
      assertionId: 'VAL-AUDIT-005',
      ledgerPath: 'audit/classical.md',
      published: ['kinematics'],
      sections: audited([['kinematics', 0]]),
    });
    expect(result.failures.map((f) => f.kind)).toContain('vacuous-section');
  });

  it('fails a claim row that names no source', () => {
    const result = reconcileDomain({
      domain: 'classical',
      assertionId: 'VAL-AUDIT-005',
      ledgerPath: 'audit/classical.md',
      published: ['kinematics'],
      sections: [
        {
          slug: 'kinematics',
          ledgerPath: 'audit/classical.md',
          claimRows: 2,
          unsourcedRows: ['DH 1955 uses exactly four scalars'],
          unresolvedRows: [],
          unverdictedRows: [],
          recordedInconsistencyRows: 0,
          unevidencedRows: [],
          evidenceKinds: {},
          claimRecords: [],
          summaryFailures: [],
        },
      ],
    });
    expect(result.failures.map((f) => f.kind)).toContain('unsourced-claim');
  });
});

describe('per-claim evidence', () => {
  const REGISTRY = new Set(['modern-robotics-2017', 'denavit-hartenberg-1955']);

  const ledger = (source: string, note = 'checked') => `# Classical audit

### kinematics.mdx

| Claim | Source checked | Verdict | Note |
| --- | --- | --- | --- |
| A claim about a joint transform | ${source} | V | ${note} |
`;

  it('rejects a lone registry id, locator, quoted passage or declared basis', () => {
    for (const source of [
      'modern-robotics-2017',
      'figure.ai/news/helix-02 (fetched)',
      'DP paper, Sec. 3.1',
      'π0 model card',
      'arithmetic (p^N)',
    ]) {
      const [section] = parseLedger(
        'audit/classical.md',
        ledger(source, '-'),
        REGISTRY,
      );
      expect(section.unevidencedRows, `${source} was accepted alone`).toHaveLength(1);
      expect(section.evidenceKinds).toEqual({});
      expect(section.claimRecords[0].legacyPointer).not.toBeNull();
    }
  });

  it('fails a row whose source cell is filled in but names nothing checkable', () => {
    // The gate only ever asked whether the cell was empty, so "tbd" and
    // "see above" counted as a sourced claim.
    for (const source of ['tbd', 'see above', '--', 'n/a']) {
      const [section] = parseLedger(
        'audit/classical.md',
        ledger(source, '-'),
        REGISTRY,
      );
      expect(
        section.unevidencedRows.map(({ source: cell }) => cell),
        `${source} was accepted as evidence`,
      ).toEqual([source]);
      const failures = reconcileDomain({
        domain: 'classical',
        assertionId: 'VAL-AUDIT-005',
        ledgerPath: 'audit/classical.md',
        published: ['kinematics'],
        sections: [section],
      }).failures;
      expect(failures.map(({ kind }) => kind)).toContain('unevidenced-claim');
      expect(failures.map(({ message }) => message).join('\n')).toMatch(
        /lacks a complete per-claim Citation ID, Source URL fetched, or Supporting passage/,
      );
    }
  });

  it('does not promote a quoted note into three distinct evidence fields', () => {
    const [section] = parseLedger(
      'audit/classical.md',
      ledger(
        'Each fetched during this audit',
        'Titles match the live document: "A Kinematic Notation for Lower-Pair Mechanisms"',
      ),
      REGISTRY,
    );
    expect(section.unevidencedRows).toHaveLength(1);
    expect(section.evidenceKinds).toEqual({});
  });

  it('refuses a corpus that carries none of the strong evidence forms', () => {
    const summary = summarise([
      {
        domain: 'classical',
        assertionId: 'VAL-AUDIT-005',
        ledgerPath: 'audit/classical.md',
        publishedCount: 1,
        auditedCount: 1,
        claimRows: 1,
        evidenceKinds: { 'named-document': 1 },
        failures: [],
      },
    ]);
    expect(summary.ok).toBe(false);
    expect(summary.failures.map(({ message }) => message).join('\n')).toMatch(
      /0\/1 claim rows carry complete citation-id evidence/,
    );
  });
});

describe('the audit ledger registry', () => {
  it('maps each of the six per-domain assertions to exactly one ledger', () => {
    const withAssertions = AUDIT_LEDGERS.filter((l) => l.assertionId !== null);
    expect(withAssertions.map((l) => l.assertionId).sort()).toEqual([
      'VAL-AUDIT-001',
      'VAL-AUDIT-002',
      'VAL-AUDIT-003',
      'VAL-AUDIT-004',
      'VAL-AUDIT-005',
      'VAL-AUDIT-006',
    ]);
    expect(new Set(withAssertions.map((l) => l.ledgerPath)).size).toBe(6);
  });

  it('covers every domain the module registry publishes', async () => {
    const { DOMAINS } = await import('../../data/modules.ts');
    expect(AUDIT_LEDGERS.map((l) => l.domain).sort()).toEqual(
      [...DOMAINS].sort(),
    );
  });
});

describe('the coverage summary', () => {
  it('adds up the per-domain counts and reports failure when any domain fails', () => {
    const summary = summarise([
      {
        domain: 'classical',
        assertionId: 'VAL-AUDIT-005',
        ledgerPath: 'audit/classical.md',
        publishedCount: 2,
        auditedCount: 2,
        claimRows: 3,
        evidenceKinds: { 'citation-id': 3, locator: 3, passage: 3 },
        failures: [],
      },
      {
        domain: 'frontier',
        assertionId: 'VAL-AUDIT-006',
        ledgerPath: 'audit/frontier.md',
        publishedCount: 2,
        auditedCount: 1,
        claimRows: 1,
        evidenceKinds: { 'citation-id': 1, locator: 1, passage: 1 },
        failures: [
          {
            kind: 'unaudited-published-article',
            domain: 'frontier',
            message: 'frontier: published article `bear-case` has no ledger',
          },
        ],
      },
    ]);
    expect(summary.ok).toBe(false);
    expect(summary.publishedCount).toBe(4);
    expect(summary.auditedCount).toBe(3);
    expect(summary.claimRows).toBe(4);
    expect(summary.evidenceKinds).toEqual({
      'citation-id': 4,
      locator: 4,
      passage: 4,
    });
    expect(summary.failures).toHaveLength(1);
  });
});

describe('a ledger row that decided nothing', () => {
  const unresolvedSection = (
    over: Partial<LedgerSection> = {},
  ): LedgerSection => ({
    slug: 'kinematics',
    ledgerPath: 'audit/classical.md',
    claimRows: 2,
    unsourcedRows: [],
    unresolvedRows: [],
    unverdictedRows: [],
    recordedInconsistencyRows: 0,
    unevidencedRows: [],
    evidenceKinds: {},
    claimRecords: [],
    summaryFailures: [],
    ...over,
  });
  const reconcile = (section: LedgerSection) =>
    reconcileDomain({
      domain: 'classical',
      assertionId: 'VAL-AUDIT-005',
      ledgerPath: 'audit/classical.md',
      published: ['kinematics'],
      sections: [section],
    });

  it('fails the domain, because the contract says an unchecked claim is a failure', () => {
    const result = reconcile(
      unresolvedSection({
        unresolvedRows: [{ claim: 'On-policy is more stable', verdict: 'UNRESOLVED' }],
      }),
    );
    expect(result.failures.map((f) => f.kind)).toContain('unresolved-claim');
    expect(result.failures[0].message).toContain('On-policy is more stable');
  });

  it('fails a row nobody gave a verdict at all', () => {
    const result = reconcile(
      unresolvedSection({ unverdictedRows: ['A claim with an empty verdict cell'] }),
    );
    expect(result.failures.map((f) => f.kind)).toContain('unverdicted-claim');
  });

  it('passes a documented disagreement, which is a decided row', () => {
    expect(reconcile(unresolvedSection({ recordedInconsistencyRows: 2 })).failures).toEqual(
      [],
    );
  });
});

describe('compound evidence on one original claim (synthetic fixtures, never fetched)', () => {
  const ids = ['alvinn-1988', 'dagger-2011', 'hg-dagger-2019', 'pistar06-blog-2025',
    'act-aloha-2023', 'diffusion-policy-2023'];
  const registry = new Set(CITATIONS.map((citation) => citation.id));
  const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const original = [
    `Frontmatter citations resolve to the intended documents (${ids.join(', ')})`,
    'SYNTHETIC FIXTURE ONLY: no document fetched',
    'verified',
    'SYNTHETIC source-review fixture, not a factual adjudication',
  ];
  const headers = ['Claim', 'Source checked', 'Verdict', 'Note', 'Citation ID',
    'Source URL fetched', 'Supporting passage', 'Evidence plan'];
  const tableRow = (values: string[]) => `| ${values.join(' | ')} |`;
  const scalar = [ids[0], 'https://source.example/a',
    'SYNTHETIC FIXTURE ONLY, NOT FETCHED: source A claims its metadata matches.'];
  const planDigest = (plan: CompoundPlan) => digest([
    plan.id, plan.ledgerPath, plan.articleSlug, plan.rowOrdinal,
    plan.originalCellsDigest, plan.kind, plan.parts,
  ]);
  const partDigest = (plan: CompoundPlan, partId: string) => digest([
    planDigest(plan), partId,
    plan.evidence.filter((item) => item.partId === partId)
      .map(({ citationId, sourceUrl, supportingPassage }) => [citationId, sourceUrl, supportingPassage]),
  ]);
  const review = (plan: CompoundPlan) => {
    plan.planReview = {
      reviewedBy: 'synthetic-fixture-agent', rationale: 'SYNTHETIC plan review only',
      planDigest: planDigest(plan),
    };
    plan.adjudications = plan.parts.map((part) => ({
      partId: part.id, outcome: 'supported', reviewedBy: 'synthetic-fixture-agent',
      rationale: 'SYNTHETIC source adjudication, never real source proof',
      evidenceDigest: partDigest(plan, part.id),
    }));
    return plan;
  };
  const fixture = (): CompoundPlan => review({
    id: 'synthetic-p1', ledgerPath: 'audit/manipulation.md', articleSlug: 'fixture',
    rowOrdinal: 1, originalCellsDigest: digest(original), kind: 'frontmatter-p1',
    parts: ids.map((id) => ({ id, text: `SYNTHETIC: title, authors and year for ${id}`,
      requiredCitationIds: [id] })),
    planReview: null,
    evidence: ids.map((id) => ({ partId: id, citationId: id,
      sourceUrl: `https://source.example/${id}`,
      supportingPassage: `SYNTHETIC FIXTURE ONLY, NOT FETCHED: metadata for ${id} is claimed to match.` })),
    adjudications: [],
  });
  const markdown = (extra = ['', '', '', 'synthetic-p1'], columns = headers, copies = 1) => [
    '# SYNTHETIC FIXTURE ONLY — NOT A SOURCE AUDIT', '', '## fixture.mdx', '',
    tableRow(columns), tableRow(columns.map(() => '---')),
    ...Array.from({ length: copies }, () => tableRow([...original, ...extra])), '',
  ].join('\n');
  const parse = (text: string, plans: unknown = [fixture()], citations = ids) =>
    parseLedger('audit/manipulation.md', text, registry, {
      compoundPlans: plans, articleCitations: { fixture: citations },
    } as AuditEvidenceContext);
  const failed = (plan: CompoundPlan, reason: RegExp) => {
    const [section] = parse(markdown(), [plan]);
    expect(section.claimRows).toBe(1);
    expect(section.unevidencedRows).toHaveLength(1);
    expect(section.claimRecords[0].evidenceFailures.join('\n')).toMatch(reason);
  };

  it('keeps six paired items on ONE row and derives a one-row summary', () => {
    const text = markdown();
    const before = parse(text);
    const sealed = withLedgerSummary(text, before);
    const [section] = parse(sealed);
    expect(section.claimRows).toBe(1);
    expect(section.unevidencedRows).toEqual([]);
    expect(section.evidenceKinds).toEqual({ 'citation-id': 1, locator: 1, passage: 1 });
    expect(section.claimRecords[0].compound?.evidence).toHaveLength(6);
    expect(section.claimRecords[0].compound?.structuralFailures).toEqual([]);
    expect(section.claimRecords[0].compound?.adjudicationFailures).toEqual([]);
    expect(section.summaryFailures).toEqual([]);
    expect(ledgerSummary([section])).toContain('Complete evidence records: 1');
    const record = section.claimRecords[0];
    expect([record.claim, record.sourceChecked, record.verdict, record.note]).toEqual(original);
  });

  it('diagnostic 1: one scalar triple cannot satisfy a registered compound', () => {
    expect(parse(markdown([...scalar, 'synthetic-p1']))[0].unevidencedRows).toHaveLength(1);
  });
  it('diagnostic 2: rejects batched IDs in a scalar cell', () => {
    expect(parse(markdown([ids.join(', '), scalar[1], scalar[2], '']))[0].unevidencedRows).toHaveLength(1);
  });
  it('diagnostic 3: parallel JSON arrays cannot substitute for paired items', () => {
    expect(parse(markdown([JSON.stringify(ids), JSON.stringify([scalar[1]]),
      JSON.stringify([scalar[2]]), '']))[0].unevidencedRows).toHaveLength(1);
  });
  it.each([
    ['diagnostic 4: unregistered JSON column', ['Evidence records'], ['[]']],
    ['diagnostic 5: duplicate complete triples', headers.slice(4, 7), scalar],
    ['diagnostic 6: duplicate partial unknown triple', headers.slice(4, 7), ['unknown-fixture-id', '', '']],
    ['diagnostic 7: numbered extra triples', headers.slice(4, 7).map((h) => `${h} 2`), scalar],
  ])('%s', (_name, extraHeaders, extraCells) => {
    expect(() => parse(markdown([...scalar, '', ...extraCells], [...headers, ...extraHeaders])))
      .toThrow(/evidence header/i);
  });
  it('diagnostic 8: another triple in passage prose is not paired evidence', () => {
    const plan = fixture();
    plan.evidence = [];
    expect(parse(markdown([scalar[0], scalar[1],
      `${scalar[2]} SYNTHETIC embedded JSON ${JSON.stringify(fixture().evidence[1])}`, plan.id]), [plan])[0]
      .unevidencedRows).toHaveLength(1);
  });
  it('diagnostic 9: repeating the original row cannot reuse its binding', () => {
    expect(() => parse(markdown(['', '', '', 'synthetic-p1'], headers, 2))).toThrow(/duplicate.*binding/i);
  });
  it('allows repeated evidence headers in separate continued tables', () => {
    const base = `# Synthetic\n\n## fixture.mdx\n\n${tableRow(headers.slice(0, 7))}\n${tableRow(headers.slice(0, 7).map(() => '---'))}\n${tableRow(['SYNTHETIC single claim', ...original.slice(1), ...scalar])}\n`;
    const continued = base + base.slice(base.indexOf('## fixture')).replace('fixture.mdx', 'fixture.mdx (continued)');
    expect(parse(continued, [])[0].claimRows).toBe(2);
    expect(parse(continued, [])[0].unevidencedRows).toEqual([]);
  });
  it('rejects an unheaded extra triple instead of dropping cells', () => {
    expect(() => parse(markdown([...scalar, '', ...scalar]))).toThrow(/extra.*cells/i);
  });
  it('fails a missing catalog entry even with a valid scalar triple', () => {
    expect(parse(markdown([...scalar, 'synthetic-p1']), [])[0].unevidencedRows).toHaveLength(1);
  });
  it('fails a removed binding column while a compound is registered', () => {
    const plan = fixture();
    expect(parse(markdown(scalar, headers.slice(0, 7)), [plan])[0].unevidencedRows).toHaveLength(1);
  });
  it('cannot bypass explicit P1 coverage by removing both plan and binding', () => {
    expect(parse(markdown([...scalar, '']), [])[0].unevidencedRows).toHaveLength(1);
  });
  it.each(['claim', 'source', 'verdict', 'note'])('rejects stale original-cell binding: %s', (_field) => {
    const index = ['claim', 'source', 'verdict', 'note'].indexOf(_field);
    const changed = markdown().replace(original[index], `${original[index]} changed`);
    expect(parse(changed)[0].claimRecords[0].evidenceFailures.join('\n')).toMatch(/original.*digest/i);
  });
  it('rejects duplicate plan IDs, duplicate row targets and unbound extra plans', () => {
    const plan = fixture();
    expect(() => parse(markdown(), [plan, plan])).toThrow(/duplicate.*plan/i);
    expect(() => parse(markdown(), [plan, { ...plan, id: 'another-plan' }])).toThrow(/duplicate.*row/i);
    expect(() => parse(markdown(), [{ ...plan, rowOrdinal: 2 }])).toThrow(/unbound.*plan/i);
  });
  it.each([null, {}, [{ id: 'partial' }]])('rejects malformed catalogs rather than using scalars: %j', (plans) => {
    expect(() => parse(markdown([...scalar, 'synthetic-p1']), plans)).toThrow(/compound.*format/i);
  });
  it('rejects unknown keys rather than silently stripping malformed records', () => {
    expect(() => parse(markdown(), [{ ...fixture(), unsupported: true }])).toThrow(/compound.*format/i);
  });
  it('rejects shrinking a P1 plan and recomputing all reviews to one available source', () => {
    const plan = fixture();
    plan.parts = plan.parts.slice(0, 1);
    plan.evidence = plan.evidence.slice(0, 1);
    failed(review(plan), /P1.*citation set/i);
  });
  it('checks canonical frontmatter independently of the explicit batch', () => {
    expect(parse(markdown(), [fixture()], ids.slice(0, 1))[0].claimRecords[0].evidenceFailures.join('\n'))
      .toMatch(/P1.*citation set/i);
    expect(parseLedger('audit/manipulation.md', markdown(), registry, { compoundPlans: [fixture()] })
      [0].unevidencedRows).toHaveLength(1);
  });
  it('does not allow an explicit-parts kind to bypass a P1 batch', () => {
    const plan = fixture(); plan.kind = 'explicit-parts';
    failed(review(plan), /P1.*kind/i);
  });
  it.each(['missing', 'duplicate', 'unknown', 'unexpected', 'unassigned', 'empty'])('requires exact AND item coverage: %s', (mutation) => {
    const plan = fixture();
    if (mutation === 'missing') plan.evidence.pop();
    if (mutation === 'duplicate') plan.evidence[5] = { ...plan.evidence[0] };
    if (mutation === 'unknown') plan.evidence[5].citationId = 'unregistered-fixture';
    if (mutation === 'unexpected') plan.evidence.push({ ...plan.evidence[0], citationId: 'rt1-2022' });
    if (mutation === 'unassigned') plan.evidence[5].partId = 'unassigned-fixture';
    if (mutation === 'empty') plan.evidence = [];
    failed(review(plan), /compound.*(?:item|coverage|registered)/i);
  });
  it.each(['citationId', 'sourceUrl', 'supportingPassage'] as const)('checks every required field of a later item: %s', (field) => {
    const plan = fixture(); plan.evidence[5][field] = '';
    failed(review(plan), /compound.*item/i);
  });
  it('rejects a malformed partial item, unknown required ID, and empty/duplicate parts', () => {
    const plan = fixture();
    expect(() => parse(markdown(), [{ ...plan, evidence: [{ partId: ids[0] }] }])).toThrow(/compound.*format/i);
    plan.parts[5].requiredCitationIds = ['unregistered-fixture'];
    failed(review(plan), /registered/i);
    expect(() => parse(markdown(), [{ ...fixture(), parts: [] }])).toThrow(/compound.*format/i);
    const duplicate = fixture(); duplicate.parts[5] = { ...duplicate.parts[0] };
    failed(review(duplicate), /duplicate.*part/i);
  });
  it('pairs distinct primary URLs for one required identity without duplicating the row', () => {
    const plan = fixture();
    plan.evidence.push({ ...plan.evidence[0], sourceUrl: 'https://source.example/proceedings',
      supportingPassage: 'SYNTHETIC FIXTURE ONLY: independent publication identity passage.' });
    const [section] = parse(markdown(), [review(plan)]);
    expect(section.claimRows).toBe(1);
    expect(section.claimRecords[0].evidenceFailures).toEqual([]);
  });
  it('rejects repeated source URLs for the same part and citation even with different text', () => {
    const plan = fixture();
    plan.evidence.push({ ...plan.evidence[0], supportingPassage: 'SYNTHETIC different text, same source.' });
    failed(review(plan), /compound.*(?:item|coverage|duplicate)/i);
  });
  it('requires fresh source adjudication after another primary response is added', () => {
    const plan = fixture();
    plan.evidence.push({ ...plan.evidence[0], sourceUrl: 'https://source.example/proceedings' });
    failed(plan, /stale.*adjudication/i);
  });
  it('validates the URL of every additional source response', () => {
    const plan = fixture();
    plan.evidence.push({ ...plan.evidence[0], sourceUrl: 'not a URL' });
    failed(review(plan), /compound.*item/i);
  });
  it('never promotes legacy quoted notes into compound items', () => {
    const plan = fixture(); plan.evidence = [];
    failed(plan, /compound.*coverage/i);
  });
  it.each(['unresolved', 'contradicted'] as const)('keeps %s adjudication failing despite old verified verdict', (outcome) => {
    const plan = fixture(); plan.adjudications[5].outcome = outcome;
    const [section] = parse(markdown(), [plan]);
    expect(section.claimRecords[0].compound?.structuralFailures).toEqual([]);
    expect(section.claimRecords[0].compound?.adjudicationFailures.join('\n')).toContain(outcome);
    expect(section.unevidencedRows).toHaveLength(1);
    expect(section.claimRecords[0].verdict).toBe('verified');
  });
  it('fails missing, duplicate, unassigned and stale source adjudications', () => {
    const missing = fixture(); missing.adjudications.pop(); failed(missing, /adjudication/i);
    const duplicate = fixture(); duplicate.adjudications[5] = { ...duplicate.adjudications[0] };
    failed(duplicate, /adjudication/i);
    const unassigned = fixture(); unassigned.adjudications[5].partId = 'unassigned';
    failed(unassigned, /adjudication/i);
    const stale = fixture(); stale.evidence[5].supportingPassage += ' changed';
    failed(stale, /stale.*adjudication/i);
  });
  it('requires review of changed plans, not just item counts or hashes', () => {
    const plan = fixture(); plan.parts[5].text += ' changed';
    failed(plan, /plan review/i);
    plan.planReview = null; failed(plan, /plan review/i);
  });
  it('supports an explicit reviewed non-P1 AND plan without changing its original row', () => {
    const text = markdown().replace(original[0], 'SYNTHETIC compound: mechanism AND limitation');
    const plan = fixture();
    plan.kind = 'explicit-parts';
    plan.originalCellsDigest = digest(['SYNTHETIC compound: mechanism AND limitation', ...original.slice(1)]);
    plan.parts = [{ id: 'mechanism-and-limitation', text: 'SYNTHETIC: both sources required',
      requiredCitationIds: ids.slice(0, 2) }];
    plan.evidence = plan.evidence.slice(0, 2).map((item) => ({ ...item, partId: plan.parts[0].id }));
    expect(parse(text, [review(plan)])[0].unevidencedRows).toEqual([]);
    plan.evidence.pop();
    expect(parse(text, [review(plan)])[0].unevidencedRows).toHaveLength(1);
  });
});


describe('authored-local-basis-v1 native guard', () => {
  it('cannot certify the closed local obligation through scalar fallback', () => {
    const md = `## reward-design-mpc.mdx
| Claim | Source checked | Verdict | Note | Citation ID | Source URL fetched | Supporting passage |
| --- | --- | --- | --- | --- | --- | --- |
` + Array.from({ length: 4 }, () => '| SYNTHETIC authored terms | synthetic | V | illustrative | alvinn-1988 | https://source.example/paper | Synthetic external sentence, not fetched or factual. |').join('\n');
    const rows = parseLedger('audit/rl-sim2real.md', md, new Set(['alvinn-1988']))[0].claimRecords;
    expect(rows[0].evidenceFailures).toEqual([]);
    expect(rows[3].evidenceFailures.join(' ')).toMatch(/local.*(?:required|obligation)/i);
  });
  it('counts complete local and mixed rows once without external fields', () => {
    const result = summarise([{ domain: 'synthetic', assertionId: null,
      ledgerPath: 'audit/synthetic.md', publishedCount: 1, auditedCount: 1,
      claimRows: 2, evidenceKinds: { 'authored-local': 1, 'mixed-local': 1 }, failures: [] }]);
    expect(result.ok).toBe(true);
    expect(result.evidenceKinds['citation-id']).toBeUndefined();
  });
});


describe('authored-local-basis-v1 legacy restoration guard', () => {
  it('refuses restored legacy reviews for an eligible local target', async () => {
    const { compoundPlanDigest, compoundPartDigest, originalClaimDigest } = await import('../../lib/audit-ledger.ts');
    const cells = { claim: 'SYNTHETIC authored term set', sourceChecked: 'synthetic', verdict: 'V', note: 'SYNTHETIC fixture' };
    const plan: CompoundPlan = { id: 'restored', kind: 'explicit-parts', ledgerPath: 'audit/rl-sim2real.md',
      articleSlug: 'reward-design-mpc', rowOrdinal: 4, originalCellsDigest: originalClaimDigest(cells),
      parts: [{ id: 'local', text: 'SYNTHETIC local disguised as external', requiredCitationIds: ['alvinn-1988'] }],
      evidence: [{ partId: 'local', citationId: 'alvinn-1988', sourceUrl: 'https://source.example/paper', supportingPassage: 'SYNTHETIC passage, never fetched.' }],
      planReview: null, adjudications: [] };
    plan.planReview = { reviewedBy: 'SYNTHETIC', rationale: 'SYNTHETIC', planDigest: compoundPlanDigest(plan) };
    plan.adjudications = [{ partId: 'local', outcome: 'supported', reviewedBy: 'SYNTHETIC', rationale: 'SYNTHETIC', evidenceDigest: compoundPartDigest(plan, 'local') }];
    const header = '## reward-design-mpc.mdx\n| Claim | Source checked | Verdict | Note | Evidence plan |\n| --- | --- | --- | --- | --- |\n';
    const md = header + Array.from({ length: 4 }, (_, i) => `| ${Object.values(cells).join(' | ')} | ${i === 3 ? 'restored' : ''} |`).join('\n');
    const row = parseLedger(plan.ledgerPath, md, new Set(['alvinn-1988']), { compoundPlans: [plan] })[0].claimRecords[3];
    expect(row.compound?.structuralFailures).toEqual([]);
    expect(row.compound?.adjudicationFailures).toEqual([]);
    expect(row.evidenceFailures.join(' ')).toMatch(/local.*required/);
  });
});
