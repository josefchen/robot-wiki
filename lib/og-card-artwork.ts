/**
 * OG card artwork: pure builders for the satori element trees the card
 * generator renders (scripts/generate-og-cards.ts). No node-only imports
 * here so the geometry is unit-testable under Vitest.
 *
 * Design system: the site's "technical instrument" tokens (dark
 * near-black canvas, hairline borders, one locked amber accent, Geist
 * sans for titles, a mono face for readouts). Nothing on a card is
 * build state (AGENTS.md design rules 1 and 6: no progress counters, no
 * drafts).
 *
 * HONESTY CONTRACT FOR THE PANEL ORNAMENT (VAL-IMG-015). The right-hand
 * panel carries an ornament, not a diagram, and the two earlier
 * chart-shaped attempts are why that is stated so bluntly. The article
 * facts this module receives are the reference count and the review
 * year; both are printed as text on the card, and there is no third
 * quantity a series of marks could honestly encode. So the panel does
 * not draw a series at all. Each ornament is a fixed lattice of
 * IDENTICAL marks, so no mark has an extent another mark can be
 * compared against, and a magnitude cannot be read out of it. None of
 * them draws a baseline or axis rule, and none paints a mark in the
 * accent colour, because a single distinguished mark reads as "this
 * datum is the significant one".
 *
 * The ornament is selected by the article's `domain` field through the
 * literal table below, so every article in a domain renders the same
 * ornament and the drawing varies with nothing else. That is the point:
 * a constant claims nothing. Varying it per article, by a hash or a
 * random stream or arithmetic on a year, is what made the earlier
 * versions read as measurements of data that was never there.
 *
 * Cards stay byte-distinct (VAL-DIST-003) through their text, which
 * carries the title, domain, reference count and review year.
 */

import type { ModuleRegistryEntry } from '../data/schemas/module.ts';
import { sanitizeCardText } from './og-cards.ts';

export interface CardArtworkInput {
  entry: Pick<ModuleRegistryEntry, 'domain' | 'slug' | 'title'>;
  domainName: string;
  referenceCount: number;
  reviewYear: number;
}

// Design tokens (app/globals.css).
const BG = '#0b0d0e';
const PANEL = '#0f1214';
const BORDER = '#23282c';
const TEXT = '#e8eaec';
const DIM = '#9aa4ab';
const ACCENT = '#f5a623';

const SANS = 'Geist, sans-serif';
const MONO = 'KaTeX_Typewriter, monospace';

/* ------------------------------------------------------------------ */
/* Element helpers. Satori accepts plain element objects; a thin typed */
/* wrapper keeps TS strict happy without importing React types here.   */
/* ------------------------------------------------------------------ */

export type CardNode = {
  type: string;
  props: {
    style: Record<string, unknown>;
    children?: string | CardNode[];
  };
};

function el(
  type: string,
  style: Record<string, unknown>,
  children?: string | CardNode[],
): CardNode {
  // Satori requires an explicit display on every element whose children
  // is an array (even a single-element array). Default such wrappers to
  // flex; absolutely-positioned children leave the flow, so this is
  // inert for the relative ornament containers that rely on it.
  const resolved =
    Array.isArray(children) && style.display === undefined
      ? { display: 'flex', ...style }
      : style;
  return children === undefined
    ? { type, props: { style: resolved } }
    : { type, props: { style: resolved, children } };
}

function div(style: Record<string, unknown>, children?: string | CardNode[]): CardNode {
  return el('div', style, children);
}

/* ------------------------------------------------------------------ */
/* Panel ornaments. Each is a fixed lattice of identical marks: flat    */
/* geometry, no gradients, no glow, no accent colour and no rules. The  */
/* accent stays out of the panel deliberately (see the honesty contract */
/* at the top of this file), so the card's only amber is the site       */
/* card's WIKI eyebrow.                                                 */
/* ------------------------------------------------------------------ */

type Ornament = 'lattice' | 'mesh' | 'stitch' | 'weave' | 'notch' | 'pitch';

/**
 * The ornament each domain wears. A literal table read by the article's
 * `domain` frontmatter field and nothing else, so every article in a
 * domain renders the identical drawing.
 */
