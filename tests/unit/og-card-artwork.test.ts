import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openSync, type LayoutFont } from 'fontkit';
import { describe, expect, it } from 'vitest';
import { DOMAIN_META, publishedModules } from '@/data/modules';
import { BRAND_SPACING } from '@/lib/brand-v2-tokens';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';
import {
  OG_BAND_HEIGHT_PX,
  OG_CARD_DEVICES,
  OG_FRAME_INSET_PX,
  OG_TEXT_INSET_PX,
  OG_TITLE_MEASURE_PX,
  articleCardElement,
  cardDevices,
  cardTextRuns,
  siteCardElement,
  titleFontSize,
  type CardNode,
} from '@/lib/og-card-artwork';
import { ogCardCorpus, openSealedCardTree } from '@/lib/og-card-corpus';
import { sanitizeCardText } from '@/lib/og-cards';
import { TEKTUR_FONT_METADATA } from '@/data/tektur-font-metadata';

const ROOT = process.cwd();
const CORPUS = ogCardCorpus(ROOT);

/**
 * The identity the cards paint (VAL-B2-ID-001/002/003/009, VAL-BRAND-001/002).
 *
 * Read off the element tree the generator renders, so it is the same object
 * the shipped PNG is rasterised from rather than a restated literal. The
 * v1 lockup shipped in the generated corpus long after the web chrome moved
 * to `Robot Wiki`, because nothing here quantified over what the cards say.
 */
describe('card identity text', () => {
  /** Design-system §3.1 forbids each of these as a display identity. */
  const FORBIDDEN_DISPLAY = [
    'robot-wiki',
    'ROBOT WIKI',
    'Robot-Wiki',
    'robot wiki',
    'Robotics encyclopaedia',
  ];

  it('paints the compact identity and no descriptor on every article card, and both exact strings on the site card', () => {
    expect(CORPUS.length).toBe(publishedModules().length + 1);
    for (const { cardId, card } of CORPUS) {
      const runs = cardTextRuns(openSealedCardTree(card));
      const identity = runs.filter(({ text }) => text === PUBLIC_IDENTITY);
      expect(identity, `${cardId} paints the identity once`).toHaveLength(1);
      expect(identity[0].field).toBe('identity');
      expect(
        runs.filter(({ text }) => text === PUBLIC_DESCRIPTOR),
        `${cardId} descriptor`,
      ).toHaveLength(cardId === 'site' ? 1 : 0);
    }
  });

  it('paints no v1 display identity, no descriptor paraphrase and no technical domain readout', () => {
    for (const { cardId, card } of CORPUS) {
      for (const run of cardTextRuns(openSealedCardTree(card))) {
        expect(FORBIDDEN_DISPLAY, `${cardId} run ${JSON.stringify(run.text)}`).not.toContain(run.text);
        // A run naming the brand is the exact display identity; the card
        // facts are limited to the owning route's fields (VAL-IMG-015), so
        // the production domain is not painted as a readout either.
        if (/robot[- ]wiki/i.test(run.text)) expect(run.text).toBe(PUBLIC_IDENTITY);
        // A run that talks about citations is either the canonical
        // descriptor or a paraphrase of it; there is no third case.
        if (/citation/i.test(run.text)) expect(run.text).toBe(PUBLIC_DESCRIPTOR);
      }
    }
  });

  it('limits each card to its canonical fields: site identity and descriptor, or article title, domain, review year, reference count and identity', () => {
    for (const { cardId, card } of CORPUS) {
      const fields = cardTextRuns(openSealedCardTree(card)).map(({ field }) => field).sort();
      expect(fields, cardId).toEqual(
        cardId === 'site'
          ? ['descriptor', 'identity']
          : ['domain', 'identity', 'referenceCount', 'reviewYear', 'title'],
      );
    }
  });
});

