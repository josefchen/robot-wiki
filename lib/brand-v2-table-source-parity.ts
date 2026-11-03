import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript6';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { RootContent } from 'mdast';
import { moduleBody } from './references.ts';
import { METHODS } from '../data/methods.ts';
import { WM_PARADIGMS } from './world-model-taxonomy.ts';
import { GR2_RESULTS } from './wbc-decomposition.ts';
import { MDP_ROWS } from './contact-geometry.ts';
import { SURGICAL_SYSTEM_ROWS } from './surgical-systems.ts';
import { MPC_RL_COMPARISON_ROWS } from './mpc-vs-rl.ts';
import { SCALING_LAW_ROWS } from './data-scaling.ts';
import { normalized } from './brand-v2-source-oracle-core.ts';
import type { SourceParityVerdict } from './brand-v2-source-parity.ts';
import type { BrandV2Registry } from './brand-v2-runners.ts';
import type { ReleaseInteractionDetails } from './brand-v2-release-interaction-details.ts';
import { RELEASE_PROFILES } from './brand-v2-release-evidence.ts';
import { readReleaseStateIndex } from './brand-v2-release-index.ts';
import { iterateReleaseProfileRows, type ReleaseStorageIndex } from './brand-v2-release-state-store.ts';

type ObservedTable = ReleaseInteractionDetails['tables'][number];
export type SourceTableDefinition = {
  component: string;
  sourcePath: string;
  basisPaths: string[];
  headers: string[];
  caption: string | null;
  /** The first string is the row identity; the rest are its factual cells. */
  rows: string[][];
  /** Shared Table uses a TD for its first cell; static tables use a row TH. */
  firstCellIsData: boolean;
  sortable: boolean;
};
export type SourceTableMount = { id: string; route: string; routeId: string; articlePath: string; definition: SourceTableDefinition };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const head = (text: string) => normalized(text).replace(/[↑↓]$/, '');
const text = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  throw new Error(`Source table expected a literal text/number, found ${typeof value}`);
};
const file = (name: string) => `components/mdx/${name}.tsx`;

/** Reads authored data only, never evaluates a component or its JSX render.
 * The narrow expression whitelist admits the existing policy table's
 * canonical method lookups; arbitrary calls, spreads and computed code fail. */
export class SourceTableLiterals {
  readonly tree: ts.SourceFile;
  readonly path: string;
  private readonly declarations = new Map<string, ts.Expression>();
  constructor(root: string, path: string) {
    this.path = path;
    this.tree = ts.createSourceFile(path, readFileSync(join(root, path), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const statement of this.tree.statements) if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name) && declaration.initializer) this.declarations.set(declaration.name.text, declaration.initializer);
  }
  value(node: ts.Expression, seen = new Set<string>()): unknown {
    if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return ts.isNumericLiteral(node) ? Number(node.text) : node.text;
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node)) return this.value(node.expression, seen);
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) { const n = this.value(node.operand, seen); if (typeof n === 'number') return -n; }
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(element => this.value(element, seen));
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
      if (!ts.isPropertyAssignment(property) || !('text' in property.name)) throw new Error(`${this.path}: unsupported authored property`);
      return [String(property.name.text), this.value(property.initializer, seen)];
    }));
    if (ts.isPropertyAccessExpression(node)) {
      const owner = this.value(node.expression, seen);
      if (owner !== null && typeof owner === 'object') return (owner as Record<string, unknown>)[node.name.text];
    }
    if (ts.isIdentifier(node)) {
      if (node.text === 'undefined') return undefined;
      if (node.text === 'octo' || node.text === 'pi0') return METHODS.find(method => method.id === node.text);
      const declaration = this.declarations.get(node.text);
      if (!declaration || seen.has(node.text)) throw new Error(`${this.path}: missing/cyclic literal ${node.text}`);
      return this.value(declaration, new Set([...seen, node.text]));
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'model' && node.arguments.length === 1) {
      const id = this.value(node.arguments[0], seen), method = METHODS.find(row => row.id === id);
      if (!method) throw new Error(`${this.path}: unknown canonical method ${String(id)}`);
      return method;
    }
    throw new Error(`${this.path}: unsupported authored expression ${ts.SyntaxKind[node.kind]}`);
  }
  constant<T>(name: string): T { const value = this.declarations.get(name); if (!value) throw new Error(`${this.path}: no ${name}`); return this.value(value) as T; }
  componentProps(component: string, tag: string): Record<string, unknown> {
    const declaration = this.tree.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === component);
    if (!declaration) throw new Error(`${this.path}: missing component ${component}`);
    const found: Record<string, unknown>[] = [];
    const visit = (node: ts.Node) => {
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(this.tree) === tag) {
        const props: Record<string, unknown> = {};
        for (const attr of node.attributes.properties) if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name) && attr.initializer && (tag === 'Table' ? ['caption'] : ['columns', 'rows', 'ariaLabel', 'caption', 'methodHeader']).includes(attr.name.text)) {
          if (ts.isStringLiteral(attr.initializer)) props[attr.name.text] = attr.initializer.text;
          else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) props[attr.name.text] = this.value(attr.initializer.expression);
          else throw new Error(`${this.path}: nonliteral source-table prop ${attr.name.text}`);
        }
        found.push(props);
      }
      ts.forEachChild(node, visit);
    };
    visit(declaration);
    if (found.length !== 1) throw new Error(`${this.path}: expected one ${tag} in ${component}, found ${found.length}`);
    return found[0];
  }
  caption(): string | null {
    const found: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(this.tree) === 'caption') {
        if (node.children.some(child => !ts.isJsxText(child))) throw new Error(`${this.path}: caption needs an explicit source projection`);
        found.push(normalized(node.children.map(child => (child as ts.JsxText).text).join('').replaceAll('&amp;', '&')));
      }
      ts.forEachChild(node, visit);
    };
    visit(this.tree);
    if (found.length > 1) throw new Error(`${this.path}: ambiguous caption`);
    return found[0] ?? null;
  }
}

