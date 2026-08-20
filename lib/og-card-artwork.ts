/**
 * OG card artwork: pure builders for the satori element trees the card
 * generator renders (scripts/generate-og-cards.ts). No node-only imports
 * here so the geometry is unit-testable under Vitest.
 *
 * Design system: the site's "technical instrument" tokens (dark
 * near-black canvas, hairline borders, one locked amber accent, Geist
 * sans for titles, a mono face for readouts). Every article card carries
 * a derived instrument diagram, not a repeated canvas: the diagram
 * family and its geometry are seeded from a hash of the article's
 * domain/slug and its real metadata (reference count, review year), so
 * two articles never render the same picture and nothing on a card is
 * build state (AGENTS.md design rules 1 and 6: no progress counters, no
 * drafts).
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
  // inert for the relative diagram containers that rely on it.
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
/* Deterministic seeding: FNV-1a over domain/slug, mulberry32 stream.  */
/* Published slugs are unique, so every card's geometry seed differs.  */
/* ------------------------------------------------------------------ */

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 1));
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }
}

/* ------------------------------------------------------------------ */
/* Diagram families. Each is a small instrument drawn with flat        */
/* geometry (hairlines, dots, bars): no gradients, no glow, one amber  */
/* highlight per card (color-consistency lock).                        */
/* ------------------------------------------------------------------ */

type DiagramFamily =
  | 'signal'
  | 'scatter'
  | 'timeline'
  | 'intervals'
  | 'graph'
  | 'mosaic';

/** Which families suit which domain; the seed picks within the set. */
const DOMAIN_FAMILIES: Record<string, readonly DiagramFamily[]> = {
  manipulation: ['graph', 'signal', 'intervals'],
  'rl-sim2real': ['intervals', 'signal', 'mosaic'],
  'world-models': ['mosaic', 'scatter', 'graph'],
  'data-hardware': ['signal', 'scatter', 'mosaic'],
  classical: ['graph', 'signal', 'timeline'],
  frontier: ['timeline', 'scatter', 'intervals'],
  adjacent: ['scatter', 'timeline', 'mosaic'],
};

const ALL_FAMILIES: readonly DiagramFamily[] = [
  'signal',
  'scatter',
  'timeline',
  'intervals',
  'graph',
  'mosaic',
];

/** The diagram family a card uses (exported for tests). */
export function diagramFamilyFor(domain: string, slug: string): DiagramFamily {
  const families = DOMAIN_FAMILIES[domain] ?? ALL_FAMILIES;
  return families[hashString(`${domain}/${slug}`) % families.length];
}

const DIAGRAM_W = 304;
const DIAGRAM_H = 534;

function hairline(width: number): CardNode {
  return div({ width: `${width}px`, height: '1px', backgroundColor: BORDER });
}

function vline(height: number): CardNode {
  return div({ width: '1px', height: `${height}px`, backgroundColor: BORDER });
}

/** Bar spectrum: a seeded envelope plus jitter, one amber bar. */
function signalDiagram(rng: Rng): CardNode {
  const count = rng.int(13, 18);
  const gap = 3;
  const barW = Math.floor((DIAGRAM_W - (count - 1) * gap) / count);
  const envelope = rng.range(0.45, 0.8);
  const tilt = rng.range(-0.25, 0.25);
  const amberIndex = rng.int(Math.floor(count * 0.2), Math.floor(count * 0.8));
  const bars: CardNode[] = [];
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const phase = i / (count - 1);
    const value = Math.min(
      1,
      Math.max(0.16, envelope + tilt * (phase - 0.5) + (rng.next() - 0.5) * 0.4),
    );
    const height = Math.round(value * (DIAGRAM_H - 90));
    values.push(height);
    bars.push(
      div({
        width: `${barW}px`,
        height: `${height}px`,
        backgroundColor: i === amberIndex ? ACCENT : '#525c64',
      }),
    );
  }
  const maxBar = DIAGRAM_H - 90;
  const margined = bars.map((bar, i) => {
    const marginTop = Math.max(0, maxBar - values[i]);
    return marginTop > 0
      ? { type: bar.type, props: { style: { ...bar.props.style, marginTop: `${marginTop}px` }, children: undefined } }
      : bar;
  });
  return div({ display: 'flex', flexDirection: 'column' }, [
    div({ display: 'flex', gap: `${gap}px`, alignItems: 'flex-start' }, margined),
    div({ marginTop: '14px', display: 'flex' }, [hairline(DIAGRAM_W)]),
  ]);
}

