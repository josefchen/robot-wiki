/**
 * OG card artwork: pure builders for the satori element trees the card
 * generator renders (scripts/generate-og-cards.ts). No node-only imports
 * here so the geometry is unit-testable under Vitest.
 *
 * Design system: the site's paper ground, hairline borders, Tektur display
 * wordmark, one locked signal-blue accent and mono technical readouts.
 * Nothing on a card is build state (AGENTS.md design rules 1 and 6: no
 * progress counters, no drafts).
 *
 * HONESTY CONTRACT FOR THE GRID FIELD (VAL-IMG-015). The right-hand panel
 * is the same literal engineering grid on every card. It encodes no article
 * quantity and carries no highlighted cell, axis, chart series or domain
 * glyph. Reference count and review year remain factual text on the card.
 * A constant grid claims nothing while still giving the identity one clear
 * graphic device.
 *
 * Cards stay byte-distinct (VAL-DIST-003) through their text, which
 * carries the title, domain, reference count and review year.
 */

import type { ModuleRegistryEntry } from '../data/schemas/module.ts';
import { BRAND_COLORS } from './brand-v2-tokens.ts';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from './identity.ts';
import { OG_DISPLAY_STACK, OG_MONO_STACK } from './og-renderer-fonts.ts';
import { sanitizeCardText } from './og-cards.ts';

export interface CardArtworkInput {
  entry: Pick<ModuleRegistryEntry, 'domain' | 'slug' | 'title'>;
  domainName: string;
  referenceCount: number;
  reviewYear: number;
}

// Satori resolves no CSS custom properties, so the renderer consumes the
// checked-in mirror rather than restating literals in this module.
export const OG_RENDERER_COLORS = {
  paper: BRAND_COLORS.paper,
  white: BRAND_COLORS.white,
  ink: BRAND_COLORS.ink,
  graphite: BRAND_COLORS.graphite,
  concrete: BRAND_COLORS.concrete,
  highlight: BRAND_COLORS.highlight,
  signal: BRAND_COLORS.signal,
} as const;

const BG = OG_RENDERER_COLORS.paper;
const PANEL = OG_RENDERER_COLORS.white;
const BORDER = OG_RENDERER_COLORS.concrete;
const TEXT = OG_RENDERER_COLORS.ink;
const DIM = OG_RENDERER_COLORS.graphite;
const ACCENT = OG_RENDERER_COLORS.signal;

// Satori consumes separately vendored static TTFs. The browser uses the
// approved variable Tektur WOFF2 through next/font/local and Plex Mono
// through next/font/google instead; keeping those paths separate makes OG
// rendering deterministic and offline. Both stacks come from the renderer
// face registry so nothing can be painted in an unregistered family.
const SANS = OG_DISPLAY_STACK;
const MONO = OG_MONO_STACK;

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
  // inert for the relative grid containers that rely on it.
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

export type CardTextRun = { family: string; text: string };

/**
 * Every text run a card paints, paired with the font-family stack that
 * resolves for it. Font checks read the population out of the element tree
 * the generator actually renders rather than restating a label list.
 */
export function cardTextRuns(
  node: CardNode,
  inheritedFamily = '',
): CardTextRun[] {
  const declared = node.props.style.fontFamily;
  const family = typeof declared === 'string' ? declared : inheritedFamily;
  const children = node.props.children;
  if (typeof children === 'string') return [{ family, text: children }];
  if (Array.isArray(children)) {
    return children.flatMap((child) => cardTextRuns(child, family));
  }
  return [];
}

export type CardPaintedColor = {
  property: string;
  /** The declared value, e.g. `#D9DADB` or `1px solid #D9DADB`. */
  value: string;
  /** Uppercase six-digit hexes found in the value. */
  hexes: string[];
  /** Colour syntax in the value that is not a six-digit hex. */
  unregistered: string[];
};

