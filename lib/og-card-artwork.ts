/**
 * OG card artwork: pure builders for the satori element trees the card
 * generator renders (scripts/generate-og-cards.ts). No node-only imports
 * here so the geometry is unit-testable under Vitest.
 *
 * Research-page composition (library/design-system.md owner decision of
 * 10 October 2026, §19): a plain paper ground framed by four 1px concrete
 * hairline rails, one signal-blue registration cross on each rail
 * intersection, and on the article card hairline section rules under the
 * header band and over the footer band. There is no lattice or field: the
 * website's `.engineering-grid` is plain paper now, and a card follows the
 * website's grid. The Tektur display face, which survives only in this
 * offline renderer, sets the title or the dominant wordmark; IBM Plex Mono,
 * the registered OG face of the data role (data/type-roles.json), sets the
 * registration metadata and the site descriptor.
 *
 * Every rail, cross and rule is one of the website's registered grid
 * devices (`device:*` in contract/brand-v2-registries.json) and carries
 * that ID in `props.ogMeta.device`, so the card population and the registry
 * can be reconciled. Text nodes carry the card field they paint in
 * `props.ogMeta.field`, so the renderer-input manifest records which
 * canonical fact each string came from. Satori ignores `ogMeta`.
 *
 * HONESTY CONTRACT (VAL-IMG-015). The devices are constants of the card
 * kind: their geometry depends only on the canvas edges, never on an
 * article fact, a hash or a random source. No device draws a series, cell,
 * axis or distinguished line, the one accent is confined to the
 * registration crosses, and the highlight tone is not painted at all, so
 * nothing reads as a selected datum or a progress state. Cards stay
 * byte-distinct (VAL-DIST-003) through their factual text: title, domain,
 * review year and reference count.
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

export type OgRendererColorToken = keyof typeof OG_RENDERER_COLORS;

const GROUND = OG_RENDERER_COLORS.paper;
const PROBE_GROUND = OG_RENDERER_COLORS.white;
const RULE = OG_RENDERER_COLORS.concrete;
const TEXT = OG_RENDERER_COLORS.ink;
const DIM = OG_RENDERER_COLORS.graphite;
const REGISTRATION = OG_RENDERER_COLORS.signal;

// Satori consumes separately vendored static TTFs. The browser uses the
// approved variable Tektur WOFF2 through next/font/local and Plex Mono
// through next/font/google instead; keeping those paths separate makes OG
// rendering deterministic and offline. Both stacks come from the renderer
// face registry so nothing can be painted in an unregistered family.
const DISPLAY = OG_DISPLAY_STACK;
const MONO = OG_MONO_STACK;

/* ------------------------------------------------------------------ */
/* Element helpers. Satori accepts plain element objects; a thin typed */
/* wrapper keeps TS strict happy without importing React types here.   */
/* ------------------------------------------------------------------ */

/** The card field a text node paints; every text node names exactly one. */
export type CardField =
  | 'identity'
  | 'descriptor'
  | 'title'
  | 'domain'
  | 'reviewYear'
  | 'referenceCount';

export type CardMeta = {
  /** A registered website grid device ID, e.g. `device:outer-rail`. */
  device?: OgCardDeviceId;
  /** Which instance of the device, e.g. `left` or `top-left`. */
  instance?: string;
  field?: CardField;
};

export type CardNode = {
  type: string;
  props: {
    style: Record<string, unknown>;
    children?: string | CardNode[];
    ogMeta?: CardMeta;
  };
};

function el(
  type: string,
  style: Record<string, unknown>,
  children?: string | CardNode[],
  ogMeta?: CardMeta,
): CardNode {
  // Satori requires an explicit display on every element whose children
  // is an array (even a single-element array). Default such wrappers to
  // flex; absolutely-positioned children leave the flow, so this is
  // inert for the relative containers that rely on it.
  const resolved =
    Array.isArray(children) && style.display === undefined
      ? { display: 'flex', ...style }
      : style;
  const props: CardNode['props'] = { style: resolved };
  if (children !== undefined) props.children = children;
  if (ogMeta !== undefined) props.ogMeta = ogMeta;
  return { type, props };
}

