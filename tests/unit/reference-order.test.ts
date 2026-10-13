import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
import { referenceGroups, referencesInPrintOrder } from '@/lib/reference-order';
import { resolveReferences } from '@/lib/references';

const ids = (entries: readonly { citation: { id: string } }[]) =>
  entries.map(({ citation }) => citation.id);

describe('References print order', () => {
  // Frontmatter interleaves an uncited source between cited ones, the way
  // the world-models length cut left five to six per article.
  const resolved = resolveReferences(
    ['mobile-aloha-2024', 'act-aloha-2023', 'dagger-2011', 'diffusion-policy-2023'],
    ['act-aloha-2023', 'diffusion-policy-2023'],
    getCitation,
  );

  it('splits the cited sources from further reading, each in frontmatter order', () => {
    const { cited, furtherReading } = referenceGroups(resolved);
    expect(ids(cited)).toEqual(['act-aloha-2023', 'diffusion-policy-2023']);
    expect(ids(furtherReading)).toEqual(['mobile-aloha-2024', 'dagger-2011']);
    expect(cited.every((entry) => !entry.furtherReading)).toBe(true);
    expect(furtherReading.every((entry) => entry.furtherReading)).toBe(true);
  });

  it('prints every cited source before any further reading, losing and adding nothing', () => {
    const printed = referencesInPrintOrder(resolved);
    expect(ids(printed)).toEqual([
      'act-aloha-2023',
      'diffusion-policy-2023',
      'mobile-aloha-2024',
      'dagger-2011',
    ]);
    expect([...ids(printed)].sort()).toEqual([...ids(resolved)].sort());
    // The records pass through untouched: the order moves, the facts do not.
    for (const entry of printed) expect(resolved).toContain(entry);
  });

  it('is stable when applied to a list already in print order', () => {
    const once = referencesInPrintOrder(resolved);
    expect(referencesInPrintOrder(once)).toEqual(once);
  });

  it('leaves a fully cited bibliography in frontmatter order', () => {
    const allCited = resolveReferences(
      ['mobile-aloha-2024', 'act-aloha-2023', 'dagger-2011'],
      ['dagger-2011', 'mobile-aloha-2024', 'act-aloha-2023'],
      getCitation,
    );
    expect(ids(referencesInPrintOrder(allCited))).toEqual([
      'mobile-aloha-2024',
      'act-aloha-2023',
      'dagger-2011',
    ]);
    expect(referenceGroups(allCited).furtherReading).toEqual([]);
  });

  it('returns empty groups for an empty bibliography', () => {
    expect(referenceGroups([])).toEqual({ cited: [], furtherReading: [] });
    expect(referencesInPrintOrder([])).toEqual([]);
  });
});
