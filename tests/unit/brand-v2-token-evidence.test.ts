import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { deriveSemanticMarks } from '@/lib/brand-v2-semantic-marks';
import {
  AUTHORED_TOKEN_SOURCE,
  OG_CARD_ARTWORK_SOURCE,
  OG_CARD_GENERATOR,
  OG_CARD_RENDER_BOUNDARY,
  OG_CARD_TREE_SOURCE,
  RENDERER_EVIDENCE_PRODUCER,
  SEMANTIC_COLOUR_ONLY_MARKS_PATH,
  SEMANTIC_ROLE_ASSERTION,
  TOKEN_RENDERER_EVIDENCE_PATH,
  TOKEN_RUNTIME_EVIDENCE_PATH,
  contrastRatio,
  deriveAuthoredColorTokens,
  deriveContractTokenExpectations,
  deriveRuntimeTokenExpectations,
  deriveSemanticTokenPopulation,
  readTokenRendererEvidence,
  readTokenRuntimeEvidence,
  rendererSourceIdentity,
  tokenEvidenceFingerprint,
  tokenEvidenceProperties,
  unusedRoutedAliases,
  type TokenRendererEvidence,
  type TokenRuntimeEvidence,
} from '@/lib/brand-v2-token-evidence';
import { buildTokenRendererEvidence } from '@/lib/brand-v2-renderer-parity';
import { buildModuleImportGraph } from '@/lib/module-import-graph';
import { classifyModuleSpecifier } from '@/lib/og-render-boundary-invariant';

const ROOT = process.cwd();
const SOURCES = {
  root: ROOT,
  contract: readFileSync(join(ROOT, 'contract', 'design-integrity.md'), 'utf8'),
  css: readFileSync(join(ROOT, AUTHORED_TOKEN_SOURCE), 'utf8'),
};
const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
) as { routes: { public: Array<{ path: string }> } };
const ROUTES = REGISTRY.routes.public.map(({ path }) => path);
const CARD_COUNT = publishedModules().length + 1;

/** A runtime artifact that the reader must accept, used as a spoof base. */
function validRuntimeArtifact(): TokenRuntimeEvidence {
  const expectations = deriveRuntimeTokenExpectations(SOURCES);
  const properties = tokenEvidenceProperties(SOURCES);
  const observed = Object.fromEntries(
    properties.map((property) => [property, expectations[property].expectedHex]),
  );
  return {
    version: 1,
    fingerprint: tokenEvidenceFingerprint(SOURCES),
    viewport: { width: 1280, height: 720 },
    properties,
    routes: [...ROUTES],
    observedByRoute: Object.fromEntries(
      ROUTES.map((route) => [route, { ...observed }]),
    ),
    unusedRoutedAliases: unusedRoutedAliases(SOURCES),
  };
}

function readRuntime(artifact: TokenRuntimeEvidence): TokenRuntimeEvidence {
  return readTokenRuntimeEvidence({ artifact, ...SOURCES, routes: ROUTES });
}

function readRenderer(artifact: TokenRendererEvidence): TokenRendererEvidence {
  return readTokenRendererEvidence({
    artifact,
    ...SOURCES,
    cardCount: CARD_COUNT,
  });
}

