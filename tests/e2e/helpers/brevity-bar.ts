import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { leadParagraph, renderedLeadText, wordCount } from '../../../lib/article-lead';

/**
 * The owner's brevity bar for a rewritten article: at least 30 distinct
 * cited sources on the page and a lead of 60 visible words or fewer. It
 * replaces the old prose-length floors; growth is held by
 * data/word-budgets.json instead.
 */
export const MIN_CITED_SOURCES = 30;
export const MAX_LEAD_WORDS = 60;

/** Distinct registry ids cited by chips on the rendered article. */
export async function citedSourceCount(page: Page): Promise<number> {
  return page
    .locator('#main-content article [data-cite-id]')
    .evaluateAll((els) => new Set(els.map((el) => el.getAttribute('data-cite-id'))).size);
}

/** Visible words in the article's lead paragraph; citation chips are not words. */
export function leadWords(article: string): number {
  const lead = leadParagraph(readFileSync(join(process.cwd(), 'content', `${article}.mdx`), 'utf8'));
  if (!lead) throw new Error(`${article} has no lead paragraph`);
  return wordCount(renderedLeadText(lead.replace(/\s*<Cite\b[^>]*\/>/g, '')));
}