const DOMAIN_ORNAMENT: Record<string, Ornament> = {
  manipulation: 'lattice',
  'rl-sim2real': 'weave',
  'world-models': 'mesh',
  'data-hardware': 'stitch',
  classical: 'notch',
  frontier: 'pitch',
  adjacent: 'mesh',
};

const FALLBACK_ORNAMENT: Ornament = 'lattice';

/** The ornament a card wears (exported for tests). */
export function ornamentFor(domain: string): Ornament {
  return DOMAIN_ORNAMENT[domain] ?? FALLBACK_ORNAMENT;
}

/** The bordered right panel width, minus its padding. */
const PANEL_W = 304;

/** The single fill every ornament mark uses. */
const MARK = '#3c454c';

function hairline(width: number): CardNode {
  return div({ width: `${width}px`, height: '1px', backgroundColor: BORDER });
}

/** Rows of identical marks: the shape every flow-laid ornament shares. */
function markGrid(
  cols: number,
  rows: number,
  colGap: number,
  rowGap: number,
  mark: () => CardNode | undefined,
  cellW: number,
  cellH: number,
): CardNode {
  const rowNodes: CardNode[] = [];
  for (let r = 0; r < rows; r++) {
    const cells: CardNode[] = [];
    for (let c = 0; c < cols; c++) {
      cells.push(
        mark() ?? div({ width: `${cellW}px`, height: `${cellH}px` }),
      );
    }
    rowNodes.push(div({ display: 'flex', gap: `${colGap}px` }, cells));
  }
  return div(
    { display: 'flex', flexDirection: 'column', gap: `${rowGap}px`, width: `${PANEL_W}px` },
    rowNodes,
  );
}

function dot(size: number): CardNode {
  return div({
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '9999px',
    backgroundColor: MARK,
  });
}

/** Even lattice of identical dots. */
function latticeOrnament(): CardNode {
  return markGrid(7, 13, 43, 38, () => dot(6), 6, 6);
}

/** Open mesh of identical hairline-outlined cells. */
function meshOrnament(): CardNode {
  return markGrid(
    5,
    9,
    43,
    37,
    () => div({ width: '26px', height: '26px', border: `1px solid ${MARK}` }),
    26,
    26,
  );
}

/** Even field of identical short strokes. */
function stitchOrnament(): CardNode {
  return markGrid(
    4,
    17,
    42,
    31,
    () => div({ width: '44px', height: '2px', backgroundColor: MARK }),
    44,
    2,
  );
}

/**
 * Checkerboard of identical squares. Skipped cells render as unpainted
 * spacers so the painted ones stay on the lattice.
 */
function weaveOrnament(): CardNode {
  let index = 0;
  return markGrid(
    8,
    14,
    18,
    17,
    () => {
      const row = Math.floor(index / 8);
      const col = index % 8;
      index += 1;
      return (row + col) % 2 === 0
        ? div({ width: '22px', height: '22px', backgroundColor: MARK })
        : undefined;
    },
    22,
    22,
  );
}

/**
 * Even field of identical corner ticks. Deliberately not a circle of
 * dots: that silhouette is a dot-matrix loading spinner, which on a
 * static export implies a pending operation that does not exist.
 */
function notchOrnament(): CardNode {
  // 2px strokes, not the 1px hairline the rest of the design system
  // uses: a feed renders this card at roughly half size, and a 1px
  // stroke aliases into a visibly uneven field at that scale.
  return markGrid(
    6,
    11,
    38,
    36,
    () =>
      div({
        width: '16px',
        height: '16px',
        borderLeft: `2px solid ${MARK}`,
        borderBottom: `2px solid ${MARK}`,
      }),
    16,
    16,
  );
}

/** Even field of identical diamonds. */
function pitchOrnament(): CardNode {
  return markGrid(
    5,
    15,
    66,
    29,
    () =>
      div({
        width: '8px',
        height: '8px',
        backgroundColor: MARK,
        transform: 'rotate(45deg)',
      }),
    8,
    8,
  );
}

function ornamentElement(ornament: Ornament): CardNode {
  switch (ornament) {
    case 'lattice':
      return latticeOrnament();
    case 'mesh':
      return meshOrnament();
    case 'stitch':
      return stitchOrnament();
    case 'weave':
      return weaveOrnament();
    case 'notch':
      return notchOrnament();
    case 'pitch':
      return pitchOrnament();
  }
}