const HEX_IN_VALUE = /#[0-9a-fA-F]{3,8}\b/g;
const NON_HEX_COLOR = /\b(?:rgba?|hsla?|color-mix|oklch|lab)\(|\bcurrentColor\b/gi;
const COLOR_PROPERTY =
  /^(?:color|background|backgroundColor|backgroundImage|border|borderTop|borderRight|borderBottom|borderLeft|borderColor|outline|outlineColor|boxShadow|textDecorationColor|fill|stroke)$/;

/**
 * Every colour a card actually paints, read out of the element tree the
 * generator renders. Renderer parity checks that walk this population fail
 * when the artwork paints a value the stylesheet authors for no token,
 * whereas comparing the mirror constant with itself cannot.
 */
export function cardPaintedColors(node: CardNode): CardPaintedColor[] {
  const painted: CardPaintedColor[] = [];
  for (const [property, raw] of Object.entries(node.props.style)) {
    if (typeof raw !== 'string') continue;
    const hexes = [...raw.matchAll(HEX_IN_VALUE)].map((match) =>
      match[0].toUpperCase(),
    );
    const unregistered = [...raw.matchAll(NON_HEX_COLOR)].map(
      (match) => match[0],
    );
    // A six-digit hex is the only spelling the token contract seals, so a
    // colour property carrying anything else is reported rather than
    // silently skipped.
    if (COLOR_PROPERTY.test(property) && hexes.length === 0) {
      unregistered.push(`${property}: ${raw}`);
    }
    if (hexes.length === 0 && unregistered.length === 0) continue;
    painted.push({
      property,
      value: raw,
      hexes: hexes.filter((hex) => hex.length === 7),
      unregistered: [
        ...unregistered,
        ...hexes.filter((hex) => hex.length !== 7),
      ],
    });
  }
  const children = node.props.children;
  if (Array.isArray(children)) {
    for (const child of children) painted.push(...cardPaintedColors(child));
  }
  return painted;
}

/* ------------------------------------------------------------------ */
/* Engineering-grid panel. Flat geometry, no gradients, glow, logo or  */
/* data encoding. The grid stays neutral; signal blue belongs to text. */
/* ------------------------------------------------------------------ */

type Ornament = 'grid';

/** Every card uses the same non-semantic engineering grid. */
export function ornamentFor(domain: string): Ornament {
  void domain;
  return 'grid';
}

const GRID = OG_RENDERER_COLORS.concrete;

function hairline(width: number): CardNode {
  return div({ width: `${width}px`, height: '1px', backgroundColor: BORDER });
}

/** A continuous 8 by 12 drafting grid with no selected or variable cell. */
function engineeringGrid(): CardNode {
  const rowNodes: CardNode[] = [];
  for (let r = 0; r < 12; r++) {
    const cells: CardNode[] = [];
    for (let c = 0; c < 8; c++) {
      cells.push(
        div({
          width: '34px',
          height: '34px',
          borderRight: `1px solid ${GRID}`,
          borderBottom: `1px solid ${GRID}`,
        }),
      );
    }
    rowNodes.push(div({ display: 'flex' }, cells));
  }
  return div(
    {
      display: 'flex',
      flexDirection: 'column',
      width: '273px',
      height: '409px',
      borderLeft: `1px solid ${GRID}`,
      borderTop: `1px solid ${GRID}`,
    },
    rowNodes,
  );
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
 * and the article's real reference count, and the shared grid in
 * a bordered right panel. All text passes sanitizeCardText.
 */
export function articleCardElement(input: CardArtworkInput): CardNode {
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
                  color: ACCENT,
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
                div({ fontSize: '26px', color: TEXT }, PUBLIC_IDENTITY),
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
        [engineeringGrid()],
      ),
    ],
  );
}

/**
 * The site-level card shared by the non-article destinations: the
 * wordmark as the dominant element, the site description, and the shared
 * engineering grid in the right panel. Its wordmark, eyebrow and description
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
                { fontSize: '86px', lineHeight: 1.1, color: TEXT, letterSpacing: '-1px' },
                PUBLIC_IDENTITY,
              ),
              div(
                { marginTop: '22px', fontSize: '26px', lineHeight: 1.4, color: DIM },
                PUBLIC_DESCRIPTOR,
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
                div({ fontFamily: MONO, fontSize: '17px', color: DIM }, 'PRIMARY SOURCES'),
                div({ fontFamily: MONO, fontSize: '17px', color: DIM }, 'ROBOT-WIKI.COM'),
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
        [engineeringGrid()],
      ),
    ],
  );
}
