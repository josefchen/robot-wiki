import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { DOMAIN_META } from '@/data/modules';
import { BRAND_COLORS } from '@/lib/brand-v2-tokens';
import {
  OG_CROSS_SPAN_PX,
  OG_FRAME_INSET_PX,
  articleCardElement,
  type CardNode,
} from '@/lib/og-card-artwork';
import { ogCardCorpus, openSealedCardTree } from '@/lib/og-card-corpus';

/**
 * VAL-IMG-015: no generated card draws or suggests a quantity it does not have.
 *
 * The three conditions are checked directly rather than by proxy:
 * (a) no pseudo-random or unrelated-quantity source reaches a mark's
 * geometry, (b) the registered devices carry none of the affordances that
 * make a drawing read as a measurement — a distinguished line, a filled or
 * highlighted cell, an accent mark outside registration, a series of
 * varying extents — and (c) the devices are one constant per card kind, so
 * they cannot be read as per-article data.
 *
 * Superseded: the v1 fixed 8x12 grid of 34px cells is no longer an oracle,
 * and neither is the brand-v2 32px lattice field. Owner-approved successor
 * (research-page standard, Josef, 10 October 2026: "Surfaces are plain
 * paper"): the website paints `.engineering-grid` as plain paper, so the
 * card paints no lattice, and the clauses that graded the lattice now grade
 * every device the card does paint: the frame rails, their registration
 * crosses and the section rules.
 */

const SOURCE_PATH = join(process.cwd(), 'lib/og-card-artwork.ts');
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');

/** The nearest preceding top-level declaration name, for a blame message. */
function enclosingDeclaration(lines: readonly string[], lineIndex: number): string {
  for (let i = lineIndex; i >= 0; i--) {
    const match = /^(?:export\s+)?(?:function|class|const)\s+([A-Za-z0-9_]+)/.exec(lines[i]);
    if (match) return match[1];
  }
  return '<module scope>';
}

function blameSites(pattern: RegExp): string[] {
  const lines = SOURCE.split('\n');
  const hits: string[] = [];
  lines.forEach((line, i) => {
    if (pattern.test(line)) hits.push(`${enclosingDeclaration(lines, i)} (line ${i + 1})`);
  });
  return hits;
}

interface Mark {
  width: string;
  height: string;
  left: string;
  top: string;
  color: string;
  absolute: boolean;
}

function styleString(node: CardNode, key: string): string {
  const value = node.props.style[key];
  return value === undefined ? '' : String(value);
}

/** A drawn mark: a leaf div with a fill or a stroke and an explicit box. */
function isMark(node: CardNode): boolean {
  const painted =
    styleString(node, 'backgroundColor') !== '' || styleString(node, 'border') !== '';
  return painted && styleString(node, 'width') !== '' && styleString(node, 'height') !== '';
}

function markOf(node: CardNode): Mark {
  return {
    width: styleString(node, 'width'),
    height: styleString(node, 'height'),
    left: styleString(node, 'left'),
    top: styleString(node, 'top'),
    color: `${styleString(node, 'backgroundColor')} ${styleString(node, 'border')}`.trim(),
    absolute: styleString(node, 'position') === 'absolute',
  };
}

/**
 * Groups of marks laid out in normal flow (not absolutely placed), which
 * is what makes a set of marks read as a comparable series.
 */
function flowSeries(node: CardNode): Mark[][] {
  const series: Mark[][] = [];
  const visit = (n: CardNode): void => {
    const kids = n.props.children;
    if (!Array.isArray(kids)) return;
    const marks = kids.filter(isMark).map(markOf).filter((m) => !m.absolute);
    if (marks.length >= 3) series.push(marks);
    for (const k of kids) visit(k);
  };
  visit(node);
  return series;
}

/** Every subtree annotated with a registered device, optionally one kind. */
function devicesOf(card: CardNode, device?: string): CardNode[] {
  const found: CardNode[] = [];
  const visit = (n: CardNode): void => {
    const meta = n.props.ogMeta;
    if (meta?.device !== undefined && (device === undefined || meta.device === device)) found.push(n);
    const kids = n.props.children;
    if (Array.isArray(kids)) for (const k of kids) visit(k);
  };
  visit(card);
  return found;
}

