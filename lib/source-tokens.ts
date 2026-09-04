/**
 * A small TypeScript/JavaScript tokenizer, shared by the checks that have to
 * read source structure rather than scan it.
 *
 * A regex over raw text cannot tell a call from a comment mentioning one, or
 * an identifier from the same word inside a string, and a check that gets
 * that wrong reports a shape the compiler never sees. Two consumers need the
 * same reading: the test-title inventory, which has to find `describe`/`test`
 * calls, and the Open Graph render-boundary invariant, which has to prove the
 * element tree handed to the renderer is the one the corpus sealed.
 *
 * It is deliberately not a parser. It classifies comments, string and
 * template literals, identifiers and single punctuation characters, which is
 * what both consumers match against.
 */
export type SourceToken = {
  kind: 'identifier' | 'punctuation' | 'string';
  value: string;
  start: number;
};

/**
 * Where a `/` can only begin a regular expression rather than a division.
 *
 * Deliberately narrow. `}` and `<` are left out because JSX writes `{...x} />`
 * and `</div>`, and reading those as regex starts would swallow real source;
 * every entry below is a position where division is not grammatical, so the
 * classification cannot change how existing code is read.
 */
const REGEX_ALLOWED_AFTER = new Set([
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  ';',
  '+',
  '-',
  '*',
  '%',
]);
const REGEX_ALLOWED_AFTER_KEYWORD = new Set([
  'return',
  'typeof',
  'case',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'do',
  'else',
  'instanceof',
  'yield',
  'await',
]);

/**
 * The end of a regex literal starting at `start`, or null when it does not
 * close on its own line. A quote inside a character class is regex syntax,
 * not a string delimiter, and reading it as one used to swallow the rest of
 * the file: `tests/unit/brand-v2-responsive-viewports.test.ts` lost every
 * one of its test titles to a backtick inside `/`[^`]*`/g`.
 */
function regexLiteralEnd(source: string, start: number): number | null {
  let index = start + 1;
  let inClass = false;
  while (index < source.length) {
    const character = source[index];
    if (character === '\n') return null;
    if (character === '\\') {
      index += 2;
      continue;
    }
    if (character === '[') inClass = true;
    else if (character === ']') inClass = false;
    else if (character === '/' && !inClass) {
      index += 1;
      while (index < source.length && /[a-z]/.test(source[index])) index += 1;
      return index;
    }
    index += 1;
  }
  return null;
}

export function tokenizeSource(source: string): SourceToken[] {
  const tokens: SourceToken[] = [];
  for (let index = 0; index < source.length; ) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (source.startsWith('//', index)) {
      index = source.indexOf('\n', index + 2);
      if (index === -1) break;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    if (character === '/') {
      const previous = tokens[tokens.length - 1];
      const startsRegex =
        previous === undefined ||
        (previous.kind === 'punctuation' &&
          REGEX_ALLOWED_AFTER.has(previous.value)) ||
        (previous.kind === 'identifier' &&
          REGEX_ALLOWED_AFTER_KEYWORD.has(previous.value));
      const end = startsRegex ? regexLiteralEnd(source, index) : null;
      if (end !== null) {
        index = end;
        continue;
      }
    }
    if (character === "'" || character === '"' || character === '`') {
      const quote = character;
      const start = index;
      index += 1;
      let value = '';
      while (index < source.length) {
        const next = source[index];
        if (next === '\\') {
          const escaped = source[index + 1];
          value += escaped === 'n' ? '\n' : escaped === 't' ? '\t' : escaped;
          index += 2;
          continue;
        }
        if (next === quote) {
          index += 1;
          break;
        }
        value += next;
        index += 1;
      }
      tokens.push({ kind: 'string', value, start });
      continue;
    }
    if (/[A-Za-z_$]/.test(character)) {
      const start = index;
      index += 1;
      while (index < source.length && /[A-Za-z0-9_$-]/.test(source[index])) {
        index += 1;
      }
      tokens.push({
        kind: 'identifier',
        value: source.slice(start, index),
        start,
      });
      continue;
    }
    tokens.push({ kind: 'punctuation', value: character, start: index });
    index += 1;
  }
  return tokens;
}

/** The index of the token closing the group `start` opens, or null. */
export function matchingToken(
  tokens: readonly SourceToken[],
  start: number,
  open: string,
  close: string,
): number | null {
  let depth = 0;
  for (let index = start; index < tokens.length; index += 1) {
    if (tokens[index].value === open) depth += 1;
    if (tokens[index].value === close) depth -= 1;
    if (depth === 0) return index;
  }
  return null;
}
