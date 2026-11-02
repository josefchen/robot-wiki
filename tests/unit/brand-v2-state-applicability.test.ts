import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mountedStateCases } from '@/lib/brand-v2-state-applicability';
import { DEPLOYMENT_ROWS } from '@/lib/deployment-reality';
import type { StateCase } from '@/lib/brand-v2-census';

const source = readFileSync('components/interactive/deployment-dashboard.tsx', 'utf8');
const cases: StateCase[] = [{ id: 'default', kind: 'default' }, { id: 'empty-witness', kind: 'discrete-options' }];
const base = { component: 'DeploymentDashboard', props: 'className="my-6" /', source, cases };
describe('production mount state applicability', () => {
  it('records the exact nonempty source-derived filter populations without dropping the source case', () => {
    const result = mountedStateCases(base);
    expect(result).toHaveLength(cases.length);
    expect(result[1]).toMatchObject({ id: 'empty-witness', kind: 'exception' });
    expect(result[1].notApplicableReason).toContain(`canonical ${DEPLOYMENT_ROWS.length} rows`);
    expect(result[1].notApplicableReason).toContain('tests/component/deployment-dashboard.test.ts');
    expect(cases[1].kind).toBe('discrete-options');
  });
  it('reopens the runtime witness when any real filter becomes empty', () => {
    expect(mountedStateCases({ ...base, deploymentRows: DEPLOYMENT_ROWS.filter(({ status }) => status === 'claimed') })).toEqual(cases);
  });
  it.each(['deploymentRows={rows} /', '{...props} /'])('does not presume defaults under %s', (props) => {
    expect(mountedStateCases({ ...base, props })).toEqual(cases);
  });
  it('fails closed when a future offered filter changes the branch population', () => {
    expect(() => mountedStateCases({ ...base, source: source.replace("id: 'claimed'", "id: 'other'") })).toThrow('offered filters changed');
  });
});
