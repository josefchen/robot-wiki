import { extname } from 'node:path';
import {
  buildModuleImportGraph,
  type ModuleImportGraph,
} from './module-import-graph.ts';
import { stripComments } from './source-comments.ts';

export { stripComments } from './source-comments.ts';

/**
 * The source half of the surface/control population (VAL-B2-SURF-010:
 * "source, registry, and rendered populations are equal") and the ownership
 * half of VAL-B2-COMP-013 ("A control/state registry assigns ... owner
 * route/mount").
 *
 * A rendered-DOM sweep alone cannot see an ID that only some unvisited route
 * paints, and a registry read alone cannot see an ID a component invents. So
 * the population is read straight out of first-party source and reconciled
 * against the registry independently of any browser run.
 *
 * What is read is the ANNOTATION ASSIGNMENT, not a quoted string. Scanning
 * quoted literals got two things wrong at once. It missed every finite
 * dynamic writer — `components/ui/brand-device.tsx` assigns
 * `device:${device}` for a four-member union and `components/ui/card.tsx`
 * assigns `surface:${level}`, so both were invisible and `device:outer-rail`
 * was recorded as written by nothing. And it counted read-only comparisons
 * as definitions: `lib/brand-v2-reference-rubric.ts` only compares
 * `dataset.brandSurfaceId` with `surface:bounded-dark-instrument`, yet was
 * recorded as defining it. Each assignment's expression is therefore
 * resolved to its finite ID set, and an expression this resolver cannot
 * enumerate throws rather than contributing a silently short population.
 *
 * Writing an ID is not owning it, and being reachable is not being mounted.
 * `components/ui/card.tsx` can assign `surface:raised`, but every mounted
 * `<Card>` omits `level`, so the only ID that module supplies in production
 * is `surface:flat`. Ownership therefore resolves the variant each mounted
 * call site actually passes, and a call site that passes a computed value
 * throws instead of guessing.
 *
 * Import reachability answers a weaker question than production ownership,
 * and treating the two as one recorded two false owners. `mdx-components.tsx`
 * exposes the whole design-system registry to every MDX body, so every
 * component it lists is import-reachable from a route entry; being available
 * to an author is not being used by one. `components/ui/code-block.tsx` is
 * registered there, is mounted by no `<CodeBlock>` anywhere in app/, content/
 * or components/, and was nonetheless recorded as a `surface:flat` production
 * owner — as was `components/ui/copy-button.tsx`, whose only caller is that
 * unmounted component. Ownership therefore walks concrete mounts: JSX call
 * sites resolved through import bindings, deferred `dynamic(() => import())`
 * mounts, MDX tags resolved through the global registry, and the registry's
 * lowercase element overrides, which markdown itself emits.
 */
export type AnnotationKind = 'surface' | 'control' | 'device';

/** How an assignment's ID set was enumerated. */
export type AnnotationWriteForm =
  /** A quoted ID in the assignment itself. */
  | 'literal'
  /** Driven by a parameter whose finite variants map onto IDs. */
  | 'parameter'
  /** A conditional whose every branch resolves to a literal ID. */
  | 'condition';

export type AnnotationWrite = {
  module: string;
  kind: AnnotationKind;
  form: AnnotationWriteForm;
  /** Every ID this assignment can produce. */
  ids: readonly string[];
  /** Present for `parameter` writes: which variant value yields which ID. */
  parameter?: {
    name: string;
    idByVariant: Readonly<Record<string, string>>;
    defaultVariant: string | null;
  };
};

export type AnnotationScan = {
  /** First-party modules scanned for assignments, repository-relative. */
  modules: readonly string[];
  /** Modules reachable from a route entry through used imports. */
  importReachableModules: readonly string[];
  /**
   * Modules a route entry concretely mounts, through JSX call sites, MDX
   * tags, the MDX registry's element overrides, or a deferred dynamic
   * import. A strict subset of `importReachableModules`.
   */
  mountedModules: readonly string[];
  /** Route-entry modules both walks start from. */
  routeEntries: readonly string[];
  /** Every resolved annotation assignment, in module order. */
  writes: readonly AnnotationWrite[];
  surfaceIds: readonly string[];
  controlIds: readonly string[];
  deviceIds: readonly string[];
  /** Modules whose assignments can write each ID, by ID. */
  ownersById: Readonly<Record<string, readonly string[]>>;
  /** Modules that write each ID on a production route, by ID. */
  productionOwnersById: Readonly<Record<string, readonly string[]>>;
  /** Writers whose assignment no production route reaches, by ID. */
  unmountedOwnersById: Readonly<Record<string, readonly string[]>>;
};

