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
 * What is proven here: exactly one module in the renderer closure can obtain
 * an image renderer at all, and inside it the renderer is constructed with
 * the identifier the seal opener returned — not a call, not a spread, not a
 * cloned literal — and that identifier is declared once and mentioned
 * nowhere else, so it cannot be reassigned or edited in place between the
 * two. Anything else, including a wrapper written locally, fails.
 *
 * The other side of the handoff is not read from source at all any more.
 * Whether the shipped cards are the bytes this boundary produced is settled
 * on the artefact by `lib/og-card-emitted-bytes.ts`, which re-renders every
 * corpus card through the boundary and compares the result with the files
 * on disk. That subsumes the token-level dataflow the generator used to be
 * held to, and it holds regardless of which module performed the last write
 * or through which API.
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
  // `next` publishes no `exports` map, so Node resolves the public entry
  // points by file: `next/og` and `next/og.js` are the same module.
  /^next\/og(?:\.[cm]?js)?$/,
  /^next\/server(?:\.[cm]?js)?$/,
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

/**
 * Stands in for `import(expression)`, whose target is decided at runtime.
 * It matches no first-party prefix and appears in no list, so it classifies
 * as unrecognized and the caller fails on it.
 */
export const COMPUTED_IMPORT_SPECIFIER = '<computed import expression>';

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

export type ModuleDependency = {
  specifier: string;
  /**
   * `import` introduces a module-scope binding this module can call.
   * `reexport` (`export ... from '...'`) introduces none, but it hands the
   * specifier's values to every importer of this module, so it is a renderer
   * capability all the same.
   */
  kind: 'import' | 'reexport';
  /** `import type ...` / `export type ... from`, which bind no value. */
  typeOnly: boolean;
  /** The names the statement makes available, excluding type-only ones. */
  locals: string[];
};

/**
 * Every module specifier the source depends on at runtime, with the value
 * names each one makes available.
 *
 * Re-exports are read alongside imports because a module that never imports
 * a renderer can still be the module an importer gets one from:
 * `export { ImageResponse } from 'next/og.js'` in a first-party barrel is a
 * renderer in the closure that an import-only scan does not see at all.
 */
