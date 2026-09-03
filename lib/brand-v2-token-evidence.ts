import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { BRAND_COLORS, BRAND_SPACING } from './brand-v2-tokens.ts';
import { buildModuleImportGraph } from './module-import-graph.ts';
import { cardPaintedColors } from './og-card-artwork.ts';
import { ogCardCorpus, openSealedCardTree } from './og-card-corpus.ts';
import {
  deriveGeneratorEmitHandoff,
  deriveRenderBoundaryHandoff,
  moduleRendererUse,
  type GeneratorEmitHandoff,
  type RenderBoundaryHandoff,
} from './og-render-boundary-invariant.ts';
import { stripComments } from './source-comments.ts';
import {
  deriveSemanticMarks,
  type SemanticMark,
} from './brand-v2-semantic-marks.ts';
import { isSyncConflictDuplicate } from './sync-duplicates.ts';

/**
 * Evidence for the four foundation-token assertions (VAL-B2-COL-001,
 * VAL-B2-COL-002, VAL-B2-COL-003, VAL-B2-COMP-012), and the fail-closed
 * readers that decide whether that evidence may grant a result.
 *
 * The enforcement generator used to declare these four assertions complete
 * in a `COMPLETED_TOKEN_ASSERTIONS` set and then fill each `browser-state`
 * payload by reading the expected value back out of `BRAND_COLORS`. Nothing
 * about a live document entered the record, so a runtime that resolved a
 * different colour — while the mirror stayed correct — still regenerated a
 * `passed` row whose `computed` block reported the expected value. An
 * observation generated from the expectation can only agree with itself.
 *
 * Two artifacts replace that. The all-route Playwright sweep persists what
 * the browser actually resolved on every registered public route
 * (`evidence/brand-v2/token-runtime.json`), and the renderer walk persists
 * the colours the shipped Open Graph corpus actually paints plus the
 * mirror-versus-authored-CSS comparison
 * (`evidence/brand-v2/token-renderer-parity.json`). The expectations come
 * from two sources neither artifact can influence: the hex literals in the
 * assertion's own row in `contract/design-integrity.md`, and the authored
 * `--color-*` declarations in `app/globals.css`. Missing, stale, incomplete
 * or disagreeing evidence throws, so the generator refuses to emit rather
 * than emitting an unfalsifiable row.
 */
export const TOKEN_RUNTIME_EVIDENCE_PATH =
  'evidence/brand-v2/token-runtime.json';
export const TOKEN_RENDERER_EVIDENCE_PATH =
  'evidence/brand-v2/token-renderer-parity.json';
/**
 * The exact set of marks measured to carry a semantic hue with no non-colour
 * cue of their own. It is archived rather than summarised so that both
 * directions of drift break a test: a newly authored colour-only mark, and a
 * remediated one that is still listed.
 */
export const SEMANTIC_COLOUR_ONLY_MARKS_PATH =
  'evidence/brand-v2/semantic-colour-only-marks.json';
export const AUTHORED_TOKEN_SOURCE = 'app/globals.css';
export const RENDERER_MIRROR_SOURCE = 'lib/brand-v2-tokens.ts';

/**
 * Which tokens each assertion is about. This routes an assertion to its
 * evidence; it grants nothing, and it cannot silently disagree with the
 * contract, because `deriveContractTokenExpectations` requires every routed
 * token to be named in that assertion's own requirement row and takes the
 * expected value from the row rather than from a constant.
 */
export const TOKEN_ASSERTION_TOKENS: Readonly<
  Record<string, readonly string[]>
> = {
  'VAL-B2-COL-001': ['highlight'],
  'VAL-B2-COL-002': ['signal'],
  'VAL-B2-COL-003': ['ink', 'graphite', 'concrete', 'paper', 'white'],
  'VAL-B2-COMP-012': ['ok', 'warn', 'error', 'destructive'],
};

export const SEMANTIC_ROLE_ASSERTION = 'VAL-B2-COMP-012';
export const SEMANTIC_TOKEN_POPULATION_SOURCE =
  'app/globals.css#semantic-tokens-and-use-sites';

export type TokenExpectation = {
  token: string;
  /** `--color-<token>`, the name a document resolves. */
  property: string;
  /** The hex the assertion's own contract row states, when it states one. */
  contractHex: string | null;
  /** The hex `app/globals.css` authors for the token. */
  authoredHex: string;
};

const HEX = /^#[0-9A-F]{6}$/;

function relativeLuminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

