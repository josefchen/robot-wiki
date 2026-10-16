// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  OG_ASSERTION_MODES,
  OG_ASSERTION_POPULATION_SOURCES,
  OG_ROUTE_POPULATION_SOURCE,
  cardMemberId,
  ogAssertionVerdict,
  ogPopulations,
  readOgEvidence,
  routeCardMeta,
  treeMemberId,
  type OgEvidence,
  type OgRegistryRoute,
} from '@/lib/brand-v2-og-evidence';
import { PUBLIC_DESCRIPTOR } from '@/lib/identity';
import { OG_CARD_MANIFEST_PATH, type ManifestCard, type OgCardManifest } from '@/lib/og-card-manifest';
import { OG_PUBLICATION_TREES } from '@/lib/og-card-publication';

/**
 * VAL-B2-ID-009 and VAL-B2-OG-001 through VAL-B2-OG-015, as the enforcement
 * map decides them: the reader refuses evidence the current tree, the
 * shipped bytes or the export no longer bear out, and each row's verdict
 * fails the member a planted defect breaks. Plants are made on copies of
 * the evidence; nothing on disk is touched.
 */
const ROOT = process.cwd();
const REGISTRY = JSON.parse(readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8')) as {
  routes: { public: OgRegistryRoute[] };
};
const ROUTES: OgRegistryRoute[] = REGISTRY.routes.public.map(({ id, path, routeKind }) => ({ id, path, routeKind }));
const EVIDENCE = readOgEvidence({ root: ROOT, routes: ROUTES });

const SITE = cardMemberId('site');
const CONTROL = 'classical/control';
const CONTROL_ROUTE = '/classical/control/';
const DESTINATION_ROUTE = '/a-z/';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function recordedManifest(): OgCardManifest {
  return JSON.parse(readFileSync(join(ROOT, OG_CARD_MANIFEST_PATH), 'utf8')) as OgCardManifest;
}

function routeId(path: string): string {
  const route = ROUTES.find((candidate) => candidate.path === path);
  if (!route) throw new Error(`${path} is not a public route`);
  return route.id;
}

/** A copy of the evidence a plant can change without reaching the next case. */
function planted(change: (evidence: OgEvidence) => void): OgEvidence {
  const copy: OgEvidence = {
    ...EVIDENCE,
    matrix: structuredClone(EVIDENCE.matrix),
    manifest: structuredClone(EVIDENCE.manifest),
    journal: structuredClone(EVIDENCE.journal),
    routes: structuredClone(EVIDENCE.routes),
    routeMeta: new Map([...EVIDENCE.routeMeta].map(([id, meta]) => [id, structuredClone(meta)])),
    probes: structuredClone(EVIDENCE.probes),
    shipped: new Map(EVIDENCE.shipped),
    faceSha256: new Map(EVIDENCE.faceSha256),
  };
  change(copy);
  return copy;
}

function card(evidence: OgEvidence, cardId: string): ManifestCard {
  const found = evidence.manifest.cards.find((candidate) => candidate.cardId === cardId);
  if (!found) throw new Error(`${cardId} is not recorded`);
  return found;
}

/** The route's exported head with one edit, which has to change something. */
function withHead(evidence: OgEvidence, path: string, edit: (html: string) => string): void {
  const htmlPath = `out${path}index.html`;
  const html = readFileSync(join(ROOT, htmlPath), 'utf8');
  const edited = edit(html);
  if (edited === html) throw new Error(`the plant left ${htmlPath} unchanged`);
  evidence.routeMeta.set(routeId(path), routeCardMeta(path, htmlPath, edited));
}

function metaContent(html: string, key: string, content: string): string {
  return html.replace(new RegExp(`(<meta (?:property|name)="${key}" content=")[^"]*(")`, 'g'), `$1${content}$2`);
}