/** Dot field over crosshair rules: one dot ringed in amber. */
function scatterDiagram(rng: Rng): CardNode {
  const count = rng.int(22, 34);
  const amber = rng.int(0, count - 1);
  const dots: CardNode[] = [];
  for (let i = 0; i < count; i++) {
    const size = rng.pick([5, 6, 8]);
    const x = rng.range(6, DIAGRAM_W - size - 6);
    const y = rng.range(6, DIAGRAM_H - size - 6);
    const isAmber = i === amber;
    dots.push(
      div(
        {
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '9999px',
          backgroundColor: isAmber ? ACCENT : '#5f6a72',
        },
      ),
    );
    if (isAmber) {
      dots.push(
        div({
          position: 'absolute',
          left: `${x - 9}px`,
          top: `${y - 9}px`,
          width: `${size + 18}px`,
          height: `${size + 18}px`,
          borderRadius: '9999px',
          border: `1px solid ${ACCENT}`,
        }),
      );
    }
  }
  return div({ position: 'relative', display: 'flex', width: `${DIAGRAM_W}px`, height: `${DIAGRAM_H}px` }, [
    div({ position: 'absolute', left: '0', top: `${Math.round(DIAGRAM_H * 0.62)}px`, display: 'flex' }, [
      hairline(DIAGRAM_W),
    ]),
    div({ position: 'absolute', left: `${Math.round(DIAGRAM_W * 0.34)}px`, top: '0', display: 'flex' }, [
      vline(DIAGRAM_H),
    ]),
    ...dots,
  ]);
}

/** Timeline: hairline axis, seeded event dots, one amber, a drift tail. */
function timelineDiagram(rng: Rng): CardNode {
  const count = rng.int(7, 11);
  const amber = rng.int(1, count - 2);
  const events: CardNode[] = [];
  let x = rng.range(10, 60);
  for (let i = 0; i < count; i++) {
    const size = i === amber ? 14 : rng.pick([6, 8, 10]);
    events.push(
      div({
        position: 'absolute',
        left: `${x - size / 2}px`,
        top: `${DIAGRAM_H / 2 - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '9999px',
        backgroundColor: i === amber ? ACCENT : '#5f6a72',
      }),
    );
    x += rng.range(22, 42);
  }
  return div(
    { position: 'relative', width: `${DIAGRAM_W}px`, height: `${DIAGRAM_H}px` },
    [
      div({ position: 'absolute', left: '0', top: `${DIAGRAM_H / 2}px`, display: 'flex' }, [hairline(DIAGRAM_W)]),
      ...events.slice(0, events.length - 1),
    ],
  );
}

/** Uncertainty intervals: stacked bars drifting around a center line. */
function intervalsDiagram(rng: Rng): CardNode {
  const count = rng.int(6, 9);
  const amber = rng.int(0, count - 1);
  const rows: CardNode[] = [];
  const rowH = Math.floor((DIAGRAM_H - 40) / count);
  const drift = rng.range(-0.2, 0.2);
  for (let i = 0; i < count; i++) {
    const phase = i / (count - 1);
    const center = DIAGRAM_W * (0.5 + drift * (phase - 0.5));
    const halfWidth = rng.range(40, 120) * (1 - 0.4 * phase);
    const left = Math.max(2, center - halfWidth);
    const width = Math.min(DIAGRAM_W - left - 2, halfWidth * 2);
    const isAmber = i === amber;
    rows.push(
      div(
        {
          display: 'flex',
          alignItems: 'center',
          height: `${rowH}px`,
        },
        [
          div({
            width: `${Math.round(width)}px`,
            height: isAmber ? '4px' : `${rng.pick([2, 3])}px`,
            marginLeft: `${Math.round(left)}px`,
            backgroundColor: isAmber ? ACCENT : '#5f6a72',
          }),
        ],
      ),
    );
  }
  return div({ display: 'flex', flexDirection: 'column', paddingTop: '20px' }, [
    ...rows,
    hairline(DIAGRAM_W),
  ]);
}

/** Node graph: seeded dots joined by hairline edges, one amber node. */
function graphDiagram(rng: Rng): CardNode {
  const nodes: Array<{ x: number; y: number }> = [];
  const count = rng.int(9, 13);
  for (let i = 0; i < count; i++) {
    nodes.push({
      x: rng.range(14, DIAGRAM_W - 14),
      y: rng.range(14, DIAGRAM_H - 14),
    });
  }
  const amber = rng.int(0, count - 1);
  const parts: CardNode[] = [];
  // Edges: each node (except a couple of leaves) links to its nearest
  // unvisited neighbour. Rendered as absolutely positioned 1px segments;
  // rotation is around the segment's own center (satori default), so the
  // geometry is computed from center + length + angle.
  for (let i = 0; i < count - 2; i++) {
    const a = nodes[i];
    const b = nodes[i + 1 + (i % 2)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    parts.push(
      div({
        position: 'absolute',
        left: `${Math.round(a.x + dx / 2 - len / 2)}px`,
        top: `${Math.round(a.y + dy / 2)}px`,
        width: `${Math.round(len)}px`,
        height: '1px',
        backgroundColor: '#414a51',
        transform: `rotate(${angle.toFixed(2)}deg)`,
      }),
    );
  }
  nodes.forEach((n, i) => {
    const size = i === amber ? 13 : rng.pick([5, 7, 9]);
    parts.push(
      div({
        position: 'absolute',
        left: `${n.x - size / 2}px`,
        top: `${n.y - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '9999px',
        backgroundColor: i === amber ? ACCENT : '#77828a',
      }),
    );
  });
  return div({ position: 'relative', display: 'flex', width: `${DIAGRAM_W}px`, height: `${DIAGRAM_H}px` }, parts);
}

