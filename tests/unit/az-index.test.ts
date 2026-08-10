import { describe, expect, it } from 'vitest';
import { glossaryTermsAlphabetical } from '@/data/glossary';
import { DOMAIN_META, modules, publishedModules } from '@/data/modules';
import {
  buildAzIndex,
  groupLetter,
  type AzIndexSourceEntry,
} from '@/lib/az-index';

/**
 * The A-Z index model (lib/az-index.ts): one flat alphabetical list of every
 * published article and every glossary term, grouped by first letter with
 * jump links (architecture.md section 6, VAL-WIKI-019/020).
 *
 * Fixture tests pin the sorting and grouping rules; the registry tests pin
 * completeness: every published article and every term, zero drafts.
 */

function sourceFixtures(): AzIndexSourceEntry[] {
  return [
    { kind: 'article', label: 'Zeno Effect', href: '/frontier/zeno/', group: 'Frontier' },
    { kind: 'article', label: 'Action Chunking (ACT and ALOHA)', href: '/manipulation/action-chunking/', group: 'Manipulation' },
    { kind: 'term', label: 'action chunking', href: '/glossary/#action-chunking', group: 'Glossary' },
    { kind: 'article', label: 'Behavior Cloning Foundations', href: '/manipulation/bc-foundations/', group: 'Manipulation' },
    { kind: 'term', label: 'behavior cloning', href: '/glossary/#behavior-cloning', group: 'Glossary' },
    { kind: 'article', label: 'action selection', href: '/classical/action-selection/', group: 'Classical' },
  ];
}

describe('groupLetter', () => {
  it('uppercases the first letter of a label', () => {
    expect(groupLetter('Action Chunking')).toBe('A');
    expect(groupLetter('behavior cloning')).toBe('B');
  });

  it('groups non-letter starters under #', () => {
    expect(groupLetter('3D printing')).toBe('#');
  });
});

describe('buildAzIndex sorting and grouping', () => {
  const { groups } = buildAzIndex(sourceFixtures());

  it('orders groups alphabetically with # last', () => {
    const letters = groups.map((g) => g.letter);
    const sorted = [...letters].sort((a, b) =>
      a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b),
    );
    expect(letters).toEqual(sorted);
  });

  it('sorts case-insensitively so a lowercase title sorts with its capitalised neighbours', () => {
    const a = groups.find((g) => g.letter === 'A');
    expect(a).toBeDefined();
    const labels = a!.entries.map((e) => e.label);
    // One alphabetical run, not capitals-then-lowercase: "action chunking"
    // files inside the "Action" entries (and prefix-matches sort shortest
    // first, so the bare term precedes the parenthesised article title).
    expect(labels).toEqual([
      'action chunking',
      'Action Chunking (ACT and ALOHA)',
      'action selection',
    ]);
  });

  it('interleaves articles and glossary terms inside a letter', () => {
    const b = groups.find((g) => g.letter === 'B');
    expect(b!.entries.map((e) => e.kind)).toEqual(['term', 'article']);
  });

  it('emits only letters that have entries', () => {
    const letters = groups.map((g) => g.letter);
    expect(letters).not.toContain('C');
    expect(letters).not.toContain('X');
    expect(new Set(letters).size).toBe(letters.length);
  });

  it('carries the display group and href through to each entry', () => {
    const a = groups.find((g) => g.letter === 'A')!;
    const term = a.entries.find((e) => e.kind === 'term')!;
    expect(term.group).toBe('Glossary');
    expect(term.href).toBe('/glossary/#action-chunking');
    const article = a.entries.find((e) => e.kind === 'article')!;
    expect(article.group).toBe('Manipulation');
  });
});

describe('buildAzIndex against the real registry', () => {
  const articles: AzIndexSourceEntry[] = publishedModules().map((m) => ({
    kind: 'article',
    label: m.title,
    href: `/${m.domain}/${m.slug}/`,
    group: DOMAIN_META[m.domain].name,
  }));
  const terms: AzIndexSourceEntry[] = glossaryTermsAlphabetical().map((t) => ({
    kind: 'term',
    label: t.term,
    href: `/glossary/#${t.id}`,
    group: 'Glossary',
  }));
  const { groups, articleCount, termCount } = buildAzIndex([
    ...articles,
    ...terms,
  ]);
  const all = groups.flatMap((g) => g.entries);

  it('contains every published article exactly once', () => {
    expect(articleCount).toBe(publishedModules().length);
    const hrefs = all.filter((e) => e.kind === 'article').map((e) => e.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const m of publishedModules()) {
      expect(hrefs).toContain(`/${m.domain}/${m.slug}/`);
    }
  });

  it('contains zero draft modules', () => {
    const hrefs = new Set(all.map((e) => e.href));
    for (const m of modules.filter((m) => m.status === 'draft')) {
      expect(hrefs.has(`/${m.domain}/${m.slug}/`)).toBe(false);
      expect(all.some((e) => e.label === m.title)).toBe(false);
    }
  });

  it('contains every glossary term exactly once', () => {
    expect(termCount).toBe(glossaryTermsAlphabetical().length);
    const hrefs = all.filter((e) => e.kind === 'term').map((e) => e.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
