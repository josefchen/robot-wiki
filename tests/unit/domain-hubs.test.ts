import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { citationLabel, getCitation } from '@/data/citations';
import { DOMAIN_META, DOMAINS, publishedModules } from '@/data/modules';
import type { Domain } from '@/data/modules';
import { sentences, wordCount } from '@/lib/article-lead';
import { FIRST_PARAGRAPH_MAX_WORDS } from '@/lib/discovery-prose';
import { relatedTitle } from '@/lib/domain-hub';
import { moduleSource } from '@/lib/module-source';

/** A paragraph's reader-visible prose: chips dropped, inline markup unwrapped. */
function plainParagraph(paragraph: string): string {
  return paragraph
    .replace(/<Cite\b[^>]*\/>/g, '')
    .replace(/<Term\b[^>]*>([^<]*)<\/Term>/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Article text as a reader sees it, with π spelled the way summaries spell it. */
function articleText(domain: string, slug: string): string {
  const { content, data } = matter(moduleSource(domain, slug));
  return `${data.title ?? ''} ${plainParagraph(content)}`.replace(/π/g, 'pi');
}

const NUMBER = /\d+(?:[.,]\d+)*/g;

/** Names in a summary: tokens with a capital letter, except the sentence's first word. */
function names(summary: string): string[] {
  return summary
    .split(/\s+/)
    .slice(1)
    .map((token) => token.replace(/^[("'‘“]+|[)"'’”.,;:!?]+$/g, '').replace(/'s$/, ''))
    .filter((token) => /[A-Z]/.test(token));
}

describe('domain hub leads (VAL-OPUS-105)', () => {
  for (const domain of DOMAINS) {
    const meta = DOMAIN_META[domain as Domain];
    it(`${domain} opens with a sentence that defines the domain`, () => {
      const first = sentences(meta.description)[0];
      expect(first).toMatch(/^(?:A |An |The )?[A-Z][\w(),\- ]*? (?:is|are) /);
      expect(first).not.toMatch(/^(?:This|In this|Here|Welcome)\b/);
    });

    it(`${domain} keeps its first paragraph within ${FIRST_PARAGRAPH_MAX_WORDS} words`, () => {
      const fact = meta.fact;
      const label = fact ? citationLabel(getCitation(fact.citationId)!) : '';
      const lead = [meta.description, fact?.text, label].filter(Boolean).join(' ');
      expect(wordCount(lead)).toBeLessThanOrEqual(FIRST_PARAGRAPH_MAX_WORDS);
    });

    it(`${domain} links three published neighbours with trailing slashes`, () => {
      expect(meta.related).toHaveLength(3);
      for (const href of meta.related) {
        expect(() => relatedTitle(href), href).not.toThrow();
        expect(href).not.toBe(`/${domain}/`);
      }
      if (meta.furtherReading) expect(getCitation(meta.furtherReading)).toBeDefined();
    });
  }
});

describe('hub summaries state only what their articles state (VAL-OPUS-114)', () => {
  for (const entry of publishedModules()) {
    it(`${entry.domain}/${entry.slug}`, () => {
      expect(sentences(entry.summary), entry.summary).toHaveLength(1);
      expect(entry.summary).toMatch(/[.?!]$/);
      const text = articleText(entry.domain, entry.slug);
      for (const number of entry.summary.match(NUMBER) ?? []) {
        expect(text, `number ${number} in "${entry.summary}"`).toContain(number);
      }
      for (const name of names(entry.summary)) {
        expect(text, `name ${name} in "${entry.summary}"`).toContain(name);
      }
    });
  }
});
