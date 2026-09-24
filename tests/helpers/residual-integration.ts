import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { expect } from 'vitest';
import { publishedModules } from '../../data/modules';
import { loadLocalBasisContext } from '../../lib/audit-local-basis';
import { parseCorrectedDispositions } from '../../lib/audit-corrected-disposition';
import { parseCompoundPlans } from '../../lib/audit-ledger';
import { committedSource } from './continuation-integration';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const finalSevenBase = 'b1782205a17ffa7a8c2f8d5a4cf15981197c2d1c';

/** The actual pre-closure bytes, never a substitute for current evidence. */
export function finalSevenBefore(path: string): string {
  const name = path.startsWith('content/')
    ? `before-${path.replaceAll('/', '--')}.txt`
    : `before-${path.slice('audit/'.length)}`;
  const archived = read(`audit/evidence/final-seven-closure-20260923/${name}`);
  expect(archived).toBe(committedSource(finalSevenBase, path));
  return archived;
}

export function finalSevenPriorPlans() {
  return parseCompoundPlans(JSON.parse(committedSource(finalSevenBase, 'audit/compound-evidence.json')));
}

/** Supply the same evidence families and frontmatter as current coverage. */
export function currentAuditContext() {
  const modules = publishedModules();
  return {
    compoundPlans: parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json'))),
    articleCitations: Object.fromEntries(modules.map(m => [
      m.slug, matter(read(`content/${m.domain}/${m.slug}.mdx`)).data.citations as string[],
    ])),
    localBasis: loadLocalBasisContext(root, modules.map(m => `/${m.domain}/${m.slug}/`)),
    correctedDispositions: {
      root,
      records: parseCorrectedDispositions(
        ['industrial-release-20260924', 'residual-release-20260924'].flatMap(directory =>
          JSON.parse(read(`audit/evidence/${directory}/corrections.json`)))
          .concat((() => {
            const controlCloseout = (
              JSON.parse(read('audit/evidence/classical-closure-20260923/corrections.json')) as Array<{ originalId: string }>
            ).filter(record => ['audit/classical.md:control:1', 'audit/classical.md:control:2']
              .includes(record.originalId));
            expect(controlCloseout.map(record => record.originalId)).toEqual([
              'audit/classical.md:control:1',
              'audit/classical.md:control:2',
            ]);
            return controlCloseout;
          })()),
      ),
    },
  };
}
