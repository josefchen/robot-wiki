import { describe, expect, it } from 'vitest';
import { inlineCitationIds, moduleBody, resolveReferences } from '@/lib/references';
import { getCitation } from '@/data/citations';

describe('inlineCitationIds', () => {
  it('extracts cite ids in order of first use', () => {
    const body = [
      'First claim <Cite id="dagger-2011" />.',
      'Second claim <Cite id="act-aloha-2023" />.',
      'Repeat <Cite id="dagger-2011" />.',
    ].join('\n');
    expect(inlineCitationIds(body)).toEqual(['dagger-2011', 'act-aloha-2023']);
  });

  it('accepts single-quoted and reordered attributes', () => {
    const body = `A <Cite id='dagger-2011' /> and a <Cite data-x="1" id="act-aloha-2023" />.`;
    expect(inlineCitationIds(body)).toEqual(['dagger-2011', 'act-aloha-2023']);
  });

  it('ignores cites inside inline code spans', () => {
    const body =
      'Prose shows `<Cite id="dagger-2011" />` as syntax, plus <Cite id="act-aloha-2023" />.';
    expect(inlineCitationIds(body)).toEqual(['act-aloha-2023']);
  });

  it('ignores cites inside fenced code blocks', () => {
    const body = [
      '```mdx',
      '<Cite id="dagger-2011" />',
      '```',
      'Real usage <Cite id="act-aloha-2023" />.',
    ].join('\n');
    expect(inlineCitationIds(body)).toEqual(['act-aloha-2023']);
  });

  it('returns an empty list for prose without cites', () => {
    expect(inlineCitationIds('No citations here.')).toEqual([]);
  });
});

describe('moduleBody', () => {
  it('strips the frontmatter block', () => {
    const source = `---\ntitle: "X"\ncitations:\n  - dagger-2011\n---\n\nBody <Cite id="dagger-2011" />.\n`;
    expect(moduleBody(source)).not.toContain('title:');
    expect(moduleBody(source)).toContain('<Cite id="dagger-2011" />');
  });
});

describe('resolveReferences', () => {
  it('renders declared citations in frontmatter order', () => {
    const resolved = resolveReferences(
      ['act-aloha-2023', 'dagger-2011', 'mobile-aloha-2024'],
      ['dagger-2011', 'act-aloha-2023', 'mobile-aloha-2024'],
      getCitation,
    );
    expect(resolved.map((r) => r.citation.id)).toEqual([
      'act-aloha-2023',
      'dagger-2011',
      'mobile-aloha-2024',
    ]);
    // Every entry carries the registry record verbatim (no fabricated fields).
    for (const { citation } of resolved) {
      expect(citation).toBe(getCitation(citation.id));
    }
  });

  it('marks entries that are declared but never cited inline as further reading', () => {
    const resolved = resolveReferences(
      ['act-aloha-2023', 'mobile-aloha-2024'],
      ['act-aloha-2023'],
      getCitation,
    );
    expect(resolved).toEqual([
      expect.objectContaining({
        citation: expect.objectContaining({ id: 'act-aloha-2023' }),
        furtherReading: false,
      }),
      expect.objectContaining({
        citation: expect.objectContaining({ id: 'mobile-aloha-2024' }),
        furtherReading: true,
      }),
    ]);
  });

  it('dedupes repeated frontmatter ids, keeping declaration order', () => {
    const resolved = resolveReferences(
      ['dagger-2011', 'act-aloha-2023', 'dagger-2011'],
      ['dagger-2011', 'act-aloha-2023'],
      getCitation,
    );
    expect(resolved.map((r) => r.citation.id)).toEqual([
      'dagger-2011',
      'act-aloha-2023',
    ]);
  });

  it('skips ids missing from the registry (the prebuild gate already fails them)', () => {
    const resolved = resolveReferences(
      ['act-aloha-2023', 'not-a-real-citation'],
      ['act-aloha-2023'],
      getCitation,
    );
    expect(resolved.map((r) => r.citation.id)).toEqual(['act-aloha-2023']);
  });

  it('gives the header citation count one source: the rendered entry list, not the raw frontmatter array (VAL-WIKI-014)', () => {
    const declared = [
      'dagger-2011',
      'act-aloha-2023',
      'dagger-2011', // duplicate frontmatter entry
      'not-a-real-citation', // unresolved id
    ];
    const resolved = resolveReferences(declared, ['dagger-2011'], getCitation);
    // The header count derives from resolved.length, which is exactly what
    // <References> renders: duplicates and unresolved ids never inflate it.
    expect(declared).toHaveLength(4);
    expect(resolved).toHaveLength(2);
  });
});
