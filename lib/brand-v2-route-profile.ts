export type RouteProfileInput = {
  staticOrigin: string;
  fontResources: string[];
  bodyElementCount: number;
  backdropResidue: number;
  reflowOverflowPx: number;
};

export type RouteProfileFailure = {
  check: 'resource-font' | 'residue' | 'reflow';
  reason: string;
};

export function validateRouteProfile(
  input: RouteProfileInput,
): RouteProfileFailure[] {
  const failures: RouteProfileFailure[] = [];
  if (input.fontResources.length === 0) {
    failures.push({
      check: 'resource-font',
      reason: 'empty-font-resource-population',
    });
  } else if (
    !input.fontResources.every(
      (resource) => new URL(resource).origin === input.staticOrigin,
    )
  ) {
    failures.push({
      check: 'resource-font',
      reason: 'cross-origin-font-resource',
    });
  }
  if (input.bodyElementCount === 0) {
    failures.push({
      check: 'residue',
      reason: 'empty-body-element-population',
    });
  }
  if (input.backdropResidue !== 0) {
    failures.push({
      check: 'residue',
      reason: `${input.backdropResidue}-backdrop-filter-elements`,
    });
  }
  if (!Number.isFinite(input.reflowOverflowPx)) {
    failures.push({ check: 'reflow', reason: 'non-finite-overflow' });
  } else if (input.reflowOverflowPx > 0) {
    failures.push({
      check: 'reflow',
      reason: `${input.reflowOverflowPx}px-overflow`,
    });
  }
  return failures;
}
