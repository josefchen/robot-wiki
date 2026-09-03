import {
  matchingToken,
  tokenizeSource,
  type SourceToken,
} from './source-tokens.ts';

/**
 * The structural invariant on the Open Graph render boundary.
 *
 * The shipped cards and the painted-colour evidence are only the same
 * artwork if the element tree handed to the image renderer is the tree the
 * corpus sealed. A fingerprint over the generator cannot establish that: it
 * detects that source changed, and the sanctioned evidence refresh then
 * records the new hash while the corpus-derived numbers stay put. So the
 * handoff itself is checked, from current source, every time the evidence is
 * written or read.
 *
 * What is proven here: exactly one module in the renderer closure imports an
 * image renderer at all, and inside it the renderer is constructed with the
 * identifier the seal opener returned — not a call, not a spread, not a
 * cloned literal — and that identifier is declared once and mentioned
 * nowhere else, so it cannot be reassigned or edited in place between the
 * two. Anything else, including a wrapper written locally, fails. On the
 * other side of the handoff, the bytes the generator writes are required to
 * be the value that single boundary call returned, so reaching the boundary
 * is not mistaken for having painted through it.
 *
 * The reading is token-based rather than regex-based because the difference
 * between `openSealedCardTree(entry.card)` and a comment or string
 * containing that text is exactly the difference this check exists to see.
 */

/**
 * Specifiers that can hand back an image renderer.
 *
 * `ImageResponse` has several public spellings — `next/og`, `next/server`,
 * the Next internals both re-export, the standalone `@vercel/og`, and the
 * satori/resvg layers underneath — so matching one compiled path let a
 * helper import the same constructor under another name and paint a
 * substituted tree while the canonical boundary stayed merely imported.
 */
const IMAGE_RENDERER_SPECIFIERS: readonly RegExp[] = [
  /(?:^|\/)@vercel\/og(?:$|\/)/,
  /(?:^|[/@])satori(?:$|[/.])/,
  /(?:^|[/@])resvg(?:$|[-/.])/,
  /^next\/og$/,
  /^next\/server$/,
  /^next\/.*(?:image-response|\/og\/)/,
];

/**
 * External specifiers established not to yield an image renderer.
 *
 * A closed vocabulary rather than a filter: enumerating renderers alone
 * makes an unrecognized specifier silently safe, which is the fail-open
 * direction. Every runtime dependency the renderer closure actually has is
 * listed, so a new external import is a decision someone has to record here
 * rather than one the check makes by not matching.
 */
const RENDERER_FREE_SPECIFIERS: ReadonlySet<string> = new Set([
  'gray-matter',
  'node:crypto',
  'node:fs',
  'node:fs/promises',
  'node:path',
  'zod',
]);

export type SpecifierRendererClass =
  | 'first-party'
  | 'image-renderer'
  | 'renderer-free'
  | 'unrecognized';

/** Whether a module specifier can produce an image renderer. */
export function classifyModuleSpecifier(
  specifier: string,
): SpecifierRendererClass {
  if (specifier.startsWith('.') || specifier.startsWith('@/')) {
    return 'first-party';
  }
  if (IMAGE_RENDERER_SPECIFIERS.some((pattern) => pattern.test(specifier))) {
    return 'image-renderer';
  }
  return RENDERER_FREE_SPECIFIERS.has(specifier)
    ? 'renderer-free'
    : 'unrecognized';
}

export type ModuleImport = {
  specifier: string;
  /** `import type ...`, which binds no runtime value. */
  typeOnly: boolean;
  /** The local names the statement binds, excluding type-only ones. */
  locals: string[];
};

/**
 * Every module specifier the source imports, with the value bindings each
 * one introduces.
 */
