import { writeFileSync } from 'node:fs';
import { artifact, surfacePaths as prior } from '../industrial-release-20260923/support.ts';
export { ARTICLE, artifact, defaults, oracle, dependencies } from '../industrial-release-20260923/support.ts';
export const DIRECTORY = 'audit/evidence/residual-release-20260924/industrial';
export const BROWSER = 'tests/e2e/residual-release-industrial.spec.ts';
export const surfacePaths = [
  ...prior.filter(path => path !== 'tests/e2e/industrial-release-evidence.spec.ts'),
  BROWSER, 'audit/evidence/residual-release-20260924/support.ts',
];
export function save(name: string, value: unknown) {
  const path = `${DIRECTORY}/${name}`;
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  return artifact(path);
}
