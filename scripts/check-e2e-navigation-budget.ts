/**
 * Per-page navigation budget for the Playwright corpus.
 *
 * A Chromium renderer does not release a document when the page navigates
 * away from it. Measured on this corpus, a shared `page` walking the 47
 * published routes retains ~26MB per navigation and climbs monotonically
 * from 407MB to 1638MB; the same walk with one context per route stays flat
 * at 450-466MB. Two sweeps have already been killed by that growth -- once
 * as `Target page, context or browser has been closed`, once as
 * `net::ERR_INSUFFICIENT_RESOURCES` -- and in both cases the crash landed on
 * a later, innocent test rather than the sweep that spent the memory.
 *
 * This check counts, statically, how many navigations any single page object
 * performs inside one test, and fails when a page exceeds the budget. The
 * fix is never to shrink a sweep's route coverage: it is to give each route
 * its own context, which `tests/e2e/helpers/per-route-context.ts` does.
 *
 * Usage: node scripts/check-e2e-navigation-budget.ts [--json]
 */
import ts from 'typescript6';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const E2E_DIR = join(ROOT, 'tests', 'e2e');

/**
 * Navigations per page object allowed inside a single test. Chosen from the
 * measured ~26MB-per-navigation retention: 16 navigations is ~420MB of
 * retained renderer memory, which is the largest bound that still leaves
 * every genuinely-bounded test in the corpus untouched while sitting far
 * below the 1.2-1.8GB growth that killed the two sweeps.
 */
export const NAVIGATION_BUDGET = 16;

/** Page methods that load a fresh document into the same renderer. */
const NAV_METHODS = new Set(['goto', 'reload']);

const TEST_CALLEES = new Set([
  'test',
  'test.only',
  'test.fixme',
  'test.skip',
  'test.beforeEach',
  'test.afterEach',
  'test.beforeAll',
  'test.afterAll',
]);

export interface PageNavigationCount {
  file: string;
  line: number;
  title: string;
  receiver: string;
  /** null when a loop cardinality could not be resolved statically. */
  navigations: number | null;
  unresolved: string[];
}

function calleeText(node: ts.Expression): string {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) {
    return `${calleeText(node.expression)}.${node.name.text}`;
  }
  return '';
}

function leftmostIdentifier(node: ts.Expression): string | null {
  let cur: ts.Node = node;
  while (ts.isPropertyAccessExpression(cur) || ts.isCallExpression(cur)) {
    cur = ts.isCallExpression(cur) ? cur.expression : cur.expression;
  }
  return ts.isIdentifier(cur) ? cur.text : null;
}

/**
 * Values a spec imports from the repository's own registries are resolved by
 * importing the registry, not by guessing: a sweep over `publishedModules()`
 * is exactly as long as the registry is, and it gets longer every time an
 * article is published. That growth is the reason this class recurs, so the
 * budget has to see the real number.
 */
type RegistryValues = Map<string, unknown>;

/**
 * Values the brand-v2 lane derives every route list from. The fixture that
 * exports `brandV2Registry` cannot be imported outside the Playwright runner
 * (it re-exports through extensionless relative specifiers), but the value it
 * exports is just this contract file, so the analyzer reads the same source.
 */
const EXTERNAL_VALUE_SOURCES: Record<string, () => unknown> = {
  brandV2Registry: () =>
    JSON.parse(
      readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
    ),
};

