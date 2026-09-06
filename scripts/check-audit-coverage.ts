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
import { publishedModules } from '../data/modules.ts';

const root = join(import.meta.dirname, '..');
const asJson = process.argv.includes('--json');

const published = new Map<string, string[]>();
for (const entry of publishedModules()) {
  const slugs = published.get(entry.domain) ?? [];
  slugs.push(entry.slug);
  published.set(entry.domain, slugs);
}

const coverage: DomainCoverage[] = AUDIT_LEDGERS.map((ledger) => {
  const markdown = readFileSync(join(root, ledger.ledgerPath), 'utf8');
  return reconcileDomain({
    domain: ledger.domain,
    assertionId: ledger.assertionId,
    ledgerPath: ledger.ledgerPath,
    published: published.get(ledger.domain) ?? [],
    sections: parseLedger(ledger.ledgerPath, markdown),
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

const summary = summarise(coverage);
const ok = summary.ok && uncoveredDomains.length === 0;

if (asJson) {
  console.log(
    JSON.stringify(
      { ok, uncoveredDomains, domains: coverage, summary },
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
  for (const domain of uncoveredDomains) {
    console.error(
      `check:audit-coverage: domain \`${domain}\` publishes articles and has no ledger in AUDIT_LEDGERS`,
    );
  }
  for (const failure of summary.failures) {
    console.error(`check:audit-coverage: ${failure.message}`);
  }
  console.log(
    ok
      ? `check:audit-coverage: OK (${summary.auditedCount}/${summary.publishedCount} published articles audited, ${summary.claimRows} claim rows)`
      : `check:audit-coverage: FAILED (${summary.failures.length + uncoveredDomains.length} findings)`,
  );
}

process.exit(ok ? 0 : 1);
