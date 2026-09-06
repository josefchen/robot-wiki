import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  censusOutboundAnchors,
  exportedRoutes,
  isOutboundHref,
  linkSafetyRouteMembers,
  linkSafetyRouteMembersFromArtifact,
  readLinkSafetyEvidence,
  type OutboundAnchor,
} from '@/lib/brand-v2-link-safety';

/**
 * The outbound-link half of `VAL-B2-BASE-007`, exercised on a census small
 * enough to state.
 *
 * The cases that matter most are the ones where the artifact says the site
 * is fine and it is not: the byte half is re-derived from the export on
 * every read, so a recorded `anchorsWithoutNoopener: 0` must not be able to
 * carry a census that ships an unsafe anchor.
 */

const FINGERPRINT = 'a'.repeat(64);

function anchor(overrides: Partial<OutboundAnchor> = {}): OutboundAnchor {
  return {
    route: '/manipulation/vla-models/',
    href: 'https://arxiv.org/abs/2406.09246',
    rel: 'noopener noreferrer',
    target: '_blank',
    tabindex: null,
    shape: 'citation-chip',
    ...overrides,
  };
}

const CENSUS: OutboundAnchor[] = [
  anchor(),
  anchor({ href: 'https://arxiv.org/abs/2410.24164', shape: 'reference-entry' }),
  anchor({ route: '/credits/', href: 'https://fonts.google.com/', shape: 'footer' }),
];

const EXPORTED = ['/', '/credits/', '/manipulation/vla-models/'];

function artifactFor(census: readonly OutboundAnchor[], overrides: Record<string, unknown> = {}) {
  const routes = [...new Set(census.map(({ route }) => route))].sort();
  return {
    schemaVersion: 2,
    assertionId: 'VAL-B2-BASE-007',
    fingerprint: FINGERPRINT,
    source: 'out/',
    routes: routes.map((route) => {
      const anchors = census.filter((entry) => entry.route === route);
      return {
        route,
        outboundAnchors: anchors.length,
        distinctHrefs: new Set(anchors.map(({ href }) => href)).size,
        shapes: [...new Set(anchors.map(({ shape }) => shape))].sort(),
      };
    }),
    routesSwept: EXPORTED.length,
    outboundAnchors: census.length,
    distinctOutboundHrefs: new Set(census.map(({ href }) => href)).size,
    anchorsByShape: { 'citation-chip': 1, 'reference-entry': 1, footer: 1 },
    anchorsWithoutNoopener: 0,
    anchorsWithNoreferrer: census.length,
    keyboard: routes.map((route) => {
      const anchors = census.filter((entry) => entry.route === route);
      const distinct = new Set(anchors.map(({ href }) => href)).size;
      return {
        route,
        outboundInDom: distinct,
        reachedByTab: distinct,
        unreached: [] as string[],
        withoutFocusIndicator: [] as string[],
        tabStops: 12,
      };
    }),
    ...overrides,
  };
}

function read(
  census: readonly OutboundAnchor[],
  artifact: unknown = artifactFor(census),
) {
  return readLinkSafetyEvidence({
    artifact,
    census,
    exportedRoutes: EXPORTED,
    fingerprint: FINGERPRINT,
  });
}