/** Independent cell projections. Canonical data is imported directly;
 * source-local literal tables are parsed without executing renderer code. */
export function sourceTableDefinitions(root: string): SourceTableDefinition[] {
  const result: SourceTableDefinition[] = [];
  const add = (component: string, name: string, headers: string[], rows: unknown[][], basisPaths: string[] = [], firstCellIsData = false, caption?: string | null) => {
    const sourcePath = file(name), reader = new SourceTableLiterals(root, sourcePath);
    const definition = { component, sourcePath, basisPaths: [sourcePath, ...basisPaths], headers, rows: rows.map(row => row.map(text)), firstCellIsData, sortable: firstCellIsData, caption: caption === undefined ? reader.caption() : caption };
    if (!headers.length || !rows.length || rows.some(row => row.length !== headers.length)) throw new Error(`${component}: empty or ragged source population`);
    result.push(definition);
  };
  type LiteralRow = Record<string, string | number | boolean | null | undefined>;
  const rows = (name: string) => new SourceTableLiterals(root, file(name)).constant<LiteralRow[]>('ROWS');
  const rl = new SourceTableLiterals(root, file('rl-methods-table'));
  add('RlMethodsTable', 'rl-methods-table', ['Method', 'Year', 'Mechanism', 'Headline result', 'Evidence', 'Openness'], rows('rl-methods-table').map(row => [row.method, row.year, row.mechanism, row.result, row.evidence, `${row.open === null ? 'not disclosed' : row.open ? 'code' : 'closed'}${row.opennessNote}`]), [], true, text(rl.componentProps('RlMethodsTable', 'Table').caption));
  add('DhParameterTable', 'dh-parameter-table', ['Joint i', 'θi', 'di', 'ai', 'αi'], rows('dh-parameter-table').map(row => [row.joint, row.theta, row.d, row.a, row.alpha]));
  add('WmTaxonomyTable', 'wm-taxonomy-table', ['Paradigm', 'What it predicts', 'In what space', 'Trained on', 'Primary use', 'Representative systems'], WM_PARADIGMS.map(row => [row.name, row.predicts, row.space, row.trainedOn, row.primaryUse, row.systems]), ['lib/world-model-taxonomy.ts']);
  add('Gr2ResultsTable', 'gr2-results-table', ['Group', 'Task or category', 'Embodiment', 'Success', 'Evidence'], GR2_RESULTS.map(row => [row.category, row.task, row.embodiment, `${Number.isInteger(row.success) ? row.success : row.success.toFixed(1)}%`, 'vendor-reported']), ['lib/wbc-decomposition.ts']);
  add('AvStackTable', 'av-stack-table', ['Stage', 'Question it answers', 'Representative methods', 'Characteristic failure'], rows('av-stack-table').map(row => [row.stage, row.question, row.methods, row.failure]));
  add('MdpComparison', 'mdp-comparison', ['MDP property', 'Locomotion', 'Manipulation'], MDP_ROWS.map(row => [row.property, row.locomotion, row.manipulation]), ['lib/contact-geometry.ts']);
  add('SurgicalSystemsTable', 'surgical-systems-table', ['System', 'Design focus', 'Differentiator', 'Regulatory path'], SURGICAL_SYSTEM_ROWS.map(row => [`${row.system}L${row.autonomyLevel}`, row.focus, row.edge, row.regulatory + row.autonomyNote]), ['lib/surgical-systems.ts']);
  add('MpcComparison', 'mpc-comparison', ['Axis', 'Model-based (MPC / whole-body QP)', 'Learned (sim-RL policy)'], MPC_RL_COMPARISON_ROWS.map(row => [row.dimension, row.mpc, row.rl]), ['lib/mpc-vs-rl.ts']);
  add('OrbitalServicingTable', 'orbital-servicing-table', ['Mission', 'Year', 'Operator', 'What it demonstrated'], rows('orbital-servicing-table').map(row => [row.mission, row.year, row.operator, row.demonstrated]));
  const trajectory = new SourceTableLiterals(root, file('trajopt-results-table'));
  for (const [component, name, label] of [['TrajOptArmTable', 'ARM_ROWS', 'Arm method'], ['TrajOptFullBodyTable', 'FULL_BODY_ROWS', 'Full-body method']]) add(component, 'trajopt-results-table', [label, 'Success fraction', 'Average time (s)', 'Average normalized length'], trajectory.constant<string[][]>(name));
  const policy = new SourceTableLiterals(root, file('policy-chunking-table'));
  add('PolicyChunkingTable', 'policy-chunking-table', ['Policy', 'Year', 'Horizon H', 'Control Hz', 'Action representation', 'Weights'], rows('policy-chunking-table').map(row => [row.policy, row.year, `${row.horizon ?? 'not disclosed'}${row.horizonNote ?? ''}`, `${row.frequencyHz ?? 'not disclosed'}${row.frequencyNote ?? ''}`, row.representation, `${row.open === null ? 'not disclosed' : row.open ? 'downloadable' : 'not released'}${row.weightsNote ?? ''}`]), ['data/methods.ts'], true, text(policy.componentProps('PolicyChunkingTable', 'Table').caption));
  add('SwarmControlTable', 'swarm-control-table', ['Control family', 'Mechanism', 'Demonstrated at', 'Characteristic limit'], rows('swarm-control-table').map(row => [row.family, row.mechanism, row.exemplar, row.limit]));
  add('ScalingLawsTable', 'scaling-laws-table', ['Dimension', 'Effect on performance', 'Saturation', 'Source'], SCALING_LAW_ROWS.map(row => [row.dimension, row.effect, row.saturation, row.source]), ['lib/data-scaling.ts']);
  const qualitative = new SourceTableLiterals(root, file('text-tables'));
  for (const component of ['ActionSpaceTable', 'FoundationModelFamiliesTable', 'SimVsModelTable', 'WorldModelCostTable', 'EvalShiftTable']) {
    const props = qualitative.componentProps(component, 'TextTable');
    add(component, 'text-tables', props.columns as string[], props.rows as string[][]);
  }
  if (new Set(result.map(row => row.component)).size !== result.length) throw new Error('Duplicate table source owner');
  for (const path of new Set(result.map(row => row.sourcePath))) {
    const declared = new SourceTableLiterals(root, path).tree.statements.flatMap(node => ts.isFunctionDeclaration(node) && node.name && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ? [node.name.text] : []).sort();
    const catalogued = result.filter(row => row.sourcePath === path).map(row => row.component).sort();
    if (JSON.stringify(declared) !== JSON.stringify(catalogued)) throw new Error(`${path}: exported table population differs from the source-value catalog`);
  }
  return result;
}