/** A device subtree with the facts it carries removed: its own geometry. */
function geometryOf(node: CardNode): unknown {
  const kids = node.props.children;
  return {
    meta: node.props.ogMeta?.field === undefined ? node.props.ogMeta : undefined,
    style: node.props.ogMeta?.field === undefined ? node.props.style : undefined,
    kids: Array.isArray(kids) ? kids.filter((kid) => kid.props.ogMeta?.field === undefined).map(geometryOf) : [],
  };
}

/** Painted leaves of a subtree: filled divs with no children of their own. */
function paintedLeaves(node: CardNode): CardNode[] {
  const found: CardNode[] = [];
  const visit = (n: CardNode): void => {
    const kids = n.props.children;
    if (Array.isArray(kids)) {
      for (const k of kids) visit(k);
      return;
    }
    if (kids === undefined && styleString(n, 'backgroundColor') !== '') found.push(n);
  };
  visit(node);
  return found;
}

/** Every line the devices draw: the rails and the registration-cross arms. */
function deviceLines(card: CardNode): CardNode[] {
  return devicesOf(card).flatMap(paintedLeaves);
}

/**
 * The shipped corpus, built once. These clauses are about the cards the
 * site actually ships, so the population is the generator's own corpus
 * rather than a second walk of the registry with invented facts: a replica
 * built here would keep passing while the shipped trees changed.
 */
const CORPUS = ogCardCorpus(process.cwd());

function everyCard(): Array<{ label: string; tree: CardNode }> {
  return CORPUS.map(({ cardId, card }) => ({
    label: cardId === 'site' ? 'site card' : cardId,
    tree: openSealedCardTree(card),
  }));
}

describe('VAL-IMG-015 population', () => {
  it('grades the shipped card corpus: registered devices on every card and no lattice field', () => {
    const cards = everyCard();
    expect(cards.length).toBe(publishedModules().length + 1);
    for (const { label, tree } of cards) {
      expect(devicesOf(tree, 'device:dot-grid'), label).toHaveLength(0);
      expect(deviceLines(tree).length, label).toBeGreaterThan(10);
    }
  });
});