const SCAN_ROOTS = ['app', 'components', 'lib'] as const;
const SCAN_FILES = ['mdx-components.tsx'] as const;
const CONTENT_ROOT = 'content';
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx']);
const MDX_REGISTRY_MODULE = 'mdx-components.tsx';
const ID_PATTERN = /^(surface|control|device):[a-z0-9-]+$/;
const ATTRIBUTE_ASSIGNMENT = /data-brand-(surface|control|device)-id\s*=\s*/g;
const DATASET_ASSIGNMENT =
  /\.dataset\.brand(Surface|Control|Device)Id\s*=(?!=)/g;
/** Next.js App Router segment files; each is an entry into the rendered tree. */
const ROUTE_SEGMENT_FILES = new Set([
  'page.tsx',
  'layout.tsx',
  'template.tsx',
  'not-found.tsx',
  'error.tsx',
  'global-error.tsx',
  'loading.tsx',
  'default.tsx',
]);


function readQuoted(text: string, start: number): { value: string; end: number } {
  const quote = text[start];
  let index = start + 1;
  let value = '';
  while (index < text.length) {
    if (text[index] === '\\') {
      value += text[index + 1];
      index += 2;
      continue;
    }
    if (text[index] === quote) return { value, end: index + 1 };
    value += text[index];
    index += 1;
  }
  throw new Error('Unterminated string literal in annotation assignment');
}

/** The balanced `{...}` expression of a JSX attribute value. */
function readBraced(text: string, start: number): { value: string; end: number } {
  let depth = 0;
  let index = start;
  while (index < text.length) {
    const char = text[index];
    if (char === '"' || char === "'" || char === '`') {
      index = readQuoted(text, index).end;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { value: text.slice(start + 1, index), end: index + 1 };
      }
    }
    index += 1;
  }
  throw new Error('Unbalanced expression in annotation assignment');
}

function splitTopLevelConditional(
  expression: string,
): { consequent: string; alternate: string } | null {
  let depth = 0;
  let questionAt = -1;
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (char === '"' || char === "'" || char === '`') {
      index = readQuoted(expression, index).end;
      continue;
    }
    if ('([{'.includes(char)) depth += 1;
    else if (')]}'.includes(char)) depth -= 1;
    else if (char === '?' && depth === 0 && expression[index + 1] !== '.') {
      questionAt = index;
      break;
    }
    index += 1;
  }
  if (questionAt === -1) return null;
  let nested = 0;
  index = questionAt + 1;
  while (index < expression.length) {
    const char = expression[index];
    if (char === '"' || char === "'" || char === '`') {
      index = readQuoted(expression, index).end;
      continue;
    }
    if ('([{'.includes(char)) depth += 1;
    else if (')]}'.includes(char)) depth -= 1;
    else if (char === '?' && depth === 0) nested += 1;
    else if (char === ':' && depth === 0) {
      if (nested === 0) {
        return {
          consequent: expression.slice(questionAt + 1, index),
          alternate: expression.slice(index + 1),
        };
      }
      nested -= 1;
    }
    index += 1;
  }
  throw new Error(`Unbalanced conditional in annotation assignment: ${expression}`);
}

