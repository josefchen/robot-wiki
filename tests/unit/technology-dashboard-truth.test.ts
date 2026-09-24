import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CITATIONS } from '@/data/citations';
import { DEPLOYMENT_ROWS, filterDeployments } from '@/lib/deployment-reality';
import { MILESTONES } from '@/lib/bear-case';
import { THESES } from '@/lib/competing-theses';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Technology.org withdrawal and primary-source scope', () => {
  it('contains only documented records and no unsupported dashboard numbers', () => {
    expect(DEPLOYMENT_ROWS.map(row => row.id)).toEqual([
      'agility-digit', 'figure-bmw', 'tesla-optimus', 'figure-8hr-shift',
    ]);
    const byId = new Map(DEPLOYMENT_ROWS.map(row => [row.id, row]));
    expect(byId.get('agility-digit')).toMatchObject({
      value: '65,000', sourceId: 'agility-digit-production', status: 'verified',
      asOf: 'n.d.; accessed Sep 24, 2026',
    });
    expect(byId.get('figure-bmw')).toMatchObject({
      value: '1,250+', sourceId: 'figure-bmw-production-2025', status: 'verified',
      asOf: 'Nov 19, 2025',
    });
    expect(byId.get('figure-bmw')?.detail).toContain('90,000+ parts');
    expect(byId.get('figure-bmw')?.detail).not.toMatch(/achieved.{0,20}(84|99)|above 99% placement accuracy/);
    expect(byId.get('tesla-optimus')).toMatchObject({
      value: 'Construction', sourceId: 'tesla-q1-2026-update', status: 'verified',
      asOf: 'Q1 2026',
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

  it('removes the dead citation without erasing historical audit records', () => {
    expect(CITATIONS.some(c => c.id === 'technology-org-deployed-2026')).toBe(false);
    expect(read('audit/citations.md')).toContain('technology-org-deployed-2026');
    for (const file of [
      'content/data-hardware/industrial-deployment.mdx',
      'content/frontier/reliability-gap.mdx',
      'content/frontier/bear-case.mdx',
      'content/frontier/competing-theses.mdx',
    ]) {
      expect(read(file)).not.toContain('technology-org-deployed-2026');
    }
    expect(MILESTONES.flatMap(row => row.citationIds)).not.toContain('technology-org-deployed-2026');
    expect(THESES.flatMap(t =>
      [...t.evidenceFor, ...t.evidenceAgainst].flatMap(e => e.citationIds)))
      .not.toContain('technology-org-deployed-2026');
  });

  it('retains the sourced IFR operands but drops dependent humanoid comparisons', () => {
    const industrial = read('content/data-hardware/industrial-deployment.mdx');
    for (const value of ['4,663,698', '542,076', '54%']) expect(industrial).toContain(value);
    expect(industrial).not.toMatch(/5,500|4,200|hundred times either|volume leader/);
    const reliability = read('content/frontier/reliability-gap.mdx');
    const bear = read('content/frontier/bear-case.mdx');
    for (const content of [reliability, bear]) {
      expect(content).not.toMatch(/50,000 cumulative|5,500|65,000\+|nine facilities|\$38B market/);
    }
  });
});
