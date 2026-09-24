import { writeFileSync } from 'node:fs';
import { artifact, surfacePaths as previousPaths } from '../industrial-closure-20260923/support.ts';
export { ARTICLE, artifact, defaults, oracle, dependencies } from '../industrial-closure-20260923/support.ts';

export const DIRECTORY = 'audit/evidence/industrial-release-20260924';
export const BROWSER = 'tests/e2e/industrial-citation-refresh.spec.ts';
export const surfacePaths = [
  ...previousPaths.filter(path => path !== 'tests/e2e/industrial-deployment.spec.ts'),
  BROWSER, `${DIRECTORY}/support.ts`,
];
export function save(name: string, value: unknown) {
  const path = `${DIRECTORY}/${name}`;
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  return artifact(path);
}