async function importRelative(
  file: string,
  specifier: string,
): Promise<Record<string, unknown> | null> {
  if (!specifier.startsWith('.')) return null;
  try {
    const target = resolve(dirname(file), specifier);
    return (await import(
      pathToFileURL(target.endsWith('.ts') ? target : `${target}.ts`).href
    )) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function loadRegistryValues(
  source: ts.SourceFile,
  file: string,
): Promise<RegistryValues> {
  const values: RegistryValues = new Map();

  const bindNamed = (
    mod: Record<string, unknown>,
    elements: readonly (ts.ImportSpecifier | ts.BindingElement)[],
  ) => {
    for (const element of elements) {
      if (!ts.isIdentifier(element.name)) continue;
      const propertyName = element.propertyName;
      const exported =
        propertyName && ts.isIdentifier(propertyName)
          ? propertyName.text
          : element.name.text;
      if (!(exported in mod)) continue;
      values.set(element.name.text, mod[exported]);
    }
  };

  const pending: Array<() => Promise<void>> = [];
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && EXTERNAL_VALUE_SOURCES[node.text] && !values.has(node.text)) {
      try {
        values.set(node.text, EXTERNAL_VALUE_SOURCES[node.text]());
      } catch {
        /* contract file absent; leave unresolved */
      }
    }
    if (ts.isImportDeclaration(node)) {
      const spec = node.moduleSpecifier;
      const bindings = node.importClause?.namedBindings;
      if (ts.isStringLiteral(spec) && bindings && ts.isNamedImports(bindings)) {
        pending.push(async () => {
          const mod = await importRelative(file, spec.text);
          if (mod) bindNamed(mod, bindings.elements);
        });
      }
    }
    // `const { publishedModules } = await import('../../data/modules')`:
    // several sweeps derive their route list this way inside the test body.
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer &&
      ts.isAwaitExpression(node.initializer) &&
      ts.isCallExpression(node.initializer.expression) &&
      node.initializer.expression.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const [arg] = node.initializer.expression.arguments;
      const pattern = node.name;
      if (arg && ts.isStringLiteral(arg)) {
        pending.push(async () => {
          const mod = await importRelative(file, arg.text);
          if (mod) bindNamed(mod, pattern.elements);
        });
      }
    }
    node.forEachChild(visit);
  };
  source.forEachChild(visit);
  for (const task of pending) await task();
  return values;
}

interface Scope {
  /** Loop depth at which each binding in this scope was declared. */
  bindings: Map<string, number>;
  /** Initializers of `const` bindings, for cardinality resolution. */
  inits: Map<string, ts.Expression>;
}

interface LoopFrame {
  cardinality: number | null;
  description: string;
}

class BodyAnalyzer {
  private readonly scopes: Scope[] = [];
  private readonly loops: LoopFrame[] = [];
  readonly perReceiver = new Map<
    string,
    { navigations: number | null; unresolved: string[] }
  >();

  readonly source: ts.SourceFile;
  readonly fileScope: Scope;
  readonly registry: RegistryValues;

  constructor(source: ts.SourceFile, fileScope: Scope, registry: RegistryValues) {
    this.source = source;
    this.fileScope = fileScope;
    this.registry = registry;
  }

