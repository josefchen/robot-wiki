import { DEPLOYMENT_ROWS, filterDeployments, type DeploymentFilter, type DeploymentRow } from './deployment-reality.ts';
import type { StateCase } from './brand-v2-census.ts';

/** A source can implement a fixture branch that its fixed production props
 * cannot reach. Only this measured data-bound case is classified here; no
 * source branch disappears and a prop/filter/data change reopens coverage. */
export function mountedStateCases(input: {
  component: string; props: string; source: string; cases: readonly StateCase[];
  deploymentRows?: readonly DeploymentRow[];
}): StateCase[] {
  const original = input.cases.map((stateCase) => ({ ...stateCase }));
  if (input.component !== 'DeploymentDashboard' || /\bdeploymentRows\b|\.\.\./.test(input.props)) return original;
  const filtersSource = /const FILTERS[^=]*=\s*\[([\s\S]*?)\];/.exec(input.source)?.[1];
  if (!filtersSource) throw new Error('DeploymentDashboard mount applicability cannot find its offered filters');
  const filters = [...filtersSource.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  const known = ['all', 'verified', 'claimed'];
  if (filters.length !== known.length || new Set(filters).size !== known.length || filters.some((filter) => !known.includes(filter))) {
    throw new Error('DeploymentDashboard offered filters changed; re-prove empty-state applicability');
  }
  const rows = input.deploymentRows ?? DEPLOYMENT_ROWS;
  const counts = filters.map((filter) => ({ filter, count: filterDeployments([...rows], filter as DeploymentFilter).length }));
  if (counts.some(({ count }) => count === 0)) return original;
  return original.map((stateCase) => stateCase.id !== 'empty-witness' ? stateCase : {
    id: stateCase.id, kind: 'exception',
    notApplicableReason: `The source empty branch is exercised by tests/component/deployment-dashboard.test.ts (offers keyboard and pointer recovery from an empty filtered category). This production mount omits deploymentRows and uses the canonical ${rows.length} rows; every offered filter is nonempty (${counts.map(({ filter, count }) => `${filter}=${count}`).join(', ')}). No shipped control can change those rows. A changed prop, filter, or zero count reopens this runtime witness.`,
  });
}
