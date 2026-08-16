import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
import { DEPLOYMENT_ROWS, filterDeployments } from '@/lib/deployment-reality';

describe('deployment-reality data', () => {
  it('carries the four anchor entries from the deployment record', () => {
    const byId = new Map(DEPLOYMENT_ROWS.map((row) => [row.id, row]));
    // Agility: 65,000+ operating hours across customer facilities.
    expect(byId.get('agility-digit')?.value).toContain('65,000');
    expect(byId.get('agility-digit')?.status).toBe('verified');
    // Figure: 1,250+ hours at BMW Spartanburg.
    expect(byId.get('figure-bmw')?.value).toContain('1,250');
    expect(byId.get('figure-bmw')?.status).toBe('verified');
    // Unitree: ~5,500 units shipped in 2025.
    expect(byId.get('unitree-2025')?.value).toContain('5,500');
    expect(byId.get('unitree-2025')?.status).toBe('verified');
    // Tesla Optimus: production not started, no published production count.
    const tesla = byId.get('tesla-optimus');
    expect(tesla?.status).toBe('verified');
    expect(tesla?.value.toLowerCase()).toContain('not started');
  });

  it('separates verified rows from claimed rows', () => {
    const verified = DEPLOYMENT_ROWS.filter((row) => row.status === 'verified');
    const claimed = DEPLOYMENT_ROWS.filter((row) => row.status === 'claimed');
    expect(verified.length).toBeGreaterThanOrEqual(4);
    expect(claimed.length).toBeGreaterThanOrEqual(1);
  });

  it('gives every row a source citation that resolves in the registry', () => {
    for (const row of DEPLOYMENT_ROWS) {
      const citation = getCitation(row.sourceId);
      expect(citation, `row ${row.id} cites ${row.sourceId}`).toBeDefined();
      expect(citation?.url.startsWith('https://')).toBe(true);
    }
  });

  it('gives every row an as-of date, a source label, and a non-empty figure', () => {
    for (const row of DEPLOYMENT_ROWS) {
      expect(row.asOf, `row ${row.id} asOf`).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
      expect(
        row.sourceLabel.length,
        `row ${row.id} sourceLabel`,
      ).toBeGreaterThan(0);
      expect(row.value.length, `row ${row.id} value`).toBeGreaterThan(0);
    }
  });

  it('never blends a claimed figure into a verified row', () => {
    // The circulating "50,000+ Optimus units" figure must be labeled claimed.
    const claimed = DEPLOYMENT_ROWS.find(
      (row) => row.id === 'optimus-50k-claim',
    );
    expect(claimed?.status).toBe('claimed');
    expect(claimed?.value).toContain('50,000');
  });
});

describe('filterDeployments', () => {
  it('returns every row for the all filter', () => {
    expect(filterDeployments(DEPLOYMENT_ROWS, 'all')).toHaveLength(
      DEPLOYMENT_ROWS.length,
    );
  });

  it('returns only verified rows for the verified filter', () => {
    const rows = filterDeployments(DEPLOYMENT_ROWS, 'verified');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.status === 'verified')).toBe(true);
  });

  it('returns only claimed rows for the claimed filter', () => {
    const rows = filterDeployments(DEPLOYMENT_ROWS, 'claimed');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.status === 'claimed')).toBe(true);
  });
});