  private lookupInit(name: string): ts.Expression | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i -= 1) {
      const found = this.scopes[i].inits.get(name);
      if (found) return found;
    }
    return this.fileScope.inits.get(name);
  }

  private lookupDeclLoopDepth(name: string): number {
    for (let i = this.scopes.length - 1; i >= 0; i -= 1) {
      const found = this.scopes[i].bindings.get(name);
      if (found !== undefined) return found;
    }
    return 0;
  }

  /** Upper bound on how many times a `for...of` iterable yields. */
  private cardinality(expr: ts.Expression, seen = new Set<string>()): number | null {
    if (ts.isArrayLiteralExpression(expr)) {
      let total = 0;
      for (const element of expr.elements) {
        if (ts.isSpreadElement(element)) {
          const inner = this.cardinality(element.expression, seen);
          if (inner === null) return null;
          total += inner;
        } else {
          total += 1;
        }
      }
      return total;
    }
    if (ts.isIdentifier(expr)) {
      if (seen.has(expr.text)) return null;
      seen.add(expr.text);
      const registryValue = this.registry.get(expr.text);
      if (Array.isArray(registryValue)) return registryValue.length;
      const init = this.lookupInit(expr.text);
      return init ? this.cardinality(init, seen) : null;
    }
    if (ts.isAsExpression(expr) || ts.isParenthesizedExpression(expr)) {
      return this.cardinality(expr.expression, seen);
    }
    if (ts.isNonNullExpression(expr)) return this.cardinality(expr.expression, seen);
    if (ts.isPropertyAccessExpression(expr)) {
      const path: string[] = [];
      let cur: ts.Expression = expr;
      while (ts.isPropertyAccessExpression(cur)) {
        path.unshift(cur.name.text);
        cur = cur.expression;
      }
      if (!ts.isIdentifier(cur)) return null;
      if (path[path.length - 1] === 'length') {
        path.pop();
        // `for (let i = 0; i < NAMES.length; i += 1)` iterates NAMES times.
      }
      let value: unknown = this.registry.get(cur.text);
      if (value === undefined) {
        const init = this.lookupInit(cur.text);
        if (init && path.length === 0) return this.cardinality(init, seen);
        return null;
      }
      for (const key of path) {
        if (value === null || typeof value !== 'object') return null;
        value = (value as Record<string, unknown>)[key];
      }
      return Array.isArray(value) ? value.length : null;
    }
    if (ts.isCallExpression(expr)) {
      const callee = expr.expression;
      if (ts.isIdentifier(callee)) {
        const registryValue = this.registry.get(callee.text);
        if (typeof registryValue === 'function' && expr.arguments.length === 0) {
          try {
            const produced = (registryValue as () => unknown)();
            if (Array.isArray(produced)) return produced.length;
          } catch {
            return null;
          }
        }
        return null;
      }
      if (!ts.isPropertyAccessExpression(callee)) return null;
      const method = callee.name.text;
      // `filter` can only shrink and `map` preserves length, so the base
      // cardinality is a sound upper bound for both.
      if (method === 'map' || method === 'filter' || method === 'flat') {
        return this.cardinality(callee.expression, seen);
      }
      if (method === 'slice') {
        const [start, end] = expr.arguments;
        if (
          start &&
          end &&
          ts.isNumericLiteral(start) &&
          ts.isNumericLiteral(end)
        ) {
          return Number(end.text) - Number(start.text);
        }
        return this.cardinality(callee.expression, seen);
      }
      if (method === 'concat') {
        let total = this.cardinality(callee.expression, seen);
        if (total === null) return null;
        for (const arg of expr.arguments) {
          const inner = this.cardinality(arg, seen);
          if (inner === null) return null;
          total += inner;
        }
        return total;
      }
      if (
        (method === 'entries' || method === 'keys' || method === 'values') &&
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === 'Object'
      ) {
        const [arg] = expr.arguments;
        if (!arg) return null;
        if (ts.isObjectLiteralExpression(arg)) return arg.properties.length;
        if (ts.isIdentifier(arg)) {
          const init = this.lookupInit(arg.text);
          if (init && ts.isObjectLiteralExpression(init)) return init.properties.length;
          const registryValue = this.registry.get(arg.text);
          if (registryValue && typeof registryValue === 'object') {
            return Object.keys(registryValue).length;
          }
        }
        return null;
      }
      return null;
    }
    return null;
  }

  /**
   * Upper bound on the trip count of a counted `for`. A `&&` guard such as
   * `attempt < 3 && !rendered` can only end the loop sooner, so the numeric
   * side alone is a sound bound.
   */
  private boundOfCondition(condition: ts.Expression): number | null {
    if (ts.isParenthesizedExpression(condition)) {
      return this.boundOfCondition(condition.expression);
    }
    if (!ts.isBinaryExpression(condition)) return null;
    const operator = condition.operatorToken.kind;
    if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
      const left = this.boundOfCondition(condition.left);
      const right = this.boundOfCondition(condition.right);
      if (left === null) return right;
      if (right === null) return left;
      return Math.min(left, right);
    }
    if (
      operator !== ts.SyntaxKind.LessThanToken &&
      operator !== ts.SyntaxKind.LessThanEqualsToken
    ) {
      return null;
    }
    const bound = ts.isNumericLiteral(condition.right)
      ? Number(condition.right.text)
      : this.cardinality(condition.right);
    if (bound === null) return null;
    return operator === ts.SyntaxKind.LessThanEqualsToken ? bound + 1 : bound;
  }

  private loopFrameFor(node: ts.Node): LoopFrame | null {
    const line =
      this.source.getLineAndCharacterOfPosition(node.getStart(this.source)).line + 1;
    if (ts.isForOfStatement(node)) {
      return {
        cardinality: this.cardinality(node.expression),
        description: `for...of at line ${line}`,
      };
    }
    if (ts.isForStatement(node)) {
      return {
        cardinality: node.condition ? this.boundOfCondition(node.condition) : null,
        description: `for at line ${line}`,
      };
    }
    if (ts.isForInStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) {
      return { cardinality: null, description: `loop at line ${line}` };
    }
    return null;
  }

  private record(receiver: string, declDepth: number, line: number) {
    let product: number | null = 1;
    const unresolved: string[] = [];
    for (let i = declDepth; i < this.loops.length; i += 1) {
      const frame = this.loops[i];
      if (frame.cardinality === null) {
        product = null;
        unresolved.push(frame.description);
      } else if (product !== null) {
        product *= frame.cardinality;
      }
    }
    const entry = this.perReceiver.get(receiver) ?? {
      navigations: 0 as number | null,
      unresolved: [] as string[],
    };
    if (product === null || entry.navigations === null) {
      entry.navigations = null;
      entry.unresolved.push(...unresolved.map((u) => `${u} (navigation at line ${line})`));
    } else {
      entry.navigations += product;
    }
    this.perReceiver.set(receiver, entry);
  }

  private declareParameters(fn: ts.SignatureDeclarationBase) {
    for (const parameter of fn.parameters) {
      const bind = (name: ts.BindingName) => {
        if (ts.isIdentifier(name)) {
          this.scopes[this.scopes.length - 1].bindings.set(name.text, this.loops.length);
        } else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
          for (const element of name.elements) {
            if (ts.isBindingElement(element)) bind(element.name);
          }
        }
      };
      bind(parameter.name);
    }
  }

  analyze(fn: ts.FunctionLikeDeclaration) {
    this.scopes.push({ bindings: new Map(), inits: new Map() });
    this.declareParameters(fn);
    if (fn.body) this.walk(fn.body);
    this.scopes.pop();
  }

  private walk(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const scope = this.scopes[this.scopes.length - 1];
      scope.bindings.set(node.name.text, this.loops.length);
      if (node.initializer) scope.inits.set(node.name.text, node.initializer);
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (
        ts.isPropertyAccessExpression(callee) &&
        NAV_METHODS.has(callee.name.text)
      ) {
        const receiver = leftmostIdentifier(callee.expression);
        if (receiver) {
          const line =
            this.source.getLineAndCharacterOfPosition(node.getStart(this.source)).line + 1;
          this.record(receiver, this.lookupDeclLoopDepth(receiver), line);
        }
      }
    }

    const frame = this.loopFrameFor(node);
    if (frame) {
      this.loops.push(frame);
      // The iterable itself is evaluated outside the loop it drives.
      if (ts.isForOfStatement(node) || ts.isForInStatement(node)) {
        this.scopes.push({ bindings: new Map(), inits: new Map() });
        if (ts.isVariableDeclarationList(node.initializer)) {
          for (const decl of node.initializer.declarations) {
            if (ts.isIdentifier(decl.name)) {
              this.scopes[this.scopes.length - 1].bindings.set(
                decl.name.text,
                this.loops.length,
              );
            }
          }
        }
        this.walk(node.statement);
        this.scopes.pop();
      } else {
        this.scopes.push({ bindings: new Map(), inits: new Map() });
        node.forEachChild((child) => this.walk(child));
        this.scopes.pop();
      }
      this.loops.pop();
      return;
    }

    // A callback's own `page` parameter is a page of its own per call, which
    // is exactly what `forEachInOwnContext` provides, so its navigations must
    // not be multiplied by the loop that drives the callback.
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      this.scopes.push({ bindings: new Map(), inits: new Map() });
      this.declareParameters(node);
      if (node.body) this.walk(node.body);
      this.scopes.pop();
      return;
    }

    if (ts.isBlock(node)) {
      this.scopes.push({ bindings: new Map(), inits: new Map() });
      node.forEachChild((child) => this.walk(child));
      this.scopes.pop();
      return;
    }

    node.forEachChild((child) => this.walk(child));
  }
}

