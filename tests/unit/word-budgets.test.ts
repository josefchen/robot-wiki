import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { wordBudgetFindings, type WordBudgets } from '@/lib/word-budget';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const budgets: WordBudgets = read('data/word-budgets.json');
const measured: Record<string, { words: number; minutes: number }> = read('data/reading-times.json');

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

describe('word budgets', () => {
  it('keeps every budgeted page at or under the words it had after its latest pass', () => {
    expect(wordBudgetFindings(measured, budgets)).toEqual([]);
  });

  it.each(['manipulation', 'classical'])('budgets every published %s article', (domain) => {
    const pages = publishedModules()
      .filter((entry) => entry.domain === domain)
      .map((entry) => `${entry.domain}/${entry.slug}`);
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) expect(budgets[page], page).toBeGreaterThan(0);
  });

  it.each(['manipulation/bc-foundations', 'classical/calibration'])(
    'fails %s when it grows by one planted sentence, and when it disappears',
    (page) => {
      const planted = 'A planted sentence that adds words the budget does not allow.';
      const grown = { ...measured, [page]: { ...measured[page], words: measured[page].words + words(planted) } };
      expect(wordBudgetFindings(grown, { [page]: measured[page].words })).toEqual([
        { page, words: measured[page].words + words(planted), budget: measured[page].words },
      ]);
      expect(wordBudgetFindings(grown, budgets)).toEqual([
        { page, words: measured[page].words + words(planted), budget: budgets[page] },
      ]);
      const without = Object.fromEntries(Object.entries(measured).filter(([key]) => key !== page));
      expect(wordBudgetFindings(without, { [page]: 1 })).toEqual([{ page, words: null, budget: 1 }]);
    },
  );
});
