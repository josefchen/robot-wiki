import { describe, expect, it } from 'vitest';
import { DEPLOYMENT_ROWS, filterDeployments } from '@/lib/deployment-reality';

describe('Technology.org withdrawal and primary-source scope', () => {
  it('contains only documented records and no unsupported dashboard numbers', () => {
    expect(DEPLOYMENT_ROWS.map(row => row.id)).toEqual([
      'agility-digit', 'figure-bmw', 'tesla-optimus', 'figure-8hr-shift',
    ]);
    const byId = new Map(DEPLOYMENT_ROWS.map(row => [row.id, row]));
    expect(byId.get('agility-digit')).toMatchObject({
      value: '65,000', sourceId: 'agility-digit-5-2026', status: 'verified',
      asOf: 'Sep 15, 2026',
    });
    expect(byId.get('figure-bmw')).toMatchObject({
      value: '1,250+', sourceId: 'figure-bmw-production-2025', status: 'verified',
      asOf: 'Nov 19, 2025',
    });
    expect(byId.get('figure-bmw')?.detail).toContain('90,000+ parts');
    expect(byId.get('figure-bmw')?.detail).not.toMatch(/achieved.{0,20}(84|99)|above 99% placement accuracy/);
    expect(byId.get('tesla-optimus')).toMatchObject({
      value: 'Early ramp', sourceId: 'tesla-q3-2026-update', status: 'verified',
      asOf: 'Q3 2026',
    });
    expect(byId.get('tesla-optimus')?.detail).not.toMatch(/mid-July|built|never published/i);
    expect(DEPLOYMENT_ROWS.map(row => `${row.value} ${row.detail}` ).join(' '))
      .not.toMatch(/5,500|50,000|nine customer facilities|10,000 to 20,000/);
  });

  it('keeps filter semantics when a category or the entire input is empty', () => {
    expect(filterDeployments(DEPLOYMENT_ROWS, 'all')).toEqual(DEPLOYMENT_ROWS);
    expect(filterDeployments(DEPLOYMENT_ROWS, 'verified').map(row => row.id))
      .toEqual(['agility-digit', 'figure-bmw', 'tesla-optimus']);
    expect(filterDeployments(DEPLOYMENT_ROWS, 'claimed').map(row => row.id))
      .toEqual(['figure-8hr-shift']);
    expect(filterDeployments(DEPLOYMENT_ROWS.slice(3), 'verified')).toEqual([]);
    expect(filterDeployments([], 'all')).toEqual([]);
  });
});
