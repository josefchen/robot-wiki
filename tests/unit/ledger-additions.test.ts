import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { parseLedger } from '../../lib/audit-ledger';
import { LEDGER_ADDITIONS_REVIEW, verifyLedgerAdditions } from '../helpers/ledger-additions';
import { currentAuditContext } from '../helpers/residual-integration';
import { preDomainPassCitations } from '../helpers/domain-pass';

const registry = new Set(CITATIONS.map(({ id }) => id));
const context = currentAuditContext();
const sections = ['audit/classical.md', 'audit/manipulation.md', 'audit/rl-sim2real.md',
  'audit/world-models.md', 'audit/data-hardware.md', 'audit/frontier.md', 'audit/adjacent.md'].flatMap(path =>
  parseLedger(path, readFileSync(path, 'utf8'), registry, {
    ...context,
    // Match the current audit gate: an original P1 plan certifies its
    // declared source set; later sources have separate current claim rows.
    articleCitations: Object.fromEntries(Object.entries(context.articleCitations).map(([slug, citations]) =>
      [slug, preDomainPassCitations(path.slice('audit/'.length, -'.md'.length), slug, citations)])),
  }));

describe('exact later ledger row accounting', () => {
  it('retains all 1080 original rows and binds every one of the 174 added rows without filtering current parsing', () => {
    expect(sections).toHaveLength(57);
    const counts = sections.map(section => verifyLedgerAdditions(section));
    expect(counts.reduce((sum, row) => sum + row.originalRows, 0)).toBe(1080);
    expect(counts.reduce((sum, row) => sum + row.addedRows, 0)).toBe(174);
    expect(counts.reduce((sum, row) => sum + row.currentRows, 0)).toBe(1254);
    expect(sections.flatMap(section => section.claimRecords.flatMap(row => row.evidenceFailures))).toEqual([]);
  });

  it('rejects removed, reordered, altered and unevidenced rows in either population', () => {
    for (const section of sections) {
      const { originalRows, addedRows } = verifyLedgerAdditions(section);
      for (const index of [0, ...(addedRows ? [originalRows] : [])]) {
        const altered = { ...section, claimRecords: section.claimRecords.map(row => ({ ...row })) };
        altered.claimRecords[index].claim += ' unreviewed addition';
        expect(() => verifyLedgerAdditions(altered)).toThrow(/ledger additions drift/);
        const missing = { ...section, claimRows: section.claimRows - 1,
          claimRecords: section.claimRecords.filter((_, ordinal) => ordinal !== index) };
        expect(() => verifyLedgerAdditions(missing)).toThrow(/ledger additions drift/);
      }
      const reordered = { ...section, claimRecords: [...section.claimRecords].reverse() };
      expect(() => verifyLedgerAdditions(reordered)).toThrow(/ledger additions drift/);
      if (addedRows) {
        const unevidenced = { ...section, claimRecords: section.claimRecords.map((row, index) => index === originalRows
          ? { ...row, evidenceFailures: ['required source passage removed'] } : row) };
        expect(() => verifyLedgerAdditions(unevidenced)).toThrow(/ledger additions drift/);
      }
    }
  });

  it('rejects an unknown section and a changed additions review', () => {
    expect(() => verifyLedgerAdditions({ ...sections[0], slug: 'unreviewed' })).toThrow(/ledger additions drift/);
    const scratch = mkdtempSync(join(tmpdir(), 'ledger-additions-'));
    try {
      const target = join(scratch, LEDGER_ADDITIONS_REVIEW);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, `${readFileSync(LEDGER_ADDITIONS_REVIEW, 'utf8')} `);
      expect(() => verifyLedgerAdditions(sections[0], scratch)).toThrow(/ledger additions drift/);
    } finally { rmSync(scratch, { recursive: true, force: true }); }
  });
});
