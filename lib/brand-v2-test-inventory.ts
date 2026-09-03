import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { matchingToken, tokenizeSource } from './source-tokens.ts';

const UNIT_TEST = /^tests\/unit\/.+\.test\.ts$/;
const E2E_TEST = /^tests\/e2e\/.+\.spec\.ts$/;

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function trackedTestFiles(root: string): string[] {
  return execFileSync('git', ['ls-files', '-z', 'tests/unit', 'tests/e2e'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    .filter((file) => UNIT_TEST.test(file) || E2E_TEST.test(file))
    .sort(compareCodePoints);
}

function titlesForFile(file: string, source: string): string[] {
  const tokens = tokenizeSource(source);
  const separator = E2E_TEST.test(file) ? ' › ' : ' > ';
  const titles: string[] = [];
  const suites: Array<{ title: string; start: number; end: number }> = [];
  const fileSuite = source.match(
    /(?:\btest\.)?\bdescribe\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/,
  )?.[2];

  for (let index = 0; index < tokens.length - 3; index += 1) {
    const directDescribe =
      tokens[index].value === 'describe' &&
      tokens[index - 1]?.value !== '.' &&
      tokens[index + 1].value === '(';
    const qualifiedDescribe =
      ['test', 'it'].includes(tokens[index].value) &&
      tokens[index + 1].value === '.' &&
      tokens[index + 2].value === 'describe' &&
      tokens[index + 3].value === '(';
    if (!directDescribe && !qualifiedDescribe) continue;
    const openIndex = directDescribe ? index + 1 : index + 3;
    const title = tokens[openIndex + 1];
    const closeIndex = matchingToken(tokens, openIndex, '(', ')');
    if (title?.kind !== 'string' || closeIndex === null) continue;
    suites.push({
      title: title.value,
      start: tokens[openIndex].start,
      end: tokens[closeIndex].start,
    });
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (!['test', 'it'].includes(tokens[index].value)) continue;
    let openIndex: number | null = null;
    if (tokens[index + 1].value === '(') {
      openIndex = index + 1;
    } else if (tokens[index + 1].value === '.') {
      const modifier = tokens[index + 2]?.value;
      if (modifier === 'describe' || modifier === 'step') continue;
      if (modifier === 'each' && tokens[index + 3]?.value === '(') {
        const eachClose = matchingToken(tokens, index + 3, '(', ')');
        if (eachClose !== null && tokens[eachClose + 1]?.value === '(') {
          openIndex = eachClose + 1;
        }
      } else if (tokens[index + 3]?.value === '(') {
        openIndex = index + 3;
      }
    }
    if (openIndex === null) continue;
    const title = tokens[openIndex + 1];
    if (title?.kind !== 'string') continue;
    const enclosing = suites
      .filter(
        (suite) =>
          suite.start < tokens[index].start && suite.end > tokens[index].start,
      )
      .sort((left, right) => left.start - right.start)
      .map((suite) => suite.title);
    if (enclosing.length === 0 && fileSuite) enclosing.push(fileSuite);
    titles.push([...enclosing, title.value].join(separator));
  }
  return [...new Set(titles)].sort(compareCodePoints);
}

export function deriveTestTargetInventory(
  root = process.cwd(),
): Record<string, string[]> {
  return Object.fromEntries(
    trackedTestFiles(root)
      .filter((file) => existsSync(`${root}/${file}`))
      .map((file) => [
        file,
        titlesForFile(file, readFileSync(`${root}/${file}`, 'utf8')),
      ]),
  );
}
