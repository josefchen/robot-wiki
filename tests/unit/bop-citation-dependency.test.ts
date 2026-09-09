import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getCitation } from '../../data/citations';
import {
  parseCitationLedgerRows,
  reconcileCitationCoverage,
} from '../../lib/audit-citation-coverage';

const id = 'bop-challenge-2023';
const auditedUrl = 'https://arxiv.org/abs/2403.09799';
const bodyUrl = 'https://arxiv.org/html/2403.09799v1';
const markdown = readFileSync('audit/citations.md', 'utf8');
const rows = parseCitationLedgerRows(markdown).filter(row => row.id === id);
const citation = getCitation(id)!;
const reconcile = (registry = [citation], auditRows = rows) =>
  reconcileCitationCoverage({ registry, rows: auditRows });

describe('BOP audited URL and retained body are distinct dependencies', () => {
  it('ships the exact historically audited URL without inventing a new audit event', () => {
    expect(rows).toEqual([{ id, url: auditedUrl, verdict: 'ok' }]);
    expect(markdown).toContain(
      '| bop-challenge-2023 | https://arxiv.org/abs/2403.09799 | ok | match | none (first audited 2026-09-06) |',
    );
    expect(reconcile().failures).toEqual([]);
    expect(citation.url).toBe(auditedUrl);
  });

  it('reproduces the introduced v1-body versus abs-ledger mismatch exactly', () => {
    expect(reconcile([{ ...citation, url: bodyUrl }]).failures).toEqual([{
      kind: 'url-drift',
      message: `citation coverage: \`${id}\` was audited at ${auditedUrl} but the registry now ships ${bodyUrl}; re-audit it rather than carrying the old row`,
    }]);
  });

  it('rejects stale and incorrect document, edition, host and URL bindings', () => {
    for (const url of [
      bodyUrl,
      'https://arxiv.org/abs/2403.09798',
      'https://arxiv.org/abs/2403.09799v2',
      'https://arxiv.org/html/2403.09799v2',
      'https://arxiv.org/abs/2403.09799?redirect=elsewhere',
      'https://arxiv.org/abs/2403.09799#other',
      'http://arxiv.org/abs/2403.09799',
      'https://arxiv.org.evil.example/abs/2403.09799',
    ]) {
      expect(reconcile([{ ...citation, url }]).failures.some(f => f.kind === 'url-drift'), url).toBe(true);
      expect(reconcile([{ ...citation, url: auditedUrl }], [{ ...rows[0], url }]).failures.some(f => f.kind === 'url-drift'), url).toBe(true);
    }
    const changedId = reconcile([{ ...citation, id: 'bop-challenge-2024' }]);
    expect(changedId.failures.map(f => f.kind)).toEqual(['uncovered-citation', 'stale-citation-row']);
  });

  it('keeps the v1 edition explicit without replacing its native supporting URLs', () => {
    const registrySource = readFileSync('data/citations.ts', 'utf8');
    const member = registrySource.slice(
      registrySource.indexOf('// Inspected primary edition: arXiv 2403.09799v1'),
      registrySource.indexOf("id: 'hinterstoisser-2012'"),
    );
    expect(member).toContain('14 Mar 2024');
    expect(member).toContain(bodyUrl);
    const plans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')) as Array<{
      id: string; evidence: Array<{ sourceUrl: string; citationId: string }>;
    }>;
    const bopPlans = plans.filter(plan => ['classical-perception-bop-53-v1', 'classical-perception-bop-54-v1'].includes(plan.id));
    expect(bopPlans).toHaveLength(2);
    expect(bopPlans.flatMap(plan => plan.evidence)).toHaveLength(14);
    expect(bopPlans.flatMap(plan => plan.evidence).every(item => item.citationId === id && item.sourceUrl === bodyUrl)).toBe(true);
  });
});