function div(
  style: Record<string, unknown>,
  children?: string | CardNode[],
  ogMeta?: CardMeta,
): CardNode {
  return el('div', style, children, ogMeta);
}

export type CardTextRun = { family: string; text: string; field?: CardField };

/**
 * Every text run a card paints, paired with the font-family stack that
 * resolves for it and the card field it carries. Font checks and the
 * renderer-input manifest read the population out of the element tree the
 * generator actually renders rather than restating a label list.
 */
export function cardTextRuns(
  node: CardNode,
  inheritedFamily = '',
): CardTextRun[] {
  const declared = node.props.style.fontFamily;
  const family = typeof declared === 'string' ? declared : inheritedFamily;
  const children = node.props.children;
  if (typeof children === 'string') {
    const field = node.props.ogMeta?.field;
    return [field === undefined ? { family, text: children } : { family, text: children, field }];
  }
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
/* Registered grid devices.                                            */
/* ------------------------------------------------------------------ */

export type OgCardKind = 'site' | 'article';

export type OgCardDeviceId =
  | 'device:outer-rail'
  | 'device:section-rule'
  | 'device:registration-cross';

export type OgCardDeviceRecord = {
  /** The website grid-device registry row this card device instantiates. */
  device: OgCardDeviceId;
  instance: string;
  purpose: string;
  /** The real layout geometry the device sits on. */
  anchor: string;
  colourToken: OgRendererColorToken;
  /** Card kinds that paint this instance. */
  cards: readonly OgCardKind[];
};

/** Outer-rail inset from each canvas edge; a spacing-ladder value. */
export const OG_FRAME_INSET_PX = 48;
/** Header and footer band height on the article card. */
export const OG_BAND_HEIGHT_PX = 64;
/** Registration cross arm span: odd, so one pixel sits on the rail. */
export const OG_CROSS_SPAN_PX = 17;
/** Text inset from the rails, a spacing-ladder value. */
export const OG_TEXT_INSET_PX = 48;

const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
const EDGES = ['left', 'right', 'top', 'bottom'] as const;

/**
 * Every device instance a card paints, with the geometry it is anchored
 * to. The card trees are reconciled exactly against this table.
 */
export const OG_CARD_DEVICES: readonly OgCardDeviceRecord[] = [
  ...EDGES.map((edge) => ({
    device: 'device:outer-rail' as const,
    instance: edge,
    purpose: 'Bounds the composition the way the shell rails bound the page.',
    anchor: `${OG_FRAME_INSET_PX}px from the ${edge} canvas edge, edge to edge`,
    colourToken: 'concrete' as const,
    cards: ['site', 'article'] as const,
  })),
  ...CORNERS.map((corner) => ({
    device: 'device:registration-cross' as const,
    instance: corner,
    purpose: 'Registers the intersection of two outer rails.',
    anchor: `centred on the ${corner} outer-rail intersection`,
    colourToken: 'signal' as const,
    cards: ['site', 'article'] as const,
  })),
  {
    device: 'device:section-rule',
    instance: 'header',
    purpose: 'Closes the metadata band above the title.',
    anchor: `bottom edge of the ${OG_BAND_HEIGHT_PX}px header band, rail to rail`,
    colourToken: 'concrete',
    cards: ['article'],
  },
  {
    device: 'device:section-rule',
    instance: 'footer',
    purpose: 'Opens the identity and source-count band below the title.',
    anchor: `top edge of the ${OG_BAND_HEIGHT_PX}px footer band, rail to rail`,
    colourToken: 'concrete',
    cards: ['article'],
  },
];

export type CardDeviceUse = { device: OgCardDeviceId; instance: string };

/** The device instances a card tree paints, in tree order. */
export function cardDevices(node: CardNode): CardDeviceUse[] {
  const found: CardDeviceUse[] = [];
  const visit = (current: CardNode): void => {
    const meta = current.props.ogMeta;
    if (meta?.device !== undefined) {
      found.push({ device: meta.device, instance: meta.instance ?? '' });
    }
    const children = current.props.children;
    if (Array.isArray(children)) children.forEach(visit);
  };
  visit(node);
  return found;
}

function outerRail(edge: (typeof EDGES)[number]): CardNode {
  const vertical = edge === 'left' || edge === 'right';
  return div(
    vertical
      ? {
          position: 'absolute',
          [edge]: `${OG_FRAME_INSET_PX}px`,
          top: '0px',
          bottom: '0px',
          width: '1px',
          backgroundColor: RULE,
        }
      : {
          position: 'absolute',
          [edge]: `${OG_FRAME_INSET_PX}px`,
          left: '0px',
          right: '0px',
          height: '1px',
          backgroundColor: RULE,
        },
    undefined,
    { device: 'device:outer-rail', instance: edge },
  );
}

function registrationCross(corner: (typeof CORNERS)[number]): CardNode {
  const offset = `${OG_FRAME_INSET_PX - (OG_CROSS_SPAN_PX - 1) / 2}px`;
  const [vertical, horizontal] = corner.split('-') as ['top' | 'bottom', 'left' | 'right'];
  const arm = (OG_CROSS_SPAN_PX - 1) / 2;
  return div(
    {
      position: 'absolute',
      [vertical]: offset,
      [horizontal]: offset,
      width: `${OG_CROSS_SPAN_PX}px`,
      height: `${OG_CROSS_SPAN_PX}px`,
    },
    [
      div({
        position: 'absolute',
        left: '0px',
        top: `${arm}px`,
        width: `${OG_CROSS_SPAN_PX}px`,
        height: '1px',
        backgroundColor: REGISTRATION,
      }),
      div({
        position: 'absolute',
        left: `${arm}px`,
        top: '0px',
        width: '1px',
        height: `${OG_CROSS_SPAN_PX}px`,
        backgroundColor: REGISTRATION,
      }),
    ],
    { device: 'device:registration-cross', instance: corner },
  );
}

/** The frame every card shares: four rails and their four crosses. */
function frame(content: CardNode): CardNode {
  return div(
    {
      position: 'relative',
      display: 'flex',
      width: '100%',
      height: '100%',
      backgroundColor: GROUND,
      fontFamily: DISPLAY,
    },
    [
      // One-pixel optical correction: the content box starts inside the
      // 1px rails rather than on them, so its rules meet the rails flush.
      div(
        {
          position: 'absolute',
          top: `${OG_FRAME_INSET_PX + 1}px`,
          right: `${OG_FRAME_INSET_PX + 1}px`,
          bottom: `${OG_FRAME_INSET_PX + 1}px`,
          left: `${OG_FRAME_INSET_PX + 1}px`,
          display: 'flex',
          flexDirection: 'column',
        },
        [content],
      ),
      ...EDGES.map(outerRail),
      ...CORNERS.map(registrationCross),
    ],
  );
}

const LABEL = {
  fontFamily: MONO,
  fontSize: '18px',
  // The registration-label tracking ratio (design-system §4.3, 0.08–0.14em).
  letterSpacing: '1.8px',
  color: DIM,
} as const;

function band(
  edge: 'header' | 'footer',
  children: CardNode[],
): CardNode {
  return div(
    {
      display: 'flex',
      flexShrink: 0,
      height: `${OG_BAND_HEIGHT_PX}px`,
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0px ${OG_TEXT_INSET_PX}px`,
      backgroundColor: GROUND,
      [edge === 'header' ? 'borderBottom' : 'borderTop']: `1px solid ${RULE}`,
    },
    children,
    { device: 'device:section-rule', instance: edge },
  );
}

// The body sizes from the frame, not from its content: a long title is
// wider than the measure, so the body starts from a zero basis, fills the
// space the bands leave and wraps the title inside it.
const BODY = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  flexGrow: 1,
  flexBasis: '0px',
  minHeight: '0px',
  minWidth: '0px',
  padding: `0px ${OG_TEXT_INSET_PX}px`,
} as const;

/* ------------------------------------------------------------------ */
/* Cards.                                                              */
/* ------------------------------------------------------------------ */

/**
 * Title size steps by length so every published title sets in at most
 * three lines inside the measure and stays legible in a small X timeline
 * preview; the smallest step is still the article-h1 display scale.
 */
export function titleFontSize(title: string): number {
  if (title.length > 34) return 64;
  if (title.length > 24) return 76;
  return 88;
}

/** Width the title wraps inside: the frame less both text insets. */
export const OG_TITLE_MEASURE_PX =
  1200 - 2 * (OG_FRAME_INSET_PX + 1) - 2 * OG_TEXT_INSET_PX;

/**
 * The article card: domain and review year in the header band, the title
 * as the dominant element on the open paper between the bands, and the
 * compact wordmark and the article's real reference count in the footer
 * band. All text passes sanitizeCardText.
 */
export function articleCardElement(input: CardArtworkInput): CardNode {
  const title = sanitizeCardText(input.entry.title);
  return frame(
    div({ display: 'flex', flexDirection: 'column', flexGrow: 1 }, [
      band('header', [
        div(LABEL, sanitizeCardText(input.domainName).toUpperCase(), {
          field: 'domain',
        }),
        div(LABEL, `REVIEWED ${input.reviewYear}`, { field: 'reviewYear' }),
      ]),
      div(BODY, [
        div(
          {
            fontSize: `${titleFontSize(title)}px`,
            lineHeight: 1.06,
            letterSpacing: '-0.5px',
            color: TEXT,
          },
          title,
          { field: 'title' },
        ),
      ]),
      band('footer', [
        div({ fontSize: '30px', color: TEXT }, PUBLIC_IDENTITY, {
          field: 'identity',
        }),
        div(LABEL, `${input.referenceCount} REFERENCES`, {
          field: 'referenceCount',
        }),
      ]),
    ]),
  );
}

/**
 * The site-level card shared by the non-article destinations: the dominant
 * wordmark on one line over the exact descriptor (the site OG/X lockup,
 * design-system §3.5). The descriptor is a full sentence, which §4.2 keeps
 * out of the display face, so it sets in IBM Plex Mono, the renderer's
 * other registered face. Its strings appear on no article card, so the
 * asset is byte-distinct from all of them (VAL-DIST-003) through its text
 * rather than ornament.
 */
export function siteCardElement(): CardNode {
  return frame(
    div(BODY, [
      div(
        {
          fontSize: '144px',
          lineHeight: 1,
          letterSpacing: '-1px',
          color: TEXT,
        },
        PUBLIC_IDENTITY,
        { field: 'identity' },
      ),
      div(
        {
          marginTop: '32px',
          fontFamily: MONO,
          fontSize: '28px',
          lineHeight: 1.4,
          color: DIM,
        },
        PUBLIC_DESCRIPTOR,
        { field: 'descriptor' },
      ),
    ]),
  );
}

/**
 * A glyph-probe tree: one assigned string in one registered stack, wrapped
 * inside a white canvas so every glyph is painted. Probes are rendered
 * through the same boundary as the shipped cards and never ship.
 */
export function glyphProbeElement(input: {
  text: string;
  stack: string;
  fontSize: number;
}): CardNode {
  return div(
    {
      display: 'flex',
      width: '100%',
      height: '100%',
      padding: '16px',
      backgroundColor: PROBE_GROUND,
    },
    [
      div(
        {
          fontFamily: input.stack,
          fontSize: `${input.fontSize}px`,
          lineHeight: 1.2,
          color: TEXT,
        },
        input.text,
      ),
    ],
  );
}