/** JSX mounts are read from the article AST, with import aliases resolved;
 * fenced examples, comments and unused imports do not create members. */
export function sourceTableMounts(root: string, registry: Pick<BrandV2Registry, 'routes'>, definitions = sourceTableDefinitions(root)): SourceTableMount[] {
  const mounts: SourceTableMount[] = [];
  for (const route of registry.routes.public.filter(row => row.routeKind === 'article')) {
    const articlePath = `content/${route.path.slice(1, -1)}.mdx`;
    const tree = unified().use(remarkParse).use(remarkMath).use(remarkMdx).use(remarkGfm).parse(moduleBody(readFileSync(join(root, articlePath), 'utf8')));
    const bindings = new Map<string, SourceTableDefinition>();
    for (const node of tree.children) if (node.type === 'mdxjsEsm') {
      const imports = ts.createSourceFile(articlePath, node.value, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      for (const statement of imports.statements) if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
        const importedPath = statement.moduleSpecifier.text.replace(/^@\//, '');
        for (const binding of statement.importClause.namedBindings.elements) {
          const definition = definitions.find(row => row.component === (binding.propertyName ?? binding.name).text && importedPath === row.sourcePath.replace(/\.tsx$/, ''));
          if (definition) bindings.set(binding.name.text, definition);
        }
      }
    }
    const ordinals = new Map<string, number>();
    const walk = (nodes: readonly RootContent[]) => {
      for (const node of nodes) {
        if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name && bindings.has(node.name)) {
          const definition = bindings.get(node.name)!;
          if (node.attributes.some(attr => attr.type !== 'mdxJsxAttribute' || attr.name !== 'className')) throw new Error(`${articlePath}: source-table props need a new explicit projection for ${node.name}`);
          const ordinal = (ordinals.get(definition.component) ?? 0) + 1; ordinals.set(definition.component, ordinal);
          mounts.push({ id: `table-mount:${route.path}:${definition.component}:${ordinal}`, route: route.path, routeId: route.id, articlePath, definition });
        }
        if ('children' in node) walk(node.children as RootContent[]);
      }
    };
    walk(tree.children);
  }
  return mounts;
}