describe('brand-v2 outbound link safety', () => {
  it('tells an outbound href from a first-party or relative one', () => {
    expect(isOutboundHref('https://arxiv.org/abs/2406.09246')).toBe(true);
    expect(isOutboundHref('https://robot-wiki.com/a-z/')).toBe(false);
    expect(isOutboundHref('/manipulation/')).toBe(false);
    expect(isOutboundHref('mailto:hello@example.com')).toBe(false);
  });

  it('censuses the export and names the surface each anchor came from', () => {
    const root = mkdtempSync(join(tmpdir(), 'link-safety-'));
    mkdirSync(join(root, 'manipulation', 'vla-models'), { recursive: true });
    writeFileSync(
      join(root, 'manipulation', 'vla-models', 'index.html'),
      [
        '<html><body>',
        '<span data-cite-id="rt2"><span><a href="https://arxiv.org/abs/2307.15818" rel="noopener noreferrer">RT-2</a></span></span>',
        '<figure><img src="/x.png"><figcaption><a href="https://example.org/photo" rel="noopener">Credit</a></figcaption></figure>',
        '<ol><li id="ref-rt2"><a href="https://arxiv.org/abs/2307.15818" rel="noopener noreferrer">RT-2 paper</a></li></ol>',
        '<a href="/a-z/">Index</a>',
        '<footer><a href="https://github.com/example" rel="noopener">Source</a></footer>',
        '</body></html>',
      ].join('\n'),
    );
    expect(exportedRoutes(root)).toEqual(['/manipulation/vla-models/']);
    const census = censusOutboundAnchors(root);
    expect(census.map(({ shape }) => shape)).toEqual([
      'citation-chip',
      'figure-credit',
      'reference-entry',
      'footer',
    ]);
    expect(census.every(({ href }) => href.startsWith('https://'))).toBe(true);
  });

  it('returns a verdict per route carrying an outbound link', () => {
    const evidence = read(CENSUS);
    expect(linkSafetyRouteMembers(CENSUS)).toEqual([
      'link-safety:/credits/',
      'link-safety:/manipulation/vla-models/',
    ]);
    expect(evidence.routes.map(({ id }) => id)).toEqual(
      linkSafetyRouteMembers(CENSUS),
    );
    expect(evidence.anchors).toBe(3);
    expect(evidence.anchorsWithoutNoopener).toBe(0);
    expect(
      evidence.routes.find((route) => route.route === '/credits/'),
    ).toMatchObject({ reachedByTab: 1, tabStops: 12 });
  });

  it('derives the same population from the artifact as from the export', () => {
    expect(linkSafetyRouteMembersFromArtifact(artifactFor(CENSUS))).toEqual(
      linkSafetyRouteMembers(CENSUS),
    );
  });

  it('refuses a trace taken against a different export', () => {
    expect(() =>
      readLinkSafetyEvidence({
        artifact: artifactFor(CENSUS),
        census: CENSUS,
        exportedRoutes: EXPORTED,
        fingerprint: 'b'.repeat(64),
      }),
    ).toThrow(/link-safety evidence is stale/);
  });

  it('refuses an unsafe anchor even when the artifact recorded none', () => {
    const census = [...CENSUS, anchor({ href: 'https://x.test/', rel: null })];
    expect(() =>
      read(census, artifactFor(census, { anchorsWithoutNoopener: 0 })),
    ).toThrow(/1 outbound anchor\(s\) ship without rel="noopener"/);
  });

  it('refuses an outbound anchor markup has removed from the tab order', () => {
    const census = [...CENSUS, anchor({ href: 'https://x.test/', tabindex: '-1' })];
    expect(() => read(census)).toThrow(/removed from the tab order/);
  });

  it('refuses a route whose recorded anchor count is not what ships', () => {
    const artifact = artifactFor(CENSUS);
    artifact.routes[0].outboundAnchors += 1;
    expect(() => read(CENSUS, artifact)).toThrow(
      /records \/credits\/ with 2 outbound anchor\(s\)/,
    );
  });

  it('refuses totals that disagree with the export', () => {
    expect(() =>
      read(CENSUS, artifactFor(CENSUS, { outboundAnchors: 99 })),
    ).toThrow(/counted 99 outbound anchors and the export carries 3/);
    expect(() => read(CENSUS, artifactFor(CENSUS, { routesSwept: 2 }))).toThrow(
      /swept 2 routes and the export carries 3/,
    );
  });

  it('refuses a walked route that reached only some of its links', () => {
    const artifact = artifactFor(CENSUS);
    artifact.keyboard[0].unreached = ['https://fonts.google.com/'];
    expect(() => read(CENSUS, artifact)).toThrow(
      /outbound anchor occurrences the Tab key never reached/,
    );
  });

  it('refuses a focused link with no visible focus ring', () => {
    const artifact = artifactFor(CENSUS);
    artifact.keyboard[0].withoutFocusIndicator = ['https://fonts.google.com/'];
    expect(() => read(CENSUS, artifact)).toThrow(/no visible focus indicator/);
  });

  it('refuses a route carrying outbound links that the Tab key never walked', () => {
    // The trace used to walk four hand-picked routes and let a shape proven
    // on one stand in for every other route rendering that shape.
    const artifact = artifactFor(CENSUS);
    artifact.keyboard = artifact.keyboard.filter(
      ({ route }) => route !== '/manipulation/vla-models/',
    );
    expect(() => read(CENSUS, artifact)).toThrow(
      /1 route\(s\) carrying outbound links were never walked with the Tab key, so their reachability is measured by nothing: \/manipulation\/vla-models\//,
    );
  });

  it('refuses a partial walk even when the unwalked route renders a shape another walked route carries', () => {
    const census = [
      ...CENSUS,
      // Same shape as the walked /credits/ footer link, different route.
      anchor({ route: '/a-z/', href: 'https://x.test/', shape: 'footer' }),
    ];
    const artifact = artifactFor(census);
    artifact.keyboard = artifact.keyboard.filter(
      ({ route }) => route !== '/a-z/',
    );
    expect(() => read(census, artifact)).toThrow(
      /never walked with the Tab key/,
    );
  });

  it('refuses a keyboard trace that walks the same route twice', () => {
    const artifact = artifactFor(CENSUS);
    artifact.keyboard = [artifact.keyboard[0], artifact.keyboard[0]];
    expect(() => read(CENSUS, artifact)).toThrow(/walks the same route twice/);
  });

  it('refuses an empty census rather than passing over nothing', () => {
    expect(() => read([], artifactFor(CENSUS))).toThrow(/empty census/);
  });
});
