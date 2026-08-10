import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLOSSARY, getTerm, glossaryTermsAlphabetical } from '@/data/glossary';
import { glossaryTermSchema } from '@/data/schemas/glossary';
import { getCitation } from '@/data/citations';
import { modules } from '@/data/modules';
import { inlineTermIds } from '@/lib/glossary';
import { moduleBody } from '@/lib/references';

describe('glossaryTermSchema', () => {
  const valid = {
    id: 'action-chunking',
    term: 'action chunking',
    definition:
      'Predicting a sequence of future actions in one inference instead of a single action per timestep.',
    citations: ['act-aloha-2023'],
  };

  it('accepts a fully cited definition', () => {
    expect(glossaryTermSchema.safeParse(valid).success).toBe(true);
  });

  it('REJECTS a definition with no citation id (uncited definitions are banned)', () => {
    const result = glossaryTermSchema.safeParse({ ...valid, citations: [] });
    expect(result.success).toBe(false);
  });

  it('rejects a missing citations field entirely', () => {
    const withoutCitations: Record<string, unknown> = { ...valid };
    delete withoutCitations.citations;
    expect(glossaryTermSchema.safeParse(withoutCitations).success).toBe(false);
  });

  it('rejects a non-kebab-case id', () => {
    expect(
      glossaryTermSchema.safeParse({ ...valid, id: 'Action Chunking' }).success,
    ).toBe(false);
  });

  it('rejects an empty term or definition', () => {
    expect(glossaryTermSchema.safeParse({ ...valid, term: '' }).success).toBe(false);
    expect(
      glossaryTermSchema.safeParse({ ...valid, definition: '' }).success,
    ).toBe(false);
  });
});

describe('GLOSSARY coverage', () => {
  // Raised batch by batch as terms land; the feature target is 25+.
  it('covers the recurring jargon: at least 14 cited terms', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(14);
  });

  it('covers the recurring jargon harvested from published articles', () => {
    const required = [
      'knowledge-insulation',
      'real-time-chunking',
      'hierarchical-policy',
      'open-x-embodiment',
      'teleoperation',
      'success-rate',
    ];
    for (const id of required) {
      expect(getTerm(id), `missing glossary term ${id}`).toBeDefined();
    }
  });

  it('every entry passes the schema', () => {
    for (const term of GLOSSARY) {
      const result = glossaryTermSchema.safeParse(term);
      expect(result.success, `${term.id}: ${result.error?.message ?? ''}`).toBe(true);
    }
  });

  it('term ids are unique', () => {
    const ids = GLOSSARY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every cited source resolves to the citation registry', () => {
    for (const term of GLOSSARY) {
      expect(term.citations.length).toBeGreaterThan(0);
      for (const id of term.citations) {
        expect(getCitation(id), `${term.id} cites unknown source ${id}`).toBeDefined();
      }
    }
  });

  it('definitions are real sentences, not placeholders', () => {
    for (const term of GLOSSARY) {
      expect(term.definition.length).toBeGreaterThan(40);
      expect(term.definition.trim().endsWith('.')).toBe(true);
      expect(term.definition.toLowerCase()).not.toContain('tbd');
    }
  });

  it('glossaryTermsAlphabetical sorts by display term', () => {
    const sorted = glossaryTermsAlphabetical();
    const names = sorted.map((t) => t.term);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    expect(sorted).toHaveLength(GLOSSARY.length);
  });

  it('getTerm resolves by id and returns undefined for unknown ids', () => {
    expect(getTerm(GLOSSARY[0].id)?.id).toBe(GLOSSARY[0].id);
    expect(getTerm('no-such-term')).toBeUndefined();
  });
});

describe('inlineTermIds', () => {
  it('parses paired and self-closing Term elements, deduped in first-use order', () => {
    const body =
      'A <Term id="covariate-shift">covariate shift</Term> appears, then ' +
      '<Term id="action-chunking" /> and <Term id=\'covariate-shift\'>again</Term>.';
    expect(inlineTermIds(body)).toEqual(['covariate-shift', 'action-chunking']);
  });

  it('ignores Term syntax inside code spans and fenced code blocks', () => {
    const body = [
      'Real <Term id="forward-kinematics">forward kinematics</Term> here.',
      '`<Term id="fake-inline" />`',
      '```',
      '<Term id="fake-fenced" />',
      '```',
    ].join('\n');
    expect(inlineTermIds(body)).toEqual(['forward-kinematics']);
  });
});

describe('inline term ids across published articles (VAL-GLOSS-010)', () => {
  it('every <Term> used in a published module resolves to a glossary entry', () => {
    const published = modules.filter((m) => m.status === 'published');
    expect(published.length).toBeGreaterThan(0);
    for (const m of published) {
      const source = readFileSync(
        join(process.cwd(), 'content', m.domain, `${m.slug}.mdx`),
        'utf8',
      );
      for (const id of inlineTermIds(moduleBody(source))) {
        expect(getTerm(id), `${m.domain}/${m.slug} uses unknown term "${id}"`).toBeDefined();
      }
    }
  });
});
