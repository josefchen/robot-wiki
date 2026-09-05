import { describe, expect, it } from 'vitest';
import { DOMAINS } from '@/data/domains';
import { publishedModules } from '@/data/modules';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';
import {
  articleCardElement,
  cardTextRuns,
  ornamentFor,
  siteCardElement,
} from '@/lib/og-card-artwork';

/**
 * The panel is the same engineering grid for every card, so it encodes
 * nothing about the article or its domain (VAL-IMG-015; drawing-level checks live in
 * og-card-diagram-honesty.test.ts).
 */
describe('grid selection', () => {
  it('assigns the shared grid to every registered domain', () => {
    for (const domain of DOMAINS) {
      expect(ornamentFor(domain)).toBe('grid');
    }
  });

  it('is stable across domains because it is identity, not a glyph set', () => {
    expect(ornamentFor('classical')).toBe(ornamentFor('classical'));
    expect(ornamentFor('manipulation')).toBe(ornamentFor('classical'));
  });

  it('uses the same grid for an unregistered domain', () => {
    expect(ornamentFor('not-a-domain')).toBe(ornamentFor('manipulation'));
  });
});

/**
 * The identity the cards paint (VAL-B2-ID-001/002/003, VAL-BRAND-001/002).
 *
 * Read off the element tree the generator renders, so it is the same object
 * the shipped PNG is rasterised from rather than a restated literal. The
 * v1 lockup shipped in the generated corpus long after the web chrome moved
 * to `Robot Wiki`, because nothing here quantified over what the cards say.
 */
describe('card identity text', () => {
  const article = publishedModules()[0];
  const articleRuns = cardTextRuns(
    articleCardElement({
      entry: article,
      domainName: 'Manipulation',
      referenceCount: 12,
      reviewYear: 2026,
    }),
  ).map(({ text }) => text);
  const siteRuns = cardTextRuns(siteCardElement()).map(({ text }) => text);

  /** Design-system §3.1 forbids each of these as a display identity. */
  const FORBIDDEN_DISPLAY = [
    'robot-wiki',
    'ROBOT WIKI',
    'Robot-Wiki',
    'robot wiki',
    'Robotics encyclopaedia',
  ];

  it('paints the exact public identity on the article card', () => {
    expect(articleRuns).toContain(PUBLIC_IDENTITY);
  });

  it('paints the exact public identity and descriptor on the site card', () => {
    expect(siteRuns).toContain(PUBLIC_IDENTITY);
    expect(siteRuns).toContain(PUBLIC_DESCRIPTOR);
  });

  it('paints no v1 display identity and no descriptor paraphrase', () => {
    for (const run of [...articleRuns, ...siteRuns]) {
      // Technical identifiers stay technical (VAL-B2-ID-004): the domain
      // readout is a URL, not a display lockup, so it is compared whole
      // rather than by substring.
      if (run === 'ROBOT-WIKI.COM') continue;
      expect(FORBIDDEN_DISPLAY, `card run ${JSON.stringify(run)}`).not.toContain(
        run,
      );
      // A run that talks about citations is either the canonical descriptor
      // or a paraphrase of it; there is no third case.
      if (/citation/i.test(run)) expect(run).toBe(PUBLIC_DESCRIPTOR);
    }
    expect(siteRuns.filter((run) => run === PUBLIC_DESCRIPTOR)).toHaveLength(1);
  });

  it('keeps the technical domain readout on the site card', () => {
    expect(siteRuns).toContain('ROBOT-WIKI.COM');
  });
});