function unionMembers(type: string): string[] | null {
  const parts = type
    .replace(/^\s*\|/, '')
    .split('|')
    .map((part) => part.trim());
  const members: string[] = [];
  for (const part of parts) {
    const quoted = /^(['"])(.*)\1$/.exec(part);
    if (!quoted) return null;
    members.push(quoted[2]);
  }
  return members.length > 0 ? members : null;
}

/** The balanced object literal assigned to `const <name>`. */
function objectLiteralEntries(
  name: string,
  text: string,
): Record<string, string> | null {
  const declaration = new RegExp(`\\bconst\\s+${name}\\b[^=]*=\\s*\\{`).exec(text);
  if (!declaration) return null;
  const braceAt = text.indexOf('{', declaration.index);
  const { value } = readBraced(text, braceAt);
  const entries: Record<string, string> = {};
  const pattern = /(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*(?:'([^']+)'|"([^"]+)")/g;
  for (const match of value.matchAll(pattern)) {
    const key = match[1] ?? match[2] ?? match[3];
    const entryValue = match[4] ?? match[5];
    if (key === undefined || entryValue === undefined) continue;
    entries[key] = entryValue;
  }
  return Object.keys(entries).length > 0 ? entries : null;
}

type ParameterFacts = { variants: string[]; defaultVariant: string | null };

/**
 * The finite variant set of a parameter that drives an assignment, read from
 * its declared type. A parameter whose type is not a closed union of string
 * literals cannot be enumerated, and the caller throws rather than recording
 * a partial ID set.
 */
function parameterFacts(name: string, text: string): ParameterFacts | null {
  const declaration = new RegExp(
    `\\b${name}\\s*\\??:\\s*([^;,\\n)}]+(?:\\n\\s*\\|[^;,\\n)}]+)*)`,
  ).exec(text);
  if (!declaration) return null;
  const declared = declaration[1].trim();
  let variants = unionMembers(declared);
  if (variants === null && /^[A-Za-z_$][\w$]*$/.test(declared)) {
    const alias = new RegExp(`\\btype\\s+${declared}\\s*=\\s*([^;]+);`).exec(text);
    if (alias) variants = unionMembers(alias[1]);
  }
  if (variants === null) return null;
  const defaultMatch = new RegExp(`\\b${name}\\s*=\\s*(['"])([^'"]+)\\1`).exec(text);
  return {
    variants,
    defaultVariant: defaultMatch ? defaultMatch[2] : null,
  };
}

type ResolvedExpression = {
  form: AnnotationWriteForm;
  ids: string[];
  parameter?: AnnotationWrite['parameter'];
};

function resolveExpression(
  expression: string,
  module: string,
  text: string,
  depth = 0,
): ResolvedExpression {
  if (depth > 4) {
    throw new Error(`${module}: annotation assignment nests too deeply`);
  }
  const trimmed = expression.trim().replace(/^\((.*)\)$/s, '$1').trim();
  const quoted = /^(['"])(.*)\1$/s.exec(trimmed);
  if (quoted) return { form: 'literal', ids: [quoted[2]] };

  const template = /^`([^`]*)`$/s.exec(trimmed);
  if (template) {
    const body = template[1];
    const interpolations = [...body.matchAll(/\$\{([^}]*)\}/g)];
    if (interpolations.length === 0) {
      return { form: 'literal', ids: [body] };
    }
    if (interpolations.length > 1) {
      throw new Error(
        `${module}: annotation template ${trimmed} interpolates more than one expression`,
      );
    }
    const name = interpolations[0][1].trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
      throw new Error(
        `${module}: annotation template ${trimmed} interpolates a computed expression`,
      );
    }
    const facts = parameterFacts(name, text);
    if (!facts) {
      throw new Error(
        `${module}: cannot enumerate the variants of ${name} used by ${trimmed}`,
      );
    }
    const [prefix, suffix] = body.split(interpolations[0][0]);
    const idByVariant = Object.fromEntries(
      facts.variants.map((variant) => [variant, `${prefix}${variant}${suffix}`]),
    );
    return {
      form: 'parameter',
      ids: Object.values(idByVariant),
      parameter: { name, idByVariant, defaultVariant: facts.defaultVariant },
    };
  }

  const conditional = splitTopLevelConditional(trimmed);
  if (conditional) {
    const consequent = resolveExpression(
      conditional.consequent,
      module,
      text,
      depth + 1,
    );
    const alternate = resolveExpression(
      conditional.alternate,
      module,
      text,
      depth + 1,
    );
    return {
      form: 'condition',
      ids: [...new Set([...consequent.ids, ...alternate.ids])],
    };
  }

  const indexed = /^([A-Za-z_$][\w$]*)\[\s*([A-Za-z_$][\w$]*)\s*\]$/.exec(trimmed);
  if (indexed) {
    const entries = objectLiteralEntries(indexed[1], text);
    if (!entries) {
      throw new Error(
        `${module}: cannot enumerate the entries of ${indexed[1]} used by ${trimmed}`,
      );
    }
    const facts = parameterFacts(indexed[2], text);
    const variants = facts?.variants ?? Object.keys(entries);
    const idByVariant: Record<string, string> = {};
    for (const variant of variants) {
      const id = entries[variant];
      if (id === undefined) {
        throw new Error(
          `${module}: ${indexed[1]} has no entry for the ${indexed[2]} variant ${variant}`,
        );
      }
      idByVariant[variant] = id;
    }
    return {
      form: 'parameter',
      ids: [...new Set(Object.values(idByVariant))],
      parameter: {
        name: indexed[2],
        idByVariant,
        defaultVariant: facts?.defaultVariant ?? null,
      },
    };
  }

  if (/^[A-Za-z_$][\w$]*$/.test(trimmed)) {
    const binding = new RegExp(`\\bconst\\s+${trimmed}\\s*=\\s*([^;]+);`).exec(text);
    if (!binding) {
      throw new Error(
        `${module}: annotation assignment reads ${trimmed}, which is not a local constant`,
      );
    }
    return resolveExpression(binding[1], module, text, depth + 1);
  }

  throw new Error(
    `${module}: annotation assignment ${trimmed} is computed and cannot be enumerated`,
  );
}

function assignmentsIn(
  module: string,
  rawText: string,
): AnnotationWrite[] {
  const text = stripComments(rawText);
  const writes: AnnotationWrite[] = [];
  const record = (kind: AnnotationKind, at: number) => {
    let index = at;
    while (index < text.length && /\s/.test(text[index])) index += 1;
    const char = text[index];
    let expression: string;
    if (char === '"' || char === "'") {
      const { value } = readQuoted(text, index);
      expression = JSON.stringify(value);
    } else if (char === '{') {
      expression = readBraced(text, index).value;
    } else {
      throw new Error(
        `${module}: data-brand-${kind}-id is assigned an unreadable value`,
      );
    }
    const resolved = resolveExpression(expression, module, text);
    for (const id of resolved.ids) {
      if (!ID_PATTERN.test(id) || !id.startsWith(`${kind}:`)) {
        throw new Error(
          `${module}: data-brand-${kind}-id resolves to ${id}, which is not a ${kind} ID`,
        );
      }
    }
    writes.push({
      module,
      kind,
      form: resolved.form,
      ids: resolved.ids,
      ...(resolved.parameter ? { parameter: resolved.parameter } : {}),
    });
  };
  for (const match of text.matchAll(ATTRIBUTE_ASSIGNMENT)) {
    record(match[1] as AnnotationKind, match.index + match[0].length);
  }
  for (const match of text.matchAll(DATASET_ASSIGNMENT)) {
    record(
      match[1].toLowerCase() as AnnotationKind,
      match.index + match[0].length,
    );
  }
  return writes;
}

/** The exported component whose parameter drives a `parameter` write. */
function componentFor(
  module: string,
  text: string,
  parameterName: string,
): string {
  const candidates = [
    ...text.matchAll(/export\s+function\s+([A-Z][\w$]*)\s*\(\s*\{([^}]*)\}/g),
  ].filter(([, , destructured]) =>
    new RegExp(`\\b${parameterName}\\b`).test(destructured),
  );
  if (candidates.length !== 1) {
    throw new Error(
      `${module}: expected exactly one exported component destructuring ${parameterName}, found ${candidates.length}`,
    );
  }
  return candidates[0][1];
}

/** Component names an MDX body can mount without importing them. */
function mdxRegistryBindings(
  graph: ModuleImportGraph,
): Map<string, string> {
  const text = graph.textByModule.get(MDX_REGISTRY_MODULE);
  const provided = new Map<string, string>();
  if (text === undefined) return provided;
  const bindings = new Map(
    (graph.bindingsByModule.get(MDX_REGISTRY_MODULE) ?? []).map((binding) => [
      binding.local,
      binding.module,
    ]),
  );
  const registry = /useMDXComponents\s*\([^)]*\)\s*:\s*MDXComponents\s*\{/.exec(
    text,
  );
  if (!registry) {
    throw new Error(`${MDX_REGISTRY_MODULE} exposes no MDX component registry`);
  }
  const body = text.slice(registry.index);
  for (const match of body.matchAll(
    /(?:^|[\s{,])([A-Za-z][\w$]*)\s*(?::\s*([A-Za-z][\w$]*))?\s*,/g,
  )) {
    const name = match[1];
    const value = match[2] ?? name;
    const target = bindings.get(value);
    if (target !== undefined) provided.set(name, target);
  }
  return provided;
}

/** Component tag names a module's JSX mounts, by their root identifier. */
function componentTagsIn(text: string): Set<string> {
  const tags = new Set<string>();
  for (const match of text.matchAll(/<([A-Z][\w$]*(?:\.[A-Za-z][\w$]*)*)[\s/>]/g)) {
    tags.add(match[1].split('.')[0]);
  }
  return tags;
}

/**
 * Local names a module binds to a deferred mount. `next/dynamic` is how the
 * playground defers its WebGL scene, and the resulting `<RobotScene>` is a
 * concrete mount even though no import statement binds that name.
 */
function dynamicComponentBindings(
  graph: ModuleImportGraph,
  module: string,
  text: string,
): Map<string, string> {
  const bindings = new Map<string, string>();
  const declaration =
    /\b(?:const|let|var)\s+([A-Z][\w$]*)\s*=\s*dynamic\s*\(([^;]*?)\)\s*;/g;
  for (const match of text.matchAll(declaration)) {
    const specifier = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/.exec(match[2]);
    if (!specifier) continue;
    const target = graph.resolveSpecifier(specifier[1], module);
    if (target !== null) bindings.set(match[1], target);
  }
  return bindings;
}

/**
 * The modules a route entry concretely mounts.
 *
 * The walk follows rendered call sites rather than imports: a module joins
 * the set only when a module already in it renders one of its components.
 * That is the difference between `<CodeBlock>` appearing somewhere and
 * `CodeBlock` merely being importable, and it propagates — a component whose
 * only caller is itself unmounted stays out.
 */
function mountedFrom(
  graph: ModuleImportGraph,
  entries: readonly string[],
  mdxProvided: ReadonlyMap<string, string>,
): Set<string> {
  // Markdown emits the registry's lowercase element overrides itself, so a
  // component mapped onto `h2` or `a` is mounted by every MDX body without
  // any authored tag; a capitalised entry needs one.
  const elementOverrides = [...mdxProvided]
    .filter(([name]) => /^[a-z]/.test(name))
    .map(([, target]) => target);
  const mounted = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const current = queue.pop() as string;
    if (mounted.has(current)) continue;
    const text = graph.textByModule.get(current);
    if (text === undefined) {
      throw new Error(`Unknown module in mount walk: ${current}`);
    }
    mounted.add(current);
    const source = stripComments(text);
    const isMdx = extname(current) === '.mdx';
    if (isMdx) queue.push(...elementOverrides);
    const bindings = new Map(
      (graph.bindingsByModule.get(current) ?? []).map((binding) => [
        binding.local,
        binding.module,
      ]),
    );
    const deferred = dynamicComponentBindings(graph, current, source);
    for (const tag of componentTagsIn(source)) {
      const target =
        bindings.get(tag) ??
        deferred.get(tag) ??
        (isMdx ? mdxProvided.get(tag) : undefined);
      if (target !== undefined) queue.push(target);
    }
  }
  return mounted;
}

function attributeValueAt(
  module: string,
  component: string,
  attributes: string,
  parameterName: string,
): string | null {
  const literal = new RegExp(
    `\\b${parameterName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*(['"])([^'"]*)\\3\\s*\\})`,
  ).exec(attributes);
  if (literal) return literal[1] ?? literal[2] ?? literal[4];
  if (new RegExp(`\\b${parameterName}\\s*=`).test(attributes)) {
    throw new Error(
      `${module}: <${component}> passes a computed ${parameterName}, so its annotation variant cannot be resolved`,
    );
  }
  return null;
}

/**
 * The IDs a write supplies on a production route. A literal or conditional
 * write supplies everything it can produce, but only once a route entry
 * concretely mounts the module that carries it; a parameter-driven write
 * supplies only the variants its mounted call sites actually pass.
 */
function suppliedIds(
  write: AnnotationWrite,
  graph: ModuleImportGraph,
  mounted: ReadonlySet<string>,
  mdxProvided: ReadonlyMap<string, string>,
): string[] {
  if (!mounted.has(write.module)) return [];
  if (write.parameter === undefined) return [...write.ids];
  const text = graph.textByModule.get(write.module) as string;
  const component = componentFor(write.module, text, write.parameter.name);
  const supplied = new Set<string>();
  for (const callSite of mounted) {
    if (callSite === write.module) continue;
    const bound =
      (graph.bindingsByModule.get(callSite) ?? []).some(
        (binding) =>
          binding.local === component && binding.module === write.module,
      ) ||
      (extname(callSite) === '.mdx' &&
        mdxProvided.get(component) === write.module);
    if (!bound) continue;
    const callText = graph.textByModule.get(callSite) as string;
    const mounts = [
      ...stripComments(callText).matchAll(
        new RegExp(`<${component}\\b([^>]*)>`, 'g'),
      ),
    ];
    for (const mount of mounts) {
      const variant =
        attributeValueAt(
          callSite,
          component,
          mount[1],
          write.parameter.name,
        ) ?? write.parameter.defaultVariant;
      if (variant === null) {
        throw new Error(
          `${callSite}: <${component}> omits ${write.parameter.name} and the component declares no default`,
        );
      }
      const id = write.parameter.idByVariant[variant];
      if (id === undefined) {
        throw new Error(
          `${callSite}: <${component}> passes ${write.parameter.name}="${variant}", which is not a registered variant`,
        );
      }
      supplied.add(id);
    }
  }
  return [...supplied];
}

export function scanAnnotationAssignments(root: string): AnnotationScan {
  const graph = buildModuleImportGraph(root);
  const modules = graph.modules
    .filter((modulePath) => SCAN_EXTENSIONS.has(extname(modulePath)))
    .filter(
      (modulePath) =>
        SCAN_ROOTS.some((directory) => modulePath.startsWith(`${directory}/`)) ||
        SCAN_FILES.includes(modulePath as (typeof SCAN_FILES)[number]),
    );
  if (modules.length === 0) {
    throw new Error('No first-party modules to scan for brand annotations.');
  }

  const writes: AnnotationWrite[] = [];
  for (const modulePath of modules) {
    writes.push(
      ...assignmentsIn(
        modulePath,
        graph.textByModule.get(modulePath) as string,
      ),
    );
  }
  if (writes.length === 0) {
    throw new Error('No module assigns a data-brand primitive annotation.');
  }
  // An MDX body cannot be resolved by this scanner, so an annotation
  // authored there would leave the population short without saying so.
  for (const modulePath of graph.modules) {
    if (extname(modulePath) !== '.mdx') continue;
    const text = stripComments(graph.textByModule.get(modulePath) as string);
    if (/data-brand-(surface|control|device)-id/.test(text)) {
      throw new Error(
        `${modulePath} assigns a brand primitive annotation in MDX, which this scan does not resolve.`,
      );
    }
  }

  const routeEntries = graph.modules
    .filter(
      (modulePath) =>
        (modulePath.startsWith('app/') &&
          ROUTE_SEGMENT_FILES.has(modulePath.split('/').at(-1) ?? '')) ||
        modulePath.startsWith(`${CONTENT_ROOT}/`) ||
        modulePath === MDX_REGISTRY_MODULE,
    )
    .sort();
  const reachable = graph.reachableFrom(routeEntries);
  const mdxProvided = mdxRegistryBindings(graph);
  const mounted = mountedFrom(graph, routeEntries, mdxProvided);
  for (const modulePath of mounted) {
    if (!reachable.has(modulePath)) {
      throw new Error(
        `${modulePath} is mounted by a route entry but is not import-reachable from one, so the two walks disagree`,
      );
    }
  }

  const owners = new Map<string, Set<string>>();
  const productionOwners = new Map<string, Set<string>>();
  for (const write of writes) {
    const supplied = new Set(suppliedIds(write, graph, mounted, mdxProvided));
    for (const id of write.ids) {
      const seen = owners.get(id) ?? new Set<string>();
      seen.add(write.module);
      owners.set(id, seen);
      if (!supplied.has(id)) continue;
      const producing = productionOwners.get(id) ?? new Set<string>();
      producing.add(write.module);
      productionOwners.set(id, producing);
    }
  }

  const ids = [...owners.keys()].sort();
  const sorted = (values: Iterable<string>) => [...values].sort();
  const ownersById = Object.fromEntries(
    ids.map((id) => [id, sorted(owners.get(id) ?? [])]),
  );
  const productionOwnersById = Object.fromEntries(
    ids.map((id) => [id, sorted(productionOwners.get(id) ?? [])]),
  );
  const unmountedOwnersById = Object.fromEntries(
    ids.map((id) => [
      id,
      sorted(
        [...(owners.get(id) ?? [])].filter(
          (modulePath) => !(productionOwners.get(id)?.has(modulePath) ?? false),
        ),
      ),
    ]),
  );
  return {
    modules,
    importReachableModules: [...reachable]
      .filter((modulePath) => SCAN_EXTENSIONS.has(extname(modulePath)))
      .sort(),
    mountedModules: [...mounted]
      .filter((modulePath) => SCAN_EXTENSIONS.has(extname(modulePath)))
      .sort(),
    routeEntries,
    writes,
    surfaceIds: ids.filter((id) => id.startsWith('surface:')),
    controlIds: ids.filter((id) => id.startsWith('control:')),
    deviceIds: ids.filter((id) => id.startsWith('device:')),
    ownersById,
    productionOwnersById,
    unmountedOwnersById,
  };
}
