import { describe, expect, it } from 'vitest';
import {
  AUDIT_LEDGERS,
  classifyVerdict,
  ledgerSummary,
  withLedgerSummary,
  parseLedger,
  reconcileDomain,
  summarise,
  type LedgerSection,
} from '../../lib/audit-ledger.ts';

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
