import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { deriveSemanticMarks } from '@/lib/brand-v2-semantic-marks';
import {
  AUTHORED_TOKEN_SOURCE,
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
  tokenEvidenceFingerprint,
  tokenEvidenceProperties,
  unusedRoutedAliases,
  type TokenRendererEvidence,
  type TokenRuntimeEvidence,
} from '@/lib/brand-v2-token-evidence';
import { buildTokenRendererEvidence } from '@/lib/brand-v2-renderer-parity';

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
