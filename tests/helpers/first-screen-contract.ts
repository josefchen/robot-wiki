/** VAL-EDU-045 limits and cue vocabulary, unchanged by the 2026-11 successor. */
export const FIRST_SCREEN_LIMITS = { words: 300, headings: 1, svgTop: 1600 } as const;

export const CUE_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['drag', /\bdrag\b/i],
  ['move the', /\bmove the\b/i],
  ['slide', /\bslide\b/i],
  ['toggle', /\btoggle\b/i],
  ['switch', /\bswitch (it |the )?/i],
  ['turn on/off', /\bturn (it |the )?(on|off)\b/i],
  ['set the', /\bset (it |the )/i],
  ['try', /\btry\b/i],
];

export function findCue(paragraphs: readonly string[], controlLabels: readonly string[]) {
  for (const paragraph of paragraphs) {
    const matched = CUE_PATTERNS.find(([, pattern]) => pattern.test(paragraph));
    if (!matched) continue;
    const lower = paragraph.toLowerCase();
    const control = controlLabels.find((label) => label.toLowerCase().split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4).some((word) => lower.includes(word)));
    if (control) return { pattern: matched[0], control, paragraph };
  }
  return null;
}

export type FirstScreenMount = {
  id: string;
  route: string;
  identity: string;
  source: string;
  operable: boolean;
};

export type RenderedFirstScreenMount = {
  id: string;
  identity: string;
  selector: string;
  operable: boolean;
  visibleControl: boolean;
};

export type FirstScreenMeasurement = {
  route: string;
  mounts: RenderedFirstScreenMount[];
  unboundControls: string[];
  apparatusControls?: Array<{ name: string; reason: string }>;
  first: null | {
    mountId: string;
    regionSelector: string;
    precedingWords: number;
    precedingH2: number;
    precedingH2Texts: string[];
    topEdge: number | null;
    noSvgReason?: string;
    adjacentParagraphs: { text: string; cited: boolean }[];
    controlLabels: string[];
  };
};

/** Exact route/mount equality; neither a missing member nor an empty sweep can pass. */
export function populationFailures(
  routes: readonly string[],
  expected: readonly FirstScreenMount[],
  observed: readonly FirstScreenMeasurement[],
): string[] {
  const failures: string[] = [];
  const duplicate = (values: readonly string[]) => values.filter((value, index) => values.indexOf(value) !== index);
  if (!routes.length || !expected.length || !observed.length) failures.push('Empty route, registry-mount or rendered population');
  if (!expected.some((mount) => mount.operable) || !observed.some((measurement) => measurement.mounts.some((mount) => mount.operable))) failures.push('Empty operable-mount population');
  if (expected.some((mount) => !routes.includes(mount.route))) failures.push('Expected mount names an unpublished route');
  if (duplicate(routes).length) failures.push('Duplicate published route');
  if (duplicate(expected.map((mount) => mount.id)).length) failures.push('Duplicate expected mount identity');
  if (duplicate(observed.map((measurement) => measurement.route)).length) failures.push('Duplicate measured route');
  const same = (a: readonly string[], b: readonly string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  if (!same(routes, observed.map((measurement) => measurement.route))) failures.push('Measured routes differ from published registry');
  for (const route of routes) {
    const wanted = expected.filter((mount) => mount.route === route);
    const actual = observed.find((measurement) => measurement.route === route);
    if (!actual) continue;
    if (duplicate(actual.mounts.map((mount) => mount.id)).length) failures.push(`${route}: duplicate rendered mount identity`);
    if (!same(wanted.map((mount) => mount.id), actual.mounts.map((mount) => mount.id))) {
      failures.push(`${route}: registry/rendered mount mismatch; expected ${wanted.map((mount) => mount.id).join(', ')}; actual ${actual.mounts.map((mount) => mount.id).join(', ')}`);
    }
    if (!same(wanted.filter((mount) => mount.operable).map((mount) => mount.id), actual.mounts.filter((mount) => mount.operable).map((mount) => mount.id))) {
      failures.push(`${route}: registry/rendered operable-mount mismatch`);
    }
    if (actual.unboundControls.length) failures.push(`${route}: unregistered controls: ${actual.unboundControls.join(', ')}`);
    if (wanted.some((mount) => mount.operable) !== Boolean(actual.first)) failures.push(`${route}: missing or extra first interactive`);
    if (actual.first && !actual.mounts.some((mount) => mount.id === actual.first!.mountId && mount.visibleControl)) {
      failures.push(`${route}: first interactive does not bind to a rendered operable mount`);
    }
  }
  return failures;
}

export function derivedExclusions(routes: readonly string[], expected: readonly FirstScreenMount[]) {
  return routes.filter((route) => !expected.some((mount) => mount.route === route && mount.operable)).map((route) => ({
    route,
    reason: expected.some((mount) => mount.route === route)
      ? 'Registered production figures have no operable input, select, button or interactive ARIA control.'
      : 'The published article mounts no registered interactive, scene, explainer, clip or educational control.',
  }));
}
