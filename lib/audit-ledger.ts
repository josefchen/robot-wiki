/**
 * Registry-to-ledger reconciliation for the content-integrity audit.
 *
 * The six per-domain audit assertions (VAL-AUDIT-001..006) quantify over
 * "the complete reconciled, non-empty published population" of a domain,
 * derived at validation time from the module registry on one side and,
 * independently, from the per-article claim ledgers in `audit/` on the
 * other. Both sets must be non-empty and equal.
 *
 * That reconciliation is the half a machine can carry. It cannot read a
 * paper for you: whether a ledger row's verdict is *true* is settled by
 * the fetched source quoted in the row, not by anything here. What this
 * module rules out is the failure that reached this repository twice —
 * a ledger that looks complete because nobody compared it against the
 * registry that grew underneath it. Five articles published 2026-08-22
 * sat unaudited for a fortnight while `audit/README.md` claimed "every
 * published article", and the claim was checkable the whole time.
 *
 * The population is derived on both sides, never listed. A hardcoded
 * slug array here would go stale in exactly the way it is meant to
 * detect.
 */

/** A domain's ledger and the assertion, if any, that quantifies over it. */
export interface AuditLedger {
  readonly domain: string;
  readonly ledgerPath: string;
  /**
   * `null` for `adjacent`, which has a ledger and published articles but
   * no per-domain assertion of its own in VAL-AUDIT-001..006. It is still
   * reconciled: a published article with no audit record is a defect
   * whether or not an assertion happens to name its domain.
   */
  readonly assertionId: string | null;
}

export const AUDIT_LEDGERS: readonly AuditLedger[] = [
  {
    domain: 'manipulation',
    ledgerPath: 'audit/manipulation.md',
    assertionId: 'VAL-AUDIT-001',
  },
  {
    domain: 'rl-sim2real',
    ledgerPath: 'audit/rl-sim2real.md',
    assertionId: 'VAL-AUDIT-002',
  },
  {
    domain: 'world-models',
    ledgerPath: 'audit/world-models.md',
    assertionId: 'VAL-AUDIT-003',
  },
  {
    domain: 'data-hardware',
    ledgerPath: 'audit/data-hardware.md',
    assertionId: 'VAL-AUDIT-004',
  },
  {
    domain: 'classical',
    ledgerPath: 'audit/classical.md',
    assertionId: 'VAL-AUDIT-005',
  },
  {
    domain: 'frontier',
    ledgerPath: 'audit/frontier.md',
    assertionId: 'VAL-AUDIT-006',
  },
  {
    domain: 'adjacent',
    ledgerPath: 'audit/adjacent.md',
    assertionId: null,
  },
];

/** One article's audit record, as parsed out of its domain ledger. */
export interface LedgerSection {
  readonly slug: string;
  readonly ledgerPath: string;
  /** Claim rows across every table under the article's heading(s). */
  readonly claimRows: number;
  /** Claim texts whose "Source checked" cell is empty. */
  readonly unsourcedRows: readonly string[];
}

export type CoverageFailureKind =
  | 'empty-population'
  | 'unaudited-published-article'
  | 'audited-unpublished-article'
  | 'vacuous-section'
  | 'unsourced-claim';

export interface CoverageFailure {
  readonly kind: CoverageFailureKind;
  readonly domain: string;
  readonly message: string;
}

export interface DomainCoverage {
  readonly domain: string;
  readonly assertionId: string | null;
  readonly ledgerPath: string;
  readonly publishedCount: number;
  readonly auditedCount: number;
  readonly claimRows: number;
  readonly failures: readonly CoverageFailure[];
}

export interface CoverageSummary {
  readonly ok: boolean;
  readonly publishedCount: number;
  readonly auditedCount: number;
  readonly claimRows: number;
  readonly failures: readonly CoverageFailure[];
}

/**
 * `## slug.mdx`, `### slug.mdx`, `## slug.mdx (continued)`,
 * `## slug.mdx (per-cell audit of data/methods.ts, 18 rows)`. A heading
 * that is not an article filename (`## Summary`) does not match.
 */
const ARTICLE_HEADING = /^#{2,3}\s+([a-z0-9][a-z0-9-]*)\.mdx\b/;
const TABLE_SEPARATOR = /^\|[\s:|-]+\|$/;

function cells(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined);
  return inner.split('|').map((cell) => cell.trim());
}

/**
 * The index of the column that names the source a row was checked
 * against. Ledgers use both a three-column shape (`Claim | Source
 * checked | Verdict`) and a five-column one (`# | Claim (quoted) |
 * Source checked | Verdict | Note`), so the column is found by its
 * header rather than by position. A table with no such column is not a
 * claim table this gate can grade, and saying so is the point: a silent
 * skip would let a whole article's rows disappear from the count.
 */
