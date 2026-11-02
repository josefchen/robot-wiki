import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript6';
import { modules } from '../data/modules.ts';

/** These existing opt-in cases write historical recipe artifacts. They are
 * listed in the unit report but never counted as passing release executions.
 * The exact guarded call is pinned so this classification cannot swallow a
 * new test or silently change the arithmetic being excluded with the writer.
 * Ordinary independent arithmetic cases in each file remain mandatory. */
export const RELEASE_UNIT_RECORDERS = [
  { file: 'tests/unit/classical-closure-evidence.test.ts', suite: 'classical closure recipes and reader corrections', title: 'records bounded numeric outputs after independent assertions', env: 'CLASSICAL_CLOSURE_NUMERIC', callSha256: 'b8061ca808b633584b29f75b3d7a64b3da880e2002087b4b2a216d128a381bd0' },
  { file: 'tests/unit/crossdomain-closure-evidence.test.ts', suite: 'crossdomain finite selected-count closure', title: 'records actual outputs after independent finite-count assertions', env: 'CROSSDOMAIN_NUMERIC', callSha256: '3facf6bfe9d416242a6cac82315612a6c6b544ff0a42785c917040c65a4ab31a' },
  { file: 'tests/unit/economics-local-evidence.test.ts', suite: 'industrial52 authored economics evidence', title: 'records final native outputs after independent checks', env: 'ECONOMICS_WRITE_NUMERIC', callSha256: '07f663f135bc38b0ce26007ffdcf7adde68447257df63642ade01a5b2ed31793' },
  { file: 'tests/unit/final-seven-closure-evidence.test.ts', suite: 'final-seven corrected reader disclosures and independent arithmetic', title: 'records executed finite recipe outputs', env: 'FINAL_SEVEN_NUMERIC', callSha256: 'ce50e8a95f36a941621268a524ecb33ed709a3e8582366f7bd2bb45ddb898d9a' },
  { file: 'tests/unit/industrial-closure-evidence.test.ts', suite: '', title: 'records industrial numeric observations', env: 'INDUSTRIAL_WRITE_NUMERIC', callSha256: 'a40932604a8dcb8bb06feeadb5ab12518a0a0a1ab4832a2fa96fee75ced4d159' },
  { file: 'tests/unit/parallel-local-evidence.test.ts', suite: 'parallel18 independent authored evidence', title: 'records final native outputs after independent checks', env: 'PARALLEL_WRITE_NUMERIC', callSha256: '1dde4dce85df350717322b329bb14df57b4a0763467e94a1882cedc598e836fe' },
  { file: 'tests/unit/sim2real-local-evidence.test.ts', suite: 'sim2real authored evidence', title: 'records checked raw numerical outputs, not an audit certification', env: 'SIM2REAL_WRITE_EVIDENCE', callSha256: '234d3caef79908dd5574effc7f078e303f7b7ff4dd95fa932eb05d52f2d3a668' },
  { file: 'tests/unit/sim2real-local-evidence.test.ts', suite: 'strict sim2real local evidence', title: 'refreshes exact native numeric outputs with independent arithmetic', env: 'SIM2REAL_TYPED_CAPTURE', callSha256: 'c5b8afef205db3bde94eb76eff59c57a6b066ab53d3bd75000b92d7df38877c8' },
] as const;

export type UnitNonExecution = {
  file: string; name: string; kind: 'conditional-evidence-producer' | 'derived-inapplicable';
  reason: string; derivation: string; sourcePaths: string[]; sourceHash: string; population: string[];
};

export function recorderCallHash(source: string, title: string, env: string): string {
  const file = ts.createSourceFile('recorder.ts', source, ts.ScriptTarget.Latest, true);
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(file) === 'it.runIf' &&
      node.expression.arguments.length === 1 && node.expression.arguments[0].getText(file) === `process.env.${env} === '1'` &&
      node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === title) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (calls.length !== 1) throw new Error(`missing or duplicate exact recorder guard: ${title}`);
  return createHash('sha256').update(calls[0].getText(file)).digest('hex');
}

export function draftUnitInapplicability(drafts: string[], published: string[], sourceHash: string): UnitNonExecution[] {
  if (!published.length) throw new Error('cannot derive draft fixture inapplicability from an empty published corpus');
  return drafts.length ? [] : [{ file: 'tests/component/nav/nav-tree.test.tsx', name: 'NavTree > excludes draft modules from the sidebar entirely',
    kind: 'derived-inapplicable', reason: 'no draft modules exist in the current module registry',
    derivation: 'modules.filter(status !== published); nonempty published population required',
    sourcePaths: ['data/modules.ts', 'tests/helpers/draft-fixtures.ts', 'tests/component/nav/nav-tree.test.tsx'], sourceHash, population: [] }];
}

export function releaseUnitNonExecutions(root: string, environment: Readonly<Record<string,string|undefined>> = process.env): UnitNonExecution[] {
  const rows: UnitNonExecution[] = RELEASE_UNIT_RECORDERS.map((row) => {
    if (environment[row.env] === '1') throw new Error(`${row.env} must be recorded separately before the final source freeze`);
    const hash = recorderCallHash(readFileSync(join(root, row.file), 'utf8'), row.title, row.env);
    if (hash !== row.callSha256) throw new Error(`conditional recorder body changed and requires scope review: ${row.file}: ${row.title}`);
    return { file: row.file, name: [row.suite, row.title].filter(Boolean).join(' > '), kind: 'conditional-evidence-producer',
      reason: 'opt-in artifact writer is outside the read-only final unit execution scope; no passing execution claimed',
      derivation: `exact pinned it.runIf(process.env.${row.env} === '1') call`, sourcePaths: [row.file], sourceHash: hash, population: [] };
  });
  const sourceHash = createHash('sha256').update(['data/modules.ts', 'tests/helpers/draft-fixtures.ts', 'tests/component/nav/nav-tree.test.tsx']
    .map((path) => `${path}\0${readFileSync(join(root, path), 'utf8')}`).join('\0')).digest('hex');
  return [...rows, ...draftUnitInapplicability(modules.filter(({ status }) => status !== 'published').map(({ domain, slug }) => `${domain}/${slug}`),
    modules.filter(({ status }) => status === 'published').map(({ domain, slug }) => `${domain}/${slug}`), sourceHash)];
}
