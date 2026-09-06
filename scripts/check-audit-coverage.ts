/**
 * Audit-coverage gate: does the content-integrity audit still cover the
 * registry it claims to cover?
 *
 * `audit/README.md` says every published article was checked against its
 * cited primary sources, and the six per-domain assertions
 * (VAL-AUDIT-001..006) require the audited set and the published set to
 * be equal and non-empty. Nothing enforced that until this gate: the
 * registry grew by five articles on 2026-08-22 and the ledgers did not,
 * so the claim was false for a fortnight while every suite stayed green.
 *
 * Both sides are derived. The published side comes from
 * `publishedModules()`, the audited side from parsing the ledgers in
 * `audit/`. Neither is a list typed out while looking at today's tree.
 *
 * What this gate does NOT do: read a paper. Whether a ledger row's
 * verdict is true is settled by the source quoted in that row. This
 * checks that a row exists, names a source, and belongs to an article
 * the site actually publishes.
 *
 *   npm run check:audit-coverage
 *   npm run check:audit-coverage -- --json
 *
 * Exit code 1 on any reconciliation failure, 0 otherwise.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUDIT_LEDGERS,
  parseLedger,
  reconcileDomain,
  summarise,
  type DomainCoverage,
} from '../lib/audit-ledger.ts';
import {
  CITATION_LEDGER_PATH,
  parseCitationLedgerRows,
  reconcileCitationCoverage,
} from '../lib/audit-citation-coverage.ts';
import { publishedModules } from '../data/modules.ts';
import { CITATIONS } from '../data/citations.ts';

const root = join(import.meta.dirname, '..');
const asJson = process.argv.includes('--json');

const published = new Map<string, string[]>();
for (const entry of publishedModules()) {
  const slugs = published.get(entry.domain) ?? [];
  slugs.push(entry.slug);
  published.set(entry.domain, slugs);
}

const registryIds = new Set(CITATIONS.map(({ id }) => id));

const coverage: DomainCoverage[] = AUDIT_LEDGERS.map((ledger) => {
  const markdown = readFileSync(join(root, ledger.ledgerPath), 'utf8');
  return reconcileDomain({
    domain: ledger.domain,
    assertionId: ledger.assertionId,
    ledgerPath: ledger.ledgerPath,
    published: published.get(ledger.domain) ?? [],
    sections: parseLedger(ledger.ledgerPath, markdown, registryIds),
  });
});

/**
 * A domain the registry publishes but no ledger covers is the same
 * omission one scope up, and the reconciliation above cannot see it: it
 * only ever walks the ledgers it was given.
 */
const covered = new Set(AUDIT_LEDGERS.map((ledger) => ledger.domain));
const uncoveredDomains = [...published.keys()].filter(
  (domain) => !covered.has(domain),
);

/**
 * The same omission one scope down again: an article ledger cites sources by
 * registry id, and nothing checked that the registry entry behind that id had
 * ever been fetched. The article side is offline and deterministic, and so is
 * this: it asks whether a row exists, not whether the row is right. Whether
 * the document at the URL is the one the entry names is settled by
 * `npm run check:citations`, which is 412 network calls and is deliberately
 * not a build gate.
 */
const citations = reconcileCitationCoverage({
  registry: CITATIONS.map(({ id, url }) => ({ id, url })),
  rows: parseCitationLedgerRows(
    readFileSync(join(root, CITATION_LEDGER_PATH), 'utf8'),
  ),
});

const summary = summarise(coverage);
const ok =
  summary.ok && uncoveredDomains.length === 0 && citations.failures.length === 0;

if (asJson) {
  console.log(
    JSON.stringify(
      { ok, uncoveredDomains, domains: coverage, summary, citations },
      null,
      2,
    ),
  );
} else {
  for (const domain of coverage) {
    const assertion = domain.assertionId ?? 'no per-domain assertion';
    console.log(
      `${domain.failures.length === 0 ? 'ok  ' : 'FAIL'} ${domain.domain.padEnd(14)} ${String(
        domain.auditedCount,
      ).padStart(2)}/${String(domain.publishedCount).padEnd(2)} audited, ${String(
        domain.claimRows,
      ).padStart(3)} claim rows  (${assertion})`,
    );
  }
  console.log(
    `${citations.failures.length === 0 ? 'ok  ' : 'FAIL'} ${'citations'.padEnd(14)} ${String(
      citations.coveredCount,
    ).padStart(3)}/${String(citations.registryCount).padEnd(3)} audited in ${CITATION_LEDGER_PATH}  (VAL-AUDIT-008)`,
  );
  // Derived from the rows, never written by hand: what each claim row
  // actually carries as its evidence.
  console.log(
    `     ${'evidence'.padEnd(14)} ${Object.entries(summary.evidenceKinds)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kind, count]) => `${kind} ${count}`)
      .join(', ')}`,
  );
  for (const domain of uncoveredDomains) {
    console.error(
      `check:audit-coverage: domain \`${domain}\` publishes articles and has no ledger in AUDIT_LEDGERS`,
    );
  }
  for (const failure of [...summary.failures, ...citations.failures]) {
    console.error(`check:audit-coverage: ${failure.message}`);
  }
  // Named, never silently absorbed: an offline gate cannot re-litigate a
  // network verdict, but a row recording an unsettled one must not read as
  // clean coverage either.
  if (citations.unresolved.length > 0) {
    console.log(
      `check:audit-coverage: ${citations.unresolved.length} citation row(s) record an unresolved check, owned by \`npm run check:citations\` (VAL-AUDIT-008): ${citations.unresolved.join(', ')}`,
    );
  }
  console.log(
    ok
      ? `check:audit-coverage: OK (${summary.auditedCount}/${summary.publishedCount} published articles audited, ${summary.claimRows} claim rows, ${citations.coveredCount}/${citations.registryCount} citations audited)`
      : `check:audit-coverage: FAILED (${summary.failures.length + uncoveredDomains.length + citations.failures.length} findings)`,
  );
}

process.exit(ok ? 0 : 1);
