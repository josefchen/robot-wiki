import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
import { DEPLOYMENT_ROWS, filterDeployments } from '@/lib/deployment-reality';

describe('deployment-reality data', () => {
  it('carries exactly the four inspected-source rows', () => {
    expect(DEPLOYMENT_ROWS.map((row) => row.id)).toEqual([
      'agility-digit',
      'figure-bmw',
      'tesla-optimus',
      'figure-8hr-shift',
    ]);
    const byId = new Map(DEPLOYMENT_ROWS.map((row) => [row.id, row]));
    // Agility: 65,000 hours on the undated homepage, so the access date is the as-of.
    const agility = byId.get('agility-digit')!;
    expect(agility.value).toBe('65,000');
    expect(agility.value).not.toContain('+');
    expect(agility.status).toBe('verified');
    expect(agility.asOf).toBe('n.d.; accessed Sep 24, 2026');
    expect(agility.sourceId).toBe('agility-digit-production');
    // Figure: 1,250+ runtime hours at BMW Spartanburg, dated November 19, 2025.
    const figure = byId.get('figure-bmw')!;
    expect(figure.value).toContain('1,250');
    expect(figure.status).toBe('verified');
    expect(figure.asOf).toBe('Nov 19, 2025');
    expect(figure.sourceId).toBe('figure-bmw-production-2025');
    expect(figure.detail).toContain('targets, not achieved KPIs');
    // Tesla: construction stage from its own Q1 update, never a build count.
    const tesla = byId.get('tesla-optimus')!;
    expect(tesla.value).toBe('Construction');
    expect(tesla.status).toBe('verified');
    expect(tesla.asOf).toBe('Q1 2026');
    expect(tesla.sourceId).toBe('tesla-q1-2026-update');
    expect(tesla.detail).toContain('designed capacity is not output');
  });

  it('keeps three verified rows and one claimed row', () => {
    const verified = DEPLOYMENT_ROWS.filter((row) => row.status === 'verified');
    const claimed = DEPLOYMENT_ROWS.filter((row) => row.status === 'claimed');
    expect(verified).toHaveLength(3);
    expect(claimed.map((row) => row.id)).toEqual(['figure-8hr-shift']);
    expect(claimed[0]?.asOf).toBe('May 2026');
  });

  it('gives every row a source citation that resolves in the registry', () => {
    for (const row of DEPLOYMENT_ROWS) {
      const citation = getCitation(row.sourceId);
      expect(citation, `row ${row.id} cites ${row.sourceId}`).toBeDefined();
      expect(citation?.url.startsWith('https://')).toBe(true);
    }
  });

  it('gives every row an as-of label, a source label, and a non-empty figure', () => {
    const dated =
      /^(?:Nov 19, 2025|Q1 2026|May 2026|n\.d\.; accessed Sep 24, 2026)$/;
    for (const row of DEPLOYMENT_ROWS) {
      expect(row.asOf, `row ${row.id} asOf`).toMatch(dated);
      expect(row.sourceLabel.length, `row ${row.id} sourceLabel`).toBeGreaterThan(0);
      expect(row.value.length, `row ${row.id} value`).toBeGreaterThan(0);
    }
  });

  it('carries no Unitree shipment figure and no Tesla build count', () => {
    expect(DEPLOYMENT_ROWS.some((row) => /unitree/i.test(row.program))).toBe(false);
    const serialised = JSON.stringify(DEPLOYMENT_ROWS);
    expect(serialised).not.toMatch(/5,500/);
    expect(serialised).not.toMatch(/50,000/);
    expect(serialised).not.toMatch(/65,000\+/);
  });

  it('never blends a claimed demonstration into a verified row', () => {
    // The May 2026 vendor livestream stays claimed: one task, one site, no audit.
    const shift = DEPLOYMENT_ROWS.find((row) => row.id === 'figure-8hr-shift');
    expect(shift?.status).toBe('claimed');
    expect(shift?.value).toContain('8 hours');
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
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.status === 'verified')).toBe(true);
  });

  it('returns only claimed rows for the claimed filter', () => {
    const rows = filterDeployments(DEPLOYMENT_ROWS, 'claimed');
    expect(rows.map((row) => row.id)).toEqual(['figure-8hr-shift']);
    expect(rows.every((row) => row.status === 'claimed')).toBe(true);
  });
});
