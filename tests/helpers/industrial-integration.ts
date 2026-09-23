import { readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { committedSource } from './continuation-integration';

// Keep old transaction assertions on their actual bytes. The two LEI additions
// and their undated rendering are checked separately by undated-citations.
export function preservedPreIndustrialCitations(ref: string): void {
  const source = readFileSync('data/citations.ts', 'utf8');
  const additions = /  \/\/ Official LEI definition has no stated date; access is the retained 2026-09-22 observation\.\n  \{\n      "id": "lei-(?:takt|cycle)-time-definition",[\s\S]*?\n  \},\n/g;
  expect(source.match(additions)).toHaveLength(2);
  const prior = source.replace(additions, '')
    .replace("typeof citation.year === 'number' && (citation.venue?.includes(String(citation.year)) ?? false)",
      'citation.venue?.includes(String(citation.year)) ?? false')
    .replace("${citation.year}${citation.year === 'n.d.' ? `; accessed ${citation.accessedOn}` : ''}",
      '${citation.year}');
  expect(prior).toBe(committedSource(ref, 'data/citations.ts'));
}
