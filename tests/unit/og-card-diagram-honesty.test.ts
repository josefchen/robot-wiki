import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { DOMAIN_META } from '@/data/modules';
import { BRAND_COLORS } from '@/lib/brand-v2-tokens';
import { articleCardElement, siteCardElement, type CardNode } from '@/lib/og-card-artwork';

/**
 * VAL-IMG-015: no generated card draws a quantity it does not have.
 *
 * The three conditions are checked directly rather than by proxy:
 * (a) no pseudo-random or unrelated-quantity source reaches a mark's
 * geometry, (b) the drawings carry none of the three affordances that
 * make a shape read as a measurement, and (c) the drawing a card shows
 * is a constant of its family, so it cannot be read as per-article data.
 */

const ACCENT = BRAND_COLORS.signal;
const PANEL_WIDTH = 304;

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
    color: `${styleString(node, 'backgroundColor')} ${styleString(node, 'border')}`.trim(),
    absolute: styleString(node, 'position') === 'absolute',
  };
}

function allMarks(node: CardNode): Mark[] {
  const found: Mark[] = [];
  const visit = (n: CardNode): void => {
    if (isMark(n)) found.push(markOf(n));
    const kids = n.props.children;
    if (Array.isArray(kids)) for (const k of kids) visit(k);
  };
  visit(node);
  return found;
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

/** The diagram subtree: the card's right-hand panel holds exactly one. */
function diagramOf(card: CardNode): CardNode {
  const children = card.props.children;
  if (!Array.isArray(children)) throw new Error('card root has no children');
  const panel = children[children.length - 1];
  const inner = panel.props.children;
  if (!Array.isArray(inner)) throw new Error('panel has no diagram child');
  return inner[0];
}

function articleDiagrams(): Array<{ label: string; domain: string; node: CardNode }> {
  return publishedModules().map((entry) => ({
    label: `${entry.domain}/${entry.slug}`,
    domain: entry.domain,
    node: diagramOf(
      articleCardElement({
        entry,
        domainName: DOMAIN_META[entry.domain].name,
        referenceCount: 12,
        reviewYear: 2026,
      }),
    ),
  }));
}

function everyDiagram(): Array<{ label: string; domain: string; node: CardNode }> {
  return [
    ...articleDiagrams(),
    { label: 'site card', domain: '<site>', node: diagramOf(siteCardElement()) },
  ];
}

describe('VAL-IMG-015 (a): no pseudo-random or unrelated-quantity geometry', () => {
  it('constructs no random-number generator anywhere in the artwork module', () => {
    expect(blameSites(/new Rng\(/)).toEqual([]);
  });

  it('defines no random-number generator to construct', () => {
    expect(blameSites(/^\s*(?:export\s+)?class Rng\b/)).toEqual([]);
  });

  it('feeds no string hash into the artwork', () => {
    expect(blameSites(/hashString\(/)).toEqual([]);
  });

  it('does no arithmetic on the review year', () => {
    const arithmetic = /reviewYear\s*[-+*/%]|[-+*/%]\s*reviewYear|Rng\(reviewYear/;
    expect(blameSites(arithmetic)).toEqual([]);
  });
});

describe('VAL-IMG-015 (b): no drawing carries a chart affordance', () => {
  it('draws no panel-width hairline (an axis or baseline rule)', () => {
    const offenders = everyDiagram()
      .filter(({ node }) =>
        allMarks(node).some((m) => m.width === `${PANEL_WIDTH}px` && m.height === '1px'),
      )
      .map(({ label }) => label);
    expect(offenders).toEqual([]);
  });

  it('draws no accent-coloured mark inside a diagram', () => {
    const offenders = everyDiagram()
      .filter(({ node }) => allMarks(node).some((m) => m.color.includes(ACCENT)))
      .map(({ label }) => label);
    expect(offenders).toEqual([]);
  });

  it('lays out no flow series of comparable marks with varying extents', () => {
    const offenders: string[] = [];
    for (const { label, node } of everyDiagram()) {
      for (const series of flowSeries(node)) {
        const boxes = new Set(series.map((m) => `${m.width}x${m.height}`));
        if (boxes.size > 1) offenders.push(`${label}: ${[...boxes].join(', ')}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('VAL-IMG-015 (c): the drawing is a constant of its family', () => {
  it('renders the identical diagram for every article sharing a domain', () => {
    const byDomain = new Map<string, Set<string>>();
    for (const { domain, node } of articleDiagrams()) {
      const shapes = byDomain.get(domain) ?? new Set<string>();
      shapes.add(JSON.stringify(node));
      byDomain.set(domain, shapes);
    }
    const varying = [...byDomain.entries()]
      .filter(([, shapes]) => shapes.size > 1)
      .map(([domain, shapes]) => `${domain}: ${shapes.size} distinct drawings`);
    expect(varying).toEqual([]);
  });

  it('does not change the drawing when the article facts change', () => {
    const [entry] = publishedModules();
    const build = (referenceCount: number, reviewYear: number): string =>
      JSON.stringify(
        diagramOf(
          articleCardElement({
            entry,
            domainName: DOMAIN_META[entry.domain].name,
            referenceCount,
            reviewYear,
          }),
        ),
      );
    expect(build(6, 2024)).toBe(build(24, 2026));
  });
});