describe('brand-v2 token evidence', () => {
  it('routes each colour assertion to the tokens its own contract row names', () => {
    const expectations = deriveContractTokenExpectations(SOURCES);
    expect(Object.keys(expectations).sort()).toEqual([
      'VAL-B2-COL-001',
      'VAL-B2-COL-002',
      'VAL-B2-COL-003',
      SEMANTIC_ROLE_ASSERTION,
    ].sort());
    const highlight = expectations['VAL-B2-COL-001'][0];
    expect(highlight.contractHex).toBe('#C6FF19');
    expect(highlight.authoredHex).toBe('#C6FF19');
    // The value is taken from the contract row, not from the mirror it
    // checks, so a routed token the requirement never names is a routing
    // error rather than a silently accepted expectation.
    expect(() =>
      deriveContractTokenExpectations({
        ...SOURCES,
        routing: { 'VAL-B2-COL-001': ['graphite'] },
      }),
    ).toThrow(/requirement never names/);
    expect(() =>
      deriveContractTokenExpectations({
        ...SOURCES,
        routing: { 'VAL-B2-COL-999': ['ink'] },
      }),
    ).toThrow(/no requirement row/);
  });

  it('measures every routed token and every alias that resolves to one', () => {
    const properties = tokenEvidenceProperties(SOURCES);
    for (const property of [
      '--color-highlight',
      '--color-signal',
      '--color-ink',
      '--color-ok',
      '--color-destructive',
      // Aliases: the product consumes these, so a redirected alias must not
      // keep a passing colour row.
      '--color-focus',
      '--color-selection',
      '--color-link',
      '--color-err',
      '--color-text',
    ]) {
      expect(properties, property).toContain(property);
    }
    const expectations = deriveRuntimeTokenExpectations(SOURCES);
    expect(expectations['--color-err'].aliasOf).toBe('error');
    expect(expectations['--color-err'].expectedHex).toBe(
      expectations['--color-error'].expectedHex,
    );
  });

  it('records the colours the shipped card corpus paints and the renderer mirror parity', () => {
    const artifact = buildTokenRendererEvidence(SOURCES);
    expect(artifact.cardCount).toBe(CARD_COUNT);
    expect(artifact.unregisteredPaintedValues).toEqual([]);
    expect(artifact.paintedProperties).toBeGreaterThan(100);
    expect(Object.keys(artifact.paintedByHex).length).toBeGreaterThan(3);
    expect(readRenderer(artifact)).toBe(artifact);

    const path = join(ROOT, TOKEN_RENDERER_EVIDENCE_PATH);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`);
  });

  it('rejects spoofed, stale, and incomplete token evidence', () => {
    expect(readRuntime(validRuntimeArtifact())).toBeTruthy();

    const stale = validRuntimeArtifact();
    stale.fingerprint = 'f'.repeat(64);
    expect(() => readRuntime(stale)).toThrow(/stale/);

    const missingRoute = validRuntimeArtifact();
    missingRoute.routes = missingRoute.routes.slice(1);
    delete missingRoute.observedByRoute[ROUTES[0]];
    expect(() => readRuntime(missingRoute)).toThrow(/wrong routes/);

    const extraRoute = validRuntimeArtifact();
    extraRoute.routes = [...extraRoute.routes, '/invented/'];
    extraRoute.observedByRoute['/invented/'] =
      extraRoute.observedByRoute[ROUTES[0]];
    expect(() => readRuntime(extraRoute)).toThrow(/wrong routes/);

    const droppedProperty = validRuntimeArtifact();
    droppedProperty.properties = droppedProperty.properties.filter(
      (property) => property !== '--color-highlight',
    );
    expect(() => readRuntime(droppedProperty)).toThrow(/quantify over/);

    const droppedObservation = validRuntimeArtifact();
    delete droppedObservation.observedByRoute[ROUTES[0]]['--color-signal'];
    expect(() => readRuntime(droppedObservation)).toThrow(
      /rather than the routed properties/,
    );

    const drifted = validRuntimeArtifact();
    drifted.observedByRoute[ROUTES[0]]['--color-highlight'] = '#C6FF1A';
    expect(() => readRuntime(drifted)).toThrow(/authors #C6FF19/);

    const unhexed = validRuntimeArtifact();
    unhexed.observedByRoute[ROUTES[0]]['--color-signal'] = 'rgb(36, 95, 255)';
    expect(() => readRuntime(unhexed)).toThrow(/six-digit hex/);

    const renderer = buildTokenRendererEvidence(SOURCES);
    const shortWalk = { ...renderer, cardCount: renderer.cardCount - 1 };
    expect(() => readRenderer(shortWalk)).toThrow(/shipped corpus has/);

    const unpainted = { ...renderer, paintedProperties: 0 };
    expect(() => readRenderer(unpainted)).toThrow(/asserts nothing/);

    const foreign = {
      ...renderer,
      paintedByHex: { ...renderer.paintedByHex, '#FF00FF': 3 },
      paintedProperties: renderer.paintedProperties + 3,
    };
    expect(() => readRenderer(foreign)).toThrow(/authors for no token/);

    const miscounted = {
      ...renderer,
      paintedProperties: renderer.paintedProperties + 1,
    };
    expect(() => readRenderer(miscounted)).toThrow(/but attributes/);

    const mirrorDrift = {
      ...renderer,
      mirrorParity: renderer.mirrorParity.map((entry) =>
        entry.token === 'signal' ? { ...entry, mirror: '#245FF0' } : entry,
      ),
    };
    expect(() => readRenderer(mirrorDrift)).toThrow(/Renderer mirror signal/);

    const partialMirror = {
      ...renderer,
      mirrorParity: renderer.mirrorParity.slice(1),
    };
    expect(() => readRenderer(partialMirror)).toThrow(/exports/);
  });

  /**
   * A truncated walk that also decrements its own total is arithmetically
   * consistent, which is exactly why the previous reader accepted it: it
   * summed the artifact's per-hex counts and compared that sum with the
   * total the same artifact carried. Every mutation here keeps the artifact
   * self-consistent and has to be rejected by comparison with the card
   * trees instead.
   */
  it('rejects a self-consistent truncation of the painted colour population', () => {
    const renderer = buildTokenRendererEvidence(SOURCES);
    expect(readRenderer(renderer)).toBe(renderer);

    const dropHex = (hex: string): TokenRendererEvidence => {
      const dropped = renderer.paintedByHex[hex];
      expect(dropped, `${hex} must be painted for this mutation to bite`)
        .toBeGreaterThan(0);
      const without = (counts: Record<string, number>): Record<string, number> =>
        Object.fromEntries(
          Object.entries(counts).filter(([key]) => key !== hex),
        );
      return {
        ...renderer,
        paintedByHex: without(renderer.paintedByHex),
        paintedProperties: renderer.paintedProperties - dropped,
        paintedByCard: renderer.paintedByCard.map((card) => ({
          ...card,
          byHex: without(card.byHex),
          paintedProperties: card.paintedProperties - (card.byHex[hex] ?? 0),
        })),
      };
    };
    for (const hex of ['#245FFF', '#0B0B0C']) {
      expect(() => readRenderer(dropHex(hex)), hex).toThrow(
        /the card tree paints|the shipped card corpus paints/,
      );
    }

    // A short walk: the last card is dropped and every total it contributed
    // is removed, so the record still adds up on its own terms.
    const lastCard = renderer.paintedByCard.at(-1) as
      TokenRendererEvidence['paintedByCard'][number];
    const shortWalk: TokenRendererEvidence = {
      ...renderer,
      cardCount: renderer.cardCount - 1,
      paintedByCard: renderer.paintedByCard.slice(0, -1),
      paintedProperties: renderer.paintedProperties - lastCard.paintedProperties,
      paintedByHex: Object.fromEntries(
        Object.entries(renderer.paintedByHex)
          .map(([hex, count]) => [hex, count - (lastCard.byHex[hex] ?? 0)])
          .filter(([, count]) => (count as number) > 0),
      ) as Record<string, number>,
    };
    expect(() => readRenderer(shortWalk)).toThrow(/shipped corpus has/);

    // The same short walk while still claiming the full card count: the card
    // population itself is what disagrees.
    const hiddenShortWalk = { ...shortWalk, cardCount: renderer.cardCount };
    expect(() => readRenderer(hiddenShortWalk)).toThrow(/walked the wrong cards/);

    const renamedCard: TokenRendererEvidence = {
      ...renderer,
      paintedByCard: renderer.paintedByCard.map((card, index) =>
        index === 0 ? { ...card, cardId: 'invented/card' } : card,
      ),
    };
    expect(() => readRenderer(renamedCard)).toThrow(/walked the wrong cards/);

    const movedBetweenCards: TokenRendererEvidence = {
      ...renderer,
      paintedByCard: renderer.paintedByCard.map((card, index) =>
        index === 0
          ? { ...card, paintedProperties: card.paintedProperties - 1 }
          : index === 1
            ? { ...card, paintedProperties: card.paintedProperties + 1 }
            : card,
      ),
    };
    expect(() => readRenderer(movedBetweenCards)).toThrow(
      /painted properties on card/,
    );

    const staleRenderer: TokenRendererEvidence = {
      ...renderer,
      rendererSource: {
        ...renderer.rendererSource,
        fingerprint: 'a'.repeat(64),
      },
    };
    expect(() => readRenderer(staleRenderer)).toThrow(/renderer source/);

    const shrunkClosure: TokenRendererEvidence = {
      ...renderer,
      rendererSource: {
        ...renderer.rendererSource,
        modules: renderer.rendererSource.modules.slice(1),
      },
    };
    expect(() => readRenderer(shrunkClosure)).toThrow(/renderer source/);
  });

  it('derives VAL-B2-COMP-012 population from the semantic tokens and their use sites', () => {
    const population = deriveSemanticTokenPopulation(SOURCES);
    const declarations = population.filter(
      ({ kind }) => kind === 'declaration',
    );
    const uses = population.filter(({ kind }) => kind === 'use');
    const renderers = population.filter(({ kind }) => kind === 'renderer');
    expect(declarations.map(({ token }) => token).sort()).toEqual([
      'destructive',
      'error',
      'ok',
      'warn',
    ]);
    expect(uses.length).toBeGreaterThan(20);
    expect(renderers.length).toBeGreaterThan(0);
    // The population is the assertion's own subject matter: no member of it
    // is a generic control-registry ID such as control:button-primary.
    for (const member of population) {
      expect(member.id).toMatch(/^semantic-(token|use|renderer):/);
    }
    // Every use resolves to concrete marks, and each mark's cues are read
    // from that mark's own syntax: a mark with no cue of its own stays in
    // colourOnlyMarks instead of borrowing a cue from elsewhere in the file.
    for (const member of uses) {
      expect(member.marks, member.id).not.toEqual([]);
      for (const mark of member.marks) {
        expect(mark.id, member.id).toContain(member.module);
        expect(mark.token).toBe(member.token);
        if (mark.cues.length === 0) {
          expect(member.colourOnlyMarks, member.id).toContain(mark.id);
        }
      }
    }
    // The alias is followed rather than missed: text-err is a use of error.
    const aliasUse = uses.find(({ viaAlias }) => viaAlias === 'err');
    expect(aliasUse?.token).toBe('error');
  });

  it('reads a mark cue from that mark and not from elsewhere in the module', () => {
    const tokenByForm = new Map([['var(--color-err)', 'error']]);
    // The caption carries a role, a weight utility and text; the coloured
    // path carries none of them. A module-scope cue search reports this
    // module as cued, which is what made the clause unfalsifiable.
    const decoyed = [
      'export function Plot() {',
      '  return (',
      '    <figure>',
      '      <figcaption role="status" className="font-medium">Tracking error</figcaption>',
      '      <svg viewBox="0 0 10 10">',
      '        <path d="M0 0 L10 10" stroke="var(--color-err)" />',
      '      </svg>',
      '    </figure>',
      '  );',
      '}',
    ].join('\n');
    const decoyedMarks = deriveSemanticMarks({
      module: 'components/interactive/plot.tsx',
      text: decoyed,
      tokenByForm,
    });
    expect(decoyedMarks.map(({ element }) => element)).toEqual(['path']);
    expect(decoyedMarks[0].cues).toEqual([]);
    expect(decoyedMarks[0].binding).toBe('inline');

    // The same mark with a cue of its own resolves that cue, so the check
    // separates the two cases rather than failing everything.
    const cued = decoyed.replace(
      '<path d="M0 0 L10 10" stroke="var(--color-err)" />',
      '<path d="M0 0 L10 10" stroke="var(--color-err)" strokeDasharray="4 2" />',
    );
    const cuedMarks = deriveSemanticMarks({
      module: 'components/interactive/plot.tsx',
      text: cued,
      tokenByForm,
    });
    expect(cuedMarks[0].cues).toEqual(['stroke-pattern']);
  });

  it('does not accept geometry as a text carrier', () => {
    const marks = deriveSemanticMarks({
      module: 'components/interactive/plot.tsx',
      text: [
        'export function Plot() {',
        '  return (',
        '    <svg viewBox="0 0 10 10">',
        '      <rect className="fill-err" width="4" height="4" />',
        '      <text className="fill-err">4 failures</text>',
        '    </svg>',
        '  );',
        '}',
      ].join('\n'),
      tokenByForm: new Map([['fill-err', 'error']]),
    });
    const byElement = new Map(marks.map((mark) => [mark.element, mark.cues]));
    expect(byElement.get('rect')).toEqual([]);
    expect(byElement.get('text')).toEqual(['text-carrier']);
  });

  it('archives the exact set of marks that carry a semantic hue alone', () => {
    const measured = deriveSemanticTokenPopulation(SOURCES)
      .flatMap(({ marks }) => marks)
      .filter(({ cues }) => cues.length === 0)
      .map(({ id }) => id)
      .sort();
    const archived = (
      JSON.parse(
        readFileSync(join(ROOT, SEMANTIC_COLOUR_ONLY_MARKS_PATH), 'utf8'),
      ) as { marks: Array<{ id: string }> }
    ).marks
      .map(({ id }) => id)
      .sort();
    // Set equality in both directions: a newly authored colour-only mark and
    // a remediated one that is still listed both break this.
    expect(archived).toEqual(measured);
  });

  it('measures each semantic token at or above WCAG AA on both reading grounds', () => {
    const authored = deriveAuthoredColorTokens(SOURCES.css);
    for (const token of ['ok', 'warn', 'error', 'destructive']) {
      for (const ground of ['paper', 'white']) {
        expect(
          contrastRatio(
            authored.hexByToken[token],
            authored.hexByToken[ground],
          ),
          `${token} on ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('records the generator and the shared card-tree source in the renderer identity', () => {
    const identity = rendererSourceIdentity(ROOT);
    expect(identity.producers).toEqual(
      [RENDERER_EVIDENCE_PRODUCER, OG_CARD_GENERATOR].sort(),
    );
    expect(identity.cardTreeSource).toBe(OG_CARD_TREE_SOURCE);
    // The generator that writes the shipped PNGs, the corpus both sides
    // consume, the artwork builders, and the registry that decides which
    // cards exist all participate in building a card tree, so all four are
    // inside the fingerprinted closure.
    for (const modulePath of [
      OG_CARD_GENERATOR,
      OG_CARD_TREE_SOURCE,
      OG_CARD_ARTWORK_SOURCE,
      'data/modules.ts',
    ]) {
      expect(identity.modules, modulePath).toContain(modulePath);
    }
    expect(identity.fingerprint).toMatch(/^[0-9a-f]{64}$/);

    const renderer = buildTokenRendererEvidence(SOURCES);
    const foreignProducers: TokenRendererEvidence = {
      ...renderer,
      rendererSource: {
        ...renderer.rendererSource,
        producers: [RENDERER_EVIDENCE_PRODUCER],
      },
    };
    expect(() => readRenderer(foreignProducers)).toThrow(/renderer source/);

    const foreignTreeSource: TokenRendererEvidence = {
      ...renderer,
      rendererSource: {
        ...renderer.rendererSource,
        cardTreeSource: OG_CARD_ARTWORK_SOURCE,
      },
    };
    expect(() => readRenderer(foreignTreeSource)).toThrow(/renderer source/);

    const withoutGenerator: TokenRendererEvidence = {
      ...renderer,
      rendererSource: {
        ...renderer.rendererSource,
        modules: renderer.rendererSource.modules.filter(
          (modulePath) => modulePath !== OG_CARD_GENERATOR,
        ),
      },
    };
    expect(() => readRenderer(withoutGenerator)).toThrow(/renderer source/);
  });

  /**
   * The identity is derived from files on disk, so the mechanism is
   * falsified against fixture trees rather than by editing the repository:
   * a generator-only byte change must move the fingerprint, and a generator
   * that constructs its own card trees must fail the derivation instead of
   * escaping the measurement.
   */
  describe('the renderer identity over a fixture tree', () => {
    const GENERATOR_CONSUMING_CORPUS = [
      "import { writeFileSync } from 'node:fs';",
      "import { ogCardCorpus } from '../lib/og-card-corpus.ts';",
      "import { renderCorpusCard } from '../lib/og-card-render-boundary.ts';",
      'for (const entry of ogCardCorpus(process.cwd())) {',
      '  const buffer = await renderCorpusCard(entry, process.cwd());',
      '  writeFileSync(entry.cardPath, buffer);',
      '}',
    ].join('\n');
    const RENDER_BOUNDARY = [
      "import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';",
      "import { openSealedCardTree } from './og-card-corpus.ts';",
      'export async function renderCorpusCard(entry, root) {',
      '  const options = { root };',
      '  const finalTree = openSealedCardTree(entry.card);',
      '  const response = new ImageResponse(finalTree as never, options);',
      '  return response;',
      '}',
    ].join('\n');

    function fixtureFiles(
      overrides: Record<string, string | null> = {},
    ): Record<string, string> {
      const files: Record<string, string | null> = {
        'app/page.tsx': 'export default function Page() { return null; }\n',
        'components/card.tsx': 'export const Card = 1;\n',
        'content/note.mdx': '# note\n',
        'mdx-components.tsx':
          'export function useMDXComponents(components) { return components; }\n',
        'data/modules.ts': 'export function publishedModules() { return []; }\n',
        'lib/og-card-artwork.ts': [
          'export function articleCardElement(root) { return { root }; }',
          'export function siteCardElement() { return {}; }',
        ].join('\n'),
        'lib/og-card-corpus.ts': [
          "import { publishedModules } from '../data/modules.ts';",
          "import { articleCardElement, siteCardElement } from './og-card-artwork.ts';",
          'export function openSealedCardTree(sealed) { return sealed; }',
          'export function ogCardCorpus(root) {',
          '  return [siteCardElement(), ...publishedModules().map(() => articleCardElement(root))];',
          '}',
        ].join('\n'),
        'lib/og-card-render-boundary.ts': RENDER_BOUNDARY,
        'lib/brand-v2-renderer-parity.ts': [
          "import { ogCardCorpus } from './og-card-corpus.ts';",
          'export function buildTokenRendererEvidence(root) { return ogCardCorpus(root); }',
        ].join('\n'),
        'scripts/generate-og-cards.ts': GENERATOR_CONSUMING_CORPUS,
        ...overrides,
      };
      return Object.fromEntries(
        Object.entries(files).filter(([, text]) => text !== null),
      ) as Record<string, string>;
    }

    function withFixture(
      files: Record<string, string>,
      body: (root: string) => void,
    ): void {
      const root = mkdtempSync(join(tmpdir(), 'og-card-tree-identity-'));
      try {
        for (const [path, text] of Object.entries(files)) {
          const file = join(root, path);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, text);
        }
        body(root);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }

    it('moves the fingerprint when only the generator changes', () => {
      withFixture(fixtureFiles(), (root) => {
        const before = rendererSourceIdentity(root);
        expect(before.producers).toEqual(
          [RENDERER_EVIDENCE_PRODUCER, OG_CARD_GENERATOR].sort(),
        );
        expect(before.modules).toContain(OG_CARD_GENERATOR);
        expect(before.modules).toContain('data/modules.ts');

        writeFileSync(
          join(root, OG_CARD_GENERATOR),
          `${GENERATOR_CONSUMING_CORPUS}\nconst ground = '#FF00FF';\nvoid ground;\n`,
        );
        const after = rendererSourceIdentity(root);
        // The closure is unchanged, so nothing but the generator's own bytes
        // can account for the difference.
        expect(after.modules).toEqual(before.modules);
        expect(after.fingerprint).not.toBe(before.fingerprint);
      });
    });

    it('fails a generator that builds card trees outside the shared corpus', () => {
      withFixture(
        fixtureFiles({
          'scripts/generate-og-cards.ts': [
            "import { articleCardElement, siteCardElement } from '../lib/og-card-artwork.ts';",
            'void articleCardElement;',
            'void siteCardElement;',
          ].join('\n'),
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /does not reach lib\/og-card-corpus\.ts/,
          );
        },
      );

      // The harder case: it consumes the corpus and still reaches for the
      // artwork builders, so the closure check alone would pass it.
      withFixture(
        fixtureFiles({
          'scripts/generate-og-cards.ts': [
            GENERATOR_CONSUMING_CORPUS,
            "import { siteCardElement } from '../lib/og-card-artwork.ts';",
            'void siteCardElement;',
          ].join('\n'),
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /constructs card trees outside/,
          );
        },
      );
    });

    /**
     * The plant this milestone's round-five fix did not stop: the generator
     * obtains a corpus entry and transforms the tree on its way to the
     * renderer. It changes all 48 shipped cards while
     * `deriveRendererPaintedPopulation` keeps walking the untouched corpus.
     *
     * The fingerprint alone could not close it. A fingerprint says "source
     * changed", and the sanctioned evidence refresh answers by recording the
     * new hash, after which the unchanged painted-property numbers are
     * accepted again. Each plant below therefore has to fail the *identity*,
     * which is re-derived from current source on every write and every read,
     * so no refresh can absorb it.
     */
    it('fails a generator that transforms a card tree after obtaining it', () => {
      // Renders its own tree: the second renderer in the closure.
      withFixture(
        fixtureFiles({
          'scripts/generate-og-cards.ts': [
            "import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';",
            "import { ogCardCorpus } from '../lib/og-card-corpus.ts';",
            "import { renderCorpusCard } from '../lib/og-card-render-boundary.ts';",
            'const wrap = (card) => ({ ...card, props: { style: { background: "#FF00FF" } } });',
            'for (const entry of ogCardCorpus(process.cwd())) {',
            '  void renderCorpusCard(entry, process.cwd());',
            '  void new ImageResponse(wrap(entry.card), {});',
            '}',
          ].join('\n'),
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /module\(s\) in the renderer closure import an image renderer/,
          );
        },
      );

      // Unwraps the seal itself, which is the only way to reach a mutable
      // tree, and hands the wrapped result on.
      withFixture(
        fixtureFiles({
          'scripts/generate-og-cards.ts': [
            "import { ogCardCorpus, openSealedCardTree } from '../lib/og-card-corpus.ts';",
            "import { renderCorpusCard } from '../lib/og-card-render-boundary.ts';",
            'for (const entry of ogCardCorpus(process.cwd())) {',
            '  const card = openSealedCardTree(entry.card);',
            '  card.props.style.background = "#FF00FF";',
            '  void renderCorpusCard(entry, process.cwd());',
            '}',
          ].join('\n'),
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /binds openSealedCardTree/,
          );
        },
      );
    });

    it('fails a render boundary that does not hand the opened tree straight to the renderer', () => {
      const boundaryLines = RENDER_BOUNDARY.split('\n');
      const rewrite = (from: string, to: string): string =>
        boundaryLines
          .map((line) => (line.includes(from) ? to : line))
          .join('\n');

      // A wrapper at the call site.
      withFixture(
        fixtureFiles({
          'lib/og-card-render-boundary.ts': rewrite(
            'const response =',
            '  const response = new ImageResponse({ ...finalTree, props: {} }, options);',
          ),
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /must render the opened corpus tree itself, unwrapped/,
          );
        },
      );

      // A wrapper applied through a local helper.
      withFixture(
        fixtureFiles({
          'lib/og-card-render-boundary.ts': rewrite(
            'const response =',
            '  const response = new ImageResponse(recolour(finalTree) as never, options);',
          ),
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /must render the opened corpus tree itself, unwrapped/,
          );
        },
      );

      // An in-place edit between opening the seal and rendering it.
      withFixture(
        fixtureFiles({
          'lib/og-card-render-boundary.ts': rewrite(
            'const response =',
            '  finalTree.props.style.background = "#FF00FF";\n  const response = new ImageResponse(finalTree as never, options);',
          ),
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /touched nowhere else/,
          );
        },
      );

      // A substituted tree that never came from the seal at all.
      withFixture(
        fixtureFiles({
          'lib/og-card-render-boundary.ts': rewrite(
            'const finalTree =',
            '  const finalTree = { type: "div", props: { style: {} } };',
          ),
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /the rendered tree must come from the seal/,
          );
        },
      );

      // A boundary that renders without opening a seal at all.
      withFixture(
        fixtureFiles({
          'lib/og-card-render-boundary.ts': [
            "import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';",
            'export async function renderCorpusCard(entry, root) {',
            '  const finalTree = entry.card;',
            '  return new ImageResponse(finalTree as never, { root });',
            '}',
          ].join('\n'),
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /does not import openSealedCardTree/,
          );
        },
      );

      // And a generator that stops going through the boundary.
      withFixture(
        fixtureFiles({
          'scripts/generate-og-cards.ts': [
            "import { ogCardCorpus } from '../lib/og-card-corpus.ts';",
            'for (const entry of ogCardCorpus(process.cwd())) void entry;',
          ].join('\n'),
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /does not reach lib\/og-card-render-boundary\.ts/,
          );
        },
      );
    });

    it('fails when a producer is absent or stops reaching the corpus', () => {
      withFixture(
        fixtureFiles({
          'scripts/generate-og-cards.ts': null,
          'scripts/other.ts': 'export const other = 1;\n',
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /is not a scanned module/,
          );
        },
      );

      withFixture(
        fixtureFiles({
          'lib/brand-v2-renderer-parity.ts': 'export const nothing = 1;\n',
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /does not reach lib\/og-card-corpus\.ts/,
          );
        },
      );
    });

    /**
     * `ImageResponse` has several public spellings, and the discovery used
     * to recognize one compiled path. Everything else was not "not a
     * renderer", it was unexamined — so a helper could import the same
     * constructor from `next/og`, paint a substituted tree, and leave the
     * canonical boundary imported but unused for the reachability walk to
     * find. The next sanctioned refresh then folded the helper into the
     * closure fingerprint and re-certified the corpus-derived numbers.
     */
    it('classifies every specifier that can yield an image renderer, and fails closed on one it cannot', () => {
      for (const specifier of [
        'next/og',
        'next/server',
        '@vercel/og',
        'next/dist/compiled/@vercel/og/index.node.js',
        'next/dist/server/og/image-response',
        'next/dist/server/web/spec-extension/image-response',
        'satori',
        '@resvg/resvg-js',
      ]) {
        expect(classifyModuleSpecifier(specifier), specifier).toBe(
          'image-renderer',
        );
      }
      expect(classifyModuleSpecifier('node:fs')).toBe('renderer-free');
      expect(classifyModuleSpecifier('./og-card-corpus.ts')).toBe(
        'first-party',
      );
      // Not silently safe: an unlisted package could be another spelling.
      expect(classifyModuleSpecifier('next/image')).toBe('unrecognized');
      expect(classifyModuleSpecifier('some-image-library')).toBe(
        'unrecognized',
      );

      withFixture(
        fixtureFiles({
          'lib/og-card-substitute.ts': [
            "import mystery from 'unclassified-image-library';",
            'export const helper = mystery;',
          ].join('\n'),
          'scripts/generate-og-cards.ts': [
            GENERATOR_CONSUMING_CORPUS,
            "import { helper } from '../lib/og-card-substitute.ts';",
            'void helper;',
          ].join('\n'),
        }),
        (root) => {
          expect(() => rendererSourceIdentity(root)).toThrow(
            /neither a known image renderer nor known to be free of one \(lib\/og-card-substitute\.ts imports unclassified-image-library\)/,
          );
        },
      );
    });

    /**
     * The decisive plant: the canonical boundary stays imported and
     * reachable, and the bytes that reach disk come from a helper rendering
     * a substituted tree through the public `next/og` alias.
     */
    it('fails a helper that paints through a renderer alias while the boundary stays merely reachable', () => {
      withFixture(
        fixtureFiles({
          'lib/og-card-substitute.ts': [
            "import { ImageResponse } from 'next/og';",
            "import { openSealedCardTree } from './og-card-corpus.ts';",
            'export async function renderSubstituted(entry) {',
            '  const node = openSealedCardTree(entry.card);',
            '  const substituted = { ...node, props: { style: { background: "#FF00FF" } } };',
            '  const response = new ImageResponse(substituted, {});',
            '  return Buffer.from(await response.arrayBuffer());',
            '}',
          ].join('\n'),
          'scripts/generate-og-cards.ts': [
            "import { writeFileSync } from 'node:fs';",
            "import { ogCardCorpus } from '../lib/og-card-corpus.ts';",
            "import { renderCorpusCard } from '../lib/og-card-render-boundary.ts';",
            "import { renderSubstituted } from '../lib/og-card-substitute.ts';",
            'void renderCorpusCard;',
            'for (const entry of ogCardCorpus(process.cwd())) {',
            '  const buffer = await renderSubstituted(entry);',
            '  writeFileSync(entry.cardPath, buffer);',
            '}',
          ].join('\n'),
        }),
        (root) => {
          // Reachability alone still holds here: the generator imports and
          // mentions the boundary, so the import walk reaches it.
          const graph = buildModuleImportGraph(root, {
            roots: ['app', 'components', 'lib', 'content', 'data', 'scripts'],
          });
          expect(
            graph.reachableFrom([OG_CARD_GENERATOR]).has(
              OG_CARD_RENDER_BOUNDARY,
            ),
          ).toBe(true);
          expect(() => rendererSourceIdentity(root)).toThrow(
            /module\(s\) in the renderer closure import an image renderer.*next\/og/s,
          );
        },
      );
    });

    /**
     * The same lesson without the alias: the generator may reach the
     * boundary and still ship bytes that never came out of it.
     */
    it('binds the bytes the generator writes to the one render boundary call', () => {
      withFixture(fixtureFiles(), (root) => {
        expect(rendererSourceIdentity(root).generatorEmit).toEqual({
          module: OG_CARD_GENERATOR,
          boundaryCall: 'renderCorpusCard',
          emitted: 'buffer',
          writes: 1,
        });
      });

      const generator = (...body: string[]): string =>
        [
          "import { writeFileSync } from 'node:fs';",
          "import { ogCardCorpus } from '../lib/og-card-corpus.ts';",
          "import { renderCorpusCard } from '../lib/og-card-render-boundary.ts';",
          'for (const entry of ogCardCorpus(process.cwd())) {',
          ...body,
          '}',
        ].join('\n');

      const cases: Array<[string, RegExp]> = [
        // Reachable, referenced, never called.
        [
          generator(
            '  void renderCorpusCard;',
            '  const buffer = Buffer.from(entry.cardId);',
            '  writeFileSync(entry.cardPath, buffer);',
          ),
          /calls renderCorpusCard 0 times/,
        ],
        // Called, and something else is written.
        [
          generator(
            '  const buffer = await renderCorpusCard(entry, process.cwd());',
            '  void buffer;',
            '  writeFileSync(entry.cardPath, Buffer.from(entry.cardId));',
          ),
          /every card write must ship buffer/,
        ],
        // Called, and the result is transformed on its way to disk.
        [
          generator(
            '  const buffer = await renderCorpusCard(entry, process.cwd());',
            '  writeFileSync(entry.cardPath, recolour(buffer));',
          ),
          /every card write must ship buffer/,
        ],
        // Called, and the bytes are edited in place before the write.
        [
          generator(
            '  const buffer = await renderCorpusCard(entry, process.cwd());',
            '  buffer[0] = 0;',
            '  writeFileSync(entry.cardPath, buffer);',
          ),
          /uses buffer after `;`; the rendered bytes may only be passed on as they are/,
        ],
        // Called, and the bytes are read through a member on their way out.
        [
          generator(
            '  const buffer = await renderCorpusCard(entry, process.cwd());',
            '  writeFileSync(entry.cardPath, buffer.subarray(0));',
          ),
          /every card write must ship buffer/,
        ],
        // Written, then read through a member the derivation cannot follow.
        [
          generator(
            '  const buffer = await renderCorpusCard(entry, process.cwd());',
            '  writeFileSync(entry.cardPath, buffer);',
            '  record(entry.cardPath, buffer.length);',
          ),
          /the rendered bytes may not be indexed, reassigned or read through a member/,
        ],
        // Called, and handed to a helper before it is written.
        [
          generator(
            '  const buffer = await renderCorpusCard(entry, process.cwd());',
            '  stash(entry.cardPath, buffer);',
            '  writeFileSync(entry.cardPath, buffer);',
          ),
          /passes buffer elsewhere before writing it/,
        ],
        // Called, and never written at all.
        [
          generator(
            '  const buffer = await renderCorpusCard(entry, process.cwd());',
            '  void buffer;',
          ),
          /never writes buffer/,
        ],
        // Writing through an API this derivation does not follow.
        [
          [
            "import { appendFileSync, writeFileSync } from 'node:fs';",
            "import { ogCardCorpus } from '../lib/og-card-corpus.ts';",
            "import { renderCorpusCard } from '../lib/og-card-render-boundary.ts';",
            'void writeFileSync;',
            'for (const entry of ogCardCorpus(process.cwd())) {',
            '  const buffer = await renderCorpusCard(entry, process.cwd());',
            '  appendFileSync(entry.cardPath, buffer);',
            '}',
          ].join('\n'),
          /binds unrecognized file API\(s\) appendFileSync/,
        ],
      ];
      for (const [text, message] of cases) {
        withFixture(
          fixtureFiles({ 'scripts/generate-og-cards.ts': text }),
          (root) => {
            expect(() => rendererSourceIdentity(root), text).toThrow(message);
          },
        );
      }
    });
  });

  it('reads the persisted runtime sweep when the browser gate has produced one', () => {
    let persisted: unknown;
    try {
      persisted = JSON.parse(
        readFileSync(join(ROOT, TOKEN_RUNTIME_EVIDENCE_PATH), 'utf8'),
      );
    } catch {
      // The artifact is written by the Playwright brand-v2 gate; unit runs on
      // a clean checkout legitimately precede it.
      return;
    }
    expect(readRuntime(persisted as TokenRuntimeEvidence)).toBeTruthy();
  });
});