/** Exact cells, including repeated row headers (GR2 categories), source
 * notes, unknowns and units. Sorting may reorder complete rows only. */
export function sourceTableProblems(definition: SourceTableDefinition, table: ObservedTable): string[] {
  const failures: string[] = [];
  if (JSON.stringify(table.headers.map(head)) !== JSON.stringify(definition.headers.map(head))) failures.push('canonical source-table headers differ');
  if (definition.caption !== null && normalized(table.name) !== normalized(definition.caption)) failures.push('canonical source-table caption differs');
  const rows = new Map<number, ObservedTable['cells']>();
  for (const cell of table.cells) { const group = rows.get(cell.rowIndex) ?? []; group.push(cell); rows.set(cell.rowIndex, group); }
  const actual = [...rows].sort(([a], [b]) => a - b).map(([, cells]) => {
    if (new Set(cells.map(cell => normalized(cell.row))).size !== 1) failures.push('source-table row identity changes between cells');
    const expectedColumns = definition.firstCellIsData ? definition.headers : definition.headers.slice(1);
    if (JSON.stringify(cells.map(cell => head(cell.column))) !== JSON.stringify(expectedColumns.map(head))) failures.push('source-table cell column bindings differ');
    return [normalized(cells[0]?.row ?? ''), ...cells.slice(definition.firstCellIsData ? 1 : 0).map(cell => normalized(cell.text))];
  });
  const expected = definition.rows.map(row => row.map(normalized));
  const serial = (items: string[][]) => { const strings = items.map(row => JSON.stringify(row)); return JSON.stringify(definition.sortable ? strings.sort() : strings); };
  if (serial(actual) !== serial(expected)) failures.push('published/unknown/inapplicable source-table values differ from canonical inputs');
  // A wrong name cell must not disappear when the first TD is represented
  // as the row key; both browser fields describe that same visible cell.
  if (definition.firstCellIsData) for (const cells of rows.values()) if (normalized(cells[0]?.row ?? '') !== normalized(cells[0]?.text ?? '')) failures.push('source-table first data cell differs from its row identity');
  return failures;
}