export function moduleImports(text: string): ModuleImport[] {
  const tokens = tokenizeSource(text);
  const imports: ModuleImport[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== 'identifier' || token.value !== 'import') continue;
    if (tokens[index - 1]?.value === '.') continue;
    const next = tokens[index + 1];
    if (next === undefined) continue;
    // `import('...')`, including the deferred form inside a callback.
    if (next.value === '(') {
      const specifier = tokens[index + 2];
      if (specifier?.kind === 'string') {
        imports.push({
          specifier: specifier.value,
          typeOnly: false,
          locals: [],
        });
      }
      continue;
    }
    // `import './globals.css'`
    if (next.kind === 'string') {
      imports.push({ specifier: next.value, typeOnly: false, locals: [] });
      continue;
    }
    const typeOnly =
      next.value === 'type' && tokens[index + 2]?.value !== 'from';
    let cursor = index + 1;
    const locals: string[] = [];
    while (cursor < tokens.length) {
      const current = tokens[cursor];
      if (current.kind === 'identifier' && current.value === 'from') {
        const specifier = tokens[cursor + 1];
        if (specifier?.kind === 'string') {
          imports.push({
            specifier: specifier.value,
            typeOnly,
            locals: typeOnly ? [] : locals,
          });
        }
        break;
      }
      if (current.value === '{') {
        const close = matchingToken(tokens, cursor, '{', '}');
        if (close === null) break;
        for (const entry of namedBindingLocals(tokens.slice(cursor + 1, close))) {
          locals.push(entry);
        }
        cursor = close + 1;
        continue;
      }
      if (
        current.kind === 'identifier' &&
        current.value !== 'type' &&
        current.value !== 'as'
      ) {
        locals.push(current.value);
      }
      cursor += 1;
    }
  }
  return imports;
}

/** The value names a `{ ... }` import clause binds, skipping type entries. */
function namedBindingLocals(clause: readonly SourceToken[]): string[] {
  const locals: string[] = [];
  let entry: SourceToken[] = [];
  const flush = (): void => {
    const names = entry.filter(({ kind }) => kind === 'identifier');
    entry = [];
    if (names.length === 0 || names[0].value === 'type') return;
    const aliasAt = names.findIndex(({ value }) => value === 'as');
    const local = aliasAt === -1 ? names[0] : names[aliasAt + 1];
    if (local !== undefined) locals.push(local.value);
  };
  for (const token of clause) {
    if (token.value === ',') flush();
    else entry.push(token);
  }
  flush();
  return locals;
}

export type ModuleRendererUse = {
  /** Local names bound from a specifier that can yield a renderer. */
  rendererLocals: string[];
  /** The specifiers those locals came from. */
  rendererSpecifiers: string[];
  /** External specifiers that could not be classified either way. */
  unrecognizedSpecifiers: string[];
};

/**
 * What the module's runtime imports say about its ability to construct an
 * image renderer.
 *
 * An unrecognized specifier is reported rather than ignored: the caller
 * fails on it, because a specifier nobody has classified might be another
 * spelling of `ImageResponse`.
 */
export function moduleRendererUse(text: string): ModuleRendererUse {
  const rendererLocals = new Set<string>();
  const rendererSpecifiers = new Set<string>();
  const unrecognizedSpecifiers = new Set<string>();
  for (const { specifier, typeOnly, locals } of moduleImports(text)) {
    if (typeOnly) continue;
    const classification = classifyModuleSpecifier(specifier);
    if (classification === 'image-renderer') {
      rendererSpecifiers.add(specifier);
      for (const local of locals) rendererLocals.add(local);
      // A bare or dynamic import of a renderer module binds no named local,
      // and still gives the module a renderer.
      if (locals.length === 0) rendererLocals.add(specifier);
      continue;
    }
    if (classification === 'unrecognized') unrecognizedSpecifiers.add(specifier);
  }
  return {
    rendererLocals: [...rendererLocals].sort(),
    rendererSpecifiers: [...rendererSpecifiers].sort(),
    unrecognizedSpecifiers: [...unrecognizedSpecifiers].sort(),
  };
}

export type RenderBoundaryHandoff = {
  module: string;
  /** The local name of the image renderer constructor. */
  renderer: string;
  /** The local name of the corpus seal opener. */
  sealOpener: string;
  /** The identifier the opened tree is bound to and rendered as. */
  finalTree: string;
};

/**
 * Reads the render boundary's handoff, or throws describing what it does
 * instead.
 */
