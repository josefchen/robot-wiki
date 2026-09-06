/**
 * Registry-to-ledger reconciliation for the citation audit.
 *
 * `lib/audit-ledger.ts` answers the same question one level up: does every
 * published article have an audit record? This answers it for the source
 * registry: does every entry in `data/citations.ts` have a row in
 * `audit/citations.md` recording that its URL was fetched and the document
 * it serves compared against the entry?
 *
 * It was checkable the whole time and nothing checked it. The per-entry
 * table was generated on 2026-08-16 against the 300 entries that existed
 * then; the registry reached 412 while the table stayed at 300, and the
 * ledger's own scope note listed seven late additions by hand, which is
 * exactly the kind of count that goes stale silently. Both sides are
 * derived here: the registry from `CITATIONS`, the audited set by parsing
 * the ledger. Neither is a list typed out while looking at today's tree.
 *
 * What this does NOT do is fetch anything. Whether a row's verdict is true
 * is settled by `npm run check:citations`, which makes 412 network calls
 * and is deliberately not a build gate. This module is the offline half:
 * a row exists, it names the URL the registry actually ships, and it
 * belongs to an entry the registry actually holds. A row whose recorded
 * verdict is unresolved is counted and named rather than failed, because
 * an offline gate cannot re-litigate a network verdict — but it also must
 * not let one disappear.
 */

export const CITATION_LEDGER_PATH = 'audit/citations.md';

/** One row of the ledger's per-entry table. */
export interface CitationLedgerRow {
  readonly id: string;
  readonly url: string;
  readonly verdict: string;
}

export interface RegistryCitation {
  readonly id: string;
  readonly url: string;
}

export type CitationCoverageFailureKind =
  | 'empty-population'
  | 'uncovered-citation'
  | 'stale-citation-row'
  | 'duplicate-citation-row'
  | 'url-drift';

export interface CitationCoverageFailure {
  readonly kind: CitationCoverageFailureKind;
  readonly message: string;
}

export interface CitationCoverage {
  readonly coveredCount: number;
  readonly registryCount: number;
  readonly uncovered: readonly string[];
  readonly stale: readonly string[];
  /** Rows whose recorded verdict is not a resolved pass. */
  readonly unresolved: readonly string[];
  readonly failures: readonly CitationCoverageFailure[];
}

const TABLE_SEPARATOR = /^\|[\s:|-]+\|$/;

/**
 * A verdict cell the 2026-08-16 generator writes for an entry whose
 * document identity was settled: plain `ok`, or `ok` qualified by how it
 * was settled (`ok (crossref)`, `ok (exception)`, `ok (archival)`).
 */
const RESOLVED_VERDICT = /^ok\b/i;

function cells(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined);
  return inner.split('|').map((cell) => cell.trim());
}

/**
 * Rows of the per-entry table, found by its header rather than by position.
 *
 * The ledger carries a second table (the gate/command/result record), and a
 * parser that took every table would read `Link liveness` as a citation id
 * and then report it as a stale row forever. The per-entry table is the one
 * whose header names both an id column and the url that was checked.
 */
export function parseCitationLedgerRows(markdown: string): CitationLedgerRow[] {
  const rows: CitationLedgerRow[] = [];
  let columns: { id: number; url: number; verdict: number } | null = null;

  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    if (!line.trim().startsWith('|')) {
      if (line.startsWith('#')) columns = null;
      continue;
    }
    if (TABLE_SEPARATOR.test(line.trim())) continue;

    const cs = cells(line);
    if (columns === null) {
      const id = cs.findIndex((cell) => /^id$/i.test(cell));
      const url = cs.findIndex((cell) => /url/i.test(cell));
      const verdict = cs.findIndex((cell) => /verdict/i.test(cell));
      if (id !== -1 && url !== -1 && verdict !== -1) {
        columns = { id, url, verdict };
      }
      continue;
    }
    const id = cs[columns.id] ?? '';
    if (id === '') continue;
    rows.push({
      id,
      url: cs[columns.url] ?? '',
      verdict: cs[columns.verdict] ?? '',
    });
  }

  return rows;
}

export function reconcileCitationCoverage(input: {
  registry: readonly RegistryCitation[];
  rows: readonly CitationLedgerRow[];
}): CitationCoverage {
  const { registry, rows } = input;
  const failures: CitationCoverageFailure[] = [];

  if (registry.length === 0 || rows.length === 0) {
    failures.push({
      kind: 'empty-population',
      message: `citation coverage: population is empty (${registry.length} registry entries, ${rows.length} ledger rows); an empty set satisfies every property, so it fails closed`,
    });
    return {
      coveredCount: 0,
      registryCount: registry.length,
      uncovered: [],
      stale: [],
      unresolved: [],
      failures,
    };
  }

  const byId = new Map<string, CitationLedgerRow>();
  const duplicates: string[] = [];
  for (const row of rows) {
    if (byId.has(row.id)) duplicates.push(row.id);
    else byId.set(row.id, row);
  }

  const registryIds = new Set(registry.map(({ id }) => id));
  const uncovered = registry
    .filter(({ id }) => !byId.has(id))
    .map(({ id }) => id);
  const stale = [...byId.keys()].filter((id) => !registryIds.has(id));

  for (const id of uncovered) {
    failures.push({
      kind: 'uncovered-citation',
      message: `citation coverage: registry entry \`${id}\` has no row in ${CITATION_LEDGER_PATH}; its URL has never been fetched and compared against the document it names`,
    });
  }
  for (const id of stale) {
    failures.push({
      kind: 'stale-citation-row',
      message: `citation coverage: ${CITATION_LEDGER_PATH} records \`${id}\`, which the registry no longer holds`,
    });
  }
  for (const id of duplicates) {
    failures.push({
      kind: 'duplicate-citation-row',
      message: `citation coverage: ${CITATION_LEDGER_PATH} has more than one row for \`${id}\`, which inflates the audited count`,
    });
  }

  // A row that audited a URL the registry has since replaced is a row about
  // a document nobody cites any more, and it reads as coverage.
  for (const entry of registry) {
    const row = byId.get(entry.id);
    if (row && row.url !== '' && row.url !== entry.url) {
      failures.push({
        kind: 'url-drift',
        message: `citation coverage: \`${entry.id}\` was audited at ${row.url} but the registry now ships ${entry.url}; re-audit it rather than carrying the old row`,
      });
    }
  }

  const unresolved = registry
    .filter(({ id }) => {
      const row = byId.get(id);
      return row !== undefined && !RESOLVED_VERDICT.test(row.verdict);
    })
    .map(({ id }) => id);

  return {
    coveredCount: registry.filter(({ id }) => byId.has(id)).length,
    registryCount: registry.length,
    uncovered,
    stale,
    unresolved,
    failures,
  };
}