function sourceColumn(header: readonly string[], ledgerPath: string): number {
  const index = header.findIndex((cell) => /source/i.test(cell));
  if (index === -1) {
    throw new Error(
      `${ledgerPath}: claim table has no source column (headers: ${header.join(' | ')})`,
    );
  }
  return index;
}

function claimColumn(header: readonly string[]): number {
  const index = header.findIndex((cell) => /claim/i.test(cell));
  return index === -1 ? 0 : index;
}

/**
 * Parse one domain ledger into one record per audited article.
 *
 * Sections for the same article are folded together: `audit/frontier.md`
 * splits four of its articles across a first pass and a `(continued)`
 * pass, and those are one article's record, not two.
 */
export function parseLedger(
  ledgerPath: string,
  markdown: string,
): LedgerSection[] {
  const order: string[] = [];
  const rows = new Map<string, number>();
  const unsourced = new Map<string, string[]>();

  let slug: string | null = null;
  let header: string[] | null = null;

  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const heading = ARTICLE_HEADING.exec(line);
    if (heading) {
      slug = heading[1];
      header = null;
      if (!rows.has(slug)) {
        order.push(slug);
        rows.set(slug, 0);
        unsourced.set(slug, []);
      }
      continue;
    }
    if (line.startsWith('#')) {
      // Any other heading closes the article section it follows, so prose
      // tables under `## Summary` are never counted as claims.
      slug = null;
      header = null;
      continue;
    }
    if (slug === null || !line.trim().startsWith('|')) {
      if (line.trim() === '') header = header === null ? null : header;
      continue;
    }
    if (TABLE_SEPARATOR.test(line.trim())) continue;
    if (header === null) {
      header = cells(line);
      continue;
    }
    const row = cells(line);
    const source = row[sourceColumn(header, ledgerPath)] ?? '';
    rows.set(slug, (rows.get(slug) ?? 0) + 1);
    if (source === '') {
      unsourced.get(slug)?.push(row[claimColumn(header)] ?? '');
    }
  }

  return order.map((articleSlug) => ({
    slug: articleSlug,
    ledgerPath,
    claimRows: rows.get(articleSlug) ?? 0,
    unsourcedRows: unsourced.get(articleSlug) ?? [],
  }));
}

export interface ReconcileInput {
  readonly domain: string;
  readonly assertionId: string | null;
  readonly ledgerPath: string;
  readonly published: readonly string[];
  readonly sections: readonly LedgerSection[];
}

/** Reconcile one domain's published population against its ledger. */
export function reconcileDomain(input: ReconcileInput): DomainCoverage {
  const { domain, assertionId, ledgerPath, published, sections } = input;
  const failures: CoverageFailure[] = [];
  const audited = new Set(sections.map((section) => section.slug));

  if (published.length === 0 || audited.size === 0) {
    failures.push({
      kind: 'empty-population',
      domain,
      message: `${domain}: population is empty (${published.length} published, ${audited.size} audited); an empty set satisfies every property, so it fails closed`,
    });
  }

  for (const slug of published) {
    if (!audited.has(slug)) {
      failures.push({
        kind: 'unaudited-published-article',
        domain,
        message: `${domain}: published article \`${slug}\` has no section in ${ledgerPath}`,
      });
    }
  }

  const publishedSet = new Set(published);
  for (const section of sections) {
    if (!publishedSet.has(section.slug)) {
      failures.push({
        kind: 'audited-unpublished-article',
        domain,
        message: `${domain}: ${ledgerPath} audits \`${section.slug}\`, which the registry does not publish`,
      });
      continue;
    }
    if (section.claimRows === 0) {
      failures.push({
        kind: 'vacuous-section',
        domain,
        message: `${domain}: \`${section.slug}\` has a heading in ${ledgerPath} but no checked claim`,
      });
    }
    for (const claim of section.unsourcedRows) {
      failures.push({
        kind: 'unsourced-claim',
        domain,
        message: `${domain}: \`${section.slug}\` records a claim with no source checked: "${claim}"`,
      });
    }
  }

  return {
    domain,
    assertionId,
    ledgerPath,
    publishedCount: published.length,
    auditedCount: audited.size,
    claimRows: sections.reduce((total, s) => total + s.claimRows, 0),
    failures,
  };
}

export function summarise(
  coverage: readonly DomainCoverage[],
): CoverageSummary {
  const failures = coverage.flatMap((domain) => domain.failures);
  return {
    ok: failures.length === 0 && coverage.length > 0,
    publishedCount: coverage.reduce((n, d) => n + d.publishedCount, 0),
    auditedCount: coverage.reduce((n, d) => n + d.auditedCount, 0),
    claimRows: coverage.reduce((n, d) => n + d.claimRows, 0),
    failures,
  };
}