export function moduleDependencies(text: string): ModuleDependency[] {
  const tokens = tokenizeSource(text);
  const dependencies: ModuleDependency[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== 'identifier') continue;
    if (tokens[index - 1]?.value === '.') continue;
    if (token.value === 'export') {
      const reexport = readReexport(tokens, index);
      if (reexport !== null) dependencies.push(reexport);
      continue;
    }
    if (token.value !== 'import') continue;
    const next = tokens[index + 1];
    if (next === undefined) continue;
    // `import('...')`, including the deferred form inside a callback.
    if (next.value === '(') {
      const specifier = tokens[index + 2];
      dependencies.push({
        // A computed specifier names no module a reader can classify, so it
        // is reported under a name no classifier recognizes rather than
        // dropped.
        specifier:
          specifier?.kind === 'string'
            ? specifier.value
            : COMPUTED_IMPORT_SPECIFIER,
        kind: 'import',
        typeOnly: false,
        locals: [],
      });
      continue;
    }
    // `import './globals.css'`
    if (next.kind === 'string') {
      dependencies.push({
        specifier: next.value,
        kind: 'import',
        typeOnly: false,
        locals: [],
      });
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
          dependencies.push({
            specifier: specifier.value,
            kind: 'import',
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
  return dependencies;
}

/**
 * The `export ... from '<specifier>'` statement beginning at `index` in its
 * named, star and namespace forms, or null when the `export` keyword
 * introduces a local declaration or a local export list instead.
 *
 * A clause that opens but never closes throws rather than being skipped: an
 * export form this cannot finish reading is a re-export target nobody has
 * classified, which is the fail-open direction.
 */
function readReexport(
  tokens: readonly SourceToken[],
  index: number,
): ModuleDependency | null {
  let cursor = index + 1;
  let typeOnly = false;
  const head = tokens[cursor];
  if (head?.kind === 'identifier' && head.value === 'type') {
    // `export type { X } from`/`export type * from` bind no runtime value;
    // `export type X = ...` is not a dependency at all and falls through the
    // form check below.
    typeOnly = true;
    cursor += 1;
  }
  const opener = tokens[cursor];
  if (opener === undefined) return null;
  const locals: string[] = [];
  if (opener.value === '*') {
    cursor += 1;
    if (tokens[cursor]?.kind === 'identifier' && tokens[cursor].value === 'as') {
      const alias = tokens[cursor + 1];
      if (alias?.kind !== 'identifier') {
        throw new Error(
          'A namespace re-export names no alias, so its target cannot be read',
        );
      }
      locals.push(alias.value);
      cursor += 2;
    }
  } else if (opener.value === '{') {
    const close = matchingToken(tokens, cursor, '{', '}');
    if (close === null) {
      throw new Error(
        'An export clause is unterminated, so its re-export target cannot be read',
      );
    }
    for (const entry of namedBindingLocals(tokens.slice(cursor + 1, close))) {
      locals.push(entry);
    }
    cursor = close + 1;
  } else return null;
  const from = tokens[cursor];
  // `export { a, b }` and `export * as ns` without a source re-export
  // nothing; the star form without `from` is not valid syntax.
  if (from?.kind !== 'identifier' || from.value !== 'from') return null;
  const specifier = tokens[cursor + 1];
  if (specifier?.kind !== 'string') {
    throw new Error(
      'A re-export names no string module specifier, so its target cannot be classified',
    );
  }
  return {
    specifier: specifier.value,
    kind: 'reexport',
    typeOnly,
    locals: typeOnly ? [] : locals,
  };
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
  /** Names made available from a specifier that can yield a renderer. */
  rendererLocals: string[];
  /** The specifiers those names came from. */
  rendererSpecifiers: string[];
  /** External specifiers that could not be classified either way. */
  unrecognizedSpecifiers: string[];
  /** Renderer specifiers reached by `export ... from` rather than `import`. */
  rendererReexports: string[];
};

/**
 * What the module's runtime dependencies say about its ability to hand out
 * an image renderer.
 *
 * Imports and re-exports both count. An import lets the module construct a
 * renderer itself; a re-export lets any importer of it construct one, which
 * is the same capability one hop away and is invisible to a scan that reads
 * only `import` statements.
 *
 * An unrecognized specifier is reported rather than ignored: the caller
 * fails on it, because a specifier nobody has classified might be another
 * spelling of `ImageResponse`.
 */
export function moduleRendererUse(text: string): ModuleRendererUse {
  const rendererLocals = new Set<string>();
  const rendererSpecifiers = new Set<string>();
  const unrecognizedSpecifiers = new Set<string>();
  const rendererReexports = new Set<string>();
  for (const { specifier, kind, typeOnly, locals } of moduleDependencies(
    text,
  )) {
    if (typeOnly) continue;
    const classification = classifyModuleSpecifier(specifier);
    if (classification === 'image-renderer') {
      rendererSpecifiers.add(specifier);
      if (kind === 'reexport') rendererReexports.add(specifier);
      for (const local of locals) rendererLocals.add(local);
      // A bare or dynamic import of a renderer module, and `export * from`
      // one, name no local and still put a renderer within reach.
      if (locals.length === 0) rendererLocals.add(specifier);
      continue;
    }
    if (classification === 'unrecognized') unrecognizedSpecifiers.add(specifier);
  }
  return {
    rendererLocals: [...rendererLocals].sort(),
    rendererSpecifiers: [...rendererSpecifiers].sort(),
    unrecognizedSpecifiers: [...unrecognizedSpecifiers].sort(),
    rendererReexports: [...rendererReexports].sort(),
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
  const dependencies = moduleDependencies(text);
  const { rendererLocals, rendererReexports } = moduleRendererUse(text);
  if (rendererReexports.length > 0) {
    throw new Error(
      `${module} re-exports ${rendererReexports.join(', ')}; the render boundary must construct its renderer, not forward one`,
    );
  }
  if (rendererLocals.length !== 1) {
    throw new Error(
      `${module} binds ${rendererLocals.length} image renderer value(s) (${
        rendererLocals.join(', ') || 'none'
      }); the render boundary must bind exactly one`,
    );
  }
  const renderer = rendererLocals[0];
  // A re-export forwards the name without binding it, so only an `import`
  // puts the seal opener in scope here.
  const opensSeal = dependencies.some(
    ({ kind, locals }) => kind === 'import' && locals.includes(sealOpener),
  );
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

