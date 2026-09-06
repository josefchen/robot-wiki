import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CITATION_LEDGER_PATH,
  parseCitationLedgerRows,
  reconcileCitationCoverage,
} from '../../lib/audit-citation-coverage.ts';
import { CITATIONS } from '../../data/citations.ts';

const LEDGER = `# Citation reachability and identity audit

## Result of this run

Prose, and a table that is not the per-entry table:

| Gate | Command | Result |
|---|---|---|
| Link liveness | \`npm run check:links\` | 307 checked; exit 0 |

## Table: every entry, verdict, and action

| id | url checked | verdict | title check | action taken | note |
|---|---|---|---|---|---|
| alvinn-1988 | https://example.org/a | ok | match | none (verified as cited) |  |
| dagger-2011 | https://example.org/b | ok (crossref) | match | none (verified as cited) |  |
`;

describe('parseCitationLedgerRows', () => {
  it('reads the per-entry table and nothing else', () => {
    const rows = parseCitationLedgerRows(LEDGER);
    expect(rows.map((row) => row.id)).toEqual(['alvinn-1988', 'dagger-2011']);
  });

  it('keeps each rowverdict so an unresolved entry stays visible', () => {
    const rows = parseCitationLedgerRows(LEDGER);
    expect(rows.map((row) => row.verdict)).toEqual(['ok', 'ok (crossref)']);
  });

  it('does not mistake the gate table for a citation table', () => {
    const rows = parseCitationLedgerRows(LEDGER);
    expect(rows.some((row) => row.id === 'Link liveness')).toBe(false);
  });
});

describe('reconcileCitationCoverage', () => {
  const rows = (...ids: string[]) =>
    ids.map((id) => ({ id, url: 'https://example.org', verdict: 'ok' }));

  it('passes when both derived sets are equal and non-empty', () => {
    const result = reconcileCitationCoverage({
      registry: [{ id: 'a', url: 'https://example.org' }],
      rows: rows('a'),
    });
    expect(result.failures).toEqual([]);
    expect(result.coveredCount).toBe(1);
  });

  it('flags a registry citation that no ledger row covers', () => {
    const result = reconcileCitationCoverage({
      registry: [
        { id: 'a', url: 'https://example.org' },
        { id: 'b', url: 'https://example.org' },
      ],
      rows: rows('a'),
    });
    expect(result.failures.map((f) => f.kind)).toEqual(['uncovered-citation']);
    expect(result.failures[0]?.message).toContain('`b`');
    expect(result.uncovered).toEqual(['b']);
  });

  it('flags a ledger row for an id the registry no longer holds', () => {
    const result = reconcileCitationCoverage({
      registry: [{ id: 'a', url: 'https://example.org' }],
      rows: rows('a', 'gone'),
    });
    expect(result.failures.map((f) => f.kind)).toEqual(['stale-citation-row']);
    expect(result.stale).toEqual(['gone']);
  });

  it('flags a duplicated ledger row, which would inflate the covered count', () => {
    const result = reconcileCitationCoverage({
      registry: [{ id: 'a', url: 'https://example.org' }],
      rows: rows('a', 'a'),
    });
    expect(result.failures.map((f) => f.kind)).toEqual(['duplicate-citation-row']);
  });

  it('fails closed on an empty population rather than passing vacuously', () => {
    const result = reconcileCitationCoverage({ registry: [], rows: [] });
    expect(result.failures.map((f) => f.kind)).toEqual(['empty-population']);
  });

  it('reports a url the ledger checked that is not the url the registry ships', () => {
    const result = reconcileCitationCoverage({
      registry: [{ id: 'a', url: 'https://example.org/new' }],
      rows: [{ id: 'a', url: 'https://example.org/old', verdict: 'ok' }],
    });
    expect(result.failures.map((f) => f.kind)).toEqual(['url-drift']);
  });

  it('counts rows whose verdict records an unresolved check without failing', () => {
    const result = reconcileCitationCoverage({
      registry: [{ id: 'a', url: 'https://example.org' }],
      rows: [{ id: 'a', url: 'https://example.org', verdict: 'UNRESOLVED' }],
    });
    expect(result.failures).toEqual([]);
    expect(result.unresolved).toEqual(['a']);
  });
});

describe('the shipped citation ledger against the shipped registry', () => {
  it('covers every registry entry exactly once, with the url the registry ships', () => {
    const markdown = readFileSync(
      join(process.cwd(), CITATION_LEDGER_PATH),
      'utf8',
    );
    const result = reconcileCitationCoverage({
      registry: CITATIONS.map(({ id, url }) => ({ id, url })),
      rows: parseCitationLedgerRows(markdown),
    });
    expect(result.failures.map((f) => f.message)).toEqual([]);
    expect(result.coveredCount).toBe(CITATIONS.length);
  });
});
