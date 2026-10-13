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
    // Agility: more than 65,000 hours and the GXO tote accuracy, from its dated Digit 5 release.
    const agility = byId.get('agility-digit')!;
    expect(agility.value).toBe('65,000');
    expect(agility.value).not.toContain('+');
    expect(agility.status).toBe('verified');
    expect(agility.asOf).toBe('Sep 15, 2026');
    expect(agility.sourceId).toBe('agility-digit-5-2026');
    expect(agility.detail).toContain('more than 65,000 hours');
    expect(agility.detail).toContain('about 98% accuracy while on-task over 100,000 totes');
    // Figure: 1,250+ runtime hours at BMW Spartanburg, dated November 19, 2025.
    const figure = byId.get('figure-bmw')!;
    expect(figure.value).toContain('1,250');
    expect(figure.status).toBe('verified');
    expect(figure.asOf).toBe('Nov 19, 2025');
    expect(figure.sourceId).toBe('figure-bmw-production-2025');
    expect(figure.detail).toContain('targets, not achieved KPIs');
    // Tesla: construction stage from its own Q2 update, never a build count.
    const tesla = byId.get('tesla-optimus')!;
    expect(tesla.value).toBe('Construction');
    expect(tesla.status).toBe('verified');
    expect(tesla.asOf).toBe('Q2 2026');
    expect(tesla.sourceId).toBe('tesla-q2-2026-update');
    expect(tesla.detail).toContain('installed capacity is not output');
  });

  it('keeps three verified rows and one claimed row', () => {
    const verified = DEPLOYMENT_ROWS.filter((row) => row.status === 'verified');
    const claimed = DEPLOYMENT_ROWS.filter((row) => row.status === 'claimed');
    expect(verified).toHaveLength(3);
    expect(claimed.map((row) => row.id)).toEqual(['figure-8hr-shift']);
    expect(claimed[0]?.asOf).toBe('Sep 17, 2026');
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
      /^(?:Nov 19, 2025|Q2 2026|Sep 15, 2026|Sep 17, 2026)$/;
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
    // Planned as one eight-hour shift, it ran 200 hours by Figure's September account.
    const shift = DEPLOYMENT_ROWS.find((row) => row.id === 'figure-8hr-shift');
    expect(shift?.status).toBe('claimed');
    expect(shift?.value).toBe('200 hours');
    expect(shift?.sourceId).toBe('helix-2-5-2026');
    expect(shift?.detail).toContain('planned eight-hour shift');
    expect(shift?.detail).toContain('no published success rate or intervention count');
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