/** Latent mosaic: cell grid with varied fills, one amber cell. */
function mosaicDiagram(rng: Rng): CardNode {
  const cols = rng.int(6, 8);
  const rows = rng.int(10, 13);
  const cell = Math.floor(Math.min((DIAGRAM_W - (cols - 1) * 3) / cols, 38));
  const amber = { c: rng.int(0, cols - 1), r: rng.int(0, rows - 1) };
  const cells: CardNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const roll = rng.next();
      const isAmber = c === amber.c && r === amber.r;
      const cellStyle: Record<string, unknown> = {
        width: `${cell}px`,
        height: `${cell}px`,
        borderRadius: '2px',
        backgroundColor: isAmber
          ? ACCENT
          : roll > 0.72
            ? '#2b3339'
            : roll > 0.4
              ? '#20262b'
              : '#171b1e',
      };
      if (roll > 0.85 && !isAmber) cellStyle.border = `1px solid ${BORDER}`;
      cells.push(div(cellStyle));
    }
  }
  return div({ display: 'flex', flexDirection: 'column', gap: '3px' }, [
    div({ display: 'flex', flexWrap: 'wrap', gap: '3px', width: `${DIAGRAM_W}px` }, cells),
  ]);
}

function diagramElement(family: DiagramFamily, rng: Rng): CardNode {
  switch (family) {
    case 'signal':
      return signalDiagram(rng);
    case 'scatter':
      return scatterDiagram(rng);
    case 'timeline':
      return timelineDiagram(rng);
    case 'intervals':
      return intervalsDiagram(rng);
    case 'graph':
      return graphDiagram(rng);
    case 'mosaic':
      return mosaicDiagram(rng);
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
 * and the article's real reference count, and the derived instrument
 * diagram in a bordered right panel. All text passes sanitizeCardText.
 */
export function articleCardElement(input: CardArtworkInput): CardNode {
  const seed = hashString(`${input.entry.domain}/${input.entry.slug}`);
  const rng = new Rng(seed);
  const family = diagramFamilyFor(input.entry.domain, input.entry.slug);
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
        [diagramElement(family, rng)],
      ),
    ],
  );
}

/**
 * The site-level card shared by the non-article destinations: the
 * wordmark as the dominant element, the site description, and a fixed
 * graph constellation in the right panel. A different canvas from every
 * article card, so the asset is byte-distinct by construction.
 */
export function siteCardElement(): CardNode {
  const rng = new Rng(0x52454e54); // fixed: one shared card, one geometry
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
        [graphDiagram(rng)],
      ),
    ],
  );
}