export function deriveRenderBoundaryHandoff(input: {
  module: string;
  text: string;
  sealOpener: string;
}): RenderBoundaryHandoff {
  const { module, text, sealOpener } = input;
  const tokens = tokenizeSource(text);
  const imports = moduleImports(text);
  const { rendererLocals } = moduleRendererUse(text);
  if (rendererLocals.length !== 1) {
    throw new Error(
      `${module} binds ${rendererLocals.length} image renderer value(s) (${
        rendererLocals.join(', ') || 'none'
      }); the render boundary must bind exactly one`,
    );
  }
  const renderer = rendererLocals[0];
  const opensSeal = imports.some(({ locals }) => locals.includes(sealOpener));
  if (!opensSeal) {
    throw new Error(
      `${module} does not import ${sealOpener}, so the tree it renders did not come from the sealed corpus`,
    );
  }

  const isValue = (index: number): boolean =>
    tokens[index]?.kind === 'identifier' && tokens[index - 1]?.value !== '.';
  const constructions = tokens
    .map((_, index) => index)
    .filter(
      (index) =>
        tokens[index].kind === 'identifier' &&
        tokens[index].value === 'new' &&
        tokens[index + 1]?.value === renderer &&
        isValue(index + 1),
    );
  if (constructions.length !== 1) {
    throw new Error(
      `${module} constructs ${renderer} ${constructions.length} times; the render boundary must paint through exactly one`,
    );
  }
  const at = constructions[0];
  if (tokens[at + 2]?.value !== '(') {
    throw new Error(`${module} does not call ${renderer} as a constructor`);
  }
  const argument = tokens[at + 3];
  const rendersDirectly = (): never => {
    throw new Error(
      `${module} renders an expression starting at \`${argument?.value ?? 'nothing'}\`; the render boundary must render the opened corpus tree itself, unwrapped`,
    );
  };
  if (argument?.kind !== 'identifier' || !isValue(at + 3)) rendersDirectly();
  const finalTree = argument.value;
  // `node as never` is the only admissible decoration: the bundled renderer
  // typings expect a ReactElement.
  const afterArgument =
    tokens[at + 4]?.value === 'as'
      ? tokens[at + 5]?.value === 'never'
        ? tokens[at + 6]
        : undefined
      : tokens[at + 4];
  if (afterArgument === undefined || afterArgument.value !== ',') {
    rendersDirectly();
  }

  const declarations = tokens
    .map((_, index) => index)
    .filter(
      (index) =>
        tokens[index].value === 'const' &&
        tokens[index + 1]?.value === finalTree &&
        tokens[index + 2]?.value === '=' &&
        tokens[index + 3]?.value === sealOpener &&
        tokens[index + 4]?.value === '(',
    );
  if (declarations.length !== 1) {
    throw new Error(
      `${module} declares ${finalTree} ${declarations.length} times as \`const ${finalTree} = ${sealOpener}(...)\`; the rendered tree must come from the seal and from nowhere else`,
    );
  }
  const mentions = tokens.filter(
    (token, index) =>
      token.kind === 'identifier' && token.value === finalTree && isValue(index),
  );
  // Its declaration and the render argument. A third mention is an
  // opportunity to reassign it or edit the tree in place.
  if (mentions.length !== 2) {
    throw new Error(
      `${module} mentions ${finalTree} ${mentions.length} times; the opened tree must be declared and rendered, and touched nowhere else`,
    );
  }
  return { module, renderer, sealOpener, finalTree };
}

/**
 * The file APIs the card generator may hold.
 *
 * Closed for the same reason the renderer specifiers are: a write performed
 * through an unlisted API would carry bytes this derivation never looked at.
 */
const RECOGNIZED_FILE_APIS: ReadonlySet<string> = new Set([
  'existsSync',
  'mkdirSync',
  'readFileSync',
  'rmSync',
  'writeFileSync',
]);
const FILE_WRITER = 'writeFileSync';
const FILE_SYSTEM_SPECIFIERS: ReadonlySet<string> = new Set([
  'node:fs',
  'node:fs/promises',
]);

export type GeneratorEmitHandoff = {
  module: string;
  /** The local name the render boundary's renderer is bound to. */
  boundaryCall: string;
  /** The identifier the boundary call's bytes are bound to. */
  emitted: string;
  /** File writes shipping exactly that value. */
  writes: number;
};

/**
 * Reads the generator's emit handoff, or throws describing what it does
 * instead.
 *
 * Reaching the render boundary is not the same as painting through it. The
 * generator could import `renderCorpusCard`, keep an unused reference to it
 * so the import graph still shows the boundary reachable, and write bytes
 * produced somewhere else entirely; an evidence refresh would then record
 * the new closure and re-certify the corpus-derived numbers, because nothing
 * had ever compared the shipped bytes with the boundary's output.
 *
 * So the bytes are followed instead: the boundary local is called exactly
 * once, its result is bound to one `const`, every file write ships that
 * identifier itself, and every other use of it happens after the last write,
 * which leaves no point at which a different value could be substituted or
 * the written one altered.
 */
