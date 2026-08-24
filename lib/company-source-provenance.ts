interface CompanyRoundSourceRecord {
  id: string;
  latestRound?: { sourceUrl?: string } | null;
  sources: ReadonlyArray<{ url: string }>;
}

/**
 * Cross-field validation for a round's explicit provenance pointer.
 *
 * Zod validates the URL shape, while this check proves the pointer belongs
 * to the same company record instead of silently citing another row's source.
 */
export function roundSourceMembershipIssues(
  companies: readonly CompanyRoundSourceRecord[],
): string[] {
  const issues: string[] = [];
  for (const company of companies) {
    const sourceUrl = company.latestRound?.sourceUrl;
    if (!sourceUrl) continue;
    if (!company.sources.some((source) => source.url === sourceUrl)) {
      issues.push(
        `${company.id}: latestRound.sourceUrl ${sourceUrl} is not present in sources[]`,
      );
    }
  }
  return issues;
}
