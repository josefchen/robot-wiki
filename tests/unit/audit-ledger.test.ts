import { describe, expect, it } from 'vitest';
import {
  AUDIT_LEDGERS,
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

  it('folds a continued section into the article it continues', () => {
    const sections = parseLedger('audit/frontier.md', FIVE_COLUMN);
    expect(sections).toHaveLength(1);
    expect(sections[0].slug).toBe('reliability-gap');
    expect(sections[0].claimRows).toBe(2);
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
        },
      ],
    });
    expect(result.failures.map((f) => f.kind)).toContain('unsourced-claim');
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
        failures: [],
      },
      {
        domain: 'frontier',
        assertionId: 'VAL-AUDIT-006',
        ledgerPath: 'audit/frontier.md',
        publishedCount: 2,
        auditedCount: 1,
        claimRows: 1,
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
    expect(summary.failures).toHaveLength(1);
  });
});