describe('VAL-IMG-015 (a): no pseudo-random or unrelated-quantity geometry', () => {
  it('constructs no random-number generator anywhere in the artwork module', () => {
    expect(blameSites(/new Rng\(|Math\.random\(/)).toEqual([]);
  });

  it('defines no random-number generator to construct', () => {
    expect(blameSites(/^\s*(?:export\s+)?class Rng\b/)).toEqual([]);
  });

  it('feeds no string hash into the artwork', () => {
    expect(blameSites(/hashString\(|createHash\(/)).toEqual([]);
  });

  it('does no arithmetic on the review year or the reference count', () => {
    const arithmetic =
      /(?:reviewYear|referenceCount)\s*[-+*/%]|[-+*/%]\s*(?:input\.)?(?:reviewYear|referenceCount)/;
    expect(blameSites(arithmetic)).toEqual([]);
  });
});

describe('VAL-IMG-015 (b): the devices carry no chart affordance', () => {
  it('draws only uniform 1px hairlines: concrete rails and rules, and signal crosses of one span', () => {
    const offenders: string[] = [];
    for (const { label, tree } of everyCard()) {
      for (const line of deviceLines(tree)) {
        if (styleString(line, 'width') !== '1px' && styleString(line, 'height') !== '1px') {
          offenders.push(`${label}: a device line is not a 1px hairline (${JSON.stringify(line.props.style)})`);
        }
      }
      const rails = devicesOf(tree, 'device:outer-rail');
      if (rails.length !== 4) offenders.push(`${label}: ${rails.length} rails, not 4`);
      for (const rail of rails) {
        const edge = rail.props.ogMeta?.instance ?? '';
        if (styleString(rail, 'backgroundColor') !== BRAND_COLORS.concrete) {
          offenders.push(`${label}: ${edge} rail painted ${styleString(rail, 'backgroundColor')}`);
        }
        if (styleString(rail, edge) !== `${OG_FRAME_INSET_PX}px`) {
          offenders.push(`${label}: ${edge} rail sits at ${styleString(rail, edge)}`);
        }
        // A rail runs edge to edge, so no rail stops short and reads as an axis.
        for (const side of edge === 'left' || edge === 'right' ? ['top', 'bottom'] : ['left', 'right']) {
          if (styleString(rail, side) !== '0px') offenders.push(`${label}: ${edge} rail stops at ${side} ${styleString(rail, side)}`);
        }
      }
      const arms = devicesOf(tree, 'device:registration-cross').flatMap(paintedLeaves);
      if (arms.length !== 8) offenders.push(`${label}: ${arms.length} cross arms, not 8`);
      for (const arm of arms) {
        if (styleString(arm, 'backgroundColor') !== BRAND_COLORS.signal) {
          offenders.push(`${label}: cross arm painted ${styleString(arm, 'backgroundColor')}`);
        }
        const extents = [styleString(arm, 'width'), styleString(arm, 'height')].sort().join(' by ');
        if (extents !== ['1px', `${OG_CROSS_SPAN_PX}px`].sort().join(' by ')) {
          offenders.push(`${label}: cross arm ${extents}, not ${OG_CROSS_SPAN_PX}px by 1px`);
        }
      }
      const rules = devicesOf(tree, 'device:section-rule');
      if (rules.length !== (label === 'site card' ? 0 : 2)) offenders.push(`${label}: ${rules.length} section rules`);
      for (const rule of rules) {
        const side = rule.props.ogMeta?.instance === 'header' ? 'borderBottom' : 'borderTop';
        if (styleString(rule, side) !== `1px solid ${BRAND_COLORS.concrete}`) {
          offenders.push(`${label}: ${rule.props.ogMeta?.instance} rule is ${styleString(rule, side)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('paints the signal accent only on the registration crosses and the highlight tone nowhere', () => {
    const offenders: string[] = [];
    const visit = (label: string, node: CardNode, insideCross: boolean): void => {
      const crossed = insideCross || node.props.ogMeta?.device === 'device:registration-cross';
      const painted = JSON.stringify(node.props.style).toUpperCase();
      if (painted.includes(BRAND_COLORS.signal) && !crossed) offenders.push(`${label}: signal outside a registration cross`);
      if (painted.includes(BRAND_COLORS.highlight)) offenders.push(`${label}: highlight painted`);
      const kids = node.props.children;
      if (Array.isArray(kids)) for (const kid of kids) visit(label, kid, crossed);
    };
    for (const { label, tree } of everyCard()) visit(label, tree, false);
    expect(offenders).toEqual([]);
  });

  it('paints no highlight tone on any card, so nothing reads as a selected datum or progress state', () => {
    const offenders = everyCard()
      .filter(({ tree }) => JSON.stringify(tree).toUpperCase().includes(BRAND_COLORS.highlight))
      .map(({ label }) => label);
    expect(offenders).toEqual([]);
  });

  it('lays out no flow series of comparable marks with varying extents', () => {
    const offenders: string[] = [];
    for (const { label, tree } of everyCard()) {
      for (const series of flowSeries(tree)) {
        const boxes = new Set(series.map((m) => `${m.width}x${m.height}`));
        if (boxes.size > 1) offenders.push(`${label}: ${[...boxes].join(', ')}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('VAL-IMG-015 (c): the devices are a constant of the corpus', () => {
  it('renders the identical devices on every card of a kind, and the identical frame on both kinds', () => {
    const byKind = new Map<string, Set<string>>();
    const frames = new Set<string>();
    for (const { label, tree } of everyCard()) {
      const kind = label === 'site card' ? 'site' : 'article';
      const shapes = byKind.get(kind) ?? new Set<string>();
      shapes.add(JSON.stringify(devicesOf(tree).map(geometryOf)));
      byKind.set(kind, shapes);
      frames.add(
        JSON.stringify(
          [...devicesOf(tree, 'device:outer-rail'), ...devicesOf(tree, 'device:registration-cross')].map(geometryOf),
        ),
      );
    }
    expect(byKind.get('site')?.size).toBe(1);
    expect(byKind.get('article')?.size).toBe(1);
    expect(frames.size).toBe(1);
  });

  it('does not change the devices when the article facts change', () => {
    const [entry] = publishedModules();
    const build = (referenceCount: number, reviewYear: number): string =>
      JSON.stringify(
        devicesOf(
          articleCardElement({
            entry,
            domainName: DOMAIN_META[entry.domain].name,
            referenceCount,
            reviewYear,
          }),
        ).map(geometryOf),
      );
    expect(build(6, 2024)).toBe(build(24, 2026));
  });
});