/* ------------------------------------------------------------------ */
/* Cards.                                                              */
/* ------------------------------------------------------------------ */

function titleFontSize(title: string): number {
  if (title.length > 44) return 48;
  if (title.length > 28) return 58;
  return 66;
}

/**
 * The article card: domain micro-label and review year across the top,
 * the title as the dominant element, a hairline footer with the wordmark
 * and the article's real reference count, and the domain's ornament in
 * a bordered right panel. All text passes sanitizeCardText.
 */
export function articleCardElement(input: CardArtworkInput): CardNode {
  const ornament = ornamentFor(input.entry.domain);
  const title = sanitizeCardText(input.entry.title);
  return div(
    {
      width: '100%',
      height: '100%',
      backgroundColor: BG,
      display: 'flex',
      fontFamily: SANS,
    },
    [
      div(
        {
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          padding: '52px 48px 44px 60px',
        },
        [
          div(
            {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            },
            [
              div(
                {
                  fontFamily: MONO,
                  fontSize: '17px',
                  letterSpacing: '2px',
                  color: DIM,
                },
                sanitizeCardText(input.domainName).toUpperCase(),
              ),
              div({ fontFamily: MONO, fontSize: '17px', color: DIM }, `REVIEWED ${input.reviewYear}`),
            ],
          ),
          div(
            {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flexGrow: 1,
              maxWidth: '620px',
            },
            [
              div(
                {
                  fontSize: `${titleFontSize(title)}px`,
                  lineHeight: 1.16,
                  color: TEXT,
                  letterSpacing: '-0.5px',
                },
                title,
              ),
            ],
          ),
          div({ display: 'flex', flexDirection: 'column' }, [
            hairline(620),
            div(
              {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginTop: '18px',
              },
              [
                div({ fontSize: '26px', color: TEXT }, 'robot-wiki'),
                div(
                  { fontFamily: MONO, fontSize: '17px', color: DIM },
                  `${input.referenceCount} REFERENCES`,
                ),
              ],
            ),
          ]),
        ],
      ),
      div(
        {
          display: 'flex',
          width: '400px',
          backgroundColor: PANEL,
          borderLeft: `1px solid ${BORDER}`,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 48px',
        },
        [ornamentElement(ornament)],
      ),
    ],
  );
}

/**
 * The site-level card shared by the non-article destinations: the
 * wordmark as the dominant element, the site description, and the notch
 * ornament in the right panel. Its wordmark, eyebrow and description
 * appear on no article card, so the asset is byte-distinct from all of
 * them (VAL-DIST-003) through its text rather than its ornament.
 */
export function siteCardElement(): CardNode {
  return div(
    {
      width: '100%',
      height: '100%',
      backgroundColor: BG,
      display: 'flex',
      fontFamily: SANS,
    },
    [
      div(
        {
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          padding: '52px 48px 44px 60px',
        },
        [
          div({ fontFamily: MONO, fontSize: '17px', letterSpacing: '2px', color: ACCENT }, 'WIKI'),
          div(
            {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flexGrow: 1,
              maxWidth: '620px',
            },
            [
              div({ fontSize: '86px', lineHeight: 1.1, color: TEXT, letterSpacing: '-1px' }, 'robot-wiki'),
              div(
                { marginTop: '22px', fontSize: '26px', lineHeight: 1.4, color: DIM },
                'An encyclopedic interactive guide to modern robotics for ML engineers.',
              ),
            ],
          ),
          div({ display: 'flex', flexDirection: 'column' }, [
            hairline(620),
            div(
              {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginTop: '18px',
              },
              [
                div({ fontSize: '26px', color: TEXT }, 'robot-wiki'),
                div({ fontFamily: MONO, fontSize: '17px', color: DIM }, 'robot-wiki.com'),
              ],
            ),
          ]),
        ],
      ),
      div(
        {
          display: 'flex',
          width: '400px',
          backgroundColor: PANEL,
          borderLeft: `1px solid ${BORDER}`,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 48px',
        },
        [notchOrnament()],
      ),
    ],
  );
}