/** WCAG 2.1 contrast ratio between two six-digit hexes. */
export function contrastRatio(foreground: string, background: string): number {
  if (!HEX.test(foreground) || !HEX.test(background)) {
    throw new Error(
      `Contrast requires uppercase six-digit hexes; received ${foreground} and ${background}`,
    );
  }
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (
    (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
  );
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Every `--color-*` declaration in the authored stylesheet, alias-resolved. */
export function deriveAuthoredColorTokens(css: string): {
  hexByToken: Record<string, string>;
  aliasTargetByToken: Record<string, string>;
  computedTokens: string[];
} {
  const declared = new Map<string, string>();
  for (const match of css.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) {
    const token = match[1];
    if (declared.has(token)) {
      throw new Error(`app/globals.css declares --color-${token} twice`);
    }
    declared.set(token, match[2].trim());
  }
  if (declared.size === 0) {
    throw new Error('app/globals.css declares no --color-* token');
  }
  const hexByToken: Record<string, string> = {};
  const aliasTargetByToken: Record<string, string> = {};
  const computedTokens: string[] = [];
  const resolve = (token: string, depth: number): string | null => {
    if (depth > 4) return null;
    const value = declared.get(token);
    if (value === undefined) return null;
    if (HEX.test(value.toUpperCase())) return value.toUpperCase();
    const alias = /^var\(--color-([a-z0-9-]+)\)$/.exec(value);
    if (alias) {
      if (depth === 0) aliasTargetByToken[token] = alias[1];
      return resolve(alias[1], depth + 1);
    }
    return null;
  };
  for (const token of declared.keys()) {
    const resolved = resolve(token, 0);
    if (resolved === null) computedTokens.push(token);
    else hexByToken[token] = resolved;
  }
  return { hexByToken, aliasTargetByToken, computedTokens };
}

function requirementRow(contract: string, assertionId: string): string {
  const row = new RegExp(
    `^\\|\\s*\`${assertionId}\`\\s*\\|\\s*(.+?)\\s*\\|$`,
    'm',
  ).exec(contract);
  if (!row) {
    throw new Error(`${assertionId} has no requirement row in the contract`);
  }
  return row[1];
}

/**
 * The expected value for every routed token, taken from the assertion's own
 * contract row where the contract states a literal, and from the authored
 * stylesheet in every case. A routed token the requirement never names is a
 * routing error and throws.
 */
export function deriveContractTokenExpectations(input: {
  contract: string;
  css: string;
  routing?: Readonly<Record<string, readonly string[]>>;
}): Record<string, TokenExpectation[]> {
  const routing = input.routing ?? TOKEN_ASSERTION_TOKENS;
  const authored = deriveAuthoredColorTokens(input.css);
  const expectations: Record<string, TokenExpectation[]> = {};
  let contractLiterals = 0;
  for (const [assertionId, tokens] of Object.entries(routing)) {
    if (tokens.length === 0) {
      throw new Error(`${assertionId} routes no token`);
    }
    const requirement = requirementRow(input.contract, assertionId);
    expectations[assertionId] = tokens.map((token) => {
      const named = new RegExp(`(?:^|[^a-z-])\`?${token}\`?(?![a-z-])`).exec(
        requirement,
      );
      if (!named) {
        throw new Error(
          `${assertionId} is routed to the ${token} token, which its requirement never names`,
        );
      }
      const authoredHex = authored.hexByToken[token];
      if (authoredHex === undefined) {
        throw new Error(
          `${AUTHORED_TOKEN_SOURCE} authors no resolvable --color-${token}`,
        );
      }
      const stated = new RegExp(
        `\`?${token}\`?(?![a-z-])[^#\`]{0,64}\`(#[0-9A-F]{6})\``,
      ).exec(requirement);
      if (stated) contractLiterals += 1;
      return {
        token,
        property: `--color-${token}`,
        contractHex: stated ? stated[1] : null,
        authoredHex,
      };
    });
  }
  if (contractLiterals === 0) {
    throw new Error(
      'No routed token has a contract literal; the expectation would rest on the implementation alone',
    );
  }
  return expectations;
}

/**
 * The colour tokens the product itself consumes, by `var(--color-*)`
 * reference or by a Tailwind colour utility, scanned over the product
 * surface only (app/, components/, mdx-components.tsx).
 *
 * Tailwind v4 emits a `@theme` token into the served stylesheet only where
 * its content scan finds a use, so authoring an alias is not a promise that
 * a document resolves it: `--color-active-path` and
 * `--color-instrument-muted` are authored, used by no product module, and
 * resolve to the empty string on every route (measured 2026-09-03). An
 * expectation built from the declarations alone would demand values no
 * document was ever sent.
 *
 * The scan deliberately excludes lib/, scripts/ and tests/ — the measuring
 * instrument. Tailwind's own content scan covers those too, so naming a
 * token in this file's prose is enough to make the bundler emit it; a
 * population derived from the bundle (or from a scan that included lib/)
 * would therefore be a population this module could talk itself into. What
 * remains is a subset of what the bundler serves, so every member is a
 * property some document really was sent.
 */
export function deriveProductReferencedColorTokens(input: {
  root: string;
  css: string;
}): Set<string> {
  const declared = new Set(
    [...input.css.matchAll(/--color-([a-z0-9-]+):/g)].map((match) => match[1]),
  );
  const referenced = new Set<string>();
  const collect = (text: string): void => {
    for (const match of text.matchAll(/var\(\s*--color-([a-z0-9-]+)/g)) {
      referenced.add(match[1]);
    }
    for (const match of text.matchAll(
      /\b(?:text|bg|border|border-[lrtb]|fill|stroke|ring|outline|decoration|shadow|from|via|to|caret|accent|divide|placeholder)-([a-z0-9-]+)\b/g,
    )) {
      if (declared.has(match[1])) referenced.add(match[1]);
    }
  };
  for (const modulePath of productModules(input.root)) {
    collect(readFileSync(join(input.root, modulePath), 'utf8'));
  }
  return referenced;
}

/**
 * Aliases of the routed tokens that no product module uses, and which the
 * bundler therefore never serves. Recorded in the evidence so the gap
 * between the stylesheet and the measured population is stated rather than
 * left implicit in the population's size.
 */
export function unusedRoutedAliases(input: {
  root: string;
  css: string;
  contract: string;
}): string[] {
  const authored = deriveAuthoredColorTokens(input.css);
  const referenced = deriveProductReferencedColorTokens(input);
  const routed = new Set(
    Object.values(deriveContractTokenExpectations(input))
      .flat()
      .map(({ token }) => token),
  );
  return Object.entries(authored.aliasTargetByToken)
    .filter(([alias, target]) => routed.has(target) && !referenced.has(alias))
    .map(([alias]) => alias)
    .sort();
}

export type RuntimeTokenExpectation = {
  property: string;
  token: string;
  /** Set when the property is an alias declared as `var(--color-<token>)`. */
  aliasOf: string | null;
  expectedHex: string;
  contractHex: string | null;
};

/**
 * Every custom property a document must resolve for the routed assertions:
 * the routed tokens themselves plus each authored alias that resolves to one
 * of them. The aliases are what the product actually consumes
 * (`--color-focus`, `--color-link`, `--color-err`), so leaving them out
 * would let a redirected alias keep a passing colour row.
 */
export function deriveRuntimeTokenExpectations(input: {
  contract: string;
  css: string;
  root: string;
}): Record<string, RuntimeTokenExpectation> {
  const expectations = deriveContractTokenExpectations(input);
  const authored = deriveAuthoredColorTokens(input.css);
  const referenced = deriveProductReferencedColorTokens(input);
  const byProperty: Record<string, RuntimeTokenExpectation> = {};
  for (const entry of Object.values(expectations).flat()) {
    byProperty[entry.property] = {
      property: entry.property,
      token: entry.token,
      aliasOf: null,
      expectedHex: entry.authoredHex,
      contractHex: entry.contractHex,
    };
    for (const [alias, target] of Object.entries(authored.aliasTargetByToken)) {
      if (target !== entry.token || !referenced.has(alias)) continue;
      byProperty[`--color-${alias}`] = {
        property: `--color-${alias}`,
        token: alias,
        aliasOf: entry.token,
        expectedHex: entry.authoredHex,
        contractHex: entry.contractHex,
      };
    }
  }
  return byProperty;
}

export function tokenEvidenceProperties(input: {
  contract: string;
  css: string;
  root: string;
}): string[] {
  return Object.keys(deriveRuntimeTokenExpectations(input)).sort();
}

/**
 * Binds each artifact to the sources it was measured against. A stylesheet,
 * contract or mirror edit changes the fingerprint, so an artifact produced
 * before that edit is rejected as stale instead of certifying the new values
 * it never saw.
 */
export function tokenEvidenceFingerprint(input: {
  contract: string;
  css: string;
  root: string;
}): string {
  const expectations = deriveContractTokenExpectations(input);
  const authored = deriveAuthoredColorTokens(input.css);
  return sha256(
    JSON.stringify({
      expectations,
      authored: authored.hexByToken,
      aliases: authored.aliasTargetByToken,
      measured: tokenEvidenceProperties(input),
      mirrorColors: BRAND_COLORS,
      mirrorSpacing: [...BRAND_SPACING],
    }),
  );
}

export type TokenRuntimeEvidence = {
  version: number;
  fingerprint: string;
  viewport: { width: number; height: number };
  properties: string[];
  routes: string[];
  observedByRoute: Record<string, Record<string, string>>;
  /**
   * Aliases of the routed tokens that no product module uses, so the bundler
   * never serves them and no document can resolve them.
   */
  unusedRoutedAliases: string[];
};

export function readTokenRuntimeEvidence(input: {
  artifact: unknown;
  contract: string;
  css: string;
  root: string;
  routes: readonly string[];
}): TokenRuntimeEvidence {
  const artifact = input.artifact as TokenRuntimeEvidence;
  if (artifact === null || typeof artifact !== 'object') {
    throw new Error('Token runtime evidence is not an object');
  }
  if (artifact.version !== 1) {
    throw new Error('Unsupported token runtime evidence version');
  }
  const fingerprint = tokenEvidenceFingerprint(input);
  if (artifact.fingerprint !== fingerprint) {
    throw new Error(
      `Token runtime evidence is stale: it was measured against ${artifact.fingerprint} and the current tokens hash to ${fingerprint}; re-run npm run test:brand-v2`,
    );
  }
  if (
    typeof artifact.viewport?.width !== 'number' ||
    typeof artifact.viewport?.height !== 'number'
  ) {
    throw new Error('Token runtime evidence records no measured viewport');
  }
  const expectations = deriveRuntimeTokenExpectations(input);
  const expectedProperties = tokenEvidenceProperties(input);
  const unused = unusedRoutedAliases(input);
  if (
    !Array.isArray(artifact.unusedRoutedAliases) ||
    artifact.unusedRoutedAliases.join('|') !== unused.join('|')
  ) {
    throw new Error(
      `Token runtime evidence records unused aliases ${JSON.stringify(artifact.unusedRoutedAliases)}; the stylesheet and product source derive ${JSON.stringify(unused)}`,
    );
  }
  if (!Array.isArray(artifact.properties)) {
    throw new Error('Token runtime evidence records no measured properties');
  }
  const measured = [...new Set(artifact.properties)].sort();
  if (measured.join('|') !== expectedProperties.join('|')) {
    throw new Error(
      `Token runtime evidence measured ${measured.join(', ')}; the routed assertions quantify over ${expectedProperties.join(', ')}`,
    );
  }
  if (!Array.isArray(artifact.routes)) {
    throw new Error('Token runtime evidence records no visited routes');
  }
  const visited = [...new Set(artifact.routes)].sort();
  const required = [...input.routes].sort();
  if (required.length === 0) {
    throw new Error('The route population for token evidence is empty');
  }
  if (visited.join('|') !== required.join('|')) {
    const missing = required.filter((route) => !visited.includes(route));
    const extra = visited.filter((route) => !required.includes(route));
    throw new Error(
      `Token runtime evidence visited the wrong routes; missing ${
        missing.join(', ') || 'none'
      } and unexpected ${extra.join(', ') || 'none'}; re-run npm run test:brand-v2`,
    );
  }
  for (const route of required) {
    const observed = artifact.observedByRoute?.[route];
    if (observed === null || typeof observed !== 'object') {
      throw new Error(`Token runtime evidence has no observation for ${route}`);
    }
    const observedProperties = Object.keys(observed).sort();
    if (observedProperties.join('|') !== expectedProperties.join('|')) {
      throw new Error(
        `Token runtime evidence for ${route} measured ${observedProperties.join(', ')} rather than the routed properties`,
      );
    }
    for (const [property, value] of Object.entries(observed)) {
      const expectation = expectations[property];
      if (typeof value !== 'string' || !HEX.test(value)) {
        throw new Error(
          `Token runtime evidence for ${route} records ${property} as ${String(value)}, which is not an uppercase six-digit hex`,
        );
      }
      if (value !== expectation.expectedHex) {
        throw new Error(
          `${route} resolved ${property} to ${value}; ${AUTHORED_TOKEN_SOURCE} authors ${expectation.expectedHex}`,
        );
      }
      if (
        expectation.contractHex !== null &&
        value !== expectation.contractHex
      ) {
        throw new Error(
          `${route} resolved ${property} to ${value}; the contract states ${expectation.contractHex}`,
        );
      }
    }
  }
  return artifact;
}

/**
 * The modules that build and measure the shipped Open Graph cards, and the
 * first-party source closure they reach.
 *
 * A painted-colour record is only evidence about the artwork it was measured
 * from. Two producers are named, and both matter: the module that writes the
 * artifact and the build-time generator that writes the PNGs. While only the
 * former was fingerprinted, the generator was outside the recorded identity
 * altogether, so a painted colour changed in the generator — by substituting
 * or wrapping the tree on its way to `ImageResponse` — shipped inside 48
 * cards while the artifact stayed valid.
 *
 * `OG_CARD_TREE_SOURCE` is required to sit in both closures, and the
 * generator is required not to bind the artwork builders itself, so the two
 * sides cannot drift into parallel constructions again: a generator that
 * rebuilds its own trees fails this derivation instead of quietly escaping
 * the measurement.
 *
 * That much is still only a same-source guarantee, and it was not enough. A
 * generator that obtained a corpus entry and then wrapped, cloned or
 * substituted the tree on its way to `ImageResponse` changed all 48 shipped
 * cards while `deriveRendererPaintedPopulation` kept walking the untouched
 * corpus. The generator fingerprint moved, so stale evidence failed once —
 * but a fingerprint is a drift detector, not an invariant, and the
 * sanctioned refresh recorded the new hash and re-certified the unchanged
 * numbers. So the handoff is now closed rather than watched: the corpus
 * hands out sealed entries whose element tree is unreachable except through
 * `openSealedCardTree`, exactly one module in the closure may import an
 * image renderer, the generator may bind neither the artwork builders nor
 * the seal opener, and `deriveRenderBoundaryHandoff` requires that single
 * renderer call to receive the opened tree itself. None of that is recorded
 * evidence a refresh can update; it is re-derived from current source every
 * time the evidence is written or read.
 *
 * Two further things are needed before "one boundary" means anything.
 * `ImageResponse` has more than one public spelling, so every external
 * import in the closure is classified as a renderer or as established not to
 * be one, and an unclassified specifier fails instead of quietly failing to
 * match — otherwise a helper importing `next/og` is simply invisible here.
 * And the generator's shipped bytes are followed back to that one call by
 * `deriveGeneratorEmitHandoff`, because a module can reach the boundary,
 * retain an unused reference to it, and write bytes it obtained elsewhere.
 * Reaching the boundary is availability; writing what it returned is use.
 *
 * `data/` joins the graph roots because the registries there decide which
 * cards exist and what each one paints, so they genuinely participate in
 * building a card tree; `scripts/` joins it because the generator lives
 * there. Staleness detection is still not the only guard: the reader also
 * re-derives the painted population from the current corpus.
 */
export const RENDERER_EVIDENCE_PRODUCER = 'lib/brand-v2-renderer-parity.ts';
export const OG_CARD_GENERATOR = 'scripts/generate-og-cards.ts';
export const OG_CARD_TREE_SOURCE = 'lib/og-card-corpus.ts';
export const OG_CARD_ARTWORK_SOURCE = 'lib/og-card-artwork.ts';
export const OG_CARD_RENDER_BOUNDARY = 'lib/og-card-render-boundary.ts';
export const OG_CARD_SEAL_OPENER = 'openSealedCardTree';
const RENDERER_IDENTITY_ROOTS = [
  'app',
  'components',
  'lib',
  'content',
  'data',
  'scripts',
] as const;

export type RendererSourceIdentity = {
  /** Sorted: the artifact producer and the production card generator. */
  producers: string[];
  cardTreeSource: string;
  /** The sole renderer call site, and the names it binds. */
  renderBoundary: RenderBoundaryHandoff;
  /** The generator's path from that call to the bytes it writes. */
  generatorEmit: GeneratorEmitHandoff;
  modules: string[];
  fingerprint: string;
};

export function rendererSourceIdentity(root: string): RendererSourceIdentity {
  const graph = buildModuleImportGraph(root, {
    roots: RENDERER_IDENTITY_ROOTS,
  });
  const producers = [OG_CARD_GENERATOR, RENDERER_EVIDENCE_PRODUCER].sort();
  for (const producer of producers) {
    if (!graph.textByModule.has(producer)) {
      throw new Error(
        `${producer} is not a scanned module, so the renderer closure cannot be identified`,
      );
    }
    const closure = graph.reachableFrom([producer]);
    if (!closure.has(OG_CARD_TREE_SOURCE)) {
      throw new Error(
        `${producer} does not reach ${OG_CARD_TREE_SOURCE}, so it builds a card corpus of its own`,
      );
    }
  }
  const rebuilt = (graph.bindingsByModule.get(OG_CARD_GENERATOR) ?? []).filter(
    ({ module }) => module === OG_CARD_ARTWORK_SOURCE,
  );
  if (rebuilt.length > 0) {
    throw new Error(
      `${OG_CARD_GENERATOR} binds ${rebuilt
        .map(({ local }) => local)
        .join(', ')} from ${OG_CARD_ARTWORK_SOURCE}, so it constructs card trees outside ${OG_CARD_TREE_SOURCE}`,
    );
  }
  // Opening a seal is how a card tree becomes mutable. The generator has no
  // reason to hold one: it hands the sealed entry to the render boundary.
  const opened = (graph.bindingsByModule.get(OG_CARD_GENERATOR) ?? []).filter(
    ({ local, imported }) =>
      local === OG_CARD_SEAL_OPENER || imported === OG_CARD_SEAL_OPENER,
  );
  if (opened.length > 0) {
    throw new Error(
      `${OG_CARD_GENERATOR} binds ${OG_CARD_SEAL_OPENER}, so it can unwrap a sealed card tree before ${OG_CARD_RENDER_BOUNDARY} renders it`,
    );
  }
  const modules = [...graph.reachableFrom(producers)].sort();
  if (!graph.reachableFrom([OG_CARD_GENERATOR]).has(OG_CARD_RENDER_BOUNDARY)) {
    throw new Error(
      `${OG_CARD_GENERATOR} does not reach ${OG_CARD_RENDER_BOUNDARY}, so it paints cards somewhere else`,
    );
  }
  const renderers: string[] = [];
  const rendererImports: string[] = [];
  const unclassified: string[] = [];
  for (const modulePath of modules) {
    const use = moduleRendererUse(graph.textByModule.get(modulePath) ?? '');
    if (use.rendererLocals.length > 0) {
      renderers.push(modulePath);
      rendererImports.push(
        `${modulePath} from ${use.rendererSpecifiers.join(' and ')}`,
      );
    }
    for (const specifier of use.unrecognizedSpecifiers) {
      unclassified.push(`${modulePath} imports ${specifier}`);
    }
  }
  if (unclassified.length > 0) {
    throw new Error(
      `The renderer closure holds external import(s) that are neither a known image renderer nor known to be free of one (${unclassified.join(
        '; ',
      )}); classify them before they can paint`,
    );
  }
  if (renderers.join('|') !== OG_CARD_RENDER_BOUNDARY) {
    throw new Error(
      `${renderers.length} module(s) in the renderer closure import an image renderer (${
        rendererImports.join('; ') || 'none'
      }); only ${OG_CARD_RENDER_BOUNDARY} may`,
    );
  }
  const renderBoundary = deriveRenderBoundaryHandoff({
    module: OG_CARD_RENDER_BOUNDARY,
    text: graph.textByModule.get(OG_CARD_RENDER_BOUNDARY) ?? '',
    sealOpener: OG_CARD_SEAL_OPENER,
  });
  const generatorEmit = deriveGeneratorEmitHandoff({
    module: OG_CARD_GENERATOR,
    text: graph.textByModule.get(OG_CARD_GENERATOR) ?? '',
    boundaryLocals: [
      ...new Set(
        (graph.bindingsByModule.get(OG_CARD_GENERATOR) ?? [])
          .filter(({ module }) => module === OG_CARD_RENDER_BOUNDARY)
          .map(({ local }) => local),
      ),
    ],
  });
  for (const required of [...producers, OG_CARD_TREE_SOURCE]) {
    if (!modules.includes(required)) {
      throw new Error(
        `The renderer closure omits ${required}, so the recorded identity would not cover it`,
      );
    }
  }
  if (modules.length < 2) {
    throw new Error(
      `${producers.join(' and ')} reach ${modules.length} first-party modules, so the renderer closure is not measurable`,
    );
  }
  return {
    producers,
    cardTreeSource: OG_CARD_TREE_SOURCE,
    renderBoundary,
    generatorEmit,
    modules,
    fingerprint: sha256(
      JSON.stringify(
        modules.map((modulePath) => [
          modulePath,
          sha256(graph.textByModule.get(modulePath) ?? ''),
        ]),
      ),
    ),
  };
}

export type RendererPaintedPopulation = {
  cardIds: string[];
  paintedByCard: Array<{
    cardId: string;
    paintedProperties: number;
    byHex: Record<string, number>;
  }>;
  paintedByHex: Record<string, number>;
  paintedProperties: number;
  unregisteredPaintedValues: string[];
};

function sortedCounts(counts: Map<string, number>): Record<string, number> {
  return Object.fromEntries(
    [...counts].sort(([left], [right]) => left.localeCompare(right)),
  );
}

/**
 * Every colour property the shipped card corpus paints, per card and in
 * aggregate, derived from the current card trees.
 *
 * This is the population the persisted artifact is compared against. The
 * artifact used to be graded on its own arithmetic — the reader summed the
 * per-hex counts it carried and compared that sum with the total it also
 * carried — so deleting a complete hex entry and decrementing the total was
 * accepted. A short or truncated walk now disagrees with a population
 * derived here at read time.
 */
export function deriveRendererPaintedPopulation(input: {
  root: string;
  css: string;
}): RendererPaintedPopulation {
  const corpus = ogCardCorpus(input.root);
  if (corpus.length === 0) {
    throw new Error('The Open Graph corpus is empty');
  }
  const authored = deriveAuthoredColorTokens(input.css);
  const authoredHexes = new Set(Object.values(authored.hexByToken));
  const aggregate = new Map<string, number>();
  const unregistered = new Set<string>();
  let total = 0;
  const paintedByCard = corpus.map(({ cardId, card }) => {
    const byCard = new Map<string, number>();
    let cardTotal = 0;
    for (const painted of cardPaintedColors(openSealedCardTree(card))) {
      for (const value of painted.unregistered) {
        unregistered.add(`${painted.property}: ${value}`);
      }
      for (const hex of painted.hexes) {
        cardTotal += 1;
        total += 1;
        byCard.set(hex, (byCard.get(hex) ?? 0) + 1);
        aggregate.set(hex, (aggregate.get(hex) ?? 0) + 1);
        if (!authoredHexes.has(hex)) {
          unregistered.add(`${painted.property}: ${hex}`);
        }
      }
    }
    if (cardTotal === 0) {
      throw new Error(`Open Graph card ${cardId} paints no colour property`);
    }
    return {
      cardId,
      paintedProperties: cardTotal,
      byHex: sortedCounts(byCard),
    };
  });
  return {
    cardIds: corpus.map(({ cardId }) => cardId),
    paintedByCard,
    paintedByHex: sortedCounts(aggregate),
    paintedProperties: total,
    unregisteredPaintedValues: [...unregistered].sort(),
  };
}

export type TokenRendererEvidence = {
  version: number;
  fingerprint: string;
  rendererSource: RendererSourceIdentity;
  cardCount: number;
  paintedProperties: number;
  paintedByCard: RendererPaintedPopulation['paintedByCard'];
  paintedByHex: Record<string, number>;
  unregisteredPaintedValues: string[];
  mirrorParity: Array<{ token: string; mirror: string; authored: string }>;
};

function sameCounts(
  left: Record<string, number>,
  right: Record<string, number>,
): boolean {
  const keys = Object.keys(left).sort();
  const otherKeys = Object.keys(right).sort();
  return (
    keys.join('|') === otherKeys.join('|') &&
    keys.every((key) => left[key] === right[key])
  );
}

function describeCounts(counts: Record<string, number>): string {
  return (
    Object.entries(counts)
      .map(([key, count]) => `${key}=${count}`)
      .join(', ') || 'nothing'
  );
}

export function readTokenRendererEvidence(input: {
  artifact: unknown;
  contract: string;
  css: string;
  root: string;
  cardCount: number;
}): TokenRendererEvidence {
  const artifact = input.artifact as TokenRendererEvidence;
  if (artifact === null || typeof artifact !== 'object') {
    throw new Error('Token renderer evidence is not an object');
  }
  if (artifact.version !== 1) {
    throw new Error('Unsupported token renderer evidence version');
  }
  const fingerprint = tokenEvidenceFingerprint(input);
  if (artifact.fingerprint !== fingerprint) {
    throw new Error(
      `Token renderer evidence is stale: it was measured against ${artifact.fingerprint} and the current tokens hash to ${fingerprint}; re-run npm test`,
    );
  }
  const rendererSource = rendererSourceIdentity(input.root);
  const recordedSource = artifact.rendererSource;
  if (
    recordedSource === null ||
    typeof recordedSource !== 'object' ||
    !Array.isArray(recordedSource.producers) ||
    recordedSource.producers.join('|') !== rendererSource.producers.join('|') ||
    recordedSource.cardTreeSource !== rendererSource.cardTreeSource ||
    JSON.stringify(recordedSource.renderBoundary ?? null) !==
      JSON.stringify(rendererSource.renderBoundary) ||
    JSON.stringify(recordedSource.generatorEmit ?? null) !==
      JSON.stringify(rendererSource.generatorEmit) ||
    !Array.isArray(recordedSource.modules) ||
    recordedSource.modules.join('|') !== rendererSource.modules.join('|') ||
    recordedSource.fingerprint !== rendererSource.fingerprint
  ) {
    throw new Error(
      `Token renderer evidence records renderer source ${JSON.stringify(recordedSource ?? null)}; ${rendererSource.producers.join(' and ')} now reach ${rendererSource.modules.length} modules hashing to ${rendererSource.fingerprint}; re-run npm test`,
    );
  }
  if (artifact.cardCount !== input.cardCount) {
    throw new Error(
      `Token renderer evidence walked ${artifact.cardCount} cards; the shipped corpus has ${input.cardCount}`,
    );
  }
  if (!(artifact.paintedProperties > 0)) {
    throw new Error(
      'Token renderer evidence records no painted colour property, so it asserts nothing',
    );
  }
  if (
    !Array.isArray(artifact.unregisteredPaintedValues) ||
    artifact.unregisteredPaintedValues.length > 0
  ) {
    throw new Error(
      `Token renderer evidence records colour values outside the authored tokens: ${
        (artifact.unregisteredPaintedValues ?? []).join(', ') || 'unreadable'
      }`,
    );
  }
  const authored = deriveAuthoredColorTokens(input.css);
  const authoredHexes = new Set(Object.values(authored.hexByToken));
  const painted = Object.entries(artifact.paintedByHex ?? {});
  if (painted.length === 0) {
    throw new Error('Token renderer evidence paints no measured colour');
  }
  let total = 0;
  for (const [hex, count] of painted) {
    if (!authoredHexes.has(hex)) {
      throw new Error(
        `Token renderer evidence paints ${hex}, which ${AUTHORED_TOKEN_SOURCE} authors for no token`,
      );
    }
    if (!(count > 0)) {
      throw new Error(`Token renderer evidence records ${hex} zero times`);
    }
    total += count;
  }
  if (total !== artifact.paintedProperties) {
    throw new Error(
      `Token renderer evidence counts ${artifact.paintedProperties} painted properties but attributes ${total}`,
    );
  }
  // The self-reported arithmetic above cannot notice a walk that omitted
  // real properties, so the recorded populations are reconciled against the
  // card trees the current corpus builds, exactly and per card.
  const derived = deriveRendererPaintedPopulation(input);
  if (derived.cardIds.length !== input.cardCount) {
    throw new Error(
      `The derived Open Graph corpus has ${derived.cardIds.length} cards; the published registry counts ${input.cardCount}`,
    );
  }
  if (!Array.isArray(artifact.paintedByCard)) {
    throw new Error(
      'Token renderer evidence records no per-card painted population',
    );
  }
  const recordedCardIds = artifact.paintedByCard.map(({ cardId }) => cardId);
  if (recordedCardIds.join('|') !== derived.cardIds.join('|')) {
    const missing = derived.cardIds.filter(
      (cardId) => !recordedCardIds.includes(cardId),
    );
    const extra = recordedCardIds.filter(
      (cardId) => !derived.cardIds.includes(cardId),
    );
    throw new Error(
      `Token renderer evidence walked the wrong cards; missing ${
        missing.join(', ') || 'none'
      } and unexpected ${extra.join(', ') || 'none'}; re-run npm test`,
    );
  }
  const derivedByCard = new Map(
    derived.paintedByCard.map((entry) => [entry.cardId, entry]),
  );
  for (const recorded of artifact.paintedByCard) {
    const expected = derivedByCard.get(
      recorded.cardId,
    ) as RendererPaintedPopulation['paintedByCard'][number];
    if (recorded.paintedProperties !== expected.paintedProperties) {
      throw new Error(
        `Token renderer evidence records ${recorded.paintedProperties} painted properties on card ${recorded.cardId}; the card tree paints ${expected.paintedProperties}`,
      );
    }
    if (!sameCounts(recorded.byHex ?? {}, expected.byHex)) {
      throw new Error(
        `Token renderer evidence records ${describeCounts(recorded.byHex ?? {})} on card ${recorded.cardId}; the card tree paints ${describeCounts(expected.byHex)}`,
      );
    }
  }
  if (!sameCounts(artifact.paintedByHex ?? {}, derived.paintedByHex)) {
    throw new Error(
      `Token renderer evidence attributes ${describeCounts(artifact.paintedByHex ?? {})}; the shipped card corpus paints ${describeCounts(derived.paintedByHex)}; re-run npm test`,
    );
  }
  if (artifact.paintedProperties !== derived.paintedProperties) {
    throw new Error(
      `Token renderer evidence counts ${artifact.paintedProperties} painted properties; the shipped card corpus paints ${derived.paintedProperties}`,
    );
  }
  if (
    artifact.unregisteredPaintedValues.join('|') !==
    derived.unregisteredPaintedValues.join('|')
  ) {
    throw new Error(
      `Token renderer evidence records unregistered painted values ${JSON.stringify(artifact.unregisteredPaintedValues)}; the card corpus paints ${JSON.stringify(derived.unregisteredPaintedValues)}`,
    );
  }
  const mirrorTokens = Object.keys(BRAND_COLORS).sort();
  const parityTokens = artifact.mirrorParity?.map(({ token }) => token).sort();
  if (!parityTokens || parityTokens.join('|') !== mirrorTokens.join('|')) {
    throw new Error(
      `Token renderer evidence compares ${(parityTokens ?? []).join(', ')}; ${RENDERER_MIRROR_SOURCE} exports ${mirrorTokens.join(', ')}`,
    );
  }
  for (const entry of artifact.mirrorParity) {
    const authoredHex = authored.hexByToken[entry.token];
    if (authoredHex === undefined) {
      throw new Error(
        `${AUTHORED_TOKEN_SOURCE} authors no --color-${entry.token} for the renderer mirror`,
      );
    }
    if (entry.authored !== authoredHex) {
      throw new Error(
        `Token renderer evidence records ${entry.authored} as the authored --color-${entry.token}; the stylesheet authors ${authoredHex}`,
      );
    }
    if (entry.mirror !== authoredHex) {
      throw new Error(
        `Renderer mirror ${entry.token} is ${entry.mirror}; ${AUTHORED_TOKEN_SOURCE} authors ${authoredHex}`,
      );
    }
  }
  const expectations = deriveContractTokenExpectations(input);
  for (const entries of Object.values(expectations)) {
    for (const expectation of entries) {
      const parity = artifact.mirrorParity.find(
        ({ token }) => token === expectation.token,
      );
      if (!parity) {
        throw new Error(
          `Token renderer evidence compares no mirror for the routed token ${expectation.token}`,
        );
      }
      if (
        expectation.contractHex !== null &&
        parity.mirror !== expectation.contractHex
      ) {
        throw new Error(
          `Renderer mirror ${expectation.token} is ${parity.mirror}; the contract states ${expectation.contractHex}`,
        );
      }
    }
  }
  return artifact;
}

/* ------------------------------------------------------------------ */
/* VAL-B2-COMP-012's own population: the semantic token declarations, */
/* their use sites, and the renderer mirrors that repeat them.        */
/* ------------------------------------------------------------------ */

/**
 * `VAL-B2-COMP-012` quantifies over the four semantic tokens and every place
 * they are used ("renderer parity wherever used"), so expanding its evidence
 * across the seven generic control-registry IDs produced a `passed` row per
 * control kind for a claim never checked against that control (R8a). The
 * population is derived here instead: one member per declaration, one per
 * module-and-token use site, and one per renderer mirror consumer.
 */
export type SemanticTokenMember = {
  id: string;
  kind: 'declaration' | 'use' | 'renderer';
  token: string;
  module: string;
  /** The concrete forms observed for this member, sorted. */
  forms: string[];
  references: number;
  /** The alias the use goes through, when it does not name the token. */
  viaAlias: string | null;
  /** The concrete marks this member paints, each with its own cues. */
  marks: SemanticMark[];
  /** Marks that carry the hue with no non-colour cue of their own. */
  colourOnlyMarks: string[];
};

const SEMANTIC_SCAN_ROOTS = ['app', 'components', 'lib'] as const;
const SEMANTIC_SCAN_FILES = ['mdx-components.tsx'] as const;
const SEMANTIC_SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.css']);
const UTILITY_PREFIXES = [
  'text',
  'bg',
  'border',
  'border-l',
  'border-r',
  'border-t',
  'border-b',
  'fill',
  'stroke',
  'ring',
  'outline',
  'decoration',
  'shadow',
  'from',
  'via',
  'to',
  'caret',
  'accent',
  'divide',
] as const;

function filesUnder(directory: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) files.push(...filesUnder(path));
    else files.push(path);
  }
  return files;
}

function semanticModules(root: string): string[] {
  return [
    ...SEMANTIC_SCAN_ROOTS.flatMap((directory) =>
      filesUnder(join(root, directory)),
    ),
    ...SEMANTIC_SCAN_FILES.map((file) => join(root, file)),
  ]
    .filter((path) => SEMANTIC_SCAN_EXTENSIONS.has(extname(path)))
    .map((path) => relative(root, path))
    .filter(
      (modulePath) =>
        !modulePath.split('/').some((name) => isSyncConflictDuplicate(name)),
    )
    .sort();
}

const PRODUCT_SCAN_ROOTS = ['app', 'components'] as const;

/** The product surface, excluding the modules that measure it. */
function productModules(root: string): string[] {
  return semanticModules(root).filter(
    (modulePath) =>
      modulePath === 'mdx-components.tsx' ||
      PRODUCT_SCAN_ROOTS.some((directory) =>
        modulePath.startsWith(`${directory}/`),
      ),
  );
}

export function deriveSemanticTokenPopulation(input: {
  root: string;
  contract: string;
  css: string;
}): SemanticTokenMember[] {
  const expectations = deriveContractTokenExpectations({
    contract: input.contract,
    css: input.css,
  })[SEMANTIC_ROLE_ASSERTION];
  const tokens = expectations.map(({ token }) => token);
  const authored = deriveAuthoredColorTokens(input.css);
  const aliasesByToken = new Map<string, string[]>(
    tokens.map((token) => [
      token,
      Object.entries(authored.aliasTargetByToken)
        .filter(([, target]) => target === token)
        .map(([alias]) => alias),
    ]),
  );

  const members: SemanticTokenMember[] = expectations.map((expectation) => ({
    id: `semantic-token:${expectation.token}`,
    kind: 'declaration',
    token: expectation.token,
    module: AUTHORED_TOKEN_SOURCE,
    forms: [
      `--color-${expectation.token}: ${expectation.authoredHex}`,
      ...(aliasesByToken.get(expectation.token) ?? []).map(
        (alias) => `--color-${alias}: var(--color-${expectation.token})`,
      ),
    ].sort(),
    references: 1,
    viaAlias: null,
    marks: [],
    colourOnlyMarks: [],
  }));

  const uses = new Map<string, SemanticTokenMember>();
  for (const modulePath of semanticModules(input.root)) {
    // Comments are stripped before a use is counted. Naming a token in
    // prose is not using it, and this module's own documentation of the cue
    // vocabulary would otherwise enter the population it derives — the same
    // self-feeding hazard that keeps the Tailwind-emitted token scan out of
    // lib/.
    const text = stripComments(
      readFileSync(join(input.root, modulePath), 'utf8'),
    );
    const tokenByForm = new Map<string, string>();
    for (const token of tokens) {
      const names = [token, ...(aliasesByToken.get(token) ?? [])];
      const forms = new Map<string, number>();
      for (const name of names) {
        for (const prefix of UTILITY_PREFIXES) {
          const utility = new RegExp(`\\b${prefix}-${name}\\b`, 'g');
          const count = [...text.matchAll(utility)].length;
          if (count > 0) forms.set(`${prefix}-${name}`, count);
        }
        const variable = new RegExp(`var\\(--color-${name}\\)`, 'g');
        const variableCount = [...text.matchAll(variable)].length;
        if (variableCount > 0) {
          forms.set(`var(--color-${name})`, variableCount);
        }
      }
      // The stylesheet's own declarations are the declaration member above.
      if (modulePath === AUTHORED_TOKEN_SOURCE) {
        for (const key of [...forms.keys()]) {
          if (key.startsWith('var(--color-')) forms.delete(key);
        }
      }
      if (forms.size === 0) continue;
      const usedAlias = [...forms.keys()].some((form) =>
        (aliasesByToken.get(token) ?? []).some((alias) =>
          form.endsWith(`-${alias}`) || form === `var(--color-${alias})`,
        ),
      );
      for (const form of forms.keys()) tokenByForm.set(form, token);
      const id = `semantic-use:${modulePath}#${token}`;
      uses.set(id, {
        id,
        kind: 'use',
        token,
        module: modulePath,
        forms: [...forms.keys()].sort(),
        references: [...forms.values()].reduce((sum, count) => sum + count, 0),
        viaAlias: usedAlias
          ? ((aliasesByToken.get(token) ?? [])[0] ?? null)
          : null,
        marks: [],
        colourOnlyMarks: [],
      });
    }
    if (tokenByForm.size > 0) {
      if (extname(modulePath) !== '.tsx') {
        throw new Error(
          `${modulePath} uses a semantic colour token outside JSX, so no mark can be resolved to carry its cue`,
        );
      }
      const marks = deriveSemanticMarks({
        module: modulePath,
        text,
        tokenByForm,
      });
      for (const member of uses.values()) {
        if (member.module !== modulePath || member.kind !== 'use') continue;
        member.marks = marks.filter(({ token }) => token === member.token);
        if (member.marks.length === 0) {
          throw new Error(
            `${modulePath} uses ${member.token} through ${member.forms.join(', ')}, but no concrete mark was resolved for it`,
          );
        }
        member.colourOnlyMarks = member.marks
          .filter(({ cues }) => cues.length === 0)
          .map(({ id }) => id);
      }
    }
    for (const token of tokens) {
      const mirror = new RegExp(`BRAND_COLORS\\.${token}\\b`, 'g');
      const count = [...text.matchAll(mirror)].length;
      if (count === 0) continue;
      const id = `semantic-renderer:${modulePath}#${token}`;
      uses.set(id, {
        id,
        kind: 'renderer',
        token,
        module: modulePath,
        forms: [`BRAND_COLORS.${token}`],
        references: count,
        viaAlias: null,
        marks: [],
        colourOnlyMarks: [],
      });
    }
  }
  const population = [...members, ...uses.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  if (population.length <= tokens.length) {
    throw new Error(
      'The semantic-token population contains no use site, so "renderer parity wherever used" has no referent',
    );
  }
  return population;
}
