import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The full titles a runner would print for one spec or unit file.
 *
 * An enforcement row names the test that proves it. Naming is free: nothing
 * in the map's shape stops a row from citing a title no runner has, and a
 * row whose named test does not exist is a row with no proof at all. This
 * index is what makes the name checkable.
 *
 * Titles are read the way the two runners join them: Vitest prints
 * `describe > it`, Playwright prints `describe › it`.
 */

const UNIT_SEPARATOR = ' > ';
const SPEC_SEPARATOR = ' \u203a ';

type Call = {
  kind: 'suite' | 'case';
  title: string;
  start: number;
  end: number;
};

const CALL_SITE = /(?<![\w$.])(?:test\.)?(describe|it|test)(?![\w$])/g;

/** The offset past a balanced `(...)`, `[...]` or a template literal at `from`. */
function skipGroup(source: string, from: number): number {
  if (source[from] === '`') {
    for (let i = from + 1; i < source.length; i += 1) {
      if (source[i] === '\\') {
        i += 1;
        continue;
      }
      if (source[i] === '`') return i + 1;
    }
    return source.length;
  }
  return callEnd(source, from);
}

/**
 * The offset of the quote opening a call's first argument, skipping the
 * `.only`/`.skip` modifiers and a `.each(rows)` or `.each\`table\`` argument
 * list, or -1 when the first argument is not a string literal.
 */
function firstArgumentQuote(source: string, from: number): number {
  let i = from;
  for (;;) {
    while (i < source.length && /\s/.test(source[i])) i += 1;
    if (source[i] === '.') {
      const name = /^\.([A-Za-z]+)/.exec(source.slice(i));
      if (!name) return -1;
      i += name[0].length;
      while (i < source.length && /\s/.test(source[i])) i += 1;
      if (name[1] === 'each' && (source[i] === '(' || source[i] === '`')) {
        i = skipGroup(source, i);
      }
      continue;
    }
    if (source[i] !== '(') return -1;
    i += 1;
    while (i < source.length && /\s/.test(source[i])) i += 1;
    return /['"`]/.test(source[i]) ? i : -1;
  }
}

/** The literal that opens at `from`, or null when it interpolates. */
function readLiteral(source: string, from: number): string | null {
  const quote = source[from];
  let out = '';
  for (let i = from + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '\\') {
      out += source[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (ch === quote) return out;
    if (quote === '`' && ch === '$' && source[i + 1] === '{') return null;
    out += ch;
  }
  return null;
}

/**
 * The offset one past the `)` that closes the call opening at `from`,
 * counting brackets and skipping strings, template literals, regex-free
 * comments and nested calls.
 */
function callEnd(source: string, from: number): number {
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i);
      if (i === -1) return source.length;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i = source.indexOf('*/', i);
      if (i === -1) return source.length;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      for (let j = i + 1; j < source.length; j += 1) {
        if (source[j] === '\\') {
          j += 1;
          continue;
        }
        if (source[j] === ch) {
          i = j;
          break;
        }
      }
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return source.length;
}

export function testTitlesIn(root: string, file: string): Set<string> {
  const source = readFileSync(join(root, file), 'utf8');
  const calls: Call[] = [];
  for (const match of source.matchAll(CALL_SITE)) {
    const quoteAt = firstArgumentQuote(source, match.index + match[0].length);
    if (quoteAt === -1) continue;
    const title = readLiteral(source, quoteAt);
    if (title === null) continue;
    calls.push({
      kind: match[1] === 'describe' ? 'suite' : 'case',
      title,
      start: match.index,
      end: callEnd(source, source.lastIndexOf('(', quoteAt)),
    });
  }
  const separator = file.endsWith('.spec.ts') ? SPEC_SEPARATOR : UNIT_SEPARATOR;
  const titles = new Set<string>();
  for (const call of calls) {
    if (call.kind !== 'case') continue;
    const chain = calls
      .filter(
        (candidate) =>
          candidate.kind === 'suite' &&
          candidate.start < call.start &&
          candidate.end >= call.end,
      )
      .sort((a, b) => a.start - b.start)
      .map(({ title }) => title);
    titles.add([...chain, call.title].join(separator));
  }
  return titles;
}