describe('Open Graph corpus evidence', { timeout: 60_000 }, () => {
  it('decides every row for every member of its population over the published corpus', () => {
    const populations: Record<string, string[]> = {
      ...ogPopulations(EVIDENCE),
      [OG_ROUTE_POPULATION_SOURCE]: ROUTES.map(({ id }) => id),
    };
    expect(EVIDENCE.matrix.rows).toHaveLength(58);
    const sizes = Object.fromEntries(
      Object.entries(OG_ASSERTION_POPULATION_SOURCES).map(([id, source]) => [id, populations[source]?.length ?? 0]),
    );
    expect(sizes).toMatchObject({
      'VAL-B2-ID-009': 58,
      'VAL-B2-OG-001': 58,
      'VAL-B2-OG-003': 1,
      'VAL-B2-OG-004': 57,
      'VAL-B2-OG-006': EVIDENCE.matrix.siteDestinations.length,
      'VAL-B2-OG-009': ROUTES.length,
      'VAL-B2-OG-012': EVIDENCE.manifest.glyphProbes.length,
      'VAL-B2-OG-013': OG_PUBLICATION_TREES.length,
    });

    for (const [id, source] of Object.entries(OG_ASSERTION_POPULATION_SOURCES)) {
      for (const member of populations[source]) {
        const { actual, payload } = ogAssertionVerdict(EVIDENCE, id, member);
        expect(actual.length).toBeGreaterThan(0);
        expect(payload.kind).toBe(OG_ASSERTION_MODES[id] === 'generated-image' ? 'generated-image' : 'source-build');
        if (payload.kind === 'generated-image') {
          expect(payload).toMatchObject({ width: 1200, height: 630 });
          expect(payload.sha256).toBe(sha256(readFileSync(join(ROOT, payload.imagePath))));
        }
      }
    }
  });

  it('refuses a recorded manifest the current tree and shipped bytes no longer rebuild', () => {
    const stale = recordedManifest();
    const title = stale.cards.find(({ cardId }) => cardId === CONTROL)?.strings.find(({ field }) => field === 'title');
    if (!title) throw new Error('the control card records no title');
    title.text = `${title.text} Revisited`;
    expect(() => readOgEvidence({ root: ROOT, routes: ROUTES, manifest: stale })).toThrow(
      `${CONTROL}: the recorded card is not the one the current tree and shipped bytes rebuild`,
    );

    const rehashed = recordedManifest();
    rehashed.corpusSha256 = '0'.repeat(64);
    expect(() => readOgEvidence({ root: ROOT, routes: ROUTES, manifest: rehashed })).toThrow(
      /the shipped corpus hashes to [0-9a-f]{64}; the manifest recorded 0{64}/,
    );
  });

  it('refuses a recorded pixel reading that decoding the shipped card does not reproduce', () => {
    const manifest = recordedManifest();
    const pixels = manifest.cards.find(({ cardId }) => cardId === 'site')?.pixels;
    if (!pixels) throw new Error('the site card records no pixels');
    pixels.inkPixels.identity += 1;
    expect(() => readOgEvidence({ root: ROOT, routes: ROUTES, manifest })).toThrow(
      'site: the recorded pixel reading is not what decoding the shipped card reads',
    );
  });

  it('refuses a destination set that is not the sealed one and a route the export lacks', () => {
    const routes = [
      ...ROUTES.filter(({ path }) => path !== DESTINATION_ROUTE),
      { id: 'route:/never-exported/', path: '/never-exported/', routeKind: 'article' as const },
    ];
    const read = () => readOgEvidence({ root: ROOT, routes });
    expect(read).toThrow(`sealed site-card destination ${DESTINATION_ROUTE} is not a registry destination`);
    expect(read).toThrow('out/never-exported/index.html is not exported');
  });
});