function fileScopeOf(source: ts.SourceFile): Scope {
  const scope: Scope = { bindings: new Map(), inits: new Map() };
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      scope.inits.set(node.name.text, node.initializer);
    }
    node.forEachChild(visit);
  };
  source.forEachChild(visit);
  return scope;
}

function literalTitle(node: ts.Expression | undefined): string {
  if (!node) return '(untitled)';
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return node.getText();
}

export async function collectNavigationCounts(): Promise<PageNavigationCount[]> {
  const files = readdirSync(E2E_DIR)
    .filter((name) => name.endsWith('.spec.ts'))
    .sort()
    .map((name) => join(E2E_DIR, name));

  const results: PageNavigationCount[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const registry = await loadRegistryValues(source, file);
    const fileScope = fileScopeOf(source);

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && TEST_CALLEES.has(calleeText(node.expression))) {
        const body = node.arguments[node.arguments.length - 1];
        if (
          body &&
          (ts.isArrowFunction(body) || ts.isFunctionExpression(body))
        ) {
          const analyzer = new BodyAnalyzer(source, fileScope, registry);
          analyzer.analyze(body);
          const line =
            source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          const title =
            node.arguments.length > 1
              ? literalTitle(node.arguments[0])
              : calleeText(node.expression);
          for (const [receiver, entry] of analyzer.perReceiver) {
            if (entry.navigations === 0) continue;
            results.push({
              file: relative(ROOT, file),
              line,
              title,
              receiver,
              navigations: entry.navigations,
              unresolved: entry.unresolved,
            });
          }
        }
      }
      node.forEachChild(visit);
    };
    source.forEachChild(visit);
  }
  return results;
}

