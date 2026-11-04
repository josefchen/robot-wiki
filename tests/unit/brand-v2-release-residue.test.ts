import { describe, expect, it } from 'vitest';
import { expectedReleaseMetadata, metadataDifferences, NON_INDEXABLE_ROUTES, parseExportedMetadata, releasePublicRoutes, type ReleaseMetadata } from '../../lib/brand-v2-release-metadata';
import { readReleaseResidueRuntime, RELEASE_RESIDUE_VIEWPORTS, type ReleaseResidueRuntime } from '../../lib/brand-v2-release-residue-runtime';
import { ASSERTION_POPULATION_SOURCES, legacyAcceptanceRestrictions, normalizedPaints, residueSvgSemanticHash, sourcePaintReading } from '../../lib/brand-v2-release-residue';
const fingerprint = 'a'.repeat(64);
function runtime(): ReleaseResidueRuntime {
  const routes = ['/', '/404/'];
  return {
    version: 1,
    fingerprint,
    routes,
    observations: routes.flatMap(route => RELEASE_RESIDUE_VIEWPORTS.map(size => ({
      route,
      viewport: size.width + 'x' + size.height,
      status: route === '/404/' ? 404 : 200,
      elementCount: 30,
      texts: [{
        selector: 'h1',
        kind: 'visible',
        value: 'Robot Wiki',
        technicalContext: false
      }],
      rawPaints: [],
      computedPaints: {
        'rgb(28, 28, 26)': 30
      },
      resources: ['http://localhost:3000/_next/static/media/font.woff2'],
      fonts: ['http://localhost:3000/_next/static/media/font.woff2'],
      displayFaces: [{
        selector: 'h1',
        family: 'DM Sans',
        text: 'Robot Wiki'
      }],
      effects: [],
      assets: [],
      logos: [],
      iconDeclarations: ['icon=/icon.svg']
    })))
  };
}
const expected: ReleaseMetadata = {
  title: 'Example | Robot Wiki',
  canonical: 'https://robot-wiki.com/example/',
  description: 'Source-grounded example.',
  social: {
    'og:title': ['Example'],
    'og:site_name': ['Robot Wiki'],
    'twitter:title': ['Example']
  },
  jsonLd: [{
    '@type': 'WebPage',
    name: 'Example'
  }],
  manifest: [],
  icons: [{
    rel: 'icon',
    href: '/icon.svg'
  }],
  themeColour: [],
  noindex: false
};
const html = '<html><head><title>Example | Robot Wiki</title><link rel="canonical" href="https://robot-wiki.com/example/"><meta name="description" content="Source-grounded example."><meta property="og:title" content="Example"><meta property="og:site_name" content="Robot Wiki"><meta name="twitter:title" content="Example"><link rel="icon" href="/icon.svg?contenthash"><meta name="robots" content="index, follow"></head><body><script type="application/ld+json">{"@type":"WebPage","name":"Example"}</script></body></html>';
describe('release metadata agreement', () => {
  it('compares exported values including all social keys and full JSON-LD content', () => {
    expect(metadataDifferences(expected, parseExportedMetadata(html))).toEqual([]);
    const changed = parseExportedMetadata(html);
    changed.jsonLd = [{
      '@type': 'WebPage',
      name: 'Unrelated page'
    }];
    expect(metadataDifferences(expected, changed)).toContain('metadata field differs: jsonLd');
  });
  it.each([['canonical', (m: ReleaseMetadata) => {
    m.canonical = 'https://elsewhere.test/';
  }], ['title', (m: ReleaseMetadata) => {
    m.title = 'Old title';
  }], ['description', (m: ReleaseMetadata) => {
    m.description = 'Old description';
  }], ['social', (m: ReleaseMetadata) => {
    m.social['og:title'] = ['Wrong page'];
  }], ['social', (m: ReleaseMetadata) => {
    m.social['twitter:site'] = ['Unexpected owner'];
  }], ['icons', (m: ReleaseMetadata) => {
    m.icons.push({
      rel: 'mask-icon',
      href: '/invented.svg'
    });
  }], ['manifest', (m: ReleaseMetadata) => {
    m.manifest = ['/unexpected.webmanifest'];
  }], ['themeColour', (m: ReleaseMetadata) => {
    m.themeColour = ['#245edb'];
  }], ['noindex', (m: ReleaseMetadata) => {
    m.noindex = true;
  }]] as const)('rejects planted %s drift', (field, mutate) => {
    const changed = structuredClone(expected);
    mutate(changed);
    expect(metadataDifferences(expected, changed)).toContain('metadata field differs: ' + field);
  });
  it('refuses duplicate title/canonical/description declarations', () => {
    for (const extra of ['<title>Hidden alternative</title>', '<link rel="canonical" href="https://elsewhere.test/">', '<meta name="description" content="duplicate">']) expect(() => parseExportedMetadata(html.replace('</head>', extra + '</head>'))).toThrow(/exactly one/);
  });
  it('keeps SVG accessibility titles separate from the HTML document title', () => {
    const graphics = '<svg><title>Chart description</title><rect><title>First measured dimension</title></rect></svg>';
    expect(metadataDifferences(expected, parseExportedMetadata(html.replace('</body>', graphics + '</body>')))).toEqual([]);
  });
  it.each([
    ['missing', html.replace('<title>Example | Robot Wiki</title>', '')],
    ['SVG-only', html.replace('<title>Example | Robot Wiki</title>', '').replace('</body>', '<svg><title>Example | Robot Wiki</title></svg></body>')],
    ['body-only', html.replace('<title>Example | Robot Wiki</title>', '').replace('</body>', '<title>Example | Robot Wiki</title></body>')],
    ['duplicate in body', html.replace('</body>', '<title>Hidden alternative</title></body>')],
    ['HTML title in SVG foreignObject', html.replace('</body>', '<svg><foreignObject><title>Hidden HTML alternative</title></foreignObject></svg></body>')],
  ])('refuses a %s HTML document title', (_placement, input) => {
    expect(() => parseExportedMetadata(input)).toThrow(/exactly one HTML title in head/);
  });
  it('refuses missing or contradictory robots policies', () => {
    expect(() => parseExportedMetadata(html.replace('<meta name="robots" content="index, follow">', ''))).toThrow(/robots policy/);
    expect(() => parseExportedMetadata(html.replace('</head>', '<meta name="robots" content="noindex"></head>'))).toThrow(/robots policy/);
  });
  it('rejects malformed JSON-LD rather than silently reducing the expected population', () => {
    expect(() => parseExportedMetadata(html.replace('"name":"Example"', '"name":'))).toThrow();
  });
  it('derives 75 public and 73 indexable destinations, with 404 kept outside both', () => {
    const routes = releasePublicRoutes();
    expect(routes).toHaveLength(75);
    expect(new Set(routes).size).toBe(75);
    expect(routes).not.toContain('/404/');
    expect(routes.filter(r => !(NON_INDEXABLE_ROUTES as readonly string[]).includes(r))).toHaveLength(73);
    for (const route of ['/privacy/', '/search/', '/404/']) expect(expectedReleaseMetadata(process.cwd(), route).noindex).toBe(true);
    expect(expectedReleaseMetadata(process.cwd(), '/adjacent/drones/').noindex).toBe(false);
  });
  it('derives article source citations and complete social fields from source owners', () => {
    const result = expectedReleaseMetadata(process.cwd(), '/adjacent/drones/');
    expect(result.social['og:site_name']).toEqual(['Robot Wiki']);
    expect(result.social['twitter:image:width']).toEqual(['1200']);
    expect(result.social['article:modified_time'][0]).toMatch(/^20\d\d-\d\d-\d\d/);
    const article = result.jsonLd.find(x => (x as Record<string, unknown>)['@type'] === 'Article') as Record<string, unknown>;
    expect(article.citation).toBeInstanceOf(Array);
    expect((article.citation as unknown[]).length).toBeGreaterThanOrEqual(30);
    expect(() => expectedReleaseMetadata(process.cwd(), '/unregistered/')).toThrow(/Unknown metadata route/);
  });
});
describe('release residue evidence completeness', () => {
  const read = (artifact: unknown) => readReleaseResidueRuntime({
    artifact,
    fingerprint,
    routes: ['/', '/404/']
  });
  it('accepts a complete observation matrix without inventing a pass field', () => {
    expect(read(runtime()).observations).toHaveLength(4);
  });
  it.each(['missing', 'duplicate', 'extra', 'stale', 'empty-body', 'empty-fonts', 'empty-paints', 'empty-headings', 'unrendered', 'wrong-route'] as const)('refuses %s evidence', mutation => {
    const x = runtime();
    if (mutation === 'missing') x.observations.pop();
    if (mutation === 'duplicate') x.observations[1] = structuredClone(x.observations[0]);
    if (mutation === 'extra') x.observations.push({
      ...x.observations[0],
      route: '/rogue/'
    });
    if (mutation === 'stale') x.fingerprint = 'b'.repeat(64);
    if (mutation === 'empty-body') x.observations[0].elementCount = 0;
    if (mutation === 'empty-fonts') x.observations[0].fonts = [];
    if (mutation === 'empty-paints') x.observations[0].computedPaints = {};
    if (mutation === 'empty-headings') x.observations[0].displayFaces = [];
    if (mutation === 'unrendered') x.observations[0].status = 500;
    if (mutation === 'wrong-route') x.routes = ['/', '/unknown/'];
    expect(() => read(x)).toThrow();
  });
  it('exposes all 18 assigned assertions through explicit population sources', () => {
    expect(Object.keys(ASSERTION_POPULATION_SOURCES)).toHaveLength(18);
    for (const suffix of ['007', '008', '009']) expect(ASSERTION_POPULATION_SOURCES['VAL-B2-CONT-' + suffix]).toBeTruthy();
    for (let n = 1; n <= 10; n++) expect(ASSERTION_POPULATION_SOURCES['VAL-B2-RES-' + String(n).padStart(3, '0')]).toBeTruthy();
  });
});
describe('residue normalization and active acceptance scanning', () => {
  it.each(['#245edb', '#245EDB', '#245edb99', '0x245edb', 'rgb(36,94,219)', 'rgba(36,94,219,0.5)', 'rgb(36 94 219 / 30%)', 'rgb(14.117647% 36.862745% 85.882353%)', 'hsl(221,72%,50%)', 'hsl(221 72% 50%)', 'color(srgb 0.14117647 0.36862745 0.85882353)', 'new Color(0.01764195,0.1119324,0.7083758)'])('normalizes %s to the same retired paint', input => {
    expect(normalizedPaints(input)).toEqual(['#245edb']);
  });
  it('keeps current figure accent separate and refuses an unsupported colour space', () => {
    expect(normalizedPaints('#3B6EA8')).toEqual(['#3b6ea8']);
    expect(normalizedPaints('color(display-p3 .2 .3 .4)')[0]).toMatch(/^unparsed:/);
  });
  it('scopes classifier vocabulary to one exact context and still catches renderer paint in that same file', () => {
    const classifier = "const RESERVED_HEX = new Map([\n  ['#245fff', 'signal'],\n]);";
    expect(sourcePaintReading('lib/figure-system-paint.ts', classifier).paints).toEqual([]);
    expect(sourcePaintReading('lib/figure-system-paint.ts', classifier + "\nexport const rendererFill = '#245fff';").paints).toEqual(['#245fff']);
    expect(() => sourcePaintReading('lib/figure-system-paint.ts', '')).toThrow(/Stale source-literal context/);
  });
  it('uses the registry semantic hash convention while retaining SVG geometry', () => {
    const svg = '<svg><path d="M0 0L10 10" fill="black"/></svg>';
    expect(residueSvgSemanticHash(svg)).toBe(residueSvgSemanticHash(svg.replace('black', 'blue')));
    expect(residueSvgSemanticHash(svg)).not.toBe(residueSvgSemanticHash(svg.replace('L10 10', 'L20 20')));
  });
  it('ignores superseded comments while detecting an active restriction string', () => {
    const rule = ['home', 'only grid'].join('-');
    expect(legacyAcceptanceRestrictions('// superseded: ' + rule + '\nexpect(currentGrid).toBeDefined();')).toEqual([]);
    expect(legacyAcceptanceRestrictions('test("' + rule + '",()=>expect(outsideHome).toEqual([]));')).toHaveLength(1);
  });
});
