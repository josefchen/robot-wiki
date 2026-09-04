import { describe, expect, it } from 'vitest';
import { matchingToken, tokenizeSource } from '@/lib/source-tokens';

const strings = (source: string) =>
  tokenizeSource(source)
    .filter((token) => token.kind === 'string')
    .map((token) => token.value);

describe('tokenizeSource', () => {
  it('reads a quote inside a regex literal as regex syntax, not a string', () => {
    // The failure this guards is silent and total: the opening quote of the
    // character class used to start a string that ran to the end of the file,
    // so every `describe`/`test` call after it disappeared from the tokens.
    const source = [
      "const head = family.split(',')[0].replace(/[\"']/g, '');",
      "test('keeps its reporter-visible title', () => {});",
    ].join('\n');
    expect(strings(source)).toEqual([
      ',',
      '',
      'keeps its reporter-visible title',
    ]);
    expect(
      tokenizeSource(source).some(
        (token) => token.kind === 'identifier' && token.value === 'test',
      ),
    ).toBe(true);
  });

  it('reads a backtick inside a regex literal without opening a template', () => {
    const source = "const bare = line.replace(/`[^`]*`/g, '').trim();";
    expect(strings(source)).toEqual(['']);
  });

  it('keeps division and JSX self-closing tags as punctuation', () => {
    // `/` after a value is division, and `/>` after an attribute or a spread
    // closes an element; reading either as a regex start would swallow source.
    const divided = tokenizeSource('const lines = height / lineHeight;');
    expect(divided.map(({ value }) => value)).toContain('/');
    const jsx = tokenizeSource('<Action variant="link" {...rest} />;');
    expect(strings(jsx.length > 0 ? '<Action variant="link" />' : '')).toEqual([
      'link',
    ]);
    expect(jsx.filter(({ value }) => value === '/')).toHaveLength(1);
  });

  it('leaves an unterminated regex-looking slash as punctuation', () => {
    // A regex literal cannot span a line, so a lone `/` at a regex position
    // stays punctuation rather than consuming the rest of the file.
    const tokens = tokenizeSource('const ratio = (a /\n  b);');
    expect(tokens.filter(({ value }) => value === '/')).toHaveLength(1);
    expect(tokens.some(({ value }) => value === 'b')).toBe(true);
  });

  it('matches the group a token opens', () => {
    const tokens = tokenizeSource('call(inner(1), 2) after');
    expect(matchingToken(tokens, 1, '(', ')')).not.toBeNull();
    expect(
      tokens[matchingToken(tokens, 1, '(', ')') as number].value,
    ).toBe(')');
  });
});