/**
 * Sweeps that are still over budget. This is a ratchet, not a waiver: a page
 * that is not listed here and exceeds the budget fails the check, and a
 * listed page that has been fixed also fails until its entry is removed, so
 * the list can only shrink.
 */
export const DEBT_FILE = join(ROOT, 'contract', 'e2e-navigation-budget-debt.json');

interface DebtEntry {
  file: string;
  title: string;
  receiver: string;
  reason: string;
}

export function debtKey(row: {
  file: string;
  title: string;
  receiver: string;
}): string {
  return `${row.file}::${row.title}::${row.receiver}`;
}

export function isOverBudget(row: PageNavigationCount): boolean {
  return row.navigations === null || row.navigations > NAVIGATION_BUDGET;
}

export function describeRow(row: PageNavigationCount): string {
  const measured =
    row.navigations === null
      ? `an unbounded number of navigations (${[...new Set(row.unresolved)].join('; ')})`
      : `${row.navigations} navigations`;
  return `${row.file}:${row.line}\n    "${row.title}"\n    page \`${row.receiver}\` performs ${measured}, budget is ${NAVIGATION_BUDGET}`;
}

export function readDebt(): DebtEntry[] {
  return JSON.parse(readFileSync(DEBT_FILE, 'utf8')).entries as DebtEntry[];
}

export interface BudgetVerdict {
  counts: PageNavigationCount[];
  unlisted: PageNavigationCount[];
  stale: DebtEntry[];
}

export async function auditNavigationBudget(): Promise<BudgetVerdict> {
  const counts = await collectNavigationCounts();
  const offenders = counts.filter(isOverBudget);
  const offenderKeys = new Set(offenders.map(debtKey));
  const debt = readDebt();
  const listed = new Set(debt.map(debtKey));
  return {
    counts,
    unlisted: offenders.filter((row) => !listed.has(debtKey(row))),
    stale: debt.filter((entry) => !offenderKeys.has(debtKey(entry))),
  };
}

async function main() {
  const counts = await collectNavigationCounts();
  const ranked = [...counts].sort(
    (a, b) => (b.navigations ?? Infinity) - (a.navigations ?? Infinity),
  );
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(ranked, null, 2));
    return;
  }
  if (process.argv.includes('--rank')) {
    for (const row of ranked) {
      console.log(
        `${String(row.navigations ?? 'UNRESOLVED').padStart(11)}  ${row.file}:${row.line}  [${row.receiver}]  ${row.title.slice(0, 70)}`,
      );
    }
    return;
  }

  const { unlisted, stale } = await auditNavigationBudget();
  const problems: string[] = [];
  if (unlisted.length > 0) {
    problems.push(
      `${unlisted.length} page(s) exceed the per-page navigation budget and are not recorded as known debt:\n` +
        unlisted.map((row) => `  ${describeRow(row)}`).join('\n') +
        "\n\nA Chromium renderer retains every document it navigates away from\n(~26MB per route on this corpus), so a sweep on one shared page spends\nhundreds of megabytes and kills a later, innocent test. Do not shrink the\nsweep's route coverage: give each route its own context with\n`forEachInOwnContext` from tests/e2e/helpers/per-route-context.ts.",
    );
  }
  if (stale.length > 0) {
    problems.push(
      `${stale.length} entr(y/ies) in ${relative(ROOT, DEBT_FILE)} no longer exceed the budget; delete them:\n` +
        stale.map((entry) => `  ${entry.file} :: ${entry.title} [${entry.receiver}]`).join('\n'),
    );
  }
  if (problems.length > 0) {
    console.error(problems.join('\n\n'));
    process.exitCode = 1;
    return;
  }
  const bounded = counts.filter((row) => !isOverBudget(row));
  console.log(
    `e2e navigation budget OK: ${counts.length} navigating page(s), ${bounded.length} within the budget of ${NAVIGATION_BUDGET}, ${readDebt().length} recorded as known debt.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
