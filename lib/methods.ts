/**
 * Filter logic for the comparison matrix (components/interactive/
 * comparison-matrix.tsx). Pure and unit-tested in tests/unit/methods.test.ts.
 */
import type {
  ActionRepresentation,
  Method,
} from '@/data/schemas/method.ts';

export type WeightsFilter = 'all' | 'open' | 'closed';

export type RepresentationFilter =
  | 'all'
  | ActionRepresentation
  | 'undisclosed';

export interface MethodFilters {
  /** Free-text match against name, backbone, and conditioning. */
  query: string;
  weights: WeightsFilter;
  representation: RepresentationFilter;
}

export const DEFAULT_FILTERS: MethodFilters = {
  query: '',
  weights: 'all',
  representation: 'all',
};

function matchesQuery(method: Method, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    method.name,
    method.backbone ?? '',
    ...method.conditioning,
  ]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

function matchesWeights(method: Method, weights: WeightsFilter): boolean {
  if (weights === 'all') return true;
  return weights === 'open' ? method.openWeights : !method.openWeights;
}

function matchesRepresentation(
  method: Method,
  representation: RepresentationFilter,
): boolean {
  if (representation === 'all') return true;
  if (representation === 'undisclosed') {
    return method.actionRepresentation === null;
  }
  return method.actionRepresentation === representation;
}

/** Conjunctive filtering: every active filter must match. */
export function filterMethods(
  methods: readonly Method[],
  filters: MethodFilters,
): Method[] {
  return methods.filter(
    (method) =>
      matchesQuery(method, filters.query) &&
      matchesWeights(method, filters.weights) &&
      matchesRepresentation(method, filters.representation),
  );
}