export function deriveGeneratorEmitHandoff(input: {
  module: string;
  text: string;
  boundaryLocals: readonly string[];
}): GeneratorEmitHandoff {
  const { module, text, boundaryLocals } = input;
  const tokens = tokenizeSource(text);
  if (boundaryLocals.length !== 1) {
    throw new Error(
      `${module} binds ${boundaryLocals.length} value(s) from the render boundary (${
        boundaryLocals.join(', ') || 'none'
      }); the generator must paint through exactly one`,
    );
  }
  const boundaryCall = boundaryLocals[0];

  const fileApis = moduleImports(text)
    .filter(
      ({ specifier, typeOnly }) =>
        !typeOnly && FILE_SYSTEM_SPECIFIERS.has(specifier),
    )
    .flatMap(({ locals }) => locals);
  const unrecognizedApis = fileApis.filter(
    (local) => !RECOGNIZED_FILE_APIS.has(local),
  );
  if (unrecognizedApis.length > 0) {
    throw new Error(
      `${module} binds unrecognized file API(s) ${unrecognizedApis.sort().join(', ')}; a card can only be written through ${FILE_WRITER}`,
    );
  }
  if (!fileApis.includes(FILE_WRITER)) {
    throw new Error(
      `${module} does not bind ${FILE_WRITER}, so it writes no card through the checked path`,
    );
  }

  const isValue = (index: number): boolean =>
    tokens[index]?.kind === 'identifier' && tokens[index - 1]?.value !== '.';
  const calls = tokens
    .map((_, index) => index)
    .filter(
      (index) =>
        tokens[index].value === boundaryCall &&
        isValue(index) &&
        tokens[index + 1]?.value === '(',
    );
  if (calls.length !== 1) {
    throw new Error(
      `${module} calls ${boundaryCall} ${calls.length} times; the shipped bytes must come from exactly one render boundary call`,
    );
  }
  const at = calls[0];
  if (
    tokens[at - 1]?.value !== 'await' ||
    tokens[at - 2]?.value !== '=' ||
    tokens[at - 4]?.value !== 'const' ||
    tokens[at - 3]?.kind !== 'identifier'
  ) {
    throw new Error(
      `${module} does not bind the ${boundaryCall} result as \`const <bytes> = await ${boundaryCall}(...)\`, so the value it writes cannot be followed`,
    );
  }
  const emitted = tokens[at - 3].value;

  const writeCalls = tokens
    .map((_, index) => index)
    .filter(
      (index) =>
        tokens[index].value === FILE_WRITER &&
        isValue(index) &&
        tokens[index + 1]?.value === '(',
    );
  const writesEmitted: number[] = [];
  for (const call of writeCalls) {
    const close = matchingToken(tokens, call + 1, '(', ')');
    if (close === null) {
      throw new Error(`${module} has an unterminated ${FILE_WRITER} call`);
    }
    const argument = tokens[close - 1];
    if (
      argument?.value !== emitted ||
      !isValue(close - 1) ||
      tokens[close - 2]?.value !== ','
    ) {
      throw new Error(
        `${module} writes \`${argument?.value ?? 'nothing'}\`; every card write must ship ${emitted}, the value ${boundaryCall} returned`,
      );
    }
    writesEmitted.push(close - 1);
  }
  if (writesEmitted.length === 0) {
    throw new Error(
      `${module} never writes ${emitted}, so nothing binds the shipped bytes to ${boundaryCall}`,
    );
  }
  const mentions = tokens
    .map((_, index) => index)
    .filter((index) => tokens[index].value === emitted && isValue(index));
  const lastWrite = Math.max(...writesEmitted);
  for (const mention of mentions) {
    if (mention === at - 3 || writesEmitted.includes(mention)) continue;
    const before = tokens[mention - 1]?.value;
    const after = tokens[mention + 1]?.value;
    if (before !== '(' && before !== ',') {
      throw new Error(
        `${module} uses ${emitted} after \`${before ?? 'nothing'}\`; the rendered bytes may only be passed on as they are`,
      );
    }
    if (after !== ',' && after !== ')') {
      throw new Error(
        `${module} follows ${emitted} with \`${after ?? 'nothing'}\`; the rendered bytes may not be indexed, reassigned or read through a member`,
      );
    }
    if (mention < lastWrite) {
      throw new Error(
        `${module} passes ${emitted} elsewhere before writing it; the bytes must reach disk before anything else can touch them`,
      );
    }
  }
  return { module, boundaryCall, emitted, writes: writesEmitted.length };
}