/** One streaming pass through validated capsules. Successful raw tables
 * are discarded after their independent comparison; compact hashes and
 * exact evidence paths retain the binding without copying full articles. */
export function collectTableSourceParity(input: {
  root: string;
  registry: Pick<BrandV2Registry, 'routes'>;
  stateIndex?: ReleaseStorageIndex;
}): ReadonlyMap<string, SourceParityVerdict> {
  const definitions = sourceTableDefinitions(input.root), mounts = sourceTableMounts(input.root, input.registry, definitions);
  if (!mounts.length) throw new Error('Empty independently derived source-table mount population');
  const records = new Map(mounts.map(mount => [mount.id, { mount, failures: [] as string[], keys: new Set<string>(), paths: new Set<string>(), baseProfiles: new Set<string>(), checkedReadings: [] as Array<{ id: string; sha256: string }>, count: 0, hash: createHash('sha256') }]));
  const profiles = iterateReleaseProfileRows(input.root, input.stateIndex ?? readReleaseStateIndex(input.root));
  for (const reading of profiles) {
    const candidates = mounts.filter(mount => mount.route === reading.route);
    if (!candidates.length) continue;
    for (const mount of candidates) {
      const record = records.get(mount.id)!;
      const matches = reading.profile.interaction.tables.filter(table => JSON.stringify(table.headers.map(head)) === JSON.stringify(mount.definition.headers.map(head)));
      record.paths.add(reading.path);
      if (matches.length !== 1) { record.failures.push(`${reading.id}: expected one ${mount.definition.component}, observed ${matches.length}`); continue; }
      const table = matches[0], key = `table:${reading.route}:${table.name}`;
      record.keys.add(key);
      const failures = sourceTableProblems(mount.definition, table);
      record.failures.push(...failures.map(failure => `${reading.id}: ${failure}`));
      const tableHash = hash(JSON.stringify(table));
      record.checkedReadings.push({ id: `${reading.id}|${table.id}`, sha256: tableHash });
      record.hash.update(JSON.stringify({ id: reading.id, path: reading.path, sha256: reading.sha256, tableHash }) + '\n');
      record.count += 1;
      if (reading.state === mount.routeId) record.baseProfiles.add(reading.profile.id);
    }
  }
  const result = new Map<string, SourceParityVerdict>();
  for (const record of records.values()) {
    const { mount } = record;
    const expectedProfiles = RELEASE_PROFILES.map(profile => profile.id).sort();
    if (JSON.stringify([...record.baseProfiles].sort()) !== JSON.stringify(expectedProfiles)) record.failures.push('missing exact twelve-profile default-route source-table population');
    if (record.keys.size !== 1) record.failures.push(`source-table identity changed between readings (${record.keys.size} names)`);
    const verdict: SourceParityVerdict = { failures: record.failures, observed: { component: mount.definition.component, mountId: mount.id, route: mount.route, rows: mount.definition.rows.length, columns: mount.definition.headers.length, readings: record.count, checkedReadings: record.checkedReadings, readingSha256: record.hash.digest('hex'), defaultProfiles: [...record.baseProfiles].sort() }, evidencePaths: [mount.articlePath, ...mount.definition.basisPaths, ...record.paths] };
    // Missing evidence retains its independent mount member as an explicit
    // failure; the runtime table reader also rejects its absent table key.
    if (!record.keys.size) result.set(mount.id, verdict);
    for (const key of record.keys) {
      if (result.has(key)) throw new Error(`Ambiguous source-table identity ${key}`);
      result.set(key, verdict);
    }
  }
  for (const definition of definitions.filter(definition => !mounts.some(mount => mount.definition.component === definition.component))) result.set(`table-source:${definition.component}`, { failures: [], observed: { component: definition.component, sourcePath: definition.sourcePath, productionMounts: 0 }, evidencePaths: definition.basisPaths, notApplicable: { reason: `${definition.component} has no JSX mount in the independently parsed public article corpus. Its source values have no current rendered table to compare.` } });
  return result;
}