describe('Open Graph row verdicts', { timeout: 60_000 }, () => {
  it('VAL-B2-ID-009 fails an article card that paints the descriptor and a site card that paints another identity', () => {
    const id = 'VAL-B2-ID-009';
    expect(() => ogAssertionVerdict(EVIDENCE, id, cardMemberId(CONTROL))).not.toThrow();
    const descriptor = planted((evidence) => {
      const article = card(evidence, CONTROL);
      const identity = article.strings.find(({ field }) => field === 'identity');
      if (!identity) throw new Error('no identity string');
      article.strings.push({ ...identity, field: 'descriptor', text: PUBLIC_DESCRIPTOR });
    });
    expect(() => ogAssertionVerdict(descriptor, id, cardMemberId(CONTROL))).toThrow('an article card paints the descriptor');
    const renamed = planted((evidence) => {
      const identity = card(evidence, 'site').strings.find(({ field }) => field === 'identity');
      if (!identity) throw new Error('no identity string');
      identity.text = 'ROBOT WIKI';
    });
    expect(() => ogAssertionVerdict(renamed, id, SITE)).toThrow('paints identity [ROBOT WIKI]');
  });

  it('VAL-B2-OG-001 fails a sealed card the corpus does not ship and a structured image inside the OG/X corpus', () => {
    const id = 'VAL-B2-OG-001';
    const unshipped = planted((evidence) => {
      evidence.matrix.rows.push({ row: 59, routeOwner: '/classical/unshipped/', assetPath: '/og/classical/unshipped.png', cardId: 'classical/unshipped' });
    });
    expect(() => ogAssertionVerdict(unshipped, id, SITE)).toThrow('public/og holds 58 files, not exactly the 59 sealed cards');
    const inside = planted((evidence) => {
      card(evidence, CONTROL).structuredVariants[0].path = '/og/classical/control-4x3.png';
    });
    expect(() => ogAssertionVerdict(inside, id, SITE)).toThrow('a structured image ships inside the OG/X corpus');
  });

  it('VAL-B2-OG-002 fails a card that decodes to another size and one under 5KB, each unlike its export copy', () => {
    const id = 'VAL-B2-OG-002';
    const path = card(EVIDENCE, CONTROL).asset.path;
    const resized = planted((evidence) => {
      const variant = card(evidence, CONTROL).structuredVariants.find(({ height }) => height === 900);
      if (!variant) throw new Error('no 4:3 variant');
      evidence.shipped.set(path, evidence.shipped.get(variant.path) as Buffer);
    });
    expect(() => ogAssertionVerdict(resized, id, cardMemberId(CONTROL))).toThrow(/decodes to 1200x900; has aspect ratio 1\.333.*is not the same bytes/);
    const truncated = planted((evidence) => {
      evidence.shipped.set(path, (evidence.shipped.get(path) as Buffer).subarray(0, 4096));
    });
    expect(() => ogAssertionVerdict(truncated, id, cardMemberId(CONTROL))).toThrow(/is 4096 bytes, under 5KB; out\/og\/classical\/control\.png is not the same bytes/);
  });

  it('VAL-B2-OG-003 fails a site card that paints a descriptor variant', () => {
    const variant = planted((evidence) => {
      const descriptor = card(evidence, 'site').strings.find(({ field }) => field === 'descriptor');
      if (!descriptor) throw new Error('no descriptor string');
      descriptor.text = 'Robotics encyclopaedia';
    });
    expect(() => ogAssertionVerdict(variant, 'VAL-B2-OG-003', SITE)).toThrow('paints [descriptor=Robotics encyclopaedia; identity=Robot Wiki]');
  });

  it('VAL-B2-OG-004 fails an article card whose painted fact differs from its frontmatter', () => {
    const miscounted = planted((evidence) => {
      const count = card(evidence, CONTROL).strings.find(({ field }) => field === 'referenceCount');
      if (!count) throw new Error('no reference count');
      count.text = `${Number.parseInt(count.text, 10) + 1} REFERENCES`;
    });
    expect(() => ogAssertionVerdict(miscounted, 'VAL-B2-OG-004', cardMemberId(CONTROL))).toThrow('its sources derive');
  });

  it('VAL-B2-OG-005 fails an article route that points at the site card and an article card that repeats the bytes of another', () => {
    const id = 'VAL-B2-OG-005';
    const shared = planted((evidence) => {
      withHead(evidence, CONTROL_ROUTE, (html) =>
        metaContent(metaContent(html, 'og:image', 'https://robot-wiki.com/og/robot-wiki.png'), 'twitter:image', 'https://robot-wiki.com/og/robot-wiki.png'),
      );
    });
    expect(() => ogAssertionVerdict(shared, id, cardMemberId(CONTROL))).toThrow(
      `${CONTROL_ROUTE} declares og:image [https://robot-wiki.com/og/robot-wiki.png]`,
    );
    const other = EVIDENCE.manifest.cards.find(({ kind, cardId }) => kind === 'article' && cardId !== CONTROL) as ManifestCard;
    const repeated = planted((evidence) => {
      evidence.shipped.set(card(evidence, CONTROL).asset.path, evidence.shipped.get(other.asset.path) as Buffer);
    });
    expect(() => ogAssertionVerdict(repeated, id, cardMemberId(CONTROL))).toThrow(`is byte-identical to ${other.cardId}`);
  });

  it('VAL-B2-OG-006 fails a destination that declares an article card', () => {
    const member = routeId(DESTINATION_ROUTE);
    expect(() => ogAssertionVerdict(EVIDENCE, 'VAL-B2-OG-006', member)).not.toThrow();
    const article = planted((evidence) => {
      withHead(evidence, DESTINATION_ROUTE, (html) => metaContent(html, 'og:image', 'https://robot-wiki.com/og/classical/control.png'));
    });
    expect(() => ogAssertionVerdict(article, 'VAL-B2-OG-006', member)).toThrow(
      'declares og:image [https://robot-wiki.com/og/classical/control.png]',
    );
  });

  it('VAL-B2-OG-007 fails a display face off its checksum, a token whose renderer and runtime differ, and an off-palette decode', () => {
    const id = 'VAL-B2-OG-007';
    const face = planted((evidence) => {
      evidence.faceSha256.set('og-face:display', '0'.repeat(64));
    });
    expect(() => ogAssertionVerdict(face, id, SITE)).toThrow(/the display face \S+ hashes to 0{64}, not the registered/);
    const token = planted((evidence) => {
      const ink = evidence.manifest.styleTokens.find((entry) => entry.token === 'ink');
      if (!ink) throw new Error('no ink token');
      ink.renderer = '#000000';
    });
    expect(() => ogAssertionVerdict(token, id, SITE)).toThrow('ink differs between renderer and runtime');
    const decoded = planted((evidence) => {
      const pixels = card(evidence, 'site').pixels;
      if (!pixels) throw new Error('no pixels');
      pixels.offPalettePixels = 12;
      pixels.anchorsFailed = ['device:registration-cross#top-left'];
    });
    expect(() => ogAssertionVerdict(decoded, id, SITE)).toThrow(
      /12 off-palette and 0 translucent pixels; device anchors failed: \[device:registration-cross#top-left\]/,
    );
  });

  it('VAL-B2-OG-008 fails a retired identity and descriptor, a highlight tone and an unregistered device', () => {
    const id = 'VAL-B2-OG-008';
    const member = cardMemberId(CONTROL);
    expect(() => ogAssertionVerdict(EVIDENCE, id, member)).not.toThrow();
    const retired = planted((evidence) => {
      const identity = card(evidence, CONTROL).strings.find(({ field }) => field === 'identity');
      if (!identity) throw new Error('no identity string');
      identity.text = 'robot-wiki';
    });
    expect(() => ogAssertionVerdict(retired, id, member)).toThrow('paints the retired identity "robot-wiki"');
    const descriptor = planted((evidence) => {
      const site = card(evidence, 'site').strings.find(({ field }) => field === 'descriptor');
      if (!site) throw new Error('no descriptor string');
      site.text = 'Robotics encyclopedia';
    });
    expect(() => ogAssertionVerdict(descriptor, id, SITE)).toThrow('paints the retired descriptor "Robotics encyclopedia"');
    const highlight = planted((evidence) => {
      card(evidence, CONTROL).paintedTokens.push('highlight');
    });
    expect(() => ogAssertionVerdict(highlight, id, member)).toThrow('paints the highlight tone of a selected or progress state');
    const device = planted((evidence) => {
      card(evidence, CONTROL).devices.push('device:progress-bar#reading');
    });
    expect(() => ogAssertionVerdict(device, id, member)).toThrow(/paints \d+ devices, not the \d+ registered/);
  });

  it('VAL-B2-OG-009 fails a summary card, a relative or www image URL, a short alt and an X image unlike the Open Graph one', () => {
    const id = 'VAL-B2-OG-009';
    const member = routeId(DESTINATION_ROUTE);
    expect(() => ogAssertionVerdict(EVIDENCE, id, member)).not.toThrow();
    const cases: Array<[(html: string) => string, string | RegExp]> = [
      [(html) => metaContent(html, 'twitter:card', 'summary'), 'declares twitter:card [summary]'],
      [
        (html) => metaContent(metaContent(html, 'og:image', '/og/robot-wiki.png'), 'twitter:image', '/og/robot-wiki.png'),
        'declares og:image [/og/robot-wiki.png], not one absolute apex-domain URL',
      ],
      [
        (html) => metaContent(html, 'og:image', 'https://www.robot-wiki.com/og/robot-wiki.png'),
        'not one absolute apex-domain URL',
      ],
      [
        (html) => metaContent(metaContent(html, 'og:image:alt', 'Robot Wiki'), 'twitter:image:alt', 'Robot Wiki'),
        'declares og:image:alt [Robot Wiki]',
      ],
      [
        (html) => metaContent(html, 'twitter:image', 'https://robot-wiki.com/og/classical/control.png'),
        'declares twitter:image [https://robot-wiki.com/og/classical/control.png], not its og:image',
      ],
      [(html) => metaContent(html, 'twitter:image:height', '600'), 'declares an X image of 1200x600'],
    ];
    for (const [edit, expected] of cases) {
      const broken = planted((evidence) => withHead(evidence, DESTINATION_ROUTE, edit));
      expect(() => ogAssertionVerdict(broken, id, member)).toThrow(expected);
    }
  });

  it('VAL-B2-OG-010 fails a card whose second render differed from the staged bytes', () => {
    const differed = planted((evidence) => {
      const pixels = card(evidence, CONTROL).pixels;
      if (!pixels) throw new Error('no pixels');
      pixels.secondRenderSha256 = 'f'.repeat(64);
    });
    expect(() => ogAssertionVerdict(differed, 'VAL-B2-OG-010', cardMemberId(CONTROL))).toThrow(`second render ${'f'.repeat(64)}`);
  });

  it('VAL-B2-OG-011 fails a string with no source and an asset hash the shipped file does not have', () => {
    const id = 'VAL-B2-OG-011';
    const unsourced = planted((evidence) => {
      card(evidence, CONTROL).strings[0].sourceId = '';
    });
    expect(() => ogAssertionVerdict(unsourced, id, cardMemberId(CONTROL))).toThrow('records no source');
    const rehashed = planted((evidence) => {
      card(evidence, CONTROL).asset.sha256 = '0'.repeat(64);
    });
    expect(() => ogAssertionVerdict(rehashed, id, cardMemberId(CONTROL))).toThrow('records an asset hash the shipped file does not have');
  });

  it('VAL-B2-OG-012 fails a probe whose renders differ, a probe that never ran and a face off its checksum', () => {
    const id = 'VAL-B2-OG-012';
    const { memberId } = EVIDENCE.probes[0];
    expect(() => ogAssertionVerdict(EVIDENCE, id, memberId)).not.toThrow();
    const fellBack = planted((evidence) => {
      const probe = evidence.manifest.glyphProbes.find(({ probeId }) => probeId === memberId);
      if (!probe) throw new Error('no probe');
      probe.productionSha256 = 'f'.repeat(64);
    });
    expect(() => ogAssertionVerdict(fellBack, id, memberId)).toThrow('the own-face and production renders differ');
    const unprobed = planted((evidence) => {
      evidence.manifest.glyphProbes = evidence.manifest.glyphProbes.filter(({ probeId }) => probeId !== memberId);
    });
    expect(() => ogAssertionVerdict(unprobed, id, memberId)).toThrow('was never probed');
    const face = planted((evidence) => {
      evidence.faceSha256.set(EVIDENCE.probes[0].faceId, '0'.repeat(64));
    });
    expect(() => ogAssertionVerdict(face, id, memberId)).toThrow('is not the registered checksum');
  });

  it('VAL-B2-OG-013 fails an incomplete journal, an unpinned toolchain and a staging tree left behind', () => {
    const id = 'VAL-B2-OG-013';
    const member = treeMemberId('public/og');
    expect(() => ogAssertionVerdict(EVIDENCE, id, member)).not.toThrow();
    const swapping = planted((evidence) => {
      (evidence.journal as { state: string }).state = 'swapping';
    });
    expect(() => ogAssertionVerdict(swapping, id, member)).toThrow('the journal is swapping');
    const unpinned = planted((evidence) => {
      evidence.manifest.toolchain.packages[0].version = null;
    });
    expect(() => ogAssertionVerdict(unpinned, id, member)).toThrow(
      `the manifest does not pin the toolchain (unpinned: ${EVIDENCE.manifest.toolchain.packages[0].name})`,
    );
    const left = planted((evidence) => {
      evidence.stagingLeft = true;
    });
    expect(() => ogAssertionVerdict(left, id, member)).toThrow('is left behind');
  });

  it('VAL-B2-OG-014 fails a tree holding bytes the corpus did not record, a duplicate record and an evidence tree holding another manifest', () => {
    const id = 'VAL-B2-OG-014';
    const other = EVIDENCE.manifest.cards.find(({ kind, cardId }) => kind === 'article' && cardId !== CONTROL) as ManifestCard;
    const duplicated = planted((evidence) => {
      card(evidence, CONTROL).asset.sha256 = other.asset.sha256;
    });
    expect(() => ogAssertionVerdict(duplicated, id, treeMemberId('public/og'))).toThrow(
      /classical\/control\.png is not the recorded bytes; two recorded files share bytes/,
    );
    expect(() => ogAssertionVerdict(duplicated, id, treeMemberId('out/og'))).toThrow('classical/control.png is not the recorded bytes');
    expect(() => ogAssertionVerdict(duplicated, id, treeMemberId('evidence/brand-v2/og-cards'))).toThrow(
      'does not hold the manifest every other row reads',
    );
  });

  it('VAL-B2-OG-015 fails a tree the journal did not swap and a live journal awaiting recovery', () => {
    const id = 'VAL-B2-OG-015';
    const member = treeMemberId('out/structured-images');
    expect(() => ogAssertionVerdict(EVIDENCE, id, member)).not.toThrow();
    const asides = planted((evidence) => {
      const tree = evidence.journal.trees.find(({ path }) => path === 'out/structured-images');
      if (!tree) throw new Error('no journalled tree');
      (tree as { status: string }).status = 'moved-aside';
    });
    expect(() => ogAssertionVerdict(asides, id, member)).toThrow('is moved-aside, not swapped');
    const live = planted((evidence) => {
      evidence.liveJournal = true;
    });
    expect(() => ogAssertionVerdict(live, id, member)).toThrow('an incomplete journal is waiting for recovery');
  });
});
