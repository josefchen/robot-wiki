interface CompanyPopulationRecord {
  id: string;
  segment: string;
}

/**
 * Compares an observed list of company ids with the population it should
 * equal, as sets. An empty side is reported on its own, so two empty lists
 * fail instead of agreeing vacuously.
 */
export function companyIdSetIssues(
  expected: readonly string[],
  observed: readonly string[],
  labels: { expected: string; observed: string },
): string[] {
  const issues: string[] = [];
  if (expected.length === 0) issues.push(`${labels.expected} is empty`);
  if (observed.length === 0) issues.push(`${labels.observed} is empty`);
  for (const [ids, label] of [
    [expected, labels.expected],
    [observed, labels.observed],
  ] as const) {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) issues.push(`${id}: listed more than once in ${label}`);
      seen.add(id);
    }
  }
  const want = new Set(expected);
  const got = new Set(observed);
  for (const id of want) {
    if (!got.has(id)) issues.push(`${id}: in ${labels.expected} but missing from ${labels.observed}`);
  }
  for (const id of got) {
    if (!want.has(id)) issues.push(`${id}: in ${labels.observed} but not in ${labels.expected}`);
  }
  return issues;
}

function segmentCounts(records: readonly CompanyPopulationRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { segment } of records) counts.set(segment, (counts.get(segment) ?? 0) + 1);
  return counts;
}

/**
 * The shipped company registry (data/companies.ts) against the research
 * file it is generated from: the same members and the same segment
 * distribution, both derived from the rows themselves.
 */
export function companyPopulationIssues(
  registry: readonly CompanyPopulationRecord[],
  manifest: readonly CompanyPopulationRecord[],
): string[] {
  const issues = companyIdSetIssues(
    manifest.map(({ id }) => id),
    registry.map(({ id }) => id),
    { expected: 'the source manifest', observed: 'the company registry' },
  );
  const want = segmentCounts(manifest);
  const got = segmentCounts(registry);
  for (const segment of [...new Set([...want.keys(), ...got.keys()])].sort()) {
    const inRegistry = got.get(segment) ?? 0;
    const inManifest = want.get(segment) ?? 0;
    if (inRegistry !== inManifest) {
      issues.push(
        `segment ${segment}: ${inRegistry} in the company registry, ${inManifest} in the source manifest`,
      );
    }
  }
  return issues;
}
