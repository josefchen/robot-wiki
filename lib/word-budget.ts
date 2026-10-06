/**
 * Word budgets for articles that finished an opus-pass domain pass.
 *
 * Each budget in `data/word-budgets.json` is the page's rendered word count
 * (the `words` that `scripts/measure-reading-times.ts` records) right after
 * its latest pass. `data/reading-times.json` cannot go stale on a commit
 * because `scripts/check-reading-times.ts` fails the build when the committed
 * file disagrees with a fresh measurement, so comparing the two files is
 * enough to catch prose that grows back.
 */
export type WordBudgets = Readonly<Record<string, number>>;

export interface WordBudgetFinding {
  page: string;
  words: number | null;
  budget: number;
}

export function wordBudgetFindings(
  measured: Readonly<Record<string, { words: number }>>,
  budgets: WordBudgets,
): WordBudgetFinding[] {
  const findings: WordBudgetFinding[] = [];
  for (const [page, budget] of Object.entries(budgets)) {
    const words = measured[page]?.words;
    if (words === undefined || words > budget) findings.push({ page, words: words ?? null, budget });
  }
  return findings;
}
