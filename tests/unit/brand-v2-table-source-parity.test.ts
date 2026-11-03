import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { collectTableSourceParity, sourceTableDefinitions, sourceTableMounts, sourceTableProblems, SourceTableLiterals } from '../../lib/brand-v2-table-source-parity';
import type { BrandV2Registry } from '../../lib/brand-v2-runners';
import type { ReleaseInteractionDetails } from '../../lib/brand-v2-release-interaction-details';

const root = process.cwd();
const registry = JSON.parse(readFileSync(join(root, 'contract/brand-v2-registries.json'), 'utf8')) as BrandV2Registry;
const definitions = sourceTableDefinitions(root);
type Reading = { route: string; width: number; component: string; tables: ReleaseInteractionDetails['tables'] };
const fixture = JSON.parse(gunzipSync(readFileSync(join(root, 'tests/fixtures/source-data-oracles/server-tables.json.gz'))).toString('utf8')) as { readings: Reading[] };
const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));
const sample = (component: string) => structuredClone(fixture.readings.find(row => row.component === component && row.width === 1440)!.tables[0]);
const definition = (component: string) => definitions.find(row => row.component === component)!;

describe('independent server table source parity', () => {
  it('reconciles all nineteen exported owners and actual JSX mounts', () => {
    const mounts = sourceTableMounts(root, registry);
    expect(definitions).toHaveLength(19);
    expect(mounts).toHaveLength(19);
    expect(new Set(mounts.map(row => row.definition.component))).toEqual(new Set(definitions.map(row => row.component)));
    expect(new Set(mounts.map(row => row.route)).size).toBe(17);
  });

  it.each(fixture.readings)('checks the actual $component table at $width pixels', reading => {
    expect(reading.tables).toHaveLength(1);
    expect(sourceTableProblems(definition(reading.component), reading.tables[0])).toEqual([]);
  });

  it.each(definitions)('rejects a changed cell in $component', expected => {
    const actual = sample(expected.component);
    actual.cells[0].text += ' fabricated replacement';
    expect(sourceTableProblems(expected, actual)).not.toEqual([]);
  });

  it('keeps unknown weight availability distinct from inapplicability', () => {
    const actual = sample('PolicyChunkingTable');
    const unknown = actual.cells.find(cell => cell.column === 'Weights' && cell.text.startsWith('not disclosed'))!;
    expect(unknown).toBeDefined();
    unknown.text = 'n/a';
    expect(sourceTableProblems(definition('PolicyChunkingTable'), actual)).toContain('published/unknown/inapplicable source-table values differ from canonical inputs');
  });

  it('retains repeated GR2 category rows and rejects a wrong task value', () => {
    const actual = sample('Gr2ResultsTable');
    expect(new Set(actual.cells.map(cell => cell.row)).size).toBeLessThan(new Set(actual.cells.map(cell => cell.rowIndex)).size);
    actual.cells.find(cell => cell.column === 'Success')!.text = '100%';
    expect(sourceTableProblems(definition('Gr2ResultsTable'), actual)).not.toEqual([]);
  });

  it('rejects missing cells, wrong header binding and a corrupted row identity', () => {
    for (const mutation of ['missing', 'column', 'row']) {
      const actual = sample('OrbitalServicingTable');
      if (mutation === 'missing') actual.cells.pop();
      if (mutation === 'column') actual.cells[0].column = 'Invented heading';
      if (mutation === 'row') actual.cells[0].row = 'Another mission';
      expect(sourceTableProblems(definition('OrbitalServicingTable'), actual), mutation).not.toEqual([]);
    }
  });

  it('checks source captions independently of the header lookup', () => {
    const actual = sample('RlMethodsTable');
    actual.name = 'A made-up leaderboard';
    expect(sourceTableProblems(definition('RlMethodsTable'), actual)).toContain('canonical source-table caption differs');
  });

  it('allows complete row sorting only on declared sortable tables', () => {
    for (const component of ['RlMethodsTable', 'OrbitalServicingTable']) {
      const actual = sample(component), max = Math.max(...actual.cells.map(cell => cell.rowIndex));
      actual.cells.forEach(cell => { cell.rowIndex = max - cell.rowIndex; });
      const failures = sourceTableProblems(definition(component), actual);
      if (component === 'RlMethodsTable') expect(failures).toEqual([]);
      else expect(failures).not.toEqual([]);
    }
  });

  it('reads literal data without executing an arbitrary expression', () => {
    const dir = mkdtempSync(join(tmpdir(), 'source-table-')); temporary.push(dir);
    writeFileSync(join(dir, 'table.tsx'), 'const ROWS = [globalThis.process.exit(0)];');
    expect(() => new SourceTableLiterals(dir, 'table.tsx').constant('ROWS')).toThrow(/unsupported authored expression/);
  });

  it('derives mounts through aliases and ignores code examples and unused imports', () => {
    const dir = mkdtempSync(join(tmpdir(), 'source-mount-')); temporary.push(dir);
    mkdirSync(join(dir, 'content/check'), { recursive: true });
    writeFileSync(join(dir, 'content/check/table.mdx'), "import { OrbitalServicingTable as Missions } from '@/components/mdx/orbital-servicing-table';\nimport { SwarmControlTable } from '@/components/mdx/swarm-control-table';\n\n<Missions />\n\n~~~mdx\n<SwarmControlTable />\n~~~\n");
    const routes = { routes: { public: [{ id: 'route:/check/table/', path: '/check/table/', routeKind: 'article' }] } } as unknown as Pick<BrandV2Registry, 'routes'>;
    expect(sourceTableMounts(dir, routes, definitions).map(row => row.definition.component)).toEqual(['OrbitalServicingTable']);
    writeFileSync(join(dir, 'content/check/table.mdx'), "import { OrbitalServicingTable as Missions } from '@/components/mdx/orbital-servicing-table';\n\n<Missions rows={[]} />");
    expect(() => sourceTableMounts(dir, routes, definitions)).toThrow(/props need a new explicit projection/);
  });

  it('never marks an empty release profile population as passing', () => {
    const verdicts = collectTableSourceParity({ root, registry, stateIndex: { sourceFingerprint: '0'.repeat(64), exportFingerprint: '0'.repeat(64), groups: [] } });
    expect(verdicts.size).toBe(19);
    for (const verdict of verdicts.values()) {
      expect(verdict.notApplicable).toBeUndefined();
      expect(verdict.failures).toContain('missing exact twelve-profile default-route source-table population');
    }
  });
});