describe('registered grid devices', () => {
  it('paints exactly the registered device instances on each card kind', () => {
    for (const { cardId, card } of CORPUS) {
      const kind = cardId === 'site' ? 'site' : 'article';
      const painted = cardDevices(openSealedCardTree(card))
        .map(({ device, instance }) => `${device}#${instance}`)
        .sort();
      const registered = OG_CARD_DEVICES.filter(({ cards }) => cards.includes(kind))
        .map(({ device, instance }) => `${device}#${instance}`)
        .sort();
      expect(painted, cardId).toEqual(registered);
    }
  });

  // Owner-approved successor (research-page standard, Josef, 10 October
  // 2026: "Surfaces are plain paper"): this pinned the card lattice to the
  // 32px `.engineering-grid` tile. The website now paints that class as
  // plain paper, so the card follows it with no lattice, and the geometry
  // pin moves from the lattice pitch to the spacing ladder.
  it('uses only device IDs the website registers, and no lattice, as the website paints none', () => {
    const registries = JSON.parse(
      readFileSync(join(ROOT, 'contract/brand-v2-registries.json'), 'utf8'),
    ) as { gridDevices: Array<{ id: string; anchorGeometry: { pitchPx?: number } }> };
    const ids = new Map(registries.gridDevices.map((device) => [device.id, device]));
    for (const { device } of OG_CARD_DEVICES) expect(ids.has(device), device).toBe(true);
    expect(OG_CARD_DEVICES.map(({ device }) => device)).not.toContain('device:dot-grid');
    // The stylesheet keeps the class name and paints it as plain paper.
    const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');
    expect(css).toMatch(/\.engineering-grid,?[^{]*\{[^}]*background-image: none;/);
    expect(css).not.toMatch(/\.engineering-grid[^{]*\{[^}]*background-size:/);
    for (const step of [OG_FRAME_INSET_PX, OG_TEXT_INSET_PX, OG_BAND_HEIGHT_PX]) {
      expect(BRAND_SPACING, `${step}px`).toContain(step);
    }
  });

  it('keeps device geometry independent of the article facts', () => {
    const [entry] = publishedModules();
    const devicesOf = (referenceCount: number, reviewYear: number) => {
      // Each device's own geometry and its nested shapes; text inside a band
      // is a fact, not device geometry, so it is left out.
      const strip = (node: ReturnType<typeof articleCardElement>): unknown => {
        const nested = Array.isArray(node.props.children)
          ? node.props.children.map(strip).filter(Boolean)
          : [];
        if (node.props.ogMeta?.field) return null;
        return node.props.ogMeta?.device
          ? { meta: node.props.ogMeta, style: node.props.style, nested }
          : nested.length > 0
            ? nested
            : typeof node.props.children === 'string'
              ? null
              : { style: node.props.style };
      };
      return JSON.stringify(
        strip(articleCardElement({ entry, domainName: DOMAIN_META[entry.domain].name, referenceCount, reviewYear })),
      );
    };
    expect(devicesOf(3, 2024)).toBe(devicesOf(41, 2026));
  });
});

/**
 * The title must stay legible in a small X timeline preview and must not
 * become a narrow stack: every published title sets in at most three lines
 * inside the measure, at a display size of at least 56px.
 */
describe('title fit', () => {
  const font = openSync(join(ROOT, TEKTUR_FONT_METADATA.og.path)) as LayoutFont;
  const width = (text: string, size: number): number =>
    (font.layout(text).advanceWidth / font.unitsPerEm) * size;

  function lines(title: string, size: number): number {
    // Greedy wrap at spaces and after hyphens, which is where the renderer breaks.
    const words = title.split(/(?<=-)|\s+/).filter(Boolean);
    let count = 1;
    let line = '';
    for (const word of words) {
      const next = line === '' ? word : line.endsWith('-') ? `${line}${word}` : `${line} ${word}`;
      if (line !== '' && width(next, size) > OG_TITLE_MEASURE_PX) {
        count += 1;
        line = word;
      } else line = next;
    }
    return count;
  }

  it('sets every published title in three lines or fewer at 56px or more', () => {
    for (const article of publishedModules()) {
      const title = sanitizeCardText(article.title);
      const size = titleFontSize(title);
      expect(size, article.slug).toBeGreaterThanOrEqual(56);
      expect(lines(title, size), `${article.slug} at ${size}px`).toBeLessThanOrEqual(3);
    }
  });

  it('balances every hyphen-free title and leaves a hyphenated one on the greedy wrap', () => {
    const findField = (node: CardNode, field: string): CardNode | undefined => {
      if (node.props.ogMeta?.field === field) return node;
      if (!Array.isArray(node.props.children)) return undefined;
      for (const child of node.props.children) {
        const found = findField(child, field);
        if (found) return found;
      }
      return undefined;
    };
    const wraps = new Map<string, unknown>();
    for (const { cardId, card } of CORPUS) {
      if (cardId === 'site') continue;
      const node = findField(openSealedCardTree(card), 'title');
      expect(typeof node?.props.children, `${cardId} paints one title string`).toBe('string');
      const title = node?.props.children as string;
      wraps.set(title, node?.props.style.textWrap);
      expect(node?.props.style.textWrap, `${cardId}: ${title}`).toBe(
        title.includes('-') ? undefined : 'balance',
      );
    }
    expect(wraps.size).toBe(publishedModules().length);
    expect([...wraps.values()]).toContain('balance');
    expect([...wraps.values()]).toContain(undefined);
  });

  it('sizes the site wordmark at least 1.5x the descriptor (reference rubric hierarchy)', () => {
    const sizes = new Map<string, number>();
    const visit = (node: ReturnType<typeof siteCardElement>, inherited: number): void => {
      const own = Number.parseFloat(String(node.props.style.fontSize ?? inherited));
      if (typeof node.props.children === 'string' && node.props.ogMeta?.field) {
        sizes.set(node.props.ogMeta.field, own);
      } else if (Array.isArray(node.props.children)) {
        node.props.children.forEach((child) => visit(child, own));
      }
    };
    visit(siteCardElement(), 16);
    expect((sizes.get('identity') ?? 0) / (sizes.get('descriptor') ?? 1)).toBeGreaterThanOrEqual(1.5);
  });
});
