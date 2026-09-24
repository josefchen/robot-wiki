import { writeFileSync } from 'node:fs';
import { member, artifact, ARTICLE, COMPONENT } from '../economics-local-20260923/support.ts';
export { artifact, member, ARTICLE, COMPONENT, ROUTE, defaults, ranges, cases, oracle } from '../economics-local-20260923/support.ts';

export const DIRECTORY = 'audit/evidence/economics-release-20260923';
export const UNIT = 'tests/unit/economics-release-evidence.test.ts';
export const BROWSER = 'tests/e2e/economics-release-evidence.spec.ts';
export function save(name: string, value: unknown) {
  const path = `${DIRECTORY}/${name}`;
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  return artifact(path);
}
export function dependencies(browser = false) {
  return [
    ARTICLE, COMPONENT, 'lib/deployment-economics.ts', 'lib/audit-local-basis.ts',
    'audit/evidence/economics-local-20260923/support.ts',
    `${DIRECTORY}/support.ts`, browser ? BROWSER : UNIT,
    ...(browser ? [
      'tests/e2e/slider.ts', 'playwright.config.ts', 'package-lock.json', 'lib/utils.ts',
      'playwright.economics-release.config.ts', 'playwright.brand-v2.config.ts',
      'tests/e2e/brand-v2-static-fixture.ts', 'tests/e2e/static-export-server.ts',
    ] : []),
  ].map(path => member(path));
}
