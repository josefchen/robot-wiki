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
 * two. Anything else, including a wrapper written locally, fails.
 *
 * The reading is token-based rather than regex-based because the difference
 * between `openSealedCardTree(entry.card)` and a comment or string
 * containing that text is exactly the difference this check exists to see.
 */
const IMAGE_RENDERER_SPECIFIER =
  /@vercel\/og|(?:^|[/@])satori(?:$|[/.])|(?:^|[/@])resvg(?:$|[/.])/;

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

/** Whether the module can construct an image renderer at all. */
export function importsImageRenderer(text: string): boolean {
  return moduleImports(text).some(
    ({ specifier, typeOnly }) =>
      !typeOnly && IMAGE_RENDERER_SPECIFIER.test(specifier),
  );
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
  const rendererLocals = [
    ...new Set(
      imports
        .filter(
          ({ specifier, typeOnly }) =>
            !typeOnly && IMAGE_RENDERER_SPECIFIER.test(specifier),
        )
        .flatMap(({ locals }) => locals),
    ),
  ];
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
